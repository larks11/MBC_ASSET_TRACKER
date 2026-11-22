import { useEffect, useState } from "react";
import { Pencil, RefreshCcw, UserPlus } from "lucide-react";
import { assetApi, employeeApi, serviceRequestApi } from "../services/index.js";
import Modal from "../components/ui/Modal.jsx";
import Field from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import Notice from "../components/ui/Notice.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { fmtDate, fmtDateTime, PRIORITY_STYLES } from "../utils/format.js";
import { SR_PRIORITIES, SR_TYPES } from "../utils/constants.js";

export function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] || "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      {priority || "—"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Confirmation dialog                                                 */
/* ------------------------------------------------------------------ */
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, busy, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {busy ? "Please wait..." : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* New / Edit request                                                  */
/* ------------------------------------------------------------------ */
const EMPTY = {
  requestorName: "", employeeId: "", positionDepartment: "", contactNo: "", email: "",
  requestType: "", priority: "Medium", subject: "", description: "", assetId: "", assetDescription: "",
};

const REQUIRED = {
  requestorName: "Employee name",
  employeeId: "Employee ID",
  positionDepartment: "Department",
  contactNo: "Contact number",
  email: "Email address",
  requestType: "Request type",
  priority: "Priority",
  subject: "Subject",
  description: "Detailed description",
};

// row: null = sarado | {} = bag-ong request | request object = edit
export function RequestFormModal({ row, onClose, onSaved, toast }) {
  const open = row !== null;
  const editing = !!row?._id;

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [empPick, setEmpPick] = useState("");

  useEffect(() => {
    if (!open) return;
    employeeApi.list({ limit: 1000, sort: "name" }).then((r) => setEmployees(r.data)).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError("");
    setEmpPick("");
    setForm(row?._id ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, row[k] ?? EMPTY[k]])) : EMPTY);
  }, [open, row?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  // Pilia ang employee aron mo-autofill ang name, ID, department, contact ug email
  const pickEmployee = (e) => {
    const id = e.target.value;
    setEmpPick(id);
    const emp = employees.find((x) => x._id === id);
    if (!emp) return;
    setForm((f) => ({
      ...f,
      requestorName: emp.name || "",
      employeeId: emp.employeeNo || "",
      positionDepartment: emp.department || "",
      contactNo: emp.contactNo || f.contactNo,
      email: emp.email || f.email,
    }));
    setErrors({});
  };

  // Kung nag-type og Asset ID, i-fill ang description gikan sa asset
  const lookupAsset = async () => {
    const id = form.assetId.trim();
    if (!id || form.assetDescription) return;
    try {
      const res = await assetApi.list({ search: id, limit: 5 });
      const a = (res.data || []).find((x) => x.assetId?.toLowerCase() === id.toLowerCase());
      if (a) {
        const desc = [a.assetType, a.brand, a.model].filter(Boolean).join(" ") + (a.serialNo ? ` (S/N ${a.serialNo})` : "");
        setForm((f) => ({ ...f, assetId: a.assetId, assetDescription: desc }));
      }
    } catch {
      /* optional ra ni */
    }
  };

  const validate = () => {
    const e = {};
    for (const [k, label] of Object.entries(REQUIRED)) {
      if (!String(form[k] ?? "").trim()) e[k] = `${label} is required`;
    }
    if (!e.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (!e.contactNo && !/^[0-9+()\-\s]{7,20}$/.test(form.contactNo.trim())) e.contactNo = "Enter a valid contact number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    setFormError("");
    if (!validate()) return;
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
    );
    setSaving(true);
    try {
      const res = editing ? await serviceRequestApi.update(row._id, payload) : await serviceRequestApi.create(payload);
      toast.success(editing ? `${res.srfNo} updated.` : `${res.srfNo} submitted successfully.`);
      onSaved?.(res);
      onClose();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit ${row.srfNo}` : "New Service Request"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : editing ? "Save changes" : "Submit request"}
          </Button>
        </>
      }
    >
      <Notice tone="error">{formError}</Notice>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Request number" value={row?.srfNo || "Auto-generated on submit"} disabled readOnly />
        <Field label="Request date" value={fmtDate(row?.dateRequested || new Date())} disabled readOnly />
      </div>

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Employee information</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Select employee (autofill, optional)" as="select" value={empPick} onChange={pickEmployee} className="sm:col-span-2">
          <option value="">Choose from the employee list...</option>
          {employees.map((e) => (
            <option key={e._id} value={e._id}>
              {e.name}{e.department ? ` · ${e.department}` : ""}
            </option>
          ))}
        </Field>
        <Field label="Employee name" required value={form.requestorName} onChange={set("requestorName")} error={errors.requestorName} />
        <Field label="Employee ID" required value={form.employeeId} onChange={set("employeeId")} error={errors.employeeId} />
        <Field label="Department" required value={form.positionDepartment} onChange={set("positionDepartment")} error={errors.positionDepartment} />
        <Field label="Contact number" required value={form.contactNo} onChange={set("contactNo")} error={errors.contactNo} />
        <Field label="Email address" required type="email" value={form.email} onChange={set("email")} error={errors.email} className="sm:col-span-2" />
      </div>

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Request details</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Request type" required as="select" value={form.requestType} onChange={set("requestType")} error={errors.requestType}>
          <option value="">Select type</option>
          {SR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Field>
        <Field label="Priority" required as="select" value={form.priority} onChange={set("priority")} error={errors.priority}>
          {SR_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </Field>
        <Field label="Subject" required value={form.subject} onChange={set("subject")} error={errors.subject} className="sm:col-span-2" />
        <Field
          label="Detailed description"
          required
          as="textarea"
          rows={4}
          value={form.description}
          onChange={set("description")}
          error={errors.description}
          className="sm:col-span-2"
        />
      </div>

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Asset (if applicable)</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Asset ID" placeholder="e.g. ICT-LP-00001" value={form.assetId} onChange={set("assetId")} onBlur={lookupAsset} />
        <Field label="Asset description" value={form.assetDescription} onChange={set("assetDescription")} />
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Request details (+ status history)                                  */
/* ------------------------------------------------------------------ */
function Info({ label, children, className = "" }) {
  return (
    <div className={`border-b border-r border-line px-3 py-2 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-0.5 break-words text-sm font-medium text-navy-800">{children || "—"}</div>
    </div>
  );
}

function Band({ children }) {
  return (
    <div className="col-span-2 border-b border-r border-line bg-brand-100 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-navy-900 sm:col-span-4">
      {children}
    </div>
  );
}

const HISTORY_LABEL = { created: "Request submitted", status: "Status updated", assignment: "Technician assigned", edited: "Details edited" };

export function DetailsModal({ id, reloadKey, onClose, onEdit, onAssign, onStatus }) {
  const [row, setRow] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setRow(null);
      return;
    }
    let live = true;
    setError("");
    serviceRequestApi
      .get(id)
      .then((r) => live && setRow(r))
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [id, reloadKey]);

  const history = (row?.statusHistory || []).slice().reverse();

  return (
    <Modal
      open={!!id}
      onClose={onClose}
      size="lg"
      title={row ? `Service request ${row.srfNo}` : "Service request"}
      footer={
        <>
          {row?.can?.edit && <Button variant="secondary" icon={Pencil} onClick={() => onEdit(row)}>Edit</Button>}
          {row?.can?.assign && <Button variant="secondary" icon={UserPlus} onClick={() => onAssign(row)}>Assign technician</Button>}
          {row?.can?.status?.length > 0 && <Button icon={RefreshCcw} onClick={() => onStatus(row)}>Update status</Button>}
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </>
      }
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!row && !error && <p className="py-10 text-center text-sm text-slate-500">Loading request...</p>}

      {row && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge status={row.status} />
            <PriorityBadge priority={row.priority} />
            <span className="text-sm text-slate-500">Submitted {fmtDateTime(row.dateRequested)}</span>
          </div>

          <div className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-4">
            <Band>Employee information</Band>
            <Info label="Employee name" className="col-span-2">{row.requestorName}</Info>
            <Info label="Employee ID">{row.employeeId}</Info>
            <Info label="Department">{row.positionDepartment}</Info>
            <Info label="Contact number">{row.contactNo}</Info>
            <Info label="Email" className="col-span-2">{row.email}</Info>
            <Info label="Submitted by">{row.createdByName}</Info>

            <Band>Request information</Band>
            <Info label="Request type" className="col-span-2">{row.requestType}</Info>
            <Info label="Priority"><PriorityBadge priority={row.priority} /></Info>
            <Info label="Status"><StatusBadge status={row.status} /></Info>
            <Info label="Subject" className="col-span-2 sm:col-span-4">{row.subject}</Info>

            <Band>Asset</Band>
            <Info label="Asset ID" className="col-span-2">{row.assetId}</Info>
            <Info label="Asset description" className="col-span-2">{row.assetDescription}</Info>

            <Band>Assignment</Band>
            <Info label="Assigned technician" className="col-span-2">{row.assignedToName}</Info>
            <Info label="Assignment date">{row.assignedAt ? fmtDateTime(row.assignedAt) : ""}</Info>
            <Info label="Assignment remarks">{row.assignmentRemarks}</Info>
          </div>

          <h3 className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Description</h3>
          <p className="whitespace-pre-wrap rounded-lg border border-line bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            {row.description || "—"}
          </p>

          {row.resolution && (
            <>
              <h3 className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resolution{row.completedAt ? ` (${fmtDateTime(row.completedAt)})` : ""}
              </h3>
              <p className="whitespace-pre-wrap rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-slate-700">{row.resolution}</p>
            </>
          )}
          {row.rejectReason && (
            <>
              <h3 className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Reason for rejection</h3>
              <p className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{row.rejectReason}</p>
            </>
          )}

          <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status history ({history.length})
          </h3>
          {history.length === 0 ? (
            <p className="rounded border border-dashed border-line px-4 py-6 text-center text-sm text-slate-500">No history recorded.</p>
          ) : (
            <ol className="ml-2 border-l border-line">
              {history.map((h) => (
                <li key={h._id || h.at} className="relative pb-4 pl-5">
                  <span className="absolute -left-[6px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{HISTORY_LABEL[h.kind] || "Update"}</p>
                    {h.kind === "status" && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        {h.fromStatus && <StatusBadge status={h.fromStatus} />} <span>→</span> <StatusBadge status={h.toStatus} />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {fmtDateTime(h.at)} · {h.byName || "System"}
                  </p>
                  {h.remarks && <p className="mt-0.5 text-sm text-slate-600">{h.remarks}</p>}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Assign technician                                                   */
/* ------------------------------------------------------------------ */
export function AssignModal({ row, technicians, onClose, onDone, toast }) {
  const open = !!row;
  const [techId, setTechId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!row) return;
    setTechId(row.assignedTo || "");
    setRemarks("");
    setError("");
  }, [row?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!techId) return setError("Please select a technician.");
    setSaving(true);
    setError("");
    try {
      const res = await serviceRequestApi.assign(row._id, { technicianId: techId, remarks });
      toast.success(`${res.srfNo} assigned to ${res.assignedToName}.`);
      onDone?.(res);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={row ? `Assign technician · ${row.srfNo}` : ""}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Assigning..." : "Assign"}</Button>
        </>
      }
    >
      <Notice tone="error">{error}</Notice>
      <div className="space-y-3">
        <Field label="IT technician" required as="select" value={techId} onChange={(e) => setTechId(e.target.value)}>
          <option value="">Select technician</option>
          {technicians.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}{t.role === "admin" ? " (Admin)" : ""}
            </option>
          ))}
        </Field>
        <Field label="Assignment remarks" as="textarea" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Update status                                                       */
/* ------------------------------------------------------------------ */
const REMARK_LABEL = {
  Approved: "Remarks (optional)",
  "In Progress": "Remarks (optional)",
  "On Hold": "Reason for putting on hold",
  Completed: "Resolution details",
  Rejected: "Reason for rejection",
};
const REMARK_REQUIRED = ["Rejected", "On Hold", "Completed"];

export function StatusModal({ row, onClose, onDone, toast }) {
  const open = !!row;
  const options = row?.can?.status || [];
  const [status, setStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!row) return;
    setStatus(row.can?.status?.[0] || "");
    setRemarks("");
    setError("");
  }, [row?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsRemarks = REMARK_REQUIRED.includes(status);

  const submit = async () => {
    if (!status) return setError("Select the new status.");
    if (needsRemarks && !remarks.trim()) return setError(`${REMARK_LABEL[status]} is required.`);
    setSaving(true);
    setError("");
    try {
      const res = await serviceRequestApi.changeStatus(row._id, { status, remarks: remarks.trim() });
      toast.success(`${res.srfNo} is now ${res.status}.`);
      onDone?.(res);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={row ? `Update status · ${row.srfNo}` : ""}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant={status === "Rejected" ? "danger" : "primary"} onClick={submit} disabled={saving || !options.length}>
            {saving ? "Saving..." : "Update status"}
          </Button>
        </>
      }
    >
      <Notice tone="error">{error}</Notice>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          Current status: {row && <StatusBadge status={row.status} />}
        </div>
        <Field label="New status" required as="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {options.map((s) => <option key={s} value={s}>{s}</option>)}
        </Field>
        <Field
          label={REMARK_LABEL[status] || "Remarks"}
          required={needsRemarks}
          as="textarea"
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>
    </Modal>
  );
}