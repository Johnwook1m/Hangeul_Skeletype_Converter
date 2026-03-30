"""Component decomposition utilities for composite glyphs.

This module provides functionality to detect and decompose composite glyphs
(glyphs that reference other glyphs as components) into pure outline paths.
This is especially important for Korean fonts where many glyphs are built
from reusable components.

Ported from the Glyphs plugin's decompose_layer_recursive() function.
"""

from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen


def has_components(tt_font: TTFont, glyph_name: str) -> bool:
    """
    Check if a glyph contains components (composite glyph).
    
    Args:
        tt_font: Parsed font object
        glyph_name: Name of the glyph to check
        
    Returns:
        True if the glyph has components, False otherwise
    """
    try:
        glyph_set = tt_font.getGlyphSet()
        if glyph_name not in glyph_set:
            return False
        
        glyph = glyph_set[glyph_name]
        
        # Check if the underlying glyph has components
        if hasattr(glyph, '_glyph'):
            # TrueType/OpenType glyph
            if hasattr(glyph._glyph, 'components'):
                return len(glyph._glyph.components) > 0
            # CFF glyph
            if hasattr(glyph._glyph, 'program'):
                # CFF glyphs store components differently
                # We'll rely on the draw method to handle this
                pass
        
        return False
        
    except Exception as e:
        print(f"Error checking components for {glyph_name}: {e}")
        return False


def get_component_info(tt_font: TTFont, glyph_name: str) -> dict:
    """
    Get detailed information about a glyph's components.
    
    Args:
        tt_font: Parsed font object
        glyph_name: Name of the glyph to analyze
        
    Returns:
        Dict with component information:
        - count: number of components
        - names: list of component glyph names
        - transforms: list of transformation matrices
    """
    try:
        glyph_set = tt_font.getGlyphSet()
        if glyph_name not in glyph_set:
            return {"count": 0, "names": [], "transforms": []}
        
        glyph = glyph_set[glyph_name]
        
        if hasattr(glyph, '_glyph') and hasattr(glyph._glyph, 'components'):
            components = glyph._glyph.components
            
            component_names = []
            transforms = []
            
            for comp in components:
                # Get component name
                if hasattr(comp, 'glyphName'):
                    component_names.append(comp.glyphName)
                
                # Get transform (xx, xy, yx, yy, dx, dy)
                if hasattr(comp, 'transform'):
                    transforms.append(comp.transform)
            
            return {
                "count": len(components),
                "names": component_names,
                "transforms": transforms,
            }
        
        return {"count": 0, "names": [], "transforms": []}
        
    except Exception as e:
        print(f"Error getting component info for {glyph_name}: {e}")
        return {"count": 0, "names": [], "transforms": []}


def decompose_glyph_recursive(
    tt_font: TTFont,
    glyph_name: str,
    visited: set = None
) -> RecordingPen | None:
    """
    Recursively decompose a glyph's components into pure outline paths.
    
    This function handles nested components (components that themselves
    contain components) by recursively decomposing them and applying
    the appropriate transformations.
    
    Args:
        tt_font: Parsed font object
        glyph_name: Name of the glyph to decompose
        visited: Set of already visited glyph names (to prevent infinite recursion)
        
    Returns:
        RecordingPen with all components decomposed, or None if failed
    """
    if visited is None:
        visited = set()
    
    # Prevent infinite recursion
    if glyph_name in visited:
        print(f"  ⚠️  Circular component reference detected: {glyph_name}")
        return None
    
    visited.add(glyph_name)
    
    try:
        glyph_set = tt_font.getGlyphSet()
        if glyph_name not in glyph_set:
            return None
        
        glyph = glyph_set[glyph_name]
        
        # Create a recording pen to capture all drawing operations
        recording_pen = RecordingPen()
        
        # Check if glyph has components
        if hasattr(glyph, '_glyph') and hasattr(glyph._glyph, 'components'):
            components = glyph._glyph.components
            
            if len(components) > 0:
                print(f"    🔧 Decomposing {len(components)} component(s) in '{glyph_name}'")
                
                # Draw each component with its transform
                for comp in components:
                    comp_name = comp.glyphName if hasattr(comp, 'glyphName') else None
                    
                    if not comp_name or comp_name not in glyph_set:
                        continue
                    
                    # Recursively decompose the component
                    comp_glyph = glyph_set[comp_name]
                    
                    # Check if component itself has components
                    if has_components(tt_font, comp_name):
                        # Recursive decomposition
                        comp_recording = decompose_glyph_recursive(tt_font, comp_name, visited.copy())
                        if comp_recording:
                            # Replay the recording with transform
                            if hasattr(comp, 'transform'):
                                transform_pen = TransformPen(recording_pen, comp.transform)
                                comp_recording.replay(transform_pen)
                            else:
                                comp_recording.replay(recording_pen)
                    else:
                        # No nested components, draw directly
                        if hasattr(comp, 'transform'):
                            transform_pen = TransformPen(recording_pen, comp.transform)
                            comp_glyph.draw(transform_pen)
                        else:
                            comp_glyph.draw(recording_pen)
                
                # Also draw any direct paths (non-component outlines)
                # by drawing the glyph without components
                # Note: fontTools' draw() already handles this correctly
                
                return recording_pen
        
        # No components, just draw the glyph normally
        glyph.draw(recording_pen)
        return recording_pen
        
    except Exception as e:
        print(f"  ❌ Error decomposing {glyph_name}: {e}")
        import traceback
        traceback.print_exc()
        return None


def verify_decomposition(tt_font: TTFont, glyph_name: str) -> dict:
    """
    Verify that a glyph can be properly decomposed.
    
    Args:
        tt_font: Parsed font object
        glyph_name: Name of the glyph to verify
        
    Returns:
        Dict with verification results:
        - success: bool
        - has_components: bool
        - component_count: int
        - decomposed_successfully: bool
        - error: str or None
    """
    result = {
        "success": False,
        "has_components": False,
        "component_count": 0,
        "decomposed_successfully": False,
        "error": None,
    }
    
    try:
        # Check for components
        has_comp = has_components(tt_font, glyph_name)
        result["has_components"] = has_comp
        
        if has_comp:
            comp_info = get_component_info(tt_font, glyph_name)
            result["component_count"] = comp_info["count"]
            
            # Try decomposition
            recording = decompose_glyph_recursive(tt_font, glyph_name)
            if recording:
                result["decomposed_successfully"] = True
                result["success"] = True
            else:
                result["error"] = "Decomposition returned None"
        else:
            # No components, nothing to decompose
            result["success"] = True
            result["decomposed_successfully"] = True
        
    except Exception as e:
        result["error"] = str(e)
    
    return result
