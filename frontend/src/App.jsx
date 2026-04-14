import { useEffect, useRef, useState } from 'react';
import GlyphPreview from './components/GlyphPreview';
import FontUpload from './components/FontUpload';
import BottomBar from './components/BottomBar';
import LayerPanel from './components/LayerPanel';
import MixPanel from './components/MixPanel';
import GalleryPanel from './components/GalleryPanel';
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
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 opacity-100 hover:opacity-60 transition-all active:scale-90 cursor-pointer"
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

function AboutPanel({ onClose, onClosingStart }) {
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
    onClosingStart?.();
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
        style={{ padding: '60px clamp(48px, 12vw, 200px) 120px' }}
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
        <div className="text-white text-sm opacity-70 absolute bottom-8 left-0 right-0 text-center px-8" style={{ lineHeight: 1.3 }}>
          <p style={{ margin: '0 auto 0.2em' }}>
            사용자가 본 툴을 이용해 저작권이 있는 서체를 무단으로 변환·배포함으로써 발생하는 모든 책임은 사용자 본인에게 있으며, 제작자는 이에 대해 어떠한 책임도 지지 않습니다.
          </p>
          <p style={{ margin: '0 auto 0.4em' }}>
            The user is solely responsible for any unauthorized conversion or distribution of copyrighted typefaces using this tool; the creators assume no liability.
          </p>
          <p>© 2026 skeletype by Jongwook Kim. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}

function MixToggleButton() {
  const mixMode = useFontStore((s) => s.mixMode);
  const setMixMode = useFontStore((s) => s.setMixMode);
  const [open, setOpen] = useState(false);

  function handleClick() {
    const next = !open;
    setOpen(next);
    if (next) setMixMode(true);
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`px-2.5 h-6 flex items-center text-[12px] font-medium rounded-full transition-all active:scale-95 cursor-pointer ${
          mixMode ? 'bg-[#FF5714] text-white' : 'bg-[#e5e7eb] text-gray-500 hover:bg-[#d5d7db]'
        }`}
      >
        Mix
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <MixPanel onClose={() => setOpen(false)} />
        </>
      )}
    </>
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
  const [aboutButtonActive, setAboutButtonActive] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [archivePulse, setArchivePulse] = useState(false);

  useEffect(() => {
    function onPulse() {
      setArchivePulse(true);
      setTimeout(() => setArchivePulse(false), 500);
    }
    window.addEventListener('archive-pulse', onPulse);
    return () => window.removeEventListener('archive-pulse', onPulse);
  }, []);

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
      {fontId && (
        <div className="fixed top-4 left-4 z-50 flex items-center">
          <button onClick={toggleTheme} className="cursor-pointer active:scale-95 transition-transform">
            <div
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: '#e5e7eb' }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full transition-all shadow-sm"
                style={{
                  background: '#444',
                  left: isDark ? '24px' : '4px',
                }}
              />
            </div>
          </button>
        </div>
      )}

      {/* Mix + Gallery + About button — top right */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-8">
        <button
          id="archives-btn"
          onClick={() => setShowGallery((v) => !v)}
          className={`px-2.5 h-6 flex items-center text-[12px] font-medium rounded-full transition-all active:scale-95 cursor-pointer ${
            showGallery ? 'bg-[#FF5714] text-white' : 'bg-[#e5e7eb] text-gray-500 hover:bg-[#d5d7db]'
          }`}
          style={{
            transform: archivePulse ? 'scale(1.15)' : 'scale(1)',
            transition: archivePulse
              ? 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'transform 0.3s ease, background-color 0.15s ease',
          }}
        >
          Archives
        </button>
        {fontId && <MixToggleButton />}
        <button
          onClick={() => { setShowAbout(true); setAboutButtonActive(true); }}
          className="cursor-pointer active:scale-95 transition-all"
        >
          <div
            className="w-10 h-6 rounded-full flex items-center justify-center gap-0.5 transition-colors"
            style={{ background: aboutButtonActive ? '#FF5714' : '#e5e7eb' }}
          >
            {[0,1,2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full"
                style={{ background: aboutButtonActive ? '#fff' : '#333' }} />
            ))}
          </div>
        </button>
      </div>

      {/* About panel */}
      {showAbout && <AboutPanel onClose={() => setShowAbout(false)} onClosingStart={() => setAboutButtonActive(false)} />}

      {/* Gallery panel + click-outside overlay */}
      {showGallery && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowGallery(false)} />
          <GalleryPanel onClose={() => setShowGallery(false)} />
        </>
      )}

      {/* Layer panel — left fixed, shown after font loaded */}
      {fontId && <LayerPanel />}

      {/* Full-screen dropzone overlay */}
      <FontUpload />

      {/* Bottom menu bar */}
      <BottomBar />
    </div>
  );
}

export default App;
