import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, Clock, Loader2,
  Play, Printer, Search, ShieldCheck, ThumbsDown, ThumbsUp, XCircle,
} from "lucide-react";
import { assetApi, maintenanceApi, metaApi } from "../services/index.js";
import { useAuth } from "../context/AuthContext.jsx";
import Modal from "../components/ui/Modal.jsx";

const QUARTERS = [
  { id: "q1", label: "1st" },
  { id: "q2", label: "2nd" },
  { id: "q3", label: "3rd" },
  { id: "q4", label: "4th" },
];
const QLABEL = Object.fromEntries(QUARTERS.map((q) => [q.id, q.label]));
const TABS = [
  { id: "perform", label: "PMS Laptop/Desktop", icon: Play },
  { id: "record", label: "PMS Record", icon: ClipboardList },
  { id: "verify", label: "PMS Verify", icon: ShieldCheck },
];
const MARKS = [
  { v: "P", label: "OK", on: "bg-emerald-600 text-white border-emerald-600" },
  { v: "O", label: "Not OK", on: "bg-red-600 text-white border-red-600" },
  { v: "NA", label: "N/A", on: "bg-slate-600 text-white border-slate-600" },
];
const STATUS_CLS = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Rejected: "bg-red-50 text-red-700 ring-red-200",
};

const thisYear = new Date().getFullYear();
const YEARS = [thisYear + 1, thisYear, thisYear - 1, thisYear - 2, thisYear - 3];
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
const statusOf = (log, q) => log?.verifications?.[q]?.status || (log?.periods?.[q] ? "Pending" : null);
const assetLabel = (a) => `${a.assetId} · ${[a.assetType, a.brand, a.model].filter(Boolean).join(" ")}`;

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#00A651] focus:outline-none focus:ring-4 focus:ring-[#00A651]/15 disabled:bg-slate-50 disabled:text-slate-500";
const selectCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#00A651] focus:outline-none focus:ring-4 focus:ring-[#00A651]/15";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#006B3C] to-[#00A651] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#00A651]/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

function F({ label, required, className = "", children }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function StatusPill({ status }) {
  if (!status) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_CLS[status]}`}>
      {status}
    </span>
  );
}

function Alert({ tone = "error", children, onClose }) {
  if (!children) return null;
  const ok = tone === "success";
  return (
    <div className={`mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${ok ? "bg-[#DDF8E9] text-[#006B3C]" : "bg-red-50 text-red-700"}`} role={ok ? "status" : "alert"}>
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
      <span className="flex-1">{children}</span>
      {onClose && <button onClick={onClose} aria-label="Dismiss"><XCircle size={16} /></button>}
    </div>
  );
}

function MarkCell({ v }) {
  if (v === "P") return <span className="font-bold text-emerald-600">✓</span>;
  if (v === "O") return <span className="font-bold text-red-600">✗</span>;
  if (v === "NA") return <span className="text-xs text-slate-500">N/A</span>;
  return null;
}

/* ------------------------------------------------------------------ */
/* Checklist modal (Perform PMS)                                       */
/* ------------------------------------------------------------------ */
function ChecklistModal({ checklist, ctx, existing, userName, onClose, onSaved }) {
  const { asset, quarter, year, header } = ctx;
  const [results, setResults] = useState(() => {
    const r = {};
    checklist.forEach((s) => s.items.forEach((i) => { if (existing?.records?.[i.key]?.[quarter]) r[i.key] = existing.records[i.key][quarter]; }));
    return r;
  });
  const [remarks, setRemarks] = useState(() => {
    const r = {};
    checklist.forEach((s) => s.items.forEach((i) => { if (existing?.records?.[i.key]?.remarks) r[i.key] = existing.records[i.key].remarks; }));
    return r;
  });
  const prev = existing?.periods?.[quarter];
  const [performedBy, setPerformedBy] = useState(prev?.performedBy || userName);
  const [datePerformed, setDatePerformed] = useState(prev?.datePerformed || today());
  const [notedBy, setNotedBy] = useState(prev?.notedBy || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const total = checklist.reduce((n, s) => n + s.items.length, 0);
  const done = Object.keys(results).length;

  const markAll = (v) => {
    const r = {};
    checklist.forEach((s) => s.items.forEach((i) => (r[i.key] = v)));
    setResults(r);
  };

  const save = async () => {
    setError("");
    if (done < total) return setError(`Please mark every item (${total - done} left).`);
    if (!performedBy.trim()) return setError("Performed by is required.");
    setSaving(true);
    try {
      await maintenanceApi.performDesktop({
        assetId: asset._id, year, quarter, header, results, remarks, performedBy, datePerformed, notedBy,
      });
      onSaved(`PMS for ${asset.assetId} (${QLABEL[quarter]} quarter ${year}) was saved and sent for verification.`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="xl"
      onClose={saving ? undefined : onClose}
      title={`Perform PMS · ${asset.assetId} · ${QLABEL[quarter]} quarter ${year}`}
      footer={
        <>
          <span className="mr-auto text-sm text-slate-500">{done} / {total} marked</span>
          <button className={btnSecondary} onClick={() => markAll("P")} disabled={saving}>Mark all OK</button>
          <button className={btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={btnPrimary} onClick={save} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />} {saving ? "Saving..." : "Save PMS"}
          </button>
        </>
      }
    >
      <Alert>{error}</Alert>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <F label="Performed by" required><input className={inputCls} value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} /></F>
        <F label="Date performed"><input type="date" className={inputCls} value={datePerformed} onChange={(e) => setDatePerformed(e.target.value)} /></F>
        <F label="Noted by"><input className={inputCls} value={notedBy} onChange={(e) => setNotedBy(e.target.value)} /></F>
      </div>

      <div className="space-y-5">
        {checklist.map((s) => (
          <div key={s.no} className="overflow-hidden rounded-xl border border-line">
            <p className="bg-[#DDF8E9] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[#006B3C]">{s.no}. {s.title}</p>
            <ul className="divide-y divide-line">
              {s.items.map((i) => (
                <li key={i.key} className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center">
                  <p className="flex-1 text-sm text-slate-700"><span className="mr-2 text-xs text-slate-400">{i.key}</span>{i.text}</p>
                  <div className="flex gap-1">
                    {MARKS.map((m) => (
                      <button
                        key={m.v}
                        type="button"
                        onClick={() => setResults((r) => ({ ...r, [i.key]: m.v }))}
                        className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${results[i.key] === m.v ? m.on : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-[#00A651] focus:outline-none lg:w-52"
                    placeholder="Remarks"
                    value={remarks[i.key] || ""}
                    onChange={(e) => setRemarks((r) => ({ ...r, [i.key]: e.target.value }))}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1: PMS Laptop/Desktop                                           */
/* ------------------------------------------------------------------ */
function PerformTab({ assets, logs, checklist, userName, onDone }) {
  const [quarter, setQuarter] = useState("");
  const [year, setYear] = useState(thisYear);
  const [assetId, setAssetId] = useState("");
  const [f, setF] = useState({ taskId: "", computerName: "", userName: "", processor: "", ram: "", location: "" });
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const asset = assets.find((a) => a._id === assetId);
  const existing = logs.find((l) => l.asset?._id === assetId && l.year === year);
  const existingStatus = existing && quarter ? statusOf(existing, quarter) : null;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  // Auto-fill gikan sa asset (ug sa naunang PMS)
  const pick = (id) => {
    setAssetId(id);
    const a = assets.find((x) => x._id === id);
    if (!a) return setF((x) => ({ ...x, computerName: "", userName: "", processor: "", ram: "", location: "" }));
    const prevLog = logs.find((l) => l.asset?._id === id && l.year === year);
    setF((x) => ({
      ...x,
      computerName: prevLog?.header?.computerName || "",
      userName: a.currentUser?.name || "",
      processor: a.specs?.processor || "",
      ram: a.specs?.ram || "",
      location: a.location || "",
    }));
  };

  const start = () => {
    setError("");
    if (!quarter) return setError("Select a quarter.");
    if (!asset) return setError("Select an asset.");
    if (existingStatus === "Approved") return setError("This quarter is already approved for this asset.");
    setOpen(true);
  };

  return (
    <div>
      <Alert>{error}</Alert>
      <div className="mx-auto max-w-4xl rounded-[var(--radius-card)] border border-line bg-[#F8FAFC] p-5 sm:p-7">
        <h2 className="mb-5 text-center text-2xl font-bold text-[#003B25]">Preventive Maintenance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <F label="Select quarter" required>
            <select className={inputCls} value={quarter} onChange={(e) => setQuarter(e.target.value)}>
              <option value="">---------</option>
              {QUARTERS.map((q) => <option key={q.id} value={q.id}>{q.label} Quarter</option>)}
            </select>
          </F>
          <F label="Year">
            <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </F>
          <F label="Task ID"><input className={inputCls} placeholder="Enter task ID" value={f.taskId} onChange={set("taskId")} /></F>
          <F label="Asset ID" required className="sm:col-span-2 lg:col-span-1">
            <select className={inputCls} value={assetId} onChange={(e) => pick(e.target.value)}>
              <option value="">Laptop/Desktop</option>
              {assets.map((a) => <option key={a._id} value={a._id}>{assetLabel(a)}</option>)}
            </select>
          </F>
          <F label="Computer name"><input className={inputCls} placeholder="Enter computer name" value={f.computerName} onChange={set("computerName")} /></F>
          <F label="Employee name"><input className={inputCls} value={f.userName} onChange={set("userName")} /></F>
          <F label="Processor"><input className={inputCls} value={f.processor} onChange={set("processor")} /></F>
          <F label="RAM"><input className={inputCls} value={f.ram} onChange={set("ram")} /></F>
          <F label="Location" className="sm:col-span-2 lg:col-span-4"><input className={inputCls} value={f.location} onChange={set("location")} /></F>
        </div>

        {existing && quarter && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
            Status for this quarter: <StatusPill status={existingStatus || "Pending"} />
            {!existingStatus && <span className="text-slate-400">(not yet performed)</span>}
          </p>
        )}

        <div className="mt-5 flex justify-center">
          <button className={btnPrimary} onClick={start}><Play size={17} /> Perform PMS</button>
        </div>
      </div>

      {open && (
        <ChecklistModal
          checklist={checklist}
          ctx={{ asset, quarter, year, header: f }}
          existing={existing}
          userName={userName}
          onClose={() => setOpen(false)}
          onSaved={(msg) => { setOpen(false); onDone(msg); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: PMS Record                                                   */
/* ------------------------------------------------------------------ */
function RecordTab({ assets, logs, checklist }) {
  const [assetId, setAssetId] = useState("");
  const [year, setYear] = useState(thisYear);
  const printRef = useRef(null);

  const log = logs.find((l) => l.asset?._id === assetId && l.year === year);
  const asset = assets.find((a) => a._id === assetId);

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>PMS Record</title><style>
      body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{font-size:18px;margin:0}p{margin:2px 0 12px;font-size:12px;color:#555}
      table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #888;padding:4px 6px;text-align:left}
      th{background:#e6f6ee}td.c,th.c{text-align:center}@media print{@page{size:landscape;margin:12mm}}
    </style></head><body><h1>MAC Builders Corp. · Preventive Maintenance Record</h1>
    <p>${asset ? assetLabel(asset) : ""} · ${year} · ${log?.header?.computerName || ""} · ${log?.header?.userName || ""}</p>
    ${printRef.current?.innerHTML || ""}<script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select className={`${selectCls} sm:w-80`} value={assetId} onChange={(e) => setAssetId(e.target.value)} aria-label="Asset">
          <option value="">Select asset...</option>
          {assets.map((a) => <option key={a._id} value={a._id}>{assetLabel(a)}</option>)}
        </select>
        <select className={selectCls} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
          {YEARS.map((y) => <option key={y}>{y}</option>)}
        </select>
        {log && <button className={`${btnSecondary} sm:ml-auto`} onClick={print}><Printer size={16} /> Print</button>}
      </div>

      {!assetId ? (
        <Empty text="Select an asset to see its PMS record." />
      ) : !log ? (
        <Empty text={`No PMS record yet for ${asset?.assetId} in ${year}.`} />
      ) : (
        <>
          <div className="mb-4 grid gap-2 rounded-xl border border-line bg-[#F8FAFC] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[["Computer name", log.header?.computerName], ["Employee", log.header?.userName], ["Processor", log.header?.processor], ["RAM", log.header?.ram], ["Location", log.header?.location]].map(([k, v]) => (
              <p key={k}><span className="text-slate-500">{k}: </span><span className="font-medium text-slate-800">{v || "—"}</span></p>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-line" ref={printRef}>
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-[#DDF8E9] text-[#003B25]">
                <tr>
                  <th rowSpan={2} className="border-b border-r border-line px-3 py-2 text-center">Item No.</th>
                  <th rowSpan={2} className="border-b border-r border-line px-3 py-2 text-left">Task</th>
                  <th rowSpan={2} className="border-b border-r border-line px-3 py-2 text-left">Description</th>
                  <th colSpan={4} className="c border-b border-r border-line px-3 py-2 text-center">Quarter</th>
                  <th rowSpan={2} className="border-b border-line px-3 py-2 text-left">Remarks</th>
                </tr>
                <tr>
                  {QUARTERS.map((q) => <th key={q.id} className="c w-14 border-b border-r border-line px-2 py-1.5 text-center">{q.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {checklist.flatMap((s) =>
                  s.items.map((i, idx) => (
                    <tr key={i.key} className="hover:bg-[#F8FAFC]">
                      {idx === 0 && <td rowSpan={s.items.length} className="c border-b border-r border-line px-3 py-2 text-center align-middle">{s.no}</td>}
                      {idx === 0 && <td rowSpan={s.items.length} className="border-b border-r border-line px-3 py-2 align-middle font-medium uppercase">{s.title}</td>}
                      <td className="border-b border-r border-line px-3 py-2 text-slate-700">{i.text}</td>
                      {QUARTERS.map((q) => (
                        <td key={q.id} className="c border-b border-r border-line px-2 py-2 text-center"><MarkCell v={log.records?.[i.key]?.[q.id]} /></td>
                      ))}
                      <td className="border-b border-line px-3 py-2 text-slate-600">{log.records?.[i.key]?.remarks || ""}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-[#F8FAFC] font-medium">
                  <td colSpan={3} className="border-r border-line px-3 py-2 text-right">Performed by / Status</td>
                  {QUARTERS.map((q) => (
                    <td key={q.id} className="c border-r border-line px-1 py-2 text-center text-[11px]">
                      {log.periods?.[q.id] ? <>{log.periods[q.id].performedBy}<br /><span className="text-slate-500">{statusOf(log, q.id)}</span></> : ""}
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">✓ OK · ✗ Not OK · N/A Not applicable</p>
        </>
      )}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-line py-14 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF8E9] text-[#006B3C]"><ClipboardList size={22} /></span>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3: PMS Verify                                                   */
/* ------------------------------------------------------------------ */
function VerifyTab({ logs, isAdmin, onChanged, onNotice }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");

  const rows = useMemo(
    () =>
      logs
        .flatMap((l) =>
          QUARTERS.filter((q) => l.periods?.[q.id]).map((q) => ({
            key: `${l._id}-${q.id}`, log: l, q: q.id,
            assetId: l.asset?.assetId || "—",
            date: l.periods[q.id].datePerformed,
            by: l.periods[q.id].performedBy,
            status: statusOf(l, q.id),
          }))
        )
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [logs]
  );

  const filtered = rows.filter((r) => {
    if (status && r.status !== status) return false;
    const s = search.trim().toLowerCase();
    return !s || `${r.assetId} ${QLABEL[r.q]} ${r.by} ${r.log.header?.computerName || ""}`.toLowerCase().includes(s);
  });
  const pages = Math.max(Math.ceil(filtered.length / limit), 1);
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * limit, cur * limit);

  const act = async (r, next) => {
    setBusy(r.key);
    try {
      await maintenanceApi.verify(r.log._id, { quarter: r.q, status: next });
      onNotice({ type: "success", text: `${r.assetId} (${QLABEL[r.q]} quarter) ${next.toLowerCase()}.` });
      onChanged();
    } catch (e) {
      onNotice({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className={`${selectCls} !py-1.5`} aria-label="Entries per page">
            {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
          </select>
          entries per page
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls} aria-label="Filter by status">
          <option value="">All statuses</option>
          {["Pending", "Approved", "Rejected"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="relative sm:ml-auto sm:w-72">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search..." className={`${inputCls} pl-10`} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Asset ID", "Quarter", "PMS Date", "Performed by", "Status", "Action"].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {slice.length === 0 ? (
              <tr><td colSpan={6} className="py-14 text-center text-slate-500">No PMS records found.</td></tr>
            ) : (
              slice.map((r) => (
                <tr key={r.key} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-medium text-[#003B25]">{r.assetId} <span className="block text-xs font-normal text-slate-500">{r.log.header?.computerName}</span></td>
                  <td className="px-4 py-3">{QLABEL[r.q]} · {r.log.year}</td>
                  <td className="px-4 py-3">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3">{r.by || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                    {r.log.verifications?.[r.q]?.verifiedBy && <span className="mt-0.5 block text-[11px] text-slate-400">by {r.log.verifications[r.q].verifiedBy}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <div className="flex gap-1.5">
                        {r.status !== "Approved" && (
                          <button disabled={busy === r.key} onClick={() => act(r, "Approved")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"><ThumbsUp size={13} /> Approve</button>
                        )}
                        {r.status !== "Rejected" && (
                          <button disabled={busy === r.key} onClick={() => act(r, "Rejected")} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"><ThumbsDown size={13} /> Reject</button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Admin only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
        <span>Showing {filtered.length ? (cur - 1) * limit + 1 : 0} to {Math.min(cur * limit, filtered.length)} of {filtered.length} entries</span>
        <div className="flex items-center gap-1">
          <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 enabled:hover:bg-slate-50 disabled:opacity-40" disabled={cur <= 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={15} /> Prev</button>
          <span className="px-3 font-medium text-slate-700">{cur} / {pages}</span>
          <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 enabled:hover:bg-slate-50 disabled:opacity-40" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next <ChevronRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function Maintenance() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState("perform");
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const [a, l, m] = await Promise.all([
        assetApi.list({ category: "Non-Consumable", limit: 1000, sort: "assetId" }),
        maintenanceApi.list({ logType: "DESKTOP_LAPTOP", limit: 1000, sort: "-year" }),
        metaApi.get(),
      ]);
      setAssets((a.data || []).filter((x) => /desktop|laptop/i.test(x.assetType || "")));
      setLogs(l.data || []);
      setChecklist(m.desktopChecklist || []);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load maintenance data.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const pending = useMemo(
    () => logs.reduce((n, l) => n + QUARTERS.filter((q) => statusOf(l, q.id) === "Pending").length, 0),
    [logs]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003B25]">Preventive Maintenance</h1>
      <p className="mt-1 text-slate-500">Quarterly PMS for laptops and desktops: perform, record, and verify.</p>

      <section className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line bg-[#F8FAFC] px-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${tab === id ? "border-[#00A651] bg-white text-[#006B3C]" : "border-transparent text-slate-500 hover:text-[#003B25]"}`}
            >
              <Icon size={16} /> {label}
              {id === "verify" && pending > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"><Clock size={9} className="mr-0.5 inline" />{pending}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          <Alert tone={notice?.type} onClose={() => setNotice(null)}>{notice?.text}</Alert>
          <Alert>{error}</Alert>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#00A651]" /></div>
          ) : (
            <>
              {tab === "perform" && (
                <PerformTab assets={assets} logs={logs} checklist={checklist} userName={user?.name || ""} onDone={(msg) => { setNotice({ type: "success", text: msg }); load(); }} />
              )}
              {tab === "record" && <RecordTab assets={assets} logs={logs} checklist={checklist} />}
              {tab === "verify" && <VerifyTab logs={logs} isAdmin={isAdmin} onChanged={load} onNotice={setNotice} />}
            </>
          )}
        </div>
      </section>
    </div>
  );
}