import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { assetApi } from "../../services/index.js";
import useDebounce from "../../hooks/useDebounce.js";
import StatusBadge from "./StatusBadge.jsx";

// Pilian sa asset: search + checkbox (o radio kung single)
export default function AssetPicker({ status, allow, selected, onChange, single = false }) {
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    assetApi
      .list({ limit: 100, sort: "assetId", category: "Non-Consumable", status: status || undefined, search: q || undefined })
      .then((res) => live && setRows(allow ? res.data.filter(allow) : res.data))
      .catch(() => live && setRows([]))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [q, status]);

  const isOn = (a) => selected.some((s) => s._id === a._id);
  const toggle = (a) => {
    if (single) return onChange(isOn(a) ? [] : [a]);
    onChange(isOn(a) ? selected.filter((s) => s._id !== a._id) : [...selected, a]);
  };

  return (
    <div className="rounded border border-line">
      <div className="relative border-b border-line p-2">
        <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search asset ID, brand, model, serial..."
          className="w-full rounded border border-line py-1.5 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <ul className="max-h-56 divide-y divide-line/70 overflow-y-auto">
        {loading && <li className="px-3 py-4 text-center text-sm text-slate-500">Loading...</li>}
        {!loading && rows.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">No assets found.</li>}
        {rows.map((a) => (
          <li key={a._id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-brand-50/50">
              <input type={single ? "radio" : "checkbox"} checked={isOn(a)} onChange={() => toggle(a)} className="accent-brand-600" />
              <span className="tabular w-28 shrink-0 font-medium text-navy-800">{a.assetId}</span>
              <span className="min-w-0 flex-1 truncate text-slate-600">
                {a.assetType} · {[a.brand, a.model].filter(Boolean).join(" ")}
              </span>
              <StatusBadge status={a.status} />
            </label>
          </li>
        ))}
      </ul>
      <div className="border-t border-line bg-slate-50 px-3 py-1.5 text-xs text-slate-500">{selected.length} selected</div>
    </div>
  );
}