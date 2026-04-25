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
    console.error('Demo font initialization failed:', err?.message ?? err);
  }
}

function SkeletypeLogo({ onClick, isDark }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-30 opacity-100 hover:opacity-60 transition-all active:scale-90 cursor-pointer"
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

const CHANGELOG = [
  { date: '16/04/2026', en: 'Automatic backup added for archived works after saving.', kr: '저장 후 아카이브된 작업물이 자동으로 백업됩니다.' },
  { date: '14/04/2026', en: 'Archive & Gallery launched. Save your results and browse work submitted by others.', kr: '아카이브 & 갤러리가 출시되었습니다. 결과물을 저장하고 다른 사용자의 작업을 탐색할 수 있습니다.' },
  { date: '13/04/2026', en: 'Background image support added with position, rotation, blend mode, and Duotone controls per layer.', kr: '배경 이미지 기능이 추가되었습니다. 레이어별로 위치, 회전, 블렌드 모드, 듀오톤을 조정할 수 있습니다.' },
  { date: '08/04/2026', en: 'Mix mode introduced. Blend between two uploaded fonts to explore in-between letterforms.', kr: 'Mix 모드가 추가되었습니다. 두 폰트 간 블렌딩으로 중간 형태를 탐색할 수 있습니다.' },
  { date: '29/03/2026', en: 'Layer system redesigned. Each layer now has independent parameters and effects.', kr: '레이어 시스템이 개편되었습니다. 이제 각 레이어에 독립적인 파라미터와 이펙트를 적용할 수 있습니다.' },
  { date: '02/03/2026', en: 'Skeletype launched. Upload any Hanguel font file to automatically extract its centerlines. Five visual effects available: Branch, Connection, Decorator, Slant, and OffsetPath.', kr: 'Skeletype이 출시되었습니다. 한글 폰트 파일을 업로드하면 중심선이 자동으로 추출되며, Branch, Connection, Decorator, Slant, OffsetPath 다섯 가지 시각 효과를 제공합니다.' },
];

function AboutPanel({ onClose, onClosingStart }) {
  const [active, setActive] = useState(false);
  const [lang, setLang] = useState('en'); // 'en' | 'kr'
  const [textVisible, setTextVisible] = useState(true);
  const [containerW, setContainerW] = useState(window.innerWidth);
  const scrollRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => setActive(true));
    function onKeyDown(e) { if (e.key === 'Escape') handleClose(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Measure scroll container width for responsive layout sizing
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setContainerW(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function handleClose() {
    setActive(false);
    onClosingStart?.();
    setTimeout(onClose, 400);
  }

  // Compute pixel sizes matching the CSS clamp values (used for maxWidth layout)
  const clamp = (min, vwPct, max) => Math.min(max, Math.max(min, containerW * vwPct / 100));
  const paddingPx = clamp(32, 5.58, 84);
  const colGapPx  = clamp(20, 3.1, 47);
  const col2WPx   = clamp(100, 14.03, 212);
  const labelWPx  = containerW * 0.25 - paddingPx;
  const bodyMaxW  = containerW - 2 * paddingPx - labelWPx - colGapPx;

  const kr = lang === 'kr';

  return (
    <div
      className="fixed inset-0 z-[100]"
      style={{
        opacity: active ? 1 : 0,
        backdropFilter: active ? 'blur(12px)' : 'blur(0px)',
        WebkitBackdropFilter: active ? 'blur(12px)' : 'blur(0px)',
        transition: 'opacity 0.4s ease, backdrop-filter 0.4s ease, -webkit-backdrop-filter 0.4s ease',
      }}
      onClick={handleClose}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div style={{ position: 'absolute', inset: 0, background: '#FF5714', borderRadius: '80px', filter: 'blur(50px)' }} />
      </div>

      <div
        ref={scrollRef}
        className="relative z-10 h-full overflow-y-auto"
        onClick={(e) => { if (e.target !== e.currentTarget) e.stopPropagation(); }}
        style={{
          paddingTop: 'clamp(32px, 5.15vw, 78px)',
          paddingLeft: 'clamp(32px, 5.58vw, 84px)',
          paddingRight: 'clamp(32px, 5.58vw, 84px)',
          paddingBottom: '35px',
          fontWeight: 400,
          fontFamily: "'Pretendard', sans-serif",
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        <div style={{ opacity: textVisible ? 1 : 0, transition: 'opacity 0.18s ease' }}>
        {(() => {
          const labelW = 'calc(25vw - clamp(32px, 5.58vw, 84px))';
          const col2W  = 'clamp(100px, 14.03vw, 212px)';
          const colGap = 'clamp(20px, 3.1vw, 47px)';
          const fsLabel = 'clamp(16px, 2.31vw, 35px)';
          const fsBody  = kr ? 'clamp(12px, 1.51vw, 23px)' : 'clamp(13px, 1.59vw, 24px)';
          const lhLabel = 1.25;
          const lhBody  = kr ? 1.6 : 1.47;

          return (
            <>
              {/* Intro + EN/KR toggle — baseline-aligned in one row */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'clamp(97px, 12.55vw, 190px)' }}>
                <p className="text-white" style={{ fontSize: kr ? 'clamp(15px, 2.19vw, 33px)' : 'clamp(16px, 2.31vw, 35px)', lineHeight: kr ? 1.575 : 1.5, margin: 0, maxWidth: '72%', wordBreak: 'keep-all' }}>
                  {kr
                    ? 'Skeletype은 한글 글리프의 중심선을 추출한 뒤, 이를 다양한 방식으로 변형하고 확장할 수 있게 하는 웹 기반 도구입니다. 사용자는 폰트 파일을 업로드해 중심선을 자동으로 추출하고, 여러 시각 효과와 파라미터를 적용해 새로운 형태의 결과물을 만들 수 있습니다.'
                    : 'Skeletype is a web-based tool that extracts and transforms the centerlines of Hanguel glyphs in various ways. Upload a font file to automatically extract centerlines, apply effects, and generate new forms and visual outcomes.'
                  }
                </p>
                <div style={{ flexShrink: 0, display: 'flex', gap: '0.5em', paddingLeft: '1em' }} onClick={e => e.stopPropagation()}>
                  {['en', 'kr'].map(v => (
                    <button
                      key={v}
                      onClick={() => {
                        if (v === lang) return;
                        setTextVisible(false);
                        setTimeout(() => { setLang(v); setTextVisible(true); }, 180);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        fontSize: 'clamp(16px, 2.31vw, 35px)',
                        fontFamily: 'inherit',
                        fontWeight: 400,
                        opacity: lang === v ? 1 : 0.3,
                        cursor: 'pointer',
                        padding: 0,
                        letterSpacing: '0.05em',
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Credit By */}
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 'clamp(32px, 5.29vw, 80px)' }}>
                <div style={{ width: labelW, flexShrink: 0 }}>
                  <span className="text-white" style={{ fontSize: fsLabel, lineHeight: lhLabel }}>
                    {kr ? '크레딧' : 'Credit By'}
                  </span>
                </div>
                <div className="text-white" style={{ fontSize: 'clamp(13px, 1.59vw, 24px)', lineHeight: lhBody, marginLeft: colGap, wordBreak: kr ? 'keep-all' : 'normal' }}>
                  {kr
                    ? <><a href="https://www.instagram.com/joelkim.82/" className="no-underline hover:underline transition-all" target="_blank" rel="noopener noreferrer">김종욱</a>, 박장호</>
                    : <><a href="https://www.instagram.com/joelkim.82/" className="no-underline hover:underline transition-all" target="_blank" rel="noopener noreferrer">Jongwook Kim</a>, Jangho Park</>
                  }
                </div>
              </div>

              {/* License */}
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 'clamp(32px, 5.29vw, 80px)' }}>
                <div style={{ width: labelW, flexShrink: 0 }}>
                  <span className="text-white" style={{ fontSize: fsLabel, lineHeight: lhLabel }}>
                    {kr ? '라이선스' : 'License'}
                  </span>
                </div>
                <div className="text-white" style={{ fontSize: fsBody, lineHeight: lhBody, marginLeft: colGap, flex: 1, maxWidth: Math.round(bodyMaxW * 0.97), wordBreak: kr ? 'keep-all' : 'normal' }}>
                  {kr ? (
                    <>
                      <p>이 도구는 AutoTrace, OpenType.js, FontTools를 기반으로 합니다.</p>
                      <p style={{ marginTop: `${lhBody}em` }}>
                        Skeletype은 개인 및 상업적 목적 등 모든 용도로 무료로 사용하실 수 있습니다. 크레딧 표기는 필수가 아니지만, 해주신다면 감사히 여기겠습니다. 이 프로젝트는 별도의 보증 없이 독립적으로 운영되므로, 간헐적인 서비스 중단이나 예기치 않은 동작이 발생할 수 있습니다. 이로 인해 발생하는 문제에 대해 제작자는 책임을 지지 않습니다.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>This tool is built on AutoTrace, OpenType.js, and FontTools.</p>
                      <p style={{ marginTop: `${lhBody}em` }}>
                        Skeletype is free to use for any purpose, personal or commercial. Credit is welcome but not required. This is an independent project maintained without guarantees. Occasional downtime or unexpected behavior may occur, and the creators bear no liability for any resulting issues.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Change Log */}
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 'clamp(32px, 5.29vw, 80px)' }}>
                <div style={{ width: labelW, flexShrink: 0 }}>
                  <span className="text-white" style={{ fontSize: fsLabel, lineHeight: lhLabel }}>
                    {kr ? '업데이트' : 'Change Log'}
                  </span>
                </div>
                <div style={{ flex: 1, marginLeft: colGap, display: 'flex', flexDirection: 'column', gap: 'clamp(30px, 4.96vw, 75px)' }}>
                  {CHANGELOG.map(({ date, en, kr: krText }, i) => (
                    <div key={i} style={{ display: 'flex' }}>
                      <div style={{ width: col2W, flexShrink: 0, color: 'white', fontSize: fsBody, lineHeight: lhBody }}>
                        {date}
                      </div>
                      <div className="text-white" style={{ flex: 1, fontSize: fsBody, lineHeight: lhBody, maxWidth: Math.round(bodyMaxW * 0.80), wordBreak: kr ? 'keep-all' : 'normal' }}>
                        {kr ? krText : en}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <div style={{ width: labelW, flexShrink: 0 }}>
                  <span className="text-white" style={{ fontSize: fsLabel, lineHeight: lhLabel }}>
                    {kr ? '연락' : 'Contact'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: colGap, gap: 'clamp(4px, 1.36vw, 20px)' }}>
                  <a href="mailto:johnwkim82@gmail.com" className="text-white no-underline hover:underline transition-all" style={{ fontSize: fsBody, lineHeight: lhBody, width: 'fit-content' }}>Mail</a>
                  <a href="https://www.instagram.com/skele.type/" target="_blank" rel="noopener noreferrer" className="text-white no-underline hover:underline transition-all" style={{ fontSize: fsBody, lineHeight: lhBody, width: 'fit-content' }}>instagram</a>
                  <a href="https://www.are.na/jongwook-kim/skele-type" target="_blank" rel="noopener noreferrer" className="text-white no-underline hover:underline transition-all" style={{ fontSize: fsBody, lineHeight: lhBody, width: 'fit-content' }}>Are.na</a>
                </div>
              </div>

              <img
                src="/skeletype%20logo.png"
                alt=""
                style={{ display: 'block', width: '100%', marginTop: 'clamp(32px, 5.29vw, 80px)' }}
              />

              <div className="text-white pointer-events-none text-center"
                style={{ fontSize: 'clamp(10px, 0.86vw, 13px)', lineHeight: 1.6, opacity: 0.6, fontWeight: 400, marginTop: 'clamp(16px, 2.48vw, 38px)' }}>
                {kr ? (
                  <>
                    <p>저작권으로 보호된 서체의 무단 변환 또는 배포에 대한 책임은 전적으로 사용자에게 있으며, 제작자는 이에 대해 책임을 지지 않습니다.</p>
                    <p>© 2026 skeletype. All Rights Reserved.</p>
                  </>
                ) : (
                  <>
                    <p>Users are solely responsible for any unauthorized conversion or distribution of copyrighted typefaces; the creators assume no liability.</p>
                    <p>© 2026 skeletype. All Rights Reserved.</p>
                  </>
                )}
              </div>

            </>
          );
        })()}
        </div>
      </div>
    </div>
  );
}


function MixToggleButton() {
  const mixMode = useFontStore((s) => s.mixMode);
  const setMixMode = useFontStore((s) => s.setMixMode);
  const [open, setOpen] = useState(false);

  function handleClose() {
    setOpen(false);
    setMixMode(false);
  }

  function handleClick() {
    const next = !open;
    setOpen(next);
    if (next) setMixMode(true);
    else setMixMode(false);
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`px-2.5 h-6 flex items-center text-[12px] font-medium rounded-full transition-all active:scale-95 cursor-pointer ${
          mixMode ? 'bg-[#FF5714] text-white' : 'bg-[#e5e7eb] text-[#333333] hover:bg-[#d5d7db]'
        }`}
      >
        Mix
      </button>
      {open && (
        <>
          <MixPanel onClose={handleClose} />
        </>
      )}
    </>
  );
}

function BackgroundImageLayer({ img }) {
  const filterParts = [
    img.hue !== 0          ? `hue-rotate(${img.hue}deg)` : '',
    img.saturation !== 100 ? `saturate(${img.saturation}%)` : '',
    img.brightness !== 100 ? `brightness(${img.brightness}%)` : '',
    img.contrast !== 100   ? `contrast(${img.contrast}%)` : '',
    img.grayscale > 0      ? `grayscale(${img.grayscale}%)` : '',
  ].filter(Boolean);

  const hexToRgb = (hex) => ({
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  });
  const duotoneFilterId = `duotone-${img.id}`;
  let cssFilter = filterParts.join(' ') || 'none';
  if (img.duotoneEnabled) {
    cssFilter = (filterParts.join(' ') + ` url(#${duotoneFilterId})`).trim();
  }
  const sh = hexToRgb(img.duotoneShadow || '#000000');
  const hi = hexToRgb(img.duotoneHighlight || '#ffffff');

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ mixBlendMode: img.blendMode, opacity: img.opacity }}
    >
      {img.duotoneEnabled && (
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id={duotoneFilterId} colorInterpolationFilters="sRGB">
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncR type="table" tableValues={`${sh.r} ${hi.r}`} />
                <feFuncG type="table" tableValues={`${sh.g} ${hi.g}`} />
                <feFuncB type="table" tableValues={`${sh.b} ${hi.b}`} />
              </feComponentTransfer>
            </filter>
          </defs>
        </svg>
      )}
      <img
        src={img.imageUrl}
        alt=""
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${img.x}%), calc(-50% + ${img.y}%)) rotate(${img.rotation}deg) scale(${img.scale})`,
          width: '100%',
          height: '100%',
          objectFit: img.fit,
          filter: cssFilter,
        }}
      />
    </div>
  );
}

function App() {
  const fontId = useFontStore((s) => s.fontId);
  const bgColor = useFontStore((s) => s.bgColor);
  const theme = useFontStore((s) => s.theme);
  const toggleTheme = useFontStore((s) => s.toggleTheme);
  const backgroundImages = useFontStore((s) => s.backgroundImages);
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

  useEffect(() => {
    window.history.pushState({ skeletype: true }, '');
    const handlePopState = () => {
      window.history.pushState({ skeletype: true }, '');
      if (useFontStore.getState().fontId) {
        const ok = window.confirm('작업 중인 내용이 초기화됩니다.\n페이지를 새로 시작하시겠습니까?');
        if (ok) window.location.reload();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function handleLogoClick() {
    window.location.reload();
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative"
      style={{ background: bgColor }}>
      {/* Full-viewport background image layers — behind all UI */}
      {backgroundImages.filter(img => img.enabled && img.imageUrl).map(img => (
        <BackgroundImageLayer key={img.id} img={img} />
      ))}

      {/* Logo — top center, resets to home */}
      <SkeletypeLogo onClick={handleLogoClick} isDark={isDark} />

      {/* Full-screen preview area — pb-[20%] shifts visual center 10% above screen center */}
      <div className="w-full h-full pt-[52px] pb-[120px]">
        <GlyphPreview large />
      </div>

      {/* Theme toggle switch - top left (폰트 로드 후에만 표시) */}
      {fontId && (
        <div className="fixed top-4 left-4 z-30 flex items-center">
          <button onClick={toggleTheme} className="cursor-pointer active:scale-95 transition-transform">
            <div
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: '#e5e7eb' }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full transition-all shadow-sm"
                style={{
                  background: '#333333',
                  left: isDark ? '24px' : '4px',
                }}
              />
            </div>
          </button>
        </div>
      )}

      {/* Mix + Gallery + About button — top right */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-0">
        <button
          id="archives-btn"
          onClick={() => setShowGallery((v) => !v)}
          className={`px-2.5 h-6 flex items-center text-[12px] font-medium rounded-full transition-all active:scale-95 cursor-pointer ${
            showGallery ? 'bg-[#FF5714] text-white' : 'bg-[#e5e7eb] text-[#333333] hover:bg-[#d5d7db]'
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
            className={`w-10 h-6 rounded-full flex items-center justify-center gap-0.5 transition-colors ${
              aboutButtonActive ? 'bg-[#FF5714]' : 'bg-[#e5e7eb] hover:bg-[#d5d7db]'
            }`}
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

      {/* Full-screen dropzone overlay — rendered before gallery so gallery panels appear on top */}
      <FontUpload />

      {/* Gallery panel + click-outside overlay */}
      {showGallery && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowGallery(false)} />
          <GalleryPanel onClose={() => setShowGallery(false)} />
        </>
      )}

      {/* Layer panel — left fixed, shown after font loaded */}
      {fontId && <LayerPanel />}

      {/* Bottom menu bar */}
      <BottomBar />
    </div>
  );
}

export default App;
