import { useMemo } from 'react';
import useFontStore from '../stores/fontStore';

export default function GlyphPreview({ large = false }) {
  const {
    glyphs,
    previewText,
    centerlines,
    strokeParams,
    unitsPerEm,
    ascender,
    descender,
    showFlesh,
    glyphSize,
  } = useFontStore();

  // Standard em unit for font metrics (use font's unitsPerEm or default 1000)
  const EM_UNIT = unitsPerEm || 1000;

  // Font vertical metrics (from OS/2 or hhea table)
  const fontAscender = ascender ?? EM_UNIT * 0.8;
  const fontDescender = descender ?? -(EM_UNIT * 0.2);
  const fontHeight = fontAscender - fontDescender;

  // Build character -> glyph info map
  const charToGlyph = useMemo(() => {
    const map = new Map();
    for (const g of glyphs) {
      if (g.character) {
        map.set(g.character, g.name);
      }
    }
    return map;
  }, [glyphs]);

  // Apply size scaling
  const sizeScale = glyphSize / 100;

  // Display scale: maps font units to display units
  // fontHeight font units → EM_UNIT * sizeScale display units
  const fontToDisplay = (EM_UNIT / fontHeight) * sizeScale;

  // Rasterizer padding (must match backend rasterizer.py padding=20)
  const RASTER_PADDING = 20;

  // Get glyph data for each character in previewText
  const glyphsToRender = useMemo(() => {
    if (!previewText) return [];

    const result = [];
    let xOffset = 0;

    for (const char of previewText) {
      if (char === ' ') {
        // Space: use half-em width (matches typical space glyph)
        xOffset += (EM_UNIT / 2) * fontToDisplay;
        continue;
      }

      const glyphName = charToGlyph.get(char);
      if (!glyphName) continue;

      const centerline = centerlines[glyphName];
      if (!centerline) {
        // Glyph exists but centerline not extracted yet - show placeholder
        result.push({
          char,
          glyphName,
          centerline: null,
          xOffset,
        });
        xOffset += EM_UNIT * fontToDisplay;
        continue;
      }

      const rasterScale = centerline.raster_scale || 1;
      const advanceWidth = centerline.advance_width || EM_UNIT;

      // Pixel-to-display scale factor
      // Maps Autotrace SVG pixel coordinates to display coordinates
      const K = fontToDisplay / rasterScale;

      result.push({
        char,
        glyphName,
        centerline,
        xOffset,
        K,
        rasterScale,
        advanceWidth,
      });

      // Use actual advance width for spacing (matches original font metrics)
      xOffset += advanceWidth * fontToDisplay;
    }

    return { glyphs: result, totalWidth: xOffset };
  }, [previewText, charToGlyph, centerlines, fontToDisplay, EM_UNIT]);

  if (!previewText) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className={large ? 'text-xl mb-2' : 'text-lg mb-2'}>
            문구를 입력하세요
          </p>
          <p className="text-sm">
            위 입력창에 문구를 입력하고
            <br />
            "선택" 버튼을 클릭하세요
          </p>
        </div>
      </div>
    );
  }

  const { glyphs: glyphList, totalWidth } = glyphsToRender;

  if (glyphList.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">"{previewText}"</p>
          <p>해당 글자의 글리프가 폰트에 없습니다.</p>
        </div>
      </div>
    );
  }

  // Check if any centerlines are missing
  const missingCenterlines = glyphList.filter((g) => !g.centerline);
  const hasCenterlines = glyphList.some((g) => g.centerline);

  if (!hasCenterlines) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-xl mb-3">"{previewText}"</p>
          <p>중심선이 추출되지 않았습니다.</p>
          <p className="text-sm mt-1">
            오른쪽 "선택한 글리프 추출" 버튼을 클릭하세요.
          </p>
        </div>
      </div>
    );
  }

  // Calculate viewBox to fit all glyphs
  // Display height = fontHeight * fontToDisplay = EM_UNIT * sizeScale
  const viewBoxHeight = EM_UNIT * sizeScale;
  const svgPadding = 100;
  const viewBox = `${-svgPadding} ${-svgPadding} ${totalWidth + svgPadding * 2} ${viewBoxHeight + svgPadding * 2}`;

  return (
    <div className="flex items-center justify-center h-full w-full relative">
      <svg
        viewBox={viewBox}
        className="w-full h-full"
        style={{ background: '#1a1a1a' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {glyphList.map((glyph, index) => {
          if (!glyph.centerline) {
            // Show placeholder for missing centerline
            const cellWidth = EM_UNIT * fontToDisplay;
            return (
              <g key={index} transform={`translate(${glyph.xOffset}, 0)`}>
                <text
                  x={cellWidth / 2}
                  y={viewBoxHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#666"
                  fontSize={200 * sizeScale}
                >
                  {glyph.char}
                </text>
                <text
                  x={cellWidth / 2}
                  y={viewBoxHeight * 0.8}
                  textAnchor="middle"
                  fill="#666"
                  fontSize={60 * sizeScale}
                >
                  (추출 필요)
                </text>
              </g>
            );
          }

          const { K, rasterScale } = glyph;
          const outline = glyph.centerline.outline;
          const bounds = glyph.centerline.bounds || {};
          const xMin = bounds.xMin || 0;
          const glyphAscender = glyph.centerline.ascender ?? fontAscender;

          // Centerline transform: pixel/SVG coords → display coords
          //
          // Rasterizer mapping (font → pixel):
          //   px = (fx - xMin) * rasterScale + padding
          //   py = (ascender - fy) * rasterScale + padding
          //
          // Inverse (pixel → font → display):
          //   display_x = ((px - padding) / rasterScale + xMin) * fontToDisplay
          //   display_y = ((py - padding) / rasterScale) * fontToDisplay
          //
          // As SVG transform (applied right-to-left):
          //   translate(xMin * fontToDisplay - padding * K, -padding * K) scale(K, K)
          const clTranslateX = xMin * fontToDisplay - RASTER_PADDING * K;
          const clTranslateY = -RASTER_PADDING * K;

          // Outline transform: font coords → display coords
          //   display_x = fx * fontToDisplay
          //   display_y = (ascender - fy) * fontToDisplay
          //
          // As SVG transform: scale(ftd, -ftd) translate(0, -ascender)
          const outlineTransform = outline
            ? `scale(${fontToDisplay}, ${-fontToDisplay}) translate(0, ${-glyphAscender})`
            : '';

          // Stroke width in pixel space (inside scale(K) transform)
          // strokeParams.width is in font units → display = width * fontToDisplay
          // Inside scale(K): strokeWidth * K = width * fontToDisplay
          // → strokeWidth = width * fontToDisplay / K = width * rasterScale
          const strokeWidthInPixelSpace = strokeParams.width * rasterScale;

          return (
            <g key={index} transform={`translate(${glyph.xOffset}, 0)`}>
              {/* Original glyph outline (flesh) - rendered behind skeleton */}
              {showFlesh && outline && outline.path && (
                <g transform={outlineTransform}>
                  <path
                    d={outline.path}
                    fill="#ffffff"
                    fillOpacity={0.3}
                    stroke="none"
                  />
                </g>
              )}

              {/* Centerline paths (in Autotrace pixel coordinates) */}
              <g transform={`translate(${clTranslateX}, ${clTranslateY}) scale(${K})`}>
                {/* Centerline with stroke applied */}
                {glyph.centerline.paths.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={showFlesh ? 'rgba(255,255,255,0.9)' : '#fff'}
                    strokeWidth={strokeWidthInPixelSpace}
                    strokeLinecap={strokeParams.cap}
                    strokeLinejoin={strokeParams.join}
                  />
                ))}
                {/* Thin centerline reference (colored) */}
                <g>
                  {glyph.centerline.paths.map((d, i) => (
                    <path
                      key={`ref-${i}`}
                      d={d}
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth={3 / K}
                      opacity={0.9}
                    />
                  ))}
                </g>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Status indicator */}
      {missingCenterlines.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg text-sm">
          {missingCenterlines.length}개 글자 추출 필요
        </div>
      )}
    </div>
  );
}
