import useFontStore from '../stores/fontStore';
import { getGlyphPreviewUrl } from '../api/client';

export default function GlyphGrid({ compact = false }) {
  const {
    fontId,
    glyphs,
    selectedGlyph,
    selectedGlyphs,
    selectGlyph,
    toggleGlyphSelection,
    selectAllGlyphs,
    clearGlyphSelection,
    centerlines,
  } = useFontStore();

  // Filter to glyphs with outlines only
  const visibleGlyphs = glyphs.filter((g) => g.has_outline);
  const selectedCount = selectedGlyphs.size;
  const allSelected = selectedCount === visibleGlyphs.length && visibleGlyphs.length > 0;

  function handleGlyphClick(name, e) {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      toggleGlyphSelection(name);
    } else {
      selectGlyph(name);
    }
  }

  if (visibleGlyphs.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        글리프가 없습니다.
      </div>
    );
  }

  const gridCols = compact ? 'grid-cols-5' : 'grid-cols-6';

  return (
    <div className="flex flex-col h-full">
      {/* Selection controls */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 bg-gray-50 shrink-0">
        <span className="text-xs text-gray-500">
          {selectedCount > 0 ? `${selectedCount}개 선택` : `${visibleGlyphs.length.toLocaleString()}개`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={allSelected ? clearGlyphSelection : selectAllGlyphs}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            {allSelected ? '해제' : '전체'}
          </button>
          {selectedCount > 0 && !allSelected && (
            <button
              onClick={clearGlyphSelection}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              해제
            </button>
          )}
        </div>
      </div>

      {/* Glyph grid */}
      <div className={`grid ${gridCols} gap-0.5 overflow-y-auto flex-1 p-1`}>
        {visibleGlyphs.map((glyph) => {
          const hasCenterline = glyph.name in centerlines;
          const isSelected = selectedGlyph === glyph.name;
          const isChecked = selectedGlyphs.has(glyph.name);

          return (
            <button
              key={glyph.name}
              onClick={(e) => handleGlyphClick(glyph.name, e)}
              title={`${glyph.name}${glyph.character ? ` (${glyph.character})` : ''}`}
              className={`
                relative aspect-square flex items-center justify-center
                rounded text-xs transition-all
                ${isSelected
                  ? 'bg-blue-100 ring-2 ring-blue-400'
                  : isChecked
                    ? 'bg-orange-100'
                    : hasCenterline
                      ? 'bg-green-50'
                      : 'bg-white hover:bg-gray-50'
                }
              `}
            >
              {/* Checkbox indicator */}
              {isChecked && (
                <span className="absolute top-0.5 left-0.5 w-2 h-2 bg-orange-400 rounded-full" />
              )}

              {glyph.character ? (
                <span className={compact ? 'text-base' : 'text-lg'}>{glyph.character}</span>
              ) : (
                <img
                  src={getGlyphPreviewUrl(fontId, glyph.name)}
                  alt={glyph.name}
                  className="w-6 h-6 object-contain"
                  loading="lazy"
                />
              )}

              {hasCenterline && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
