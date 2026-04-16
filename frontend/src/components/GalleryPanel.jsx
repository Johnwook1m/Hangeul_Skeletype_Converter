import { useState, useEffect, useCallback } from 'react';
import { getArchives } from '../api/client';
import ArchiveDetailModal from './ArchiveDetailModal';

const PAGE_SIZE = 20;

function ArchiveRow({ archive, onClick }) {
  const date = new Date(archive.created_at).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Seoul',
  });

  return (
    <button
      onClick={() => onClick(archive)}
      className="w-full text-left cursor-pointer group"
    >
      {/* Full-width image */}
      <div className="w-full overflow-hidden rounded-2xl bg-gray-300">
        <img
          src={archive.preview_image_url}
          alt={archive.author_name}
          className="w-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
          loading="lazy"
        />
      </div>

      {/* Info below image */}
      <div className="px-1 pt-1.5 pb-3">
        <p className="text-[12px] font-medium text-gray-700 truncate leading-tight">{archive.author_name}</p>
        <p className="text-[10px] text-gray-400 truncate mt-0.5 leading-tight">
          {archive.font_name} · {date}
        </p>
      </div>
    </button>
  );
}

export default function GalleryPanel({ onClose }) {
  const [archives, setArchives] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const data = await getArchives(p, PAGE_SIZE);
      setArchives((prev) => (p === 1 ? data.items : [...prev, ...data.items]));
      setTotal(data.total);
      setPage(p);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const hasMore = archives.length < total;

  return (
    <>
      <div
        className="fixed top-12 right-4 z-50 w-[300px] pointer-events-auto select-none flex flex-col"
        style={{
          background: '#e5e7eb',
          borderRadius: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          maxHeight: 'calc(95vh - 120px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 shrink-0">
          <span className="text-[12px] text-gray-500 tracking-wide font-medium">Archives</span>
          <div className="flex items-center gap-1.5">
            {total > 0 && (
              <span className="text-[10px] text-gray-400">{total} artwork{total !== 1 ? 's' : ''}</span>
            )}
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 text-[11px] leading-none cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-gray-400/40 mb-1 shrink-0" />

        {/* Scrollable list */}
        <div className="overflow-y-auto flex-1 pb-2 px-2.5">
          {archives.length === 0 && !loading && (
            <p className="text-[10px] text-gray-400 text-center py-8 px-4">
              No archives yet. Be the first to archive an artwork!
            </p>
          )}

          {archives.map((a) => (
            <ArchiveRow key={a.id} archive={a} onClick={setSelected} />
          ))}

          {loading && (
            <p className="text-[10px] text-gray-400 text-center py-4">Loading...</p>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center mt-1 pb-1">
              <button
                onClick={() => load(page + 1)}
                className="px-3 py-1 text-[10px] font-medium rounded-full bg-gray-300 text-gray-600 hover:bg-gray-400/50 transition-colors cursor-pointer"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <ArchiveDetailModal archive={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
