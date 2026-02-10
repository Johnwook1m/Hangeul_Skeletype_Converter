import { useMemo, useState, useRef, useEffect } from 'react';
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

  // Pan state for trackpad/mouse navigation
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const sizeScaleRef = useRef(1);

  // Reset pan when preview text changes
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [previewText]);

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

  // Size scaling — pure display transform (like SkeleText's scale(sc))
  // No coordinate recalculation needed; applied as CSS transform on the SVG element
  const sizeScale = glyphSize / 100;

  // X/Y type scale — independent axis scaling for condensed/extended type
  const { scaleX = 1, scaleY = 1 } = strokeParams;

  // Display scale: maps font units to display units (base scale, without size)
  const fontToDisplay = EM_UNIT / fontHeight;

  // Keep sizeScale in ref for native event listeners
  sizeScaleRef.current = sizeScale;


  // Native mouse drag listeners (registered once, stable)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMouseDown = (e) => {
      e.preventDefault();
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseMove = (e) => {
      if (!isPanning.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setPan((p) => {
        const el2 = containerRef.current;
        if (!el2) return { x: p.x + dx, y: p.y + dy };
        const { width, height } = el2.getBoundingClientRect();
        const sc = sizeScaleRef.current;
        const maxX = width * ((sc - 1) / 2 + 0.3);
        const maxY = height * ((sc - 1) / 2 + 0.3);
        return {
          x: Math.max(-maxX, Math.min(maxX, p.x + dx)),
          y: Math.max(-maxY, Math.min(maxY, p.y + dy)),
        };
      });
    };
    const handleMouseUp = () => {
      isPanning.current = false;
    };

    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const { setGlyphSize, glyphSize: curSize } = useFontStore.getState();
        const delta = -e.deltaY * 0.5;
        setGlyphSize(Math.round(Math.max(50, Math.min(500, curSize + delta))));
      } else {
        setPan((p) => {
          const el2 = containerRef.current;
          if (!el2) return { x: p.x - e.deltaX, y: p.y - e.deltaY };
          const { width, height } = el2.getBoundingClientRect();
          const sc = sizeScaleRef.current;
          const maxX = width * ((sc - 1) / 2 + 0.3);
          const maxY = height * ((sc - 1) / 2 + 0.3);
          return {
            x: Math.max(-maxX, Math.min(maxX, p.x - e.deltaX)),
            y: Math.max(-maxY, Math.min(maxY, p.y - e.deltaY)),
          };
        });
      }
    };

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Rasterizer padding (must match backend rasterizer.py padding=20)
  const RASTER_PADDING = 20;

  // Line wrapping: width-based (handles mixed English/Korean glyph widths)
  const MAX_ROW_WIDTH = EM_UNIT * 12 * fontToDisplay * scaleX; // max row width in display units (scales with X)
  const ROW_GAP = EM_UNIT * 0; // vertical gap between rows

  // Get glyph data for each character in previewText (with width-based row wrapping)
  const glyphsToRender = useMemo(() => {
    if (!previewText) return { glyphs: [], maxRowWidth: 0, totalRows: 1 };

    const result = [];
    let xOffset = 0;
    let row = 0;
    let maxRowWidth = 0;
    const rowHeight = EM_UNIT + ROW_GAP;

    for (const char of previewText) {
      if (char === '\n') {
        maxRowWidth = Math.max(maxRowWidth, xOffset);
        row++;
        xOffset = 0;
        continue;
      }
      if (char === ' ') {
        const spaceWidth = (EM_UNIT / 2) * fontToDisplay * scaleX;
        if (xOffset + spaceWidth > MAX_ROW_WIDTH && xOffset > 0) {
          maxRowWidth = Math.max(maxRowWidth, xOffset);
          row++;
          xOffset = 0;
        }
        xOffset += spaceWidth;
        continue;
      }

      const glyphName = charToGlyph.get(char);
      if (!glyphName) continue;

      const centerline = centerlines[glyphName];
      const glyphWidth = centerline
        ? (centerline.advance_width || EM_UNIT) * fontToDisplay * scaleX
        : EM_UNIT * fontToDisplay * scaleX;

      // Wrap if adding this glyph would exceed max width
      if (xOffset + glyphWidth > MAX_ROW_WIDTH && xOffset > 0) {
        maxRowWidth = Math.max(maxRowWidth, xOffset);
        row++;
        xOffset = 0;
      }

      const yOffset = row * rowHeight;
      if (!centerline) {
        result.push({
          char,
          glyphName,
          centerline: null,
          xOffset,
          yOffset,
        });
      } else {
        const rasterScale = centerline.raster_scale || 1;
        const advanceWidth = centerline.advance_width || EM_UNIT;
        const K = fontToDisplay / rasterScale;

        result.push({
          char,
          glyphName,
          centerline,
          xOffset,
          yOffset,
          K,
          rasterScale,
          advanceWidth,
        });
      }

      xOffset += glyphWidth;
    }

    // Account for the last (possibly partial) row
    maxRowWidth = Math.max(maxRowWidth, xOffset);
    const totalRows = xOffset > 0 ? row + 1 : Math.max(row, 1);

    return { glyphs: result, maxRowWidth, totalRows };
  }, [previewText, charToGlyph, centerlines, fontToDisplay, EM_UNIT, MAX_ROW_WIDTH, ROW_GAP, scaleX]);

  const { glyphs: glyphList, maxRowWidth, totalRows } = glyphsToRender;
  const hasCenterlines = glyphList.some((g) => g.centerline);
  const showSvg = previewText && glyphList.length > 0 && hasCenterlines;

  // Calculate viewBox to fit all rows of glyphs
  const viewBoxHeight = totalRows * EM_UNIT + (totalRows - 1) * (EM_UNIT * 0.15);
  const svgPadding = 100;
  const viewBox = `${-svgPadding} ${-svgPadding} ${maxRowWidth + svgPadding * 2} ${viewBoxHeight + svgPadding * 2}`;

  // Determine placeholder content
  let placeholder = null;
  if (!previewText) {
    placeholder = glyphs.length > 0 ? (
      <p className="text-lg font-light text-gray-500">하단 메뉴에서 문구를 입력하세요</p>
    ) : null;
  } else if (glyphList.length === 0) {
    placeholder = (
      <div className="text-center text-gray-500">
        <p className="text-lg mb-2">"{previewText}"</p>
        <p className="text-sm">해당 글자의 글리프가 폰트에 없습니다.</p>
      </div>
    );
  } else if (!hasCenterlines) {
    placeholder = (
      <div className="text-center text-gray-500">
        <p className="text-xl mb-3 font-light">"{previewText}"</p>
        <p className="text-sm">중심선이 추출되지 않았습니다.</p>
        <p className="text-xs mt-1 text-gray-600">
          하단 메뉴의 "추출" 버튼을 클릭하세요.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex items-center justify-center h-full w-full relative select-none ${
        showSvg ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      style={{ background: '#1a1a1a' }}
      onWheel={undefined}
      onDoubleClick={showSvg ? () => setPan({ x: 0, y: 0 }) : undefined}
    >
      {placeholder ? (
        <div className="text-center">{placeholder}</div>
      ) : showSvg ? (
        <>
          <svg
            viewBox={viewBox}
            className="w-full h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${sizeScale})`,
              transformOrigin: 'center center',
            }}
            preserveAspectRatio="xMidYMid meet"
          >
            {glyphList.map((glyph, index) => {
              if (!glyph.centerline) {
                // Show placeholder for missing centerline
                const cellWidth = EM_UNIT * fontToDisplay;
                return (
                  <g key={index} transform={`translate(${glyph.xOffset}, ${glyph.yOffset})`}>
                    <text
                      x={cellWidth / 2}
                      y={viewBoxHeight / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#666"
                      fontSize={200}
                    >
                      {glyph.char}
                    </text>
                    <text
                      x={cellWidth / 2}
                      y={viewBoxHeight * 0.8}
                      textAnchor="middle"
                      fill="#666"
                      fontSize={60}
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

              // Baseline position in display coords: ascender * fontToDisplay
              // Y-scale anchored at baseline: translate(0, baselineY*(1-scaleY)) scale(scaleX, scaleY)
              const baselineY = glyphAscender * fontToDisplay;
              const needsScale = scaleX !== 1 || scaleY !== 1;
              const scaleTransform = needsScale
                ? `translate(0, ${baselineY * (1 - scaleY)}) scale(${scaleX}, ${scaleY})`
                : '';

              return (
                <g key={index} transform={`translate(${glyph.xOffset}, ${glyph.yOffset})`}>
                 <g transform={scaleTransform || undefined}>
                  {/* Original glyph outline (flesh) - rendered behind skeleton */}
                  {showFlesh && outline && outline.path && (
                    <g transform={outlineTransform}>
                      <path
                        d={outline.path}
                        fill="#ffffff"
                        fillOpacity={0.4}
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
                        stroke={strokeParams.strokeColor}
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
                          stroke={strokeParams.centerlineColor}
                          strokeWidth={3 / K}
                          opacity={0.9}
                        />
                      ))}
                    </g>
                  </g>
                 </g>
                </g>
              );
            })}
          </svg>

          {/* Status indicator removed */}
        </>
      ) : null}
    </div>
  );
}
