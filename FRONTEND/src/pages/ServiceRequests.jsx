import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2, ClipboardList, Eye, FilterX, Hourglass, Pencil, Plus, RefreshCcw, Timer, Trash2, UserPlus, Wrench, XCircle,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { serviceRequestApi } from "../services/index.js";
import usePaginated from "../hooks/usePaginated.js";
import { useAuth } from "../context/AuthContext.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import Button from "../components/ui/Button.jsx";
import Notice from "../components/ui/Notice.jsx";
import ToastStack, { useToasts } from "../components/ui/Toast.jsx";
import { fmtDate, PRIORITY_COLORS, SR_STATUS_COLORS } from "../utils/format.js";
import { SR_PRIORITIES, SR_STATUSES, SR_TYPES } from "../utils/constants.js";
import {
  AssignModal, ConfirmDialog, DetailsModal, PriorityBadge, RequestFormModal, StatusModal,
} from "./ServiceRequestModals.jsx";

const FILTER_KEYS = ["requestType", "priority", "status", "assignedTo", "from", "to"];

const fmtDuration = (h) => {
  if (h == null) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h} hrs`;
  return `${(h / 24).toFixed(1)} days`;
};

/* ---------------- small UI pieces ---------------- */
function StatCard({ icon: Icon, label, value, color, onClick, active, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
        active ? "border-brand-500 ring-2 ring-brand-100" : "border-line"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon size={22} />
      </span>
      <span className="min-w-0">
        <span className="tabular block text-2xl font-semibold text-navy-900">{loading ? "…" : value}</span>
        <span className="block truncate text-xs text-slate-500">{label}</span>
      </span>
    </button>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-line bg-white p-4 shadow-sm ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-navy-900">{title}</h2>
      {children}
    </section>
  );
}

const ChartEmpty = () => <p className="py-14 text-center text-sm text-slate-500">No data yet.</p>;

function FilterSel({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
      className="rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.value} value={o.value}>{o.label}</option>
        )
      )}
    </select>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-500">
      {label}
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
      />
    </label>
  );
}

const TONES = {
  outline: "border border-brand-600 bg-white text-brand-700 hover:bg-brand-50",
  soft: "bg-brand-100 text-brand-700 hover:bg-brand-200",
  dark: "bg-navy-900 text-white hover:bg-navy-800",
  solid: "bg-brand-600 text-white hover:bg-brand-700",
  danger: "bg-red-50 text-red-600 hover:bg-red-100",
};

function IconBtn({ title, icon: Icon, tone, onClick }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${TONES[tone]}`}
    >
      <Icon size={15} />
    </button>
  );
}

/* ---------------- page ---------------- */
export default function ServiceRequests() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const toast = useToasts();

  const table = usePaginated((p, s) => serviceRequestApi.list(p, s), { initialSort: "-dateRequested" });
  const { refetch } = table;

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [detailKey, setDetailKey] = useState(0);

  const [formRow, setFormRow] = useState(null); // null = sarado | {} = bag-o | row = edit
  const [viewId, setViewId] = useState(null);
  const [assignRow, setAssignRow] = useState(null);
  const [statusRow, setStatusRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadStats = useCallback(() => {
    serviceRequestApi
      .stats()
      .then((s) => {
        setStats(s);
        setStatsError("");
      })
      .catch((e) => setStatsError(e.message));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    if (isAdmin) serviceRequestApi.technicians().then(setTechnicians).catch(() => {});
  }, [isAdmin]);

  const refreshAll = useCallback(() => {
    refetch();
    loadStats();
    setDetailKey((k) => k + 1);
  }, [refetch, loadStats]);

  const hasFilters = !!table.search || FILTER_KEYS.some((k) => table.filters[k]);
  const clearFilters = () => {
    FILTER_KEYS.forEach((k) => table.setFilter(k, ""));
    table.setSearch("");
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await serviceRequestApi.remove(deleteRow._id);
      toast.success(`${deleteRow.srfNo} deleted.`);
      if (viewId === deleteRow._id) setViewId(null);
      setDeleteRow(null);
      refreshAll();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "srfNo", header: "Request No.", sortable: true, render: (r) => <span className="tabular font-semibold text-navy-800">{r.srfNo}</span> },
    { key: "dateRequested", header: "Date Submitted", sortable: true, render: (r) => fmtDate(r.dateRequested) },
    {
      key: "requestorName",
      header: "Employee",
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.requestorName}</p>
          {r.employeeId && <p className="text-xs text-slate-500">{r.employeeId}</p>}
        </div>
      ),
    },
    { key: "positionDepartment", header: "Department", sortable: true },
    { key: "requestType", header: "Request Type", sortable: true, render: (r) => r.requestType || "—" },
    {
      key: "subject",
      header: "Subject",
      render: (r) => <span className="block max-w-[220px] truncate" title={r.subject}>{r.subject || r.description?.slice(0, 60) || "—"}</span>,
    },
    { key: "priority", header: "Priority", sortable: true, render: (r) => <PriorityBadge priority={r.priority} /> },
    {
      key: "assignedToName",
      header: "Assigned Technician",
      sortable: true,
      render: (r) => r.assignedToName || <span className="text-slate-400">Unassigned</span>,
    },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <IconBtn title="View details" tone="outline" icon={Eye} onClick={() => setViewId(r._id)} />
          {r.can?.edit && <IconBtn title="Edit" tone="soft" icon={Pencil} onClick={() => setFormRow(r)} />}
          {r.can?.assign && <IconBtn title="Assign technician" tone="dark" icon={UserPlus} onClick={() => setAssignRow(r)} />}
          {r.can?.status?.length > 0 && <IconBtn title="Update status" tone="solid" icon={RefreshCcw} onClick={() => setStatusRow(r)} />}
          {r.can?.delete && <IconBtn title="Delete" tone="danger" icon={Trash2} onClick={() => setDeleteRow(r)} />}
        </div>
      ),
    },
  ];

  const cards = stats && [
    { label: "Total Requests", icon: ClipboardList, color: "#0a2e1f", value: stats.total, status: "" },
    { label: "Pending Requests", icon: Hourglass, color: SR_STATUS_COLORS.Pending, value: stats.byStatus.Pending, status: "Pending" },
    { label: "In Progress", icon: Wrench, color: SR_STATUS_COLORS["In Progress"], value: stats.byStatus["In Progress"], status: "In Progress" },
    { label: "Completed", icon: CheckCircle2, color: SR_STATUS_COLORS.Completed, value: stats.byStatus.Completed, status: "Completed" },
    { label: "Rejected", icon: XCircle, color: SR_STATUS_COLORS.Rejected, value: stats.byStatus.Rejected, status: "Rejected" },
  ];
  const hasAvg = stats?.avgResolutionHours != null;

  const statusData = stats ? SR_STATUSES.map((s) => ({ name: s, value: stats.byStatus[s] })).filter((d) => d.value > 0) : [];
  const typeData = stats ? SR_TYPES.map((t) => ({ name: t, count: stats.byType[t] })) : [];
  const priorityData = stats ? SR_PRIORITIES.map((p) => ({ name: p, count: stats.byPriority[p] })) : [];
  const empty = stats && stats.total === 0;

  return (
    <>
      <PageHeader
        title="IT Service Requests"
        description="Manage, monitor, and process employee IT service requests."
        actions={<Button icon={Plus} onClick={() => setFormRow({})}>New Service Request</Button>}
      />
      <Notice tone="error">{statsError}</Notice>

      {/* Summary cards */}
      <div className={`mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 ${hasAvg ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
        {(cards || Array.from({ length: 5 }, () => ({ label: "", icon: ClipboardList, color: "#64748b" }))).map((c, i) => (
          <StatCard
            key={c.label || i}
            icon={c.icon}
            label={c.label || "Loading"}
            value={c.value}
            color={c.color}
            loading={!stats}
            active={!!stats && table.filters.status === c.status && c.status !== ""}
            onClick={stats ? () => table.setFilter("status", c.status) : undefined}
          />
        ))}
        {hasAvg && <StatCard icon={Timer} label={`Avg. resolution time (${stats.resolvedCount} done)`} value={fmtDuration(stats.avgResolutionHours)} color="#167045" />}
      </div>

      {/* Charts */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Panel title="Requests by status">
          {!stats ? <ChartEmpty /> : empty ? <ChartEmpty /> : (
            <>
              <div style={{ height: 190 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2}>
                      {statusData.map((d) => <Cell key={d.name} fill={SR_STATUS_COLORS[d.name]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {statusData.map((d) => (
                  <li key={d.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SR_STATUS_COLORS[d.name] }} />
                      {d.name}
                    </span>
                    <span className="tabular font-semibold">{d.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel title="Requests by type" className="lg:col-span-2">
          {!stats || empty ? <ChartEmpty /> : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid horizontal={false} stroke="#e5ece7" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "#eef7f1" }} />
                  <Bar dataKey="count" name="Requests" fill="#167045" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Requests by priority">
          {!stats || empty ? <ChartEmpty /> : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={priorityData} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="#e5ece7" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "#eef7f1" }} />
                  <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]} barSize={30}>
                    {priorityData.map((d) => <Cell key={d.name} fill={PRIORITY_COLORS[d.name]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Monthly request trend (last 12 months)" className="lg:col-span-2">
          {!stats || empty ? <ChartEmpty /> : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={stats.monthly} margin={{ left: -16, right: 16 }}>
                  <CartesianGrid vertical={false} stroke="#e5ece7" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Requests" stroke="#167045" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* Table + filters */}
      <DataTable
        {...table}
        columns={columns}
        searchPlaceholder="Search request no., employee, subject..."
        emptyText="No service requests yet. Click “New Service Request” to submit the first one."
        filters={
          <>
            <FilterSel value={table.filters.requestType} onChange={(v) => table.setFilter("requestType", v)} options={SR_TYPES} placeholder="All request types" />
            <FilterSel value={table.filters.priority} onChange={(v) => table.setFilter("priority", v)} options={SR_PRIORITIES} placeholder="All priorities" />
            <FilterSel value={table.filters.status} onChange={(v) => table.setFilter("status", v)} options={SR_STATUSES} placeholder="All statuses" />
            {isAdmin && (
              <FilterSel
                value={table.filters.assignedTo}
                onChange={(v) => table.setFilter("assignedTo", v)}
                options={[{ value: "unassigned", label: "Unassigned" }, ...technicians.map((t) => ({ value: t._id, label: t.name }))]}
                placeholder="All technicians"
              />
            )}
            <DateInput label="From" value={table.filters.from} onChange={(v) => table.setFilter("from", v)} />
            <DateInput label="To" value={table.filters.to} onChange={(v) => table.setFilter("to", v)} />
            {hasFilters && (
              <Button variant="secondary" icon={FilterX} onClick={clearFilters}>Clear Filters</Button>
            )}
          </>
        }
      />

      {/* Modals */}
      <DetailsModal
        id={viewId}
        reloadKey={detailKey}
        onClose={() => setViewId(null)}
        onEdit={(r) => setFormRow(r)}
        onAssign={(r) => setAssignRow(r)}
        onStatus={(r) => setStatusRow(r)}
      />
      <RequestFormModal row={formRow} onClose={() => setFormRow(null)} onSaved={refreshAll} toast={toast} />
      <AssignModal row={assignRow} technicians={technicians} onClose={() => setAssignRow(null)} onDone={refreshAll} toast={toast} />
      <StatusModal row={statusRow} onClose={() => setStatusRow(null)} onDone={refreshAll} toast={toast} />
      <ConfirmDialog
        open={!!deleteRow}
        danger
        busy={deleting}
        title="Delete service request"
        message={deleteRow ? `Delete ${deleteRow.srfNo} (${deleteRow.requestorName})? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteRow(null)}
      />

      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}