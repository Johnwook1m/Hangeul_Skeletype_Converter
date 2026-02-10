import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFont, getGlyphs } from '../api/client';
import useFontStore from '../stores/fontStore';

export default function FontUpload() {
  const [visible, setVisible] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const hideTimer = useRef(null);
  const dragCounter = useRef(0);
  const { fontId, setFont, setGlyphs, setFontBlobUrl } = useFontStore();

  // Auto-hide after 5 seconds on initial load (only when no font loaded)
  useEffect(() => {
    if (!fontId) {
      hideTimer.current = setTimeout(() => {
        setVisible(false);
      }, 5000);
    }
    return () => clearTimeout(hideTimer.current);
  }, [fontId]);

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

      const allGlyphs = [];
      let page = 1;
      const perPage = 500;

      while (true) {
        const glyphData = await getGlyphs(data.font_id, page, perPage);
        allGlyphs.push(...glyphData.glyphs);
        if (allGlyphs.length >= glyphData.total) break;
        page++;
      }

      setGlyphs(allGlyphs);
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
        transition-opacity duration-500 cursor-pointer
        ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
    >
      {/* Dropzone border */}
      <div
        className={`
          absolute m-3 rounded-2xl
          border-2 border-dashed transition-colors duration-300
          ${dragging ? 'border-[#0cd0fc]' : 'border-gray-500'}
        `}
        style={{ inset: '8px' }}
      />

      {/* Content */}
      <div className="relative text-center z-10">
        <input
          ref={fileRef}
          type="file"
          accept=".ttf,.otf,.woff"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {loading ? (
          <div className="text-white">
            <div className="animate-spin inline-block w-10 h-10 border-3 border-white/30 border-t-white rounded-full mb-4" />
            <p className="text-xl font-light">폰트 분석 중...</p>
          </div>
        ) : (
          <div>
            <p className={`text-xl font-light mb-2 ${dragging ? 'text-[#0cd0fc]' : 'text-gray-300'}`}>
              {fontId ? '새 폰트를 드래그하세요' : '폰트 파일을 드래그하거나 클릭하여 업로드'}
            </p>
            <p className="text-sm text-gray-500">.ttf, .otf, .woff</p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}
