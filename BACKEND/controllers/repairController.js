import RepairTicket from "../models/RepairTicket.js";
import Asset from "../models/Asset.js";
import crud from "./crudFactory.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpError from "../utils/httpError.js";

const populate = [
  { path: "asset", select: "assetId assetType brand model serialNo status" },
  { path: "reportedBy", select: "name position department" },
];

const base = crud(RepairTicket, {
  searchFields: ["ticketNo", "assetCode", "assetType", "problem", "solution", "technician"],
  filterFields: ["status", "asset", "assetType", "technician"],
  populate,
  dateField: "dateReceived",
  defaultSort: "-dateReceived",
});

export const list = base.list;
export const get = base.get;

// Sync Asset.status based on the ticket status
async function syncAsset(ticket) {
  const asset = await Asset.findById(ticket.asset);
  if (!asset || asset.status === "Disposed") return;

  if (ticket.status === "For Repair") asset.status = "For Repair";
  else if (ticket.status === "Damaged") asset.status = "Damaged";
  else if (ticket.status === "Repaired") asset.status = asset.currentUser ? "Active" : "Available";

  await asset.save();
}

export const create = asyncHandler(async (req, res) => {
  const { ticketNo, ...body } = req.body;
  const asset = await Asset.findById(body.asset);
  if (!asset) throw httpError(404, "Asset not found");
  if (asset.status === "Disposed") throw httpError(409, "Disposed assets cannot be repaired");

  body.assetCode = asset.assetId;
  body.assetType = asset.assetType;

  const ticket = await RepairTicket.create(body);
  await syncAsset(ticket);
  await ticket.populate(populate);
  res.status(201).json(ticket);
});

export const update = asyncHandler(async (req, res) => {
  const ticket = await RepairTicket.findById(req.params.id);
  if (!ticket) throw httpError(404, "Ticket not found");

  const { _id, ticketNo, asset, assetCode, assetType, createdAt, updatedAt, ...body } = req.body;
  ticket.set(body);
  if (ticket.status === "Repaired" && !ticket.dateFinished) ticket.dateFinished = new Date();

  await ticket.save();
  await syncAsset(ticket);
  await ticket.populate(populate);
  res.json(ticket);
});

export const remove = asyncHandler(async (req, res) => {
  const ticket = await RepairTicket.findById(req.params.id);
  if (!ticket) throw httpError(404, "Ticket not found");

  await ticket.deleteOne();

  // if no other open ticket remains, restore the asset status
  const stillOpen = await RepairTicket.exists({ asset: ticket.asset, status: "For Repair" });
  const asset = await Asset.findById(ticket.asset);
  if (asset && asset.status === "For Repair" && !stillOpen) {
    asset.status = asset.currentUser ? "Active" : "Available";
    await asset.save();
  }
  res.json({ message: "Ticket deleted" });
});
