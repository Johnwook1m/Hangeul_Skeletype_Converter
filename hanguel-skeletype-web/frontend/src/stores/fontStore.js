import { create } from 'zustand';

const useFontStore = create((set) => ({
  // Font session
  fontId: null,
  fontName: '',
  glyphCount: 0,
  unitsPerEm: 1000,
  ascender: null,
  descender: null,

  // Glyph data
  glyphs: [],
  selectedGlyph: null,
  selectedGlyphs: new Set(), // Multi-select for extraction
  previewText: '', // Text to preview (full string)

  // Centerline data: { glyph_name: { paths, view_box, width, height } }
  centerlines: {},

  // Stroke parameters
  strokeParams: {
    width: 80,
    cap: 'round',
    join: 'round',
    strokeColor: '#0cd0fc',
    centerlineColor: '#0cd0fc',
  },

  // Display options
  showFlesh: true, // Show original glyph outline behind skeleton
  glyphSize: 100, // Glyph size percentage (50-200)
  fontBlobUrl: null, // Blob URL for loading original font in preview

  // Extraction state
  extraction: {
    status: 'idle',
    current: 0,
    total: 0,
    currentGlyph: '',
    errors: [],
  },

  // Actions
  setFont: (data) =>
    set({
      fontId: data.font_id,
      fontName: data.family_name,
      glyphCount: data.glyph_count,
      unitsPerEm: data.units_per_em,
      ascender: data.ascender ?? null,
      descender: data.descender ?? null,
      glyphs: [],
      centerlines: {},
      selectedGlyph: null,
      selectedGlyphs: new Set(),
      previewText: '',
      extraction: { status: 'idle', current: 0, total: 0, currentGlyph: '', errors: [] },
    }),

  setGlyphs: (glyphs) => set({ glyphs }),

  selectGlyph: (name) => set({ selectedGlyph: name }),

  setPreviewText: (text) => set({ previewText: text }),

  toggleGlyphSelection: (name) =>
    set((state) => {
      const newSet = new Set(state.selectedGlyphs);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return { selectedGlyphs: newSet };
    }),

  selectAllGlyphs: () =>
    set((state) => ({
      selectedGlyphs: new Set(
        state.glyphs.filter((g) => g.has_outline).map((g) => g.name)
      ),
    })),

  clearGlyphSelection: () => set({ selectedGlyphs: new Set() }),

  // Select glyphs by text input - returns { found, notFound } for feedback
  selectGlyphsByText: (text) => {
    let found = [];
    let notFound = [];

    set((state) => {
      // Build character -> glyph name map
      const charToGlyph = new Map();
      for (const g of state.glyphs) {
        if (g.character && g.has_outline) {
          charToGlyph.set(g.character, g.name);
        }
      }

      // Find glyphs for each unique character in text
      const uniqueChars = [...new Set(text)];
      const newSelection = new Set(state.selectedGlyphs);

      for (const char of uniqueChars) {
        if (char.trim() === '') continue; // Skip whitespace
        const glyphName = charToGlyph.get(char);
        if (glyphName) {
          newSelection.add(glyphName);
          found.push(char);
        } else {
          notFound.push(char);
        }
      }

      return { selectedGlyphs: newSelection };
    });

    return { found, notFound };
  },

  setStrokeParams: (params) =>
    set((state) => ({
      strokeParams: { ...state.strokeParams, ...params },
    })),

  setShowFlesh: (show) => set({ showFlesh: show }),
  setGlyphSize: (size) => set({ glyphSize: size }),
  setFontBlobUrl: (url) => set({ fontBlobUrl: url }),

  setCenterline: (name, data) =>
    set((state) => ({
      centerlines: { ...state.centerlines, [name]: data },
    })),

  setExtractionStatus: (update) =>
    set((state) => ({
      extraction: { ...state.extraction, ...update },
    })),

  addExtractionError: (error) =>
    set((state) => ({
      extraction: {
        ...state.extraction,
        errors: [...state.extraction.errors, error],
      },
    })),

  reset: () =>
    set((state) => {
      // Revoke old blob URL to free memory
      if (state.fontBlobUrl) {
        URL.revokeObjectURL(state.fontBlobUrl);
      }
      return {
        fontId: null,
        fontName: '',
        glyphCount: 0,
        ascender: null,
        descender: null,
        glyphs: [],
        selectedGlyph: null,
        selectedGlyphs: new Set(),
        previewText: '',
        centerlines: {},
        extraction: { status: 'idle', current: 0, total: 0, currentGlyph: '', errors: [] },
        showFlesh: true,
        glyphSize: 100,
        fontBlobUrl: null,
      };
    }),
}));

export default useFontStore;
