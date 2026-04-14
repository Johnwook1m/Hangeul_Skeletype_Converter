import { useEffect, useState } from 'react';
import { getArchiveDetail } from '../api/client';

async function downloadImage(url, filename) {
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export default function ArchiveDetailModal({ archive, onClose }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    getArchiveDetail(archive.id).then(setDetail).catch(() => {});
  }, [archive.id]);

  const features = detail?.features_used ?? archive.features_used ?? [];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-gray-800 rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — top right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors text-xs active:scale-90"
        >
          ✕
        </button>

        {/* Preview image */}
        <div className="w-full overflow-hidden bg-gray-900">
          <img
            src={archive.preview_image_url}
            alt={`${archive.author_name}'s artwork`}
            className="w-full object-contain"
          />
        </div>

        {/* Info */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {archive.author_name} / {archive.font_name}
            </p>
            {features.length > 0 && (
              <p className="text-[10px] text-gray-400 truncate mt-0.5">
                {features.join(', ')}
              </p>
            )}
          </div>
          {/* Download — arrow icon */}
          <button
            onClick={() => downloadImage(archive.preview_image_url, `${archive.author_name}_${archive.font_name}.jpg`)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors active:scale-90 shrink-0"
            title="Download"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v8M3 6.5l3.5 3.5 3.5-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 12h11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
