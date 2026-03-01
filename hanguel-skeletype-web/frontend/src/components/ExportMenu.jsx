import { useState, useRef, useEffect } from 'react';
import useFontStore from '../stores/fontStore';
import { exportFont } from '../api/client';

// ── JPG helpers ────────────────────────────────────────────────────────────
const BLEND_MAP = {
  normal: 'source-over', multiply: 'multiply', screen: 'screen',
  overlay: 'overlay', 'soft-light': 'soft-light', 'hard-light': 'hard-light',
  'color-burn': 'color-burn', 'color-dodge': 'color-dodge',
  darken: 'darken', lighten: 'lighten', difference: 'difference',
};

async function drawBackgroundImage(ctx, bgParams, w, h) {
  const img = new Image();
  img.src = bgParams.imageUrl;
  await new Promise((res) => { img.onload = res; img.onerror = res; });
  const scale = bgParams.scale ?? 1.0;
  const fit = bgParams.fit;
  const ia = img.width / img.height;
  const ca = w / h;
  let dw, dh;
  if (fit === 'cover') {
    if (ia > ca) { dh = h; dw = dh * ia; } else { dw = w; dh = dw / ia; }
  } else if (fit === 'contain') {
    if (ia > ca) { dw = w; dh = dw / ia; } else { dh = h; dw = dh * ia; }
  } else { dw = w; dh = h; }
  dw *= scale; dh *= scale;
  ctx.save();
  ctx.globalAlpha = bgParams.opacity;
  ctx.globalCompositeOperation = BLEND_MAP[bgParams.blendMode] ?? 'source-over';
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.restore();
}

async function drawSVGToCanvas(ctx, svgEl, w, h) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);
  clone.removeAttribute('class');
  const t = svgEl.style.transform || '';
  const txM = t.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
  const sM = t.match(/scale\(([^)]+)\)/);
  const tx = txM ? parseFloat(txM[1]) : 0;
  const ty = txM ? parseFloat(txM[2]) : 0;
  const s  = sM  ? parseFloat(sM[1])  : 1;
  clone.style.transform = '';
  clone.style.transformOrigin = '';
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise((res) => { img.onload = res; img.onerror = res; });
    const cx = w / 2, cy = h / 2;
    ctx.save();
    ctx.translate(cx + tx, cy + ty);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ExportMenu() {
  const { fontId, fontName, strokeParams, centerlines, previewText } = useFontStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null); // 'svg' | 'jpg' | 'otf'
  const menuRef = useRef(null);

  const canExport = Object.keys(centerlines).length > 0;

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // ── SVG export ────────────────────────────────────
  function exportSVG() {
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

  // ── JPG export ────────────────────────────────────
  async function exportJPG() {
    const containerEl = document.getElementById('preview-container');
    const svgEl = document.getElementById('skeletype-preview-svg');
    if (!containerEl) return;
    setLoading('jpg');
    try {
      const rect = containerEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;
      const w = rect.width, h = rect.height;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const { bgColor, backgroundImageParams } = useFontStore.getState();
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
      if (backgroundImageParams.enabled && backgroundImageParams.imageUrl) {
        await drawBackgroundImage(ctx, backgroundImageParams, w, h);
      }
      if (svgEl) await drawSVGToCanvas(ctx, svgEl, w, h);
      const url = canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = url; a.download = `${fontName || 'skeletype'}_preview.jpg`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } finally {
      setLoading(null); setOpen(false);
    }
  }

  // ── OTF export ────────────────────────────────────
  async function exportOTF() {
    if (!fontId) return;
    setLoading('otf');
    try {
      const blob = await exportFont(fontId, {
        stroke_width: strokeParams.width,
        stroke_cap: strokeParams.cap,
        stroke_join: strokeParams.join,
        format: 'otf',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${fontName}_Skeletype.otf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null); setOpen(false);
    }
  }

  if (!canExport) return null;

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!!loading}
        className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '...' : 'Export ▴'}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 bg-[#1e2027] rounded-xl shadow-xl overflow-hidden min-w-[140px] border border-gray-700">
          {/* SVG */}
          <button
            onClick={exportSVG}
            className="w-full text-left px-4 py-2.5 text-xs text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <span className="w-8 text-gray-400 font-mono">SVG</span>
            <span>Vector export</span>
          </button>

          <div className="h-px bg-gray-700 mx-3" />

          {/* JPG */}
          <button
            onClick={exportJPG}
            disabled={!previewText}
            className="w-full text-left px-4 py-2.5 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            <span className="w-8 text-gray-400 font-mono">JPG</span>
            <span>Screen capture</span>
          </button>

          <div className="h-px bg-gray-700 mx-3" />

          {/* OTF */}
          <button
            onClick={exportOTF}
            className="w-full text-left px-4 py-2.5 text-xs text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <span className="w-8 text-gray-400 font-mono">OTF</span>
            <span>Font export</span>
          </button>
        </div>
      )}
    </div>
  );
}
