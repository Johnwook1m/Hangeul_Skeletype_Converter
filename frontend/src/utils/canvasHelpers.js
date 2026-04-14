// Canvas rendering helpers shared by ExportMenu and capturePreview

export const BLEND_MAP = {
  normal: 'source-over', multiply: 'multiply', screen: 'screen',
  overlay: 'overlay', 'soft-light': 'soft-light', 'hard-light': 'hard-light',
  'color-burn': 'color-burn', 'color-dodge': 'color-dodge',
  darken: 'darken', lighten: 'lighten', difference: 'difference',
};

export function hexToRgb(hex) {
  return { r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) };
}

export function buildFilterString(img) {
  return [
    img.hue !== 0          ? `hue-rotate(${img.hue}deg)` : '',
    img.saturation !== 100 ? `saturate(${img.saturation}%)` : '',
    img.brightness !== 100 ? `brightness(${img.brightness}%)` : '',
    img.contrast !== 100   ? `contrast(${img.contrast}%)` : '',
    img.grayscale > 0      ? `grayscale(${img.grayscale}%)` : '',
  ].filter(Boolean).join(' ') || 'none';
}

export async function applyDuotone(srcCanvas, shadow, highlight) {
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

export async function drawBackgroundImages(ctx, images, w, h) {
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

export async function drawSVGToCanvas(ctx, svgEl, w, h) {
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
