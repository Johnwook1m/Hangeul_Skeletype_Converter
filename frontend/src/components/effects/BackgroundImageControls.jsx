import { useRef, useState } from 'react';
import useFontStore from '../../stores/fontStore';

const FIT_MODES = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
];

const BLEND_MODES = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'difference', label: 'Difference' },
];

function Slider({ label, min, max, step, value, onChange, display }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-gray-400 w-14 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="min-w-0 flex-1 h-1 slider-dark appearance-none bg-transparent"
      />
      <span className="text-xs text-gray-500 w-9 shrink-0 text-right tabular-nums">{display}</span>
    </div>
  );
}

function ImageItem({ img, onRemove, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('transform'); // 'transform' | 'color'
  const up = (p) => onUpdate(img.id, p);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800">
        <div className="shrink-0 w-6 h-6 rounded overflow-hidden" style={{ background: '#444' }}>
          <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
            {expanded
              ? <polygon points="2,0 2,10 9,5"/>
              : <polygon points="0,2 10,2 5,9"/>
            }
          </svg>
        </button>
        <span
          className="text-xs text-gray-300 flex-1 truncate cursor-pointer min-w-0"
          onClick={() => setExpanded(v => !v)}
        >
          {img.imageName || 'Image'}
        </span>
        <button
          onClick={() => up({ enabled: !img.enabled })}
          className={`shrink-0 transition-colors ${img.enabled ? 'text-[#FF5714]' : 'text-gray-600 hover:text-gray-400'}`}
          title={img.enabled ? 'Hide' : 'Show'}
        >
          {img.enabled ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          )}
        </button>
        <button
          onClick={() => onRemove(img.id)}
          className="text-xs text-gray-600 hover:text-gray-300 shrink-0 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-2 py-2 space-y-2 bg-gray-900">
          {/* Tab switcher */}
          <div className="flex gap-1 mb-3">
            {['transform', 'color'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2.5 py-0.5 text-xs rounded-full transition-colors capitalize ${
                  tab === t ? 'bg-[#FF5714] text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'transform' && (
            <div className="space-y-2">
              <Slider label="Opacity" min={0} max={1} step={0.01} value={img.opacity}
                onChange={v => up({ opacity: v })}
                display={`${Math.round(img.opacity * 100)}%`} />

              <Slider label="Scale" min={0.1} max={2} step={0.01} value={img.scale}
                onChange={v => up({ scale: v })}
                display={`${Math.round(img.scale * 100)}%`} />

              <Slider label="X" min={-100} max={100} step={1} value={img.x}
                onChange={v => up({ x: v })}
                display={`${img.x > 0 ? '+' : ''}${img.x}%`} />

              <Slider label="Y" min={-100} max={100} step={1} value={img.y}
                onChange={v => up({ y: v })}
                display={`${img.y > 0 ? '+' : ''}${img.y}%`} />

              <Slider label="Rotation" min={-180} max={180} step={1} value={img.rotation}
                onChange={v => up({ rotation: v })}
                display={`${img.rotation}°`} />

              {/* Fit mode */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 w-14 shrink-0">Fit</span>
                <div className="flex gap-1 flex-1">
                  {FIT_MODES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => up({ fit: value })}
                      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                        img.fit === value ? 'bg-[#FF5714] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blend mode */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-14 shrink-0">Blend</span>
                <select
                  value={img.blendMode}
                  onChange={(e) => up({ blendMode: e.target.value })}
                  className="flex-1 text-xs bg-gray-700 text-gray-200 border border-gray-600 rounded px-2 py-1"
                >
                  {BLEND_MODES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {tab === 'color' && (
            <div className="space-y-2">
              <Slider label="Hue" min={-180} max={180} step={1} value={img.hue}
                onChange={v => up({ hue: v })}
                display={`${img.hue > 0 ? '+' : ''}${img.hue}°`} />

              <Slider label="Saturation" min={0} max={200} step={1} value={img.saturation}
                onChange={v => up({ saturation: v })}
                display={`${img.saturation}%`} />

              <Slider label="Brightness" min={0} max={200} step={1} value={img.brightness}
                onChange={v => up({ brightness: v })}
                display={`${img.brightness}%`} />

              <Slider label="Contrast" min={0} max={200} step={1} value={img.contrast}
                onChange={v => up({ contrast: v })}
                display={`${img.contrast}%`} />

              <Slider label="Grayscale" min={0} max={100} step={1} value={img.grayscale}
                onChange={v => up({ grayscale: v })}
                display={`${img.grayscale}%`} />

              {/* Duotone */}
              <div className="pt-1 border-t border-gray-700 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex-1">Duotone</span>
                  <button
                    onClick={() => up({ duotoneEnabled: !img.duotoneEnabled })}
                    className={`px-2.5 py-0.5 text-xs rounded-full transition-colors ${
                      img.duotoneEnabled ? 'bg-[#FF5714] text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {img.duotoneEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                {img.duotoneEnabled && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-16 shrink-0">Shadow</span>
                      <input
                        type="color"
                        value={img.duotoneShadow}
                        onChange={(e) => up({ duotoneShadow: e.target.value })}
                        className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-xs text-gray-500">{img.duotoneShadow}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-16 shrink-0">Highlight</span>
                      <input
                        type="color"
                        value={img.duotoneHighlight}
                        onChange={(e) => up({ duotoneHighlight: e.target.value })}
                        className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-xs text-gray-500">{img.duotoneHighlight}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BackgroundImageControls() {
  const { backgroundImages, addBackgroundImage, removeBackgroundImage, updateBackgroundImage } = useFontStore();
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        addBackgroundImage(ev.target.result, file.name);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-gray-300 tracking-wider">Images</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1 text-xs rounded bg-gray-600 text-gray-200 hover:bg-gray-500 transition-colors"
        >
          + Add
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {backgroundImages.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-2">No images yet</p>
      )}

      <div className="space-y-2">
        {backgroundImages.map((img) => (
          <ImageItem
            key={img.id}
            img={img}
            onRemove={removeBackgroundImage}
            onUpdate={updateBackgroundImage}
          />
        ))}
      </div>
    </div>
  );
}
