import useFontStore from '../stores/fontStore';
import { drawBackgroundImages } from './canvasHelpers';

/**
 * Captures the current preview as a JPEG Blob.
 *
 * Canvas = full viewport (window.innerWidth × window.innerHeight) so that
 * zoomed content visible outside the preview-container (into the header /
 * bottom-bar areas via SVG overflow:visible) is fully included in the capture.
 */
export async function capturePreviewBlob(quality = 0.85) {
  const containerEl = document.getElementById('preview-container');
  const svgEl = document.getElementById('skeletype-preview-svg');
  if (!containerEl) throw new Error('Preview container not found');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const containerRect = containerEl.getBoundingClientRect();

  // Use the full viewport so zoom overflow (into header/footer) is captured
  const W = window.innerWidth;
  const H = window.innerHeight;

  const { bgColor, backgroundImages } = useFontStore.getState();

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Fill entire viewport with background color
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  // Background images are now full-viewport
  if (backgroundImages.length > 0) {
    await drawBackgroundImages(ctx, backgroundImages, W, H);
  }

  if (svgEl) {
    await drawSVGExpanded(ctx, svgEl, containerRect);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

/**
 * Renders the SVG with a large padded viewBox to capture all overflow content
 * (strokes, effects, etc.), then composites into ctx at the correct viewport
 * position — including the full CSS pan/zoom transform.
 *
 * The CSS transformOrigin is 'center center' of the SVG element, which sits
 * at containerRect.{left,top} in viewport space. We use those coordinates as
 * the zoom pivot so the canvas exactly matches what the browser renders.
 */
async function drawSVGExpanded(ctx, svgEl, containerRect) {
  const w = containerRect.width;
  const h = containerRect.height;

  const vbParts = (svgEl.getAttribute('viewBox') || '').split(' ').map(Number);
  const [vbX, vbY, vbW, vbH] = vbParts.length === 4 ? vbParts : [0, 0, w, h];

  // Scale from SVG user units to CSS pixels (matches browser's xMidYMid meet)
  const scale = Math.min(w / vbW, h / vbH);

  // Large fixed padding so stroke/effect overflow is always captured.
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

  // Letterbox: when content is width-limited, xMidYMid meet vertically centres
  // it inside the container. The offset must be added so capture matches screen.
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

    // CSS transformOrigin:'center center' is the center of the SVG element.
    // In viewport coordinates that is (containerRect.left + w/2, containerRect.top + h/2).
    const cx = containerRect.left + w / 2;
    const cy = containerRect.top  + h / 2;

    ctx.save();
    ctx.translate(cx + tx, cy + ty);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    // Align the expanded image so its viewBox content lands at the same
    // on-screen position (containerRect.top + letterboxTop).
    ctx.translate(containerRect.left, containerRect.top + letterboxTop - viewboxStartY);
    ctx.drawImage(img, 0, 0, w, expH);
    ctx.restore();
  } finally {
    URL.revokeObjectURL(url);
  }
}
