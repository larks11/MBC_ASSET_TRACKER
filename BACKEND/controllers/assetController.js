import Asset from "../models/Asset.js";
import StockLog from "../models/StockLog.js";
import Transaction from "../models/Transaction.js";
import RepairTicket from "../models/RepairTicket.js";
import MaintenanceLog from "../models/MaintenanceLog.js";
import crud from "./crudFactory.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpError from "../utils/httpError.js";
import { previewAssetId } from "../utils/generateId.js";
import { buildHistoryWorkbook, buildHistoryPreviewHtml } from "../exporters/historyExporter.js";


const base = crud(Asset, {
  searchFields: ["assetId", "assetType", "brand", "model", "serialNo", "location", "company"],
  filterFields: ["category", "assetType", "status", "company", "currentUser"],
  populate: { path: "currentUser", select: "name position department" },
  defaultSort: "assetId",
});

export const list = base.list;
export const get = base.get;
export const create = base.create;
export const update = base.update;

export const remove = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) throw httpError(404, "Asset not found");
  if (asset.status === "Active") {
    throw httpError(409, "Cannot delete a deployed asset. Return it first.");
  }
  const hasHistory = await Transaction.exists({ "items.asset": asset._id, status: "Completed" });
  if (hasHistory) {
    throw httpError(409, "Asset has transaction history. Mark it as Disposed instead of deleting.");
  }
  await asset.deleteOne();
  await StockLog.deleteMany({ asset: asset._id });
  res.json({ message: "Asset deleted" });
});

// POST /assets/bulk  { assets: [ {...}, {...} ] }
export const bulkCreate = asyncHandler(async (req, res) => {
  const rows = req.body.assets;
  if (!Array.isArray(rows) || !rows.length) throw httpError(400, "assets array is required");
  if (rows.length > 500) throw httpError(400, "Maximum of 500 rows per upload");

  let created = 0;
  const errors = [];
  for (const [i, row] of rows.entries()) {   // sequential to keep Asset IDs in order
    try {
      await Asset.create(row);
      created += 1;
    } catch (e) {
      errors.push({ row: i + 1, message: e.message });
    }
  }
  res.status(created ? 201 : 400).json({ created, failed: errors.length, errors });
});

export const types = asyncHandler(async (req, res) => {
  res.json(await Asset.distinct("assetType"));
});

// GET /assets/next-id?assetType=Laptop  (preview only, does not consume the number)
export const nextId = asyncHandler(async (req, res) => {
  res.json({ assetId: await previewAssetId(req.query.assetType) });
});

// GET /assets/:id/history  → 06F2 Asset History Record
export const history = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id).populate("currentUser", "name position department");
  if (!asset) throw httpError(404, "Asset not found");

  const [repairs, transactions, maintenance] = await Promise.all([
    RepairTicket.find({ asset: asset._id }).sort("-dateReceived").lean(),
    Transaction.find({ "items.asset": asset._id, status: "Completed" })
      .sort("-completedAt")
      .select("type transactionNo date employeeSnapshot completedAt remarks")
      .lean(),
    MaintenanceLog.find({ asset: asset._id }).sort("-year").select("logType year month").lean(),
  ]);

  res.json({ asset, repairs, transactions, maintenance });
});

// Consumables: GET/POST /assets/:id/stock
export const stockLogs = asyncHandler(async (req, res) => {
  res.json(await StockLog.find({ asset: req.params.id }).sort("-date").lean());
});

export const adjustStock = asyncHandler(async (req, res) => {
  const { movement, qty, refNo, requestedBy, remarks } = req.body;
  const n = Number(qty);
  const deltas = { Added: n, Return: n, "Pull-out": -n, Request: 0 }; // "Request" = log only, stock unchanged

  if (!(movement in deltas)) throw httpError(400, "Invalid movement type");
  if (!(n > 0)) throw httpError(400, "Quantity must be greater than 0");

  const asset = await Asset.findById(req.params.id);
  if (!asset) throw httpError(404, "Asset not found");
  if (asset.category !== "Consumable") throw httpError(400, "Stock movements are for consumables only");

  const delta = deltas[movement];
  const updated = await Asset.findOneAndUpdate(
    { _id: asset._id, quantity: { $gte: -delta } },   // stock can never go negative
    { $inc: { quantity: delta } },
    { new: true }
  );
  if (!updated) throw httpError(409, "Insufficient stock");

  const log = await StockLog.create({
    asset: asset._id, movement, qty: n, balanceAfter: updated.quantity, refNo, requestedBy, remarks,
  });
  res.status(201).json({ asset: updated, log });
});

// GET /assets/:id/export/06F2  → napuno nga MBC-SP-ICT-06F2.xlsx
async function loadHistoryData(id) {
  const asset = await Asset.findById(id).populate("currentUser", "name position department").lean();
  if (!asset) throw httpError(404, "Asset not found");

  const [repairs, transactions, maintenance] = await Promise.all([
    RepairTicket.find({ asset: asset._id }).sort("-dateReceived").lean(),
    Transaction.find({ "items.asset": asset._id, status: "Completed" })
      .sort("-completedAt")
      .select("type transactionNo date employeeSnapshot completedAt remarks")
      .lean(),
    MaintenanceLog.find({ asset: asset._id }).sort("-year").select("logType year month").lean(),
  ]);
  return { asset, repairs, transactions, maintenance };
}

// GET /assets/:id/export/06F2  → napuno nga MBC-SP-ICT-06F2.xlsx
export const exportHistory = asyncHandler(async (req, res) => {
  const data = await loadHistoryData(req.params.id);
  const buffer = await buildHistoryWorkbook(data);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="06F2-${data.asset.assetId}.xlsx"`);
  res.send(Buffer.from(buffer));
});

// GET /assets/:id/export/06F2/preview  → HTML preview sa napuno nga form
export const previewHistory = asyncHandler(async (req, res) => {
  const data = await loadHistoryData(req.params.id);
  res.type("html").send(await buildHistoryPreviewHtml(data));
});

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /assets/stock-logs?movement=Added,Return&assetType=&search=&from=&to=&page=&limit=&sort=
// Tanang stock movement sa tanang consumable (para sa "Added items" ug "Requests" nga tab)
export const allStockLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = "-date", movement, assetType, search, from, to } = req.query;

  const assetFilter = { category: "Consumable" };
  if (assetType) assetFilter.assetType = assetType;

  const and = [];
  const assetIds = await Asset.distinct("_id", assetFilter);
  and.push({ asset: { $in: assetIds } });

  if (movement) {
    and.push({ movement: { $in: String(movement).split(",").map((m) => m.trim()).filter(Boolean) } });
  }
  if (from || to) {
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    and.push({ date: range });
  }

  const q = String(search || "").trim();
  if (q) {
    const rx = new RegExp(escapeRx(q), "i");
    const matched = await Asset.distinct("_id", {
      ...assetFilter,
      $or: ["assetId", "assetType", "brand", "model"].map((f) => ({ [f]: rx })),
    });
    and.push({ $or: [{ asset: { $in: matched } }, { refNo: rx }, { requestedBy: rx }, { remarks: rx }] });
  }

  const field = String(sort).replace(/^-/, "");
  const sortSpec = ["date", "qty", "balanceAfter", "movement"].includes(field) ? String(sort) : "-date";

  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 1000);
  const filter = { $and: and };

  const [data, total] = await Promise.all([
    StockLog.find(filter)
      .sort(sortSpec)
      .skip((p - 1) * l)
      .limit(l)
      .populate("asset", "assetId assetType brand model unit company")
      .lean(),
    StockLog.countDocuments(filter),
  ]);

  res.json({ data, meta: { total, page: p, limit: l, pages: Math.ceil(total / l) || 1 } });
});