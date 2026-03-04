"""Font generation using FontForge CLI.

Takes expanded stroke outlines and builds a new font file.
Each SVG path segment is expanded independently to preserve the
separate-tube look seen in the web preview (hollow mode).
"""

import json
import subprocess
import tempfile
from pathlib import Path

from config import FONTFORGE_CMD


# FontForge script for font generation
_GENERATE_SCRIPT = '''
import fontforge
import json
import sys
import os
import traceback
import xml.etree.ElementTree as ET
import re as _re

args = json.loads(sys.argv[1])
original_font_path = args["original_font_path"]
expanded_dir = args["expanded_dir"]
glyph_mapping = args["glyph_mapping"]
output_path = args["output_path"]
family_suffix = args.get("family_suffix", "Skeletype")
stroke_width = args["stroke_width"]
stroke_cap = args["stroke_cap"]
stroke_join = args["stroke_join"]
hollow = args.get("hollow", True)
wall_ratio = args.get("wall_ratio", 0.15)

print(f"stroke_width={stroke_width}, cap={stroke_cap}, join={stroke_join}, hollow={hollow}, wall_ratio={wall_ratio}")
print(f"FontForge version: {fontforge.version()}")

# Open original font for metrics
original = fontforge.open(original_font_path)

# Build unicode -> glyph map (reliable for CID and all font types)
unicode_map = {}
for g in original.glyphs():
    if g.unicode >= 0:
        unicode_map[g.unicode] = g

# Create new font
new_font = fontforge.font()
base_family = original.familyname or original.fontname or "Font"
base_fontname = original.fontname or "Font"
base_fullname = original.fullname or base_family
new_font.familyname = base_family + " " + family_suffix
new_font.fontname = base_fontname + "-" + family_suffix
new_font.fullname = base_fullname + " " + family_suffix
new_font.em = original.em
new_font.ascent = original.ascent
new_font.descent = original.descent


def apply_stroke(glyph, width, cap, join):
    """Try stroke expansion with fallbacks for different FontForge versions."""
    try:
        glyph.stroke("circular", width, cap, join)
        return True
    except Exception as e1:
        print(f"  stroke(circular, w, cap, join) failed: {e1}")

    try:
        glyph.stroke("circular", width)
        return True
    except Exception as e2:
        print(f"  stroke(circular, w) failed: {e2}")

    try:
        glyph.stroke("caligraphic", width, width, 0)
        return True
    except Exception as e3:
        print(f"  stroke(caligraphic) failed: {e3}")

    return False


def fix_circular_contours(glyph):
    """Close near-circular open contours (handles ㅇ/ㅎ rings)."""
    try:
        fore = glyph.foreground
        fixed = 0
        for i, c in enumerate(fore):
            if c.closed or len(c) < 8:
                continue
            on_pts = [(p.x, p.y) for p in c if p.on_curve]
            if len(on_pts) < 4:
                continue
            xs = [p[0] for p in on_pts]
            ys = [p[1] for p in on_pts]
            w = max(xs) - min(xs)
            h = max(ys) - min(ys)
            dx = abs(on_pts[0][0] - on_pts[-1][0])
            dy = abs(on_pts[0][1] - on_pts[-1][1])
            short = min(w, h)
            long_ = max(w, h)
            if (w > 80 and h > 80
                    and (long_ / max(short, 1)) < 5.0
                    and dx <= 200 and dy <= 200):
                c.closed = True
                fore[i] = c
                fixed += 1
        if fixed:
            glyph.foreground = fore
        return fixed
    except Exception as e:
        print(f"  fix_circular error: {e}")
        return 0


def parse_svg_paths(svg_file):
    """Return list of (path_d, svg_width, svg_height) from an SVG file."""
    tree = ET.parse(svg_file)
    root = tree.getroot()
    ns_match = _re.match(r"\\{.*\\}", root.tag)
    ns = ns_match.group(0) if ns_match else ""
    paths = root.findall(f"{ns}path")
    if not paths:
        paths = root.findall(".//path")
    width = root.get("width", "1000")
    height = root.get("height", "1000")
    return [(p.get("d", ""), width, height) for p in paths if p.get("d")]


def make_single_path_svg(path_d, width, height):
    """Create a minimal SVG string containing only one path."""
    return (
        \'<?xml version="1.0" encoding="UTF-8"?>\\n\'
        f\'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">\\n\'
        f\'  <path d="{path_d}"/>\\n\'
        \'</svg>\'
    )


# Wall thickness for hollow tube effect
wall_thickness = max(5.0, stroke_width * wall_ratio) if hollow else 0.0
inner_w = stroke_width - 2.0 * wall_thickness

# Process each glyph
processed = 0
for glyph_name, glyph_info in glyph_mapping.items():
    svg_file = glyph_info["svg"]
    codepoint = glyph_info["codepoint"]
    try:
        if not os.path.exists(svg_file):
            print(f"SVG missing: {svg_file}")
            continue

        orig_glyph = unicode_map.get(codepoint)
        if orig_glyph is None:
            print(f"Skipping {glyph_name}: U+{codepoint:04X} not in original font")
            continue

        new_glyph = new_font.createChar(codepoint, orig_glyph.glyphname)
        new_glyph.width = orig_glyph.width

        # Parse SVG into individual path segments
        paths_data = parse_svg_paths(svg_file)
        if not paths_data:
            print(f"  {glyph_name}: no paths in SVG — skipping")
            processed += 1
            continue

        print(f"  {glyph_name}: {len(paths_data)} path(s), hollow={hollow}, inner_w={inner_w:.1f}")

        temp_files = []
        main_layer = new_glyph.foreground

        for idx, (path_d, svg_w, svg_h) in enumerate(paths_data):
            if not path_d:
                continue

            # Write temp single-path SVG
            tmp_path = svg_file + f".seg{idx}.svg"
            temp_files.append(tmp_path)
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(make_single_path_svg(path_d, svg_w, svg_h))

            # --- Outer expansion ---
            outer_name = f"__outer_{glyph_name}_{idx}__"
            t_outer = new_font.createChar(-1, outer_name)
            t_outer.importOutlines(tmp_path)
            fix_circular_contours(t_outer)
            ok_outer = apply_stroke(t_outer, stroke_width, stroke_cap, stroke_join)

            if not ok_outer:
                new_font.removeGlyph(outer_name)
                continue

            # --- Inner expansion (for hollow tube) ---
            if hollow and inner_w > 0:
                inner_name = f"__inner_{glyph_name}_{idx}__"
                t_inner = new_font.createChar(-1, inner_name)
                t_inner.importOutlines(tmp_path)
                fix_circular_contours(t_inner)
                ok_inner = apply_stroke(t_inner, inner_w, stroke_cap, stroke_join)

                if ok_inner:
                    # Reverse inner contour direction to create a hole
                    t_inner.reverseDirection()
                    outer_layer = t_outer.foreground
                    for c in t_inner.foreground:
                        outer_layer += c
                    t_outer.foreground = outer_layer

                new_font.removeGlyph(inner_name)

            # Sort out winding so inner contours are proper holes
            t_outer.correctDirection()

            # Accumulate into main glyph
            for c in t_outer.foreground:
                main_layer += c

            new_font.removeGlyph(outer_name)

        new_glyph.foreground = main_layer

        # Cleanup temp SVGs
        for tf in temp_files:
            try:
                os.unlink(tf)
            except OSError:
                pass

        after_count = sum(len(layer) for layer in new_glyph.layers)
        print(f"  {glyph_name}: done ({after_count} contour(s))")
        processed += 1

    except Exception as e:
        print(f"Error processing {glyph_name} (U+{codepoint:04X}): {e}")
        traceback.print_exc()
        continue

print(f"Processed {processed}/{len(glyph_mapping)} glyphs")

# Add space glyph from original font
SPACE_CP = 0x0020
space_in_mapping = any(info.get("codepoint") == SPACE_CP for info in glyph_mapping.values())
if not space_in_mapping:
    if SPACE_CP in unicode_map:
        orig_space = unicode_map[SPACE_CP]
        space_glyph = new_font.createChar(SPACE_CP, "space")
        space_glyph.width = orig_space.width
        print(f"  space: added (width={orig_space.width})")
    else:
        for g in original.glyphs():
            if g.glyphname in ("space", "uni0020") or g.unicode == SPACE_CP:
                w = g.width if g.width > 0 else int(new_font.em * 0.25)
                space_glyph = new_font.createChar(SPACE_CP, "space")
                space_glyph.width = w
                print(f"  space: added via name '{g.glyphname}' (width={w})")
                break
        else:
            default_width = int(new_font.em * 0.25)
            space_glyph = new_font.createChar(SPACE_CP, "space")
            space_glyph.width = default_width
            print(f"  space: added with default width {default_width}")

# Generate font
new_font.generate(output_path)
print(f"Font generated: {output_path}")
new_font.close()
original.close()
'''


def generate_font(
    original_font_path: Path,
    centerline_svgs: dict[str, dict],
    output_path: Path,
    stroke_width: float = 80.0,
    stroke_cap: str = "round",
    stroke_join: str = "round",
    hollow: bool = True,
    wall_ratio: float = 0.15,
) -> bool:
    """
    Generate a new font from centerline SVGs with stroke expansion.

    Each SVG path segment is processed independently. When hollow=True,
    each stroke is a ring (outer minus inner) so overlapping strokes
    remain visually separate — matching the web preview look.

    Args:
        original_font_path: Path to original font for metrics
        centerline_svgs: Dict of glyph_name -> {"svg": path_str, "codepoint": int}
        output_path: Where to save the generated font
        stroke_width: Stroke width in font units
        stroke_cap: Line cap style
        stroke_join: Line join style
        hollow: If True, each stroke tube is hollow (ring shape)
        wall_ratio: Tube wall thickness as fraction of stroke_width
    """
    if not FONTFORGE_CMD:
        print("FontForge not found")
        return False

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(_GENERATE_SCRIPT)
        script_path = f.name

    args = json.dumps({
        "original_font_path": str(original_font_path),
        "expanded_dir": str(output_path.parent),
        "glyph_mapping": centerline_svgs,
        "output_path": str(output_path),
        "stroke_width": stroke_width,
        "stroke_cap": stroke_cap,
        "stroke_join": stroke_join,
        "hollow": hollow,
        "wall_ratio": wall_ratio,
    })

    try:
        result = subprocess.run(
            [FONTFORGE_CMD, "-script", script_path, args],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.stdout:
            print(f"FontForge stdout:\n{result.stdout}")
        if result.stderr:
            print(f"FontForge stderr:\n{result.stderr}")
        if result.returncode != 0:
            print(f"Font generation failed (rc={result.returncode})")
            return False

        return output_path.exists()

    except subprocess.TimeoutExpired:
        print("Font generation timed out")
        return False
    except Exception as e:
        print(f"Font generation error: {e}")
        return False
    finally:
        Path(script_path).unlink(missing_ok=True)
