import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FileText, Pencil, Plus, Trash2, X } from "lucide-react";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
};

// Kung walay gihatag nga icon, pilion base sa title
function autoIcon(title) {
  const t = String(title || "").toLowerCase();
  if (/delete|remove/.test(t)) return Trash2;
  if (/edit|update/.test(t)) return Pencil;
  if (/add|new|create/.test(t)) return Plus;
  return FileText;
}

export default function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  size = "lg",
  wide = false,
}) {
  // Escape = close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // I-lock ang scroll sa luyo samtang bukas ang modal
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const Icon = icon || autoIcon(title);
  const width = SIZES[wide ? "xl" : size] || SIZES.lg;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-[#003B25]/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative flex max-h-[92vh] w-full animate-scale-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${width}`}>
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-[#003B25] to-[#006B3C] px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
            <Icon size={18} />
          </span>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}