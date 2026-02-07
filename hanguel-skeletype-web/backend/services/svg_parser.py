"""Parse SVG output from Autotrace into path data for the frontend."""

import xml.etree.ElementTree as ET
from pathlib import Path


def parse_svg(svg_path: Path) -> dict | None:
    """
    Parse an Autotrace SVG file and extract path data.

    Returns:
        Dict with viewBox, width, height, and list of path 'd' attributes.
        None if parsing fails.
    """
    try:
        tree = ET.parse(str(svg_path))
        root = tree.getroot()

        # Handle SVG namespace
        ns = ""
        if root.tag.startswith("{"):
            ns_end = root.tag.index("}")
            ns = root.tag[:ns_end + 1]

        view_box = root.get("viewBox", "")
        width = root.get("width", "0")
        height = root.get("height", "0")

        # If no viewBox, construct from width/height
        if not view_box and width != "0" and height != "0":
            w = width.replace("pt", "").replace("px", "").strip()
            h = height.replace("pt", "").replace("px", "").strip()
            view_box = f"0 0 {w} {h}"

        paths = []

        # Extract <path> elements
        for elem in root.iter(f"{ns}path"):
            d = elem.get("d", "")
            if d.strip():
                paths.append(d)

        # Extract <polyline> elements
        for elem in root.iter(f"{ns}polyline"):
            points = elem.get("points", "")
            if points.strip():
                # Convert polyline points to path d attribute
                d = _polyline_to_path(points)
                if d:
                    paths.append(d)

        # Extract <polygon> elements
        for elem in root.iter(f"{ns}polygon"):
            points = elem.get("points", "")
            if points.strip():
                d = _polygon_to_path(points)
                if d:
                    paths.append(d)

        if not paths:
            return None

        # Clean width/height (remove units)
        width = width.replace("pt", "").replace("px", "").strip()
        height = height.replace("pt", "").replace("px", "").strip()

        return {
            "paths": paths,
            "view_box": view_box,
            "width": width,
            "height": height,
        }

    except Exception as e:
        print(f"SVG parsing failed for {svg_path}: {e}")
        return None


def _polyline_to_path(points: str) -> str:
    """Convert SVG polyline points to path d attribute."""
    coords = points.strip().split()
    if len(coords) < 2:
        return ""

    parts = [f"M {coords[0]}"]
    for coord in coords[1:]:
        parts.append(f"L {coord}")
    return " ".join(parts)


def _polygon_to_path(points: str) -> str:
    """Convert SVG polygon points to path d attribute (closed)."""
    d = _polyline_to_path(points)
    if d:
        d += " Z"
    return d
