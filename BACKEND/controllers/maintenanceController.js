import MaintenanceLog from "../models/MaintenanceLog.js";
import Asset from "../models/Asset.js";
import crud from "./crudFactory.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpError from "../utils/httpError.js";
import { DESKTOP_CHECKLIST } from "../constants/checklists.js";

const populate = { path: "asset", select: "assetId assetType brand model serialNo location" };

const c = crud(MaintenanceLog, {
  searchFields: ["header.computerName", "header.userName", "header.location", "comments"],
  filterFields: ["logType", "asset", "year", "month"],
  populate,
  defaultSort: "-year",
});

export const { list, get, create, update, remove } = c;

const QUARTERS = ["q1", "q2", "q3", "q4"];
const MARKS = ["P", "O", "NA"]; // P = OK, O = Not OK, NA = Not applicable
const STATUSES = ["Pending", "Approved", "Rejected"];
const KEYS = DESKTOP_CHECKLIST.flatMap((s) => s.items.map((i) => i.key));
const str = (v) => String(v ?? "").trim();

// POST /maintenance/desktop/perform
// Mo-create o mo-update sa PMS log sa asset sa usa ka tuig, ug i-save ang resulta sa usa ka quarter.
export const performDesktop = asyncHandler(async (req, res) => {
  const { assetId, quarter, header = {}, results = {}, remarks = {} } = req.body;
  const year = parseInt(req.body.year, 10);

  if (!QUARTERS.includes(quarter)) throw httpError(400, "Select a valid quarter");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw httpError(400, "Invalid year");

  const asset = await Asset.findById(assetId);
  if (!asset) throw httpError(404, "Asset not found");

  const missing = KEYS.filter((k) => !MARKS.includes(results[k]));
  if (missing.length) throw httpError(400, `Please mark every checklist item (${missing.length} left).`);

  let log = await MaintenanceLog.findOne({ logType: "DESKTOP_LAPTOP", asset: asset._id, year });
  if (!log) {
    log = new MaintenanceLog({
      logType: "DESKTOP_LAPTOP", asset: asset._id, year,
      header: {}, records: {}, periods: {}, verifications: {},
    });
  }
  if (log.verifications?.[quarter]?.status === "Approved") {
    throw httpError(409, "This quarter is already approved. Ask the administrator to reject it first before editing.");
  }

  log.header = {
    ...(log.header || {}),
    taskId: str(header.taskId),
    computerName: str(header.computerName),
    userName: str(header.userName),
    processor: str(header.processor),
    ram: str(header.ram),
    location: str(header.location),
  };

  const records = { ...(log.records || {}) };
  for (const k of KEYS) {
    const prev = records[k] || {};
    records[k] = {
      ...prev,
      [quarter]: results[k],
      remarks: remarks[k] !== undefined ? str(remarks[k]) : prev.remarks || "",
    };
  }
  log.records = records;

  log.periods = {
    ...(log.periods || {}),
    [quarter]: {
      performedBy: str(req.body.performedBy) || req.user.name,
      datePerformed: req.body.datePerformed || new Date().toISOString().slice(0, 10),
      notedBy: str(req.body.notedBy),
    },
  };
  log.verifications = { ...(log.verifications || {}), [quarter]: { status: "Pending" } };

  ["header", "records", "periods", "verifications"].forEach((p) => log.markModified(p));
  await log.save();
  await log.populate(populate);
  res.status(201).json(log);
});

// POST /maintenance/:id/verify   { quarter, status }   (admin ra)
export const verify = asyncHandler(async (req, res) => {
  const { quarter, status } = req.body;
  if (!QUARTERS.includes(quarter)) throw httpError(400, "Invalid quarter");
  if (!STATUSES.includes(status)) throw httpError(400, "Invalid status");

  const log = await MaintenanceLog.findById(req.params.id);
  if (!log) throw httpError(404, "Record not found");
  if (!log.periods?.[quarter]) throw httpError(400, "This quarter has not been performed yet");

  log.verifications = {
    ...(log.verifications || {}),
    [quarter]: status === "Pending" ? { status } : { status, verifiedBy: req.user.name, verifiedAt: new Date() },
  };
  log.markModified("verifications");
  await log.save();
  await log.populate(populate);
  res.json(log);
});