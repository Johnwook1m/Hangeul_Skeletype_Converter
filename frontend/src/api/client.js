import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export async function uploadFont(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/font/upload', formData);
  return res.data;
}

export async function getGlyphs(fontId) {
  const res = await api.get(`/font/${fontId}/glyphs`);
  return res.data;
}

export function getGlyphPreviewUrl(fontId, glyphName) {
  return `/api/font/${fontId}/glyph/${encodeURIComponent(glyphName)}/preview`;
}

export async function getCenterline(fontId, glyphName) {
  const res = await api.get(
    `/font/${fontId}/centerline/${encodeURIComponent(glyphName)}`
  );
  return res.data;
}

export async function extractCenterlines(fontId, glyphNames = null, all = false) {
  const body = all ? { all: true } : { glyph_names: glyphNames };
  const res = await fetch(`/api/font/${fontId}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.body;
}

/**
 * Run extraction stream and call onComplete(glyphName, data) for each completed glyph.
 * Returns { success, total, errors }.
 */
export async function runExtraction(fontId, glyphNames, onComplete, onProgress) {
  const stream = await extractCenterlines(fontId, glyphNames, false);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const errors = [];
  let success = 0;
  let total = glyphNames?.length ?? 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split('\n').filter((l) => l.startsWith('data: '));
    for (const line of lines) {
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'progress' && onProgress) {
          onProgress(event.index, event.glyph, total);
        } else if (event.type === 'complete') {
          onComplete(event.glyph, {
            paths: event.paths,
            view_box: event.view_box,
            glyph_height: event.glyph_height,
            glyph_width: event.glyph_width,
            advance_width: event.advance_width,
            raster_scale: event.raster_scale,
            bounds: event.bounds,
            outline: event.outline,
            ascender: event.ascender,
            descender: event.descender,
            font_height: event.font_height,
          });
        } else if (event.type === 'error') {
          errors.push({ glyph: event.glyph, message: event.message });
        } else if (event.type === 'done') {
          success = event.success;
          total = event.total;
        }
      } catch { /* skip */ }
    }
  }
  return { success, total, errors };
}

export async function exportFont(fontId, params) {
  const res = await api.post(`/font/${fontId}/export`, params, {
    responseType: 'blob',
  });
  return res.data;
}


export async function healthCheck() {
  const res = await api.get('/health');
  return res.data;
}

export async function submitArchive({ authorName, fontName, featuresUsed, settingsSnapshot, previewBlob }) {
  const form = new FormData();
  form.append('author_name', authorName);
  form.append('font_name', fontName);
  form.append('features_used', JSON.stringify(featuresUsed));
  form.append('settings_snapshot', JSON.stringify(settingsSnapshot));
  form.append('preview_image', previewBlob, 'preview.jpg');
  const res = await api.post('/archive', form);
  return res.data;
}

export async function getArchives(page = 1, pageSize = 20) {
  const res = await api.get('/archives', { params: { page, page_size: pageSize } });
  return res.data;
}

export async function getArchiveDetail(id) {
  const res = await api.get(`/archives/${id}`);
  return res.data;
}
