import { useEffect, useRef } from 'react';
import GlyphPreview from './components/GlyphPreview';
import FontUpload from './components/FontUpload';
import BottomBar from './components/BottomBar';
import useFontStore from './stores/fontStore';
import { uploadFont, getGlyphs } from './api/client';
import './index.css';

const DEMO_TEXT = 'Upload a font first\n폰트를 먼저 업로드하세요\n@skele.type';

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

    // Load pre-computed centerlines from static JSON (fast path for demo)
    const clRes = await fetch('/demo-centerlines.json');
    if (!clRes.ok) return;
    const clData = await clRes.json();
    const entries = Object.entries(clData);
    store.setExtractionStatus({ status: 'running', current: 0, total: entries.length, currentGlyph: '', errors: [] });
    for (const [glyphName, centerlineData] of entries) {
      store.setCenterline(glyphName, centerlineData);
    }
    store.setExtractionStatus({ status: 'done', current: entries.length, total: entries.length });
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
        title="Toggle background theme"
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
