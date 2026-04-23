import { useState, useCallback } from 'react';
import useFontStore from '../stores/fontStore';
import EffectPopover from './effects/EffectPopover';
import { capturePreviewBlob } from '../utils/capturePreview';

// ── Component ────────────────────────────────────────────────────────────────
export default function ExportMenu() {
  const { fontId, fontName, previewText, isDemo } = useFontStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null); // 'svg' | 'jpg'

  const canExport = !!fontId && !isDemo;
  const closePopover = useCallback(() => setOpen(false), []);

  // ── SVG ────────────────────────────────────────────────────────────────────
  function handleSVG() {
    const svgEl = document.getElementById('skeletype-preview-svg');
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true);
    clone.style.transform = '';
    clone.style.transformOrigin = '';
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.removeAttribute('class');
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${fontName || 'skeletype'}_effects.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  // ── JPG ────────────────────────────────────────────────────────────────────
  async function handleJPG() {
    setLoading('jpg');
    try {
      const blob = await capturePreviewBlob(0.95);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${fontName || 'skeletype'}_preview.jpg`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null); setOpen(false);
    }
  }

  if (!canExport) return null;

  return (
    <div className="relative shrink-0" data-fx-button>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!!loading}
        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors disabled:opacity-50 ${
          open ? 'bg-[#FF5714] text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
        }`}
      >
        {loading ? '...' : 'Export'}
      </button>

      {open && (
        <EffectPopover onClose={closePopover}>
          <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wider mb-3">Export</h3>

          <div className="space-y-1">
            {/* SVG */}
            <button
              onClick={handleSVG}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
            >
              <span className="text-xs font-mono font-semibold text-[#FF5714] w-8">SVG</span>
              <div>
                <p className="text-xs font-medium text-gray-200">Vector export</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Centerline vector file</p>
              </div>
            </button>

            {/* JPG */}
            <button
              onClick={handleJPG}
              disabled={!previewText || loading === 'jpg'}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-40 transition-colors text-left"
            >
              <span className="text-xs font-mono font-semibold text-[#FF5714] w-8">JPG</span>
              <div>
                <p className="text-xs font-medium text-gray-200">
                  {loading === 'jpg' ? 'Saving...' : 'Screen capture'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">Current view as-is</p>
              </div>
            </button>

          </div>
        </EffectPopover>
      )}
    </div>
  );
}
