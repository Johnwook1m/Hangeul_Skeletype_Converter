import { create } from 'zustand';

const useFontStore = create((set) => ({
  // Font session
  fontId: null,
  fontName: '',
  glyphCount: 0,
  unitsPerEm: 1000,
  ascender: null,
  descender: null,
  isDemo: false,

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
    strokeColor: '#FF5714',
    centerlineColor: '#1a1a1a',
    scaleX: 1.0,
    scaleY: 1.0,
  },

  // Connection parameters (glyph-to-glyph linking)
  connectionParams: {
    enabled: false,
    shape: 'curve',       // 'line' | 'curve' | 'wave'
    color: '#FF5714',     // connection line color
    tension: 0.5,         // curve bend amount (0=straight, 1=very curved)
    waveAmplitude: 15,    // wave height
    waveFrequency: 3,     // wave count
    maxDistance: 500,      // skip connection if endpoints further than this
    maxConnections: 2,    // max connections per glyph pair
  },

  // Branch parameters (endpoint branching / fractal tree)
  branchParams: {
    enabled: false,
    angle: 90,           // branch spread angle (degrees, 0~90)
    count: 2,            // branches per endpoint (1~5)
    length: 105,         // first branch length (display units)
    depth: 1,            // recursion depth (1~4)
    color: '#FF5714',    // branch color
  },

  // Decorator parameters (shapes placed along centerline paths)
  decoratorParams: {
    enabled: false,
    shape: 'circle',     // 'circle' | 'square' | 'diamond' | 'triangle'
    size: 40,            // shape size in display units (5~100)
    count: 6,            // shapes per path (1~30)
    position: 0.5,       // offset along path (0~1)
    spacing: 'endpoints', // 'even' | 'endpoints' | 'random'
    filled: true,        // filled or outline-only
    color: '#000000',    // shape color
  },

  // Offset Path parameters (parallel paths along centerlines)
  offsetPathParams: {
    enabled: false,
    offset: 10,          // offset distance in pixel space (1~100)
    count: 1,            // number of offset repetitions (1~5)
    weight: 10,          // stroke weight of offset ring (independent of Basic weight)
    corner: 'round',     // 'round' | 'sharp' — end cap / corner style
    color: '#FF5714',    // offset path color
  },

  // Slant parameters (skew/italic transform)
  slantParams: {
    enabled: false,
    angle: -15,          // degrees: negative = lean right (italic), positive = lean left
  },

  // Background image parameters
  backgroundImageParams: {
    enabled: false,
    imageUrl: null,      // base64 data URL of uploaded image
    imageName: null,     // original file name for display
    opacity: 1.0,        // 0~1
    scale: 1.0,          // image scale multiplier (0.1~3.0)
    fit: 'cover',        // 'cover' | 'contain' | 'fill'
    blendMode: 'normal', // CSS mix-blend-mode value
  },

  // Display options
  theme: 'light', // 'dark' | 'light'
  bgColor: '#ffffff', // Custom background color
  textAlign: 'center', // 'center' | 'left' | 'right'
  showFlesh: false, // Show original glyph outline behind skeleton
  glyphSize: 100, // Glyph size percentage (50-500) — viewport zoom
  previewFontSize: 1.0, // Text size multiplier (0.25~4.0) — chars per row
  spaceAdvanceWidth: null, // Space glyph advance width in font units (from uploaded font)
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
      spaceAdvanceWidth: data.space_advance_width ?? null,
      isDemo: false,
      glyphs: [],
      centerlines: {},
      selectedGlyph: null,
      selectedGlyphs: new Set(),
      previewText: '',
      extraction: { status: 'idle', current: 0, total: 0, currentGlyph: '', errors: [] },
    }),

  setIsDemo: (v) => set({ isDemo: v }),

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

  setConnectionParams: (params) =>
    set((state) => ({
      connectionParams: { ...state.connectionParams, ...params },
    })),

  toggleConnection: () =>
    set((state) => ({
      connectionParams: {
        ...state.connectionParams,
        enabled: !state.connectionParams.enabled,
      },
    })),

  resetConnection: () =>
    set({
      connectionParams: {
        enabled: false,
        shape: 'curve',
        color: '#FF5714',
        tension: 0.5,
        waveAmplitude: 15,
        waveFrequency: 3,
        maxDistance: 500,
        maxConnections: 2,
      },
    }),

  setBranchParams: (params) =>
    set((state) => ({
      branchParams: { ...state.branchParams, ...params },
    })),

  toggleBranch: () =>
    set((state) => ({
      branchParams: {
        ...state.branchParams,
        enabled: !state.branchParams.enabled,
      },
    })),

  resetBranch: () =>
    set({
      branchParams: {
        enabled: false,
        angle: 90,
        count: 2,
        length: 105,
        depth: 1,
        color: '#FF5714',
      },
    }),

  setDecoratorParams: (params) =>
    set((state) => ({
      decoratorParams: { ...state.decoratorParams, ...params },
    })),

  toggleDecorator: () =>
    set((state) => ({
      decoratorParams: {
        ...state.decoratorParams,
        enabled: !state.decoratorParams.enabled,
      },
    })),

  resetDecorator: () =>
    set({
      decoratorParams: {
        enabled: false,
        shape: 'circle',
        size: 30,
        count: 6,
        position: 0.5,
        spacing: 'endpoints',
        filled: true,
        color: '#000000',
      },
    }),

  setOffsetPathParams: (params) =>
    set((state) => ({
      offsetPathParams: { ...state.offsetPathParams, ...params },
    })),

  toggleOffsetPath: () =>
    set((state) => ({
      offsetPathParams: {
        ...state.offsetPathParams,
        enabled: !state.offsetPathParams.enabled,
      },
    })),

  resetOffsetPath: () =>
    set({
      offsetPathParams: {
        enabled: false,
        offset: 10,
        count: 1,
        weight: 10,
        corner: 'round',
        color: '#FF5714',
      },
    }),

  setSlantParams: (params) =>
    set((state) => ({ slantParams: { ...state.slantParams, ...params } })),

  toggleSlant: () =>
    set((state) => ({
      slantParams: { ...state.slantParams, enabled: !state.slantParams.enabled },
    })),

  resetSlant: () =>
    set({ slantParams: { enabled: false, angle: -15 } }),

  setBackgroundImageParams: (params) =>
    set((state) => ({
      backgroundImageParams: { ...state.backgroundImageParams, ...params },
    })),

  toggleBackgroundImage: () =>
    set((state) => ({
      backgroundImageParams: {
        ...state.backgroundImageParams,
        enabled: !state.backgroundImageParams.enabled,
      },
    })),

  resetBackgroundImage: () =>
    set({
      backgroundImageParams: {
        enabled: false,
        imageUrl: null,
        imageName: null,
        opacity: 1.0,
        fit: 'cover',
        blendMode: 'normal',
      },
    }),

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      return {
        theme: newTheme,
        bgColor: newTheme === 'dark' ? '#1a1a1a' : '#ffffff',
      };
    }),

  cycleTextAlign: () =>
    set((state) => {
      const order = ['center', 'left', 'right'];
      const idx = order.indexOf(state.textAlign);
      return { textAlign: order[(idx + 1) % 3] };
    }),

  setShowFlesh: (show) => set({ showFlesh: show }),
  setGlyphSize: (size) => set({ glyphSize: size }),
  setPreviewFontSize: (size) => set({ previewFontSize: size }),
  setBgColor: (color) => set({ bgColor: color }),
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
        isDemo: false,
        glyphs: [],
        selectedGlyph: null,
        selectedGlyphs: new Set(),
        previewText: '',
        centerlines: {},
        strokeParams: {
          width: 80,
          cap: 'round',
          join: 'round',
          strokeColor: '#FF5714',
          centerlineColor: '#1a1a1a',
          scaleX: 1.0,
          scaleY: 1.0,
        },
        connectionParams: {
          enabled: false,
          shape: 'curve',
          color: '#FF5714',
          tension: 0.5,
          waveAmplitude: 15,
          waveFrequency: 3,
          maxDistance: 500,
          maxConnections: 2,
        },
        branchParams: {
          enabled: false,
          angle: 90,
          count: 2,
          length: 105,
          depth: 1,
          color: '#FF5714',
        },
        decoratorParams: {
          enabled: false,
          shape: 'circle',
          size: 30,
          count: 6,
          position: 0.5,
          spacing: 'endpoints',
          filled: true,
          color: '#000000',
        },
        offsetPathParams: {
          enabled: false,
          offset: 10,
          count: 1,
          weight: 10,
          corner: 'round',
          color: '#FF5714',
        },
        slantParams: {
          enabled: false,
          angle: -15,
        },
        backgroundImageParams: {
          enabled: false,
          imageUrl: null,
          imageName: null,
          opacity: 1.0,
          scale: 1.0,
          fit: 'cover',
          blendMode: 'normal',
        },
        extraction: { status: 'idle', current: 0, total: 0, currentGlyph: '', errors: [] },
        theme: 'light',
        bgColor: '#ffffff',
        textAlign: 'center',
        showFlesh: false,
        glyphSize: 100,
        previewFontSize: 1.0,
        spaceAdvanceWidth: null,
        fontBlobUrl: null,
      };
    }),
}));

export default useFontStore;
