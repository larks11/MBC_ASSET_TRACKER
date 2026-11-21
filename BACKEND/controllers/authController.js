import jwt from "jsonwebtoken";
import User from "../models/User.js";
import httpError from "../utils/httpError.js";
import asyncHandler from "../utils/asyncHandler.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

export const register = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const username = String(req.body.username || "").trim().toLowerCase();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (!name) throw httpError(400, "Full name is required");
  if (!EMAIL_RE.test(email)) throw httpError(400, "Please enter a valid email");
  if (!USERNAME_RE.test(username))
    throw httpError(400, "Username must be 3-30 characters (letters, numbers, . _ -)");
  if (password.length < 8) throw httpError(400, "Password must be at least 8 characters");
  if (password !== confirmPassword) throw httpError(400, "Passwords do not match");

  if (process.env.ALLOW_REGISTRATION === "false")
    throw httpError(403, "Registration is closed. Please contact the administrator.");

  if (await User.findOne({ email })) throw httpError(409, "This email is already registered");
  if (await User.findOne({ username })) throw httpError(409, "This username is already taken");

  // Kanunay "user" + "pending". Ang admin ra ang makapa-approve.
  await User.create({ name, username, email, password, role: "user", status: "pending" });

  res.status(201).json({
    message: "Your registration request has been submitted. Please wait for admin approval before logging in.",
  });
});

export const login = asyncHandler(async (req, res) => {
  // String() aron dili ma-inject ang objects (NoSQL injection)
  const identifier = String(req.body.identifier ?? req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!identifier || !password) throw httpError(400, "Username/email and password are required");

  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  }).select("+password");

  // Parehas nga message kung sayop ang username/email o password (security)
  if (!user || !(await user.comparePassword(password)))
    throw httpError(401, "Invalid username/email or password");

  // Status check: human ra masiguro nga sakto ang password
  if (user.status === "pending") throw httpError(403, "Your account is waiting for admin approval.");
  if (user.status === "rejected") throw httpError(403, "Your registration request has been rejected.");

  res.json({ token: signToken(user), user });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (!currentPassword) throw httpError(400, "Current password is required");
  if (newPassword.length < 8) throw httpError(400, "New password must be at least 8 characters");
  if (newPassword !== confirmPassword) throw httpError(400, "New passwords do not match");
  if (newPassword === currentPassword)
    throw httpError(400, "New password must be different from the current password");

  const user = await User.findById(req.user._id).select("+password");
  // 400 (dili 401) aron dili ma-logout ang user kung sayop ang current password
  if (!(await user.comparePassword(currentPassword)))
    throw httpError(400, "Current password is incorrect");

  user.password = newPassword; // ma-hash sa pre-save hook
  await user.save();

  // Fresh token, aron magpabilin nga naka-login kini nga session
  res.json({ message: "Password changed successfully.", token: signToken(user) });
});