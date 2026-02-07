import asyncio
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models.schemas import ExtractRequest
from models.font_session import session_store
from services.rasterizer import rasterize_glyph
from services.centerline_extractor import extract_centerline
from services.svg_parser import parse_svg
from services.font_parser import get_glyph_outline_svg

router = APIRouter(prefix="/api/font", tags=["centerline"])


@router.post("/{font_id}/extract")
async def extract_centerlines(font_id: str, request: ExtractRequest):
    """
    Extract centerlines from glyphs.
    Returns SSE stream with progress updates.
    """
    session = session_store.get(font_id)
    if not session:
        raise HTTPException(status_code=404, detail="Font session not found")

    # Determine which glyphs to process
    if request.all:
        from services.font_parser import get_glyph_info
        all_info = get_glyph_info(session.tt_font)
        glyph_names = [g["name"] for g in all_info if g["has_outline"]]
    elif request.glyph_names:
        glyph_names = request.glyph_names
    else:
        raise HTTPException(
            status_code=400,
            detail="Specify glyph_names or set all=true"
        )

    async def event_stream():
        work_dir = session.temp_dir / "centerlines"
        work_dir.mkdir(exist_ok=True)

        total = len(glyph_names)
        success = 0
        failed = 0

        for i, name in enumerate(glyph_names):
            # Skip if already extracted
            if name in session.centerlines:
                success += 1
                event = {
                    "type": "skip",
                    "glyph": name,
                    "index": i + 1,
                    "total": total,
                }
                yield f"data: {json.dumps(event)}\n\n"
                continue

            # Send progress event
            event = {
                "type": "progress",
                "glyph": name,
                "index": i + 1,
                "total": total,
            }
            yield f"data: {json.dumps(event)}\n\n"

            # Step 1: Rasterize to PNG
            png_path = work_dir / f"{name}.png"
            raster_result = await asyncio.to_thread(
                rasterize_glyph, session.tt_font, name, png_path
            )

            if raster_result is None:
                failed += 1
                event = {
                    "type": "error",
                    "glyph": name,
                    "message": "Rasterization failed",
                }
                yield f"data: {json.dumps(event)}\n\n"
                continue

            # Step 2: Extract centerline
            svg_path = work_dir / f"{name}.svg"
            ok = await asyncio.to_thread(extract_centerline, raster_result["path"], svg_path)

            if not ok:
                failed += 1
                event = {
                    "type": "error",
                    "glyph": name,
                    "message": "Centerline extraction failed",
                }
                yield f"data: {json.dumps(event)}\n\n"
                continue

            # Step 3: Parse SVG
            svg_data = await asyncio.to_thread(parse_svg, svg_path)

            if svg_data is None:
                failed += 1
                event = {
                    "type": "error",
                    "glyph": name,
                    "message": "SVG parsing failed",
                }
                yield f"data: {json.dumps(event)}\n\n"
                continue

            # Get original glyph outline for "show flesh" feature
            outline_data = await asyncio.to_thread(
                get_glyph_outline_svg, session.tt_font, name
            )

            # Combine SVG data with glyph metrics for proper scaling
            centerline_data = {
                **svg_data,
                "glyph_height": raster_result["glyph_height"],
                "glyph_width": raster_result["glyph_width"],
                "raster_scale": raster_result["scale"],
                "bounds": raster_result["bounds"],
                "outline": outline_data,  # Original glyph outline
            }

            # Store centerline data in session
            session.centerlines[name] = centerline_data
            success += 1

            event = {
                "type": "complete",
                "glyph": name,
                "index": i + 1,
                "total": total,
                "paths": svg_data["paths"],
                "view_box": svg_data["view_box"],
                "glyph_height": raster_result["glyph_height"],
                "glyph_width": raster_result["glyph_width"],
                "raster_scale": raster_result["scale"],
                "bounds": raster_result["bounds"],
                "outline": outline_data,  # Original glyph outline
            }
            yield f"data: {json.dumps(event)}\n\n"

        # Final summary
        event = {
            "type": "done",
            "success": success,
            "failed": failed,
            "total": total,
        }
        yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
