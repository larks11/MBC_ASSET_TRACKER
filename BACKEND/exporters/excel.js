import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import httpError from "../utils/httpError.js";

const TPL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "templates");

const longDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" }) : "";
const shortDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";

async function loadTemplate(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(TPL, file));
  return { wb, ws: wb.worksheets[0] };
}

const cloneStyle = (cell) => JSON.parse(JSON.stringify(cell.style || {}));
const output = async (wb) => Buffer.from(await wb.xlsx.writeBuffer());

/* ------------------------------------------------------------------ *
 * MBC-SP-ICT-06F1  IT Asset Masterlist
 * Header row 6, data starts row 7. Ang template naay 28 ka rows (7-34);
 * kung mas daghan ang assets, gi-extend ang table nga parehas ang style.
 * ------------------------------------------------------------------ */
export async function masterlistXlsx(assets) {
  const { wb, ws } = await loadTemplate("MBC-SP-ICT-06F1.xlsx");
  const FIRST = 7, TEMPLATE_LAST = 34, COLS = 9;

  ws.getCell("C4").value = longDate(new Date()); // "Date as of:"

  const n = assets.length;
  const last = Math.max(FIRST + n - 1, TEMPLATE_LAST);

  if (last > TEMPLATE_LAST) {
    const innerStyles = Array.from({ length: COLS }, (_, i) => cloneStyle(ws.getRow(TEMPLATE_LAST - 1).getCell(i + 1)));
    const bottomStyles = Array.from({ length: COLS }, (_, i) => cloneStyle(ws.getRow(TEMPLATE_LAST).getCell(i + 1)));
    const height = ws.getRow(TEMPLATE_LAST - 1).height;
    for (let r = TEMPLATE_LAST; r <= last; r++) {
      const row = ws.getRow(r);
      if (height) row.height = height;
      for (let c = 1; c <= COLS; c++) row.getCell(c).style = r === last ? bottomStyles[c - 1] : innerStyles[c - 1];
    }
  }

  assets.forEach((a, i) => {
    const row = ws.getRow(FIRST + i);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = a.assetId || "";
    row.getCell(3).value = a.assetType || "";
    row.getCell(4).value = a.brand || "";
    row.getCell(5).value = a.model || "";
    row.getCell(6).value = a.serialNo || "";
    row.getCell(7).value = a.currentUser?.name || "";
    row.getCell(8).value = a.location || "";
    row.getCell(9).value = a.status || "";
  });

  ws.pageSetup.printArea = `A1:I${last}`;
  return output(wb);
}

/* ------------------------------------------------------------------ *
 * MBC-SP-ICT-06F3  Repair & Service Request Monitoring
 * Data rows 6-24 (19 rows). D:E, F:J ug K:L naka-merge na sa template.
 * ------------------------------------------------------------------ */
export const REPAIR_FORM_CAPACITY = 19;

export async function repairLogXlsx(tickets) {
  if (tickets.length > REPAIR_FORM_CAPACITY) {
    throw httpError(
      400,
      `The repair monitoring form fits ${REPAIR_FORM_CAPACITY} tickets per page but ${tickets.length} matched. Narrow the date range or status filter.`
    );
  }
  const { wb, ws } = await loadTemplate("MBC-SP-ICT-06F3.xlsx");
  ws.getCell("C3").value = longDate(new Date());

  tickets.forEach((t, i) => {
    const row = ws.getRow(6 + i);
    row.getCell("A").value = i + 1;
    row.getCell("B").value = t.ticketNo || "";
    row.getCell("C").value = shortDate(t.dateReceived);
    row.getCell("D").value = t.assetCode || "";
    row.getCell("F").value = t.assetType || "";
    row.getCell("K").value = t.problem || "";
    row.getCell("M").value = t.solution || "";
    row.getCell("N").value = shortDate(t.dateStarted);
    row.getCell("O").value = shortDate(t.dateFinished);
    row.getCell("P").value = t.status || "";
  });
  return output(wb);
}

/* ------------------------------------------------------------------ *
 * MBC-SP-ICT-06F4  IT Asset Disposal Log  (usa ka Disposal transaction = usa ka form)
 * Data rows 7-35 (29 rows).
 * ------------------------------------------------------------------ */
export const DISPOSAL_FORM_CAPACITY = 29;

export async function disposalLogXlsx(txn) {
  const items = txn.items || [];
  if (items.length > DISPOSAL_FORM_CAPACITY) {
    throw httpError(400, `The disposal log fits ${DISPOSAL_FORM_CAPACITY} items per page but this task has ${items.length}.`);
  }
  const { wb, ws } = await loadTemplate("MBC-SP-ICT-06F4.xlsx");
  ws.getCell("C3").value = longDate(txn.disposalDate || txn.completedAt || txn.date);
  ws.getCell("C4").value = txn.taskNo || txn.transactionNo || "";

  items.forEach((it, i) => {
    const a = it.asset || {};
    const row = ws.getRow(7 + i);
    row.getCell("A").value = i + 1;
    row.getCell("B").value = it.ticketNo || "";
    row.getCell("C").value = a.assetId || "";
    row.getCell("D").value = a.assetType || "";
    row.getCell("E").value = a.brand || "";
    row.getCell("F").value = a.model || "";
    row.getCell("G").value = a.serialNo || "";
    row.getCell("H").value = it.meansOfDisposal || "";
  });
  return output(wb);
}
/* ------------------------------------------------------------------ *
 * MBC-SP-ICT-01F2  IT Asset Received Monitoring Form
 * Data rows 6-46 (41 rows), columns A-S.
 * ------------------------------------------------------------------ */
export const RECEIVED_FORM_CAPACITY = 41;
const monthYear = () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" });

export async function receivedLogXlsx(assets) {
  if (assets.length > RECEIVED_FORM_CAPACITY) {
    throw httpError(
      400,
      `The received monitoring form fits ${RECEIVED_FORM_CAPACITY} assets per page but ${assets.length} matched. Narrow the filters.`
    );
  }
  const { wb, ws } = await loadTemplate("MBC-SP-ICT-01F2.xlsx");
  ws.getCell("A3").value = `Month & Year: ${monthYear()}`;

  assets.forEach((a, i) => {
    const row = ws.getRow(6 + i);
    [
      i + 1,                          // A NO.
      shortDate(a.receivedDate),      // B DATE RECEIVED
      a.rfNo || "",                   // C RF NO.
      a.acumaticaRI || "",            // D ACUMATICA RI #
      a.quantity ?? 1,                // E QTY.
      a.unit || "",                   // F UNIT
      a.assetType || "",              // G ASSET TYPE
      a.poNo || "",                   // H PO #
      shortDate(a.datePurchased),     // I DATE PURCHASED
      a.supplier || "",               // J SUPPLIER
      shortDate(a.invoiceDate),       // K INVOICE DATE
      a.invoiceNo || "",              // L INVOICE NO.
      shortDate(a.warrantyDate),      // M WARRANTY DATE
      a.rrNo || "",                   // N RR NO.
      a.amount ?? null,               // O AMOUNT
      a.brand || "",                  // P BRAND
      a.model || "",                  // Q MODEL
      a.serialNo || "",               // R SERIAL NO.
      a.currentUser?.name || "",      // S USER
    ].forEach((val, c) => { row.getCell(c + 1).value = val; });
  });
  return output(wb);
}

/* ------------------------------------------------------------------ *
 * MBC-SP-ICT-01F1  IT Asset Request Monitoring Form
 * Data rows 6-42 (37 rows), columns A-Q. Usa ka item = usa ka row.
 * ------------------------------------------------------------------ */
export const REQUEST_FORM_CAPACITY = 37;

export async function requestLogXlsx(txns) {
  const rows = txns.flatMap((t) =>
    (t.items?.length ? t.items : [{}]).map((it) => ({ t, it, a: it.asset || {} }))
  );
  if (rows.length > REQUEST_FORM_CAPACITY) {
    throw httpError(
      400,
      `The request monitoring form fits ${REQUEST_FORM_CAPACITY} rows per page but ${rows.length} matched. Narrow the filters.`
    );
  }
  const { wb, ws } = await loadTemplate("MBC-SP-ICT-01F1.xlsx");
  ws.getCell("A3").value = `Month & Year: ${monthYear()}`;

  rows.forEach(({ t, it, a }, i) => {
    const req = t.request || {};
    const row = ws.getRow(6 + i);
    [
      i + 1,                                     // A NO.
      shortDate(req.receivedDate || t.date),     // B REQUEST RECEIVED DATE
      req.rfNo || "",                            // C RF NO.
      shortDate(req.rfDate),                     // D RF DATE
      req.acumaticaRI || "",                     // E ACUMATICA RI #
      it.qty ?? "",                              // F QTY.
      it.unit || "",                             // G UNIT
      a.assetType || "",                         // H ASSET TYPE
      it.particulars || it.details || "",        // I PARTICULARS
      t.employeeSnapshot?.name || "",            // J REQUESTED BY
      a.assetId || "",                           // K ASSET ID
      a.brand || "",                             // L BRAND
      a.model || "",                             // M MODEL
      a.serialNo || "",                          // N SERIAL NO.
      a.currentUser?.name || "",                 // O USER
      t.location || t.department || "",          // P LOCATION
      req.source || "",                          // Q REMARKS (Purchased / Provided by ICT)
    ].forEach((val, c) => { row.getCell(c + 1).value = val; });
  });
  return output(wb);
}