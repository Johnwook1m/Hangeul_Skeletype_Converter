from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

# Load .env file if present (python-dotenv)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

# Temporary file storage
UPLOAD_DIR = Path("/tmp/skeletype-web/uploads")
TEMP_DIR = Path("/tmp/skeletype-web/temp")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Session expiry (seconds)
SESSION_EXPIRY = 3600  # 1 hour

# Debug: keep intermediate temp files (PNG, SVG) after extraction
DEBUG_KEEP_TEMP = os.environ.get("DEBUG_KEEP_TEMP", "false").lower() == "true"

# Persistent archive storage (images + SQLite DB live here)
ARCHIVE_DIR = Path(__file__).parent / "data" / "archives"
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

# Google API integration (optional — all three must be set to enable sync)
#
# 인증 방식 (둘 중 하나만 설정):
#   GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT : 서비스 계정 JSON 파일의 내용 전체 (문자열)  ← 권장
#   GOOGLE_SERVICE_ACCOUNT_JSON         : 서비스 계정 JSON 파일의 경로 (레거시)
GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT", "")
GOOGLE_SERVICE_ACCOUNT_JSON = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "")
GOOGLE_DRIVE_ROOT_FOLDER_ID = os.environ.get("GOOGLE_DRIVE_ROOT_FOLDER_ID", "")
GOOGLE_SPREADSHEET_ID = os.environ.get("GOOGLE_SPREADSHEET_ID", "")
GOOGLE_SHEET_NAME = os.environ.get("GOOGLE_SHEET_NAME", "Archives")

GOOGLE_SYNC_ENABLED = bool(
    (GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT or GOOGLE_SERVICE_ACCOUNT_JSON)
    and GOOGLE_DRIVE_ROOT_FOLDER_ID
    and GOOGLE_SPREADSHEET_ID
)


def find_tool(name: str, extra_paths: list[str] | None = None) -> str | None:
    """Find a CLI tool by checking common paths and PATH."""
    paths_to_check = extra_paths or []
    if name == "magick":
        paths_to_check = [
            "/opt/homebrew/bin/magick",
            "/opt/homebrew/bin/convert",
            "/usr/local/bin/magick",
            "/usr/local/bin/convert",
        ]
    elif name == "autotrace":
        paths_to_check = [
            "/opt/homebrew/bin/autotrace",
            "/usr/local/bin/autotrace",
        ]
    elif name == "fontforge":
        paths_to_check = [
            "/opt/homebrew/bin/fontforge",
            "/usr/local/bin/fontforge",
        ]

    for p in paths_to_check:
        if Path(p).is_file():
            return p

    found = shutil.which(name)
    if found:
        return found
    return None


IMAGEMAGICK_CMD = find_tool("magick")
AUTOTRACE_CMD = find_tool("autotrace")
FONTFORGE_CMD = find_tool("fontforge")


def check_dependencies() -> dict[str, bool]:
    """Check all required external tools."""
    return {
        "imagemagick": IMAGEMAGICK_CMD is not None,
        "autotrace": AUTOTRACE_CMD is not None,
        "fontforge": FONTFORGE_CMD is not None,
    }
