import asyncio
import json
import os
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

MAX_WORKERS = min(os.cpu_count() or 4, 8)


@router.post("/{font_id}/extract")
async def extract_centerlines(font_id: str, request: ExtractRequest):
    """
    Extract centerlines from glyphs.
    Returns SSE stream with progress updates.
    Processes up to MAX_WORKERS glyphs in parallel.
    """
    session = session_store.get(font_id)
    if not session:
        raise HTTPException(status_code=404, detail="Font session not found")

    # Determine which glyphs to process
    if request.all:
        glyph_names = [g["name"] for g in session.glyph_info if g["has_outline"]]
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
        queue: asyncio.Queue = asyncio.Queue()
        semaphore = asyncio.Semaphore(MAX_WORKERS)

        async def process_glyph(i: int, name: str):
            async with semaphore:
                # Skip if already extracted
                if name in session.centerlines:
                    await queue.put({
                        "type": "skip",
                        "glyph": name,
                        "index": i + 1,
                        "total": total,
                    })
                    return

                # Send progress event
                await queue.put({
                    "type": "progress",
                    "glyph": name,
                    "index": i + 1,
                    "total": total,
                })

                # Step 1: Rasterize to PNG
                png_path = work_dir / f"{name}.png"
                raster_result = await asyncio.to_thread(
                    rasterize_glyph, session.tt_font, name, png_path,
                    ascender=session.ascender,
                    descender=session.descender,
                )

                if raster_result is None:
                    await queue.put({
                        "type": "error",
                        "glyph": name,
                        "message": "Rasterization failed",
                    })
                    return

                # Step 2: Extract centerline
                svg_path = work_dir / f"{name}.svg"
                ok = await asyncio.to_thread(
                    extract_centerline, raster_result["path"], svg_path
                )

                if not ok:
                    await queue.put({
                        "type": "error",
                        "glyph": name,
                        "message": "Centerline extraction failed",
                    })
                    return

                # Step 3: Parse SVG
                svg_data = await asyncio.to_thread(parse_svg, svg_path)

                if svg_data is None:
                    await queue.put({
                        "type": "error",
                        "glyph": name,
                        "message": "SVG parsing failed",
                    })
                    return

                # Get original glyph outline for "show flesh" feature
                outline_data = await asyncio.to_thread(
                    get_glyph_outline_svg, session.tt_font, name
                )

                # Combine SVG data with glyph metrics
                centerline_data = {
                    **svg_data,
                    "glyph_height": raster_result["glyph_height"],
                    "glyph_width": raster_result["glyph_width"],
                    "advance_width": raster_result["advance_width"],
                    "raster_scale": raster_result["scale"],
                    "bounds": raster_result["bounds"],
                    "outline": outline_data,
                    "ascender": session.ascender,
                    "descender": session.descender,
                    "font_height": raster_result["font_height"],
                }

                # Store in session
                session.centerlines[name] = centerline_data

                await queue.put({
                    "type": "complete",
                    "glyph": name,
                    "index": i + 1,
                    "total": total,
                    "paths": svg_data["paths"],
                    "view_box": svg_data["view_box"],
                    "glyph_height": raster_result["glyph_height"],
                    "glyph_width": raster_result["glyph_width"],
                    "advance_width": raster_result["advance_width"],
                    "raster_scale": raster_result["scale"],
                    "bounds": raster_result["bounds"],
                    "outline": outline_data,
                    "ascender": session.ascender,
                    "descender": session.descender,
                    "font_height": raster_result["font_height"],
                })

        # Launch all glyph workers (semaphore limits concurrency)
        tasks = [
            asyncio.create_task(process_glyph(i, name))
            for i, name in enumerate(glyph_names)
        ]

        # Consumer: yield SSE events as they arrive
        done_count = 0
        success = 0
        failed = 0

        while done_count < total:
            event = await queue.get()

            if event["type"] in ("complete", "skip"):
                success += 1
                done_count += 1
            elif event["type"] == "error":
                failed += 1
                done_count += 1
            # "progress" events don't count toward completion

            yield f"data: {json.dumps(event)}\n\n"

        # Ensure all tasks are cleaned up
        await asyncio.gather(*tasks, return_exceptions=True)

        # Final summary
        yield f"data: {json.dumps({'type': 'done', 'success': success, 'failed': failed, 'total': total})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
