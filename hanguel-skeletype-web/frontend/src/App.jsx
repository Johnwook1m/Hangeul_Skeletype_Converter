import { useEffect, useRef } from 'react';
import GlyphPreview from './components/GlyphPreview';
import FontUpload from './components/FontUpload';
import BottomBar from './components/BottomBar';
import useFontStore from './stores/fontStore';
import './index.css';

const DEMO_TEXT = 'Upload a font first\n폰트를 먼저 업로드하세요\n@skele.type';

async function loadDemoFont() {
  try {
    // Load pre-computed centerlines + font metadata from static JSON
    const clRes = await fetch('/demo-centerlines.json');
    if (!clRes.ok) return;
    const clData = await clRes.json();

    const meta = clData._meta;
    const store = useFontStore.getState();

    // Set font metadata directly (no API call needed)
    store.setFont({
      font_id: meta.font_id,
      family_name: meta.family_name,
      units_per_em: meta.units_per_em,
      ascender: meta.ascender,
      descender: meta.descender,
      space_advance_width: meta.space_advance_width,
    });
    store.setIsDemo(true);
    store.setGlyphs(meta.glyphs);
    store.setPreviewText(DEMO_TEXT);
    store.setGlyphSize(80);
    store.clearGlyphSelection();
    store.selectGlyphsByText(DEMO_TEXT);

    // Load centerlines
    const entries = Object.entries(clData).filter(([k]) => k !== '_meta');
    store.setExtractionStatus({ status: 'running', current: 0, total: entries.length, currentGlyph: '', errors: [] });
    for (const [glyphName, centerlineData] of entries) {
      store.setCenterline(glyphName, centerlineData);
    }
    store.setExtractionStatus({ status: 'done', current: entries.length, total: entries.length });
  } catch (err) {
    console.error('Demo font initialization failed:', err);
  }
}

function SkeletypeLogo({ onClick, isDark }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 opacity-100 hover:opacity-60 transition-opacity cursor-pointer"
      title="Reset to home"
    >
      <img
        src="/logo.png"
        alt="Skeletype logo"
        height={32}
        style={{
          height: 32,
          width: 'auto',
          filter: isDark ? 'invert(1)' : 'none',
        }}
      />
    </button>
  );
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

  function handleLogoClick() {
    useFontStore.getState().reset();
    loadDemoFont();
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative"
      style={{ background: bgColor }}>
      {/* Logo — top center, resets to home */}
      <SkeletypeLogo onClick={handleLogoClick} isDark={isDark} />

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
