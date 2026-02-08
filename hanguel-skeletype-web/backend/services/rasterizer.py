"""Glyph rasterization using fontTools FreeTypePen.

Replaces the Glyphs SDK-based saveLayerAsPNG() from the plugin.
Uses FreeTypePen to render glyph outlines to PNG via FreeType.
"""

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.freetypePen import FreeTypePen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image

from .component_decomposer import has_components, get_component_info


def rasterize_glyph(
    tt_font: TTFont,
    glyph_name: str,
    output_path: Path,
    target_height: int = 1000,
    ascender: int | None = None,
    descender: int | None = None,
) -> dict | None:
    """
    Render a single glyph to a PNG file.

    Uses font-level ascender/descender when provided to ensure all glyphs
    share the same coordinate frame (consistent scale and baseline position).

    Args:
        tt_font: Parsed font object
        glyph_name: Name of the glyph to render
        output_path: Where to save the PNG
        target_height: Target height in pixels
        ascender: Font ascender in font units (for consistent Y positioning)
        descender: Font descender in font units (negative value)

    Returns:
        Dict with path, bounds, scale info, or None if rendering failed
    """
    try:
        glyph_set = tt_font.getGlyphSet()
        if glyph_name not in glyph_set:
            return None

        glyph = glyph_set[glyph_name]

        # Check for components and log (for debugging)
        if has_components(tt_font, glyph_name):
            comp_info = get_component_info(tt_font, glyph_name)
            print(f"    🔧 Component detected in '{glyph_name}'")
            print(f"       - Component count: {comp_info['count']}")
            print(f"       - Components: {', '.join(comp_info['names'])}")
            # Note: fontTools' glyph.draw() automatically decomposes components

        # Skip empty glyphs
        bounds_pen = BoundsPen(glyph_set)
        glyph.draw(bounds_pen)
        bounds = bounds_pen.bounds
        if bounds is None:
            return None

        # Get glyph bounds
        xMin, yMin, xMax, yMax = bounds
        glyph_width = xMax - xMin
        glyph_height = yMax - yMin

        if glyph_width <= 0 or glyph_height <= 0:
            return None

        padding = 20

        # Use font-level metrics for consistent coordinate frame across all glyphs
        if ascender is not None and descender is not None:
            font_height = ascender - descender
            scale = target_height / font_height if font_height > 0 else 1.0
            # Baseline-relative Y offset: places descender at bottom padding
            offset_y = -descender * scale + padding
        else:
            # Fallback: per-glyph scaling (legacy behavior)
            font_height = glyph_height
            scale = target_height / glyph_height if glyph_height > 0 else 1.0
            offset_y = -yMin * scale + padding

        pixel_width = max(int(glyph_width * scale) + 2 * padding, 100)
        pixel_height = target_height + 2 * padding
        offset_x = -xMin * scale + padding

        # Render using FreeTypePen
        pen = FreeTypePen(glyph_set)
        glyph.draw(pen)

        # Render to image with transformation
        # contain=False so our exact transform is used (consistent baseline positioning)
        img = pen.image(
            width=pixel_width,
            height=pixel_height,
            transform=(scale, 0, 0, scale, offset_x, offset_y),
            contain=False,
        )

        # FreeTypePen returns LA (grayscale + alpha) or RGBA image
        # Black glyph on transparent background
        # We need to convert to: black glyph on white background (RGB)

        # Create white background
        background = Image.new("RGB", img.size, (255, 255, 255))

        if img.mode == "LA":
            # Luminance + Alpha: use alpha channel as mask
            l_channel, alpha = img.split()
            # Where alpha > 0, draw black
            background.paste((0, 0, 0), mask=alpha)
        elif img.mode == "RGBA":
            # RGBA: use alpha channel as mask
            r, g, b, alpha = img.split()
            background.paste((0, 0, 0), mask=alpha)
        elif img.mode == "L":
            # Grayscale only - invert (white=255 -> black=0)
            from PIL import ImageOps
            inverted = ImageOps.invert(img)
            background = Image.merge("RGB", [inverted, inverted, inverted])
        else:
            # Other modes - try direct conversion
            background = img.convert("RGB")

        background.save(str(output_path), "PNG")

        # Get advance width from glyph metrics
        advance_width = glyph.width if hasattr(glyph, 'width') else glyph_width

        # Return path along with glyph metrics for proper scaling
        return {
            "path": output_path,
            "bounds": {
                "xMin": xMin,
                "yMin": yMin,
                "xMax": xMax,
                "yMax": yMax,
            },
            "glyph_width": glyph_width,
            "glyph_height": glyph_height,
            "advance_width": advance_width,
            "scale": scale,
            "pixel_width": pixel_width,
            "pixel_height": pixel_height,
            "ascender": ascender,
            "descender": descender,
            "font_height": font_height,
        }

    except Exception as e:
        print(f"Rasterization failed for {glyph_name}: {e}")
        import traceback
        traceback.print_exc()
        return None


def rasterize_glyph_preview(
    tt_font: TTFont,
    glyph_name: str,
    output_path: Path,
    target_height: int = 200,
) -> Path | None:
    """Render a small preview thumbnail of a glyph."""
    result = rasterize_glyph(tt_font, glyph_name, output_path, target_height)
    return result["path"] if result else None
