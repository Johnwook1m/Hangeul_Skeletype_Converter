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

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
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
  const sh = hexToRgb(shadow);
  const hi = hexToRgb(highlight);
  const offscreen = document.createElement('canvas');
  offscreen.width = srcCanvas.width;
  offscreen.height = srcCanvas.height;
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    data[i]     = Math.round(sh.r + (hi.r - sh.r) * lum);
    data[i + 1] = Math.round(sh.g + (hi.g - sh.g) * lum);
    data[i + 2] = Math.round(sh.b + (hi.b - sh.b) * lum);
    // data[i + 3] (alpha) unchanged
  }
  ctx.putImageData(imageData, 0, 0);
  return offscreen;
}

async function drawBackgroundImages(ctx, images, w, h) {
  for (const img of images) {
    if (!img.enabled || !img.imageUrl) continue;

    const el = new Image();
    el.src = img.imageUrl;
    await new Promise((res) => { el.onload = res; el.onerror = res; });

    const scale = img.scale ?? 1.0;
    const fit = img.fit;
    const imgAspect = el.width / el.height;
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

    // x/y offset (percent of canvas size, relative to center)
    const xOff = (img.x / 100) * w;
    const yOff = (img.y / 100) * h;
    const dx = (w - dw) / 2 + xOff;
    const dy = (h - dh) / 2 + yOff;

    // Render image with CSS filters via an intermediate canvas
    const filterStr = buildFilterString(img);

    // Draw to offscreen canvas with filters
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(dw);
    offscreen.height = Math.round(dh);
    const offCtx = offscreen.getContext('2d');
    if (filterStr !== 'none') {
      offCtx.filter = filterStr;
    }
    offCtx.drawImage(el, 0, 0, Math.round(dw), Math.round(dh));
    offCtx.filter = 'none';

    // Apply duotone via pixel manipulation if enabled
    let sourceToDraw = offscreen;
    if (img.duotoneEnabled) {
      sourceToDraw = await applyDuotone(offscreen, img.duotoneShadow || '#000000', img.duotoneHighlight || '#ffffff');
    }

    ctx.save();
    ctx.globalAlpha = img.opacity ?? 1.0;
    ctx.globalCompositeOperation = BLEND_MAP[img.blendMode] ?? 'source-over';

    // Apply rotation around image center
    if (img.rotation) {
      const cx = dx + dw / 2;
      const cy = dy + dh / 2;
      ctx.translate(cx, cy);
      ctx.rotate((img.rotation * Math.PI) / 180);
      ctx.drawImage(sourceToDraw, -dw / 2, -dh / 2, dw, dh);
    } else {
      ctx.drawImage(sourceToDraw, dx, dy, dw, dh);
    }

    ctx.restore();
  }
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

  svgClone.style.transform = '';
  svgClone.style.transformOrigin = '';

  const svgStr = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const svgImg = new Image();
    svgImg.src = svgUrl;
    await new Promise((res) => { svgImg.onload = res; svgImg.onerror = res; });

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
      const { bgColor, backgroundImages } = useFontStore.getState();
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      // 2. Background images (in order)
      if (backgroundImages.length > 0) {
        await drawBackgroundImages(ctx, backgroundImages, w, h);
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
      {exporting ? 'Saving...' : 'Export JPG (screen)'}
    </button>
  );
}
