import { useMemo, useState, useRef, useEffect } from 'react';
import useFontStore from '../stores/fontStore';
import { computeConnections } from '../utils/glyphConnections';
import { computeBranches } from '../utils/glyphBranches';
import { computeDecorators } from '../utils/glyphDecorators';
import { computeOffsetPaths } from '../utils/glyphOffsetPath';

export default function GlyphPreview({ large = false }) {
  const {
    glyphs,
    previewText,
    centerlines,
    strokeParams,
    connectionParams,
    branchParams,
    decoratorParams,
    offsetPathParams,
    slantParams,
    backgroundImageParams,
    unitsPerEm,
    ascender,
    descender,
    showFlesh,
    glyphSize,
    previewFontSize,
    spaceAdvanceWidth,
    textAlign,
    theme,
    bgColor,
    fontLoading,
  } = useFontStore();

  // Pan state for trackpad/mouse navigation
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const sizeScaleRef = useRef(1);
  const gestureStartSizeRef = useRef(100); // For Safari GestureEvent
  const isGesturing = useRef(false); // Prevent wheel+ctrlKey double-zoom in Safari

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
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    };
    const handleMouseUp = () => {
      isPanning.current = false;
    };

    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        // Skip if Safari is already handling via gesturechange (avoids double-zoom)
        if (isGesturing.current) return;
        const { setGlyphSize, glyphSize: curSize } = useFontStore.getState();
        // Normalize deltaY by deltaMode (0=pixel, 1=line, 2=page)
        const normalizedDelta = e.deltaMode === 0 ? e.deltaY : e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY * 300;
        // Multiplicative zoom for natural feel (~1% per pixel delta)
        const zoomFactor = 1 - normalizedDelta * 0.008;
        setGlyphSize(Math.max(10, Math.min(500, curSize * zoomFactor)));
      } else {
        e.preventDefault();
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };

    // Safari GestureEvent handlers — registered on document so preventDefault fires
    // before Safari's own page-zoom handler claims the gesture.
    const handleGestureStart = (e) => {
      e.preventDefault();
      if (!el.contains(e.target) && e.target !== el) return;
      isGesturing.current = true;
      gestureStartSizeRef.current = useFontStore.getState().glyphSize;
    };
    const handleGestureChange = (e) => {
      e.preventDefault();
      if (!el.contains(e.target) && e.target !== el) return;
      const { setGlyphSize } = useFontStore.getState();
      setGlyphSize(Math.max(10, Math.min(500, gestureStartSizeRef.current * e.scale)));
    };
    const handleGestureEnd = () => {
      isGesturing.current = false;
    };

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('wheel', handleWheel, { passive: false });
    // Gesture listeners on document — prevents Safari from intercepting first
    document.addEventListener('gesturestart', handleGestureStart, { passive: false });
    document.addEventListener('gesturechange', handleGestureChange, { passive: false });
    document.addEventListener('gestureend', handleGestureEnd);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('wheel', handleWheel);
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('gesturechange', handleGestureChange);
      document.removeEventListener('gestureend', handleGestureEnd);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Rasterizer padding (must match backend rasterizer.py padding=20)
  const RASTER_PADDING = 20;

  // Line wrapping: width-based (handles mixed English/Korean glyph widths)
  // previewFontSize scales apparent glyph size by reducing chars per row
  const MAX_ROW_WIDTH = EM_UNIT * 12 / previewFontSize * fontToDisplay * scaleX; // max row width in display units (scales with X)
  const ROW_GAP = EM_UNIT * 0; // vertical gap between rows

  // Get glyph data for each character in previewText (with width-based row wrapping)
  const glyphsToRender = useMemo(() => {
    if (!previewText) return { glyphs: [], maxRowWidth: 0, totalRows: 1 };

    const rowHeight = EM_UNIT + ROW_GAP;

    // Pass 1: collect rows
    const rows = [[]];
    const rowWidths = [0];
    let rowIdx = 0;

    for (const char of previewText) {
      if (char === '\n') {
        rowIdx++;
        rows.push([]);
        rowWidths.push(0);
        continue;
      }
      if (char === ' ') {
        const spaceWidth = (spaceAdvanceWidth ?? EM_UNIT / 2) * fontToDisplay * scaleX;
        if (rowWidths[rowIdx] + spaceWidth > MAX_ROW_WIDTH && rowWidths[rowIdx] > 0) {
          rowIdx++;
          rows.push([]);
          rowWidths.push(0);
        }
        rowWidths[rowIdx] += spaceWidth;
        rows[rowIdx].push({ type: 'space', width: spaceWidth });
        continue;
      }

      const glyphName = charToGlyph.get(char);
      if (!glyphName) continue;

      const centerline = centerlines[glyphName];
      const glyphWidth = centerline
        ? (centerline.advance_width || EM_UNIT) * fontToDisplay * scaleX
        : EM_UNIT * fontToDisplay * scaleX;

      if (rowWidths[rowIdx] + glyphWidth > MAX_ROW_WIDTH && rowWidths[rowIdx] > 0) {
        rowIdx++;
        rows.push([]);
        rowWidths.push(0);
      }

      if (!centerline) {
        rows[rowIdx].push({ type: 'glyph', char, glyphName, centerline: null, width: glyphWidth });
      } else {
        const rasterScale = centerline.raster_scale || 1;
        const advanceWidth = centerline.advance_width || EM_UNIT;
        const K = fontToDisplay / rasterScale;
        rows[rowIdx].push({ type: 'glyph', char, glyphName, centerline, width: glyphWidth, K, rasterScale, advanceWidth });
      }
      rowWidths[rowIdx] += glyphWidth;
    }

    const maxRowWidth = Math.max(...rowWidths, 0);
    const totalRows = rows.length;

    // Pass 2: assign positions with per-row alignment
    const result = [];
    for (let r = 0; r < rows.length; r++) {
      const rowWidth = rowWidths[r];
      let xStart = 0;
      if (textAlign === 'center') xStart = (maxRowWidth - rowWidth) / 2;
      else if (textAlign === 'right') xStart = maxRowWidth - rowWidth;

      const yOffset = r * rowHeight;
      let x = xStart;
      for (const item of rows[r]) {
        if (item.type === 'space') { x += item.width; continue; }
        result.push({
          char: item.char,
          glyphName: item.glyphName,
          centerline: item.centerline,
          xOffset: x,
          yOffset,
          ...(item.centerline ? { K: item.K, rasterScale: item.rasterScale, advanceWidth: item.advanceWidth } : {}),
        });
        x += item.width;
      }
    }

    return { glyphs: result, maxRowWidth, totalRows };
  }, [previewText, charToGlyph, centerlines, fontToDisplay, EM_UNIT, MAX_ROW_WIDTH, ROW_GAP, scaleX, textAlign, previewFontSize]);

  const { glyphs: glyphList, maxRowWidth, totalRows } = glyphsToRender;
  const hasCenterlines = glyphList.some((g) => g.centerline);
  const showSvg = previewText && glyphList.length > 0 && hasCenterlines;

  // Calculate viewBox to fit all rows of glyphs
  const viewBoxHeight = totalRows * EM_UNIT + (totalRows - 1) * (EM_UNIT * 0.15);
  const svgPadding = 100;
  const viewBox = `${-svgPadding} ${-svgPadding} ${maxRowWidth + svgPadding * 2} ${viewBoxHeight + svgPadding * 2}`;

  // Compute glyph-to-glyph connections
  const connections = useMemo(
    () => computeConnections(glyphList, connectionParams, fontToDisplay),
    [glyphList, connectionParams, fontToDisplay]
  );

  // Compute endpoint branches
  const branches = useMemo(
    () => computeBranches(glyphList, branchParams, fontToDisplay),
    [glyphList, branchParams, fontToDisplay]
  );

  // Compute decorator points
  const decoratorPoints = useMemo(
    () => computeDecorators(glyphList, decoratorParams, fontToDisplay),
    [glyphList, decoratorParams, fontToDisplay]
  );

  // Compute offset ring paths (vector pill shapes)
  const offsetRingPaths = useMemo(
    () => computeOffsetPaths(glyphList, offsetPathParams),
    [glyphList, offsetPathParams]
  );
  const offsetRingsByIndex = useMemo(() => {
    const map = {};
    for (const { glyphIndex, paths } of offsetRingPaths) {
      map[glyphIndex] = paths;
    }
    return map;
  }, [offsetRingPaths]);


// Determine placeholder content
  let placeholder = null;
  if (fontLoading) {
    placeholder = (
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-[15px]">Loading font...</p>
      </div>
    );
  } else if (!previewText) {
    placeholder = glyphs.length > 0 ? (
      <p className="text-[15px] text-gray-500">Enter text in the bottom bar</p>
    ) : null;
  } else if (glyphList.length === 0) {
    placeholder = (
      <div className="text-center text-gray-500">
        <p className="text-lg mb-2">"{previewText}"</p>
        <p className="text-sm">No glyph found in font for this character.</p>
      </div>
    );
  } else if (!hasCenterlines) {
    placeholder = (
      <div className="text-center text-gray-500">
        <p className="text-xl mb-3 font-light">"{previewText}"</p>
        <p className="text-[15px] mb-1">Centerline not yet extracted.</p>
        <p className="text-[15px]">Click the "Test" button in the bottom bar.</p>
      </div>
    );
  }

  return (
    <div
      id="preview-container"
      ref={containerRef}
      className={`flex items-center justify-center h-full w-full relative select-none ${
        showSvg ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      style={{ background: bgColor }}
      onWheel={undefined}
      onDoubleClick={showSvg ? () => setPan({ x: 0, y: 0 }) : undefined}
    >
      {/* Background image layer — lowest z-index, sits behind SVG */}
      {backgroundImageParams.enabled && backgroundImageParams.imageUrl && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            opacity: backgroundImageParams.opacity,
            mixBlendMode: backgroundImageParams.blendMode,
          }}
        >
          <img
            src={backgroundImageParams.imageUrl}
            alt=""
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${(backgroundImageParams.scale ?? 1.0) * 100}%`,
              height: `${(backgroundImageParams.scale ?? 1.0) * 100}%`,
              objectFit: backgroundImageParams.fit === 'fill' ? 'fill' : backgroundImageParams.fit,
            }}
          />
        </div>
      )}

      {placeholder ? (
        <div className="text-center">{placeholder}</div>
      ) : showSvg ? (
        <>
          <svg
            id="skeletype-preview-svg"
            viewBox={viewBox}
            className="w-full h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${sizeScale})`,
              transformOrigin: 'center center',
              overflow: 'visible',
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
                      (test required)
                    </text>
                  </g>
                );
              }

              const { K, rasterScale } = glyph;
              const glyphOutline = glyph.centerline.outline;
              const bounds = glyph.centerline.bounds || {};
              const xMin = bounds.xMin || 0;
              const glyphAscender = glyph.centerline.ascender ?? fontAscender;

              // Centerline transform: pixel/SVG coords → display coords
              const clTranslateX = xMin * fontToDisplay - RASTER_PADDING * K;
              const clTranslateY = -RASTER_PADDING * K;

              // Outline transform: font coords → display coords
              const outlineTransform = glyphOutline
                ? `scale(${fontToDisplay}, ${-fontToDisplay}) translate(0, ${-glyphAscender})`
                : '';

              // Stroke width in pixel space (inside scale(K) transform)
              const strokeWidthInPixelSpace = strokeParams.width * rasterScale;

              // Baseline position in display coords
              const baselineY = glyphAscender * fontToDisplay;
              const slantAngle = slantParams.enabled ? slantParams.angle : 0;
              const needsTransform = scaleX !== 1 || scaleY !== 1 || slantAngle !== 0;
              const scaleTransform = needsTransform
                ? `translate(0, ${baselineY * (1 - scaleY)}) scale(${scaleX}, ${scaleY}) translate(0, ${baselineY}) skewX(${-slantAngle}) translate(0, ${-baselineY})`
                : '';

              return (
                <g key={index} transform={`translate(${glyph.xOffset}, ${glyph.yOffset})`}>
                 <g transform={scaleTransform || undefined}>
                  {/* Original glyph outline (flesh) - rendered behind skeleton */}
                  {showFlesh && glyphOutline && glyphOutline.path && (
                    <g transform={outlineTransform}>
                      <path
                        d={glyphOutline.path}
                        fill={theme === 'dark' ? '#ffffff' : '#000000'}
                        fillOpacity={0.4}
                        stroke="none"
                      />
                    </g>
                  )}

                  {/* Centerline paths (in Autotrace pixel coordinates) */}
                  <g
                    transform={`translate(${clTranslateX}, ${clTranslateY}) scale(${K})`}
                  >
                    {/* Offset path ring: vector pill-shaped paths rendered as strokes */}
                    {offsetPathParams.enabled && (offsetRingsByIndex[index] || []).map((d, pi) => (
                      <path
                        key={`offset-${pi}`}
                        d={d}
                        fill="none"
                        stroke={offsetPathParams.color}
                        strokeWidth={offsetPathParams.weight}
                        strokeLinecap={offsetPathParams.corner === 'round' ? 'round' : 'square'}
                        strokeLinejoin={offsetPathParams.corner === 'round' ? 'round' : 'miter'}
                      />
                    ))}

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

            {/* Branch lines from glyph endpoints */}
            {branchParams.enabled && branches.length > 0 && (
              <g>
                {branches.map((b, i) => (
                  <path
                    key={`branch-${i}`}
                    d={b.d}
                    fill="none"
                    stroke={branchParams.color}
                    strokeWidth={b.widthRatio * strokeParams.width * fontToDisplay}
                    strokeLinecap="round"
                  />
                ))}
              </g>
            )}

            {/* Connection lines between adjacent glyphs */}
            {connectionParams.enabled && connections.length > 0 && (
              <g>
                {connections.map((conn, i) => (
                  <path
                    key={`conn-${i}`}
                    d={conn.d}
                    fill="none"
                    stroke={connectionParams.color}
                    strokeWidth={strokeParams.width * fontToDisplay}
                    strokeLinecap={strokeParams.cap}
                    strokeLinejoin={strokeParams.join}
                  />
                ))}
              </g>
            )}

            {/* Decorator shapes along centerline paths */}
            {decoratorParams.enabled && decoratorPoints.length > 0 && (
              <g>
                {decoratorPoints.map((pt, i) => {
                  const s = decoratorParams.size;
                  const fill = decoratorParams.filled ? decoratorParams.color : 'none';
                  const stroke = decoratorParams.filled ? 'none' : decoratorParams.color;
                  const sw = decoratorParams.filled ? 0 : strokeParams.width * fontToDisplay * 0.3;

                  switch (decoratorParams.shape) {
                    case 'circle':
                      return (
                        <circle
                          key={`dec-${i}`}
                          cx={pt.x} cy={pt.y} r={s / 2}
                          fill={fill} stroke={stroke} strokeWidth={sw}
                        />
                      );
                    case 'square':
                      return (
                        <rect
                          key={`dec-${i}`}
                          x={pt.x - s / 2} y={pt.y - s / 2}
                          width={s} height={s}
                          fill={fill} stroke={stroke} strokeWidth={sw}
                        />
                      );
                    case 'diamond':
                      return (
                        <polygon
                          key={`dec-${i}`}
                          points={`${pt.x},${pt.y - s / 2} ${pt.x + s / 2},${pt.y} ${pt.x},${pt.y + s / 2} ${pt.x - s / 2},${pt.y}`}
                          fill={fill} stroke={stroke} strokeWidth={sw}
                        />
                      );
                    case 'triangle':
                      return (
                        <polygon
                          key={`dec-${i}`}
                          points={`${pt.x},${pt.y - s * 0.577} ${pt.x + s / 2},${pt.y + s * 0.289} ${pt.x - s / 2},${pt.y + s * 0.289}`}
                          fill={fill} stroke={stroke} strokeWidth={sw}
                        />
                      );
                    default:
                      return null;
                  }
                })}
              </g>
            )}
          </svg>
        </>
      ) : null}
    </div>
  );
}
