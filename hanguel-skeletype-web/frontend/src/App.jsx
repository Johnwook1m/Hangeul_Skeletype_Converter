import GlyphPreview from './components/GlyphPreview';
import FontUpload from './components/FontUpload';
import BottomBar from './components/BottomBar';
import useFontStore from './stores/fontStore';
import './index.css';

function App() {
  const theme = useFontStore((s) => s.theme);
  const toggleTheme = useFontStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <div className="w-screen h-screen overflow-hidden relative"
      style={{ background: isDark ? '#1a1a1a' : '#ffffff' }}>
      {/* Full-screen preview area */}
      <div className="w-full h-full">
        <GlyphPreview large />
      </div>

      {/* Theme toggle switch - top right */}
      <button
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
      </button>

      {/* Full-screen dropzone overlay */}
      <FontUpload />

      {/* Bottom menu bar (only when font loaded) */}
      <BottomBar />
    </div>
  );
}

export default App;
