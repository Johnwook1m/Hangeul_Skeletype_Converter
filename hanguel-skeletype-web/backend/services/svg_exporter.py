"""SVG export with stroke-based single-line paths.

Exports centerlines as proper SVG with stroke properties,
preserving single-line nature for pen plotters and vector editors.

Coordinate System Notes:
- Font units: Y increases upward, baseline at y=0
- SVG/Pixel: Y increases downward, origin at top-left
- Rasterizer transforms: pixel = (font - min) * scale + padding
- Inverse: font = (pixel - padding) / scale + min
"""

import re
import xml.etree.ElementTree as ET
from pathlib import Path

from fontTools.ttLib import TTFont


def transform_path_to_font_units(
    path_d: str,
    raster_scale: float,
    x_min: float,
    y_min: float,
    y_max: float,
    glyph_height: float,
    padding: float = 20.0,
    ascender: float | None = None,
    y_down: bool = False,
) -> str:
    """
    Transform SVG path data from pixel coordinates to font unit coordinates.

    The rasterizer applies: pixel = (font - min) * scale + padding
    We apply inverse: font = (pixel - padding) / scale + min

    When ascender is provided (font-level metric), uses it instead of per-glyph
    y_max for Y-axis inverse transform, ensuring consistent Y coordinates across
    all glyphs.

    Args:
        path_d: SVG path 'd' attribute string
        raster_scale: Scale factor used during rasterization
        x_min: Original glyph xMin in font units
        y_min: Original glyph yMin in font units
        y_max: Original glyph yMax in font units
        glyph_height: Original glyph height in font units
        padding: Padding added during rasterization (default 20px)
        ascender: Font ascender in font units (overrides y_max for Y transform)
        y_down: If True, output Y in SVG convention (Y increases downward).
                Used for FontForge import where SVG Y=0 is top of em square.

    Returns:
        Transformed path 'd' string in font unit coordinates
    """
    if not path_d or raster_scale <= 0:
        return path_d

    # Parse SVG path commands and coordinates
    # Regex to match path commands and their numeric arguments
    command_pattern = re.compile(r'([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)')

    tokens = command_pattern.findall(path_d)
    result = []
    current_command = None
    coords = []

    # Use font ascender for consistent Y transform, fallback to per-glyph y_max
    y_ref = ascender if ascender is not None else y_max

    def transform_point(px, py):
        """Transform pixel coords to font coords with Y-flip."""
        # Inverse of: pixel_x = (font_x - xMin) * scale + padding
        fx = (px - padding) / raster_scale + x_min
        if y_down:
            # SVG convention: Y increases downward from top of em square
            # svg_y = (py - padding) / scale
            fy = (py - padding) / raster_scale
        else:
            # Font convention: Y increases upward
            # font_y = ascender - (pixel_y - padding) / scale
            fy = y_ref - (py - padding) / raster_scale
        return fx, fy

    def flush_coords():
        nonlocal coords, current_command
        if not current_command or not coords:
            return

        cmd = current_command.upper()

        if cmd == 'M' or cmd == 'L' or cmd == 'T':
            # moveto, lineto, smooth quadratic - pairs of coords
            for i in range(0, len(coords) - 1, 2):
                fx, fy = transform_point(coords[i], coords[i + 1])
                result.append(f'{fx:.2f},{fy:.2f}')
        elif cmd == 'H':
            # Horizontal line - single x coord
            for x in coords:
                fx = (x - padding) / raster_scale + x_min
                result.append(f'{fx:.2f}')
        elif cmd == 'V':
            # Vertical line - single y coord
            for y in coords:
                if y_down:
                    fy = (y - padding) / raster_scale
                else:
                    fy = y_ref - (y - padding) / raster_scale
                result.append(f'{fy:.2f}')
        elif cmd == 'C':
            # Cubic bezier - 6 coords (3 points)
            for i in range(0, len(coords) - 5, 6):
                points = []
                for j in range(3):
                    fx, fy = transform_point(coords[i + j * 2], coords[i + j * 2 + 1])
                    points.append(f'{fx:.2f},{fy:.2f}')
                result.append(' '.join(points))
        elif cmd == 'S':
            # Smooth cubic - 4 coords (2 points)
            for i in range(0, len(coords) - 3, 4):
                points = []
                for j in range(2):
                    fx, fy = transform_point(coords[i + j * 2], coords[i + j * 2 + 1])
                    points.append(f'{fx:.2f},{fy:.2f}')
                result.append(' '.join(points))
        elif cmd == 'Q':
            # Quadratic bezier - 4 coords (2 points)
            for i in range(0, len(coords) - 3, 4):
                points = []
                for j in range(2):
                    fx, fy = transform_point(coords[i + j * 2], coords[i + j * 2 + 1])
                    points.append(f'{fx:.2f},{fy:.2f}')
                result.append(' '.join(points))
        elif cmd == 'A':
            # Arc - 7 params: rx ry x-axis-rotation large-arc sweep x y
            for i in range(0, len(coords) - 6, 7):
                rx = coords[i] / raster_scale
                ry = coords[i + 1] / raster_scale
                rotation = coords[i + 2]
                large_arc = int(coords[i + 3])
                sweep = int(coords[i + 4])
                # Flip sweep flag due to Y-axis inversion
                sweep = 1 - sweep
                fx, fy = transform_point(coords[i + 5], coords[i + 6])
                result.append(f'{rx:.2f} {ry:.2f} {rotation:.2f} {large_arc} {sweep} {fx:.2f},{fy:.2f}')
        elif cmd == 'Z':
            pass  # No coords for close path

        coords = []

    for cmd_match, num_match in tokens:
        if cmd_match:
            # Flush previous command's coordinates
            flush_coords()
            current_command = cmd_match
            result.append(cmd_match)
        elif num_match:
            coords.append(float(num_match))

    # Flush remaining coords
    flush_coords()

    return ' '.join(result)


def create_single_line_svg(
    tt_font: TTFont,
    centerlines: dict[str, dict],
    stroke_width: float = 80.0,
    stroke_cap: str = "round",
    stroke_join: str = "round",
    include_guidelines: bool = False,
) -> str:
    """
    Create an SVG document with all centerlines as stroke-based paths.

    Transforms centerline paths from pixel coordinates back to font units
    for proper metric alignment.

    Args:
        tt_font: Original font for metrics
        centerlines: Dict of glyph_name -> centerline data
        stroke_width: Stroke width in font units
        stroke_cap: Stroke linecap (butt, round, square)
        stroke_join: Stroke linejoin (miter, round, bevel)
        include_guidelines: Whether to include baseline/x-height guides

    Returns:
        SVG document as string
    """
    # Get font metrics
    head = tt_font["head"]
    units_per_em = head.unitsPerEm

    os2 = tt_font.get("OS/2")
    hhea = tt_font.get("hhea")

    if os2:
        ascender = os2.usWinAscent
        descender = -abs(os2.usWinDescent)
    elif hhea:
        ascender = hhea.ascent
        descender = hhea.descent
    else:
        ascender = int(units_per_em * 0.8)
        descender = int(-units_per_em * 0.2)

    total_height = ascender - descender

    # Calculate total width for all glyphs
    glyph_set = tt_font.getGlyphSet()
    padding = units_per_em * 0.1
    current_x = padding
    glyph_positions = []

    for glyph_name, centerline_data in centerlines.items():
        if glyph_name not in glyph_set:
            continue

        glyph = glyph_set[glyph_name]
        glyph_width = glyph.width if hasattr(glyph, 'width') else units_per_em

        glyph_positions.append({
            "name": glyph_name,
            "x": current_x,
            "width": glyph_width,
            "data": centerline_data,
        })

        current_x += glyph_width + padding

    total_width = current_x

    # Create SVG root
    svg_ns = "http://www.w3.org/2000/svg"
    ET.register_namespace('', svg_ns)

    # ViewBox in font coordinates
    # Y-axis: descender at bottom, ascender at top
    # Use transform to flip Y for proper font coordinate display
    view_box = f"0 {descender} {total_width} {total_height}"

    root = ET.Element("svg", {
        "xmlns": svg_ns,
        "viewBox": view_box,
        "width": str(int(total_width)),
        "height": str(int(total_height)),
    })

    # Add metadata
    title = ET.SubElement(root, "title")
    title.text = "Skeletype Centerlines"

    desc = ET.SubElement(root, "desc")
    desc.text = f"Single-line centerlines. Stroke: {stroke_width} units, cap: {stroke_cap}, join: {stroke_join}"

    # Add style definitions
    defs = ET.SubElement(root, "defs")
    style = ET.SubElement(defs, "style")
    style.text = f"""
        .centerline {{
            fill: none;
            stroke: #000000;
            stroke-width: {stroke_width};
            stroke-linecap: {stroke_cap};
            stroke-linejoin: {stroke_join};
        }}
        .guideline {{
            fill: none;
            stroke: #cccccc;
            stroke-width: 1;
            stroke-dasharray: 5,5;
        }}
    """

    # Add guidelines if requested
    if include_guidelines:
        guidelines = ET.SubElement(root, "g", {"id": "guidelines", "class": "guideline"})
        # Baseline (y=0)
        ET.SubElement(guidelines, "line", {
            "x1": "0", "y1": "0",
            "x2": str(total_width), "y2": "0",
        })
        # Ascender line
        ET.SubElement(guidelines, "line", {
            "x1": "0", "y1": str(ascender),
            "x2": str(total_width), "y2": str(ascender),
        })
        # Descender line
        ET.SubElement(guidelines, "line", {
            "x1": "0", "y1": str(descender),
            "x2": str(total_width), "y2": str(descender),
        })

    # Add glyphs group with Y-flip transform
    # Font coords have Y up, SVG has Y down
    # Apply flip at the top level
    glyphs_group = ET.SubElement(root, "g", {
        "id": "glyphs",
        "transform": f"translate(0, {ascender}) scale(1, -1)",
    })

    for glyph_info in glyph_positions:
        glyph_name = glyph_info["name"]
        x_offset = glyph_info["x"]
        centerline_data = glyph_info["data"]

        paths = centerline_data.get("paths", [])
        if not paths:
            continue

        # Get transform parameters from rasterization
        raster_scale = centerline_data.get("raster_scale", 1.0)
        bounds = centerline_data.get("bounds", {})

        x_min = bounds.get("xMin", 0)
        y_min = bounds.get("yMin", 0)
        y_max = bounds.get("yMax", 1000)
        glyph_height = centerline_data.get("glyph_height", y_max - y_min)
        cl_ascender = centerline_data.get("ascender")

        # Create glyph group
        glyph_group = ET.SubElement(glyphs_group, "g", {
            "id": f"glyph-{glyph_name}",
            "transform": f"translate({x_offset}, 0)",
        })

        # Transform each path from pixel coords to font coords
        for i, path_d in enumerate(paths):
            transformed_d = transform_path_to_font_units(
                path_d,
                raster_scale,
                x_min,
                y_min,
                y_max,
                glyph_height,
                padding=20.0,
                ascender=cl_ascender,
            )

            ET.SubElement(glyph_group, "path", {
                "d": transformed_d,
                "class": "centerline",
            })

    # Generate XML string with declaration
    ET.indent(root)
    xml_str = ET.tostring(root, encoding="unicode")
    return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_str}'


def create_glyph_svg(
    tt_font: TTFont,
    glyph_name: str,
    centerline_data: dict,
    stroke_width: float = 80.0,
    stroke_cap: str = "round",
    stroke_join: str = "round",
) -> str:
    """
    Create SVG for a single glyph with proper font unit coordinates.
    """
    return create_single_line_svg(
        tt_font,
        {glyph_name: centerline_data},
        stroke_width,
        stroke_cap,
        stroke_join,
    )


def export_svg_file(
    tt_font: TTFont,
    centerlines: dict[str, dict],
    output_path: Path,
    stroke_width: float = 80.0,
    stroke_cap: str = "round",
    stroke_join: str = "round",
) -> bool:
    """
    Export centerlines to SVG file.

    Returns:
        True if export succeeded
    """
    try:
        svg_content = create_single_line_svg(
            tt_font,
            centerlines,
            stroke_width,
            stroke_cap,
            stroke_join,
        )
        output_path.write_text(svg_content, encoding="utf-8")
        return True
    except Exception as e:
        print(f"SVG export failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def create_fontforge_glyph_svg(
    centerline_data: dict,
    units_per_em: int,
) -> str | None:
    """
    Create a per-glyph SVG with font-unit coordinates for FontForge importOutlines().

    Transforms centerline paths from pixel coordinates to font units with
    SVG Y-down convention. FontForge maps SVG height to em square, so:
    - SVG y=0 -> font y = ascent (top of em)
    - SVG y=em -> font y = -descent (bottom of em)

    Args:
        centerline_data: Centerline data dict from session (paths, bounds, scale, etc.)
        units_per_em: Font's units-per-em value

    Returns:
        SVG string suitable for FontForge import, or None if no paths
    """
    paths = centerline_data.get("paths", [])
    if not paths:
        return None

    raster_scale = centerline_data.get("raster_scale", 1.0)
    bounds = centerline_data.get("bounds", {})
    x_min = bounds.get("xMin", 0)
    y_min = bounds.get("yMin", 0)
    y_max = bounds.get("yMax", 1000)
    glyph_height = centerline_data.get("glyph_height", y_max - y_min)
    advance_width = centerline_data.get("advance_width", units_per_em)
    ascender = centerline_data.get("ascender")

    # FontForge SVG import uses: font_y = ascender - svg_y
    # Our y_down transform already produces svg_y=0 at the ascender,
    # so no additional offset is needed.
    #
    # SVG canvas height must equal font_height (= ascender + |descender|),
    # NOT units_per_em. For fonts like Noto Sans KR where
    # usWinAscent + usWinDescent > UPM, path y-coordinates can exceed UPM.
    # Setting height=font_height keeps all paths within the SVG canvas so
    # FontForge does not clip them.
    font_height = centerline_data.get("font_height", units_per_em)

    path_elements = []
    for path_d in paths:
        transformed = transform_path_to_font_units(
            path_d, raster_scale, x_min, y_min, y_max,
            glyph_height, padding=20.0, ascender=ascender,
            y_down=True,
        )
        path_elements.append(f'  <path d="{transformed}"/>')

    paths_str = "\n".join(path_elements)

    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg"'
        f' width="{advance_width}" height="{font_height}">\n'
        f'{paths_str}\n'
        f'</svg>'
    )
