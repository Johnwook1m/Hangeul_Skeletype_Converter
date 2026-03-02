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

async function drawBackgroundImage(ctx, bgParams, w, h) {
  const img = new Image();
  img.src = bgParams.imageUrl;
  await new Promise((res) => { img.onload = res; img.onerror = res; });
  const scale = bgParams.scale ?? 1.0;
  const fit = bgParams.fit;
  const ia = img.width / img.height, ca = w / h;
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
  const { fontId, fontName, strokeParams, centerlines, previewText } = useFontStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null); // 'svg' | 'jpg' | 'otf'

  const canExport = Object.keys(centerlines).length > 0;
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
          open ? 'bg-[#0cd0fc] text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
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
              <span className="text-xs font-mono font-semibold text-[#0cd0fc] w-8">SVG</span>
              <div>
                <p className="text-xs font-medium text-gray-200">Vector export</p>
                <p className="text-[10px] text-gray-500 mt-0.5">중심선 벡터 파일</p>
              </div>
            </button>

            {/* JPG */}
            <button
              onClick={handleJPG}
              disabled={!previewText || loading === 'jpg'}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-40 transition-colors text-left"
            >
              <span className="text-xs font-mono font-semibold text-[#0cd0fc] w-8">JPG</span>
              <div>
                <p className="text-xs font-medium text-gray-200">
                  {loading === 'jpg' ? '저장 중...' : 'Screen capture'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">현재 화면 그대로</p>
              </div>
            </button>

            {/* OTF */}
            <button
              onClick={handleOTF}
              disabled={loading === 'otf'}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-40 transition-colors text-left"
            >
              <span className="text-xs font-mono font-semibold text-[#0cd0fc] w-8">OTF</span>
              <div>
                <p className="text-xs font-medium text-gray-200">
                  {loading === 'otf' ? '생성 중...' : 'Font export'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">스켈레톤 폰트 파일</p>
              </div>
            </button>
          </div>
        </EffectPopover>
      )}
    </div>
  );
}
