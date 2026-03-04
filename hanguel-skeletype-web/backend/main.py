"""Hanguel Skeletype Web - FastAPI Backend"""

import os
from pathlib import Path

# Build version — bump this when pushing fixes so we can verify Railway deployed latest code.
BUILD_VERSION = "2026-03-04-v4"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import check_dependencies
from routers import font_upload, glyphs, centerline, export

app = FastAPI(
    title="Hanguel Skeletype Web",
    description="Font centerline extraction and stroke-based font generation",
    version="0.1.0",
)

# CORS — allow localhost (dev) + any deployed domain via env var
_extra_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *[o.strip() for o in _extra_origins if o.strip()],
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(font_upload.router)
app.include_router(glyphs.router)
app.include_router(centerline.router)
app.include_router(export.router)


@app.get("/api/health")
async def health_check():
    """Check server status and external dependencies."""
    deps = check_dependencies()
    return {
        "status": "ok",
        "build_version": BUILD_VERSION,
        "dependencies": deps,
    }


# Serve React SPA (production build) — must be registered LAST
_DIST = Path(__file__).parent / "dist"
if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        """Serve static files from dist/, or fall back to index.html for SPA routing."""
        file_path = (_DIST / full_path).resolve()
        if file_path.is_file() and file_path.is_relative_to(_DIST.resolve()):
            return FileResponse(file_path)
        return FileResponse(_DIST / "index.html")
