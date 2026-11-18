import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { employeeApi, repairApi } from "../services/index.js";
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
import { fmtDate } from "../utils/format.js";

const STATUSES = ["For Repair", "Repaired", "Damaged"];
const EMPTY = { reportedBy: "", problem: "", solution: "", technician: "", status: "For Repair", dateStarted: "", dateFinished: "", checkedBy: "", remarks: "" };
const d10 = (d) => (d ? String(d).slice(0, 10) : "");

export default function Repairs() {
  const table = usePaginated((p, s) => repairApi.list(p, s), { initialSort: "-dateReceived" });
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null); // {} = bag-o, {_id} = edit
  const [form, setForm] = useState(EMPTY);
  const [asset, setAsset] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ tone: "success", text: "" });

  useEffect(() => {
    employeeApi.list({ limit: 100, sort: "name" }).then((r) => setEmployees(r.data)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openForm = (t) => {
    setEditing(t || {});
    setAsset([]);
    setError("");
    setForm(
      t
        ? {
            ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, t[k] ?? ""])),
            reportedBy: t.reportedBy?._id || "",
            dateStarted: d10(t.dateStarted),
            dateFinished: d10(t.dateFinished),
          }
        : EMPTY
    );
  };

  const save = async () => {
    if (!editing._id && !asset.length) return setError("Select the asset.");
    if (!form.problem.trim()) return setError("Problem / diagnosis is required.");

    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? undefined : v]));
    payload.problem = form.problem;
    if (!editing._id) payload.asset = asset[0]._id;

    setSaving(true);
    setError("");
    try {
      if (editing._id) await repairApi.update(editing._id, payload);
      else await repairApi.create(payload);
      setNotice({ tone: "success", text: editing._id ? "Ticket updated. Asset status synced." : "Ticket created. Asset marked For Repair." });
      setEditing(null);
      table.refetch();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete ${t.ticketNo}?`)) return;
    try {
      await repairApi.remove(t._id);
      setNotice({ tone: "success", text: "Ticket deleted." });
      table.refetch();
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    }
  };

  const columns = [
    { key: "ticketNo", header: "Ticket no.", sortable: true, render: (r) => <span className="tabular font-medium text-navy-800">{r.ticketNo}</span> },
    { key: "dateReceived", header: "Received", sortable: true, render: (r) => fmtDate(r.dateReceived) },
    { key: "assetCode", header: "Asset", render: (r) => `${r.assetCode || ""} · ${r.assetType || ""}` },
    { key: "problem", header: "Problem", className: "max-w-xs truncate" },
    { key: "technician", header: "Technician" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" icon={Pencil} className="!px-2 !py-1" onClick={() => openForm(r)}>Edit</Button>
          <Button variant="ghost" icon={Trash2} className="!px-2 !py-1 text-red-600" onClick={() => remove(r)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="For repair / diagnose"
        description="Log problems, assign technicians, and track repairs. The asset status updates automatically."
        actions={<Button icon={Plus} onClick={() => openForm()}>New ticket</Button>}
      />
      <Notice tone={notice.tone} onClose={() => setNotice({ ...notice, text: "" })}>{notice.text}</Notice>

      <DataTable
        {...table}
        columns={columns}
        searchPlaceholder="Search by ticket, asset, problem, technician..."
        filters={<FilterSelect value={table.filters.status} onChange={(v) => table.setFilter("status", v)} options={STATUSES} placeholder="All statuses" />}
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing?._id ? `Edit ${editing.ticketNo}` : "New repair ticket"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save ticket"}</Button>
          </>
        }
      >
        <Notice tone="error">{error}</Notice>

        {editing?._id ? (
          <p className="mb-4 text-sm text-slate-600">
            Asset: <span className="font-medium text-navy-800">{editing.assetCode}</span> · {editing.assetType}
          </p>
        ) : (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Asset</h3>
            <AssetPicker single allow={(a) => a.status !== "Disposed"} selected={asset} onChange={setAsset} />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Reported by" as="select" value={form.reportedBy} onChange={set("reportedBy")}>
            <option value="">Select employee</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
          </Field>
          <Field label="Status" as="select" value={form.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Field>
          <Field label="Problem / diagnosis" required as="textarea" rows={2} className="sm:col-span-2" value={form.problem} onChange={set("problem")} />
          <Field label="Solution / recommendation" as="textarea" rows={2} className="sm:col-span-2" value={form.solution} onChange={set("solution")} />
          <Field label="Technician" value={form.technician} onChange={set("technician")} />
          <Field label="Checked by" value={form.checkedBy} onChange={set("checkedBy")} />
          <Field label="Date started" type="date" value={form.dateStarted} onChange={set("dateStarted")} />
          <Field label="Date finished" type="date" value={form.dateFinished} onChange={set("dateFinished")} />
          <Field label="Remarks" as="textarea" rows={2} className="sm:col-span-2" value={form.remarks} onChange={set("remarks")} />
        </div>
      </Modal>
    </>
  );
}