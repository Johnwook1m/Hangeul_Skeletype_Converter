import { useEffect, useRef } from 'react';
import GlyphPreview from './components/GlyphPreview';
import FontUpload from './components/FontUpload';
import BottomBar from './components/BottomBar';
import useFontStore from './stores/fontStore';
import { uploadFont, getGlyphs, extractCenterlines } from './api/client';
import './index.css';

const DEMO_TEXT = 'Upload a font first\n서체를 먼저 업로드하세요';

async function loadDemoFont() {
  try {
    const response = await fetch('/NotoSansKR-Regular.otf');
    if (!response.ok) return;
    const blob = await response.blob();
    const file = new File([blob], 'NotoSansKR-Regular.otf', { type: 'font/otf' });

    const data = await uploadFont(file);
    const store = useFontStore.getState();
    store.setFont(data);
    store.setIsDemo(true);
    store.setFontBlobUrl(URL.createObjectURL(file));

    const glyphData = await getGlyphs(data.font_id);
    store.setGlyphs(glyphData.glyphs);
    store.setPreviewText(DEMO_TEXT);
    store.setGlyphSize(80);
    store.clearGlyphSelection();
    store.selectGlyphsByText(DEMO_TEXT);

    const glyphNames = Array.from(useFontStore.getState().selectedGlyphs);
    if (glyphNames.length === 0) return;

    store.setExtractionStatus({
      status: 'running',
      current: 0,
      total: glyphNames.length,
      currentGlyph: '',
      errors: [],
    });

    const stream = await extractCenterlines(data.font_id, glyphNames, false);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const lines = text.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'progress') {
            store.setExtractionStatus({ current: event.index, currentGlyph: event.glyph });
          } else if (event.type === 'complete') {
            store.setExtractionStatus({ current: event.index, currentGlyph: event.glyph });
            store.setCenterline(event.glyph, {
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
          } else if (event.type === 'done') {
            store.setExtractionStatus({ status: 'done', current: event.success, total: event.total });
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error('Demo font initialization failed:', err);
  }
}

function App() {
  const theme = useFontStore((s) => s.theme);
  const toggleTheme = useFontStore((s) => s.toggleTheme);
  const fontId = useFontStore((s) => s.fontId);
  const bgColor = useFontStore((s) => s.bgColor);
  const isDark = theme === 'dark';
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    loadDemoFont();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden relative"
      style={{ background: bgColor }}>
      {/* Full-screen preview area — pb-[20%] shifts visual center 10% above screen center */}
      <div className="w-full h-full pb-[5%]">
        <GlyphPreview large />
      </div>

      {/* Theme toggle switch - top right (폰트 로드 후에만 표시) */}
      {fontId && <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 cursor-pointer"
        title="배경 테마 전환"
      >
        <div
          className="relative w-10 h-5 rounded-full transition-colors"
          style={{ background: isDark ? '#444' : '#ccc' }}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm"
            style={{
              background: isDark ? '#1a1a1a' : '#ffffff',
              border: `2px solid ${isDark ? '#888' : '#999'}`,
              left: isDark ? '22px' : '2px',
            }}
          />
        </div>
      </button>}

      {/* Full-screen dropzone overlay */}
      <FontUpload />

      {/* Bottom menu bar */}
      <BottomBar />
    </div>
  );
}

export default App;
