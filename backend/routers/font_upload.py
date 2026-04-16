import logging
import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Request

from config import UPLOAD_DIR
from limiter import limiter
from models.schemas import FontUploadResponse
from models.font_session import session_store
from services.font_parser import parse_font

router = APIRouter(prefix="/api/font", tags=["font"])
logger = logging.getLogger(__name__)

MAX_FONT_SIZE = 50 * 1024 * 1024  # 50MB

# Magic bytes per format — (signature, length)
_MAGIC: dict[str, list[tuple[bytes, int]]] = {
    ".ttf":  [(b"\x00\x01\x00\x00", 4), (b"true", 4)],
    ".otf":  [(b"OTTO", 4)],
    ".woff": [(b"wOFF", 4)],
}

def _valid_magic(content: bytes, ext: str) -> bool:
    return any(content[:n] == sig for sig, n in _MAGIC.get(ext, []))


@router.post("/upload", response_model=FontUploadResponse)
@limiter.limit("10/minute")
async def upload_font(request: Request, file: UploadFile = File(...)):
    """Upload a TTF/OTF font file."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in (".ttf", ".otf", ".woff"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {ext}. Use .ttf or .otf"
        )

    # Save uploaded file — use UUID filename to prevent command injection
    temp_dir = Path(tempfile.mkdtemp(dir=str(UPLOAD_DIR)))
    font_path = temp_dir / f"{uuid.uuid4().hex}{ext}"

    try:
        with open(font_path, "wb") as f:
            content = await file.read(MAX_FONT_SIZE + 1)
            if len(content) > MAX_FONT_SIZE:
                shutil.rmtree(temp_dir, ignore_errors=True)
                raise HTTPException(status_code=413, detail="Font file too large (max 50MB)")
            if not _valid_magic(content, ext):
                shutil.rmtree(temp_dir, ignore_errors=True)
                raise HTTPException(status_code=400, detail="Invalid font file format")
            f.write(content)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to save uploaded font file: %s", e)
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="Failed to save file")

    # Parse font
    try:
        tt_font = parse_font(font_path)
    except Exception as e:
        logger.error("Invalid font file: %s", e)
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Invalid font file")

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
