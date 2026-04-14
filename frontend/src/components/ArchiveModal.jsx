import { useState, useRef } from 'react';
import useFontStore from '../stores/fontStore';
import { submitArchive } from '../api/client';
import { extractFeaturesUsed, buildSettingsSnapshot } from '../utils/archiveUtils';
import { capturePreviewBlob } from '../utils/capturePreview';

export default function ArchiveModal({ onClose, onSuccess }) {
  const fontName = useFontStore((s) => s.fontName);
  const [authorName, setAuthorName] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'error' | 'flying' | 'done'
  const [errorMsg, setErrorMsg] = useState('');
  const [flyTransform, setFlyTransform] = useState(null); // { tx, ty } when flying
  const cardRef = useRef(null);

  const storeState = useFontStore.getState();
  const featuresUsed = extractFeaturesUsed(storeState);

  async function handleSubmit() {
    if (!authorName.trim() || status === 'loading' || status === 'flying') return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const previewBlob = await capturePreviewBlob(0.95);
      const snapshot = buildSettingsSnapshot(storeState);
      const result = await submitArchive({
        authorName: authorName.trim(),
        fontName,
        featuresUsed,
        settingsSnapshot: snapshot,
        previewBlob,
      });
      // Calculate translation from modal center → Archives button center
      const cardRect = cardRef.current?.getBoundingClientRect();
      const archivesEl = document.getElementById('archives-btn');
      const archivesRect = archivesEl?.getBoundingClientRect();

      if (cardRect && archivesRect) {
        const cardCX = cardRect.left + cardRect.width / 2;
        const cardCY = cardRect.top + cardRect.height / 2;
        const archCX = archivesRect.left + archivesRect.width / 2;
        const archCY = archivesRect.top + archivesRect.height / 2;
        setFlyTransform({ tx: archCX - cardCX, ty: archCY - cardCY });
        setStatus('flying');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('archive-pulse'));
          onSuccess?.(result);
          onClose();
        }, 600);
      } else {
        // fallback: no animation
        onSuccess?.(result);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to archive. Try again.');
      setStatus('error');
    }
  }

  const isFlying = status === 'flying';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={!isFlying ? onClose : undefined}
    >
      {/* Overlay — fades out when flying */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{
          opacity: isFlying ? 0 : 1,
          transition: isFlying ? 'opacity 0.4s ease' : 'none',
        }}
      />

      {/* Modal card — flies to Archives button on submit */}
      <div
        ref={cardRef}
        className="relative bg-gray-800 rounded-2xl p-6 w-[320px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: isFlying && flyTransform
            ? `translate(${flyTransform.tx}px, ${flyTransform.ty}px) scale(0.12)`
            : 'translate(0, 0) scale(1)',
          opacity: isFlying ? 0 : 1,
          transition: isFlying
            ? 'transform 0.55s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.2s ease 0.35s'
            : 'none',
        }}
      >
        <h2 className="text-sm font-semibold text-white mb-4">Archive Artwork</h2>

        {/* Author name */}
        <label className="block text-xs text-gray-400 mb-1">Your name</label>
        <input
          type="text"
          maxLength={120}
          placeholder="e.g. Jane Kim"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          autoFocus
          className="w-full px-3 py-2 text-xs bg-gray-700 text-white rounded-xl border border-gray-600
                     focus:outline-none focus:border-[#FF5714] mb-4"
        />

        {/* Active effects chips */}
        {featuresUsed.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Effects active</p>
            <div className="flex flex-wrap gap-1.5">
              {featuresUsed.map((f) => (
                <span
                  key={f}
                  className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-700 text-gray-300"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Font name */}
        <p className="text-xs text-gray-500 mb-4">
          Font: <span className="text-gray-300">{fontName}</span>
        </p>

        {/* Error */}
        {status === 'error' && (
          <p className="text-xs text-red-400 mb-3">{errorMsg}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!authorName.trim() || status === 'loading' || status === 'flying'}
            className="px-4 py-1.5 text-xs font-medium rounded-full transition-colors disabled:opacity-50 bg-[#FF5714] text-white hover:bg-[#e04a10]"
          >
            {status === 'loading' ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}
