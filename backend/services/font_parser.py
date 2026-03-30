from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen


def parse_font(file_path: Path) -> TTFont:
    """Parse a TTF/OTF font file and return a TTFont object."""
    return TTFont(str(file_path))


def get_glyph_info(tt_font: TTFont) -> list[dict]:
    """Extract info for all glyphs in the font.

    Uses glyf/CFF tables directly to check outlines instead of drawing
    each glyph with BoundsPen (which is extremely slow for large fonts).
    """
    cmap = tt_font.getBestCmap() or {}
    reverse_cmap = {v: k for k, v in cmap.items()}
    glyph_order = tt_font.getGlyphOrder()

    # Build a fast has_outline lookup from the raw glyph tables
    outline_set = _build_outline_set(tt_font, glyph_order)

    glyphs = []
    for name in glyph_order:
        unicode_val = reverse_cmap.get(name)
        character = chr(unicode_val) if unicode_val else None

        glyphs.append({
            "name": name,
            "unicode": unicode_val,
            "character": character,
            "has_outline": name in outline_set,
        })

    return glyphs


def _build_outline_set(tt_font: TTFont, glyph_order: list[str]) -> set[str]:
    """Return set of glyph names that have visible outlines.

    For TrueType fonts (glyf table): numberOfContours != 0 means has outline.
    For CFF fonts: charstring program longer than just 'endchar' means has outline.
    """
    result = set()

    # TrueType: check glyf table directly
    glyf_table = tt_font.get("glyf")
    if glyf_table is not None:
        for name in glyph_order:
            try:
                glyph = glyf_table[name]
                # numberOfContours > 0: simple outline
                # numberOfContours == -1: composite (references other glyphs)
                # numberOfContours == 0: empty
                if glyph.numberOfContours != 0:
                    result.add(name)
            except Exception:
                pass
        return result

    # CFF/CFF2: check charstring bytecode length
    # fontTools lazy-loads CFF charstrings: cs.program is [] until decompiled,
    # but cs.bytecode contains the raw bytes immediately.
    # endchar alone = 1 byte; anything longer has drawing commands or width.
    for table_tag in ("CFF ", "CFF2"):
        cff_table = tt_font.get(table_tag)
        if cff_table is not None:
            try:
                top_dict = cff_table.cff.topDictIndex[0]
                charstrings = top_dict.CharStrings
                for name in glyph_order:
                    if name in charstrings:
                        cs = charstrings[name]
                        bytecode = getattr(cs, "bytecode", None)
                        if bytecode is not None:
                            # endchar = 1 byte; width+endchar ≤ 5 bytes
                            # actual outlines are much longer
                            if len(bytecode) > 1:
                                result.add(name)
                        elif len(cs.program) > 1:
                            result.add(name)
            except Exception:
                pass
            return result

    return result


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
