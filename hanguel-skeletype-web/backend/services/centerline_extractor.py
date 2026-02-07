"""Centerline extraction pipeline.

Ported from the Glyphs plugin's convert_png_to_svg() function.
Uses ImageMagick for preprocessing and Autotrace for centerline extraction.
"""

import subprocess
from pathlib import Path

from config import IMAGEMAGICK_CMD, AUTOTRACE_CMD


def apply_antialiasing_blur(png_path: Path) -> bool:
    """
    Check if PNG is a binary (2-color) image and apply blur if needed.

    Ported from plugin lines 271-291:
    Binary images cause Autotrace centerline extraction to fail.
    Adding a slight blur introduces grayscale antialiasing.
    """
    if not IMAGEMAGICK_CMD:
        return True

    try:
        result = subprocess.run(
            [IMAGEMAGICK_CMD, str(png_path), "-format", "%[colors]", "info:"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode != 0:
            return True  # Skip blur if we can't check

        color_count = int(result.stdout.strip())
        if color_count <= 2:
            subprocess.run(
                [IMAGEMAGICK_CMD, str(png_path), "-blur", "0x0.3", str(png_path)],
                capture_output=True,
                timeout=10,
            )
        return True
    except Exception as e:
        print(f"Antialiasing blur failed: {e}")
        return True


def extract_centerline(png_path: Path, svg_path: Path) -> bool:
    """
    Extract centerline from a PNG image using Autotrace.

    Ported from plugin lines 383-420.
    Pipeline: PNG -> (optional blur) -> Autotrace -centerline -> SVG

    Args:
        png_path: Input PNG file path
        svg_path: Output SVG file path

    Returns:
        True if centerline extraction succeeded
    """
    if not AUTOTRACE_CMD:
        print("Autotrace not found")
        return False

    # Step 1: Apply antialiasing blur for binary images
    apply_antialiasing_blur(png_path)

    # Step 2: Run Autotrace with centerline extraction
    command = [
        AUTOTRACE_CMD,
        "-centerline",
        "-output-file", str(svg_path),
        "-background-color=FFFFFF",
        "-color-count", "2",
        str(png_path),
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            print(f"Autotrace failed for {png_path.name}: {result.stderr.strip()}")
            return False

        # Step 3: Validate SVG has actual path data
        if not svg_path.exists():
            print(f"SVG not created for {png_path.name}")
            return False

        svg_content = svg_path.read_text(encoding="utf-8")
        has_paths = any(
            tag in svg_content
            for tag in ["<path", "<polygon", "<polyline"]
        )

        if not has_paths:
            print(f"Empty SVG (no path data) for {png_path.name}")
            return False

        return True

    except subprocess.TimeoutExpired:
        print(f"Autotrace timed out for {png_path}")
        return False
    except Exception as e:
        print(f"Centerline extraction failed for {png_path.name}: {e}")
        return False
