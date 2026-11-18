import Transaction from "../models/Transaction.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpError from "../utils/httpError.js";

const REPORTS = { disposed: ["Disposal"], returned: ["Return", "TurnOver"] };

// GET /reports/:name  (disposed | returned) → naka-flatten nga items kada transaction
export const flattened = asyncHandler(async (req, res) => {
  const types = REPORTS[req.params.name];
  if (!types) throw httpError(404, "Unknown report");

  const { page = 1, limit = 10, search = "", sort = "-date" } = req.query;

  const txns = await Transaction.find({ type: { $in: types }, status: "Completed" })
    .populate("items.asset", "assetId assetType brand model serialNo")
    .lean();

  let rows = txns.flatMap((t) =>
    t.items.map((it, i) => ({
      _id: `${t._id}-${i}`,
      transactionId: t._id,
      transactionNo: t.transactionNo,
      type: t.type,
      date: t.disposalDate || t.completedAt || t.date,
      taskNo: t.taskNo || "",
      ticketNo: it.ticketNo || t.ticketNo || "",
      employee: t.employeeSnapshot?.name || "",
      condition: it.condition,
      meansOfDisposal: it.meansOfDisposal || "",
      assetId: it.asset?.assetId || "",
      assetType: it.asset?.assetType || "",
      brand: it.asset?.brand || "",
      model: it.asset?.model || "",
      serialNo: it.asset?.serialNo || "",
    }))
  );

  const q = String(search).trim().toLowerCase();
  if (q) rows = rows.filter((r) => Object.values(r).join(" ").toLowerCase().includes(q));

  const field = String(sort).replace(/^-/, "");
  const dir = String(sort).startsWith("-") ? -1 : 1;
  rows.sort((a, b) => {
    const x = a[field] instanceof Date ? a[field].getTime() : (a[field] ?? "");
    const y = b[field] instanceof Date ? b[field].getTime() : (b[field] ?? "");
    return (x > y ? 1 : x < y ? -1 : 0) * dir;
  });

  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 1000);
  res.json({
    data: rows.slice((p - 1) * l, p * l),
    meta: { total: rows.length, page: p, limit: l, pages: Math.ceil(rows.length / l) || 1 },
  });
});
