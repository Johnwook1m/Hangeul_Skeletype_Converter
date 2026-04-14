import { useState, useEffect, useRef, useCallback } from 'react';
import useFontStore from '../stores/fontStore';
import ExtractButton from './ExtractButton';
import ExportMenu from './ExportMenu';
import FXControls from './FXControls';
import ArchiveModal from './ArchiveModal';
import { uploadFont, getGlyphs } from '../api/client';


function Divider({ className = 'mx-2' }) {
  return <div className={`w-px h-5 bg-gray-400/50 shrink-0 ${className}`} />;
}

function FontChipButton({ children, hoverLabel, className, ...props }) {
  const ref = useRef(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(() => {
      if (!ref.current) return;
      const { width, height } = ref.current.getBoundingClientRect();
      setDim({ w: width, h: height });
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      className={`font-chip relative ${className}`}
      {...props}
    >
      {dim.w > 0 && (
        <svg
          style={{
            position: 'absolute', top: 0, left: 0,
            width: dim.w, height: dim.h,
            overflow: 'visible', pointerEvents: 'none',
          }}
        >
          <rect
            className="marching-rect"
            x={0} y={0}
            width={dim.w} height={dim.h}
            rx={dim.h / 2} ry={dim.h / 2}
            fill="none" stroke="#9ca3af" strokeWidth={1.5}
          />
        </svg>
      )}
      {children}
    </button>
  );
}

export default function BottomBar() {
  const {
    fontId,
    isDemo,
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
    backgroundImages,
    glyphSize,
    setGlyphSize,
    bgColor,
    setBgColor,
    fontLoading,
    activeLayerId,
    setFont,
    setGlyphs,
    setFontBlobUrl,
    setFontLoading,
  } = useFontStore();

  const uploadFileRef = useRef(null);
  const extractRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showArchive, setShowArchive] = useState(false);

  async function handleUploadFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['ttf', 'otf', 'woff'].includes(ext)) {
      setUploadError('Only TTF, OTF, WOFF files are supported.');
      return;
    }
    setUploadLoading(true);
    setUploadError(null);
    setFontLoading(true);
    try {
      const data = await uploadFont(file);
      setFont(data);
      setFontBlobUrl(URL.createObjectURL(file));
      const glyphData = await getGlyphs(data.font_id);
      setGlyphs(glyphData.glyphs);
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to upload font.');
      setFontLoading(false);
    } finally {
      setUploadLoading(false);
    }
  }

  const bgImageActive = backgroundImages.some(i => i.enabled && i.imageUrl);
  const chipInactive = 'bg-[#d9d9d9] text-gray-600 hover:bg-[#c9c9c9]';
  const labelCls = 'text-xs text-gray-500';

  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'fx'
  const [loadingDots, setLoadingDots] = useState('.');

  useEffect(() => {
    if (!fontLoading) return;
    const id = setInterval(() => {
      setLoadingDots((d) => (d.length >= 12 ? '.' : d + '.'));
    }, 120);
    return () => clearInterval(id);
  }, [fontLoading]);

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

  // Sync local text with active layer's previewText when switching layers
  useEffect(() => {
    const store = useFontStore.getState();
    const activeLayer = store.layers.find(l => l.id === activeLayerId);
    if (activeLayer) {
      setText(activeLayer.previewText ?? '');
    }
  }, [activeLayerId]);

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

    const MIN = 0, MAX = 300, SPEED = 100;
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

  return (
    <>
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-[35px] px-3 pointer-events-none">
      <div className={`pointer-events-auto rounded-[28px] px-5 py-2 h-[65px] flex items-center gap-0 shadow-lg w-[80%] ${
        bgImageActive ? 'bg-gray-200' : 'bg-gray-200'
      }`}>

        {/* ── Left section: Font name (or upload) + Tab switcher ── */}
        <div className="flex items-center gap-0 shrink-0">
          <input
            ref={uploadFileRef}
            type="file"
            accept=".ttf,.otf,.woff"
            className="hidden"
            onChange={(e) => handleUploadFile(e.target.files[0])}
          />
          {!fontId ? (
            <FontChipButton
              onClick={() => uploadFileRef.current?.click()}
              disabled={uploadLoading}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${chipInactive}`}
            >
              {uploadLoading ? 'Loading...' : 'Upload Font'}
            </FontChipButton>
          ) : (
            <FontChipButton
              onClick={() => uploadFileRef.current?.click()}
              hoverLabel="Upload Font"
              className={`shrink-0 max-w-[120px] px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${chipInactive}`}
            >
              {fontLoading ? (
                <span className="block truncate">Loading{loadingDots}</span>
              ) : (
                <span className="block truncate">{fontName}</span>
              )}
            </FontChipButton>
          )}
          {uploadError && (
            <span className="ml-2 text-xs text-red-500">{uploadError}</span>
          )}

          <Divider />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                activeTab === 'basic' ? 'bg-[#FF5714] text-white' : chipInactive
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setActiveTab('fx')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                activeTab === 'fx' ? 'bg-[#FF5714] text-white' : chipInactive
              }`}
            >
              FX
            </button>
          </div>
        </div>

        {/* ── Center section: always visible, disabled without font ── */}
        <Divider />

        {/* Text Input: fixed, not scrollable */}
        {activeTab === 'basic' && (
          <>
            <textarea
              rows={2}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                  e.stopPropagation();
                  e.target.select();
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  extractRef.current?.();
                }
              }}
              placeholder={!fontId ? 'Upload a font first' : 'Type text'}
              disabled={!hasGlyphs || isDemo}
              className={`w-[180px] shrink-0 px-3 py-1 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-[#FF5714] disabled:bg-gray-100 resize-none leading-relaxed ${!fontId ? 'pointer-events-none' : ''}`}
            />
            <Divider className="mx-2" />
          </>
        )}

        <div className={`flex items-center gap-[10px] flex-1 min-w-0 justify-start overflow-x-auto scrollbar-hide ${!fontId ? 'pointer-events-none' : ''}`}>

          {/* Basic Tab Controls */}
          {activeTab === 'basic' && (
            <>
              {/* Show Flesh */}
              <button
                onClick={() => setShowFlesh(!showFlesh)}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  showFlesh ? 'bg-[#FF5714] text-white' : chipInactive
                }`}
              >
                Flesh
              </button>

              {/* Text Alignment */}
              <button
                onClick={cycleTextAlign}
                className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors ${chipInactive}`}
              >
                <svg width="14" height="11" viewBox="0 0 16 12" fill="none">
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

              {/* Text Size */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={labelCls}>Line</span>
                <input
                  type="range"
                  min={20}
                  max={300}
                  step={5}
                  value={glyphSize}
                  onChange={(e) => setGlyphSize(+e.target.value)}
                  className="w-16 h-1 slider-white appearance-none bg-transparent"
                />
              </div>

              {/* Stroke Width */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={labelCls}>Stroke</span>
                <input
                  type="range"
                  min={0}
                  max={300}
                  step={1}
                  value={strokeParams.width}
                  onPointerDown={stopAnimation}
                  onChange={(e) => { stopAnimation(); setStrokeParams({ width: +e.target.value }); }}
                  className="w-16 h-1 slider-white appearance-none bg-transparent"
                />
              </div>

              {/* Cap */}
              <div className="relative shrink-0">
                <select
                  value={strokeParams.cap}
                  onChange={(e) => setStrokeParams({ cap: e.target.value })}
                  className="text-xs pl-2 pr-[18px] py-1 border border-gray-300 rounded-xl bg-white appearance-none cursor-pointer focus:outline-none focus:border-[#FF5714]"
                  style={{ color: 'oklch(0.446 0.03 256.802)' }}
                >
                  <option value="butt">Butt</option>
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-[5px] flex items-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="oklch(0.446 0.03 256.802)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Color pickers */}
              <div className="flex items-center gap-[9px] shrink-0">
                {/* Centerline Color */}
                <div className="flex items-center gap-1">
                  <span className={labelCls}>C</span>
                  <input
                    type="color"
                    value={strokeParams.centerlineColor}
                    onChange={(e) => setStrokeParams({ centerlineColor: e.target.value })}
                    className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer overflow-hidden"
                    style={{ padding: 0 }}
                  />
                </div>

                {/* Stroke Color */}
                <div className="flex items-center gap-1">
                  <span className={labelCls}>S</span>
                  <input
                    type="color"
                    value={strokeParams.strokeColor}
                    onChange={(e) => setStrokeParams({ strokeColor: e.target.value })}
                    className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer overflow-hidden"
                    style={{ padding: 0 }}
                  />
                </div>

                {/* Background Color */}
                <div className="flex items-center gap-1">
                  <span className={labelCls}>BG</span>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer overflow-hidden"
                    style={{ padding: 0 }}
                  />
                </div>
              </div>
            </>
          )}

          {/* FX Tab Controls */}
          {activeTab === 'fx' && <FXControls />}
        </div>
        <Divider />

        {/* ── Right section: Extract + Archive + Export ── */}
        <div className={`flex items-center gap-2 shrink-0 ${!fontId ? 'pointer-events-none' : ''}`}>
          <ExtractButton inline extractRef={extractRef} />
          {fontId && !isDemo && (
            <button
              onClick={() => setShowArchive(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors"
            >
              Archive
            </button>
          )}
          <ExportMenu />
        </div>
        {showArchive && (
          <ArchiveModal
            onClose={() => setShowArchive(false)}
            onSuccess={() => {}}
          />
        )}
      </div>
    </div>
    </>
  );
}
