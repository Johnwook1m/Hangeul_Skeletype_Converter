import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from config import UPLOAD_DIR
from models.schemas import FontUploadResponse
from models.font_session import session_store
from services.font_parser import parse_font

router = APIRouter(prefix="/api/font", tags=["font"])


@router.post("/upload", response_model=FontUploadResponse)
async def upload_font(file: UploadFile = File(...)):
    """Upload a TTF/OTF font file."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in (".ttf", ".otf", ".woff"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {ext}. Use .ttf or .otf"
        )

    # Save uploaded file
    temp_dir = Path(tempfile.mkdtemp(dir=str(UPLOAD_DIR)))
    font_path = temp_dir / file.filename

    try:
        with open(font_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Parse font
    try:
        tt_font = parse_font(font_path)
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=f"Invalid font file: {e}")

    # Extract space glyph advance width
    space_advance = None
    try:
        cmap = tt_font.getBestCmap() or {}
        space_glyph = cmap.get(0x0020)
        if space_glyph and 'hmtx' in tt_font:
            space_advance = tt_font['hmtx'][space_glyph][0]
    except Exception:
        pass

    # Create session
    session = session_store.create(font_path, tt_font, temp_dir)

    return FontUploadResponse(
        font_id=session.font_id,
        family_name=session.family_name,
        glyph_count=len(session.glyph_names),
        units_per_em=session.units_per_em,
        ascender=session.ascender,
        descender=session.descender,
        space_advance_width=space_advance,
    )
