import api from "../services/api.js";

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const html = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const cellText = (col, row) => (col.text ? col.text(row) : row[col.key]) ?? "";
const dataColumns = (columns) => columns.filter((c) => c.key !== "actions");

function triggerDownload(blob, filename) {
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
  const blob = await api.get(path, { params, responseType: "blob" });
  triggerDownload(blob, filename);
}

export function downloadCSV(filename, columns, rows) {
  const cols = dataColumns(columns);
  const lines = [
    cols.map((c) => esc(c.header)).join(","),
    ...rows.map((r) => cols.map((c) => esc(cellText(c, r))).join(",")),
  ];
  triggerDownload(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename);
}

export function printTable(title, columns, rows) {
  const cols = dataColumns(columns);
  const w = window.open("", "_blank");
  if (!w) throw new Error("The browser blocked the print window. Allow pop-ups for this site and try again.");
  w.document.write(`<!doctype html><html><head><title>${html(title)}</title><style>
    body{font-family:Arial,sans-serif;color:#111;margin:24px}
    h1{font-size:18px;margin:0}.sub{color:#555;font-size:12px;margin:2px 0 14px}
    table{border-collapse:collapse;width:100%;font-size:11px}
    th,td{border:1px solid #999;padding:4px 6px;text-align:left}th{background:#eef2f9}
    @media print{@page{size:landscape;margin:12mm}}
  </style></head><body>
    <h1>MAC Builders Corp.</h1>
    <div class="sub">ICT Asset Monitoring System · ${html(title)} · ${new Date().toLocaleString("en-PH")}</div>
    <table><thead><tr>${cols.map((c) => `<th>${html(c.header)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${html(cellText(c, r))}</td>`).join("")}</tr>`).join("")}</tbody></table>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
