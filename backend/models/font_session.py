import secrets
import time
import uuid
from pathlib import Path
from dataclasses import dataclass, field

from fontTools.ttLib import TTFont


@dataclass
class FontSession:
    font_id: str
    font_path: Path
    tt_font: TTFont
    family_name: str
    glyph_names: list[str]
    cmap: dict[int, str]
    ascender: int
    descender: int
    units_per_em: int
    created_at: float = field(default_factory=time.time)
    centerlines: dict[str, dict] = field(default_factory=dict)
    temp_dir: Path | None = None
    glyph_info: list[dict] = field(default_factory=list)  # cached glyph metadata


class SessionStore:
    """In-memory session storage for font data."""

    def __init__(self, expiry_seconds: int = 3600):
        self._sessions: dict[str, FontSession] = {}
        self._expiry = expiry_seconds

    def create(self, font_path: Path, tt_font: TTFont, temp_dir: Path) -> FontSession:
        font_id = secrets.token_urlsafe(32)

        cmap = tt_font.getBestCmap() or {}
        glyph_order = tt_font.getGlyphOrder()

        # Extract vertical metrics
        os2 = tt_font.get("OS/2")
        hhea = tt_font.get("hhea")
        head = tt_font["head"]

        if os2:
            ascender = os2.usWinAscent
            descender = -abs(os2.usWinDescent)
        elif hhea:
            ascender = hhea.ascent
            descender = hhea.descent
        else:
            ascender = head.unitsPerEm
            descender = 0

        # Get family name
        name_table = tt_font.get("name")
        family_name = "Unknown"
        if name_table:
            for record in name_table.names:
                if record.nameID == 1:
                    try:
                        family_name = record.toUnicode()
                        break
                    except Exception:
                        pass

        # Pre-compute glyph info (fast — reads tables directly, no drawing)
        from services.font_parser import get_glyph_info
        glyph_info = get_glyph_info(tt_font)

        session = FontSession(
            font_id=font_id,
            font_path=font_path,
            tt_font=tt_font,
            family_name=family_name,
            glyph_names=glyph_order,
            cmap=cmap,
            ascender=ascender,
            descender=descender,
            units_per_em=head.unitsPerEm,
            temp_dir=temp_dir,
            glyph_info=glyph_info,
        )
        self._sessions[font_id] = session
        self._cleanup_expired()
        return session

    def get(self, font_id: str) -> FontSession | None:
        session = self._sessions.get(font_id)
        if session and (time.time() - session.created_at) > self._expiry:
            del self._sessions[font_id]
            return None
        return session

    def _cleanup_expired(self):
        now = time.time()
        expired = [
            k for k, v in self._sessions.items()
            if (now - v.created_at) > self._expiry
        ]
        for k in expired:
            del self._sessions[k]


# Global session store
session_store = SessionStore()
