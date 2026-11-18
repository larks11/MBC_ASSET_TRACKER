import Asset from "../models/Asset.js";
import Transaction from "../models/Transaction.js";
import RepairTicket from "../models/RepairTicket.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpError from "../utils/httpError.js";
import { masterlistXlsx, repairLogXlsx, disposalLogXlsx } from "../exporters/excel.js";
import { memorandumReceiptDocx } from "../exporters/docx.js";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const send = (res, buffer, filename, type) => {
  res.setHeader("Content-Type", type);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
};

const itemPopulate = { path: "items.asset", select: "assetId assetType brand model serialNo" };

// GET /exports/masterlist?assetType=&status=   → MBC-SP-ICT-06F1
export const masterlist = asyncHandler(async (req, res) => {
  const { assetType, status } = req.query;
  const filter = { category: "Non-Consumable" };
  if (assetType) filter.assetType = assetType;
  if (status) filter.status = status;
  const assets = await Asset.find(filter).populate("currentUser", "name").sort("assetType assetId").lean();
  send(res, await masterlistXlsx(assets), "IT-Asset-Masterlist.xlsx", XLSX);
});

// GET /exports/memorandum-receipt/:id   → MBC-SP-WHS-06F1 (.docx)
export const memorandumReceipt = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id).populate(itemPopulate).lean();
  if (!txn) throw httpError(404, "Transaction not found");
  if (txn.type !== "Deploy") throw httpError(400, "A Memorandum Receipt can only be generated for a Deploy transaction");
  send(res, memorandumReceiptDocx(txn), `Memorandum-Receipt-${txn.transactionNo}.docx`, DOCX);
});

// GET /exports/repairs?status=&from=&to=   → MBC-SP-ICT-06F3
export const repairs = asyncHandler(async (req, res) => {
  const { status, from, to } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (from || to) {
    filter.dateReceived = {};
    if (from) filter.dateReceived.$gte = new Date(from);
    if (to) filter.dateReceived.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }
  const tickets = await RepairTicket.find(filter).sort("dateReceived").lean();
  send(res, await repairLogXlsx(tickets), "IT-Asset-Repair-Monitoring.xlsx", XLSX);
});

// GET /exports/disposal/:id   → MBC-SP-ICT-06F4 (usa ka Disposal transaction = usa ka task)
export const disposal = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id).populate(itemPopulate).lean();
  if (!txn) throw httpError(404, "Transaction not found");
  if (txn.type !== "Disposal") throw httpError(400, "Not a disposal transaction");
  send(res, await disposalLogXlsx(txn), `IT-Asset-Disposal-Log-${txn.taskNo || txn.transactionNo}.xlsx`, XLSX);
});
