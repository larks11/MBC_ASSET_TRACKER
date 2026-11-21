import User from "../models/User.js";
import httpError from "../utils/httpError.js";
import asyncHandler from "../utils/asyncHandler.js";

const STATUSES = ["pending", "approved", "rejected"];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const stats = asyncHandler(async (req, res) => {
  const [total, pending, approved, rejected] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "pending" }),
    User.countDocuments({ status: "approved" }),
    User.countDocuments({ status: "rejected" }),
  ]);
  res.json({ total, pending, approved, rejected });
});

export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  const status = String(req.query.status || "");
  if (STATUSES.includes(status)) filter.status = status;

  const search = String(req.query.search || "").trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { username: rx }];
  }

  const users = await User.find(filter).sort({ createdAt: -1 }).populate("reviewedBy", "name");
  res.json({ users });
});

// Helper: kuhaon ang target user ug i-check ang mga limitasyon
async function getTarget(req) {
  const target = await User.findById(req.params.id);
  if (!target) throw httpError(404, "User not found");
  if (String(target._id) === String(req.user._id))
    throw httpError(400, "You cannot modify your own account here.");
  if (target.role === "admin") throw httpError(403, "Admin accounts cannot be modified here.");
  return target;
}

const review = (status) =>
  asyncHandler(async (req, res) => {
    const target = await getTarget(req);
    target.status = status;
    target.reviewedBy = req.user._id;
    target.reviewedAt = new Date();
    await target.save();
    res.json({
      message: status === "approved" ? "Account approved." : "Account rejected.",
      user: target,
    });
  });

export const approveUser = review("approved");
export const rejectUser = review("rejected");

export const deleteUser = asyncHandler(async (req, res) => {
  const target = await getTarget(req);
  await target.deleteOne();
  res.json({ message: "Account deleted." });
});