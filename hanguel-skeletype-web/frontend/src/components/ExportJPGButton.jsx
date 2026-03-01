import { useState } from 'react';
import useFontStore from '../stores/fontStore';

// CSS blend-mode → Canvas globalCompositeOperation
const BLEND_MAP = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  'soft-light': 'soft-light',
  'hard-light': 'hard-light',
  'color-burn': 'color-burn',
  'color-dodge': 'color-dodge',
  darken: 'darken',
  lighten: 'lighten',
  difference: 'difference',
};

async function drawBackgroundImage(ctx, bgParams, w, h) {
  const img = new Image();
  img.src = bgParams.imageUrl;
  await new Promise((res) => { img.onload = res; img.onerror = res; });

  const scale = bgParams.scale ?? 1.0;
  const fit = bgParams.fit;
  const imgAspect = img.width / img.height;
  const canvasAspect = w / h;

  let dw, dh;
  if (fit === 'cover') {
    if (imgAspect > canvasAspect) { dh = h; dw = dh * imgAspect; }
    else { dw = w; dh = dw / imgAspect; }
  } else if (fit === 'contain') {
    if (imgAspect > canvasAspect) { dw = w; dh = dw / imgAspect; }
    else { dh = h; dw = dh * imgAspect; }
  } else {
    dw = w; dh = h;
  }
  dw *= scale;
  dh *= scale;

  ctx.save();
  ctx.globalAlpha = bgParams.opacity;
  ctx.globalCompositeOperation = BLEND_MAP[bgParams.blendMode] ?? 'source-over';
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.restore();
}

async function drawSVGToCanvas(ctx, svgEl, w, h) {
  const svgClone = svgEl.cloneNode(true);
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.setAttribute('width', w);
  svgClone.setAttribute('height', h);
  svgClone.removeAttribute('class');

  // Parse current pan + zoom from SVG inline style
  const transformStr = svgEl.style.transform || '';
  const txMatch = transformStr.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
  const sMatch = transformStr.match(/scale\(([^)]+)\)/);
  const tx = txMatch ? parseFloat(txMatch[1]) : 0;
  const ty = txMatch ? parseFloat(txMatch[2]) : 0;
  const s = sMatch ? parseFloat(sMatch[1]) : 1;

  // Remove CSS transform from clone — we'll apply it via canvas
  svgClone.style.transform = '';
  svgClone.style.transformOrigin = '';

  const svgStr = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const svgImg = new Image();
    svgImg.src = svgUrl;
    await new Promise((res) => { svgImg.onload = res; svgImg.onerror = res; });

    // Replicate CSS: transform-origin center, then translate(tx,ty) scale(s)
    const cx = w / 2;
    const cy = h / 2;
    ctx.save();
    ctx.translate(cx + tx, cy + ty);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    ctx.drawImage(svgImg, 0, 0, w, h);
    ctx.restore();
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export default function ExportJPGButton({ inline = false }) {
  const { fontName, centerlines, previewText } = useFontStore();
  const [exporting, setExporting] = useState(false);

  const canExport = Object.keys(centerlines).length > 0 && previewText;

  async function handleExportJPG() {
    const containerEl = document.getElementById('preview-container');
    const svgEl = document.getElementById('skeletype-preview-svg');
    if (!containerEl) return;

    setExporting(true);
    try {
      const rect = containerEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;
      const w = rect.width;
      const h = rect.height;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      // 1. Background color
      const { bgColor, backgroundImageParams } = useFontStore.getState();
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      // 2. Background image
      if (backgroundImageParams.enabled && backgroundImageParams.imageUrl) {
        await drawBackgroundImage(ctx, backgroundImageParams, w, h);
      }

      // 3. SVG with current pan + zoom
      if (svgEl) {
        await drawSVGToCanvas(ctx, svgEl, w, h);
      }

      // 4. Download
      const url = canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fontName || 'skeletype'}_preview.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setExporting(false);
    }
  }

  if (!canExport) return null;

  if (inline) {
    return (
      <button
        onClick={handleExportJPG}
        disabled={exporting}
        className="shrink-0 px-3 py-1.5 text-xs font-medium bg-gray-800 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {exporting ? '...' : 'jpg export'}
      </button>
    );
  }

  return (
    <button
      onClick={handleExportJPG}
      disabled={exporting}
      className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
    >
      {exporting ? '저장 중...' : 'Export JPG (screen)'}
    </button>
  );
}
