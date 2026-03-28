import useFontStore from '../../stores/fontStore';

export default function BranchControls() {
  const { branchParams, setBranchParams } = useFontStore();
  const set = (p) => setBranchParams(p);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-gray-300 tracking-wider">Branch</h3>

      {/* Angle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Angle</span>
        <input type="range" min={0} max={90} step={1} value={branchParams.angle}
          onChange={(e) => set({ angle: +e.target.value })}
          className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
        <span className="text-xs text-gray-500 w-8 text-right">{branchParams.angle}°</span>
      </div>

      {/* Count */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Count</span>
        <input type="range" min={1} max={5} step={1} value={branchParams.count}
          onChange={(e) => set({ count: +e.target.value })}
          className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
        <span className="text-xs text-gray-500 w-8 text-right">{branchParams.count}</span>
      </div>

      {/* Length */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Length</span>
        <input type="range" min={10} max={200} step={5} value={branchParams.length}
          onChange={(e) => set({ length: +e.target.value })}
          className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
        <span className="text-xs text-gray-500 w-8 text-right">{branchParams.length}</span>
      </div>

      {/* Depth */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Depth</span>
        <input type="range" min={1} max={4} step={1} value={branchParams.depth}
          onChange={(e) => set({ depth: +e.target.value })}
          className="flex-1 h-1 slider-dark appearance-none bg-transparent" />
        <span className="text-xs text-gray-500 w-8 text-right">{branchParams.depth}</span>
      </div>

      {/* Color */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-12">Color</span>
        <input type="color" value={branchParams.color}
          onChange={(e) => set({ color: e.target.value })}
          className="w-5 h-5 rounded-full border border-gray-600 cursor-pointer" style={{ padding: 0 }} />
      </div>
    </div>
  );
}
