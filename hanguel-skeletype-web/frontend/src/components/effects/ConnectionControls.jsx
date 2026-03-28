import useFontStore from '../../stores/fontStore';

const SHAPES = [
  { value: 'line', label: 'Line' },
  { value: 'curve', label: 'Curve' },
  { value: 'wave', label: 'Wave' },
];

export default function ConnectionControls() {
  const { connectionParams, setConnectionParams } = useFontStore();
  const set = (p) => setConnectionParams(p);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-gray-300 tracking-wider">Connection</h3>

      {/* Shape selector */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 w-12">Shape</span>
        <div className="flex gap-1 flex-1">
          {SHAPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set({ shape: value })}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                connectionParams.shape === value
                  ? 'bg-[#FF5714] text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Color</span>
        <input type="color" value={connectionParams.color}
          onChange={(e) => set({ color: e.target.value })}
          className="w-5 h-5 rounded-full border border-gray-600 cursor-pointer" style={{ padding: 0 }} />
      </div>

      {/* Max distance */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Range</span>
        <input type="range" min={50} max={2000} step={10} value={connectionParams.maxDistance}
          onChange={(e) => set({ maxDistance: +e.target.value })}
          className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
        <span className="text-xs text-gray-500 w-8 text-right">{connectionParams.maxDistance}</span>
      </div>

      {/* Curve-specific: tension */}
      {connectionParams.shape === 'curve' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-12">Tension</span>
          <input type="range" min={0} max={1} step={0.05} value={connectionParams.tension}
            onChange={(e) => set({ tension: +e.target.value })}
            className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
          <span className="text-xs text-gray-500 w-8 text-right">{connectionParams.tension}</span>
        </div>
      )}

      {/* Wave-specific: amplitude + frequency */}
      {connectionParams.shape === 'wave' && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-12">Amp</span>
            <input type="range" min={1} max={100} step={1} value={connectionParams.waveAmplitude}
              onChange={(e) => set({ waveAmplitude: +e.target.value })}
              className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
            <span className="text-xs text-gray-500 w-8 text-right">{connectionParams.waveAmplitude}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-12">Freq</span>
            <input type="range" min={1} max={20} step={1} value={connectionParams.waveFrequency}
              onChange={(e) => set({ waveFrequency: +e.target.value })}
              className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
            <span className="text-xs text-gray-500 w-8 text-right">{connectionParams.waveFrequency}</span>
          </div>
        </>
      )}
    </div>
  );
}
