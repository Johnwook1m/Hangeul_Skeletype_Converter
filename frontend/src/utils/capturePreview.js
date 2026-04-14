import useFontStore from '../stores/fontStore';
import { drawBackgroundImages } from './canvasHelpers';

/**
 * Captures the current preview as a JPEG Blob.
 * The captured area is exactly the #preview-container dimensions (w × svgH).
 *
 * SVG overflow:visible content is handled by rendering a clone with a large
 * padded viewBox so all stroke/effect overflow is included, then the canvas
 * is kept at the original container size (not expanded).
 */
export async function capturePreviewBlob(quality = 0.85) {
  const containerEl = document.getElementById('preview-container');
  const svgEl = document.getElementById('skeletype-preview-svg');
  if (!containerEl) throw new Error('Preview container not found');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const containerRect = containerEl.getBoundingClientRect();
  const w = containerRect.width;
  const svgH = containerRect.height;

  const { bgColor, backgroundImages } = useFontStore.getState();

  // Canvas = exactly the preview-container dimensions (no extra bottom space)
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(svgH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, svgH);

  if (backgroundImages.length > 0) {
    await drawBackgroundImages(ctx, backgroundImages, w, svgH);
  }

  if (svgEl) {
    await drawSVGExpanded(ctx, svgEl, w, svgH);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

/**
 * Renders the SVG with a large padded viewBox to capture all overflow content
 * (strokes, effects, etc.), then draws only the portion that corresponds to the
 * original on-screen container area into ctx.
 */
async function drawSVGExpanded(ctx, svgEl, w, h) {
  const vbParts = (svgEl.getAttribute('viewBox') || '').split(' ').map(Number);
  const [vbX, vbY, vbW, vbH] = vbParts.length === 4 ? vbParts : [0, 0, w, h];

  // Scale from SVG user units to CSS pixels (matches browser's xMidYMid meet)
  const scale = Math.min(w / vbW, h / vbH);

  // Large fixed padding so stroke/effect overflow is always captured.
  // getBBox() often excludes stroke widths, so we use 2000 SVG units (>> svgPadding=300).
  const PAD = 2000;
  let padTop = PAD, padBottom = PAD;
  try {
    const bbox = svgEl.getBBox();
    padTop    = Math.max(PAD, Math.ceil(vbY - bbox.y) + 500);
    padBottom = Math.max(PAD, Math.ceil((bbox.y + bbox.height) - (vbY + vbH)) + 500);
  } catch (e) { /* getBBox not supported — use fixed PAD */ }

  const expVbY = vbY - padTop;
  const expVbH = vbH + padTop + padBottom;
  const expH   = Math.round(expVbH * scale);

  // Where the original viewBox content begins in the expanded render (px from top)
  const viewboxStartY = Math.round(padTop * scale);

  // On-screen the SVG uses xMidYMid meet: if content is width-limited, it is
  // vertically centred inside the container (letterbox bars above & below).
  // We must shift the canvas draw by the same amount so the capture matches
  // exactly what the user sees.
  const letterboxTop = Math.max(0, Math.round((h - vbH * scale) / 2));

  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', w);
  clone.setAttribute('height', expH);
  clone.setAttribute('viewBox', `${vbX} ${expVbY} ${vbW} ${expVbH}`);
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  clone.removeAttribute('class');
  clone.style.transform = '';
  clone.style.transformOrigin = '';

  const svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise((res) => { img.onload = res; img.onerror = res; });

    // Parse pan/zoom transform from the live SVG element
    const t   = svgEl.style.transform || '';
    const txM = t.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    const sM  = t.match(/scale\(([^)]+)\)/);
    const tx  = txM ? parseFloat(txM[1]) : 0;
    const ty  = txM ? parseFloat(txM[2]) : 0;
    const s   = sM  ? parseFloat(sM[1])  : 1;

    // Draw the expanded image offset so the viewbox portion (at viewboxStartY in the
    // expanded image) aligns with canvas y=0. Then apply the live pan/zoom transform.
    const cx = w / 2, cy = h / 2;
    ctx.save();
    ctx.translate(cx + tx, cy + ty);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    ctx.translate(0, letterboxTop - viewboxStartY); // align with on-screen xMidYMid meet centering
    ctx.drawImage(img, 0, 0, w, expH);
    ctx.restore();
  } finally {
    URL.revokeObjectURL(url);
  }
}
