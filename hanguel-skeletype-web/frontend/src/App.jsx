import { useState } from 'react';
import useFontStore from './stores/fontStore';
import FontUpload from './components/FontUpload';
import GlyphGrid from './components/GlyphGrid';
import GlyphPreview from './components/GlyphPreview';
import StrokeControls from './components/StrokeControls';
import ExtractButton from './components/ExtractButton';
import ProgressBar from './components/ProgressBar';
import ExportButton from './components/ExportButton';
import './index.css';

function TextInputBar() {
  const { selectGlyphsByText, setPreviewText, glyphs } = useFontStore();
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const res = selectGlyphsByText(text);
    setPreviewText(text); // Set the text to preview
    setResult(res);
  }

  const hasGlyphs = glyphs.length > 0;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={hasGlyphs ? "추출할 문구를 입력하세요 (예: 안녕하세요)" : "폰트를 먼저 업로드하세요"}
          disabled={!hasGlyphs}
          className="flex-1 px-5 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={!hasGlyphs || !text.trim()}
          className="px-6 py-3 text-lg font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          선택
        </button>
      </div>
      {result && (
        <div className="mt-2 text-sm flex gap-4">
          {result.found.length > 0 && (
            <span className="text-green-600">
              ✓ {result.found.length}개 글리프 선택됨
            </span>
          )}
          {result.notFound.length > 0 && (
            <span className="text-red-500">
              ✗ 폰트에 없음: {result.notFound.slice(0, 10).join('')}
              {result.notFound.length > 10 && `... 외 ${result.notFound.length - 10}개`}
            </span>
          )}
        </div>
      )}
    </form>
  );
}

function App() {
  const { fontId, fontName, glyphCount, centerlines, selectedGlyphs } = useFontStore();
  const centerlineCount = Object.keys(centerlines).length;
  const [showGlyphPanel, setShowGlyphPanel] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Hanguel Skeletype
              </h1>
              {fontId && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {fontName} · {glyphCount.toLocaleString()}개 글리프 · {centerlineCount}개 추출됨
                </p>
              )}
            </div>
            {fontId && (
              <button
                onClick={() => useFontStore.getState().reset()}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                다른 폰트
              </button>
            )}
          </div>
        </div>
      </header>

      {!fontId ? (
        /* Upload Screen */
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            <FontUpload />
            <p className="text-center text-gray-400 text-sm mt-6">
              폰트 파일을 업로드하여 중심선(스켈레톤)을 추출하고,
              <br />
              스트로크 파라미터를 조정해 새로운 서체를 만들어 보세요.
            </p>
          </div>
        </main>
      ) : (
        /* Main Editor - Skeletext Style */
        <main className="flex-1 flex flex-col min-h-0">
          {/* Text Input Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
            <div className="max-w-screen-2xl mx-auto">
              <TextInputBar />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex min-h-0">
            {/* Large Preview Area */}
            <div className="flex-1 p-4 min-h-0">
              <div className="bg-white rounded-2xl shadow-sm h-full flex flex-col">
                {/* Preview Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {selectedGlyphs.size > 0
                        ? `${selectedGlyphs.size}개 선택됨`
                        : '글리프를 선택하세요'}
                    </span>
                    <ProgressBar />
                  </div>
                  <button
                    onClick={() => setShowGlyphPanel(!showGlyphPanel)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      showGlyphPanel
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {showGlyphPanel ? '그리드 숨기기' : '글리프 그리드'}
                  </button>
                </div>

                {/* Preview Content - Takes all remaining space */}
                <div className="flex-1 p-4 min-h-0">
                  <GlyphPreview large />
                </div>
              </div>
            </div>

            {/* Right Panel - Controls + Glyph Grid */}
            <div className={`bg-white border-l border-gray-200 shrink-0 flex flex-col transition-all duration-300 ${
              showGlyphPanel ? 'w-80' : 'w-64'
            }`}>
              {/* Controls */}
              <div className="p-4 border-b border-gray-100 space-y-3 shrink-0">
                <ExtractButton />
                <StrokeControls compact />
                <ExportButton />
              </div>

              {/* Glyph Grid (collapsible) */}
              {showGlyphPanel && (
                <div className="flex-1 overflow-hidden min-h-0">
                  <GlyphGrid compact />
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
