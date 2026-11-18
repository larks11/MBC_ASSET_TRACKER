import { fmtDate, TXN_LABELS } from "./format.js";

export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const money = (n) =>
  n === null || n === undefined || n === ""
    ? "N/A"
    : "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SPEC_LABELS = {
  operatingSystem: "Operating system",
  systemType: "System type",
  processor: "Processor",
  ram: "RAM",
  hardDisk: "Hard disk",
  motherboard: "Motherboard",
  opticalDiskDrive: "Optical disk drive",
  cardReader: "Card reader",
  programsInstalled: "Programs installed",
};

// Usa ka listahan sa tanang kasaysayan sa asset, bag-o ang una
export function buildTimeline({ repairs = [], transactions = [], maintenance = [] }) {
  const rows = [
    ...repairs.map((r) => ({
      key: `r-${r._id}`,
      date: r.dateReceived,
      kind: "Repair",
      ref: r.ticketNo,
      detail: [r.problem, r.solution && `Solution: ${r.solution}`, r.technician && `Technician: ${r.technician}`]
        .filter(Boolean)
        .join(" | "),
      status: r.status,
    })),
    ...transactions.map((t) => ({
      key: `t-${t._id || t.transactionNo}`,
      date: t.completedAt || t.date,
      kind: TXN_LABELS[t.type] || t.type,
      ref: t.transactionNo,
      detail: [t.employeeSnapshot?.name, t.remarks].filter(Boolean).join(" | "),
      status: "Completed",
    })),
    ...maintenance.map((m) => ({
      key: `m-${m._id}`,
      date: new Date(Number(m.year) || 0, 0, 1),
      dateLabel: `${m.month ? m.month + " " : ""}${m.year}`,
      kind: "Maintenance",
      ref: String(m.logType || "").replaceAll("_", " "),
      detail: "",
      status: null,
    })),
  ];
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function openPrintWindow(html) {
  const w = window.open("", "_blank");
  if (!w) {
    window.alert("Allow pop-ups for this site so the print page can open.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export function printHistory({ asset: a, repairs, transactions, maintenance }) {
  const timeline = buildTimeline({ repairs, transactions, maintenance });
  const d = (x) => (x ? fmtDate(x) : "");
  const c = (label, value) => `<td><small>${esc(label)}</small><b>${esc(value || "N/A")}</b></td>`;

  const specEntries = Object.entries(a.specs || {}).filter(([k, v]) => v && k !== "programsInstalled");
  let specRows = "";
  for (let i = 0; i < specEntries.length; i += 4) {
    const chunk = specEntries.slice(i, i + 4);
    specRows += `<tr>${chunk.map(([k, v]) => c(SPEC_LABELS[k] || k, v)).join("")}${"<td></td>".repeat(4 - chunk.length)}</tr>`;
  }
  if (a.specs?.programsInstalled) {
    specRows += `<tr><td colspan="4"><small>Programs installed</small><b>${esc(a.specs.programsInstalled)}</b></td></tr>`;
  }

  const historyRows = timeline.length
    ? timeline
        .map(
          (e) => `<tr>
            <td>${esc(e.dateLabel || d(e.date))}</td>
            <td>${esc(e.kind)}</td>
            <td>${esc(e.ref)}</td>
            <td>${esc(e.detail)}</td>
            <td>${esc(e.status || "")}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="5" style="text-align:center;color:#666">No history records yet.</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>IT Asset History Record ${esc(a.assetId)}</title>
<style>
  @page { margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #17261e; }
  h1 { margin: 0; font-size: 16px; letter-spacing: 2px; color: #0a2e1f; }
  .co { margin: 2px 0 12px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  td, th { border: 1px solid #8aa596; padding: 6px 8px; vertical-align: top; text-align: left; }
  th { background: #d8eddf; color: #0a2e1f; text-align: center; letter-spacing: 1px; font-size: 11px; text-transform: uppercase; }
  td small { display: block; color: #555; font-size: 10px; text-transform: uppercase; margin-bottom: 2px; }
  td b { color: #0f5a37; }
  .hist th { text-align: left; }
  .foot { margin-top: 18px; font-size: 10px; color: #777; }
</style></head><body>
  <h1>IT ASSET HISTORY RECORD</h1>
  <p class="co">MAC Builders Corp.</p>
  <table>
    <tr>${c("Asset ID", a.assetId)}${c("Asset type", a.assetType)}${c("Company", a.company)}${c("Current location", a.location)}</tr>
    <tr><th colspan="4">Basic information</th></tr>
    <tr>${c("Brand", a.brand)}${c("Model", a.model)}${c("Serial number", a.serialNo)}${c("Current user", a.currentUser?.name)}</tr>
    <tr>${c("Supplier", a.supplier)}${c("Warranty", d(a.warrantyDate))}${c("Invoice date", d(a.invoiceDate))}${c("Invoice no.", a.invoiceNo)}</tr>
    <tr>${c("Requisition no.", a.rfNo)}${c("PO no.", a.poNo)}${c("Receiving date", d(a.receivedDate))}${c("Asset amount", money(a.amount))}</tr>
    ${specRows ? `<tr><th colspan="4">Specifications</th></tr>${specRows}` : ""}
  </table>
  <table class="hist">
    <tr><th colspan="5">History</th></tr>
    <tr><th>Date</th><th>Type</th><th>Reference</th><th>Details</th><th>Status</th></tr>
    ${historyRows}
  </table>
  <p class="foot">Printed on ${esc(fmtDate(new Date()))}</p>
</body></html>`;

  openPrintWindow(html);
}