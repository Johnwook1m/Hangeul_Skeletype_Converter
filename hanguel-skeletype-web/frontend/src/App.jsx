import { useState } from 'react';
import useFontStore from './stores/fontStore';
import FontUpload from './components/FontUpload';

import GlyphPreview from './components/GlyphPreview';
import ExtractButton from './components/ExtractButton';

import ExportButton from './components/ExportButton';
import './index.css';

function BottomBar() {
  const {
    fontId,
    fontName,
    strokeParams,
    setStrokeParams,
    showFlesh,
    setShowFlesh,
    glyphSize,
    setGlyphSize,
    selectGlyphsByText,
    setPreviewText,
    glyphs,
  } = useFontStore();

  const [text, setText] = useState('');

  const hasGlyphs = glyphs.length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    selectGlyphsByText(text);
    setPreviewText(text);
  }

  if (!fontId) return null;

  return (
    <>
      {/* Bottom Menu Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-3 px-3 pointer-events-none">
        <div className="pointer-events-auto bg-gray-200/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-1 shadow-lg max-w-screen-xl overflow-x-auto">

          {/* Font info + Load */}
          <button
            onClick={() => useFontStore.getState().reset()}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-gray-300 hover:bg-gray-400 rounded-full transition-colors"
            title="다른 폰트 불러오기"
          >
            {fontName || 'Load Font'}
          </button>

          <Divider />

          {/* Text Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={hasGlyphs ? '문구 입력' : '폰트를 먼저 업로드'}
              disabled={!hasGlyphs}
              className="w-32 px-3 py-1.5 text-xs border border-gray-300 rounded-full bg-white focus:outline-none focus:border-purple-400 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!hasGlyphs || !text.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-gray-300 hover:bg-gray-400 rounded-full disabled:opacity-40 transition-colors"
            >
              선택
            </button>
          </form>

          <Divider />

          {/* Show Flesh */}
          <button
            onClick={() => setShowFlesh(!showFlesh)}
            className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              showFlesh
                ? 'bg-purple-500 text-white'
                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
            }`}
          >
            {showFlesh ? 'Flesh' : 'Flesh'}
          </button>

          {/* Size */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-500">Size</span>
            <input
              type="range"
              min={100}
              max={400}
              step={10}
              value={glyphSize}
              onChange={(e) => setGlyphSize(+e.target.value)}
              className="w-16 accent-purple-500 h-1"
            />
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-500">Stroke</span>
            <input
              type="range"
              min={0}
              max={300}
              step={1}
              value={strokeParams.width}
              onChange={(e) => setStrokeParams({ width: +e.target.value })}
              className="w-16 accent-purple-500 h-1"
            />
          </div>

          {/* Cap & Join */}
          <select
            value={strokeParams.cap}
            onChange={(e) => setStrokeParams({ cap: e.target.value })}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-full bg-white shrink-0"
          >
            <option value="butt">Butt</option>
            <option value="round">Round</option>
            <option value="square">Square</option>
          </select>
          <select
            value={strokeParams.join}
            onChange={(e) => setStrokeParams({ join: e.target.value })}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-full bg-white shrink-0"
          >
            <option value="miter">Miter</option>
            <option value="round">Round</option>
            <option value="bevel">Bevel</option>
          </select>

          <Divider />

          {/* Extract & Export */}
          <ExtractButton inline />
          <ExportButton inline />

        </div>
      </div>
    </>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-400/50 mx-1 shrink-0" />;
}

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#1a1a1a] relative">
      {/* Full-screen preview area */}
      <div className="w-full h-full">
        <GlyphPreview large />
      </div>

      {/* Full-screen dropzone overlay */}
      <FontUpload />

      {/* Bottom menu bar (only when font loaded) */}
      <BottomBar />
    </div>
  );
}

export default App;
