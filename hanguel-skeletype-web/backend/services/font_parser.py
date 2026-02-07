from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen


def parse_font(file_path: Path) -> TTFont:
    """Parse a TTF/OTF font file and return a TTFont object."""
    return TTFont(str(file_path))


def get_glyph_info(tt_font: TTFont) -> list[dict]:
    """Extract info for all glyphs in the font."""
    cmap = tt_font.getBestCmap() or {}
    reverse_cmap = {v: k for k, v in cmap.items()}
    glyph_order = tt_font.getGlyphOrder()

    glyph_set = tt_font.getGlyphSet()
    glyphs = []

    for name in glyph_order:
        unicode_val = reverse_cmap.get(name)
        character = chr(unicode_val) if unicode_val else None

        # Check if glyph has outlines
        has_outline = False
        try:
            glyph = glyph_set[name]
            if glyph.width > 0 or name not in (".notdef", ".null", "NULL"):
                from fontTools.pens.boundsPen import BoundsPen
                pen = BoundsPen(glyph_set)
                glyph.draw(pen)
                has_outline = pen.bounds is not None
        except Exception:
            pass

        glyphs.append({
            "name": name,
            "unicode": unicode_val,
            "character": character,
            "has_outline": has_outline,
        })

    return glyphs


def get_glyph_outline_svg(tt_font: TTFont, glyph_name: str) -> dict | None:
    """
    Extract glyph outline as SVG path data.

    Returns dict with:
        - path: SVG path 'd' attribute string
        - bounds: {xMin, yMin, xMax, yMax} in font units
        - width, height: glyph dimensions in font units
    """
    try:
        glyph_set = tt_font.getGlyphSet()
        if glyph_name not in glyph_set:
            return None

        glyph = glyph_set[glyph_name]

        # Get bounds
        bounds_pen = BoundsPen(glyph_set)
        glyph.draw(bounds_pen)
        bounds = bounds_pen.bounds
        if bounds is None:
            return None

        xMin, yMin, xMax, yMax = bounds

        # Get SVG path
        svg_pen = SVGPathPen(glyph_set)
        glyph.draw(svg_pen)
        path_data = svg_pen.getCommands()

        if not path_data:
            return None

        return {
            "path": path_data,
            "bounds": {
                "xMin": xMin,
                "yMin": yMin,
                "xMax": xMax,
                "yMax": yMax,
            },
            "width": xMax - xMin,
            "height": yMax - yMin,
        }
    except Exception as e:
        print(f"Failed to get outline for {glyph_name}: {e}")
        return None
