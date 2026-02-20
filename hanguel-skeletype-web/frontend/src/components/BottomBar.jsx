import { useState, useEffect, useRef, useCallback } from 'react';
import useFontStore from '../stores/fontStore';
import ExtractButton from './ExtractButton';
import ExportButton from './ExportButton';
import FXControls from './FXControls';

function Divider() {
  return <div className="w-px h-5 bg-gray-400/50 mx-1 shrink-0" />;
}

export default function BottomBar() {
  const {
    fontId,
    fontName,
    strokeParams,
    setStrokeParams,
    showFlesh,
    setShowFlesh,
    textAlign,
    cycleTextAlign,
    clearGlyphSelection,
    selectGlyphsByText,
    setPreviewText,
    glyphs,
    centerlines,
  } = useFontStore();

  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'fx'

  // Stroke slider auto-animation on first extraction
  const animRef = useRef(null);
  const [animating, setAnimating] = useState(false);
  const hasAnimated = useRef(false);

  const hasCenterlines = Object.keys(centerlines).length > 0;

  // Reset local state when font changes
  useEffect(() => {
    setText('');
    hasAnimated.current = false;
    setAnimating(false);
    setActiveTab('basic');
  }, [fontId]);

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

    const MIN = 10, MAX = 300, SPEED = 100;
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

  function handleTextChange(newText) {
    setText(newText);
    clearGlyphSelection();
    if (newText.trim()) {
      selectGlyphsByText(newText);
    }
    setPreviewText(newText);
  }

  if (!fontId) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-[40px] px-3 pointer-events-none">
      <div className="pointer-events-auto bg-gray-200/90 backdrop-blur-md rounded-[28px] px-4 py-2 min-h-[52px] flex items-center gap-0 shadow-lg w-fit">

        {/* ── Left section: Font name + Tab switcher (fixed) ── */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => useFontStore.getState().reset()}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-gray-300 hover:bg-gray-400 rounded-full transition-colors"
            title="다른 폰트 불러오기"
          >
            {fontName || 'Load Font'}
          </button>

          <Divider />

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                activeTab === 'basic'
                  ? 'bg-[#0cd0fc] text-white'
                  : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setActiveTab('fx')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                activeTab === 'fx'
                  ? 'bg-[#0cd0fc] text-white'
                  : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
              }`}
            >
              FX
            </button>
          </div>
        </div>

        {/* ── Center section: tab-dependent content (flexible) ── */}
        <Divider />
        <div className="flex items-center gap-1 w-[680px] justify-start overflow-x-auto scrollbar-hide">

          {/* Basic Tab Controls */}
          {activeTab === 'basic' && (
            <>
              {/* Text Input */}
              <textarea
                rows={2}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={hasGlyphs ? '문구 입력' : '폰트를 먼저 업로드'}
                disabled={!hasGlyphs}
                className="shrink-0 w-32 px-3 py-1 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-[#0cd0fc] disabled:bg-gray-100 resize-none leading-relaxed"
              />

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
                Flesh
              </button>

              {/* Text Alignment */}
              <button
                onClick={cycleTextAlign}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
                title={`정렬: ${textAlign}`}
              >
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                  {textAlign === 'left' ? (
                    <>
                      <rect x="0" y="0" width="14" height="2" rx="1" fill="#374151" />
                      <rect x="0" y="5" width="10" height="2" rx="1" fill="#374151" />
                      <rect x="0" y="10" width="12" height="2" rx="1" fill="#374151" />
                    </>
                  ) : textAlign === 'center' ? (
                    <>
                      <rect x="1" y="0" width="14" height="2" rx="1" fill="#374151" />
                      <rect x="3" y="5" width="10" height="2" rx="1" fill="#374151" />
                      <rect x="2" y="10" width="12" height="2" rx="1" fill="#374151" />
                    </>
                  ) : (
                    <>
                      <rect x="2" y="0" width="14" height="2" rx="1" fill="#374151" />
                      <rect x="6" y="5" width="10" height="2" rx="1" fill="#374151" />
                      <rect x="4" y="10" width="12" height="2" rx="1" fill="#374151" />
                    </>
                  )}
                </svg>
              </button>

              {/* X-Scale */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-500">X</span>
                <input
                  type="range"
                  min={0.2}
                  max={1.8}
                  step={0.05}
                  value={strokeParams.scaleX}
                  onChange={(e) => setStrokeParams({ scaleX: +e.target.value })}
                  className="w-16 h-1 slider-white appearance-none bg-transparent"
                />
              </div>

              {/* Y-Scale */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-500">Y</span>
                <input
                  type="range"
                  min={0.2}
                  max={1.8}
                  step={0.05}
                  value={strokeParams.scaleY}
                  onChange={(e) => setStrokeParams({ scaleY: +e.target.value })}
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

              {/* Cap */}
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
            </>
          )}

          {/* FX Tab Controls */}
          {activeTab === 'fx' && <FXControls />}
        </div>
        <Divider />

        {/* ── Right section: Extract + Export (fixed) ── */}
        <div className="flex items-center gap-1 shrink-0">
          <ExtractButton inline />
          <ExportButton inline />
        </div>
      </div>
    </div>
  );
}
