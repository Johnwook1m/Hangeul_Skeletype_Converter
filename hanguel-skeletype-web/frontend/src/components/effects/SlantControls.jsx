import useFontStore from '../../stores/fontStore';

export default function SlantControls() {
  const { slantParams, setSlantParams } = useFontStore();
  const set = (p) => setSlantParams(p);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wider">Slant</h3>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Angle</span>
        <input
          type="range"
          min={-45}
          max={45}
          step={1}
          value={slantParams.angle}
          onChange={(e) => set({ angle: +e.target.value })}
          className="flex-1 h-1 slider-dark appearance-none bg-transparent"
        />
        <span className="text-xs text-gray-500 w-8 text-right">{slantParams.angle}°</span>
      </div>
    </div>
  );
}
