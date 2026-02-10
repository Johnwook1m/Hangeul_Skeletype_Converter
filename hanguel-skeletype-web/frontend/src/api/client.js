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
