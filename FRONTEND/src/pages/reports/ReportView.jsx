import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { FileText, Printer } from "lucide-react";
import usePaginated from "../../hooks/usePaginated.js";
import DataTable from "../../components/ui/DataTable.jsx";
import FilterSelect from "../../components/ui/FilterSelect.jsx";
import Button from "../../components/ui/Button.jsx";
import Notice from "../../components/ui/Notice.jsx";
import FilePreviewModal from "../../components/ui/FilePreviewModal.jsx";
import { employeeApi } from "../../services/index.js";
import {
  downloadCSV, downloadFile, fetchBlob, fetchPreviewHtml, printTable, saveBlob,
} from "../../utils/exportClient.js";
import { REPORTS } from "./reportConfig.jsx";

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]).filter(([, v]) => v));

const NO_PREVIEW = {
  open: false, kind: "", title: "", path: "", params: {}, filename: "", html: "", blob: null, loading: false, error: "",
};

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
  const [preview, setPreview] = useState(NO_PREVIEW);
  const [downloading, setDownloading] = useState(false);

  const needsEmployees = cfg.filters.some((f) => f.type === "employee");
  useEffect(() => {
    if (!needsEmployees) return;
    employeeApi
      .list({ limit: 1000, sort: "name" })
      .then((res) => setEmployees(res.data.map((e) => ({ value: e._id, label: e.name }))))
      .catch(() => {});
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

  // Preview sa napuno nga template (kind: "xlsx" o "docx") una sa download
  const openPreview = async ({ kind, title, path, params = {}, filename }) => {
    setPreview({ ...NO_PREVIEW, open: true, kind, title, path, params, filename, loading: true });
    try {
      if (kind === "docx") {
        const blob = await fetchBlob(path, params);
        setPreview((p) => ({ ...p, loading: false, blob }));
      } else {
        const html = await fetchPreviewHtml(path, params);
        setPreview((p) => ({ ...p, loading: false, html }));
      }
    } catch (e) {
      setPreview((p) => ({ ...p, loading: false, error: e.message }));
    }
  };

  const downloadPreview = async () => {
    setDownloading(true);
    try {
      if (preview.blob) saveBlob(preview.blob, preview.filename);
      else await downloadFile(preview.path, preview.params, preview.filename);
    } catch (e) {
      setPreview((p) => ({ ...p, error: e.message }));
    } finally {
      setDownloading(false);
    }
  };

  const ctx = {
    busy,
    download: (path, params, filename, key) => run(key || path, () => downloadFile(path, params, filename)),
    preview: openPreview,
  };
  const columns = useMemo(() => cfg.columns(ctx), [cfg, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = () => ({ ...clean(table.filters), search: table.search || undefined, sort: table.sort || undefined, page: 1, limit: 1000 });
  const fetchAll = async () => (await cfg.source(query())).data;

  // Naay template: preview sa napuno nga form. Walay template: generic nga print.
  const printForm = () => {
    if (cfg.form) {
      const f = cfg.form;
      const row = table.rows[0]; // pinakaulahi nga document, o blangko nga form kung walay row
      return openPreview({
        kind: f.kind,
        title: row ? `Preview · ${f.title} · ${f.label(row)}` : `Preview · ${f.title} · blank form`,
        path: row ? f.path(row) : f.blankPath,
        filename: row ? f.filename(row) : f.blankFilename,
      });
    }
    if (cfg.excel) {
      return openPreview({
        kind: "xlsx",
        title: `Preview · ${cfg.excel.title || cfg.title}`,
        path: cfg.excel.path,
        params: pick(table.filters, cfg.excel.params),
        filename: cfg.excel.filename,
      });
    }
    return run("print", async () => printTable(cfg.title, columns, await fetchAll()));
  };

  const exportBar = (
    <>
      <Button variant="secondary" icon={FileText} disabled={busy === "csv"} onClick={() => run("csv", async () => downloadCSV(`${cfg.id}.csv`, columns, await fetchAll()))}>
        CSV
      </Button>
      <Button icon={Printer} disabled={busy === "print"} onClick={printForm}>
        Print
      </Button>
    </>
  );

  const Icon = cfg.icon;

  return (
    <section>
      <div className="mb-4 flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DDF8E9] text-[#006B3C]">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[#003B25]">{cfg.title}</h2>
          <p className="mt-0.5 max-w-prose text-sm text-slate-500">{cfg.description}</p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-[#DDF8E9] px-3 py-1 text-xs font-semibold text-[#006B3C] sm:block">
          {table.meta?.total ?? 0} records
        </span>
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

      <FilePreviewModal
        open={preview.open}
        title={preview.title}
        html={preview.html}
        docxBlob={preview.blob}
        loading={preview.loading}
        error={preview.error}
        downloading={downloading}
        downloadLabel={preview.kind === "docx" ? "Download Word" : "Download Excel"}
        onDownload={downloadPreview}
        onClose={() => setPreview(NO_PREVIEW)}
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
        className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-[#00A651] focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
      />
    </label>
  );
}