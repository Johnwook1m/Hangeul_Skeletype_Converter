import { useEffect, useRef, useState } from 'react';
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
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 opacity-100 hover:opacity-60 transition-opacity cursor-pointer"
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

function AboutPanel({ onClose }) {
  const [active, setActive] = useState(false);
  const strokeColor = useFontStore((s) => s.strokeParams.strokeColor);

  useEffect(() => {
    requestAnimationFrame(() => setActive(true));
    function onKeyDown(e) { if (e.key === 'Escape') handleClose(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleClose() {
    setActive(false);
    setTimeout(onClose, 400);
  }

  return (
    <div
      className="fixed inset-0 z-[100]"
      style={{
        opacity: active ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
      onClick={handleClose}
    >
      {/* Background layer: colored rectangle with blurred corners */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: strokeColor,
            borderRadius: '80px',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* Content layer above background */}
      <div
        className="relative z-10 h-full overflow-y-auto flex flex-col justify-center"
        style={{ padding: '80px clamp(48px, 12vw, 200px)' }}
      >
        <table className="border-collapse mx-auto" style={{ width: '100%', maxWidth: 1000, fontSize: '1.45rem' }} onClick={(e) => e.stopPropagation()}>
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '78%' }} />
          </colgroup>
          <tbody>
            <tr className="align-top">
              <td className="pb-12 text-white whitespace-nowrap pt-1">INFO</td>
              <td className="pb-12 pt-1">
                <div className="text-white leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                  <p>SkeleType은 한글 서체 제작을 도와주는 웹 기반 도구입니다. 사용자가 폰트 파일을 업로드하면 한글 글리프의 중심선을 자동으로 추출하고, 다양한 시각 효과를 적용할 수 있습니다. 추출된 중심선을 바탕으로 형태를 자유롭게 변형하고, 여러 파라미터를 조정해 새로운 시각적 결과물을 만들어낼 수 있습니다.</p>
                  <p style={{ marginTop: '0.6em' }}>SkeleType is a web-based tool for designing Hanguel typefaces. Simply upload a font file to automatically extract the skeletons of Hanguel glyphs and apply various visual effects. You can then freely transform shapes and fine-tune parameters to generate unique visual results.</p>
                </div>
              </td>
            </tr>
            <tr className="align-top">
              <td className="pb-12 text-white whitespace-nowrap pt-1">CONTACT</td>
              <td className="pb-12 pt-1">
                <div className="flex gap-8 flex-wrap" style={{}}>
                  <a href="mailto:johnwkim82@gmail.com" className="text-white hover:underline transition-all" target="_blank" rel="noopener noreferrer">
                    johnwkim82@gmail.com
                  </a>
                  <a href="https://www.instagram.com/skele.type" className="text-white hover:underline transition-all" target="_blank" rel="noopener noreferrer">
                    @skele.type <span style={{ verticalAlign: '-0.1em' }}>↗</span>
                  </a>
                </div>
              </td>
            </tr>
            <tr className="align-top">
              <td className="text-white whitespace-nowrap pt-1">CREATED BY</td>
              <td className="pt-1">
                <a href="https://www.instagram.com/joelkim.82/" className="text-white hover:underline transition-all" target="_blank" rel="noopener noreferrer">Jongwook Kim</a><span className="text-white">, Jangho Park</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="text-white text-sm opacity-70 absolute bottom-8 left-0 right-0 text-center">© 2026 skeletype by Jongwook Kim. All Rights Reserved.</p>
      </div>
    </div>
  );
}

function App() {
  const theme = useFontStore((s) => s.theme);
  const toggleTheme = useFontStore((s) => s.toggleTheme);
  const fontId = useFontStore((s) => s.fontId);
  const bgColor = useFontStore((s) => s.bgColor);
  const isDark = theme === 'dark';
  const initDone = useRef(false);
  const [showAbout, setShowAbout] = useState(false);

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
      <div className="w-full h-full pt-[52px] pb-[120px]">
        <GlyphPreview large />
      </div>

      {/* Theme toggle switch - top left (폰트 로드 후에만 표시) */}
      {fontId && <button
        onClick={toggleTheme}
        className="fixed top-4 left-4 z-50 cursor-pointer"
      >
        <div
          className="relative w-10 h-5 rounded-full transition-colors"
          style={{ background: isDark ? '#444' : '#ddd' }}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm"
            style={{
              background: isDark ? '#fff' : '#444',
              left: isDark ? '22px' : '2px',
            }}
          />
        </div>
      </button>}

      {/* About button — top right */}
      <button
        onClick={() => setShowAbout(true)}
        className="fixed top-4 right-4 z-50 cursor-pointer"
      >
        <div className="w-10 h-6 rounded-full flex items-center justify-center gap-0.5"
          style={{ background: isDark ? '#444' : '#ddd' }}>
          {[0,1,2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full"
              style={{ background: isDark ? '#fff' : '#333' }} />
          ))}
        </div>
      </button>

      {/* About panel */}
      {showAbout && <AboutPanel onClose={() => setShowAbout(false)} />}

      {/* Full-screen dropzone overlay */}
      <FontUpload />

      {/* Bottom menu bar */}
      <BottomBar />
    </div>
  );
}

export default App;
