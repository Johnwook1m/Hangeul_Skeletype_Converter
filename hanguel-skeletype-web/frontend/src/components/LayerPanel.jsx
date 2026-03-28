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

  const displayLayers = [...layers].reverse();

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
      className="fixed left-4 top-1/2 -translate-y-1/2 z-40 select-none"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="bg-gray-200 rounded-[20px] shadow-lg overflow-hidden" style={{ minWidth: 148 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <span className="text-[10px] text-gray-500 tracking-widest font-medium uppercase">Layers</span>
          <button
            onClick={addLayer}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-[#d9d9d9] text-gray-600 hover:bg-[#c9c9c9] text-base leading-none transition-colors cursor-pointer"
            title="Add layer"
          >
            +
          </button>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-gray-400/40 mb-1" />

        {/* Layer rows */}
        <div className="pb-2 px-1.5">
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
                onClick={() => setActiveLayerId(layer.id)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full cursor-pointer group transition-colors"
                style={{
                  background: isActive ? '#FF5714' : isDragOver ? '#d9d9d9' : 'transparent',
                  outline: isDragOver && !isActive ? '1px solid #aaa' : 'none',
                  outlineOffset: '-1px',
                }}
              >
                {/* Drag handle */}
                <span
                  className="text-[11px] w-3 shrink-0 cursor-grab transition-opacity"
                  style={{
                    opacity: isActive ? 0.5 : 0,
                    color: isActive ? 'white' : '#9ca3af',
                    letterSpacing: '-1px',
                  }}
                  // show on group hover via inline style override below
                >
                  ⠿
                </span>

                {/* Color swatch */}
                <div
                  className="w-3 h-3 rounded-sm shrink-0 border"
                  style={{
                    background: layer.strokeParams.strokeColor,
                    borderColor: isActive ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.15)',
                  }}
                />

                {/* Name */}
                {editingId === layer.id ? (
                  <input
                    className="text-[11px] bg-white/30 rounded px-1 outline-none w-full min-w-0 text-gray-700"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitRename(layer.id)}
                    onKeyDown={(e) => handleKeyDown(e, layer.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="text-[11px] font-medium flex-1 truncate min-w-0"
                    style={{ color: isActive ? 'white' : '#4b5563' }}
                    onDoubleClick={(e) => { e.stopPropagation(); startRename(layer); }}
                  >
                    {layer.name}
                  </span>
                )}

                {/* Visibility toggle */}
                <button
                  className="text-[10px] shrink-0 transition-opacity cursor-pointer"
                  style={{ opacity: layer.visible ? (isActive ? 0.8 : 0.5) : 0.25, color: isActive ? 'white' : '#6b7280' }}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  onClick={(e) => { e.stopPropagation(); toggleLayerVisible(layer.id); }}
                >
                  {layer.visible ? '👁' : '○'}
                </button>

                {/* Duplicate */}
                <button
                  className="text-[10px] shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-pointer"
                  style={{ color: isActive ? 'white' : '#6b7280' }}
                  title="Duplicate layer"
                  onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
                >
                  ⊕
                </button>

                {/* Delete */}
                {layers.length > 1 && (
                  <button
                    className="text-[10px] shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-pointer"
                    style={{ color: isActive ? 'white' : '#6b7280' }}
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
