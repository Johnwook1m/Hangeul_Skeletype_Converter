"""
Pre-compute centerlines for demo font glyphs and save as static JSON.

Run from the project root:
    python scripts/generate_demo_centerlines.py

Output: frontend/public/demo-centerlines.json

Requirements: imagemagick + autotrace must be installed.
  macOS:  brew install imagemagick autotrace
  Linux:  apt install imagemagick autotrace (or build from source)
"""

import json
import sys
import tempfile
from pathlib import Path

# Add backend to path so we can import services
REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from fontTools.ttLib import TTFont
from services.rasterizer import rasterize_glyph
from services.centerline_extractor import extract_centerline
from services.svg_parser import parse_svg
from services.font_parser import get_glyph_outline_svg

FONT_PATH = REPO_ROOT / "frontend" / "public" / "NotoSansKR-Regular.otf"
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "demo-centerlines.json"

DEMO_TEXT = "Upload a font first\n폰트를 먼저 업로드하세요\n@skele.type"


def get_unique_chars(text: str) -> list[str]:
    seen = set()
    result = []
    for ch in text:
        if ch not in seen and ch not in (" ", "\n", "\r"):
            seen.add(ch)
            result.append(ch)
    return result


def main():
    print(f"Font: {FONT_PATH}")
    print(f"Output: {OUTPUT_PATH}")

    if not FONT_PATH.exists():
        print(f"ERROR: Font file not found: {FONT_PATH}")
        sys.exit(1)

    # Load font
    print("\nLoading font...")
    tt_font = TTFont(str(FONT_PATH))

    # Font metrics
    os2 = tt_font.get("OS/2")
    hhea = tt_font.get("hhea")
    head = tt_font["head"]
    units_per_em = head.unitsPerEm
    ascender = os2.sTypoAscender if os2 else (hhea.ascent if hhea else int(units_per_em * 0.8))
    descender = os2.sTypoDescender if os2 else (hhea.descent if hhea else -int(units_per_em * 0.2))

    print(f"  unitsPerEm={units_per_em}, ascender={ascender}, descender={descender}")

    # Build char → glyph name map
    cmap = tt_font.getBestCmap() or {}
    glyph_set = tt_font.getGlyphSet()

    chars = get_unique_chars(DEMO_TEXT)
    print(f"\nUnique characters: {chars}")

    # Resolve to glyph names
    glyphs_to_extract = []
    for ch in chars:
        cp = ord(ch)
        glyph_name = cmap.get(cp)
        if glyph_name and glyph_name in glyph_set:
            glyphs_to_extract.append((ch, glyph_name))
        else:
            print(f"  SKIP '{ch}' (U+{cp:04X}): no glyph found")

    print(f"\nGlyphs to extract: {len(glyphs_to_extract)}")

    results = {}
    with tempfile.TemporaryDirectory(prefix="demo-cl-") as tmp_dir:
        work_dir = Path(tmp_dir)

        for i, (ch, glyph_name) in enumerate(glyphs_to_extract):
            print(f"  [{i+1}/{len(glyphs_to_extract)}] '{ch}' ({glyph_name})", end=" ... ", flush=True)

            png_path = work_dir / f"{glyph_name}.png"
            svg_path = work_dir / f"{glyph_name}.svg"

            # Stage 1: Rasterize
            raster_result = rasterize_glyph(
                tt_font, glyph_name, png_path,
                ascender=ascender, descender=descender,
            )
            if raster_result is None:
                print("FAILED (rasterize)")
                continue

            # Stage 2: Extract centerline
            ok = extract_centerline(raster_result["path"], svg_path)
            if not ok:
                print("FAILED (autotrace)")
                continue

            # Stage 3: Parse SVG
            svg_data = parse_svg(svg_path)
            if svg_data is None:
                print("FAILED (svg parse)")
                continue

            # Outline for "show flesh" feature
            outline_data = get_glyph_outline_svg(tt_font, glyph_name)

            results[glyph_name] = {
                **svg_data,
                "glyph_height": raster_result["glyph_height"],
                "glyph_width": raster_result["glyph_width"],
                "advance_width": raster_result["advance_width"],
                "raster_scale": raster_result["scale"],
                "bounds": raster_result["bounds"],
                "outline": outline_data,
                "ascender": ascender,
                "descender": descender,
                "font_height": raster_result["font_height"],
            }
            print("OK")

    print(f"\nExtracted: {len(results)}/{len(glyphs_to_extract)} glyphs")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(f"Saved: {OUTPUT_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
