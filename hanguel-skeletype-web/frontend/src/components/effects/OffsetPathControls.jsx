import useFontStore from '../../stores/fontStore';

const JOINS = [
  { value: 'round', label: 'Round' },
  { value: 'miter', label: 'Miter' },
  { value: 'bevel', label: 'Bevel' },
];

export default function OffsetPathControls() {
  const { offsetPathParams, setOffsetPathParams } = useFontStore();
  const set = (p) => setOffsetPathParams(p);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wider">Offset Path</h3>

      {/* Offset distance */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Offset</span>
        <input type="range" min={1} max={100} step={1} value={offsetPathParams.offset}
          onChange={(e) => set({ offset: +e.target.value })}
          className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
        <span className="text-xs text-gray-500 w-8 text-right">{offsetPathParams.offset}</span>
      </div>

      {/* Count (repetitions) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Count</span>
        <input type="range" min={1} max={5} step={1} value={offsetPathParams.count}
          onChange={(e) => set({ count: +e.target.value })}
          className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
        <span className="text-xs text-gray-500 w-8 text-right">{offsetPathParams.count}</span>
      </div>

      {/* Join type */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 w-12">Join</span>
        <div className="flex gap-1 flex-1">
          {JOINS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set({ join: value })}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                offsetPathParams.join === value
                  ? 'bg-[#0cd0fc] text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Both sides toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Sides</span>
        <button
          onClick={() => set({ bothSides: !offsetPathParams.bothSides })}
          className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
            offsetPathParams.bothSides
              ? 'bg-[#0cd0fc] text-white'
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
        >
          {offsetPathParams.bothSides ? 'Both' : 'One'}
        </button>
      </div>

      {/* Color */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Color</span>
        <input type="color" value={offsetPathParams.color}
          onChange={(e) => set({ color: e.target.value })}
          className="w-6 h-6 rounded border border-gray-600 cursor-pointer" style={{ padding: 0 }} />
      </div>
    </div>
  );
}
