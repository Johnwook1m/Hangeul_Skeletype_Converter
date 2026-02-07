from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from models.schemas import GlyphInfo, GlyphListResponse, CenterlineResponse
from models.font_session import session_store
from services.font_parser import get_glyph_info
from services.rasterizer import rasterize_glyph_preview

router = APIRouter(prefix="/api/font", tags=["glyphs"])


@router.get("/{font_id}/glyphs", response_model=GlyphListResponse)
async def list_glyphs(
    font_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),
):
    """List all glyphs in the uploaded font."""
    session = session_store.get(font_id)
    if not session:
        raise HTTPException(status_code=404, detail="Font session not found")

    all_glyphs = get_glyph_info(session.tt_font)

    # Add centerline status
    glyph_list = []
    for g in all_glyphs:
        glyph_list.append(GlyphInfo(
            name=g["name"],
            unicode=g["unicode"],
            character=g["character"],
            has_outline=g["has_outline"],
            has_centerline=g["name"] in session.centerlines,
        ))

    # Paginate
    start = (page - 1) * per_page
    end = start + per_page
    page_glyphs = glyph_list[start:end]

    return GlyphListResponse(
        glyphs=page_glyphs,
        total=len(glyph_list),
        page=page,
        per_page=per_page,
    )


@router.get("/{font_id}/glyph/{glyph_name}/preview")
async def glyph_preview(font_id: str, glyph_name: str):
    """Get a PNG preview thumbnail of a glyph."""
    session = session_store.get(font_id)
    if not session:
        raise HTTPException(status_code=404, detail="Font session not found")

    if glyph_name not in session.glyph_names:
        raise HTTPException(status_code=404, detail="Glyph not found")

    # Generate preview PNG
    preview_dir = session.temp_dir / "previews"
    preview_dir.mkdir(exist_ok=True)
    preview_path = preview_dir / f"{glyph_name}.png"

    if not preview_path.exists():
        result = rasterize_glyph_preview(
            session.tt_font, glyph_name, preview_path
        )
        if result is None:
            raise HTTPException(status_code=404, detail="Glyph has no outline")

    return FileResponse(str(preview_path), media_type="image/png")


@router.get("/{font_id}/centerline/{glyph_name}", response_model=CenterlineResponse)
async def get_centerline(font_id: str, glyph_name: str):
    """Get the extracted centerline SVG data for a glyph."""
    session = session_store.get(font_id)
    if not session:
        raise HTTPException(status_code=404, detail="Font session not found")

    if glyph_name not in session.centerlines:
        raise HTTPException(
            status_code=404,
            detail="Centerline not extracted for this glyph"
        )

    cl = session.centerlines[glyph_name]
    return CenterlineResponse(
        glyph_name=glyph_name,
        paths=cl["paths"],
        view_box=cl["view_box"],
        width=cl["width"],
        height=cl["height"],
    )
