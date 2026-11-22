import { useCallback, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

// Gamit: const toast = useToasts(); toast.success("..."); toast.error("...");
// Ibutang <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} /> sa page.
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (tone, text) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, tone, text }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return useMemo(
    () => ({ toasts, dismiss, success: (t) => push("success", t), error: (t) => push("error", t) }),
    [toasts, dismiss, push]
  );
}

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(92vw,22rem)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex animate-fade-in items-start gap-2.5 rounded-xl border bg-white px-3.5 py-3 text-sm shadow-pop ${
            t.tone === "error" ? "border-red-200 text-red-800" : "border-brand-200 text-navy-800"
          }`}
        >
          {t.tone === "error" ? (
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
          ) : (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-600" />
          )}
          <span className="min-w-0 flex-1">{t.text}</span>
          <button onClick={() => onDismiss(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}