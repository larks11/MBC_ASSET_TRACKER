import jwt from "jsonwebtoken";
import User from "../models/User.js";
import httpError from "../utils/httpError.js";
import asyncHandler from "../utils/asyncHandler.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in BACKEND/.env");
}

// Protektahi ang routes: kinahanglan valid nga "Authorization: Bearer <token>"
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw httpError(401, "Not authenticated. Please log in.");

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(401, "Session expired or invalid. Please log in again.");
  }

  const user = await User.findById(payload.id);
  if (!user) throw httpError(401, "Account no longer exists.");

  // Approved accounts ra. Kung na-reject o na-revoke human maka-login, putlon dayon ang access.
  if (user.status !== "approved") throw httpError(401, "Your account is not active. Please log in again.");

  // Kung giusab ang password, invalid na ang daang tokens
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000))
    throw httpError(401, "Password was changed. Please log in again.");

  req.user = user;
  next();
});

export const adminOnly = (req, res, next) =>
  req.user?.role === "admin" ? next() : next(httpError(403, "Admin access required."));