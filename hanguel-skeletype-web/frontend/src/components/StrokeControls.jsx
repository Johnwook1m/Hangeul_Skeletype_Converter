import useFontStore from '../stores/fontStore';

const CAP_OPTIONS = [
  { value: 'butt', label: 'Butt' },
  { value: 'round', label: 'Round' },
  { value: 'square', label: 'Square' },
];

const JOIN_OPTIONS = [
  { value: 'miter', label: 'Miter' },
  { value: 'round', label: 'Round' },
  { value: 'bevel', label: 'Bevel' },
];

export default function StrokeControls({ compact = false }) {
  const {
    strokeParams,
    setStrokeParams,
    showFlesh,
    setShowFlesh,
    glyphSize,
    setGlyphSize,
  } = useFontStore();

  if (compact) {
    return (
      <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
        {/* Show Flesh Toggle */}
        <button
          onClick={() => setShowFlesh(!showFlesh)}
          className={`
            w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors
            ${showFlesh
              ? 'bg-purple-500 text-white'
              : 'bg-white text-gray-600 border border-gray-300'
            }
          `}
        >
          {showFlesh ? '✓ 원본 글리프 표시' : '원본 글리프 숨김'}
        </button>

        {/* Size Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Size</span>
            <span className="text-xs font-mono text-gray-800">{glyphSize}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={200}
            step={5}
            value={glyphSize}
            onChange={(e) => setGlyphSize(+e.target.value)}
            className="w-full accent-purple-500 h-1.5"
          />
        </div>

        {/* Stroke Width Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Stroke Width</span>
            <span className="text-xs font-mono text-gray-800">{strokeParams.width}</span>
          </div>
          <input
            type="range"
            min={5}
            max={300}
            step={1}
            value={strokeParams.width}
            onChange={(e) => setStrokeParams({ width: +e.target.value })}
            className="w-full accent-orange-500 h-1.5"
          />
        </div>

        {/* Cap & Join */}
        <div className="flex gap-2">
          <div className="flex-1">
            <span className="text-xs text-gray-500 block mb-1">Cap</span>
            <select
              value={strokeParams.cap}
              onChange={(e) => setStrokeParams({ cap: e.target.value })}
              className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white"
            >
              {CAP_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <span className="text-xs text-gray-500 block mb-1">Join</span>
            <select
              value={strokeParams.join}
              onChange={(e) => setStrokeParams({ join: e.target.value })}
              className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white"
            >
              {JOIN_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-sm text-gray-700">Stroke Parameters</h3>

      {/* Width slider */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <label>Width</label>
          <span className="font-mono">{strokeParams.width}</span>
        </div>
        <input
          type="range"
          min={5}
          max={300}
          step={1}
          value={strokeParams.width}
          onChange={(e) => setStrokeParams({ width: +e.target.value })}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Line cap */}
      <div>
        <label className="text-sm text-gray-600 block mb-1">Line Cap</label>
        <div className="flex gap-1">
          {CAP_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStrokeParams({ cap: value })}
              className={`
                flex-1 px-2 py-1.5 text-xs rounded border transition-colors
                ${strokeParams.cap === value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Line join */}
      <div>
        <label className="text-sm text-gray-600 block mb-1">Line Join</label>
        <div className="flex gap-1">
          {JOIN_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStrokeParams({ join: value })}
              className={`
                flex-1 px-2 py-1.5 text-xs rounded border transition-colors
                ${strokeParams.join === value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
