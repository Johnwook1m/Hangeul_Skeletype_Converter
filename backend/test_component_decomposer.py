#!/usr/bin/env python3
"""
Test script for component decomposition functionality.

This script tests the component decomposer on a real font file
to verify that composite glyphs are properly detected and decomposed.

Usage:
    python test_component_decomposer.py <font_file_path>
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from services.font_parser import parse_font, get_glyph_info
from services.component_decomposer import (
    has_components,
    get_component_info,
    decompose_glyph_recursive,
    verify_decomposition,
)


def test_font_components(font_path: str):
    """Test component detection and decomposition on a font file."""
    print("=" * 70)
    print(f"Testing Component Decomposition")
    print("=" * 70)
    print(f"Font: {font_path}\n")
    
    # Parse font
    try:
        tt_font = parse_font(Path(font_path))
        print(f"✅ Font loaded successfully\n")
    except Exception as e:
        print(f"❌ Failed to load font: {e}")
        return
    
    # Get glyph info
    glyphs = get_glyph_info(tt_font)
    print(f"📊 Total glyphs: {len(glyphs)}\n")
    
    # Find glyphs with components
    composite_glyphs = [g for g in glyphs if g.get("has_components", False)]
    print(f"🔧 Composite glyphs: {len(composite_glyphs)}\n")
    
    if len(composite_glyphs) == 0:
        print("⚠️  No composite glyphs found in this font.")
        print("   Try a Korean font (e.g., Noto Sans KR, Nanum Gothic)")
        return
    
    # Test first 10 composite glyphs
    print("=" * 70)
    print("Testing Component Decomposition (first 10 composite glyphs)")
    print("=" * 70)
    
    test_glyphs = composite_glyphs[:10]
    
    for i, glyph in enumerate(test_glyphs, 1):
        name = glyph["name"]
        char = glyph.get("character", "")
        
        print(f"\n[{i}/{len(test_glyphs)}] Glyph: {name}", end="")
        if char:
            print(f" ('{char}')")
        else:
            print()
        
        # Get component info
        comp_info = get_component_info(tt_font, name)
        print(f"  📦 Components: {comp_info['count']}")
        print(f"  📝 Names: {', '.join(comp_info['names'])}")
        
        # Verify decomposition
        result = verify_decomposition(tt_font, name)
        
        if result["success"]:
            print(f"  ✅ Decomposition: SUCCESS")
        else:
            print(f"  ❌ Decomposition: FAILED")
            if result["error"]:
                print(f"     Error: {result['error']}")
    
    print("\n" + "=" * 70)
    print("Summary")
    print("=" * 70)
    print(f"Total glyphs tested: {len(test_glyphs)}")
    print(f"Composite glyphs in font: {len(composite_glyphs)}")
    print(f"Total glyphs in font: {len(glyphs)}")
    print("=" * 70)


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_component_decomposer.py <font_file_path>")
        print("\nExample:")
        print("  python test_component_decomposer.py /path/to/NotoSansKR-Regular.ttf")
        sys.exit(1)
    
    font_path = sys.argv[1]
    
    if not Path(font_path).exists():
        print(f"❌ Font file not found: {font_path}")
        sys.exit(1)
    
    test_font_components(font_path)


if __name__ == "__main__":
    main()
