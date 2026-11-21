import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Briefcase, CalendarDays, CheckCircle2, ChevronLeft,
  ChevronRight, Eye, Loader2, Mail, Pencil, Phone, Plus, Search, Trash2, UserRound, Users, X,
} from "lucide-react";
import { employeeApi } from "../services/index.js";
import { useAuth } from "../context/AuthContext.jsx";

const STATUSES = ["Regular", "Probationary", "Contractual", "Project-based", "Resigned"];
const STATUS_CLS = {
  Regular: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Probationary: "bg-amber-50 text-amber-700 ring-amber-200",
  Contractual: "bg-sky-50 text-sky-700 ring-sky-200",
  "Project-based": "bg-violet-50 text-violet-700 ring-violet-200",
  Resigned: "bg-slate-100 text-slate-600 ring-slate-200",
};
const EMPTY = {
  employeeNo: "", name: "", department: "", position: "", email: "",
  contactNo: "", employmentStatus: "Regular", dateHired: "",
};
const EMAIL_RE = /^\S+@\S+\.\S+$/;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—";
const toInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const initials = (n = "") => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "E";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#00A651] focus:outline-none focus:ring-4 focus:ring-[#00A651]/15";
const selectCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#00A651] focus:outline-none focus:ring-4 focus:ring-[#00A651]/15";

function StatusBadge({ status }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_CLS[status] || STATUS_CLS.Regular}`}>
      {status || "Regular"}
    </span>
  );
}

function ModalShell({ title, icon: Icon, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-[#003B25]/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full animate-scale-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#003B25] to-[#006B3C] px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white"><Icon size={18} /></span>
          <h2 className="flex-1 text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#006B3C] to-[#00A651] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#00A651]/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

function FormField({ label, required, error, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function EmployeeForm({ initial, departments, onClose, onSaved }) {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState(
    initial
      ? { ...EMPTY, ...initial, dateHired: toInput(initial.dateHired), employmentStatus: initial.employmentStatus || "Regular" }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.employeeNo.trim()) e.employeeNo = "Employee ID is required.";
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.department.trim()) e.department = "Department is required.";
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) e.email = "Please enter a valid email.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const body = {
      employeeNo: form.employeeNo.trim(),
      name: form.name.trim(),
      department: form.department.trim(),
      position: form.position.trim(),
      email: form.email.trim(),
      contactNo: form.contactNo.trim(),
      employmentStatus: form.employmentStatus,
      dateHired: form.dateHired || null,
    };

    setSaving(true);
    try {
      if (isEdit) await employeeApi.update(initial._id, body);
      else await employeeApi.create(body);
      onSaved(isEdit ? "Employee updated successfully." : "Employee added successfully.");
    } catch (err) {
      if (err.status === 409 && /employeeNo/i.test(err.message)) setErrors({ employeeNo: "This Employee ID already exists." });
      else {
        setFormError(err.message || "Failed to save employee.");
        if (err.details) setErrors(err.details);
      }
    } finally {
      setSaving(false);
    }
  };

  const ring = (k) => (errors[k] ? "!border-red-400" : "");

  return (
    <ModalShell
      wide
      icon={isEdit ? Pencil : Plus}
      title={isEdit ? "Edit employee" : "Add employee"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" form="employee-form" className={btnPrimary} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Saving..." : isEdit ? "Save changes" : "Save employee"}
          </button>
        </>
      }
    >
      {formError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> {formError}
        </div>
      )}
      <form id="employee-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Employee ID" required error={errors.employeeNo}>
          <input className={`${inputCls} ${ring("employeeNo")}`} value={form.employeeNo} onChange={set("employeeNo")} placeholder="e.g. MAC-0001" />
        </FormField>
        <FormField label="Full name" required error={errors.name}>
          <input className={`${inputCls} ${ring("name")}`} value={form.name} onChange={set("name")} placeholder="Juan Dela Cruz" />
        </FormField>
        <FormField label="Department" required error={errors.department}>
          <input className={`${inputCls} ${ring("department")}`} list="dept-list" value={form.department} onChange={set("department")} placeholder="e.g. Accounting" />
          <datalist id="dept-list">{departments.map((d) => <option key={d} value={d} />)}</datalist>
        </FormField>
        <FormField label="Position" error={errors.position}>
          <input className={inputCls} value={form.position} onChange={set("position")} placeholder="e.g. Accountant" />
        </FormField>
        <FormField label="Email address" error={errors.email}>
          <input type="email" className={`${inputCls} ${ring("email")}`} value={form.email} onChange={set("email")} placeholder="name@example.com" />
        </FormField>
        <FormField label="Contact number" error={errors.contactNo}>
          <input className={inputCls} value={form.contactNo} onChange={set("contactNo")} placeholder="09XX XXX XXXX" />
        </FormField>
        <FormField label="Employment status" error={errors.employmentStatus}>
          <select className={`${inputCls} bg-white`} value={form.employmentStatus} onChange={set("employmentStatus")}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Date hired" error={errors.dateHired}>
          <input type="date" className={inputCls} value={form.dateHired} onChange={set("dateHired")} />
        </FormField>
      </form>
    </ModalShell>
  );
}

function ViewModal({ emp, onClose, canEdit, onEdit }) {
  const rows = [
    [UserRound, "Employee ID", emp.employeeNo || "—"],
    [Briefcase, "Department", emp.department || "—"],
    [Briefcase, "Position", emp.position || "—"],
    [Mail, "Email address", emp.email || "—"],
    [Phone, "Contact number", emp.contactNo || "—"],
    [CalendarDays, "Date hired", fmtDate(emp.dateHired)],
  ];
  return (
    <ModalShell
      icon={Eye}
      title="Employee details"
      onClose={onClose}
      footer={
        <>
          <button className={btnSecondary} onClick={onClose}>Close</button>
          {canEdit && <button className={btnPrimary} onClick={onEdit}><Pencil size={16} /> Edit</button>}
        </>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#DDF8E9] text-lg font-bold text-[#006B3C]">
          {initials(emp.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-[#003B25]">{emp.name}</p>
          <StatusBadge status={emp.employmentStatus} />
        </div>
      </div>
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {rows.map(([Icon, k, v]) => (
          <div key={k} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DDF8E9] text-[#006B3C]"><Icon size={15} /></span>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="truncate text-sm font-medium text-slate-800">{v}</dd>
            </div>
          </div>
        ))}
      </dl>
    </ModalShell>
  );
}

function SortTh({ label, field, sort, onSort }) {
  const active = sort === field || sort === `-${field}`;
  const Icon = !active ? ArrowUpDown : sort.startsWith("-") ? ArrowDown : ArrowUp;
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      <button onClick={() => onSort(field)} className="inline-flex items-center gap-1.5 hover:text-[#006B3C]">
        {label} <Icon size={13} className={active ? "text-[#00A651]" : "text-slate-300"} />
      </button>
    </th>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [departments, setDepartments] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [formFor, setFormFor] = useState(null); // null | {} (bag-o) | employee (edit)
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Debounce sa search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadDepartments = useCallback(() => {
    employeeApi.departments().then(setDepartments).catch(() => {});
  }, []);
  useEffect(loadDepartments, [loadDepartments]);

  // Load ang employees gikan sa database
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    employeeApi
      .list(
        { page, limit, sort, search: search || undefined, department: department || undefined, employmentStatus: status || undefined },
        ctrl.signal
      )
      .then((res) => {
        setRows(res.data);
        setMeta(res.meta);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
        setError(e.message || "Failed to load employees.");
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [page, limit, sort, search, department, status, reloadKey]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const onSort = (field) => {
    setSort((s) => (s === field ? `-${field}` : field));
    setPage(1);
  };

  const onSaved = (text) => {
    setFormFor(null);
    setNotice({ type: "success", text });
    setReloadKey((k) => k + 1);
    loadDepartments();
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await employeeApi.remove(deleting._id);
      setNotice({ type: "success", text: `${deleting.name} was deleted.` });
      setDeleting(null);
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else setReloadKey((k) => k + 1);
      loadDepartments();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const hasFilters = search || department || status;
  const from = meta.total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, meta.total);
  const iconBtn = "rounded-lg p-2 text-slate-500 transition-colors";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-[#003B25]">File Maintenance</h1>
          <p className="mt-1 text-slate-500">Manage and maintain employee information and records.</p>
        </div>
        {canEdit && (
          <button className={btnPrimary} onClick={() => setFormFor({})}>
            <Plus size={18} /> Add employee
          </button>
        )}
      </div>

      {notice && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${notice.type === "success" ? "bg-[#DDF8E9] text-[#006B3C]" : "bg-red-50 text-red-700"}`}
          role="status"
        >
          {notice.type === "success" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      {/* Card */}
      <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-[#003B25] to-[#006B3C] px-5 py-3.5">
          <Users size={18} className="text-[#6ee7b7]" />
          <h2 className="flex-1 text-sm font-semibold uppercase tracking-wide text-white">Employee records</h2>
          <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold text-white">{meta.total} total</span>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Employee ID, name, or department"
              className={`${inputCls} pl-10`}
            />
          </div>
          <select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} className={selectCls} aria-label="Filter by department">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls} aria-label="Filter by employment status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {hasFilters && (
            <button
              className="text-sm font-medium text-[#006B3C] hover:text-[#00A651]"
              onClick={() => { setSearchInput(""); setSearch(""); setDepartment(""); setStatus(""); setPage(1); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <SortTh label="Employee ID" field="employeeNo" sort={sort} onSort={onSort} />
                <SortTh label="Full name" field="name" sort={sort} onSort={onSort} />
                <SortTh label="Department" field="department" sort={sort} onSort={onSort} />
                <SortTh label="Position" field="position" sort={sort} onSort={onSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact number</th>
                <SortTh label="Status" field="employmentStatus" sort={sort} onSort={onSort} />
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="mx-auto animate-spin text-[#00A651]" /></td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-red-600">
                    <AlertCircle className="mx-auto mb-2" /> {error}
                    <div><button className="mt-2 font-semibold text-[#006B3C] underline" onClick={() => setReloadKey((k) => k + 1)}>Try again</button></div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#DDF8E9] text-[#006B3C]"><Users size={26} /></span>
                    <p className="font-semibold text-[#003B25]">{hasFilters ? "No employees match your search." : "No employee records yet."}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {hasFilters ? "Try a different keyword or clear the filters." : canEdit ? "Click “Add employee” to create the first record." : "Records added by an administrator will appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id} className="transition-colors hover:bg-[#F8FAFC]">
                    <td className="tabular whitespace-nowrap px-4 py-3 font-medium text-[#003B25]">{r.employeeNo || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDF8E9] text-xs font-bold text-[#006B3C]">{initials(r.name)}</span>
                        <span className="font-medium text-slate-800">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.department || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.position || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.contactNo || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.employmentStatus} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-0.5">
                        <button className={`${iconBtn} hover:bg-[#DDF8E9] hover:text-[#006B3C]`} title="View" aria-label="View" onClick={() => setViewing(r)}><Eye size={17} /></button>
                        {canEdit && (
                          <>
                            <button className={`${iconBtn} hover:bg-[#DDF8E9] hover:text-[#006B3C]`} title="Edit" aria-label="Edit" onClick={() => setFormFor(r)}><Pencil size={17} /></button>
                            <button className={`${iconBtn} hover:bg-red-50 hover:text-red-600`} title="Delete" aria-label="Delete" onClick={() => setDeleting(r)}><Trash2 size={17} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-3">
            <span>Show</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className={`${selectCls} !py-1.5`} aria-label="Rows per page">
              {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
            </select>
            <span>entries</span>
          </div>
          <span>Showing {from} to {to} of {meta.total} entries</span>
          <div className="flex items-center gap-1">
            <button className={`${iconBtn} border border-line enabled:hover:bg-slate-50 disabled:opacity-40`} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span className="px-3 font-medium text-slate-700">{page} / {meta.pages || 1}</span>
            <button className={`${iconBtn} border border-line enabled:hover:bg-slate-50 disabled:opacity-40`} disabled={page >= (meta.pages || 1)} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {formFor && <EmployeeForm initial={formFor._id ? formFor : null} departments={departments} onClose={() => setFormFor(null)} onSaved={onSaved} />}
      {viewing && (
        <ViewModal
          emp={viewing}
          canEdit={canEdit}
          onClose={() => setViewing(null)}
          onEdit={() => { const e = viewing; setViewing(null); setFormFor(e); }}
        />
      )}
      {deleting && (
        <ModalShell
          icon={Trash2}
          title="Delete employee"
          onClose={() => !deleteBusy && setDeleting(null)}
          footer={
            <>
              <button className={btnSecondary} disabled={deleteBusy} onClick={() => setDeleting(null)}>Cancel</button>
              <button
                onClick={confirmDelete}
                disabled={deleteBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
              >
                {deleteBusy && <Loader2 size={16} className="animate-spin" />} Yes, delete
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong className="text-slate-900">{deleting.name}</strong>
            {deleting.employeeNo ? ` (${deleting.employeeNo})` : ""}? This action cannot be undone.
          </p>
        </ModalShell>
      )}
    </div>
  );
}