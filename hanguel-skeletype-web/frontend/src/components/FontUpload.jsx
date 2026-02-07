import { useState, useRef } from 'react';
import { uploadFont, getGlyphs } from '../api/client';
import useFontStore from '../stores/fontStore';

export default function FontUpload() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const { setFont, setGlyphs, setFontBlobUrl } = useFontStore();

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

      // Create blob URL for font preview (to show original glyphs)
      const fontBlobUrl = URL.createObjectURL(file);
      setFontBlobUrl(fontBlobUrl);

      // Load all glyphs (Korean fonts can have 11,172+ glyphs)
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
    } catch (err) {
      setError(err.response?.data?.detail || '폰트 업로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onClick={() => fileRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-colors
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${loading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".ttf,.otf,.woff"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {loading ? (
        <div className="text-gray-500">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-400 border-t-blue-500 rounded-full mb-2" />
          <p>폰트 분석 중...</p>
        </div>
      ) : (
        <div>
          <p className="text-lg font-medium text-gray-600 mb-1">
            폰트 파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-sm text-gray-400">.ttf, .otf, .woff</p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}
