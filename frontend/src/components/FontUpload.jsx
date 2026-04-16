import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFont, getGlyphs, runExtraction } from '../api/client';
import useFontStore from '../stores/fontStore';

export default function FontUpload() {
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const hideTimer = useRef(null);
  const dragCounter = useRef(0);
  const { fontId, isDemo, setFont, setGlyphs, setFontBlobUrl, setFontLoading,
    setMixMode, addFontSlot, updateFontSlot, setSlotCenterline, setLayerPinnedSlot } = useFontStore();

  // Clear timer on unmount
  useEffect(() => {
    return () => clearTimeout(hideTimer.current);
  }, []);

  // Window-level drag events to detect file dragging anywhere
  const handleWindowDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) {
      // Check if dragged items contain files
      if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setVisible(true);
        setDragging(true);
        clearTimeout(hideTimer.current);
      }
    }
  }, []);

  const handleWindowDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
      // If font is loaded, hide after leaving
      if (fontId) {
        setVisible(false);
      }
    }
  }, [fontId]);

  const handleWindowDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleWindowDrop = useCallback((e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [handleWindowDragEnter, handleWindowDragLeave, handleWindowDragOver, handleWindowDrop]);

  async function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['ttf', 'otf', 'woff'].includes(ext)) {
      setError('Only TTF, OTF, WOFF files are supported.');
      return;
    }

    setLoading(true);
    setError(null);

    const store = useFontStore.getState();
    const hasFont = store.fontId && !store.isDemo;

    // 폰트가 이미 로드된 상태 → 새 폰트를 Mix 슬롯으로 추가 (기존 레이어 보존)
    if (hasFont) {
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
      if (useFontStore.getState().fontSlots.length >= 3) {
        setError('Mix mode supports up to 3 fonts.');
        setLoading(false);
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
        setVisible(false);
      } catch (err) {
        updateFontSlot(slotId, { loading: false, error: err.response?.data?.detail || 'Upload failed.' });
        setError(err.response?.data?.detail || 'Failed to upload font.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // 첫 폰트 업로드 → 기존 방식
    setFontLoading(true);
    try {
      const data = await uploadFont(file);
      setFont(data);

      const fontBlobUrl = URL.createObjectURL(file);
      setFontBlobUrl(fontBlobUrl);

      const glyphData = await getGlyphs(data.font_id);
      setGlyphs(glyphData.glyphs);
      setVisible(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload font.');
      setFontLoading(false);
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleOverlayClick() {
    if (loading) return;
    if (!fontId || isDemo) {
      // No real font loaded (or demo mode): click to select file
      fileRef.current?.click();
    } else {
      // Real font loaded: click to dismiss
      setVisible(false);
    }
  }

  const isDemoClickable = isDemo && !loading;
  const isActive = visible || dragging;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={isActive ? handleOverlayClick : undefined}
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        transition-opacity duration-300
        ${isActive ? 'opacity-100 pointer-events-auto cursor-pointer' : 'opacity-0 pointer-events-none'}
      `}
    >
      {/* Subtle drag highlight border */}
      {dragging && (
        <div className="absolute inset-3 rounded-2xl border border-[#FF5714]/40 pointer-events-none transition-opacity duration-200" />
      )}

      {/* Content */}
      <div className="relative text-center z-10 select-none">
        <input
          ref={fileRef}
          type="file"
          accept=".ttf,.otf,.woff"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {loading ? (
          <div>
            <div className="animate-spin inline-block w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full mb-3" />
            <p className="text-sm font-light tracking-widest text-white/40">Analyzing...</p>
          </div>
        ) : (
          <div>
            <p className={`text-sm font-light tracking-widest mb-1.5 transition-colors duration-200 ${dragging ? 'text-[#FF5714]' : 'text-white/40'}`}>
              {fontId ? 'Upload font file' : 'Upload font file'}
            </p>
            <p className="text-xs tracking-widest text-white/20">[.ttf, .otf, .woff]</p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-red-400/70 text-xs">{error}</p>
        )}
      </div>

      {/* Demo mode: invisible hit area centered over the demo text.
          pointer-events-auto on a child works even when the parent has pointer-events-none,
          so this only intercepts clicks in the center — not the bottombar or header buttons. */}
      {isDemoClickable && (
        <div
          className="absolute cursor-pointer"
          style={{
            width: '70%',
            height: '45%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -60%)',
            pointerEvents: 'auto',
          }}
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
        />
      )}
    </div>
  );
}
