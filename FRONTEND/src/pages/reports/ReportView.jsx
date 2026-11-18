import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import usePaginated from "../../hooks/usePaginated.js";
import DataTable from "../../components/ui/DataTable.jsx";
import FilterSelect from "../../components/ui/FilterSelect.jsx";
import Button from "../../components/ui/Button.jsx";
import Notice from "../../components/ui/Notice.jsx";
import { employeeApi } from "../../services/index.js";
import { downloadCSV, downloadFile, printTable } from "../../utils/exportClient.js";
import { REPORTS } from "./reportConfig.jsx";

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));

export default function ReportView() {
  const { reportId } = useParams();
  const cfg = REPORTS.find((r) => r.id === reportId);
  if (!cfg) return <Navigate to="/reports/masterlist" replace />;
  return <ReportBody key={cfg.id} cfg={cfg} />;
}

function ReportBody({ cfg }) {
  const table = usePaginated((p, s) => cfg.source(p, s), { initialSort: cfg.sort, initialFilters: cfg.base || {} });
  const [employees, setEmployees] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const needsEmployees = cfg.filters.some((f) => f.type === "employee");
  useEffect(() => {
    if (!needsEmployees) return;
    employeeApi.list({ limit: 1000, sort: "name" }).then((res) => setEmployees(res.data.map((e) => ({ value: e._id, label: e.name })))).catch(() => {});
  }, [needsEmployees]);

  const run = async (key, fn) => {
    setBusy(key);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const ctx = { busy, download: (path, params, filename, key) => run(key || path, () => downloadFile(path, params, filename)) };
  const columns = useMemo(() => cfg.columns(ctx), [cfg, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = () => ({ ...clean(table.filters), search: table.search || undefined, sort: table.sort || undefined, page: 1, limit: 1000 });
  const fetchAll = async () => (await cfg.source(query())).data;

  const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]).filter(([, v]) => v));

  const exportBar = (
    <>
      {cfg.excel && (
        <Button icon={FileSpreadsheet} disabled={busy === "excel"} onClick={() => run("excel", () => downloadFile(cfg.excel.path, pick(table.filters, cfg.excel.params), cfg.excel.filename))}>
          {busy === "excel" ? "Preparing..." : cfg.excel.label}
        </Button>
      )}
      <Button variant="secondary" icon={FileText} disabled={busy === "csv"} onClick={() => run("csv", async () => downloadCSV(`${cfg.id}.csv`, columns, await fetchAll()))}>
        CSV
      </Button>
      <Button variant="secondary" icon={Printer} disabled={busy === "print"} onClick={() => run("print", async () => printTable(cfg.title, columns, await fetchAll()))}>
        Print
      </Button>
    </>
  );

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-navy-900">{cfg.title}</h2>
        <p className="mt-0.5 max-w-prose text-sm text-slate-500">{cfg.description}</p>
      </div>
      <Notice tone="error" onClose={() => setError("")}>{error}</Notice>

      <DataTable
        {...table}
        columns={columns}
        searchPlaceholder={cfg.search}
        toolbarRight={exportBar}
        filters={
          <>
            {cfg.filters.map((f) => (
              <FilterSelect
                key={f.key}
                value={table.filters[f.key]}
                onChange={(v) => table.setFilter(f.key, v)}
                options={f.type === "employee" ? employees : f.options}
                placeholder={f.placeholder}
              />
            ))}
            {cfg.dates && (
              <>
                <DateInput label="From" value={table.filters.from} onChange={(v) => table.setFilter("from", v)} />
                <DateInput label="To" value={table.filters.to} onChange={(v) => table.setFilter("to", v)} />
              </>
            )}
          </>
        }
      />
    </section>
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
        className="rounded border border-line bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
      />
    </label>
  );
}
