import mongoose from "mongoose";
import { LOG_TYPES } from "../constants/index.js";

const { Schema } = mongoose;

/*
  records shape per logType (stored in `records`):
  DESKTOP_LAPTOP    : { "1.1": { q1:"P", q2:"", q3:"", q4:"", remarks:"" }, ... }
  CCTV_PM           : { "1.1": { m1:"P", ..., m12:"" }, ... }
  CCTV_DAILY_BACKUP : { cameras: [{ assetId, location, days: { "1":"✓", "2":"D" } }] }
  DB_WEEKLY_BACKUP  : { databases: [{ name, weeks: { "1-1":"✓", "1-2":"X" } }] }   // "month-week"
  HUMIDITY_TEMP     : { days: [{ day, am:{temp,humidity}, pm:{temp,humidity}, checkedBy, remarks }] }

  periods (performed/noted per quarter or month):
  { q1: { performedBy, datePerformed, notedBy }, ... } or { m1: {...}, ... }

  verifications (PMS Verify, per quarter):
  { q1: { status: "Pending" | "Approved" | "Rejected", verifiedBy, verifiedAt }, ... }

  header (extra fields on top of the form):
  DESKTOP_LAPTOP: { taskId, computerName, userName, processor, ram, location }
  CCTV_PM / CCTV_DAILY_BACKUP: { model, serialNo, location, channels, camerasInstalled, hddCapacity, ipAddress }
*/
const maintenanceLogSchema = new Schema(
  {
    logType: { type: String, enum: LOG_TYPES, required: true },
    asset: { type: Schema.Types.ObjectId, ref: "Asset" },  // computer or DVR/NVR
    year: { type: Number, required: true },
    month: { type: Number, min: 1, max: 12 },
    header: { type: Schema.Types.Mixed, default: {} },
    records: { type: Schema.Types.Mixed, default: {} },
    periods: { type: Schema.Types.Mixed, default: {} },
    verifications: { type: Schema.Types.Mixed, default: {} },
    comments: String,
  },
  { timestamps: true, minimize: false }
);

maintenanceLogSchema.index({ logType: 1, asset: 1, year: 1, month: 1 }, { unique: true });

const NEEDS_ASSET = ["DESKTOP_LAPTOP", "CCTV_PM", "CCTV_DAILY_BACKUP"];
const NEEDS_MONTH = ["CCTV_DAILY_BACKUP", "HUMIDITY_TEMP"];

maintenanceLogSchema.pre("validate", function () {
  if (NEEDS_ASSET.includes(this.logType) && !this.asset) {
    this.invalidate("asset", "Asset is required for this log type");
  }
  if (NEEDS_MONTH.includes(this.logType) && !this.month) {
    this.invalidate("month", "Month is required for this log type");
  }
});

export default mongoose.model("MaintenanceLog", maintenanceLogSchema);