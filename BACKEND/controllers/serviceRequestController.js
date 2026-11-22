import ServiceRequest, { SR_STATUS, SR_PRIORITY, SR_TYPES } from "../models/ServiceRequest.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpError from "../utils/httpError.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isAdmin = (u) => u?.role === "admin";
const same = (a, b) => !!a && !!b && String(a) === String(b);

/* ---------- Access control (gamit ang existing nga roles: admin / user) ---------- */
// admin = tanan. user = requests nga iya gi-submit o gi-assign sa iya.
const scopeFilter = (user) =>
  isAdmin(user) ? {} : { $or: [{ createdBy: user._id }, { assignedTo: user._id }] };

const canView = (user, doc) => isAdmin(user) || same(doc.createdBy, user._id) || same(doc.assignedTo, user._id);

/* ---------- Status workflow ---------- */
const TRANSITIONS = {
  Pending: ["Approved", "Rejected"],
  Approved: ["In Progress", "On Hold", "Rejected"],
  "In Progress": ["On Hold", "Completed"],
  "On Hold": ["In Progress", "Rejected"],
  Completed: [],
  Rejected: [],
};
const ADMIN_ONLY = new Set(["Approved", "Rejected"]);
const NEEDS_REMARKS = new Set(["Rejected", "On Hold", "Completed"]);
const CLOSED = ["Completed", "Rejected"];

// Unsay mahimo sa user niini nga request (gigamit sa frontend sa pag-butang sa mga buton)
function permsFor(user, doc) {
  const admin = isAdmin(user);
  const assignedToMe = same(doc.assignedTo, user._id);
  const mine = same(doc.createdBy, user._id);
  return {
    edit: admin || (mine && doc.status === "Pending"),
    assign: admin && !CLOSED.includes(doc.status),
    status: (TRANSITIONS[doc.status] || []).filter((s) => admin || (assignedToMe && !ADMIN_ONLY.has(s))),
    delete: admin,
  };
}
const present = (user, doc) => ({ ...doc, can: permsFor(user, doc) });

/* ---------- Form fields ---------- */
const FORM_FIELDS = [
  "requestorName", "employeeId", "positionDepartment", "contactNo", "email",
  "requestType", "priority", "subject", "description", "assetId", "assetDescription",
];
const REQUIRED = [
  ["requestorName", "Employee name"],
  ["employeeId", "Employee ID"],
  ["positionDepartment", "Department"],
  ["contactNo", "Contact number"],
  ["email", "Email address"],
  ["requestType", "Request type"],
  ["priority", "Priority"],
  ["subject", "Subject"],
  ["description", "Detailed description"],
];
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function pickForm(body = {}) {
  const out = {};
  for (const f of FORM_FIELDS) {
    if (body[f] === undefined) continue;
    out[f] = typeof body[f] === "string" ? body[f].trim() : body[f];
  }
  return out;
}

function validate(data) {
  for (const [key, label] of REQUIRED) {
    if (!String(data[key] ?? "").trim()) throw httpError(400, `${label} is required`);
  }
  if (!EMAIL_RE.test(String(data.email).trim())) throw httpError(400, "Please enter a valid email address");
}

const SORTABLE = [
  "srfNo", "dateRequested", "requestorName", "positionDepartment",
  "requestType", "subject", "priority", "assignedToName", "status",
];

/* ================= LIST ================= */
// GET /service-requests?page&limit&search&sort&status&requestType&priority&assignedTo&from&to
export const list = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 10, search, sort = "-dateRequested",
    status, requestType, priority, assignedTo, from, to,
  } = req.query;

  const and = [];
  const scope = scopeFilter(req.user);
  if (Object.keys(scope).length) and.push(scope);
  if (status) and.push({ status });
  if (requestType) and.push({ requestType });
  if (priority) and.push({ priority });
  if (assignedTo) and.push({ assignedTo: assignedTo === "unassigned" ? null : assignedTo });
  if (from || to) {
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    and.push({ dateRequested: range });
  }
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    and.push({ $or: ["srfNo", "requestorName", "subject", "positionDepartment", "employeeId"].map((f) => ({ [f]: rx })) });
  }
  const filter = and.length ? { $and: and } : {};

  const sortField = String(sort).replace(/^-/, "");
  const sortSpec = SORTABLE.includes(sortField) ? String(sort) : "-dateRequested";

  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 1000);

  const [rows, total] = await Promise.all([
    ServiceRequest.find(filter).select("-statusHistory").sort(sortSpec).skip((p - 1) * l).limit(l).lean(),
    ServiceRequest.countDocuments(filter),
  ]);

  res.json({
    data: rows.map((r) => present(req.user, r)),
    meta: { total, page: p, limit: l, pages: Math.ceil(total / l) || 1 },
  });
});

/* ================= GET ONE ================= */
export const get = asyncHandler(async (req, res) => {
  const doc = await ServiceRequest.findById(req.params.id).lean();
  if (!doc) throw httpError(404, "Service request not found");
  if (!canView(req.user, doc)) throw httpError(403, "You do not have access to this request");
  res.json(present(req.user, doc));
});

/* ================= CREATE ================= */
export const create = asyncHandler(async (req, res) => {
  const data = pickForm(req.body);
  validate(data);

  const doc = await ServiceRequest.create({
    ...data,
    status: "Pending",
    createdBy: req.user._id,
    createdByName: req.user.name,
    statusHistory: [
      { kind: "created", toStatus: "Pending", by: req.user._id, byName: req.user.name, remarks: "Request submitted" },
    ],
  });
  res.status(201).json(present(req.user, doc.toObject()));
});

/* ================= EDIT ================= */
export const update = asyncHandler(async (req, res) => {
  const doc = await ServiceRequest.findById(req.params.id);
  if (!doc) throw httpError(404, "Service request not found");
  if (!permsFor(req.user, doc).edit) throw httpError(403, "You are not allowed to edit this request.");

  const data = pickForm(req.body);
  validate({ ...doc.toObject(), ...data });
  doc.set(data);
  doc.statusHistory.push({
    kind: "edited", fromStatus: doc.status, toStatus: doc.status,
    by: req.user._id, byName: req.user.name, remarks: "Request details were edited",
  });
  await doc.save();
  res.json(present(req.user, doc.toObject()));
});

/* ================= DELETE (admin) ================= */
export const remove = asyncHandler(async (req, res) => {
  if (!isAdmin(req.user)) throw httpError(403, "Only an administrator can delete requests.");
  const doc = await ServiceRequest.findByIdAndDelete(req.params.id);
  if (!doc) throw httpError(404, "Service request not found");
  res.json({ message: "Service request deleted" });
});

/* ================= UPDATE STATUS ================= */
// POST /service-requests/:id/status  { status, remarks }
export const changeStatus = asyncHandler(async (req, res) => {
  const doc = await ServiceRequest.findById(req.params.id);
  if (!doc) throw httpError(404, "Service request not found");
  if (!canView(req.user, doc)) throw httpError(403, "You do not have access to this request");

  const status = String(req.body.status || "");
  const remarks = String(req.body.remarks || "").trim();
  if (!SR_STATUS.includes(status)) throw httpError(400, "Invalid status");

  if (!permsFor(req.user, doc).status.includes(status)) {
    throw httpError(403, `You cannot change this request from "${doc.status}" to "${status}".`);
  }
  if (NEEDS_REMARKS.has(status) && !remarks) {
    throw httpError(
      400,
      status === "Rejected" ? "Please enter the reason for rejection"
        : status === "Completed" ? "Please enter the resolution details"
        : "Please enter the reason for putting the request on hold"
    );
  }

  const from = doc.status;
  doc.status = status;
  doc.statusHistory.push({
    kind: "status", fromStatus: from, toStatus: status,
    by: req.user._id, byName: req.user.name, remarks,
  });
  if (status === "Approved") doc.approvedBy = { name: req.user.name, date: new Date() };
  if (status === "Completed") {
    doc.completedAt = new Date();
    doc.resolution = remarks;
  }
  if (status === "Rejected") doc.rejectReason = remarks;

  await doc.save();
  res.json(present(req.user, doc.toObject()));
});

/* ================= ASSIGN TECHNICIAN (admin) ================= */
// POST /service-requests/:id/assign  { technicianId, remarks }
export const assign = asyncHandler(async (req, res) => {
  if (!isAdmin(req.user)) throw httpError(403, "Only an administrator can assign technicians.");

  const doc = await ServiceRequest.findById(req.params.id);
  if (!doc) throw httpError(404, "Service request not found");
  if (CLOSED.includes(doc.status)) {
    throw httpError(409, `A ${doc.status.toLowerCase()} request can no longer be assigned.`);
  }
  if (!req.body.technicianId) throw httpError(400, "Please select a technician");

  const tech = await User.findOne({ _id: req.body.technicianId, status: "approved" }).select("name role");
  if (!tech) throw httpError(404, "Technician not found or account is not active");

  const remarks = String(req.body.remarks || "").trim();
  doc.assignedTo = tech._id;
  doc.assignedToName = tech.name;
  doc.assignedAt = new Date();
  doc.assignmentRemarks = remarks;
  doc.statusHistory.push({
    kind: "assignment", fromStatus: doc.status, toStatus: doc.status,
    by: req.user._id, byName: req.user.name,
    remarks: `Assigned to ${tech.name}${remarks ? `: ${remarks}` : ""}`,
  });
  await doc.save();
  res.json(present(req.user, doc.toObject()));
});

/* ================= TECHNICIANS (admin) ================= */
export const technicians = asyncHandler(async (req, res) => {
  if (!isAdmin(req.user)) throw httpError(403, "Admin access required.");
  res.json(await User.find({ status: "approved" }).select("name username role").sort("name").lean());
});

/* ================= STATS ================= */
// Tanang numero gikan sa tinuod nga data (susama sa scope sa user)
export const stats = asyncHandler(async (req, res) => {
  const docs = await ServiceRequest.find(scopeFilter(req.user))
    .select("status requestType priority dateRequested completedAt assignedTo")
    .lean();

  const zero = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));
  const byStatus = zero(SR_STATUS);
  const byType = zero(SR_TYPES);
  const byPriority = zero(SR_PRIORITY);

  const now = new Date();
  const monthly = new Map();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(key, { month: key, label: d.toLocaleString("en-US", { month: "short", year: "2-digit" }), count: 0 });
  }

  let resolvedMs = 0;
  let resolvedCount = 0;
  for (const d of docs) {
    if (d.status in byStatus) byStatus[d.status] += 1;
    if (d.requestType in byType) byType[d.requestType] += 1;
    if (d.priority in byPriority) byPriority[d.priority] += 1;

    const dt = new Date(d.dateRequested);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    if (monthly.has(key)) monthly.get(key).count += 1;

    if (d.status === "Completed" && d.completedAt && d.dateRequested) {
      resolvedMs += new Date(d.completedAt) - new Date(d.dateRequested);
      resolvedCount += 1;
    }
  }

  res.json({
    total: docs.length,
    byStatus,
    byType,
    byPriority,
    monthly: [...monthly.values()],
    // null kung wala pay Completed nga request nga naay tinuod nga petsa
    avgResolutionHours: resolvedCount ? Math.round((resolvedMs / resolvedCount / 36e5) * 10) / 10 : null,
    resolvedCount,
    notify: {
      awaitingApproval: isAdmin(req.user) ? byStatus.Pending : 0,
      assignedToMe: docs.filter(
        (d) => same(d.assignedTo, req.user._id) && ["Approved", "In Progress", "On Hold"].includes(d.status)
      ).length,
    },
  });
});