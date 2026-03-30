import { extractCenterlines } from '../api/client';
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
  } = useFontStore();

  const isRunning = extraction.status === 'running';
  const glyphsWithOutline = glyphs.filter((g) => g.has_outline);
  const selectedCount = selectedGlyphs.size;
  const extractedCount = Object.keys(centerlines).length;

  let firstExtractedGlyph = null;

  // Expose handleExtract to parent via ref
  if (extractRef) extractRef.current = () => handleExtract(false);

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
      console.error('Extraction failed:', err);
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
