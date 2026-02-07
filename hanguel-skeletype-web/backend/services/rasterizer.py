"""Glyph rasterization using fontTools FreeTypePen.

Replaces the Glyphs SDK-based saveLayerAsPNG() from the plugin.
Uses FreeTypePen to render glyph outlines to PNG via FreeType.
"""

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.freetypePen import FreeTypePen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image


def rasterize_glyph(
    tt_font: TTFont,
    glyph_name: str,
    output_path: Path,
    target_height: int = 1000,
) -> dict | None:
    """
    Render a single glyph to a PNG file.

    Args:
        tt_font: Parsed font object
        glyph_name: Name of the glyph to render
        output_path: Where to save the PNG
        target_height: Target height in pixels

    Returns:
        Dict with path, bounds, scale info, or None if rendering failed
    """
    try:
        glyph_set = tt_font.getGlyphSet()
        if glyph_name not in glyph_set:
            return None

        glyph = glyph_set[glyph_name]

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

        # Calculate scale to fit target height
        scale = target_height / glyph_height if glyph_height > 0 else 1.0
        pixel_width = max(int(glyph_width * scale) + 40, 100)
        pixel_height = target_height + 40

        # Render using FreeTypePen
        pen = FreeTypePen(glyph_set)
        glyph.draw(pen)

        # Calculate transform to position glyph in image
        # FreeTypePen uses bottom-left origin, we need to shift the glyph
        offset_x = -xMin * scale + 20
        offset_y = -yMin * scale + 20

        # Render to image with transformation
        # contain=True ensures the glyph fits within the bounds
        img = pen.image(
            width=pixel_width,
            height=pixel_height,
            transform=(scale, 0, 0, scale, offset_x, offset_y),
            contain=True,
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
            "scale": scale,
            "pixel_width": pixel_width,
            "pixel_height": pixel_height,
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
