import { useMemo } from 'react';
import useFontStore from '../stores/fontStore';

// Parse SVG view_box string (e.g., "0 0 800 1040") to get dimensions
function parseViewBox(viewBox) {
  if (!viewBox) return { minX: 0, minY: 0, width: 1000, height: 1000 };
  const parts = viewBox.split(/\s+/).map(Number);
  if (parts.length !== 4) return { minX: 0, minY: 0, width: 1000, height: 1000 };
  return {
    minX: parts[0],
    minY: parts[1],
    width: parts[2],
    height: parts[3],
  };
}

export default function GlyphPreview({ large = false }) {
  const {
    glyphs,
    previewText,
    centerlines,
    strokeParams,
    unitsPerEm,
    showFlesh,
    glyphSize,
  } = useFontStore();

  // Standard em unit for font metrics (use font's unitsPerEm or default 1000)
  const EM_UNIT = unitsPerEm || 1000;

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

  // Get glyph data for each character in previewText
  const glyphsToRender = useMemo(() => {
    if (!previewText) return [];

    const result = [];
    let xOffset = 0;
    const spacing = 50 * sizeScale; // Space between glyphs

    for (const char of previewText) {
      if (char === ' ') {
        // Add space (half em width)
        xOffset += EM_UNIT * 0.5 * sizeScale;
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
          scale: sizeScale,
          translateX: 0,
          translateY: 0,
        });
        xOffset += EM_UNIT * sizeScale + spacing;
        continue;
      }

      // Parse view_box to calculate proper scaling
      const vb = parseViewBox(centerline.view_box);

      // Get original glyph height from rasterization info
      const originalGlyphHeight = centerline.glyph_height || EM_UNIT;

      // Calculate normalized scale:
      // 1. First, scale SVG to EM_UNIT based on view_box height
      // 2. Then, apply correction factor based on original glyph height
      // 3. Apply user size scaling
      const svgToEmScale = EM_UNIT / vb.height;
      const heightCorrection = originalGlyphHeight / EM_UNIT;
      const scale = svgToEmScale * heightCorrection * sizeScale;

      // Calculate scaled dimensions for this glyph
      const scaledWidth = vb.width * scale;
      const scaledHeight = vb.height * scale;

      // Center the glyph horizontally within EM_UNIT
      const horizontalOffset = (EM_UNIT * sizeScale - scaledWidth) / 2;
      // Vertically center based on height difference
      const verticalOffset = (EM_UNIT * sizeScale - scaledHeight) / 2;

      result.push({
        char,
        glyphName,
        centerline,
        xOffset: xOffset + Math.max(0, horizontalOffset),
        yOffset: Math.max(0, verticalOffset),
        scale,
        translateX: -vb.minX,
        translateY: -vb.minY,
        viewBox: vb,
        scaledWidth,
        scaledHeight,
        originalGlyphHeight,
      });

      // Use EM_UNIT for consistent spacing
      xOffset += EM_UNIT * sizeScale + spacing;
    }

    return { glyphs: result, totalWidth: xOffset };
  }, [previewText, charToGlyph, centerlines, sizeScale, EM_UNIT]);

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
  const viewBoxHeight = EM_UNIT * sizeScale + 200;
  const padding = 100;
  const viewBox = `${-padding} ${-padding} ${totalWidth + padding * 2} ${viewBoxHeight + padding * 2}`;

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
            return (
              <g key={index} transform={`translate(${glyph.xOffset}, 0)`}>
                <text
                  x={EM_UNIT * sizeScale / 2}
                  y={EM_UNIT * sizeScale / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#666"
                  fontSize={200 * sizeScale}
                >
                  {glyph.char}
                </text>
                <text
                  x={EM_UNIT * sizeScale / 2}
                  y={EM_UNIT * sizeScale * 0.8}
                  textAnchor="middle"
                  fill="#666"
                  fontSize={60 * sizeScale}
                >
                  (추출 필요)
                </text>
              </g>
            );
          }

          // Calculate adjusted stroke width (scale inversely with glyph scale)
          const adjustedStrokeWidth = strokeParams.width / glyph.scale * sizeScale;

          // Get outline data for "show flesh" feature
          const outline = glyph.centerline.outline;
          const rasterScale = glyph.centerline.raster_scale || 1;

          // Calculate transform for the original glyph outline
          // Maps font coordinates to match the centerline's coordinate space
          // The rasterizer used: offset = 20px padding on each side
          const outlineTransform = outline ? (() => {
            const { xMin, yMax } = outline.bounds;
            const combinedScale = rasterScale * glyph.scale;
            const paddingOffset = 20 * glyph.scale;
            return `translate(${paddingOffset}, ${paddingOffset}) scale(${combinedScale}, ${-combinedScale}) translate(${-xMin}, ${-yMax})`;
          })() : '';

          return (
            <g key={index} transform={`translate(${glyph.xOffset}, ${glyph.yOffset || 0})`}>
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

              {/* Apply scaling and translation to normalize glyph */}
              <g transform={`scale(${glyph.scale}) translate(${glyph.translateX}, ${glyph.translateY})`}>
                {/* Centerline with stroke applied */}
                {glyph.centerline.paths.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={showFlesh ? 'rgba(255,255,255,0.9)' : '#fff'}
                    strokeWidth={adjustedStrokeWidth / sizeScale}
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
                      strokeWidth={3 / glyph.scale}
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
