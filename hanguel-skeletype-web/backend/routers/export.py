import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from models.schemas import ExportRequest
from models.font_session import session_store
from services.font_generator import generate_font

router = APIRouter(prefix="/api/font", tags=["export"])


@router.post("/{font_id}/export")
async def export_font(font_id: str, request: ExportRequest):
    """
    Generate and download a font file with stroke-expanded centerlines.
    """
    session = session_store.get(font_id)
    if not session:
        raise HTTPException(status_code=404, detail="Font session not found")

    if not session.centerlines:
        raise HTTPException(
            status_code=400,
            detail="No centerlines extracted. Run extraction first."
        )

    # Validate format
    fmt = request.format.lower()
    if fmt not in ("otf", "ttf"):
        raise HTTPException(status_code=400, detail="Format must be 'otf' or 'ttf'")

    # Build centerline SVG file mapping
    work_dir = session.temp_dir / "centerlines"
    centerline_svgs = {}
    for name, data in session.centerlines.items():
        svg_path = work_dir / f"{name}.svg"
        if svg_path.exists():
            centerline_svgs[name] = svg_path

    if not centerline_svgs:
        raise HTTPException(
            status_code=400,
            detail="No centerline SVG files found"
        )

    # Generate font
    export_dir = session.temp_dir / "export"
    export_dir.mkdir(exist_ok=True)
    output_filename = f"{session.family_name}_Skeletype.{fmt}"
    output_path = export_dir / output_filename

    success = generate_font(
        original_font_path=session.font_path,
        centerline_svgs=centerline_svgs,
        output_path=output_path,
        stroke_width=request.stroke_width,
        stroke_cap=request.stroke_cap,
        stroke_join=request.stroke_join,
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Font generation failed. Check server logs."
        )

    return FileResponse(
        str(output_path),
        media_type="application/octet-stream",
        filename=output_filename,
    )
