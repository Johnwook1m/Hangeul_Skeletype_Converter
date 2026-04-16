"""Hanguel Skeletype Web - FastAPI Backend"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import check_dependencies, ARCHIVE_DIR
from database import init_db
from limiter import limiter
from routers import font_upload, glyphs, centerline, export, archive

app = FastAPI(
    title="Hanguel Skeletype Web",
    description="Font centerline extraction and stroke-based font generation",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.on_event("startup")
def on_startup():
    init_db()

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
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
)

# Mount API routers
app.include_router(font_upload.router)
app.include_router(glyphs.router)
app.include_router(centerline.router)
app.include_router(export.router)
app.include_router(archive.router)


@app.get("/api/health")
async def health_check():
    """Check server status and external dependencies."""
    deps = check_dependencies()
    return {
        "status": "ok",
        "dependencies": deps,
    }


# Serve archive preview images (persistent, outside /tmp/)
app.mount("/archive-images", StaticFiles(directory=str(ARCHIVE_DIR)), name="archive-images")

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
