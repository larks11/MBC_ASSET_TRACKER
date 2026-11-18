import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import { sheetToHtml } from "./sheetToHtml.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(__dirname, "..", "templates", "MBC-SP-ICT-06F2.xlsx");

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" }) : "";
const TXN = { CheckoutRequest: "Checkout request", Deploy: "Deploy", Return: "Return", TurnOver: "Turn over", Disposal: "Disposal" };

const textOf = (cell) => {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((r) => r.text).join("");
    if (v.text) return String(v.text);
    if (v.result != null) return String(v.result);
    return "";
  }
  return String(v);
};
const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

/* ---------------------------------------------------------------- */
/* Ibabaw nga bahin: ASSET ID, TYPE, LOCATION, BRAND, SERIAL, ug uban */
/* ---------------------------------------------------------------- */

function fieldValues(a) {
  const s = a.specs || {};
  return {
    ASSETID: a.assetId, ASSETTYPE: a.assetType, LOCATION: a.location, CURRENTLOCATION: a.location,
    COMPANY: a.company, BRAND: a.brand, SERIALNO: a.serialNo, SERIALNUMBER: a.serialNo, MODEL: a.model,
    WARRANTY: fmt(a.warrantyDate), WARRANTYDATE: fmt(a.warrantyDate), RECEIVINGDATE: fmt(a.receivedDate),
    SUPPLIER: a.supplier, INVOICENO: a.invoiceNo, INVOICEDATE: fmt(a.invoiceDate), PONO: a.poNo,
    OPERATINGSYSTEM: s.operatingSystem, SYSTEMTYPE: s.systemType, PROCESSOR: s.processor, RAM: s.ram,
    HARDDISK: s.hardDisk, MOTHERBOARD: s.motherboard, OPTICALDISKDRIVE: s.opticalDiskDrive,
    CARDREADER: s.cardReader, PROGRAMSINSTALLED: s.programsInstalled,
  };
}

function rowSpan(ws, cell) {
  const m = (ws.model.merges || []).find((r) => r.split(":")[0] === cell.address);
  if (!m) return 1;
  const [a, b] = m.split(":");
  return ws.getCell(b).row - ws.getCell(a).row + 1;
}

function rightNeighbor(ws, cell) {
  let c = cell.col;
  while (c < 80) {
    const n = ws.getCell(cell.row, c + 1);
    if (n.isMerged && n.master.address === cell.address) { c++; continue; }
    return n.isMerged ? n.master : n;
  }
  return ws.getCell(cell.row, c + 1);
}
const hasBorder = (c) => !!(c.border && (c.border.top || c.border.bottom || c.border.left || c.border.right));

function fillLabel(ws, cell, value) {
  const label = textOf(cell).trimEnd();
  const font = cell.font || {};
  const base = { name: font.name || "Arial", size: font.size || 11 };
  const n = rightNeighbor(ws, cell);
  const tall = rowSpan(ws, cell) > 1;

  if (!tall && textOf(n) === "" && hasBorder(n)) {
    n.value = value;
    n.font = { ...(n.font || {}), ...base, bold: false };
    n.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    return;
  }
  cell.value = {
    richText: [
      { text: label, font: { ...base, bold: true } },
      { text: (tall ? "\n" : " ") + value, font: { ...base, bold: false } },
    ],
  };
  cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: tall ? "top" : "middle" };
}

/* ---------------------------------------------------------------- */
/* History table: TICKET #, ISSUE/REQUEST, SOLUTION/RECOMMENDATION,  */
/* REMARKS, CHECKED BY (ug DATE kung naa)                            */
/* ---------------------------------------------------------------- */

function buildRows({ repairs = [], transactions = [], maintenance = [] }) {
  const rows = [
    ...repairs.map((r) => ({
      date: r.dateReceived,
      ticket: r.ticketNo,
      issue: r.problem || "",
      solution: r.solution || "",
      remarks: [r.status && `Status: ${r.status}`, r.technician && `Technician: ${r.technician}`, r.remarks]
        .filter(Boolean)
        .join(" | "),
      checkedBy: r.checkedBy || "",
    })),
    ...transactions.map((t) => ({
      date: t.completedAt || t.date,
      ticket: t.transactionNo,
      issue: [TXN[t.type] || t.type, t.employeeSnapshot?.name].filter(Boolean).join(" - "),
      solution: "",
      remarks: t.remarks || "",
      checkedBy: "",
    })),
    ...maintenance.map((m) => ({
      date: new Date(Number(m.year) || 0, 0, 1),
      ticket: "",
      issue: `Maintenance - ${String(m.logType || "").replaceAll("_", " ")}`,
      solution: "",
      remarks: `${m.month ? m.month + " " : ""}${m.year}`,
      checkedBy: "",
    })),
  ];
  return rows.sort((a, b) => new Date(a.date) - new Date(b.date)); // pinakaluma una
}

function spanEnd(ws, cell) {
  let end = cell.col;
  for (;;) {
    const n = ws.getCell(cell.row, end + 1);
    if (n.isMerged && n.master.address === cell.address) end++;
    else break;
  }
  return end;
}

function headerKey(text) {
  const n = norm(text);
  if (n.startsWith("DATE")) return "date";
  if (n.startsWith("TICKET")) return "ticket";
  if (n.startsWith("ISSUE")) return "issue";
  if (n.startsWith("SOLUTION")) return "solution";
  if (n.startsWith("REMARKS")) return "remarks";
  if (n.startsWith("CHECKEDBY")) return "checkedBy";
  return null;
}

function findHistoryTable(ws) {
  let found = null;
  ws.eachRow((row) => {
    if (found) return;
    const groups = {};
    row.eachCell((c) => {
      if (c.master.address !== c.address) return; // master ra sa merged
      const key = headerKey(textOf(c));
      if (key && !groups[key]) groups[key] = { start: c.col, end: spanEnd(ws, c) };
    });
    if (groups.ticket && groups.issue) found = { row: row.number, groups };
  });
  return found;
}

const THIN = { style: "thin" };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function fillHistory(ws, entries) {
  const hdr = findHistoryTable(ws);
  if (!hdr) {
    console.warn("06F2: History header row not found in the template.");
    return;
  }
  const groups = Object.entries(hdr.groups);
  const first = Math.min(...groups.map(([, g]) => g.start));
  const last = Math.max(...groups.map(([, g]) => g.end));
  const hasDate = !!hdr.groups.date;

  const width = (g) => {
    let w = 0;
    for (let c = g.start; c <= g.end; c++) w += ws.getColumn(c).width || 8.43;
    return w;
  };

  let written = 0;
  for (const [i, e] of entries.entries()) {
    const r = hdr.row + 1 + i;

    // ayaw i-overwrite ang naa nay sulod (pananglitan pirma / footer)
    let blocked = false;
    for (let c = first; c <= last; c++) {
      if (textOf(ws.getCell(r, c)).trim()) { blocked = true; break; }
    }
    if (blocked) break;

    const values = {
      date: fmt(e.date),
      ticket: e.ticket,
      issue: hasDate ? e.issue : `${fmt(e.date)} - ${e.issue}`,
      solution: e.solution,
      remarks: e.remarks,
      checkedBy: e.checkedBy,
    };

    let lines = 1;
    for (const [key, g] of groups) {
      // i-merge sama sa header kung wala pa na-merge sa template
      if (g.end > g.start && !ws.getCell(r, g.start).isMerged) {
        let free = true;
        for (let c = g.start + 1; c <= g.end; c++) if (ws.getCell(r, c).isMerged) free = false;
        if (free) ws.mergeCells(r, g.start, r, g.end);
      }
      for (let c = g.start; c <= g.end; c++) ws.getCell(r, c).border = BORDER;

      const text = String(values[key] ?? "");
      const cell = ws.getCell(r, g.start);
      cell.value = text;
      cell.font = { name: "Arial", size: 9 };
      cell.alignment = {
        vertical: "top",
        horizontal: key === "date" || key === "ticket" ? "center" : "left",
        wrapText: true,
      };

      const perLine = Math.max(4, Math.floor(width(g) * 1.1));
      const l = text.split("\n").reduce((s, t) => s + Math.max(1, Math.ceil(t.length / perLine)), 0);
      lines = Math.max(lines, l);
    }
    ws.getRow(r).height = Math.max(18, lines * 12);
    written++;
  }
  if (written < entries.length) {
    console.warn(`06F2: only ${written} of ${entries.length} history rows fit above existing content.`);
  }
}

/* ---------------------------------------------------------------- */

async function fillWorkbook({ asset, repairs, transactions, maintenance }) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE);
  const ws = wb.getWorksheet("06F2") || wb.worksheets[0];

  // 1) ibabaw nga mga field
  const values = fieldValues(asset);
  const targets = [];
  ws.eachRow((row) =>
    row.eachCell((cell) => {
      const key = norm(textOf(cell));
      if (key && key in values && textOf(cell).trim().length < 40) targets.push({ cell, key });
    })
  );
  const done = new Set();
  for (const { cell, key } of targets) {
    if (done.has(key)) continue;
    done.add(key);
    const v = values[key];
    if (v === undefined || v === null || v === "") continue;
    fillLabel(ws, cell, String(v));
  }

  // 2) History table
  fillHistory(ws, buildRows({ repairs, transactions, maintenance }));

  return wb;
}

// Ang mismong .xlsx nga ma-download
export async function buildHistoryWorkbook(data) {
  const wb = await fillWorkbook(data);
  return wb.xlsx.writeBuffer();
}

// Preview: gi-save ug gi-basa usab ang file, aron parehas gyud sa ma-download
export async function buildHistoryPreviewHtml(data) {
  const wb = await fillWorkbook(data);
  const buffer = await wb.xlsx.writeBuffer();
  const again = new ExcelJS.Workbook();
  await again.xlsx.load(buffer);
  const ws = again.getWorksheet("06F2") || again.worksheets[0];
  return sheetToHtml(again, ws, { title: `06F2 ${data.asset.assetId}` });
}