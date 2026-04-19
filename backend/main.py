"""Hanguel Skeletype Web - FastAPI Backend"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import check_dependencies, ARCHIVE_DIR
from database import init_db
from limiter import limiter
from routers import font_upload, glyphs, centerline, export, archive, admin

app = FastAPI(
    title="Hanguel Skeletype Web",
    description="Font centerline extraction and stroke-based font generation",
    version="0.1.0",
)

# SlowAPIMiddleware는 BaseHTTPMiddleware 기반이라 SSE 스트리밍을 깨뜨림.
# 예외 핸들러만 등록하고 미들웨어는 사용하지 않음 — @limiter.limit() 데코레이터는 독립 작동.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.on_event("startup")
def on_startup():
    init_db()


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "font-src 'self' https://cdn.jsdelivr.net data:; "
        "img-src 'self' data: blob:; "
        "connect-src 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none';"
    )
    return response


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
app.include_router(admin.router)


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
