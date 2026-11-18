import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardApi } from "../services/index.js";
import PageHeader from "../components/ui/PageHeader.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import Notice from "../components/ui/Notice.jsx";
import { fmtDate, fmtNumber, STATUS_COLORS, TXN_LABELS } from "../utils/format.js";

const TILES = [
  { key: "active", label: "Active assets", color: STATUS_COLORS.Active },
  { key: "available", label: "Available assets", color: STATUS_COLORS.Available },
  { key: "damaged", label: "Damaged assets", color: STATUS_COLORS.Damaged },
  { key: "forRepair", label: "For repair", color: STATUS_COLORS["For Repair"] },
  { key: "disposed", label: "Disposed assets", color: STATUS_COLORS.Disposed },
  { key: "total", label: "Total enrolled assets", color: "#0b1f45" },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    dashboardApi
      .summary(ctrl.signal)
      .then(setData)
      .catch((e) => e.code !== "ERR_CANCELED" && setError(e.message));
    return () => ctrl.abort();
  }, []);

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Notice tone="error">
          Can't load the dashboard: {error}. Check that the backend is running on port 5000.
        </Notice>
      </>
    );
  }
  if (!data) return <p className="text-sm text-slate-500">Loading dashboard...</p>;

  const { totals, byType, consumables, recentTransactions, openRepairs, pendingTransactions } = data;
  const statusData = TILES.filter((t) => t.key !== "total")
    .map((t) => ({ name: t.label.replace(" assets", ""), value: totals[t.key], color: t.color }))
    .filter((d) => d.value > 0);

  return (
    <>
      <PageHeader title="Dashboard" description="Current status of ICT equipment across MAC Builders Corp." />

      {/* Status strip */}
      <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-md border border-line bg-white md:grid-cols-3 xl:grid-cols-6">
        {TILES.map((t) => (
          <div key={t.key} className="border-b border-r border-line p-4 last:border-r-0 xl:border-b-0">
            <div className="mb-3 h-1 w-8 rounded-full" style={{ background: t.color }} />
            <p className="tabular text-3xl font-semibold text-navy-900">{fmtNumber(totals[t.key])}</p>
            <p className="mt-0.5 text-sm text-slate-500">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-5">
        {/* Category breakdown */}
        <section className="rounded-md border border-line bg-white p-4 lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-navy-900">Assets by category</h2>
          {byType.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No assets enrolled yet.</p>
          ) : (
            <div style={{ height: Math.max(220, byType.length * 34) }}>
              <ResponsiveContainer>
                <BarChart data={byType} layout="vertical" margin={{ left: 10, right: 24 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="type" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "#eef4ff" }} />
                  <Bar dataKey="count" name="Assets" fill="#1f4fc4" radius={[0, 3, 3, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Status distribution */}
        <section className="rounded-md border border-line bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-navy-900">Status distribution</h2>
          {statusData.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No data yet.</p>
          ) : (
            <>
              <div style={{ height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2}>
                      {statusData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {statusData.map((d) => (
                  <li key={d.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="tabular font-medium">{d.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Recent transactions */}
        <section className="rounded-md border border-line bg-white lg:col-span-3">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-navy-900">Recent transactions</h2>
          {recentTransactions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No transactions yet. Deploy an asset to an employee to get started.
            </p>
          ) : (
            <ul className="divide-y divide-line/70">
              {recentTransactions.map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {t.transactionNo} <span className="font-normal text-slate-500">· {TXN_LABELS[t.type] || t.type}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {t.employeeSnapshot?.name || "No employee"} · {fmtDate(t.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Needs attention */}
        <section className="rounded-md border border-line bg-white lg:col-span-2">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-navy-900">Needs attention</h2>
          <ul className="divide-y divide-line/70 text-sm">
            <Row to="/transactions/repair" label="Open repair tickets" value={openRepairs} />
            <Row to="/transactions/deploy" label="Pending transactions" value={pendingTransactions} />
            <Row to="/assets/consumable" label="Consumables at or below reorder level" value={consumables.lowStock} />
            <Row to="/assets/consumable" label="Consumable items in stock" value={consumables.items} muted />
          </ul>
        </section>
      </div>
    </>
  );
}

function Row({ to, label, value, muted }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between px-4 py-3 hover:bg-brand-50/50">
        <span className="text-slate-700">{label}</span>
        <span className={`tabular text-lg font-semibold ${!muted && value > 0 ? "text-amber-700" : "text-navy-900"}`}>{value}</span>
      </Link>
    </li>
  );
}
