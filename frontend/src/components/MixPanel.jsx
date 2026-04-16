import { useRef } from 'react';
import useFontStore from '../stores/fontStore';
import { uploadFont, getGlyphs, runExtraction } from '../api/client';

export default function MixPanel({ onClose }) {
  const {
    fontSlots,
    layers,
    mixMode,
    setMixMode,
    addFontSlot,
    updateFontSlot,
    removeFontSlot,
    setSlotCenterline,
    rerollMix,
    previewText,
  } = useFontStore();

  const MAX_SLOTS = layers.length;

  const fileRefs = useRef({});

  async function handleUpload(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['ttf', 'otf', 'woff'].includes(ext)) return;
    const slotId = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    addFontSlot({
      slotId,
      fontId: null,
      fontName: file.name,
      glyphs: [],
      centerlines: {},
      unitsPerEm: 1000,
      ascender: null,
      descender: null,
      spaceAdvanceWidth: null,
      loading: true,
      testing: false,
      error: null,
    });
    try {
      const data = await uploadFont(file);
      const glyphData = await getGlyphs(data.font_id);
      updateFontSlot(slotId, {
        fontId: data.font_id,
        fontName: (data.family_name && data.family_name.trim() && data.family_name !== '.') ? data.family_name : file.name,
        glyphs: glyphData.glyphs,
        unitsPerEm: data.units_per_em,
        ascender: data.ascender ?? null,
        descender: data.descender ?? null,
        spaceAdvanceWidth: data.space_advance_width ?? null,
        loading: false,
      });

      // 메인 폰트가 없거나 데모 상태라면, 이 슬롯을 자동으로 메인으로 채택
      const store = useFontStore.getState();
      if ((store.isDemo || !store.fontId) && store.mainSlotId == null) {
        store.adoptFontAsMain({
          font_id: data.font_id,
          family_name: data.family_name,
          units_per_em: data.units_per_em,
          ascender: data.ascender,
          descender: data.descender,
          space_advance_width: data.space_advance_width,
          glyphs: glyphData.glyphs,
        });
        useFontStore.setState({ mainSlotId: slotId });
      }
    } catch (err) {
      updateFontSlot(slotId, { loading: false, error: err.response?.data?.detail || 'Upload failed' });
    }
  }

  async function handleTestSlot(slot) {
    if (!slot.fontId || slot.testing) return;

    // Always read the latest store state inside the async function
    let store = useFontStore.getState();

    // If this slot uses the main font, seed its centerlines from the main store first
    if (slot.fontId === store.fontId) {
      const mainCls = store.centerlines;
      const missing = Object.keys(mainCls).filter((n) => !slot.centerlines[n]);
      if (missing.length > 0) {
        const patch = {};
        for (const n of missing) patch[n] = mainCls[n];
        updateFontSlot(slot.slotId, { centerlines: { ...slot.centerlines, ...patch } });
        slot = useFontStore.getState().fontSlots.find((s) => s.slotId === slot.slotId) ?? slot;
      }
    }

    // Build charSet from ALL layer texts (not just root previewText)
    store = useFontStore.getState();
    const allText = store.layers.map((l) => l.previewText ?? '').join('') || store.previewText || '';
    const charSet = new Set([...allText].filter((c) => c !== ' ' && c !== '\n'));
    if (charSet.size === 0) return;

    const namesToExtract = [];
    for (const g of slot.glyphs) {
      if (g.character && g.has_outline && charSet.has(g.character) && !slot.centerlines[g.name]) {
        namesToExtract.push(g.name);
      }
    }
    if (namesToExtract.length === 0) return;
    updateFontSlot(slot.slotId, { testing: true, error: null });
    try {
      const result = await runExtraction(slot.fontId, namesToExtract, (glyphName, data) => {
        setSlotCenterline(slot.slotId, glyphName, data);
      });
      if (result.success === 0 && namesToExtract.length > 0) {
        updateFontSlot(slot.slotId, { error: 'Extraction failed — try re-uploading' });
      }
    } catch {
      updateFontSlot(slot.slotId, { error: 'Extraction error — try re-uploading' });
    } finally {
      updateFontSlot(slot.slotId, { testing: false });
    }
  }

  return (
    <div
      className="fixed top-12 right-4 z-50 w-[240px] pointer-events-auto select-none"
      style={{
        background: '#e5e7eb',
        borderRadius: 20,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <span className="text-[12px] text-gray-500 tracking-wide font-medium">
          Mix
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const next = !mixMode;
              setMixMode(next);
              if (next) fontSlots.forEach((s) => handleTestSlot(s));
            }}
            className={`px-2 h-6 text-[11px] rounded-full transition-colors cursor-pointer ${
              mixMode ? 'bg-[#FF5714] text-white' : 'bg-[#d1d1d1] text-gray-600 hover:bg-[#c0c0c0]'
            }`}
          >
            {mixMode ? 'On' : 'Off'}
          </button>
          <button
            onClick={() => { fontSlots.forEach((s) => handleTestSlot(s)); }}
            disabled={fontSlots.length === 0 || !previewText}
            className="px-2 h-6 text-[11px] rounded-full bg-[#d1d1d1] text-gray-600 hover:bg-[#c0c0c0] disabled:opacity-40 transition-colors cursor-pointer"
            title="Test all slots"
          >
            Test All
          </button>
          <button
            onClick={rerollMix}
            disabled={!mixMode}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-[#d1d1d1] text-gray-600 hover:bg-[#c0c0c0] disabled:opacity-40 text-[11px] leading-none transition-colors cursor-pointer"
            title="Reshuffle"
          >
            ↻
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 text-[11px] leading-none cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-gray-400/40 mb-1" />

      {/* Description */}
      <p className="px-3 pt-1 pb-2 text-[10px] text-gray-500 leading-snug">
        Upload up to {MAX_SLOTS} fonts (= number of layers). When Mix is On, each character is rendered with a random font's glyph.
      </p>

      {/* Slot rows */}
      <div className="pb-2 px-1.5">
        {Array.from({ length: MAX_SLOTS }, (_, i) => i).map((i) => {
          const slot = fontSlots[i];
          const hasSlot = !!slot;
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full group transition-colors"
              style={{ background: 'transparent' }}
            >
              {/* Slot number */}
              <span className="text-[11px] text-gray-400 w-3 shrink-0">{i + 1}</span>

              {hasSlot ? (
                <>
                  <span
                    className="text-[11px] flex-1 truncate min-w-0"
                    style={{ color: slot.error ? '#c0392b' : '#4b5563' }}
                  >
                    {slot.loading ? 'Loading…' : slot.error ? '⚠ ' + slot.error : slot.fontName}
                  </span>
                  <button
                    onClick={() => handleTestSlot(slot)}
                    disabled={!slot.fontId || slot.testing || !previewText}
                    className="px-2 h-5 text-[10px] rounded-full bg-[#FF5714] text-white hover:bg-[#FF5714]/80 disabled:opacity-30 cursor-pointer shrink-0 transition-colors"
                  >
                    {slot.testing ? '…' : 'Test'}
                  </button>
                  <button
                    onClick={() => removeFontSlot(slot.slotId)}
                    className="text-[10px] shrink-0 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer leading-none"
                    title="Remove slot"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <input
                    ref={(el) => (fileRefs.current[i] = el)}
                    type="file"
                    accept=".ttf,.otf,.woff"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files[0])}
                  />
                  <button
                    onClick={() => fileRefs.current[i]?.click()}
                    disabled={fontSlots.length >= MAX_SLOTS}
                    className="flex-1 text-[11px] text-gray-400 hover:text-gray-600 text-left truncate cursor-pointer transition-colors"
                  >
                    + Upload font
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
