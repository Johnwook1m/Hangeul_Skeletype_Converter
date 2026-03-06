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

function SkeletypeLogo({ onClick, color = '#1a1a1a' }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 opacity-50 hover:opacity-90 transition-opacity cursor-pointer"
      title="Reset to home"
    >
      <svg width="56" height="36" viewBox="0 0 74 48" fill={color} xmlns="http://www.w3.org/2000/svg">
        {/* S — top bar */}
        <rect x="8.5" y="11" width="22" height="5.5" rx="2.75" />
        {/* S — left dot */}
        <circle cx="5" cy="22" r="4" />
        {/* S — middle bar */}
        <rect x="9" y="27" width="13" height="5.5" rx="2.75" />
        {/* S — right dot */}
        <circle cx="22" cy="37.5" r="4" />
        {/* S — bottom bar */}
        <rect x="1.5" y="41.5" width="28" height="5.5" rx="2.75" />

        {/* period */}
        <circle cx="39" cy="37.5" r="4.5" />

        {/* T — top dot */}
        <circle cx="61" cy="3" r="3.5" />
        {/* T — top bar */}
        <rect x="45" y="11" width="32" height="5.5" rx="2.75" />
        {/* T — dot 1 */}
        <circle cx="61" cy="22" r="3.5" />
        {/* T — dot 2 */}
        <circle cx="61" cy="31" r="3.5" />
        {/* T — dot 3 */}
        <circle cx="61" cy="40" r="3.5" />
      </svg>
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
      <SkeletypeLogo onClick={handleLogoClick} color={isDark ? '#ffffff' : '#1a1a1a'} />

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
