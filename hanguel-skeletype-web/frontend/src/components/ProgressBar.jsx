import useFontStore from '../stores/fontStore';

export default function ProgressBar() {
  const { extraction } = useFontStore();

  if (extraction.status === 'idle') return null;

  const percent =
    extraction.total > 0
      ? Math.round((extraction.current / extraction.total) * 100)
      : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          {extraction.status === 'running'
            ? `Testing: ${extraction.currentGlyph}`
            : 'Testing complete'}
        </span>
        <span>
          {extraction.current} / {extraction.total}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            extraction.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {extraction.errors.length > 0 && (
        <p className="text-xs text-red-500">
          {extraction.errors.length} glyph(s) failed
        </p>
      )}
    </div>
  );
}
