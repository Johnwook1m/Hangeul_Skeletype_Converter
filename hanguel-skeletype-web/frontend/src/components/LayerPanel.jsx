import { useState } from 'react';
import useFontStore from '../stores/fontStore';

export default function LayerPanel() {
  const {
    layers,
    activeLayerId,
    addLayer,
    removeLayer,
    setActiveLayerId,
    toggleLayerVisible,
    renameLayer,
    duplicateLayer,
    reorderLayer,
  } = useFontStore();

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [dragOverId, setDragOverId] = useState(null);

  const displayLayers = [...layers].reverse(); // 위가 맨 위 레이어

  function startRename(layer) {
    setEditingId(layer.id);
    setEditingName(layer.name);
  }

  function commitRename(id) {
    if (editingName.trim()) renameLayer(id, editingName.trim());
    setEditingId(null);
  }

  function handleKeyDown(e, id) {
    if (e.key === 'Enter') commitRename(id);
    if (e.key === 'Escape') setEditingId(null);
  }

  return (
    <div
      className="fixed left-0 top-1/2 -translate-y-1/2 z-40 select-none"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="rounded-r-xl overflow-hidden"
        style={{
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(12px)',
          minWidth: 160,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="text-white/50 text-[10px] tracking-widest font-medium uppercase">Layers</span>
          <button
            onClick={addLayer}
            className="text-white/60 hover:text-white text-lg leading-none transition-colors cursor-pointer"
            title="Add layer"
            style={{ lineHeight: 1, marginTop: -1 }}
          >
            +
          </button>
        </div>

        {/* Layer rows (reverse order: top = frontmost) */}
        <div className="py-1">
          {displayLayers.map((layer) => {
            const isActive = layer.id === activeLayerId;
            const isDragOver = dragOverId === layer.id;
            return (
              <div
                key={layer.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('layerId', layer.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverId(layer.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromId = e.dataTransfer.getData('layerId');
                  if (fromId && fromId !== layer.id) reorderLayer(fromId, layer.id);
                  setDragOverId(null);
                }}
                onDragEnd={() => setDragOverId(null)}
                className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer group"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  outline: isDragOver ? '1px solid rgba(255,255,255,0.35)' : 'none',
                  outlineOffset: '-1px',
                }}
                onClick={() => setActiveLayerId(layer.id)}
              >
                {/* Drag handle — hover 시 표시 */}
                <span
                  className="text-white/0 group-hover:text-white/30 text-[11px] w-3 shrink-0 cursor-grab transition-colors"
                  style={{ letterSpacing: '-1px' }}
                >
                  ⠿
                </span>

                {/* Active indicator */}
                <span
                  className="text-white/80 text-[10px] w-3 shrink-0"
                  style={{ opacity: isActive ? 1 : 0 }}
                >
                  ▶
                </span>

                {/* Color swatch */}
                <div
                  className="w-3.5 h-3.5 rounded-sm shrink-0 border border-white/20"
                  style={{ background: layer.strokeParams.strokeColor }}
                />

                {/* Name */}
                {editingId === layer.id ? (
                  <input
                    className="text-white text-[12px] bg-white/10 rounded px-1 outline-none w-full min-w-0"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitRename(layer.id)}
                    onKeyDown={(e) => handleKeyDown(e, layer.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="text-white text-[12px] flex-1 truncate min-w-0"
                    style={{ opacity: isActive ? 1 : 0.6 }}
                    onDoubleClick={(e) => { e.stopPropagation(); startRename(layer); }}
                  >
                    {layer.name}
                  </span>
                )}

                {/* Visibility toggle */}
                <button
                  className="text-white/40 hover:text-white text-[11px] shrink-0 transition-colors cursor-pointer"
                  style={{ opacity: layer.visible ? 0.7 : 0.25 }}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  onClick={(e) => { e.stopPropagation(); toggleLayerVisible(layer.id); }}
                >
                  {layer.visible ? '👁' : '○'}
                </button>

                {/* Duplicate */}
                <button
                  className="text-white/0 group-hover:text-white/40 hover:!text-white text-[11px] shrink-0 transition-colors cursor-pointer"
                  title="Duplicate layer"
                  onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
                >
                  ⊕
                </button>

                {/* Delete — hidden if only 1 layer */}
                {layers.length > 1 && (
                  <button
                    className="text-white/0 group-hover:text-white/40 hover:!text-white text-[11px] shrink-0 transition-colors cursor-pointer"
                    title="Delete layer"
                    onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
