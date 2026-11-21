import ExcelJS from "exceljs";
import { sheetToHtml } from "./sheetToHtml.js";

// Gihimong HTML preview ang napuno nga .xlsx (parehas sa makita sa Excel)
export async function xlsxBufferToHtml(buffer, title) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return sheetToHtml(wb, wb.worksheets[0], { title });
}