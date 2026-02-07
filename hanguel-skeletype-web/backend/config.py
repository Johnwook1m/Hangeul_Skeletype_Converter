import shutil
import subprocess
from pathlib import Path

# Temporary file storage
UPLOAD_DIR = Path("/tmp/skeletype-web/uploads")
TEMP_DIR = Path("/tmp/skeletype-web/temp")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Session expiry (seconds)
SESSION_EXPIRY = 3600  # 1 hour


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
