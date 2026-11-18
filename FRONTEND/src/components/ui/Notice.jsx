const TONES = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-brand-200 bg-brand-50 text-brand-700",
};

export default function Notice({ tone = "info", children, onClose }) {
  if (!children) return null;
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 rounded border px-3.5 py-2.5 text-sm ${TONES[tone]}`} role="status">
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} className="text-xs font-medium underline">
          Dismiss
        </button>
      )}
    </div>
  );
}
