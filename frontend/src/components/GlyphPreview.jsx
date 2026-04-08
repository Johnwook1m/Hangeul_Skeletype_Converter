import { useMemo, useState, useRef, useEffect } from 'react';
import useFontStore from '../stores/fontStore';
import GlyphLayerRenderer from './GlyphLayerRenderer';

export default function GlyphPreview({ large = false }) {
  const {
    glyphs,
    previewText,
    centerlines,
    backgroundImageParams,
    layers,
    activeLayerId,
    unitsPerEm,
    ascender,
    descender,
    showFlesh,
    spaceAdvanceWidth,
    textAlign,
    theme,
    bgColor,
    fontLoading,
    isDemo,
    fontSlots,
    mixMode,
    mixSeed,
  } = useFontStore();

  // Pan state for trackpad/mouse navigation
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const zoomRef = useRef(1);
  const gestureStartZoomRef = useRef(1); // For Safari GestureEvent
  const isGesturing = useRef(false); // Prevent wheel+ctrlKey double-zoom in Safari

  // Reset pan when preview text changes
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [previewText]);

  // Demo: 80% zoom; real font: full zoom
  useEffect(() => {
    setZoom(isDemo ? 0.8 : 1.0);
  }, [isDemo]);

  // Animated dots for font loading state
  const [loadingDots, setLoadingDots] = useState('...');
  useEffect(() => {
    if (!fontLoading) return;
    const id = setInterval(() => {
      setLoadingDots((d) => (d.length >= 12 ? '.' : d + '.'));
    }, 120);
    return () => clearInterval(id);
  }, [fontLoading]);

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

  // Display scale: maps font units to display units (base scale, without size)
  const fontToDisplay = EM_UNIT / fontHeight;

  // Keep refs in sync for native event listeners
  zoomRef.current = zoom;

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
        // Normalize deltaY by deltaMode (0=pixel, 1=line, 2=page)
        const normalizedDelta = e.deltaMode === 0 ? e.deltaY : e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY * 300;
        // Multiplicative zoom for natural feel (~1% per pixel delta)
        const zoomFactor = 1 - normalizedDelta * 0.008;
        setZoom((z) => Math.max(0.2, Math.min(5.0, z * zoomFactor)));
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
      gestureStartZoomRef.current = zoomRef.current;
    };
    const handleGestureChange = (e) => {
      e.preventDefault();
      if (!el.contains(e.target) && e.target !== el) return;
      setZoom(Math.max(0.2, Math.min(5.0, gestureStartZoomRef.current * e.scale)));
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

  // Line wrapping: width-based (handles mixed English/Korean glyph widths)
  const ROW_GAP = EM_UNIT * 0; // vertical gap between rows

  // Mix mode: per-slot char→glyph maps and per-slot fontToDisplay
  const slotMaps = useMemo(() => {
    if (!mixMode) return null;
    return fontSlots.map((slot) => {
      const map = new Map();
      for (const g of slot.glyphs || []) {
        if (g.character) map.set(g.character, g.name);
      }
      const slotEm = slot.unitsPerEm || 1000;
      const slotAsc = slot.ascender ?? slotEm * 0.8;
      const slotDesc = slot.descender ?? -(slotEm * 0.2);
      const slotFontHeight = slotAsc - slotDesc;
      // Normalize each slot to canonical EM_UNIT (slot 0 / current font), keeping baselines aligned
      const slotFontToDisplay = (EM_UNIT / slotFontHeight) * (EM_UNIT / slotEm);
      return { slot, map, slotEm, slotFontToDisplay };
    });
  }, [mixMode, fontSlots, EM_UNIT]);

  // Seeded RNG: stable pick per (mixSeed, layerId, char index)
  function pickSlotIdx(seed, layerId, idx, n) {
    let h = seed >>> 0;
    for (let i = 0; i < layerId.length; i++) h = (h * 31 + layerId.charCodeAt(i)) >>> 0;
    h = (h * 31 + idx) >>> 0;
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return (h >>> 0) % n;
  }

  // Per-layer glyph layout computation
  const perLayerLayouts = useMemo(() => {
    const rowHeight = EM_UNIT + ROW_GAP;
    const layouts = {};

    // Lookup helper: returns { glyphName, centerline, srcFontToDisplay } for a char
    const useMix = mixMode && slotMaps && slotMaps.length > 0;
    function lookupChar(char, layerId, charIdx) {
      if (useMix) {
        // Try the randomly-picked slot first; fall back to any slot that has the glyph
        const startIdx = pickSlotIdx(mixSeed, layerId, charIdx, slotMaps.length);
        for (let off = 0; off < slotMaps.length; off++) {
          const sm = slotMaps[(startIdx + off) % slotMaps.length];
          const name = sm.map.get(char);
          if (!name) continue;
          const cl = sm.slot.centerlines[name];
          return { glyphName: name, centerline: cl ?? null, srcFontToDisplay: sm.slotFontToDisplay };
        }
        return { glyphName: null, centerline: null, srcFontToDisplay: fontToDisplay };
      }
      const name = charToGlyph.get(char);
      if (!name) return { glyphName: null, centerline: null, srcFontToDisplay: fontToDisplay };
      return { glyphName: name, centerline: centerlines[name] ?? null, srcFontToDisplay: fontToDisplay };
    }

    for (const layer of layers) {
      if (!layer.visible) continue;
      const layerText = layer.previewText ?? '';
      if (!layerText) continue;
      const layerGlyphSize = layer.glyphSize ?? 100;
      const MAX_ROW_WIDTH = EM_UNIT * 12 * fontToDisplay * (80 / layerGlyphSize);

      // Pass 1: collect rows
      const rows = [[]];
      const rowWidths = [0];
      let rowIdx = 0;

      let charIdx = 0;
      for (const char of layerText) {
        const myIdx = charIdx++;
        if (char === '\n') {
          rowIdx++;
          rows.push([]);
          rowWidths.push(0);
          continue;
        }
        if (char === ' ') {
          const spaceWidth = (spaceAdvanceWidth ?? EM_UNIT / 2) * fontToDisplay;
          if (rowWidths[rowIdx] + spaceWidth > MAX_ROW_WIDTH && rowWidths[rowIdx] > 0) {
            rowIdx++;
            rows.push([]);
            rowWidths.push(0);
          }
          rowWidths[rowIdx] += spaceWidth;
          rows[rowIdx].push({ type: 'space', width: spaceWidth });
          continue;
        }

        const { glyphName, centerline, srcFontToDisplay } = lookupChar(char, layer.id, myIdx);
        if (!glyphName) continue;

        const glyphWidth = centerline
          ? (centerline.advance_width || EM_UNIT) * srcFontToDisplay
          : EM_UNIT * srcFontToDisplay;

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
          const K = srcFontToDisplay / rasterScale;
          rows[rowIdx].push({ type: 'glyph', char, glyphName, centerline, width: glyphWidth, K, rasterScale, advanceWidth, srcFontToDisplay });
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
            ...(item.centerline ? { K: item.K, rasterScale: item.rasterScale, advanceWidth: item.advanceWidth, srcFontToDisplay: item.srcFontToDisplay } : {}),
          });
          x += item.width;
        }
      }

      layouts[layer.id] = { glyphs: result, maxRowWidth, totalRows };
    }

    return layouts;
  }, [charToGlyph, centerlines, fontToDisplay, EM_UNIT, ROW_GAP, textAlign, layers, spaceAdvanceWidth, mixMode, slotMaps, mixSeed]);

  // Aggregate viewBox dimensions from all layer layouts
  const allLayouts = Object.values(perLayerLayouts);
  const maxRowWidth = Math.max(...allLayouts.map(l => l.maxRowWidth), 0);
  const totalRows = Math.max(...allLayouts.map(l => l.totalRows), 1);

  // Active layer layout for placeholders and visibility checks
  const activeLayout = perLayerLayouts[activeLayerId];
  const activeGlyphList = activeLayout?.glyphs ?? [];
  const hasCenterlines = activeGlyphList.some((g) => g.centerline);
  const anyLayerHasText = layers.some(l => l.visible && (l.previewText ?? ''));
  const showSvg = anyLayerHasText && activeGlyphList.length > 0 && hasCenterlines;

  // Entrance animation: fade + slide up whenever content appears
  const [introVisible, setIntroVisible] = useState(false);
  useEffect(() => {
    if (showSvg) {
      setIntroVisible(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setIntroVisible(true)));
    } else {
      setIntroVisible(false);
    }
  }, [showSvg]);

  // Calculate viewBox to fit all rows of glyphs
  const viewBoxHeight = totalRows * EM_UNIT + (totalRows - 1) * (EM_UNIT * 0.15);
  const svgPadding = 300;
  const viewBox = `${-svgPadding} ${-svgPadding} ${maxRowWidth + svgPadding * 2} ${viewBoxHeight + svgPadding * 2}`;

  // connections/branches/decorators/offsetRings는 각 GlyphLayerRenderer에서 독립 계산


// Determine placeholder content
  let placeholder = null;
  if (fontLoading) {
    placeholder = (
      <p className="text-[15px] text-gray-500">Loading font{loadingDots}</p>
    );
  } else if (!previewText && !anyLayerHasText) {
    placeholder = glyphs.length > 0 ? (
      <p className="text-[15px] text-gray-500">Enter text in the bottom bar</p>
    ) : null;
  } else if (activeGlyphList.length === 0) {
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
      onDoubleClick={showSvg ? () => { setPan({ x: 0, y: 0 }); setZoom(1); } : undefined}
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
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              overflow: 'visible',
              opacity: introVisible ? 1 : 0,
              translate: introVisible ? '0 0' : '0 24px',
              transition: introVisible ? 'opacity 0.7s ease, translate 0.7s ease' : 'none',
            }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* 센터라인 없는 글리프 — placeholder (활성 레이어 기준으로 렌더링) */}
            {activeGlyphList.map((glyph, index) => {
              if (glyph.centerline) return null;
              const cellWidth = EM_UNIT * fontToDisplay;
              const midY = fontAscender * fontToDisplay / 2;
              return (
                <g key={index} transform={`translate(${glyph.xOffset}, ${glyph.yOffset})`}>
                  <text x={cellWidth / 2} y={midY} textAnchor="middle" dominantBaseline="middle" fill="#666" fontSize={200}>
                    {glyph.char}
                  </text>
                  <text x={cellWidth / 2} y={fontAscender * fontToDisplay} textAnchor="middle" fill="#666" fontSize={60}>
                    (test required)
                  </text>
                </g>
              );
            })}

            {/* 레이어별 렌더링 — 가시성 켜진 레이어를 순서대로 쌓음 */}
            {layers.filter(l => l.visible).map(layer => {
              const layout = perLayerLayouts[layer.id];
              if (!layout) return null;
              return (
                <GlyphLayerRenderer
                  key={layer.id}
                  layer={layer}
                  glyphList={layout.glyphs}
                  fontToDisplay={fontToDisplay}
                  fontAscender={fontAscender}
                  EM_UNIT={EM_UNIT}
                  theme={theme}
                  showFlesh={showFlesh}
                  maxRowWidth={maxRowWidth}
                  totalRows={totalRows}
                />
              );
            })}

          </svg>
        </>
      ) : null}
    </div>
  );
}
