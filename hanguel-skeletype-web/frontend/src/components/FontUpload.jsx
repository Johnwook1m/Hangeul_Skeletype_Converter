import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFont, getGlyphs } from '../api/client';
import useFontStore from '../stores/fontStore';

export default function FontUpload() {
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const hideTimer = useRef(null);
  const dragCounter = useRef(0);
  const { fontId, setFont, setGlyphs, setFontBlobUrl } = useFontStore();

  // Clear timer on unmount
  useEffect(() => {
    return () => clearTimeout(hideTimer.current);
  }, []);

  // Window-level drag events to detect file dragging anywhere
  const handleWindowDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) {
      // Check if dragged items contain files
      if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setVisible(true);
        setDragging(true);
        clearTimeout(hideTimer.current);
      }
    }
  }, []);

  const handleWindowDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
      // If font is loaded, hide after leaving
      if (fontId) {
        setVisible(false);
      }
    }
  }, [fontId]);

  const handleWindowDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleWindowDrop = useCallback((e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [handleWindowDragEnter, handleWindowDragLeave, handleWindowDragOver, handleWindowDrop]);

  async function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['ttf', 'otf', 'woff'].includes(ext)) {
      setError('TTF, OTF, WOFF 파일만 지원합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await uploadFont(file);
      setFont(data);

      const fontBlobUrl = URL.createObjectURL(file);
      setFontBlobUrl(fontBlobUrl);

      const glyphData = await getGlyphs(data.font_id);
      setGlyphs(glyphData.glyphs);
      setVisible(false);
    } catch (err) {
      setError(err.response?.data?.detail || '폰트 업로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleOverlayClick() {
    if (loading) return;
    if (!fontId) {
      // No font loaded: click to select file
      fileRef.current?.click();
    } else {
      // Font loaded: click to dismiss
      setVisible(false);
    }
  }

  const isActive = visible || dragging;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={handleOverlayClick}
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        transition-opacity duration-300 cursor-pointer
        ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
    >
      {/* Subtle drag highlight border */}
      {dragging && (
        <div className="absolute inset-3 rounded-2xl border border-[#0cd0fc]/40 pointer-events-none transition-opacity duration-200" />
      )}

      {/* Content */}
      <div className="relative text-center z-10 select-none">
        <input
          ref={fileRef}
          type="file"
          accept=".ttf,.otf,.woff"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {loading ? (
          <div>
            <div className="animate-spin inline-block w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full mb-3" />
            <p className="text-sm font-light tracking-widest text-white/40">분석 중...</p>
          </div>
        ) : (
          <div>
            <p className={`text-sm font-light tracking-widest mb-1.5 transition-colors duration-200 ${dragging ? 'text-[#0cd0fc]' : 'text-white/40'}`}>
              {fontId ? '폰트 파일 업로드' : '폰트 파일 업로드'}
            </p>
            <p className="text-xs tracking-widest text-white/20">[.ttf, .otf, .woff]</p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-red-400/70 text-xs">{error}</p>
        )}
      </div>
    </div>
  );
}
