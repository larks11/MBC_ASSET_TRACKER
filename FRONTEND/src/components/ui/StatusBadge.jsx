import { STATUS_STYLES } from "../../utils/format.js";

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      {status || "—"}
    </span>
  );
}
