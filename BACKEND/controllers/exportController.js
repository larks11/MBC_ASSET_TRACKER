import Asset from "../models/Asset.js";
import Transaction from "../models/Transaction.js";
import RepairTicket from "../models/RepairTicket.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpError from "../utils/httpError.js";
import {
  masterlistXlsx, repairLogXlsx, disposalLogXlsx, receivedLogXlsx, requestLogXlsx,
} from "../exporters/excel.js";
import { memorandumReceiptDocx } from "../exporters/docx.js";
import { xlsxBufferToHtml } from "../exporters/preview.js";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// ?preview=1 -> HTML preview sa napuno nga .xlsx; kung wala, mo-download ang file
const deliver = async (req, res, buffer, filename, type, title) => {
  if (req.query.preview === "1" && type === XLSX) {
    return res.type("html").send(await xlsxBufferToHtml(buffer, title));
  }
  res.setHeader("Content-Type", type);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
};

const itemPopulate = { path: "items.asset", select: "assetId assetType brand model serialNo" };

// GET /exports/masterlist?assetType=&status=&currentUser=   -> MBC-SP-ICT-06F1
export const masterlist = asyncHandler(async (req, res) => {
  const { assetType, status, currentUser } = req.query;
  const filter = { category: "Non-Consumable" };
  if (assetType) filter.assetType = assetType;
  if (status) filter.status = status;
  if (currentUser) filter.currentUser = currentUser;
  const assets = await Asset.find(filter).populate("currentUser", "name").sort("assetType assetId").lean();
  await deliver(req, res, await masterlistXlsx(assets), "IT-Asset-Masterlist.xlsx", XLSX, "IT Asset Masterlist (06F1)");
});

// GET /exports/received?category=&assetType=&status=   -> MBC-SP-ICT-01F2
export const received = asyncHandler(async (req, res) => {
  const { category, assetType, status } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (assetType) filter.assetType = assetType;
  if (status) filter.status = status;
  const assets = await Asset.find(filter).populate("currentUser", "name").sort("receivedDate assetId").lean();
  await deliver(
    req, res, await receivedLogXlsx(assets),
    "IT-Asset-Received-Monitoring.xlsx", XLSX, "IT Asset Received Monitoring (01F2)"
  );
});

// GET /exports/requests?status=   -> MBC-SP-ICT-01F1
export const requests = asyncHandler(async (req, res) => {
  const filter = { type: "CheckoutRequest" };
  if (req.query.status) filter.status = req.query.status;
  const txns = await Transaction.find(filter)
    .sort("date")
    .populate({
      path: "items.asset",
      select: "assetId assetType brand model serialNo currentUser",
      populate: { path: "currentUser", select: "name" },
    })
    .lean();
  await deliver(
    req, res, await requestLogXlsx(txns),
    "IT-Asset-Request-Monitoring.xlsx", XLSX, "IT Asset Request Monitoring (01F1)"
  );
});

// GET /exports/memorandum-receipt/:id   -> MBC-SP-WHS-06F1 (.docx). id = "blank" -> blangko nga form
export const memorandumReceipt = asyncHandler(async (req, res) => {
  if (req.params.id === "blank") {
    return deliver(req, res, memorandumReceiptDocx({}), "Memorandum-Receipt-BLANK.docx", DOCX);
  }
  const txn = await Transaction.findById(req.params.id).populate(itemPopulate).lean();
  if (!txn) throw httpError(404, "Transaction not found");
  if (txn.type !== "Deploy") throw httpError(400, "A Memorandum Receipt can only be generated for a Deploy transaction");
  await deliver(req, res, memorandumReceiptDocx(txn), `Memorandum-Receipt-${txn.transactionNo}.docx`, DOCX);
});

// GET /exports/repairs?status=&from=&to=   -> MBC-SP-ICT-06F3
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
  await deliver(req, res, await repairLogXlsx(tickets), "IT-Asset-Repair-Monitoring.xlsx", XLSX, "Repair & Service Monitoring (06F3)");
});

// GET /exports/disposal/:id   -> MBC-SP-ICT-06F4. id = "blank" -> blangko nga form
export const disposal = asyncHandler(async (req, res) => {
  if (req.params.id === "blank") {
    return deliver(req, res, await disposalLogXlsx({ items: [] }), "IT-Asset-Disposal-Log-BLANK.xlsx", XLSX, "IT Asset Disposal Log (06F4)");
  }
  const txn = await Transaction.findById(req.params.id).populate(itemPopulate).lean();
  if (!txn) throw httpError(404, "Transaction not found");
  if (txn.type !== "Disposal") throw httpError(400, "Not a disposal transaction");
  await deliver(
    req, res, await disposalLogXlsx(txn),
    `IT-Asset-Disposal-Log-${txn.taskNo || txn.transactionNo}.xlsx`, XLSX, "IT Asset Disposal Log (06F4)"
  );
});