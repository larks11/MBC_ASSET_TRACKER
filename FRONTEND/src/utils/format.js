export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" }) : "—";

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-PH", { year: "numeric", month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" })
    : "—";

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
  // Service requests
  Approved: "bg-sky-50 text-sky-700 ring-sky-600/20",
  "In Progress": "bg-blue-50 text-blue-700 ring-blue-600/20",
  "On Hold": "bg-orange-50 text-orange-800 ring-orange-600/25",
};

export const STATUS_COLORS = {
  Active: "#0f5a37",
  Available: "#4fa877",
  Damaged: "#dc2626",
  "For Repair": "#d97706",
  Disposed: "#64748b",
};

export const SR_STATUS_COLORS = {
  Pending: "#d97706",
  Approved: "#0ea5e9",
  "In Progress": "#2563eb",
  "On Hold": "#ea580c",
  Completed: "#0f5a37",
  Rejected: "#dc2626",
};

export const PRIORITY_STYLES = {
  Low: "bg-slate-100 text-slate-600 ring-slate-500/20",
  Medium: "bg-brand-50 text-brand-700 ring-brand-600/20",
  High: "bg-amber-50 text-amber-800 ring-amber-600/25",
  Urgent: "bg-red-600 text-white ring-red-700/30",
};

export const PRIORITY_COLORS = { Low: "#64748b", Medium: "#4fa877", High: "#d97706", Urgent: "#dc2626" };

export const TXN_LABELS = {
  CheckoutRequest: "Checkout request",
  Deploy: "Deploy",
  Return: "Return",
  TurnOver: "Turn over",
  Disposal: "Disposal",
};