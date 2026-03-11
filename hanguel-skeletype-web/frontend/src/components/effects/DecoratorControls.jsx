import useFontStore from '../../stores/fontStore';

const SHAPES = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'triangle', label: 'Triangle' },
];

const SPACINGS = [
  { value: 'endpoints', label: 'Ends' },
  { value: 'even', label: 'Even' },
  { value: 'random', label: 'Random' },
];

export default function DecoratorControls() {
  const { decoratorParams, setDecoratorParams } = useFontStore();
  const set = (p) => setDecoratorParams(p);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-gray-300 tracking-wider">Decorator</h3>

      {/* Shape selector */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 w-12">Shape</span>
        <div className="flex gap-1 flex-1 flex-wrap">
          {SHAPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set({ shape: value })}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                decoratorParams.shape === value
                  ? 'bg-[#FF5714] text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Spacing mode */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 w-12">Mode</span>
        <div className="flex gap-1 flex-1">
          {SPACINGS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set({ spacing: value })}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                decoratorParams.spacing === value
                  ? 'bg-[#FF5714] text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filled toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Fill</span>
        <button
          onClick={() => set({ filled: !decoratorParams.filled })}
          className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
            decoratorParams.filled
              ? 'bg-[#FF5714] text-white'
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
        >
          {decoratorParams.filled ? 'Filled' : 'Outline'}
        </button>
      </div>

      {/* Size */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Size</span>
        <input type="range" min={5} max={100} step={1} value={decoratorParams.size}
          onChange={(e) => set({ size: +e.target.value })}
          className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
        <span className="text-xs text-gray-500 w-8 text-right">{decoratorParams.size}</span>
      </div>

      {/* Count (hidden for endpoints mode) */}
      {decoratorParams.spacing !== 'endpoints' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-12">Count</span>
          <input type="range" min={1} max={30} step={1} value={decoratorParams.count}
            onChange={(e) => set({ count: +e.target.value })}
            className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
          <span className="text-xs text-gray-500 w-8 text-right">{decoratorParams.count}</span>
        </div>
      )}

      {/* Color */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Color</span>
        <input type="color" value={decoratorParams.color}
          onChange={(e) => set({ color: e.target.value })}
          className="w-6 h-6 rounded border border-gray-600 cursor-pointer" style={{ padding: 0 }} />
      </div>
    </div>
  );
}
