import { useState, useEffect, useRef, useCallback } from 'react';
import useFontStore from '../stores/fontStore';
import ExtractButton from './ExtractButton';
import ExportMenu from './ExportMenu';
import FXControls from './FXControls';
import { uploadFont, getGlyphs } from '../api/client';


function Divider({ className = 'mx-2' }) {
  return <div className={`w-px h-5 bg-gray-400/50 shrink-0 ${className}`} />;
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
    backgroundImageParams,
    previewFontSize,
    setPreviewFontSize,
    bgColor,
    setBgColor,
    setFont,
    setGlyphs,
    setFontBlobUrl,
  } = useFontStore();

  const uploadFileRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  async function handleUploadFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['ttf', 'otf', 'woff'].includes(ext)) {
      setUploadError('TTF, OTF, WOFF 파일만 지원합니다.');
      return;
    }
    setUploadLoading(true);
    setUploadError(null);
    try {
      const data = await uploadFont(file);
      setFont(data);
      setFontBlobUrl(URL.createObjectURL(file));
      const glyphData = await getGlyphs(data.font_id);
      setGlyphs(glyphData.glyphs);
    } catch (err) {
      setUploadError(err.response?.data?.detail || '폰트 업로드에 실패했습니다.');
    } finally {
      setUploadLoading(false);
    }
  }

  const bgImageActive = backgroundImageParams.enabled && !!backgroundImageParams.imageUrl;
  const chipInactive = 'bg-[#d9d9d9] text-gray-600 hover:bg-[#c9c9c9]';
  const labelCls = 'text-xs text-gray-500';

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
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-[40px] px-3 pointer-events-none">
      <div className={`pointer-events-auto rounded-[28px] px-4 py-2 h-[65px] flex items-center gap-0 shadow-lg w-[80%] ${
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
            <button
              onClick={() => uploadFileRef.current?.click()}
              disabled={uploadLoading}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors border border-transparent hover:border-dashed hover:border-gray-500 ${chipInactive}`}
            >
              {uploadLoading ? 'Loading...' : 'Upload Font'}
            </button>
          ) : (
            <button
              onClick={() => uploadFileRef.current?.click()}
              className={`shrink-0 max-w-[120px] px-3 py-1.5 text-xs font-medium rounded-full transition-colors overflow-hidden border border-transparent hover:border-dashed hover:border-gray-500 ${chipInactive}`}
              title="클릭하여 다른 폰트 업로드"
            >
              <span className="block truncate">{fontName}</span>
            </button>
          )}
          {uploadError && (
            <span className="ml-2 text-xs text-red-500">{uploadError}</span>
          )}

          <Divider />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                activeTab === 'basic' ? 'bg-[#0cd0fc] text-white' : chipInactive
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setActiveTab('fx')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                activeTab === 'fx' ? 'bg-[#0cd0fc] text-white' : chipInactive
              }`}
            >
              FX
            </button>
          </div>
        </div>

        {/* ── Center section: always visible, disabled without font ── */}
        <Divider />
        <div className={`flex items-center gap-2 flex-1 min-w-0 justify-start overflow-x-auto scrollbar-hide ${!fontId ? 'pointer-events-none' : ''}`}>

          {/* Basic Tab Controls */}
          {activeTab === 'basic' && (
            <>
              {/* Text Input */}
              <textarea
                rows={2}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={!fontId ? 'Upload a font first' : 'Type text'}
                disabled={!hasGlyphs}
                className="flex-1 min-w-[80px] px-3 py-1 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-[#0cd0fc] disabled:bg-gray-100 resize-none leading-relaxed"
              />

              <Divider className="mx-0" />

              {/* Show Flesh */}
              <button
                onClick={() => setShowFlesh(!showFlesh)}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  showFlesh ? 'bg-[#0cd0fc] text-white' : chipInactive
                }`}
              >
                Flesh
              </button>

              {/* Text Alignment */}
              <button
                onClick={cycleTextAlign}
                className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${chipInactive}`}
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

              {/* Text Size */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={labelCls}>Sz</span>
                <input
                  type="range"
                  min={0.25}
                  max={4.0}
                  step={0.05}
                  value={previewFontSize}
                  onChange={(e) => setPreviewFontSize(+e.target.value)}
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
              <div className="flex items-center gap-2 shrink-0">
                <span className={labelCls}>C</span>
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
              <div className="flex items-center gap-2 shrink-0">
                <span className={labelCls}>S</span>
                <input
                  type="color"
                  value={strokeParams.strokeColor}
                  onChange={(e) => setStrokeParams({ strokeColor: e.target.value })}
                  className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer"
                  style={{ padding: 0 }}
                  title="Stroke 색상"
                />
              </div>

              {/* Background Color */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={labelCls}>BG</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer"
                  style={{ padding: 0 }}
                  title="배경 색상"
                />
              </div>
            </>
          )}

          {/* FX Tab Controls */}
          {activeTab === 'fx' && <FXControls />}
        </div>
        <Divider />

        {/* ── Right section: Extract + Export ── */}
        <div className={`flex items-center gap-2 shrink-0 ${!fontId ? 'pointer-events-none' : ''}`}>
          <ExtractButton inline />
          <ExportMenu />
        </div>
      </div>
    </div>
  );
}
