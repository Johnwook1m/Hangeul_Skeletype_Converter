# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hanguel Skeletype Converter** is a Glyphs 3 plugin that automatically extracts centerlines (skeletons) from Korean glyphs to create skeleton-type fonts.

- **Technology**: Python 3 + PyObjC for Glyphs 3 SDK integration
- **Plugin Type**: GeneralPlugin (.glyphsPlugin bundle format)
- **Purpose**: Automate Korean glyph centerline extraction for typography research
- **License**: All Rights Reserved (research project)

## Development Commands

### External Dependencies
```bash
# Required tools (macOS with Homebrew)
brew install imagemagick
brew install autotrace
```

### Plugin Installation

**Method 1: Drag-and-drop (Recommended)**
1. Drag `HanguelSkeletypeConverter.glyphsPlugin` to Glyphs 3 app icon
2. Select "Copy"
3. Restart Glyphs 3
4. Verify: Edit menu should show "Hanguel Skeletype Converter"

**Method 2: Manual**
```bash
# Copy plugin to Glyphs plugins directory
cp -r HanguelSkeletypeConverter.glyphsPlugin ~/Library/Application\ Support/Glyphs\ 3/Plugins/

# Restart Glyphs 3
```

### Testing the Plugin

1. Open Glyphs 3 with a Korean font file
2. Select glyphs to convert
3. Edit menu → "Hanguel Skeletype Converter"
4. Check Macro Panel (Window → Macro Panel) for progress logs
5. Verify "Converted Skeletype" layer appears in processed glyphs

### Debugging

**Macro Panel (Easiest)**
```
Window → Macro Panel
```
Shows real-time plugin output and errors.

**macOS Console App**
1. Spotlight → "Console"
2. Filter by "Glyphs" process
3. Search for "plugin", "Hanguel", or "error"

**Terminal Logs**
```bash
# View recent Glyphs logs
log show --predicate 'process == "Glyphs"' --last 30m | grep -i "plugin\|error\|hanguel"
```

**Verify External Tools**
```bash
# Check ImageMagick installation
which magick || which convert

# Check Autotrace installation
which autotrace
```

## Architecture

### 3-Stage Conversion Pipeline

The plugin processes glyphs through three sequential stages:

**1. PNG Export** ([src/00_Hanguel_Skeletype_Converter.py:40-180](src/00_Hanguel_Skeletype_Converter.py#L40-L180))
- Function: `saveLayerAsPNG()`
- Renders selected glyphs to PNG files
- Handles baseline adjustment for proper positioning
- **Component Decomposition**: Automatically decomposes component-based glyphs into actual paths before rendering
- Creates temporary PNG files in system temp directory

**2. SVG Conversion** ([src/00_Hanguel_Skeletype_Converter.py:243-315](src/00_Hanguel_Skeletype_Converter.py#L243-L315))
- Functions: `convert_png_to_bmp()` + `convert_bmp_to_svg()`
- Pipeline: PNG → BMP (ImageMagick) → SVG centerline (Autotrace)
- ImageMagick adds 1px white border for edge detection
- Autotrace extracts centerline with `-centerline` flag
- **CRITICAL ISSUE**: Autotrace 0.40.0 + pstoedit 4.3 version incompatibility causes empty SVG files for some glyphs

**3. SVG Import & Alignment** ([src/00_Hanguel_Skeletype_Converter.py:318-550](src/00_Hanguel_Skeletype_Converter.py#L318-L550))
- Functions: `import_svg_to_layer()` + `align_svg_to_original_layer()`
- Imports SVG to "Converted Skeletype" layer using Glyphs SDK's `GSSVGtoPath` API
- Centers SVG on original glyph using visual center calculation
- Applies 97% scaling of original glyph dimensions
- Adjusts LSB (left sidebearing) to match original metrics

### Key Components

**HanguelSkeletypeConverter Class** ([src/00_Hanguel_Skeletype_Converter.py:560-805](src/00_Hanguel_Skeletype_Converter.py#L560-L805))
- Extends `GeneralPlugin` from Glyphs SDK
- Entry point: `start()` method called when user selects Edit menu item
- Manages workflow orchestration and error handling
- **Note**: GeneralPlugin type does NOT appear in Plugin Manager - accessible only via Edit menu (this is expected behavior)

**Layer Management System**
- Auto-creates "Converted Skeletype" layer if not present
- Clears existing paths if layer already exists
- Sets layer visibility to true
- Preserves original layer metrics (width, LSB, RSB)

**Component Decomposition** ([src/00_Hanguel_Skeletype_Converter.py:56-93](src/00_Hanguel_Skeletype_Converter.py#L56-L93))
- Detects glyphs using components (composite glyphs)
- Creates temporary layer with components decomposed into actual bezier paths
- Uses `decomposeComponents()` method or manual decomposition fallback
- Critical for glyphs like "ba-ko", "kwi-ko", "go-ko" which use components

**Alignment System** ([src/00_Hanguel_Skeletype_Converter.py:410-550](src/00_Hanguel_Skeletype_Converter.py#L410-L550))
- **Visual Center Calculation**: Uses min/max bounds of nodes (not area-weighted)
- Moves SVG centerline to align with original glyph's visual center
- Applies 97% scaling factor (fixed, not dynamic)
- **Known Issue**: Fixed scaling doesn't suit all glyph shapes; visual center calculation doesn't account for stroke weight distribution

## Critical Issues

### Autotrace/pstoedit Version Incompatibility (URGENT)

**Problem:**
- Autotrace 0.40.0 requires specific pstoedit version for `-centerline` option
- Current pstoedit 4.3 causes "wrong version of pstoedit" error
- Results in empty SVG files (113 bytes) with no path data
- Affects glyphs: `ba-ko`, `kwi-ko`, `go-ko`, `pa-ko`, and others

**Symptoms:**
```
PNG: ✅ 21KB, 2 colors
BMP: ✅ 3.5MB
SVG: ❌ 113 bytes (empty)
```

**Recommended Solution** (from [TODO.md:24-30](TODO.md#L24-L30)):
Replace Autotrace with ImageMagick Skeleton morphology + Potrace:
```bash
# New pipeline approach (not yet implemented)
magick input.bmp -morphology Thinning:-1 Skeleton skeleton.bmp
potrace -s skeleton.bmp -o output.svg
```

This removes pstoedit dependency and uses more stable, actively maintained tools.

**Temporary Workaround:**
Manually decompose components in Glyphs before running plugin (reduces failure rate but doesn't solve root cause).

### Other Known Issues

1. **Fixed Scaling (97%)**: Doesn't adapt to different glyph shapes; may need dynamic calculation based on glyph metrics
2. **Alignment Accuracy**: Visual center calculation uses simple min/max bounds, doesn't account for stroke weight or area distribution
3. **Debug Mode**: Set `DEBUG_MODE = True` in plugin code to preserve temporary files for troubleshooting

## Plugin Bundle Structure

### Required Files for Distribution

```
HanguelSkeletypeConverter.glyphsPlugin/
├── Contents/
│   ├── Info.plist          # Plugin metadata (bundle ID, version, principal class)
│   ├── MacOS/
│   │   └── plugin          # Executable (can be empty file, required for bundle)
│   └── Resources/
│       └── plugin.py       # Main Python code (actual implementation)
```

### Info.plist Configuration

Key fields in [HanguelSkeletypeConverter.glyphsPlugin/Contents/Info.plist](HanguelSkeletypeConverter.glyphsPlugin/Contents/Info.plist):
- `CFBundleIdentifier`: `com.hanguel.skeletypeConverter`
- `CFBundleName`: `HanguelSkeletypeConverter`
- `CFBundleVersion`: `1.0`
- `NSPrincipalClass`: `HanguelSkeletypeConverter` (must match Python class name)
- `productPageURL`: GitHub repository for updates
- `productReleaseNotes`: Change log for Plugin Manager

### Source vs Bundle Versions

- **Source**: [src/00_Hanguel_Skeletype_Converter.py](src/00_Hanguel_Skeletype_Converter.py) (805 lines) - development version with MenuTitle directive
- **Bundle**: [HanguelSkeletypeConverter.glyphsPlugin/Contents/Resources/plugin.py](HanguelSkeletypeConverter.glyphsPlugin/Contents/Resources/plugin.py) (821 lines) - wrapped in GeneralPlugin class

When making changes, update both versions and ensure they stay synchronized.

## Development Workflow

1. Edit source file: `src/00_Hanguel_Skeletype_Converter.py`
2. Copy changes to bundle: `HanguelSkeletypeConverter.glyphsPlugin/Contents/Resources/plugin.py`
3. Update `CFBundleVersion` in `Info.plist` if needed
4. Restart Glyphs 3 to reload plugin
5. Test in Glyphs 3 with various Korean glyphs
6. Check Macro Panel for errors
7. Commit changes with descriptive message

## GitHub Distribution

For Plugin Manager to discover this plugin:
- Repository must be **Public**
- Plugin bundle must be at repository root
- `Info.plist` must have valid `productPageURL` pointing to GitHub repo
- Use semantic versioning in `CFBundleVersion` for updates

## Reference Documentation

- [Glyphs Handbook - Plugins](https://handbook.glyphsapp.com/plugins/)
- [Glyphs SDK on GitHub](https://github.com/schriftgestalt/GlyphsSDK)
- [ImageMagick Morphology - Skeleton](https://imagemagick.org/Usage/morphology/#skeleton)
- [Potrace Documentation](http://potrace.sourceforge.net/)
