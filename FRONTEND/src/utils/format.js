export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" }) : "—";

export const fmtNumber = (n) => Number(n || 0).toLocaleString("en-PH");

export const STATUS_STYLES = {
  Active: "bg-brand-600 text-white ring-brand-700/30",
  Available: "bg-brand-50 text-brand-700 ring-brand-600/20",
  Damaged: "bg-red-50 text-red-700 ring-red-600/20",
  "For Repair": "bg-amber-50 text-amber-800 ring-amber-600/25",
  Disposed: "bg-slate-100 text-slate-600 ring-slate-500/20",
  Pending: "bg-amber-50 text-amber-800 ring-amber-600/25",
  Completed: "bg-brand-50 text-brand-700 ring-brand-600/20",
  Rejected: "bg-red-50 text-red-700 ring-red-600/20",
  Repaired: "bg-brand-50 text-brand-700 ring-brand-600/20",
};

export const STATUS_COLORS = {
  Active: "#0f5a37",
  Available: "#4fa877",
  Damaged: "#dc2626",
  "For Repair": "#d97706",
  Disposed: "#64748b",
};

export const TXN_LABELS = {
  CheckoutRequest: "Checkout request",
  Deploy: "Deploy",
  Return: "Return",
  TurnOver: "Turn over",
  Disposal: "Disposal",
};