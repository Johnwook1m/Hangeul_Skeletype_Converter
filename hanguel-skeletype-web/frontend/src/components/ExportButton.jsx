import { useState } from 'react';
import { exportFont } from '../api/client';
import useFontStore from '../stores/fontStore';

export default function ExportButton() {
  const { fontId, fontName, strokeParams, centerlines } = useFontStore();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const centerlineCount = Object.keys(centerlines).length;

  async function handleExport(format) {
    if (!fontId || centerlineCount === 0) return;

    setExporting(true);
    setError(null);

    try {
      const blob = await exportFont(fontId, {
        stroke_width: strokeParams.width,
        stroke_cap: strokeParams.cap,
        stroke_join: strokeParams.join,
        format,
      });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fontName}_Skeletype.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.detail || '폰트 생성에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  }

  if (centerlineCount === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => handleExport('otf')}
          disabled={exporting}
          className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
        >
          {exporting ? '생성 중...' : `Export .otf (${centerlineCount})`}
        </button>
        <button
          onClick={() => handleExport('ttf')}
          disabled={exporting}
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm font-medium"
        >
          {exporting ? '생성 중...' : `Export .ttf (${centerlineCount})`}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
