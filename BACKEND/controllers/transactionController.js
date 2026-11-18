import Transaction from "../models/Transaction.js";
import Asset from "../models/Asset.js";
import Employee from "../models/Employee.js";
import StockLog from "../models/StockLog.js";
import crud from "./crudFactory.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpError from "../utils/httpError.js";
import { generateDocNo } from "../utils/generateId.js";

const PREFIX = { CheckoutRequest: "REQ", Deploy: "MR", Return: "RTN", TurnOver: "TO", Disposal: "DSP" };

const populate = [
  { path: "employee", select: "name position department" },
  { path: "items.asset", select: "assetId assetType category brand model serialNo status quantity" },
];

const base = crud(Transaction, {
  searchFields: [
    "transactionNo", "employeeSnapshot.name", "documentNo", "taskNo", "projectName", "request.rfNo",
  ],
  filterFields: ["type", "status", "employee"],
  populate,
  dateField: "date",
});

export const list = base.list;
export const get = base.get;

export const create = asyncHandler(async (req, res) => {
  const { autoComplete, status, transactionNo, completedAt, ...body } = req.body;

  if (!PREFIX[body.type]) throw httpError(400, "Invalid transaction type");
  if (!Array.isArray(body.items) || !body.items.length) {
    throw httpError(400, "Select at least one asset");
  }
  if (["Deploy", "CheckoutRequest"].includes(body.type) && !body.employee) {
    throw httpError(400, "Employee is required");
  }

  if (body.employee) {
    const emp = await Employee.findById(body.employee);
    if (!emp) throw httpError(404, "Employee not found");
    body.employeeSnapshot = { name: emp.name, position: emp.position, department: emp.department };
    body.department = body.department || emp.department;
  }

  body.transactionNo = await generateDocNo(PREFIX[body.type]);
  const txn = await Transaction.create(body);

  if (autoComplete && body.type !== "CheckoutRequest") await applyEffects(txn);

  await txn.populate(populate);
  res.status(201).json(txn);
});

export const update = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id);
  if (!txn) throw httpError(404, "Transaction not found");
  if (txn.status !== "Pending") throw httpError(409, "Only pending transactions can be edited");

  const { _id, type, transactionNo, status, completedAt, createdAt, updatedAt, ...body } = req.body;
  txn.set(body);
  await txn.save();
  await txn.populate(populate);
  res.json(txn);
});

export const remove = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id);
  if (!txn) throw httpError(404, "Transaction not found");
  if (txn.status === "Completed") {
    throw httpError(409, "Completed transactions are permanent records and cannot be deleted");
  }
  await txn.deleteOne();
  res.json({ message: "Transaction deleted" });
});

// POST /transactions/:id/complete   (approve + apply)
export const complete = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id);
  if (!txn) throw httpError(404, "Transaction not found");
  if (txn.type === "CheckoutRequest") {
    if (txn.status !== "Pending") throw httpError(409, `Request is already ${txn.status}`);
    txn.status = "Completed";
    txn.completedAt = new Date();
    await txn.save();
  } else {
    await applyEffects(txn);
  }
  await txn.populate(populate);
  res.json(txn);
});

// POST /transactions/:id/reject  { reason }
export const reject = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id);
  if (!txn) throw httpError(404, "Transaction not found");
  if (txn.status !== "Pending") throw httpError(409, "Only pending transactions can be rejected");
  txn.status = "Rejected";
  txn.rejectReason = req.body.reason;
  await txn.save();
  res.json(txn);
});

/* ---------------------------------------------------------------- */

async function applyEffects(txn) {
  if (txn.status !== "Pending") throw httpError(409, `Transaction is already ${txn.status}`);

  const assets = await Asset.find({ _id: { $in: txn.items.map((i) => i.asset) } });
  const map = new Map(assets.map((a) => [a.id, a]));

  // 1) VALIDATE everything first before applying
  for (const item of txn.items) {
    const a = map.get(String(item.asset));
    if (!a) throw httpError(404, "One of the selected assets no longer exists");

    if (a.category === "Consumable") {
      if (txn.type === "Deploy" && a.quantity < item.qty) {
        throw httpError(409, `Insufficient stock for ${a.assetId} (available: ${a.quantity})`);
      }
      continue;
    }
    if (txn.type === "Deploy" && a.status !== "Available") {
      throw httpError(409, `${a.assetId} is not available (status: ${a.status})`);
    }
    if (["Return", "TurnOver"].includes(txn.type) && a.status !== "Active") {
      throw httpError(409, `${a.assetId} is not currently deployed (status: ${a.status})`);
    }
    if (txn.type === "Disposal" && ["Active", "Disposed"].includes(a.status)) {
      throw httpError(409, `${a.assetId} cannot be disposed (status: ${a.status})`);
    }
  }

  // 2) APPLY
  for (const item of txn.items) {
    const a = map.get(String(item.asset));

    if (a.category === "Consumable") {
      const delta = txn.type === "Deploy" ? -item.qty : ["Return", "TurnOver"].includes(txn.type) ? item.qty : 0;
      if (delta !== 0) {
        a.quantity += delta;
        await a.save();
        await StockLog.create({
          asset: a._id,
          movement: delta < 0 ? "Pull-out" : "Return",
          qty: Math.abs(delta),
          balanceAfter: a.quantity,
          refNo: txn.transactionNo,
          requestedBy: txn.employeeSnapshot?.name,
        });
      }
      continue;
    }

    switch (txn.type) {
      case "Deploy":
        a.status = "Active";
        a.currentUser = txn.employee;
        a.location = txn.location || txn.department || a.location;
        break;
      case "Return":
      case "TurnOver":
        a.status = item.condition === "Damaged" ? "Damaged" : "Available";
        a.currentUser = null;
        a.location = txn.location || "ICT Office";
        break;
      case "Disposal":
        a.status = "Disposed";
        a.currentUser = null;
        break;
      default:
        break;
    }
    await a.save();
  }

  txn.status = "Completed";
  txn.completedAt = new Date();
  await txn.save();
}
