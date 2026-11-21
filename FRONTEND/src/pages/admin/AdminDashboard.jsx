import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle, CheckCircle2, Clock, KeyRound, Loader2, Search, ShieldCheck,
  Trash2, UserCheck, UserX, Users, X, XCircle,
} from "lucide-react";
import { adminApi } from "../../services/adminApi.js";
import { useAuth } from "../../context/AuthContext.jsx";
import ChangePasswordForm from "../../components/ChangePasswordForm.jsx";

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "U";

const STATUS = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 ring-red-200" },
};

function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.cls}`}>{s.label}</span>;
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="tabular text-2xl font-bold text-navy-800">{value ?? "–"}</p>
          <p className="truncate text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, icon: Icon, children, tone = "neutral" }) {
  const tones = {
    neutral: "border-line text-slate-700 hover:bg-slate-50",
    approve: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    reject: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      <Icon size={14} /> {children}
    </button>
  );
}

function UserModal({ u, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = [
    ["Full name", u.name],
    ["Username", u.username ? `@${u.username}` : "—"],
    ["Email", u.email],
    ["Role", u.role === "admin" ? "Administrator" : "User"],
    ["Status", <StatusPill key="s" status={u.status} />],
    ["Requested on", fmt(u.createdAt)],
    ["Reviewed by", u.reviewedBy?.name || "—"],
    ["Reviewed on", fmt(u.reviewedAt)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-navy-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-2xl bg-white shadow-pop">
        <div className="flex items-center gap-3 bg-gradient-to-r from-navy-800 to-navy-700 px-5 py-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-navy-800">
            {initials(u.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{u.name}</p>
            <p className="truncate text-xs text-white/70">{u.email}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <dl className="max-h-[60vh] divide-y divide-line overflow-y-auto">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="min-w-0 truncate text-right font-medium text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* mode "requests" = pending ra | mode "all" = tanang users (naay filter ug search) */
function UsersPanel({ mode, onChanged, onNotice }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(mode === "requests" ? "pending" : "");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(() => {
    setError("");
    return adminApi
      .users({ status: status || undefined, search: search.trim() || undefined })
      .then((r) => setUsers(r.users))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (u, kind) => {
    if (kind === "reject" && !window.confirm(`Reject ${u.name}? They will not be able to log in.`)) return;
    if (kind === "remove" && !window.confirm(`Delete ${u.name}'s account permanently? This cannot be undone.`)) return;

    setBusyId(u._id);
    try {
      const res = await adminApi[kind](u._id);
      onNotice({ type: "success", text: `${u.name}: ${res.message}` });
      await load();
      onChanged();
    } catch (e) {
      onNotice({ type: "error", text: e.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
      {mode === "all" && (
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, username or email"
              className="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-red-600">
          <AlertCircle size={18} /> {error}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-14 text-center text-sm text-slate-500">
          <CheckCircle2 size={30} className="text-brand-400" />
          {mode === "requests" ? "No pending account requests." : "No users found."}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {users.map((u) => {
            const isSelf = String(u._id) === String(me?._id);
            const locked = u.role === "admin" || isSelf; // admin accounts: View ra
            const busy = busyId === u._id;
            return (
              <li key={u._id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-navy-800">
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="truncate">{u.name}</span>
                      {u.role === "admin" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-navy-800 px-2 py-0.5 text-[10px] font-semibold text-white">
                          <ShieldCheck size={11} /> Admin
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {u.username ? `@${u.username} · ` : ""}{u.email}
                    </p>
                    <p className="text-[11px] text-slate-400">Requested {fmt(u.createdAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={u.status} />
                  <ActionBtn icon={Users} onClick={() => setViewing(u)}>View</ActionBtn>
                  {!locked && u.status !== "approved" && (
                    <ActionBtn icon={UserCheck} tone="approve" disabled={busy} onClick={() => act(u, "approve")}>Approve</ActionBtn>
                  )}
                  {!locked && u.status !== "rejected" && (
                    <ActionBtn icon={UserX} tone="reject" disabled={busy} onClick={() => act(u, "reject")}>
                      {u.status === "approved" ? "Revoke" : "Reject"}
                    </ActionBtn>
                  )}
                  {!locked && (
                    <ActionBtn icon={Trash2} tone="danger" disabled={busy} onClick={() => act(u, "remove")}>
                      {mode === "requests" ? "Delete request" : "Delete"}
                    </ActionBtn>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {viewing && <UserModal u={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("requests");
  const [stats, setStats] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadStats = useCallback(() => {
    adminApi.stats().then(setStats).catch(() => {});
  }, []);
  useEffect(loadStats, [loadStats]);

  // Auto-hide sa notice
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const onChanged = () => {
    loadStats();
    window.dispatchEvent(new Event("admin:changed")); // i-update ang sidebar badge
  };

  const tabs = [
    { id: "requests", label: "Account Requests", icon: Clock, count: stats?.pending },
    { id: "users", label: "User Management", icon: Users },
    { id: "password", label: "Change Password", icon: KeyRound },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">Admin Dashboard</h1>
      <p className="mt-1 text-slate-500">Approve new accounts and manage users.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total registered users" value={stats?.total} accent="bg-slate-100 text-slate-600" />
        <StatCard icon={Clock} label="Pending account requests" value={stats?.pending} accent="bg-amber-50 text-amber-600" />
        <StatCard icon={CheckCircle2} label="Approved accounts" value={stats?.approved} accent="bg-emerald-50 text-emerald-600" />
        <StatCard icon={XCircle} label="Rejected accounts" value={stats?.rejected} accent="bg-red-50 text-red-600" />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-navy-800"
            }`}
          >
            <Icon size={16} />
            {label}
            {count > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        ))}
      </div>

      {notice && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            notice.type === "success" ? "bg-[#DDF8E9] text-[#006B3C]" : "bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {notice.type === "success" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
          {notice.text}
        </div>
      )}

      <div className="mt-4">
        {tab === "requests" && <UsersPanel key="requests" mode="requests" onChanged={onChanged} onNotice={setNotice} />}
        {tab === "users" && <UsersPanel key="users" mode="all" onChanged={onChanged} onNotice={setNotice} />}
        {tab === "password" && (
          <div className="max-w-md rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-card)]">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <KeyRound size={17} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-navy-800">Change admin password</h2>
                <p className="text-xs text-slate-500">Your current password is required.</p>
              </div>
            </div>
            <ChangePasswordForm />
          </div>
        )}
      </div>
    </div>
  );
}