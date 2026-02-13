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

MAX_WORKERS = 3  # Moderate parallelism (Autotrace/pstoedit can be unstable at high concurrency)
MAX_RETRIES = 2  # Retry failed glyphs up to 2 times (sequentially)


@router.post("/{font_id}/extract")
async def extract_centerlines(font_id: str, request: ExtractRequest):
    """
    Extract centerlines from glyphs.
    Returns SSE stream with progress updates.
    Processes up to MAX_WORKERS glyphs in parallel.
    Failed glyphs are retried sequentially up to MAX_RETRIES times.
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

        async def do_extract(name: str, work_dir: Path):
            """Run the 3-stage extraction pipeline. Returns (centerline_data, error_msg)."""
            # Step 1: Rasterize to PNG
            png_path = work_dir / f"{name}.png"
            raster_result = await asyncio.to_thread(
                rasterize_glyph, session.tt_font, name, png_path,
                ascender=session.ascender,
                descender=session.descender,
            )

            if raster_result is None:
                return None, "Rasterization failed"

            # Step 2: Extract centerline
            svg_path = work_dir / f"{name}.svg"
            ok = await asyncio.to_thread(
                extract_centerline, raster_result["path"], svg_path
            )

            if not ok:
                return None, "Centerline extraction failed"

            # Step 3: Parse SVG
            svg_data = await asyncio.to_thread(parse_svg, svg_path)

            if svg_data is None:
                return None, "SVG parsing failed"

            # Get original glyph outline for "show flesh" feature
            outline_data = await asyncio.to_thread(
                get_glyph_outline_svg, session.tt_font, name
            )

            return {
                "svg_data": svg_data,
                "raster_result": raster_result,
                "outline_data": outline_data,
            }, None

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

                result, error_msg = await do_extract(name, work_dir)

                if result is None:
                    # Return failure info for retry phase
                    await queue.put({
                        "type": "retry_pending",
                        "glyph": name,
                        "index": i + 1,
                        "total": total,
                        "message": error_msg,
                    })
                    return

                svg_data = result["svg_data"]
                raster_result = result["raster_result"]
                outline_data = result["outline_data"]

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
        failed_glyphs = []  # Collect failed glyphs for retry

        while done_count < total:
            event = await queue.get()

            if event["type"] in ("complete", "skip"):
                success += 1
                done_count += 1
                yield f"data: {json.dumps(event)}\n\n"
            elif event["type"] == "retry_pending":
                failed_glyphs.append((event["index"] - 1, event["glyph"]))
                done_count += 1
                # Don't yield error yet - will retry
            else:
                # "progress" events don't count toward completion
                yield f"data: {json.dumps(event)}\n\n"

        # Ensure all tasks are cleaned up
        await asyncio.gather(*tasks, return_exceptions=True)

        # Retry failed glyphs sequentially (one at a time to avoid concurrency issues)
        if failed_glyphs:
            print(f"Retrying {len(failed_glyphs)} failed glyphs sequentially...")

        for attempt in range(MAX_RETRIES):
            if not failed_glyphs:
                break

            still_failing = []
            for i, name in failed_glyphs:
                yield f"data: {json.dumps({'type': 'progress', 'glyph': name, 'index': i + 1, 'total': total, 'retry': attempt + 1})}\n\n"

                # Clean up previous artifacts before retry
                for ext in (".png", ".svg", ".bmp"):
                    artifact = work_dir / f"{name}{ext}"
                    if artifact.exists():
                        artifact.unlink()

                result, error_msg = await do_extract(name, work_dir)

                if result is not None:
                    svg_data = result["svg_data"]
                    raster_result = result["raster_result"]
                    outline_data = result["outline_data"]

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
                    session.centerlines[name] = centerline_data

                    success += 1
                    yield f"data: {json.dumps({'type': 'complete', 'glyph': name, 'index': i + 1, 'total': total, 'paths': svg_data['paths'], 'view_box': svg_data['view_box'], 'glyph_height': raster_result['glyph_height'], 'glyph_width': raster_result['glyph_width'], 'advance_width': raster_result['advance_width'], 'raster_scale': raster_result['scale'], 'bounds': raster_result['bounds'], 'outline': outline_data, 'ascender': session.ascender, 'descender': session.descender, 'font_height': raster_result['font_height']})}\n\n"
                    print(f"  ✅ Retry {attempt + 1} succeeded for '{name}'")
                else:
                    still_failing.append((i, name))
                    print(f"  ❌ Retry {attempt + 1} failed for '{name}': {error_msg}")

            failed_glyphs = still_failing

        # Emit final errors for glyphs that failed all retries
        final_failed = len(failed_glyphs)
        for i, name in failed_glyphs:
            yield f"data: {json.dumps({'type': 'error', 'glyph': name, 'message': f'Failed after {MAX_RETRIES} retries'})}\n\n"

        # Final summary
        yield f"data: {json.dumps({'type': 'done', 'success': success, 'failed': final_failed, 'total': total})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
