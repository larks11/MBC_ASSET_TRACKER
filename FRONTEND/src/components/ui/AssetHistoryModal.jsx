import { useEffect, useState } from "react";
import { Plus, Printer } from "lucide-react";
import { assetApi } from "../../services/index.js";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
import StatusBadge from "./StatusBadge.jsx";
import FilePreviewModal from "./FilePreviewModal.jsx";
import { fmtDate } from "../../utils/format.js";
import { buildTimeline, money, SPEC_LABELS } from "../../utils/printHistory.js";

function Cell({ label, children, className = "" }) {
  return (
    <div className={`border-b border-r border-line px-3 py-2 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-0.5 break-words text-sm font-semibold text-navy-800">{children || "N/A"}</div>
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

const NO_PREVIEW = { open: false, html: "", loading: false, error: "" };

export default function AssetHistoryModal({ asset, onClose, onAddRecord, reloadKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(NO_PREVIEW);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!asset) {
      setPreview(NO_PREVIEW);
      return;
    }
    let live = true;
    setData(null);
    setError("");
    assetApi
      .history(asset._id)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [asset?._id, reloadKey]);

  const a = data?.asset || asset;
  const timeline = data ? buildTimeline(data) : [];
  const specs = Object.entries(a?.specs || {}).filter(([k, v]) => v && k !== "programsInstalled");
  const d = (x) => (x ? fmtDate(x) : "");

  // 1) Preview sa napuno nga 06F2 una
  const openPreview = async () => {
    setPreview({ open: true, html: "", loading: true, error: "" });
    try {
      const html = await assetApi.previewHistory(a._id);
      setPreview({ open: true, html, loading: false, error: "" });
    } catch (e) {
      setPreview({ open: true, html: "", loading: false, error: e.message || "Failed to build the preview." });
    }
  };

  // 2) Download sa tinuod nga Excel file
  const downloadExcel = async () => {
    setExporting(true);
    try {
      const blob = await assetApi.exportHistory(a._id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `06F2-${a.assetId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPreview((p) => ({ ...p, error: e.message || "Failed to export the 06F2 file." }));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Modal
        open={!!asset}
        onClose={onClose}
        size="lg"
        title="IT asset history record"
        footer={
          <>
            <Button icon={Plus} onClick={() => onAddRecord(a)}>Entry record to history</Button>
            <Button variant="secondary" icon={Printer} disabled={!data} onClick={openPreview}>
              Print history record
            </Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </>
        }
      >
        {a && (
          <>
            <div className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-4">
              <Cell label="Asset ID">{a.assetId}</Cell>
              <Cell label="Asset type">{a.assetType}</Cell>
              <Cell label="Company">{a.company}</Cell>
              <Cell label="Status">{a.status && <StatusBadge status={a.status} />}</Cell>
              <Cell label="Current location" className="col-span-2">{a.location}</Cell>
              <Cell label="Current user" className="col-span-2">{a.currentUser?.name}</Cell>

              <Band>Basic information</Band>
              <Cell label="Brand">{a.brand}</Cell>
              <Cell label="Model">{a.model}</Cell>
              <Cell label="Serial number" className="col-span-2">{a.serialNo}</Cell>
              <Cell label="Supplier">{a.supplier}</Cell>
              <Cell label="Warranty">{d(a.warrantyDate)}</Cell>
              <Cell label="Invoice date">{d(a.invoiceDate)}</Cell>
              <Cell label="Invoice no.">{a.invoiceNo}</Cell>
              <Cell label="Requisition no.">{a.rfNo}</Cell>
              <Cell label="PO no.">{a.poNo}</Cell>
              <Cell label="Receiving date">{d(a.receivedDate)}</Cell>
              <Cell label="Asset amount">{a.amount != null ? money(a.amount) : ""}</Cell>

              {(specs.length > 0 || a.specs?.programsInstalled) && (
                <>
                  <Band>Specifications</Band>
                  {specs.map(([k, v]) => <Cell key={k} label={SPEC_LABELS[k] || k}>{v}</Cell>)}
                  {a.specs?.programsInstalled && (
                    <Cell label="Programs installed" className="col-span-2 sm:col-span-4">{a.specs.programsInstalled}</Cell>
                  )}
                </>
              )}
            </div>

            <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
              History {data && `(${timeline.length})`}
            </h3>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            {!data && !error && <p className="text-sm text-slate-500">Loading history...</p>}
            {data && timeline.length === 0 && (
              <p className="rounded border border-dashed border-line px-4 py-6 text-center text-sm text-slate-500">
                No history yet. Deployments, returns, repairs, and maintenance will appear here automatically.
              </p>
            )}

            {timeline.length > 0 && (
              <ol className="ml-2 border-l border-line">
                {timeline.map((e) => (
                  <li key={e.key} className="relative pb-4 pl-5">
                    <span className="absolute -left-[6px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        {e.kind} <span className="tabular font-normal text-slate-500">· {e.ref}</span>
                      </p>
                      {e.status && <StatusBadge status={e.status} />}
                    </div>
                    <p className="text-xs text-slate-500">{e.dateLabel || fmtDate(e.date)}</p>
                    {e.detail && <p className="mt-0.5 text-sm text-slate-600">{e.detail}</p>}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </Modal>

      <FilePreviewModal
        open={preview.open}
        title={a ? `Preview · MBC-SP-ICT-06F2 · ${a.assetId}` : "Preview"}
        html={preview.html}
        loading={preview.loading}
        error={preview.error}
        downloading={exporting}
        onDownload={downloadExcel}
        onClose={() => setPreview(NO_PREVIEW)}
      />
    </>
  );
}