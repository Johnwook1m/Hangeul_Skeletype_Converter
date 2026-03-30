import { create } from 'zustand';

// ─── 레이어 색상 팔레트 (새 레이어 자동 색상) ────────────────────────────────
const LAYER_COLORS = ['#FF5714', '#1a1a1a', '#ffffff', '#4A90D9', '#7ED321', '#BD10E0'];

// ─── 레이어별 기본값 팩토리 ────────────────────────────────────────────────────
const defaultLayerStrokeParams = (strokeColor = '#FF5714') => ({
  width: 80,
  cap: 'round',
  join: 'round',
  strokeColor,
  centerlineColor: '#1a1a1a',
  scaleX: 1.0,
  scaleY: 1.0,
  scaleXVisible: true,
  scaleYVisible: true,
});

const defaultConnectionParams = () => ({
  enabled: false,
  visible: true,
  shape: 'curve',
  color: '#FF5714',
  tension: 0.5,
  waveAmplitude: 15,
  waveFrequency: 3,
  maxDistance: 500,
  maxConnections: 2,
});

const defaultBranchParams = () => ({
  enabled: false,
  visible: true,
  angle: 90,
  count: 2,
  length: 105,
  depth: 1,
  color: '#FF5714',
});

const defaultDecoratorParams = () => ({
  enabled: false,
  visible: true,
  shape: 'circle',
  size: 40,
  count: 6,
  position: 0.5,
  spacing: 'endpoints',
  filled: true,
  color: '#000000',
});

const defaultOffsetPathParams = () => ({
  enabled: false,
  visible: true,
  offset: 10,
  count: 1,
  weight: 10,
  corner: 'round',
  color: '#FF5714',
});

const defaultSlantParams = () => ({
  enabled: false,
  visible: true,
  angle: -15,
});

// 레이어 객체 생성
const createLayer = (id, name, colorIndex = 0) => ({
  id,
  name,
  visible: true,
  strokeParams: defaultLayerStrokeParams(LAYER_COLORS[colorIndex % LAYER_COLORS.length]),
  connectionParams: defaultConnectionParams(),
  branchParams: defaultBranchParams(),
  decoratorParams: defaultDecoratorParams(),
  offsetPathParams: defaultOffsetPathParams(),
  slantParams: defaultSlantParams(),
  effectOrder: [],  // 효과 적용 순서 추적 (effectKey 배열)
});

// effectOrder 업데이트 헬퍼: 켜면 추가, 끄면 제거
const updateEffectOrder = (order = [], effectKey, enabling) => {
  if (enabling) {
    return order.includes(effectKey) ? order : [...order, effectKey];
  }
  return order.filter(k => k !== effectKey);
};

// 레이어의 params를 top-level state로 복사 (active layer 전환 시 사용)
const syncLayerToTopLevel = (layer, currentStrokeParams) => ({
  strokeParams: {
    ...currentStrokeParams,
    ...layer.strokeParams,           // 레이어별 모든 params 덮어쓰기 (scaleX/scaleY 포함)
  },
  connectionParams: { ...layer.connectionParams },
  branchParams: { ...layer.branchParams },
  decoratorParams: { ...layer.decoratorParams },
  offsetPathParams: { ...layer.offsetPathParams },
  slantParams: { ...layer.slantParams },
});

// ─── 스토어 ────────────────────────────────────────────────────────────────────
const useFontStore = create((set) => ({
  // Font session
  fontId: null,
  fontName: '',
  glyphCount: 0,
  unitsPerEm: 1000,
  ascender: null,
  descender: null,
  isDemo: false,
  fontLoading: false,

  // Glyph data
  glyphs: [],
  selectedGlyph: null,
  selectedGlyphs: new Set(),
  previewText: '',

  // Centerline data: { glyph_name: { paths, view_box, width, height } }
  centerlines: {},

  // ─── 세션 공유 stroke params (scaleX/scaleY 포함) ─────────────────────────
  // top-level strokeParams는 항상 active layer와 동기화됨
  strokeParams: {
    width: 80,
    cap: 'round',
    join: 'round',
    strokeColor: '#FF5714',
    centerlineColor: '#1a1a1a',
    scaleX: 1.0,   // 세션 공유
    scaleY: 1.0,   // 세션 공유
  },

  // top-level 이펙트 params (항상 active layer와 동기화)
  connectionParams: defaultConnectionParams(),
  branchParams: defaultBranchParams(),
  decoratorParams: defaultDecoratorParams(),
  offsetPathParams: defaultOffsetPathParams(),
  slantParams: defaultSlantParams(),

  // Background image (세션 공유, 레이어와 무관)
  backgroundImageParams: {
    enabled: false,
    imageUrl: null,
    imageName: null,
    opacity: 1.0,
    scale: 1.0,
    fit: 'contain',
    blendMode: 'normal',
  },

  // ─── 레이어 상태 ────────────────────────────────────────────────────────────
  layers: [createLayer('layer-1', 'Layer 1', 0)],
  activeLayerId: 'layer-1',

  // Display options
  theme: 'light',
  bgColor: '#ffffff',
  textAlign: 'center',
  showFlesh: false,
  glyphSize: 100,
  previewFontSize: 1.0,
  spaceAdvanceWidth: null,
  fontBlobUrl: null,

  // Extraction state
  extraction: {
    status: 'idle',
    current: 0,
    total: 0,
    currentGlyph: '',
    errors: [],
  },

  // ─── Actions ────────────────────────────────────────────────────────────────

  setFont: (data) =>
    set((state) => {
      if (state.fontBlobUrl) URL.revokeObjectURL(state.fontBlobUrl);
      const initialLayer = createLayer('layer-1', 'Layer 1', 0);
      return {
        fontId: data.font_id,
        fontName: data.family_name,
        glyphCount: data.glyph_count,
        unitsPerEm: data.units_per_em,
        ascender: data.ascender ?? null,
        descender: data.descender ?? null,
        spaceAdvanceWidth: data.space_advance_width ?? null,
        isDemo: false,
        fontLoading: true,
        glyphs: [],
        centerlines: {},
        selectedGlyph: null,
        selectedGlyphs: new Set(),
        previewText: '',
        extraction: { status: 'idle', current: 0, total: 0, currentGlyph: '', errors: [] },
        strokeParams: { width: 80, cap: 'round', join: 'round', strokeColor: '#FF5714', centerlineColor: '#1a1a1a', scaleX: 1.0, scaleY: 1.0 },
        connectionParams: defaultConnectionParams(),
        branchParams: defaultBranchParams(),
        decoratorParams: defaultDecoratorParams(),
        offsetPathParams: defaultOffsetPathParams(),
        slantParams: defaultSlantParams(),
        backgroundImageParams: { enabled: false, imageUrl: null, imageName: null, opacity: 1.0, scale: 1.0, fit: 'contain', blendMode: 'normal' },
        layers: [initialLayer],
        activeLayerId: 'layer-1',
        theme: 'light',
        bgColor: '#ffffff',
        showFlesh: false,
        textAlign: 'center',
        previewFontSize: 1.0,
        glyphSize: 80,
        fontBlobUrl: null,
      };
    }),

  setIsDemo: (v) => set({ isDemo: v }),
  setGlyphs: (glyphs) => set({ glyphs, fontLoading: false }),
  setFontLoading: (v) => set({ fontLoading: v }),
  selectGlyph: (name) => set({ selectedGlyph: name }),
  setPreviewText: (text) => set({ previewText: text }),

  toggleGlyphSelection: (name) =>
    set((state) => {
      const newSet = new Set(state.selectedGlyphs);
      if (newSet.has(name)) newSet.delete(name);
      else newSet.add(name);
      return { selectedGlyphs: newSet };
    }),

  selectAllGlyphs: () =>
    set((state) => ({
      selectedGlyphs: new Set(state.glyphs.filter((g) => g.has_outline).map((g) => g.name)),
    })),

  clearGlyphSelection: () => set({ selectedGlyphs: new Set() }),

  selectGlyphsByText: (text) => {
    let found = [];
    let notFound = [];
    set((state) => {
      const charToGlyph = new Map();
      for (const g of state.glyphs) {
        if (g.character && g.has_outline) charToGlyph.set(g.character, g.name);
      }
      const uniqueChars = [...new Set(text)];
      const newSelection = new Set(state.selectedGlyphs);
      for (const char of uniqueChars) {
        if (char.trim() === '') continue;
        const glyphName = charToGlyph.get(char);
        if (glyphName) { newSelection.add(glyphName); found.push(char); }
        else notFound.push(char);
      }
      return { selectedGlyphs: newSelection };
    });
    return { found, notFound };
  },

  // ─── Stroke params ──────────────────────────────────────────────────────────
  // 모든 params가 active layer에도 동기화됨 (scaleX/scaleY 포함)
  setStrokeParams: (params) =>
    set((state) => {
      const newStrokeParams = { ...state.strokeParams, ...params };
      const layerKeys = ['width', 'cap', 'join', 'strokeColor', 'centerlineColor', 'scaleX', 'scaleY'];
      const layerUpdate = Object.fromEntries(
        Object.entries(params).filter(([k]) => layerKeys.includes(k))
      );
      const newLayers = Object.keys(layerUpdate).length > 0
        ? state.layers.map(l =>
            l.id === state.activeLayerId
              ? { ...l, strokeParams: { ...l.strokeParams, ...layerUpdate } }
              : l
          )
        : state.layers;
      return { strokeParams: newStrokeParams, layers: newLayers };
    }),

  // ─── Connection params ───────────────────────────────────────────────────────
  setConnectionParams: (params) =>
    set((state) => {
      const newParams = { ...state.connectionParams, ...params };
      return {
        connectionParams: newParams,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId ? { ...l, connectionParams: newParams } : l
        ),
      };
    }),

  toggleConnection: () =>
    set((state) => {
      const enabling = !state.connectionParams.enabled;
      const newParams = { ...state.connectionParams, enabled: enabling };
      return {
        connectionParams: newParams,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId
            ? { ...l, connectionParams: newParams, effectOrder: updateEffectOrder(l.effectOrder, 'connectionParams', enabling) }
            : l
        ),
      };
    }),

  resetConnection: () =>
    set((state) => {
      const defaults = defaultConnectionParams();
      return {
        connectionParams: defaults,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId ? { ...l, connectionParams: defaults } : l
        ),
      };
    }),

  // ─── Branch params ───────────────────────────────────────────────────────────
  setBranchParams: (params) =>
    set((state) => {
      const newParams = { ...state.branchParams, ...params };
      return {
        branchParams: newParams,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId ? { ...l, branchParams: newParams } : l
        ),
      };
    }),

  toggleBranch: () =>
    set((state) => {
      const enabling = !state.branchParams.enabled;
      const newParams = { ...state.branchParams, enabled: enabling };
      return {
        branchParams: newParams,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId
            ? { ...l, branchParams: newParams, effectOrder: updateEffectOrder(l.effectOrder, 'branchParams', enabling) }
            : l
        ),
      };
    }),

  resetBranch: () =>
    set((state) => {
      const defaults = defaultBranchParams();
      return {
        branchParams: defaults,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId ? { ...l, branchParams: defaults } : l
        ),
      };
    }),

  // ─── Decorator params ────────────────────────────────────────────────────────
  setDecoratorParams: (params) =>
    set((state) => {
      const newParams = { ...state.decoratorParams, ...params };
      return {
        decoratorParams: newParams,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId ? { ...l, decoratorParams: newParams } : l
        ),
      };
    }),

  toggleDecorator: () =>
    set((state) => {
      const enabling = !state.decoratorParams.enabled;
      const newParams = { ...state.decoratorParams, enabled: enabling };
      return {
        decoratorParams: newParams,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId
            ? { ...l, decoratorParams: newParams, effectOrder: updateEffectOrder(l.effectOrder, 'decoratorParams', enabling) }
            : l
        ),
      };
    }),

  resetDecorator: () =>
    set((state) => {
      const defaults = { ...defaultDecoratorParams(), size: 30 }; // 기존 reset 동작 유지
      return {
        decoratorParams: defaults,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId ? { ...l, decoratorParams: defaults } : l
        ),
      };
    }),

  // ─── Offset path params ──────────────────────────────────────────────────────
  setOffsetPathParams: (params) =>
    set((state) => {
      const newParams = { ...state.offsetPathParams, ...params };
      return {
        offsetPathParams: newParams,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId ? { ...l, offsetPathParams: newParams } : l
        ),
      };
    }),

  toggleOffsetPath: () =>
    set((state) => {
      const enabling = !state.offsetPathParams.enabled;
      const newParams = { ...state.offsetPathParams, enabled: enabling };
      return {
        offsetPathParams: newParams,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId
            ? { ...l, offsetPathParams: newParams, effectOrder: updateEffectOrder(l.effectOrder, 'offsetPathParams', enabling) }
            : l
        ),
      };
    }),

  resetOffsetPath: () =>
    set((state) => {
      const defaults = defaultOffsetPathParams();
      return {
        offsetPathParams: defaults,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId ? { ...l, offsetPathParams: defaults } : l
        ),
      };
    }),

  // ─── Slant params ────────────────────────────────────────────────────────────
  setSlantParams: (params) =>
    set((state) => {
      const newParams = { ...state.slantParams, ...params };
      return {
        slantParams: newParams,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId ? { ...l, slantParams: newParams } : l
        ),
      };
    }),

  toggleSlant: () =>
    set((state) => {
      const enabling = !state.slantParams.enabled;
      const newParams = { ...state.slantParams, enabled: enabling };
      return {
        slantParams: newParams,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId
            ? { ...l, slantParams: newParams, effectOrder: updateEffectOrder(l.effectOrder, 'slantParams', enabling) }
            : l
        ),
      };
    }),

  resetSlant: () =>
    set((state) => {
      const defaults = defaultSlantParams();
      return {
        slantParams: defaults,
        layers: state.layers.map(l =>
          l.id === state.activeLayerId ? { ...l, slantParams: defaults } : l
        ),
      };
    }),

  // ─── Background image (세션 공유) ────────────────────────────────────────────
  setBackgroundImageParams: (params) =>
    set((state) => ({
      backgroundImageParams: { ...state.backgroundImageParams, ...params },
    })),

  toggleBackgroundImage: () =>
    set((state) => ({
      backgroundImageParams: { ...state.backgroundImageParams, enabled: !state.backgroundImageParams.enabled },
    })),

  resetBackgroundImage: () =>
    set({
      backgroundImageParams: { enabled: false, imageUrl: null, imageName: null, opacity: 1.0, fit: 'contain', blendMode: 'normal' },
    }),

  // ─── 레이어 관리 ────────────────────────────────────────────────────────────
  addLayer: () =>
    set((state) => {
      const colorIndex = state.layers.length;
      const newId = `layer-${Date.now()}`;
      const newName = `Layer ${state.layers.length + 1}`;
      const newLayer = createLayer(newId, newName, colorIndex);
      return {
        layers: [...state.layers, newLayer],
        // 새 레이어를 active로 설정하고 top-level 동기화
        activeLayerId: newId,
        ...syncLayerToTopLevel(newLayer, state.strokeParams),
      };
    }),

  removeLayer: (id) =>
    set((state) => {
      if (state.layers.length <= 1) return {}; // 최소 1개 유지
      const newLayers = state.layers.filter(l => l.id !== id);
      // 삭제한 레이어가 active였으면 마지막 레이어로 전환
      if (state.activeLayerId !== id) return { layers: newLayers };
      const newActive = newLayers[newLayers.length - 1];
      return {
        layers: newLayers,
        activeLayerId: newActive.id,
        ...syncLayerToTopLevel(newActive, state.strokeParams),
      };
    }),

  setActiveLayerId: (id) =>
    set((state) => {
      const layer = state.layers.find(l => l.id === id);
      if (!layer || layer.id === state.activeLayerId) return {};
      return {
        activeLayerId: id,
        ...syncLayerToTopLevel(layer, state.strokeParams),
      };
    }),

  toggleLayerVisible: (id) =>
    set((state) => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    })),

  renameLayer: (id, name) =>
    set((state) => ({
      layers: state.layers.map(l => l.id === id ? { ...l, name } : l),
    })),

  duplicateLayer: (id) =>
    set((state) => {
      const source = state.layers.find(l => l.id === id);
      if (!source) return {};
      const newId = `layer-${Date.now()}`;
      const copy = { ...source, id: newId, name: `${source.name} copy` };
      const sourceIndex = state.layers.findIndex(l => l.id === id);
      const newLayers = [...state.layers];
      newLayers.splice(sourceIndex + 1, 0, copy);
      return {
        layers: newLayers,
        activeLayerId: newId,
        ...syncLayerToTopLevel(copy, state.strokeParams),
      };
    }),

  reorderLayer: (fromId, toId) =>
    set((state) => {
      const layers = [...state.layers];
      const fromIdx = layers.findIndex(l => l.id === fromId);
      const toIdx = layers.findIndex(l => l.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return state;
      const [moved] = layers.splice(fromIdx, 1);
      layers.splice(toIdx, 0, moved);
      return { layers };
    }),

  // effectKey: 'slantParams' | 'connectionParams' | 'branchParams' | 'decoratorParams' | 'offsetPathParams'
  setLayerEffectVisible: (layerId, effectKey, visible) =>
    set((state) => {
      const newLayers = state.layers.map(l =>
        l.id !== layerId ? l : { ...l, [effectKey]: { ...l[effectKey], visible } }
      );
      if (layerId === state.activeLayerId) {
        const updated = newLayers.find(l => l.id === layerId);
        return { layers: newLayers, [effectKey]: updated[effectKey] };
      }
      return { layers: newLayers };
    }),

  setLayerEffectEnabled: (layerId, effectKey, enabled) =>
    set((state) => {
      const newLayers = state.layers.map(l =>
        l.id !== layerId ? l : {
          ...l,
          [effectKey]: { ...l[effectKey], enabled },
          effectOrder: updateEffectOrder(l.effectOrder, effectKey, enabled),
        }
      );
      // active layer면 top-level도 동기화
      if (layerId === state.activeLayerId) {
        const updated = newLayers.find(l => l.id === layerId);
        return { layers: newLayers, [effectKey]: updated[effectKey] };
      }
      return { layers: newLayers };
    }),

  // axis: 'x' | 'y'
  setScaleVisible: (layerId, axis, visible) =>
    set((state) => {
      const key = axis === 'x' ? 'scaleXVisible' : 'scaleYVisible';
      const newLayers = state.layers.map(l =>
        l.id !== layerId ? l : { ...l, strokeParams: { ...l.strokeParams, [key]: visible } }
      );
      if (layerId === state.activeLayerId) {
        const updated = newLayers.find(l => l.id === layerId);
        return { layers: newLayers, strokeParams: updated.strokeParams };
      }
      return { layers: newLayers };
    }),

  resetLayerScale: (layerId, axis) =>
    set((state) => {
      const key = axis === 'x' ? 'scaleX' : 'scaleY';
      const newLayers = state.layers.map(l =>
        l.id !== layerId ? l : { ...l, strokeParams: { ...l.strokeParams, [key]: 1 } }
      );
      if (layerId === state.activeLayerId) {
        const updated = newLayers.find(l => l.id === layerId);
        return { layers: newLayers, strokeParams: updated.strokeParams };
      }
      return { layers: newLayers };
    }),

  // ─── Display / session ───────────────────────────────────────────────────────
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      return { theme: newTheme, bgColor: newTheme === 'dark' ? '#1a1a1a' : '#ffffff' };
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
    set((state) => ({ centerlines: { ...state.centerlines, [name]: data } })),

  setExtractionStatus: (update) =>
    set((state) => ({ extraction: { ...state.extraction, ...update } })),

  addExtractionError: (error) =>
    set((state) => ({
      extraction: { ...state.extraction, errors: [...state.extraction.errors, error] },
    })),

  reset: () =>
    set((state) => {
      if (state.fontBlobUrl) URL.revokeObjectURL(state.fontBlobUrl);
      const initialLayer = createLayer('layer-1', 'Layer 1', 0);
      return {
        fontId: null,
        fontName: '',
        glyphCount: 0,
        ascender: null,
        descender: null,
        isDemo: false,
        fontLoading: false,
        glyphs: [],
        selectedGlyph: null,
        selectedGlyphs: new Set(),
        previewText: '',
        centerlines: {},
        strokeParams: { width: 80, cap: 'round', join: 'round', strokeColor: '#FF5714', centerlineColor: '#1a1a1a', scaleX: 1.0, scaleY: 1.0 },
        connectionParams: defaultConnectionParams(),
        branchParams: defaultBranchParams(),
        decoratorParams: { ...defaultDecoratorParams(), size: 30 }, // reset은 size 30
        offsetPathParams: defaultOffsetPathParams(),
        slantParams: defaultSlantParams(),
        backgroundImageParams: { enabled: false, imageUrl: null, imageName: null, opacity: 1.0, scale: 1.0, fit: 'contain', blendMode: 'normal' },
        layers: [initialLayer],
        activeLayerId: 'layer-1',
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
