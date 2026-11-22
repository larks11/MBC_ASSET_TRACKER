import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, ChevronLeft, ChevronRight, FileSpreadsheet,
  Loader2, PackageMinus, PackagePlus, Pencil, Printer, Search, Trash2, X,
} from "lucide-react";
import { assetApi, employeeApi } from "../services/index.js";
import { cellText, downloadCSV, printTable } from "../utils/exportClient.js";

const SUGGESTED_TYPES = ["Keyboard", "Mouse", "Cable", "Toner", "Ink", "Flash Drive", "Battery", "Headset", "Webcam", "Adapter"];
const NEW_ITEM = "__new__";
const TABS = [
  { id: "stocks", label: "Available Stocks" },
  { id: "added", label: "Added Items" },
  { id: "requests", label: "Requests" },
];

const fmtNum = (n) => Number(n || 0).toLocaleString();
const fmtDT = (d) =>
  d ? new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const itemLabel = (a) => [a?.assetType, a?.brand, a?.model].filter(Boolean).join(" ");

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#00A651] focus:outline-none focus:ring-4 focus:ring-[#00A651]/15";
const selectCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#00A651] focus:outline-none focus:ring-4 focus:ring-[#00A651]/15";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#006B3C] to-[#00A651] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#00A651]/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

const stockState = (a) => {
  const q = Number(a.quantity) || 0;
  const re = Number(a.reorderLevel) || 0;
  if (q <= 0) return "out";
  if (re > 0 && q <= re) return "low";
  return "ok";
};

const PILL = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  low: "bg-amber-50 text-amber-800 ring-amber-200",
  out: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  muted: "bg-slate-100 text-slate-600 ring-slate-200",
};
function Pill({ tone, children }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${PILL[tone]}`}>
      {children}
    </span>
  );
}

function ItemCell({ a }) {
  if (!a) return <span className="text-slate-400">—</span>;
  return (
    <div>
      <p className="font-medium text-slate-800">{a.assetType}</p>
      {(a.brand || a.model) && <p className="text-xs text-slate-500">{[a.brand, a.model].filter(Boolean).join(" ")}</p>}
    </div>
  );
}

function ModalShell({ title, icon: Icon, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-[#003B25]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-xl animate-scale-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#003B25] to-[#006B3C] px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white"><Icon size={18} /></span>
          <h2 className="flex-1 truncate text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div>
      </div>
    </div>
  );
}

function F({ label, required, className = "", children }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const ErrorBox = ({ text }) =>
  text ? (
    <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
      <AlertCircle size={18} className="mt-0.5 shrink-0" /> {text}
    </div>
  ) : null;

/* ------------------------------------------------------------------ */
/* Table: search, entries per page, sort, CSV, Print, pagination       */
/* ------------------------------------------------------------------ */
function ListTable({ title, rows, columns, loading, error, empty, defaultSort, onError }) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(defaultSort);

  const dataCols = columns.filter((c) => c.key !== "actions");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => dataCols.map((c) => String(cellText(c, r))).join(" ").toLowerCase().includes(q));
  }, [rows, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const val = (r) => (col.sortVal ? col.sortVal(r) : cellText(col, r));
    return [...filtered].sort((a, b) => {
      const x = val(a), y = val(b);
      const cmp = typeof x === "number" && typeof y === "number"
        ? x - y
        : String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort, columns]);

  const pages = Math.max(Math.ceil(sorted.length / limit), 1);
  const cur = Math.min(page, pages);
  const slice = sorted.slice((cur - 1) * limit, cur * limit);
  const from = sorted.length ? (cur - 1) * limit + 1 : 0;
  const to = Math.min(cur * limit, sorted.length);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const iconBtn = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-[#DDF8E9] hover:text-[#006B3C]";

  const doPrint = () => {
    try {
      printTable(title, columns, sorted);
    } catch (e) {
      onError?.(e.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>Show</span>
          <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className={`${selectCls} !py-1.5`} aria-label="Entries per page">
            {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
          </select>
          <span>entries</span>
          <div className="ml-2 flex gap-1.5">
            <button className={iconBtn} title="Download CSV (opens in Excel)" aria-label="Download CSV" onClick={() => downloadCSV(`${title.replace(/\s+/g, "-")}.csv`, columns, sorted)}>
              <FileSpreadsheet size={17} />
            </button>
            <button className={iconBtn} title="Print" aria-label="Print" onClick={doPrint}>
              <Printer size={17} />
            </button>
          </div>
        </div>
        <div className="relative sm:w-72">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search..." className={`${inputCls} pl-10`} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[#F8FAFC]">
            <tr>
              {columns.map((c) => {
                const active = sort.key === c.key;
                const SortIcon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th key={c.key} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${c.align === "right" ? "text-right" : "text-left"}`}>
                    {c.sortable === false || c.key === "actions" ? (
                      c.header
                    ) : (
                      <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1.5 hover:text-[#006B3C]">
                        {c.header} <SortIcon size={13} className={active ? "text-[#00A651]" : "text-slate-300"} />
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr><td colSpan={columns.length} className="py-14 text-center"><Loader2 className="mx-auto animate-spin text-[#00A651]" /></td></tr>
            ) : error ? (
              <tr><td colSpan={columns.length} className="py-12 text-center text-sm text-red-600"><AlertCircle className="mx-auto mb-2" />{error}</td></tr>
            ) : slice.length === 0 ? (
              <tr><td colSpan={columns.length} className="py-14 text-center text-sm text-slate-500">{search ? "No matching records found." : empty}</td></tr>
            ) : (
              slice.map((r, i) => (
                <tr key={r._id || i} className="transition-colors hover:bg-[#F8FAFC]">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 text-slate-700 ${c.align === "right" ? "text-right" : ""}`}>
                      {c.render ? c.render(r) : r[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
        <span>Showing {from} to {to} of {sorted.length} entries</span>
        <div className="flex items-center gap-1">
          <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 enabled:hover:bg-slate-50 disabled:opacity-40" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>
            <ChevronLeft size={15} /> Prev
          </button>
          <span className="px-3 font-medium text-slate-700">{cur} / {pages}</span>
          <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 enabled:hover:bg-slate-50 disabled:opacity-40" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>
            Next <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add item to stock                                                   */
/* ------------------------------------------------------------------ */
const EMPTY_NEW = { assetType: "", brand: "", model: "", unit: "pcs", reorderLevel: "0", location: "" };

function AddStockModal({ items, types, onClose, onDone }) {
  const [itemId, setItemId] = useState(items.length ? "" : NEW_ITEM);
  const [nf, setNf] = useState(EMPTY_NEW);
  const [qty, setQty] = useState("1");
  const [refNo, setRefNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nextId, setNextId] = useState("");

  const isNew = itemId === NEW_ITEM;
  const selected = items.find((i) => i._id === itemId);
  const setN = (k) => (e) => setNf((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!isNew || !nf.assetType.trim()) return setNextId("");
    const t = setTimeout(() => {
      assetApi.nextId(nf.assetType.trim()).then((r) => setNextId(r.assetId)).catch(() => setNextId(""));
    }, 300);
    return () => clearTimeout(t);
  }, [isNew, nf.assetType]);

  const submit = async () => {
    setError("");
    const n = Number(qty);
    if (!itemId) return setError("Select an item, or choose “New item type”.");
    if (isNew) {
      if (!nf.assetType.trim()) return setError("Item type is required.");
      if (!nf.unit.trim()) return setError("Unit is required (e.g. pcs, box).");
      const re = Number(nf.reorderLevel);
      if (!Number.isInteger(re) || re < 0) return setError("Reorder level must be a whole number, 0 or higher.");
    }
    if (!Number.isInteger(n) || n <= 0) return setError("Quantity must be a whole number greater than 0.");

    setSaving(true);
    let target = selected;
    try {
      if (isNew) {
        target = await assetApi.create({
          category: "Consumable",
          assetType: nf.assetType.trim(),
          brand: nf.brand.trim() || null,
          model: nf.model.trim() || null,
          unit: nf.unit.trim(),
          reorderLevel: Number(nf.reorderLevel),
          location: nf.location.trim() || null,
          quantity: 0,
        });
      }
      const res = await assetApi.adjustStock(target._id, { movement: "Added", qty: n, refNo: refNo.trim(), remarks: remarks.trim() });
      onDone(`${target.assetId}: added ${n}. Balance is now ${res.asset?.quantity ?? "updated"}.`);
    } catch (e) {
      if (isNew && target?._id) {
        setError(`${target.assetId} was created, but adding the stock failed: ${e.message}`);
      } else setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      icon={PackagePlus}
      title="Add item to stock"
      onClose={onClose}
      footer={
        <>
          <button className={btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={btnPrimary} onClick={submit} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />} {saving ? "Saving..." : "Add to stock"}
          </button>
        </>
      }
    >
      <ErrorBox text={error} />
      <datalist id="consumable-types">{types.map((t) => <option key={t} value={t} />)}</datalist>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Item" required className="sm:col-span-2">
          <select className={inputCls} value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Select item...</option>
            {items.map((i) => (
              <option key={i._id} value={i._id}>{i.assetId} · {itemLabel(i)} (on hand: {i.quantity} {i.unit || "pcs"})</option>
            ))}
            <option value={NEW_ITEM}>+ New item type...</option>
          </select>
        </F>

        {isNew && (
          <>
            <F label="Item type" required><input className={inputCls} list="consumable-types" placeholder="e.g. Keyboard, Toner" value={nf.assetType} onChange={setN("assetType")} /></F>
            <F label="Asset ID"><input className={`${inputCls} bg-slate-50`} value={nextId || "Auto-generated"} disabled readOnly /></F>
            <F label="Brand"><input className={inputCls} value={nf.brand} onChange={setN("brand")} /></F>
            <F label="Model"><input className={inputCls} value={nf.model} onChange={setN("model")} /></F>
            <F label="Unit" required><input className={inputCls} value={nf.unit} onChange={setN("unit")} /></F>
            <F label="Reorder level"><input type="number" min="0" step="1" className={inputCls} value={nf.reorderLevel} onChange={setN("reorderLevel")} /></F>
            <F label="Location" className="sm:col-span-2"><input className={inputCls} value={nf.location} onChange={setN("location")} /></F>
          </>
        )}

        <F label="Quantity to add" required><input type="number" min="1" step="1" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} /></F>
        <F label="Reference no. (RF / RR)"><input className={inputCls} value={refNo} onChange={(e) => setRefNo(e.target.value)} /></F>
        <F label="Remarks" className="sm:col-span-2"><textarea rows={2} className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></F>
      </div>

      {selected && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-[#F8FAFC] px-4 py-2.5 text-sm">
          <span className="text-slate-600">Balance after</span>
          <span className="font-semibold text-[#003B25]">
            {fmtNum((Number(selected.quantity) || 0) + (Number(qty) > 0 ? Number(qty) : 0))} {selected.unit || "pcs"}
          </span>
        </div>
      )}
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/* Request item for pull out                                           */
/* ------------------------------------------------------------------ */
function PullOutModal({ items, employeeNames, onClose, onDone }) {
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [mode, setMode] = useState("Pull-out");
  const [requestedBy, setRequestedBy] = useState("");
  const [refNo, setRefNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = items.find((i) => i._id === itemId);
  const onHand = Number(selected?.quantity) || 0;
  const n = Number(qty);
  const after = mode === "Pull-out" ? onHand - (n > 0 ? n : 0) : onHand;

  const submit = async () => {
    setError("");
    if (!selected) return setError("Select the item.");
    if (!Number.isInteger(n) || n <= 0) return setError("Quantity must be a whole number greater than 0.");
    if (mode === "Pull-out" && n > onHand) return setError(`Only ${onHand} ${selected.unit || "pcs"} on hand.`);
    if (!requestedBy.trim()) return setError("Requested by is required.");

    setSaving(true);
    try {
      const res = await assetApi.adjustStock(selected._id, {
        movement: mode, qty: n, refNo: refNo.trim(), requestedBy: requestedBy.trim(), remarks: remarks.trim(),
      });
      onDone(
        mode === "Pull-out"
          ? `${selected.assetId}: pulled out ${n}. Balance is now ${res.asset?.quantity ?? "updated"}.`
          : `Request for ${n} ${selected.unit || "pcs"} of ${selected.assetId} logged.`
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      icon={PackageMinus}
      title="Request item for pull out"
      onClose={onClose}
      footer={
        <>
          <button className={btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={btnPrimary} onClick={submit} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <PackageMinus size={16} />} {saving ? "Saving..." : "Submit request"}
          </button>
        </>
      }
    >
      <ErrorBox text={error} />
      <datalist id="employee-names">{employeeNames.map((x) => <option key={x} value={x} />)}</datalist>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Item" required className="sm:col-span-2">
          <select className={inputCls} value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Select item...</option>
            {items.map((i) => (
              <option key={i._id} value={i._id}>{i.assetId} · {itemLabel(i)} (available: {i.quantity} {i.unit || "pcs"})</option>
            ))}
          </select>
        </F>
        <F label="Quantity" required><input type="number" min="1" step="1" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} /></F>
        <F label="Action">
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="Pull-out">Pull out now (deduct from stock)</option>
            <option value="Request">Log request only (do not deduct)</option>
          </select>
        </F>
        <F label="Requested by" required><input className={inputCls} list="employee-names" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} /></F>
        <F label="Reference no. (RF / MR)"><input className={inputCls} value={refNo} onChange={(e) => setRefNo(e.target.value)} /></F>
        <F label="Remarks" className="sm:col-span-2"><textarea rows={2} className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></F>
      </div>

      {selected && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-[#F8FAFC] px-4 py-2.5 text-sm">
          <span className="text-slate-600">Balance after</span>
          <span className={`font-semibold ${after < 0 ? "text-red-600" : "text-[#003B25]"}`}>{fmtNum(after)} {selected.unit || "pcs"}</span>
        </div>
      )}
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/* Edit item                                                           */
/* ------------------------------------------------------------------ */
function EditItemModal({ row, onClose, onSaved }) {
  const [form, setForm] = useState({
    brand: row.brand || "", model: row.model || "", unit: row.unit || "pcs",
    location: row.location || "", reorderLevel: String(row.reorderLevel ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setError("");
    if (!form.unit.trim()) return setError("Unit is required.");
    const re = Number(form.reorderLevel);
    if (!Number.isInteger(re) || re < 0) return setError("Reorder level must be a whole number, 0 or higher.");
    setSaving(true);
    try {
      await assetApi.update(row._id, {
        brand: form.brand.trim() || null, model: form.model.trim() || null, unit: form.unit.trim(),
        location: form.location.trim() || null, reorderLevel: re,
      });
      onSaved(`${row.assetId} updated.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${row.assetId} (${row.assetType}) and its stock history? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await assetApi.remove(row._id);
      onSaved(`${row.assetId} deleted.`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      icon={Pencil}
      title={`Edit ${row.assetId} · ${row.assetType}`}
      onClose={onClose}
      footer={
        <>
          <button className="mr-auto inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60" onClick={remove} disabled={saving}>
            <Trash2 size={16} /> Delete
          </button>
          <button className={btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
        </>
      }
    >
      <ErrorBox text={error} />
      <p className="mb-4 text-sm text-slate-600">
        On hand: <span className="font-semibold text-[#003B25]">{fmtNum(row.quantity)}</span> {row.unit || "pcs"}. To change the quantity, use{" "}
        <b>Add item to stock</b> or <b>Request item for pull out</b>.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Brand"><input className={inputCls} value={form.brand} onChange={set("brand")} /></F>
        <F label="Model"><input className={inputCls} value={form.model} onChange={set("model")} /></F>
        <F label="Unit" required><input className={inputCls} value={form.unit} onChange={set("unit")} /></F>
        <F label="Reorder level"><input type="number" min="0" step="1" className={inputCls} value={form.reorderLevel} onChange={set("reorderLevel")} /></F>
        <F label="Location" className="sm:col-span-2"><input className={inputCls} value={form.location} onChange={set("location")} /></F>
      </div>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function Consumables() {
  const [tab, setTab] = useState("stocks");
  const [assetType, setAssetType] = useState("");
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [employeeNames, setEmployeeNames] = useState([]);

  const [addOpen, setAddOpen] = useState(false);
  const [pullOpen, setPullOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  // Load consumable items, dayon ang stock logs sa matag usa
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await assetApi.list({ category: "Consumable", limit: 1000, sort: "assetType" });
      const list = res.data || [];
      setItems(list);
      const all = await Promise.all(
        list.map((a) =>
          assetApi
            .stockLogs(a._id)
            .then((r) => (Array.isArray(r) ? r : r?.data || r?.logs || []).map((l) => ({ ...l, asset: a })))
            .catch(() => [])
        )
      );
      setLogs(all.flat());
    } catch (e) {
      setError(e.message || "Failed to load consumable items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    employeeApi.list({ limit: 1000, sort: "name" }).then((r) => setEmployeeNames(r.data.map((e) => e.name).filter(Boolean))).catch(() => {});
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const typeOptions = useMemo(() => [...new Set(items.map((a) => a.assetType).filter(Boolean))].sort(), [items]);
  const suggested = useMemo(() => [...new Set([...SUGGESTED_TYPES, ...typeOptions])], [typeOptions]);

  const done = (text) => {
    setAddOpen(false);
    setPullOpen(false);
    setEditRow(null);
    setNotice({ type: "success", text });
    load();
  };

  const byType = (a) => !assetType || a?.assetType === assetType;
  const stockRows = useMemo(() => items.filter(byType), [items, assetType]); // eslint-disable-line react-hooks/exhaustive-deps
  const addedRows = useMemo(() => logs.filter((l) => ["Added", "Return"].includes(l.movement) && byType(l.asset)), [logs, assetType]); // eslint-disable-line react-hooks/exhaustive-deps
  const requestRows = useMemo(() => logs.filter((l) => ["Pull-out", "Request"].includes(l.movement) && byType(l.asset)), [logs, assetType]); // eslint-disable-line react-hooks/exhaustive-deps

  const when = (header) => ({
    key: "date", header, text: (r) => fmtDT(r.date || r.createdAt),
    sortVal: (r) => new Date(r.date || r.createdAt || 0).getTime(),
    render: (r) => fmtDT(r.date || r.createdAt),
  });
  const logCompany = { key: "company", header: "Company", render: (r) => r.asset?.company || "—", text: (r) => r.asset?.company || "" };
  const logItem = { key: "item", header: "Item Type", render: (r) => <ItemCell a={r.asset} />, text: (r) => itemLabel(r.asset) };
  const logUnit = { key: "unit", header: "Unit", render: (r) => r.asset?.unit || "—", text: (r) => r.asset?.unit || "" };
  const qtyCol = (plus) => ({
    key: "qty", header: "Quantity", align: "right", text: (r) => r.qty, sortVal: (r) => Number(r.qty) || 0,
    render: (r) => <span className={`font-semibold ${plus ? "text-[#006B3C]" : "text-slate-800"}`}>{plus ? "+" : ""}{fmtNum(r.qty)}</span>,
  });
  const balance = { key: "balanceAfter", header: "Balance", align: "right", text: (r) => r.balanceAfter, sortVal: (r) => Number(r.balanceAfter) || 0, render: (r) => fmtNum(r.balanceAfter) };
  const ref = { key: "refNo", header: "Reference", render: (r) => r.refNo || "—", text: (r) => r.refNo || "" };
  const remarks = { key: "remarks", header: "Remarks", render: (r) => r.remarks || "—", text: (r) => r.remarks || "" };

  const stockColumns = [
    { key: "company", header: "Company", render: (r) => r.company || "—", text: (r) => r.company || "" },
    { key: "assetType", header: "Item Type", render: (r) => <ItemCell a={r} />, text: (r) => itemLabel(r) },
    {
      key: "quantity", header: "Available Stock", text: (r) => r.quantity, sortVal: (r) => Number(r.quantity) || 0,
      render: (r) => {
        const s = stockState(r);
        return (
          <span className="flex items-center gap-2">
            <span className="text-base font-semibold text-[#003B25]">{fmtNum(r.quantity)}</span>
            {s === "low" && <Pill tone="low">Low stock</Pill>}
            {s === "out" && <Pill tone="out">Out of stock</Pill>}
          </span>
        );
      },
    },
    { key: "unit", header: "Unit", render: (r) => r.unit || "—", text: (r) => r.unit || "" },
    {
      key: "actions", header: "Action",
      render: (r) => (
        <button title="Edit item" aria-label="Edit item" onClick={() => setEditRow(r)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#DDF8E9] text-[#006B3C] transition hover:bg-[#bff0d3]">
          <Pencil size={15} />
        </button>
      ),
    },
  ];

  const addedColumns = [
    when("Date Added"), logCompany, logItem, qtyCol(true), logUnit,
    {
      key: "movement", header: "Type", text: (r) => (r.movement === "Return" ? "Returned" : "Added"),
      render: (r) => <Pill tone={r.movement === "Return" ? "info" : "ok"}>{r.movement === "Return" ? "Returned" : "Added"}</Pill>,
    },
    balance, ref, remarks,
  ];

  const requestColumns = [
    when("Date Requested"), logCompany, logItem, qtyCol(false), logUnit,
    { key: "requestedBy", header: "Requested By", render: (r) => r.requestedBy || "—", text: (r) => r.requestedBy || "" },
    ref,
    {
      key: "movement", header: "Status", text: (r) => (r.movement === "Pull-out" ? "Pulled out" : "Requested"),
      render: (r) => (r.movement === "Pull-out" ? <Pill tone="low">Pulled out</Pill> : <Pill tone="muted">Requested</Pill>),
    },
    balance, remarks,
  ];

  return (
    <div>
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
        {/* Title + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h1 className="text-lg font-bold uppercase tracking-wide text-[#006B3C]">Consumable Assets</h1>
          <div className="flex flex-wrap items-center gap-2">
            <select value={assetType} onChange={(e) => setAssetType(e.target.value)} aria-label="Select asset type" className={selectCls}>
              <option value="">Select asset type...</option>
              {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className={btnPrimary} onClick={() => setAddOpen(true)}><PackagePlus size={17} /> Add item to stock</button>
            <button className={btnPrimary} onClick={() => setPullOpen(true)}><PackageMinus size={17} /> Request item for pull out</button>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line bg-[#F8FAFC] px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                tab === t.id ? "border-[#00A651] bg-white text-[#006B3C]" : "border-transparent text-slate-500 hover:text-[#003B25]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {notice && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#DDF8E9] px-4 py-3 text-sm text-[#006B3C]" role="status">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span className="flex-1">{notice.text}</span>
              <button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={16} /></button>
            </div>
          )}

          {tab === "stocks" && (
            <ListTable
              key="stocks" title="Consumable available stocks" rows={stockRows} columns={stockColumns}
              loading={loading} error={error} defaultSort={{ key: "assetType", dir: "asc" }}
              empty="No consumable items yet. Click “Add item to stock” to register the first one."
              onError={(m) => setNotice({ type: "error", text: m })}
            />
          )}
          {tab === "added" && (
            <ListTable
              key="added" title="Consumable added items" rows={addedRows} columns={addedColumns}
              loading={loading} error={error} defaultSort={{ key: "date", dir: "desc" }}
              empty="No items have been added to stock yet."
              onError={(m) => setNotice({ type: "error", text: m })}
            />
          )}
          {tab === "requests" && (
            <ListTable
              key="requests" title="Consumable pull-out requests" rows={requestRows} columns={requestColumns}
              loading={loading} error={error} defaultSort={{ key: "date", dir: "desc" }}
              empty="No pull-out requests yet."
              onError={(m) => setNotice({ type: "error", text: m })}
            />
          )}
        </div>
      </section>

      {addOpen && <AddStockModal items={items} types={suggested} onClose={() => setAddOpen(false)} onDone={done} />}
      {pullOpen && <PullOutModal items={items} employeeNames={employeeNames} onClose={() => setPullOpen(false)} onDone={done} />}
      {editRow && <EditItemModal row={editRow} onClose={() => setEditRow(null)} onSaved={done} />}
    </div>
  );
}