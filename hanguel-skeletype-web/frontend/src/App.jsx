import { useState, useEffect, useRef, useCallback } from 'react';
import useFontStore from './stores/fontStore';
import FontUpload from './components/FontUpload';

import GlyphPreview from './components/GlyphPreview';
import ExtractButton from './components/ExtractButton';

import ExportButton from './components/ExportButton';
import './index.css';

function BottomBar() {
  const {
    fontId,
    fontName,
    strokeParams,
    setStrokeParams,
    showFlesh,
    setShowFlesh,
    glyphSize,
    setGlyphSize,
    selectGlyphsByText,
    setPreviewText,
    glyphs,
    centerlines,
  } = useFontStore();

  const [text, setText] = useState('');

  // Stroke slider auto-animation on first extraction
  const animRef = useRef(null);
  const [animating, setAnimating] = useState(false);
  const hasAnimated = useRef(false);

  const hasCenterlines = Object.keys(centerlines).length > 0;

  // Start animation when centerlines first appear
  useEffect(() => {
    if (hasCenterlines && !hasAnimated.current) {
      hasAnimated.current = true;
      setAnimating(true);
    }
  }, [hasCenterlines]);

  // Run the ping-pong animation
  useEffect(() => {
    if (!animating) return;

    const MIN = 10, MAX = 300, SPEED = 100; // SPEED = units per second
    let startTime = null;
    let direction = 1;
    let current = strokeParams.width;

    function tick(timestamp) {
      if (!startTime) startTime = timestamp;
      const dt = (timestamp - startTime) / 1000;
      startTime = timestamp;

      current += direction * SPEED * dt;
      if (current >= MAX) { current = MAX; direction = -1; }
      if (current <= MIN) { current = MIN; direction = 1; }

      setStrokeParams({ width: Math.round(current) });
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [animating]);

  const stopAnimation = useCallback(() => {
    if (animating) {
      setAnimating(false);
      cancelAnimationFrame(animRef.current);
    }
  }, [animating]);

  const hasGlyphs = glyphs.length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    selectGlyphsByText(text);
    setPreviewText(text);
  }

  if (!fontId) return null;

  return (
    <>
      {/* Bottom Menu Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-[40px] px-3 pointer-events-none">
        <div className="pointer-events-auto bg-gray-200/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-1 shadow-lg max-w-screen-xl overflow-x-auto">

          {/* Font info + Load */}
          <button
            onClick={() => useFontStore.getState().reset()}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-gray-300 hover:bg-gray-400 rounded-full transition-colors"
            title="다른 폰트 불러오기"
          >
            {fontName || 'Load Font'}
          </button>

          <Divider />

          {/* Text Input */}
          <div className="flex items-center gap-1 shrink-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (hasGlyphs && text.trim()) handleSubmit(e);
                }
              }}
              placeholder={hasGlyphs ? '문구 입력' : '폰트를 먼저 업로드'}
              disabled={!hasGlyphs}
              rows={2}
              className="w-32 px-3 py-1.5 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-[#0cd0fc] disabled:bg-gray-100 resize-none"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasGlyphs || !text.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-gray-300 hover:bg-gray-400 rounded-full disabled:opacity-40 transition-colors"
            >
              선택
            </button>
          </div>

          <Divider />

          {/* Show Flesh */}
          <button
            onClick={() => setShowFlesh(!showFlesh)}
            className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              showFlesh
                ? 'bg-[#0cd0fc] text-white'
                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
            }`}
          >
            {showFlesh ? 'Flesh' : 'Flesh'}
          </button>

          {/* Size */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-500">Size</span>
            <input
              type="range"
              min={100}
              max={400}
              step={10}
              value={glyphSize}
              onChange={(e) => setGlyphSize(+e.target.value)}
              className="w-16 h-1 slider-white appearance-none bg-transparent"
            />
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-500">Stroke</span>
            <input
              type="range"
              min={10}
              max={300}
              step={1}
              value={strokeParams.width}
              onPointerDown={stopAnimation}
              onChange={(e) => { stopAnimation(); setStrokeParams({ width: +e.target.value }); }}
              className="w-16 h-1 slider-white appearance-none bg-transparent"
            />
          </div>

          {/* Cap & Join */}
          <select
            value={strokeParams.cap}
            onChange={(e) => setStrokeParams({ cap: e.target.value })}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-full bg-white shrink-0"
          >
            <option value="butt">Butt</option>
            <option value="round">Round</option>
            <option value="square">Square</option>
          </select>
          {/* Centerline Color */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-500">C</span>
            <input
              type="color"
              value={strokeParams.centerlineColor}
              onChange={(e) => setStrokeParams({ centerlineColor: e.target.value })}
              className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer"
              style={{ padding: 0 }}
              title="중심선 색상"
            />
          </div>

          {/* Stroke Color */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-500">S</span>
            <input
              type="color"
              value={strokeParams.strokeColor}
              onChange={(e) => setStrokeParams({ strokeColor: e.target.value })}
              className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer"
              style={{ padding: 0 }}
              title="Stroke 색상"
            />
          </div>

          <Divider />

          {/* Extract & Export */}
          <ExtractButton inline />
          <ExportButton inline />

        </div>
      </div>
    </>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-400/50 mx-1 shrink-0" />;
}

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#1a1a1a] relative">
      {/* Full-screen preview area */}
      <div className="w-full h-full">
        <GlyphPreview large />
      </div>

      {/* Full-screen dropzone overlay */}
      <FontUpload />

      {/* Bottom menu bar (only when font loaded) */}
      <BottomBar />
    </div>
  );
}

export default App;
