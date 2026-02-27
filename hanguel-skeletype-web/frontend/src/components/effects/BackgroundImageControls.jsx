import { useRef } from 'react';
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

export default function BackgroundImageControls() {
  const { backgroundImageParams, setBackgroundImageParams } = useFontStore();
  const fileInputRef = useRef(null);
  const set = (p) => setBackgroundImageParams(p);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      set({ imageUrl: ev.target.result, imageName: file.name });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function handleClear() {
    set({ imageUrl: null, imageName: null });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wider">Background</h3>

      {/* File upload */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1 text-xs rounded bg-gray-600 text-gray-200 hover:bg-gray-500 transition-colors shrink-0"
        >
          이미지 선택
        </button>
        <span className="text-xs text-gray-500 truncate flex-1 min-w-0">
          {backgroundImageParams.imageName || '파일 없음'}
        </span>
        {backgroundImageParams.imageUrl && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors shrink-0"
            title="이미지 제거"
          >
            ✕
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Opacity */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Opacity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={backgroundImageParams.opacity}
          onChange={(e) => set({ opacity: +e.target.value })}
          className="flex-1 h-1 slider-dark appearance-none bg-transparent"
        />
        <span className="text-xs text-gray-500 w-8 text-right">
          {Math.round(backgroundImageParams.opacity * 100)}%
        </span>
      </div>

      {/* Fit mode */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 w-12">Fit</span>
        <div className="flex gap-1 flex-1">
          {FIT_MODES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set({ fit: value })}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                backgroundImageParams.fit === value
                  ? 'bg-[#0cd0fc] text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Blend mode */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Blend</span>
        <select
          value={backgroundImageParams.blendMode}
          onChange={(e) => set({ blendMode: e.target.value })}
          className="flex-1 text-xs bg-gray-700 text-gray-200 border border-gray-600 rounded px-2 py-1"
        >
          {BLEND_MODES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
