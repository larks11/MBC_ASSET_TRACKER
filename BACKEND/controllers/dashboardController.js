import Asset from "../models/Asset.js";
import Transaction from "../models/Transaction.js";
import RepairTicket from "../models/RepairTicket.js";
import asyncHandler from "../utils/asyncHandler.js";

export const summary = asyncHandler(async (req, res) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [byStatus, byType, consumables, monthly, recent, openRepairs, pending] = await Promise.all([
    Asset.aggregate([
      { $match: { category: "Non-Consumable" } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Asset.aggregate([
      { $match: { category: "Non-Consumable", status: { $ne: "Disposed" } } },
      { $group: { _id: "$assetType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Asset.aggregate([
      { $match: { category: "Consumable" } },
      {
        $group: {
          _id: null,
          items: { $sum: 1 },
          units: { $sum: "$quantity" },
          lowStock: { $sum: { $cond: [{ $lte: ["$quantity", "$reorderLevel"] }, 1, 0] } },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { status: "Completed", completedAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { y: { $year: "$completedAt" }, m: { $month: "$completedAt" }, type: "$type" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]),
    Transaction.find()
      .sort("-createdAt")
      .limit(8)
      .select("type transactionNo status employeeSnapshot createdAt")
      .lean(),
    RepairTicket.countDocuments({ status: "For Repair" }),
    Transaction.countDocuments({ status: "Pending" }),
  ]);

  const s = Object.fromEntries(byStatus.map((x) => [x._id, x.count]));
  const total = byStatus.reduce((sum, x) => sum + x.count, 0);

  res.json({
    totals: {
      active: s["Active"] || 0,
      available: s["Available"] || 0,
      damaged: s["Damaged"] || 0,
      forRepair: s["For Repair"] || 0,
      disposed: s["Disposed"] || 0,
      total, // Total Enrolled Assets
    },
    byType: byType.map((x) => ({ type: x._id, count: x.count })),
    consumables: consumables[0] || { items: 0, units: 0, lowStock: 0 },
    monthlyTransactions: monthly.map((x) => ({ ...x._id, count: x.count })),
    recentTransactions: recent,
    openRepairs,
    pendingTransactions: pending,
  });
});
