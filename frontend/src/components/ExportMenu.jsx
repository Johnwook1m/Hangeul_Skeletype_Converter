import { useState, useCallback } from 'react';
import useFontStore from '../stores/fontStore';
import { exportFont } from '../api/client';
import EffectPopover from './effects/EffectPopover';

// ── JPG helpers ──────────────────────────────────────────────────────────────
const BLEND_MAP = {
  normal: 'source-over', multiply: 'multiply', screen: 'screen',
  overlay: 'overlay', 'soft-light': 'soft-light', 'hard-light': 'hard-light',
  'color-burn': 'color-burn', 'color-dodge': 'color-dodge',
  darken: 'darken', lighten: 'lighten', difference: 'difference',
};

function hexToRgb(hex) {
  return { r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) };
}

function buildFilterString(img) {
  return [
    img.hue !== 0          ? `hue-rotate(${img.hue}deg)` : '',
    img.saturation !== 100 ? `saturate(${img.saturation}%)` : '',
    img.brightness !== 100 ? `brightness(${img.brightness}%)` : '',
    img.contrast !== 100   ? `contrast(${img.contrast}%)` : '',
    img.grayscale > 0      ? `grayscale(${img.grayscale}%)` : '',
  ].filter(Boolean).join(' ') || 'none';
}

async function applyDuotone(srcCanvas, shadow, highlight) {
  const sh = hexToRgb(shadow), hi = hexToRgb(highlight);
  const off = document.createElement('canvas');
  off.width = srcCanvas.width; off.height = srcCanvas.height;
  const c = off.getContext('2d');
  c.drawImage(srcCanvas, 0, 0);
  const id = c.getImageData(0, 0, off.width, off.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114) / 255;
    d[i]   = Math.round(sh.r + (hi.r - sh.r) * lum);
    d[i+1] = Math.round(sh.g + (hi.g - sh.g) * lum);
    d[i+2] = Math.round(sh.b + (hi.b - sh.b) * lum);
  }
  c.putImageData(id, 0, 0);
  return off;
}

async function drawBackgroundImages(ctx, images, w, h) {
  for (const img of images) {
    if (!img.enabled || !img.imageUrl) continue;
    const el = new Image();
    el.src = img.imageUrl;
    await new Promise((res) => { el.onload = res; el.onerror = res; });
    const scale = img.scale ?? 1.0;
    const ia = el.width / el.height, ca = w / h;
    let dw, dh;
    if (img.fit === 'cover') {
      if (ia > ca) { dh = h; dw = dh * ia; } else { dw = w; dh = dw / ia; }
    } else if (img.fit === 'contain') {
      if (ia > ca) { dw = w; dh = dw / ia; } else { dh = h; dw = dh * ia; }
    } else { dw = w; dh = h; }
    dw *= scale; dh *= scale;
    const xOff = (img.x / 100) * w, yOff = (img.y / 100) * h;
    const dx = (w - dw) / 2 + xOff, dy = (h - dh) / 2 + yOff;
    const off = document.createElement('canvas');
    off.width = Math.round(dw); off.height = Math.round(dh);
    const oc = off.getContext('2d');
    const f = buildFilterString(img);
    if (f !== 'none') oc.filter = f;
    oc.drawImage(el, 0, 0, Math.round(dw), Math.round(dh));
    oc.filter = 'none';
    let src = off;
    if (img.duotoneEnabled) src = await applyDuotone(off, img.duotoneShadow || '#000000', img.duotoneHighlight || '#ffffff');
    ctx.save();
    ctx.globalAlpha = img.opacity ?? 1.0;
    ctx.globalCompositeOperation = BLEND_MAP[img.blendMode] ?? 'source-over';
    if (img.rotation) {
      const cx = dx + dw/2, cy = dy + dh/2;
      ctx.translate(cx, cy);
      ctx.rotate((img.rotation * Math.PI) / 180);
      ctx.drawImage(src, -dw/2, -dh/2, dw, dh);
    } else {
      ctx.drawImage(src, dx, dy, dw, dh);
    }
    ctx.restore();
  }
}

async function drawSVGToCanvas(ctx, svgEl, w, h) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);
  clone.removeAttribute('class');
  const t = svgEl.style.transform || '';
  const txM = t.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
  const sM  = t.match(/scale\(([^)]+)\)/);
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

// ── Component ────────────────────────────────────────────────────────────────
export default function ExportMenu() {
  const { fontId, fontName, strokeParams, previewText, isDemo } = useFontStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null); // 'svg' | 'jpg' | 'otf'

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
      const { bgColor, backgroundImages } = useFontStore.getState();
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
      if (backgroundImages.length > 0) {
        await drawBackgroundImages(ctx, backgroundImages, w, h);
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

  // ── OTF ────────────────────────────────────────────────────────────────────
  async function handleOTF() {
    if (!fontId) return;
    setLoading('otf');
    try {
      const blob = await exportFont(fontId, {
        stroke_width: strokeParams.width + 1,
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

            {/* OTF */}
            <button
              onClick={handleOTF}
              disabled={loading === 'otf'}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-40 transition-colors text-left"
            >
              <span className="text-xs font-mono font-semibold text-[#FF5714] w-8">OTF</span>
              <div>
                <p className="text-xs font-medium text-gray-200">
                  {loading === 'otf' ? 'Generating...' : 'Font export'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">Skeleton font file</p>
              </div>
            </button>

          </div>
        </EffectPopover>
      )}
    </div>
  );
}
