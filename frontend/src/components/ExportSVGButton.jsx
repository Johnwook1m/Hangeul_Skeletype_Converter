import useFontStore from '../stores/fontStore';

export default function ExportSVGButton({ inline = false }) {
  const { fontName, centerlines, previewText } = useFontStore();

  const canExport = Object.keys(centerlines).length > 0 && previewText;

  function handleExportSVG() {
    const svgEl = document.getElementById('skeletype-preview-svg');
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true);

    // Remove display-only transforms (pan, size scale)
    clone.style.transform = '';
    clone.style.transformOrigin = '';

    // Ensure proper SVG namespace
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Remove Tailwind class (not needed in exported SVG)
    clone.removeAttribute('class');

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);

    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fontName || 'skeletype'}_effects.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!canExport) return null;

  if (inline) {
    return (
      <button
        onClick={handleExportSVG}
        className="shrink-0 px-3 py-1.5 text-xs font-medium bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
      >
        svg export
      </button>
    );
  }

  return (
    <button
      onClick={handleExportSVG}
      className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
    >
      Export SVG (effects)
    </button>
  );
}
