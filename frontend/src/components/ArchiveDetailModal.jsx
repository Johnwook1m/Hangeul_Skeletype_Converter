import { useEffect, useState } from 'react';
import { getArchiveDetail } from '../api/client';

export default function ArchiveDetailModal({ archive, onClose }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    getArchiveDetail(archive.id).then(setDetail).catch(() => {});
  }, [archive.id]);

  const date = new Date(archive.created_at).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

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
        {/* Preview image — larger */}
        <div className="w-full overflow-hidden bg-gray-900">
          <img
            src={archive.preview_image_url}
            alt={`${archive.author_name}'s artwork`}
            className="w-full object-contain"
          />
        </div>

        {/* Info — compact */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <p className="text-xs font-semibold text-white shrink-0">{archive.author_name}</p>
            <p className="text-[10px] text-gray-400 truncate">
              {archive.font_name} · {date}
            </p>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-1 shrink-0">
                {features.map((f) => (
                  <span
                    key={f}
                    className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-white/10 text-gray-300 leading-none"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
