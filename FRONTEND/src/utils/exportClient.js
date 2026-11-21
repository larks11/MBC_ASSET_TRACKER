import api from "../services/api.js";

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const html = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const cellText = (col, row) => (col.text ? col.text(row) : row[col.key]) ?? "";
const dataColumns = (columns) => columns.filter((c) => c.key !== "actions");

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// File gikan sa backend (.xlsx / .docx), gamit ang imong original nga templates
export async function downloadFile(path, params, filename) {
  saveBlob(await api.get(path, { params, responseType: "blob" }), filename);
}

// Para sa preview: Word file (ma-render sa browser) o HTML sa napuno nga Excel
export const fetchBlob = (path, params) => api.get(path, { params, responseType: "blob" });
export const fetchPreviewHtml = (path, params) =>
  api.get(path, { params: { ...params, preview: 1 }, responseType: "text" });

export function downloadCSV(filename, columns, rows) {
  const cols = dataColumns(columns);
  const lines = [
    cols.map((c) => esc(c.header)).join(","),
    ...rows.map((r) => cols.map((c) => esc(cellText(c, r))).join(",")),
  ];
  saveBlob(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename);
}

// Generic nga print (para sa mga report nga walay opisyal nga template), naay MAC green nga design
export function printTable(title, columns, rows) {
  const cols = dataColumns(columns);
  const w = window.open("", "_blank");
  if (!w) throw new Error("The browser blocked the print window. Allow pop-ups for this site and try again.");

  const origin = window.location.origin;
  const printedOn = new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });

  const body = rows.length
    ? rows.map((r) => `<tr>${cols.map((c) => `<td>${html(cellText(c, r))}</td>`).join("")}</tr>`).join("")
    : `<tr><td class="empty" colspan="${cols.length}">No records found.</td></tr>`;

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${html(title)}</title><style>
    *{box-sizing:border-box}
    body{font-family:Inter,Arial,sans-serif;color:#0f172a;margin:0;padding:28px;background:#fff;
      -webkit-print-color-adjust:exact;print-color-adjust:exact}
    .head{display:flex;align-items:center;gap:18px;padding-bottom:14px;border-bottom:3px solid #00A651}
    .head img{height:56px;width:auto;object-fit:contain}
    .org h1{margin:0;font-size:20px;color:#003B25}
    .org p{margin:2px 0 0;font-size:12px;color:#475569}
    .title{margin:18px 0 4px;font-size:17px;font-weight:700;color:#006B3C}
    .meta{font-size:11px;color:#64748b;margin-bottom:12px}
    table{border-collapse:collapse;width:100%;font-size:11px}
    thead th{background:#003B25;color:#fff;text-align:left;padding:8px 8px;border:1px solid #003B25;font-weight:600}
    tbody td{border:1px solid #cbd5e1;padding:6px 8px}
    tbody tr:nth-child(even) td{background:#F0FBF5}
    td.empty{text-align:center;padding:28px;color:#64748b;font-style:italic}
    .foot{margin-top:14px;font-size:10px;color:#64748b;display:flex;justify-content:space-between}
    thead{display:table-header-group}tr{page-break-inside:avoid}
    @media print{@page{size:landscape;margin:12mm}body{padding:0}}
  </style></head><body>
    <div class="head">
      <img src="${origin}/images2.jpg" alt="MAC Builders Corp." onerror="this.style.display='none'">
      <div class="org"><h1>MAC Builders Corp.</h1><p>ICT Asset Monitoring System</p></div>
    </div>
    <div class="title">${html(title)}</div>
    <div class="meta">Printed on ${html(printedOn)} · ${rows.length} record${rows.length === 1 ? "" : "s"}</div>
    <table>
      <thead><tr>${cols.map((c) => `<th>${html(c.header)}</th>`).join("")}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="foot"><span>MAC Builders Corp. · ICT Asset Monitoring System</span><span>${html(title)}</span></div>
    <script>
      // Hulat nga ma-load ang logo, unya i-print
      window.onload = function () { setTimeout(function () { window.focus(); window.print(); }, 250); };
    <\/script>
  </body></html>`);
  w.document.close();
}