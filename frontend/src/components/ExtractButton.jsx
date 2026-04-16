import { extractCenterlines, runExtraction } from '../api/client';
import useFontStore from '../stores/fontStore';

export default function ExtractButton({ inline = false, extractRef }) {
  const {
    fontId,
    isDemo,
    glyphs,
    selectedGlyphs,
    centerlines,
    extraction,
    setExtractionStatus,
    setCenterline,
    addExtractionError,
    selectGlyph,
    fontSlots,
    updateFontSlot,
    setSlotCenterline,
  } = useFontStore();

  const isRunning = extraction.status === 'running';
  const glyphsWithOutline = glyphs.filter((g) => g.has_outline);
  const selectedCount = selectedGlyphs.size;
  const extractedCount = Object.keys(centerlines).length;

  let firstExtractedGlyph = null;

  // Expose handleExtract to parent via ref
  if (extractRef) extractRef.current = () => handleExtract(false);

  // Mix 슬롯 전체 추출
  async function extractAllSlots() {
    const store = useFontStore.getState();
    const allText = store.layers.map((l) => l.previewText ?? '').join('') || store.previewText || '';
    const charSet = new Set([...allText].filter((c) => c !== ' ' && c !== '\n'));
    if (charSet.size === 0) return;

    for (const slot of store.fontSlots) {
      if (!slot.fontId || slot.testing || slot.loading) continue;

      // 메인 폰트와 같은 슬롯이면 이미 추출된 centerlines 복사
      if (slot.fontId === store.fontId) {
        const mainCls = useFontStore.getState().centerlines;
        const missing = Object.keys(mainCls).filter((n) => !slot.centerlines[n]);
        if (missing.length > 0) {
          const patch = {};
          for (const n of missing) patch[n] = mainCls[n];
          updateFontSlot(slot.slotId, { centerlines: { ...slot.centerlines, ...patch } });
        }
        continue;
      }

      const latestSlot = useFontStore.getState().fontSlots.find((s) => s.slotId === slot.slotId) ?? slot;
      const namesToExtract = latestSlot.glyphs
        .filter((g) => g.character && g.has_outline && charSet.has(g.character) && !latestSlot.centerlines[g.name])
        .map((g) => g.name);
      if (namesToExtract.length === 0) continue;

      updateFontSlot(slot.slotId, { testing: true, error: null });
      try {
        await runExtraction(slot.fontId, namesToExtract, (glyphName, data) => {
          setSlotCenterline(slot.slotId, glyphName, data);
        });
      } catch {
        updateFontSlot(slot.slotId, { error: 'Extraction error — try re-uploading' });
      } finally {
        updateFontSlot(slot.slotId, { testing: false });
      }
    }
  }

  async function handleExtract(extractAll = false) {
    firstExtractedGlyph = null;
    if (!fontId || isRunning || isDemo) return;

    // Determine which glyphs to extract
    const toExtract = extractAll
      ? glyphsWithOutline.map((g) => g.name)
      : Array.from(selectedGlyphs);

    if (toExtract.length === 0) return;

    setExtractionStatus({
      status: 'running',
      current: 0,
      total: toExtract.length,
      currentGlyph: '',
      errors: [],
    });

    try {
      // Use glyph_names for selected, all: true for all glyphs
      const stream = await extractCenterlines(
        fontId,
        extractAll ? null : toExtract,
        extractAll
      );
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const json = line.slice(6);
          try {
            const event = JSON.parse(json);

            if (event.type === 'progress') {
              setExtractionStatus({
                current: event.index,
                currentGlyph: event.glyph,
              });
            } else if (event.type === 'complete') {
              setExtractionStatus({
                current: event.index,
                currentGlyph: event.glyph,
              });
              setCenterline(event.glyph, {
                paths: event.paths,
                view_box: event.view_box,
                glyph_height: event.glyph_height,
                glyph_width: event.glyph_width,
                advance_width: event.advance_width,
                raster_scale: event.raster_scale,
                bounds: event.bounds,
                outline: event.outline,
                ascender: event.ascender,
                descender: event.descender,
                font_height: event.font_height,
              });
              // Auto-select the first extracted glyph for preview
              if (!firstExtractedGlyph) {
                firstExtractedGlyph = event.glyph;
                selectGlyph(event.glyph);
              }
            } else if (event.type === 'skip') {
              setExtractionStatus({ current: event.index });
            } else if (event.type === 'error') {
              addExtractionError({ glyph: event.glyph, message: event.message });
            } else if (event.type === 'done') {
              setExtractionStatus({
                status: 'done',
                current: event.success,
                total: event.total,
              });
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setExtractionStatus({ status: 'idle' });
      console.error('Extraction failed:', err?.message ?? err);
    }

    // Mix 슬롯도 함께 추출
    if (useFontStore.getState().fontSlots.length > 0) {
      await extractAllSlots();
    }
  }

  if (inline) {
    const label = isRunning
      ? `${extraction.current}/${extraction.total}`
      : extractedCount > 0
        ? `Tested (${extractedCount})`
        : selectedCount > 0
          ? `Test (${selectedCount})`
          : `Test (0)`;

    return (
      <button
        onClick={() => handleExtract(false)}
        disabled={isRunning || selectedCount === 0 || isDemo}
        className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
          isRunning
            ? 'bg-[#FF5714]/80 text-white cursor-wait'
            : 'bg-[#FF5714] text-white hover:bg-[#FF5714]/80 disabled:opacity-40'
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Extract selected glyphs */}
      <button
        onClick={() => handleExtract(false)}
        disabled={isRunning || selectedCount === 0}
        className={`
          w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-colors
          ${isRunning
            ? 'bg-yellow-500 text-white cursor-wait'
            : 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed'
          }
        `}
      >
        {isRunning
          ? `Testing... (${extraction.current}/${extraction.total})`
          : `Test Selected (${selectedCount})`}
      </button>

      {/* Extract all glyphs */}
      <button
        onClick={() => handleExtract(true)}
        disabled={isRunning || glyphsWithOutline.length === 0}
        className={`
          w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors
          ${isRunning
            ? 'bg-gray-300 text-gray-500 cursor-wait'
            : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed'
          }
        `}
      >
        Test All ({glyphsWithOutline.length})
      </button>
    </div>
  );
}
