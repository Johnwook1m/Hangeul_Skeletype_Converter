"""Stroke expansion using FontForge CLI.

Since FontForge Python bindings require a specific Python version,
we use fontforge -script to call expansion from a subprocess.
"""

import json
import subprocess
import tempfile
from pathlib import Path

from config import FONTFORGE_CMD


# FontForge script template for stroke expansion
_EXPAND_SCRIPT = '''
import fontforge
import json
import sys

args = json.loads(sys.argv[1])
svg_path = args["svg_path"]
output_path = args["output_path"]
width = args["width"]
cap = args["cap"]
join = args["join"]

# Create temp font with the centerline
font = fontforge.font()
font.em = 1000

glyph = font.createChar(0x0041, "temp")
glyph.importOutlines(svg_path)

# Apply stroke expansion
# FontForge stroke types: "circular"=0, "caligraphic"=1, "convex"=2
cap_map = {"butt": "butt", "round": "round", "square": "square"}
join_map = {"miter": "miter", "round": "round", "bevel": "bevel"}

glyph.stroke("circular", width, cap_map.get(cap, "round"), join_map.get(join, "round"))
glyph.correctDirection()

# Export as SVG
glyph.export(output_path)
font.close()
'''


def expand_stroke_svg(
    svg_path: Path,
    output_path: Path,
    width: float = 80.0,
    cap: str = "round",
    join: str = "round",
) -> bool:
    """
    Expand a centerline SVG with stroke parameters using FontForge.

    Args:
        svg_path: Input SVG centerline path
        output_path: Output SVG with expanded outline
        width: Stroke width in font units
        cap: Line cap style (butt/round/square)
        join: Line join style (miter/round/bevel)

    Returns:
        True if expansion succeeded
    """
    if not FONTFORGE_CMD:
        print("FontForge not found")
        return False

    # Write the script to a temp file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(_EXPAND_SCRIPT)
        script_path = f.name

    args = json.dumps({
        "svg_path": str(svg_path),
        "output_path": str(output_path),
        "width": width,
        "cap": cap,
        "join": join,
    })

    try:
        result = subprocess.run(
            [FONTFORGE_CMD, "-script", script_path, args],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            print(f"FontForge stroke expansion failed: {result.stderr}")
            return False

        return output_path.exists()

    except subprocess.TimeoutExpired:
        print("FontForge stroke expansion timed out")
        return False
    except Exception as e:
        print(f"Stroke expansion error: {e}")
        return False
    finally:
        Path(script_path).unlink(missing_ok=True)
