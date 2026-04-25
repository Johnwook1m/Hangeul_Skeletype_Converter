import { useState, useEffect, useRef, useCallback } from 'react';
import useFontStore from '../stores/fontStore';
import ExtractButton from './ExtractButton';
import ExportMenu from './ExportMenu';
import FXControls from './FXControls';
import ArchiveModal from './ArchiveModal';
import { uploadFont, getGlyphs, runExtraction } from '../api/client';


function StrokeNumberInput({ value, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);
  function commit() {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n)) {
      const clamped = Math.max(0, Math.min(300, n));
      onCommit(clamped);
      setDraft(String(clamped));
    } else {
      setDraft(String(value));
    }
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
      onFocus={(e) => { setFocused(true); e.target.select(); }}
      onBlur={() => { setFocused(false); commit(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.target.blur();
        if (e.key === 'Escape') { setDraft(String(value)); e.target.blur(); }
      }}
      style={{ width: `${Math.max(2, draft.length)}ch` }}
      className="text-xs text-gray-500 bg-transparent outline-none text-center tabular-nums p-0 cursor-text border-0 border-b border-gray-500"
    />
  );
}

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
    fontLoading,
    activeLayerId,
    setFont,
    setGlyphs,
    setFontBlobUrl,
    setFontLoading,
    setMixMode,
    addFontSlot,
    updateFontSlot,
    setSlotCenterline,
    setLayerPinnedSlot,
    fontSlots,
    mixMode,
    layers,
    bgColor,
    setBgColor,
  } = useFontStore();

  const uploadFileRef = useRef(null);
  const extractRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const uploadErrorTimer = useRef(null);

  function showUploadError(msg) {
    setUploadError(msg);
    clearTimeout(uploadErrorTimer.current);
    uploadErrorTimer.current = setTimeout(() => setUploadError(null), 3000);
  }

  async function handleUploadFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['ttf', 'otf', 'woff'].includes(ext)) {
      showUploadError('Only TTF, OTF, WOFF files are supported.');
      return;
    }
    setUploadLoading(true);
    setUploadError(null);

    const store = useFontStore.getState();
    const hasFont = store.fontId && !store.isDemo;

    // 폰트가 이미 로드된 상태
    if (hasFont) {
      // Mix 모드 OFF + 레이어 1개 → 교체 (기존 "첫 폰트" 경로와 동일하게 처리)
      if (!store.mixMode && store.layers.length === 1) {
        setFontLoading(true);
        try {
          const data = await uploadFont(file);
          setFont(data);
          setFontBlobUrl(URL.createObjectURL(file));
          const glyphData = await getGlyphs(data.font_id);
          setGlyphs(glyphData.glyphs);
        } catch (err) {
          showUploadError(err.response?.data?.detail || 'Failed to upload font.');
          setFontLoading(false);
        } finally {
          setUploadLoading(false);
        }
        return;
      }

      // Mix 모드 OFF + 레이어 2개 이상, 또는 Mix 모드 ON → Mix 슬롯으로 추가
      const slotId = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (!store.mixMode) {
        setMixMode(true);
        // 기존 레이어들을 mainSlot(Font A)에 고정해서 기존 렌더링 보존
        const afterMix = useFontStore.getState();
        const mainSlot = afterMix.fontSlots[0];
        if (mainSlot) {
          for (const layer of afterMix.layers) {
            if (!layer.pinnedSlotId) setLayerPinnedSlot(layer.id, mainSlot.slotId);
          }
        }
      }
      if (useFontStore.getState().fontSlots.length >= useFontStore.getState().layers.length) {
        showUploadError('Add more layers to use additional fonts.');
        setUploadLoading(false);
        return;
      }
      addFontSlot({
        slotId, fontId: null, fontName: file.name,
        glyphs: [], centerlines: {}, loading: true, testing: false, error: null,
        unitsPerEm: 1000, ascender: null, descender: null, spaceAdvanceWidth: null,
      });
      try {
        const data = await uploadFont(file);
        const glyphData = await getGlyphs(data.font_id);
        const fontName = (data.family_name && data.family_name.trim() && data.family_name !== '.') ? data.family_name : file.name;
        updateFontSlot(slotId, {
          fontId: data.font_id, fontName,
          glyphs: glyphData.glyphs,
          unitsPerEm: data.units_per_em,
          ascender: data.ascender ?? null,
          descender: data.descender ?? null,
          spaceAdvanceWidth: data.space_advance_width ?? null,
          loading: false,
        });
        // 현재 활성 레이어를 새 슬롯에 고정
        setLayerPinnedSlot(useFontStore.getState().activeLayerId, slotId);
        // 현재 텍스트 기준으로 자동 추출
        const latestStore = useFontStore.getState();
        const allText = latestStore.layers.map(l => l.previewText ?? '').join('') || latestStore.previewText || '';
        const charSet = new Set([...allText].filter(c => c !== ' ' && c !== '\n'));
        if (charSet.size > 0) {
          const namesToExtract = glyphData.glyphs
            .filter(g => g.character && g.has_outline && charSet.has(g.character))
            .map(g => g.name);
          if (namesToExtract.length > 0) {
            updateFontSlot(slotId, { testing: true });
            await runExtraction(data.font_id, namesToExtract, (glyphName, clData) => {
              setSlotCenterline(slotId, glyphName, clData);
            });
            updateFontSlot(slotId, { testing: false });
          }
        }
      } catch (err) {
        updateFontSlot(slotId, { loading: false, error: err.response?.data?.detail || 'Upload failed.' });
        showUploadError(err.response?.data?.detail || 'Failed to upload font.');
      } finally {
        setUploadLoading(false);
      }
      return;
    }

    // 첫 폰트 업로드 → 기존 방식
    setFontLoading(true);
    try {
      const data = await uploadFont(file);
      setFont(data);
      setFontBlobUrl(URL.createObjectURL(file));
      const glyphData = await getGlyphs(data.font_id);
      setGlyphs(glyphData.glyphs);
    } catch (err) {
      showUploadError(err.response?.data?.detail || 'Failed to upload font.');
      setFontLoading(false);
    } finally {
      setUploadLoading(false);
    }
  }

  // Mix 모드에서 활성 레이어가 슬롯에 고정된 경우 해당 슬롯의 폰트명 표시
  const activeLayer = layers.find(l => l.id === activeLayerId);
  const displayFontName = activeLayer?.pinnedSlotId
    ? (fontSlots.find(s => s.slotId === activeLayer.pinnedSlotId)?.fontName ?? fontName)
    : fontName;

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

  // Reset local state when font changes.
  // Use store's current previewText instead of '' so Mix Off doesn't clear existing text
  // (setFont resets previewText to '' before fontId changes, so new uploads still clear correctly)
  useEffect(() => {
    setText(useFontStore.getState().previewText);
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
              className={`shrink-0 max-w-[100px] px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${chipInactive}`}
            >
              {fontLoading ? (
                <span className="block truncate">Loading{loadingDots}</span>
              ) : (
                <span className="block truncate">{displayFontName}</span>
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
              className={`w-[170px] shrink-0 px-3 py-1 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-[#FF5714] disabled:bg-gray-100 resize-none leading-relaxed scrollbar-hide ${!fontId ? 'pointer-events-none' : ''}`}
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
                <div className="flex flex-col items-center leading-tight">
                  <span className={labelCls}>Stroke</span>
                  <StrokeNumberInput
                    value={strokeParams.width}
                    onCommit={(v) => { stopAnimation(); setStrokeParams({ width: v }); }}
                  />
                </div>
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

            </>
          )}

          {/* FX Tab Controls */}
          {activeTab === 'fx' && <FXControls />}
        </div>
        <Divider />

        {/* ── Right section: Color pickers + Extract + Archive + Export ── */}
        <div className={`flex items-center gap-2 shrink-0`}>
          {/* C / S / BG color pickers */}
          {[
            { label: 'C', value: strokeParams.centerlineColor, onChange: (v) => setStrokeParams({ centerlineColor: v }), title: 'Centerline color' },
            { label: 'S', value: strokeParams.strokeColor, onChange: (v) => setStrokeParams({ strokeColor: v }), title: 'Stroke color' },
            { label: 'BG', value: bgColor, onChange: (v) => setBgColor(v), title: 'Background color' },
          ].map(({ label, value, onChange, title }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <div style={{ position: 'relative', width: 20, height: 20, borderRadius: '50%', border: '1px solid #d1d5db', flexShrink: 0, cursor: 'pointer', background: value }}>
                <input
                  type="color"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  title={title}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }}
                />
              </div>
              <span style={{ fontSize: 9, color: '#6b7280', lineHeight: 1 }}>{label}</span>
            </div>
          ))}
          <Divider />
        </div>
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
