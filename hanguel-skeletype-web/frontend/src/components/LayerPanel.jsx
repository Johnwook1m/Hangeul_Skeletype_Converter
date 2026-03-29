import { useState } from 'react';
import useFontStore from '../stores/fontStore';

const EyeIcon = ({ size = 12, off = false }) =>
  off ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

// 활성화된 이펙트만 반환 (FX에서 켠 것만 표시), visible 상태 포함
function getEffectItems(layer) {
  const { slantParams, connectionParams, branchParams, decoratorParams, offsetPathParams, strokeParams } = layer;
  const items = [
    { key: 'slant',   effectKey: 'slantParams',       label: 'Slant',   color: '#6b7280',              visible: slantParams.visible !== false },
    { key: 'connect', effectKey: 'connectionParams',  label: 'Connect', color: connectionParams.color, visible: connectionParams.visible !== false },
    { key: 'branch',  effectKey: 'branchParams',      label: 'Branch',  color: branchParams.color,     visible: branchParams.visible !== false },
    { key: 'deco',    effectKey: 'decoratorParams',   label: 'Deco',    color: decoratorParams.color,  visible: decoratorParams.visible !== false },
    { key: 'offset',  effectKey: 'offsetPathParams',  label: 'Offset',  color: offsetPathParams.color, visible: offsetPathParams.visible !== false },
  ].filter(item => layer[item.effectKey].enabled);

  // Width/Height: scaleX/scaleY ≠ 1일 때 표시
  if ((strokeParams.scaleX ?? 1) !== 1) {
    items.push({ key: 'scaleX', label: 'Width', color: '#6b7280', visible: strokeParams.scaleXVisible !== false, isScale: true, axis: 'x' });
  }
  if ((strokeParams.scaleY ?? 1) !== 1) {
    items.push({ key: 'scaleY', label: 'Height', color: '#6b7280', visible: strokeParams.scaleYVisible !== false, isScale: true, axis: 'y' });
  }

  return items;
}

export default function LayerPanel() {
  const {
    layers,
    activeLayerId,
    addLayer,
    removeLayer,
    setActiveLayerId,
    toggleLayerVisible,
    renameLayer,
    reorderLayer,
    setLayerEffectEnabled,
    setLayerEffectVisible,
    setScaleVisible,
    resetLayerScale,
  } = useFontStore();

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [dragOverId, setDragOverId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const displayLayers = [...layers].reverse();

  function toggleExpand(id, e) {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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
      <div className="bg-gray-200 rounded-[20px] shadow-lg overflow-hidden" style={{ minWidth: 164 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <span className="text-[10px] text-gray-500 tracking-wide font-bold">Layers</span>
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
            const isExpanded = expandedIds.has(layer.id);
            const effectItems = getEffectItems(layer);

            return (
              <div key={layer.id}>
                {/* ── Layer row ── */}
                <div
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
                  {/* Expand arrow */}
                  <button
                    onClick={(e) => toggleExpand(layer.id, e)}
                    className="w-3 h-3 flex items-center justify-center shrink-0 cursor-pointer"
                    style={{
                      color: isActive ? 'rgba(255,255,255,0.8)' : '#9ca3af',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      fontSize: 8,
                      transition: 'transform 0.15s',
                    }}
                  >
                    ▶
                  </button>

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
                      className="text-[11px] font-bold flex-1 truncate min-w-0"
                      style={{ color: isActive ? 'white' : '#4b5563' }}
                      onDoubleClick={(e) => { e.stopPropagation(); startRename(layer); }}
                    >
                      {layer.name}
                    </span>
                  )}

                  {/* Layer visibility */}
                  <button
                    className="shrink-0 transition-opacity cursor-pointer"
                    style={{ opacity: layer.visible ? (isActive ? 0.8 : 0.5) : 0.25, color: isActive ? 'white' : '#6b7280' }}
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                    onClick={(e) => { e.stopPropagation(); toggleLayerVisible(layer.id); }}
                  >
                    <EyeIcon size={12} off={!layer.visible} />
                  </button>

                  {/* Delete layer */}
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

                {/* ── Effect sub-items (expanded) ── */}
                {isExpanded && (
                  <div className="ml-6 mb-1">
                    {effectItems.map((item, i) => {
                      const isLast = i === effectItems.length - 1;
                      return (
                        <div
                          key={item.key}
                          className="flex items-center gap-1.5 py-[3px] pr-2 relative group/fx"
                          style={{ opacity: item.visible ? 1 : 0.35 }}
                        >
                          {/* Tree line */}
                          <div className="w-4 shrink-0 self-stretch relative">
                            <div className="absolute w-px bg-gray-400/50"
                              style={{ left: 6, top: 0, bottom: isLast ? '50%' : 0 }} />
                            <div className="absolute h-px bg-gray-400/50"
                              style={{ left: 6, right: 0, top: '50%' }} />
                          </div>

                          {/* Effect color dot */}
                          <div
                            className="w-2 h-2 rounded-full shrink-0 border border-black/10"
                            style={{ background: item.color }}
                          />

                          {/* Label */}
                          <span className="text-[11px] text-gray-500 flex-1 shrink-0">{item.label}</span>

                          {/* Eye: 미리보기 숨김/표시 토글 | X: 완전 비활성화 */}
                          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover/fx:opacity-100 transition-opacity">
                            <button
                              className="shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                              title={item.visible ? 'Hide from preview' : 'Show in preview'}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.isScale) setScaleVisible(layer.id, item.axis, !item.visible);
                                else setLayerEffectVisible(layer.id, item.effectKey, !item.visible);
                              }}
                            >
                              <EyeIcon size={12} off={!item.visible} />
                            </button>
                            <button
                              className="text-[10px] shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors leading-none"
                              title="Remove effect"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.isScale) resetLayerScale(layer.id, item.axis);
                                else setLayerEffectEnabled(layer.id, item.effectKey, false);
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
