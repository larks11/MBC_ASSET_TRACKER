import Employee from "../models/Employee.js";
import Asset from "../models/Asset.js";
import crud from "./crudFactory.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpError from "../utils/httpError.js";

const base = crud(Employee, {
  searchFields: ["name", "employeeNo", "position", "department", "email"],
  filterFields: ["department", "employmentStatus", "isActive"],
  defaultSort: "name",
});

export const list = base.list;
export const get = base.get;
export const update = base.update;

export const create = asyncHandler(async (req, res, next) => {
  if (!String(req.body.employeeNo || "").trim()) throw httpError(400, "Employee ID is required");
  return base.create(req, res, next);
});

// GET /employees/departments → para sa filter dropdown
export const departments = asyncHandler(async (req, res) => {
  const list = await Employee.distinct("department");
  res.json(list.filter(Boolean).sort((a, b) => a.localeCompare(b)));
});

export const remove = asyncHandler(async (req, res) => {
  const holding = await Asset.countDocuments({ currentUser: req.params.id, status: "Active" });
  if (holding) {
    throw httpError(409, `Employee still holds ${holding} asset(s). Process a return first.`);
  }
  const doc = await Employee.findByIdAndDelete(req.params.id);
  if (!doc) throw httpError(404, "Employee not found");
  res.json({ message: "Employee deleted" });
});

// GET /employees/:id/assets → used by the MR Generator
export const assets = asyncHandler(async (req, res) => {
  res.json(await Asset.find({ currentUser: req.params.id, status: "Active" }).sort("assetId").lean());
});