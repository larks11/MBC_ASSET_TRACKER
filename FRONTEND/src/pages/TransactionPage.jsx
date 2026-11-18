import { useEffect, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { employeeApi, transactionApi } from "../services/index.js";
import usePaginated from "../hooks/usePaginated.js";
import PageHeader from "../components/ui/PageHeader.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import Modal from "../components/ui/Modal.jsx";
import Field from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import Notice from "../components/ui/Notice.jsx";
import AssetPicker from "../components/ui/AssetPicker.jsx";
import { fmtDate, TXN_LABELS } from "../utils/format.js";

const MODES = {
  deploy: {
    title: "Assign / deploy assets",
    description: "Link equipment to employees, departments, or projects. A Memorandum Receipt number is generated automatically.",
    types: ["Deploy"],
    status: "Available",
    employee: "required",
    addLabel: "New deployment",
  },
  return: {
    title: "Return / turn over assets",
    description: "Process returned equipment. Good items become Available; damaged items become Damaged.",
    types: ["Return", "TurnOver"],
    status: "Active",
    employee: "optional",
    addLabel: "New return",
    condition: true,
  },
  disposal: {
    title: "For disposal of assets",
    description: "Record disposal. Disposed assets stay in the history and cannot be used again.",
    types: ["Disposal"],
    status: null,
    allow: (a) => !["Active", "Disposed"].includes(a.status),
    employee: "none",
    addLabel: "New disposal",
    disposal: true,
  },
};

const today = () => new Date().toISOString().slice(0, 10);

function useEmployees() {
  const [list, setList] = useState([]);
  useEffect(() => {
    employeeApi.list({ limit: 100, sort: "name" }).then((r) => setList(r.data)).catch(() => {});
  }, []);
  return list;
}

export default function TransactionPage({ mode }) {
  const cfg = MODES[mode];
  const table = usePaginated((p, s) => transactionApi.list(p, s), {
    initialSort: "-date",
    initialFilters: { type: cfg.types[0] },
  });
  const employees = useEmployees();

  const blank = () => ({
    type: cfg.types[0], date: today(), employee: "", location: "", projectName: "",
    documentType: "", documentNo: "", ticketNo: "", taskNo: "", disposalDate: today(),
    remarks: "", applyNow: true,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank());
  const [picked, setPicked] = useState([]);
  const [extras, setExtras] = useState({}); // per-asset: condition o meansOfDisposal
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ tone: "success", text: "" });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setExtra = (id, v) => setExtras((x) => ({ ...x, [id]: v }));

  const openNew = () => {
    setForm(blank());
    setPicked([]);
    setExtras({});
    setError("");
    setOpen(true);
  };

  const save = async () => {
    if (!picked.length) return setError("Select at least one asset.");
    if (cfg.employee === "required" && !form.employee) return setError("Select an employee.");

    const payload = {
      type: form.type,
      date: form.date || undefined,
      employee: form.employee || undefined,
      location: form.location || undefined,
      projectName: form.projectName || undefined,
      documentType: form.documentType || undefined,
      documentNo: form.documentNo || undefined,
      ticketNo: form.ticketNo || undefined,
      remarks: form.remarks || undefined,
      autoComplete: form.applyNow,
      items: picked.map((a) => ({
        asset: a._id,
        qty: 1,
        condition: cfg.condition ? extras[a._id] || "Good" : undefined,
        meansOfDisposal: cfg.disposal ? extras[a._id] || undefined : undefined,
      })),
    };
    if (cfg.disposal) {
      payload.disposalDate = form.disposalDate || undefined;
      payload.taskNo = form.taskNo || undefined;
    }

    setSaving(true);
    setError("");
    try {
      const txn = await transactionApi.create(payload);
      setOpen(false);
      setNotice({
        tone: "success",
        text: `${txn.transactionNo} ${txn.status === "Completed" ? "completed. Asset status updated." : "saved as pending."}`,
      });
      table.refetch();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn, okText) => {
    try {
      await fn();
      setNotice({ tone: "success", text: okText });
      table.refetch();
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    }
  };

  const columns = [
    { key: "transactionNo", header: "Transaction no.", sortable: true, render: (r) => <span className="tabular font-medium text-navy-800">{r.transactionNo}</span> },
    { key: "type", header: "Type", render: (r) => TXN_LABELS[r.type] || r.type },
    { key: "date", header: "Date", sortable: true, render: (r) => fmtDate(r.date) },
    { key: "employee", header: "Employee", render: (r) => r.employeeSnapshot?.name || "—" },
    {
      key: "items",
      header: "Assets",
      render: (r) => r.items?.map((i) => i.asset?.assetId).filter(Boolean).join(", ") || "—",
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        r.status === "Completed" ? (
          <span className="text-xs text-slate-400">Permanent record</span>
        ) : (
          <div className="flex gap-1">
            {r.status === "Pending" && (
              <>
                <Button variant="ghost" icon={Check} className="!px-2 !py-1" onClick={() => act(() => transactionApi.complete(r._id), "Transaction completed.")}>Complete</Button>
                <Button variant="ghost" icon={X} className="!px-2 !py-1" onClick={() => {
                  const reason = window.prompt("Reason for rejection?");
                  if (reason !== null) act(() => transactionApi.reject(r._id, reason), "Transaction rejected.");
                }}>Reject</Button>
              </>
            )}
            <Button variant="ghost" icon={Trash2} className="!px-2 !py-1 text-red-600" onClick={() => {
              if (window.confirm(`Delete ${r.transactionNo}?`)) act(() => transactionApi.remove(r._id), "Transaction deleted.");
            }}>Delete</Button>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        actions={<Button icon={Plus} onClick={openNew}>{cfg.addLabel}</Button>}
      />
      <Notice tone={notice.tone} onClose={() => setNotice({ ...notice, text: "" })}>{notice.text}</Notice>

      <DataTable
        {...table}
        columns={columns}
        searchPlaceholder="Search by transaction no., employee, project..."
        filters={
          <>
            {cfg.types.length > 1 && (
              <FilterSelect value={table.filters.type} onChange={(v) => table.setFilter("type", v)} options={cfg.types} placeholder="All types" />
            )}
            <FilterSelect value={table.filters.status} onChange={(v) => table.setFilter("status", v)} options={["Pending", "Completed", "Rejected"]} placeholder="All statuses" />
          </>
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={cfg.addLabel}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </>
        }
      >
        <Notice tone="error">{error}</Notice>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {cfg.types.length > 1 && (
            <Field label="Type" as="select" value={form.type} onChange={set("type")}>
              {cfg.types.map((t) => <option key={t} value={t}>{TXN_LABELS[t]}</option>)}
            </Field>
          )}
          <Field label={cfg.disposal ? "Date" : "Date issued"} type="date" value={form.date} onChange={set("date")} />

          {cfg.employee !== "none" && (
            <Field label="Employee" required={cfg.employee === "required"} as="select" value={form.employee} onChange={set("employee")}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.name}{e.position ? ` · ${e.position}` : ""}</option>
              ))}
            </Field>
          )}
          {!cfg.disposal && (
            <Field label={mode === "return" ? "Returned to / location" : "Location / department"} value={form.location} onChange={set("location")} />
          )}

          {mode === "deploy" && (
            <>
              <Field label="Project name" value={form.projectName} onChange={set("projectName")} />
              <Field label="Document type" as="select" value={form.documentType} onChange={set("documentType")}>
                <option value="">None</option>
                <option>RF</option>
                <option>MR</option>
                <option>Project Turnover</option>
              </Field>
              <Field label="Document no." value={form.documentNo} onChange={set("documentNo")} />
            </>
          )}
          {mode === "return" && <Field label="Ticket no." value={form.ticketNo} onChange={set("ticketNo")} />}
          {cfg.disposal && (
            <>
              <Field label="Disposal date" type="date" value={form.disposalDate} onChange={set("disposalDate")} />
              <Field label="Task no." value={form.taskNo} onChange={set("taskNo")} />
            </>
          )}
        </div>

        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {mode === "deploy" ? "Available assets" : mode === "return" ? "Deployed assets" : "Assets to dispose"}
        </h3>
        <AssetPicker status={cfg.status} allow={cfg.allow} selected={picked} onChange={setPicked} />

        {(cfg.condition || cfg.disposal) && picked.length > 0 && (
          <div className="mt-4 space-y-2">
            {picked.map((a) => (
              <div key={a._id} className="flex items-center gap-3 text-sm">
                <span className="tabular w-28 shrink-0 font-medium text-navy-800">{a.assetId}</span>
                {cfg.condition ? (
                  <Field label="" as="select" className="flex-1" value={extras[a._id] || "Good"} onChange={(e) => setExtra(a._id, e.target.value)}>
                    <option value="Good">Good condition</option>
                    <option value="Damaged">Damaged</option>
                  </Field>
                ) : (
                  <Field label="" className="flex-1" placeholder="Means of disposal (e.g. Sold, Donated, Scrapped)" value={extras[a._id] || ""} onChange={(e) => setExtra(a._id, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        )}

        <Field label="Remarks" as="textarea" rows={2} className="mt-4" value={form.remarks} onChange={set("remarks")} />

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.applyNow} onChange={(e) => setForm((f) => ({ ...f, applyNow: e.target.checked }))} className="accent-brand-600" />
          Apply now (update the asset status immediately)
        </label>
      </Modal>
    </>
  );
}