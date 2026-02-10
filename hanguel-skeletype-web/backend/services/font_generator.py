"""Font generation using FontForge CLI.

Takes expanded stroke outlines and builds a new font file.
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

args = json.loads(sys.argv[1])
original_font_path = args["original_font_path"]
expanded_dir = args["expanded_dir"]
glyph_mapping = args["glyph_mapping"]
output_path = args["output_path"]
family_suffix = args.get("family_suffix", "Skeletype")
stroke_width = args["stroke_width"]
stroke_cap = args["stroke_cap"]
stroke_join = args["stroke_join"]

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

# Process each glyph
processed = 0
for glyph_name, glyph_info in glyph_mapping.items():
    svg_file = glyph_info["svg"]
    codepoint = glyph_info["codepoint"]
    try:
        # Look up original glyph by unicode codepoint
        orig_glyph = unicode_map.get(codepoint)
        if orig_glyph is None:
            print(f"Skipping {glyph_name}: U+{codepoint:04X} not in original font")
            continue

        new_glyph = new_font.createChar(codepoint, orig_glyph.glyphname)

        # Import centerline SVG
        new_glyph.importOutlines(svg_file)

        # Apply stroke expansion (single-line -> filled outline)
        new_glyph.stroke("circular", stroke_width, stroke_cap, stroke_join)
        new_glyph.removeOverlap()
        new_glyph.correctDirection()

        # Copy width from original
        new_glyph.width = orig_glyph.width
        processed += 1

    except Exception as e:
        print(f"Error processing {glyph_name} (U+{codepoint:04X}): {e}")
        continue

print(f"Processed {processed}/{len(glyph_mapping)} glyphs")

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
) -> bool:
    """
    Generate a new font from centerline SVGs with stroke expansion.

    Args:
        original_font_path: Path to original font for metrics
        centerline_svgs: Dict of glyph_name -> {"svg": path_str, "codepoint": int}
        output_path: Where to save the generated font
        stroke_width: Stroke width in font units
        stroke_cap: Line cap style
        stroke_join: Line join style

    Returns:
        True if font generation succeeded
    """
    if not FONTFORGE_CMD:
        print("FontForge not found")
        return False

    # Write the script
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(_GENERATE_SCRIPT)
        script_path = f.name

    # Glyph mapping already has {name: {svg, codepoint}} from caller
    glyph_mapping = centerline_svgs

    args = json.dumps({
        "original_font_path": str(original_font_path),
        "expanded_dir": str(output_path.parent),
        "glyph_mapping": glyph_mapping,
        "output_path": str(output_path),
        "stroke_width": stroke_width,
        "stroke_cap": stroke_cap,
        "stroke_join": stroke_join,
    })

    try:
        result = subprocess.run(
            [FONTFORGE_CMD, "-script", script_path, args],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.stdout:
            print(f"FontForge stdout: {result.stdout}")
        if result.returncode != 0:
            print(f"Font generation failed (rc={result.returncode}): {result.stderr}")
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
