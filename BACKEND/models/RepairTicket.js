import mongoose from "mongoose";
import { REPAIR_STATUS } from "../constants/index.js";
import { generateDocNo } from "../utils/generateId.js";

const { Schema } = mongoose;

// 06F3 Repair & Service Request Monitoring + 06F2 History Record rows
const repairTicketSchema = new Schema(
  {
    ticketNo: { type: String, unique: true },
    dateReceived: { type: Date, default: Date.now },
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    assetCode: String,      // snapshot of Asset ID
    assetType: String,      // snapshot
    reportedBy: { type: Schema.Types.ObjectId, ref: "Employee" },
    problem: { type: String, required: [true, "Problem / diagnosis is required"] },
    solution: String,       // Solution / Recommendation
    technician: String,     // assigned technical personnel
    dateStarted: Date,
    dateFinished: Date,
    status: { type: String, enum: REPAIR_STATUS, default: "For Repair" },
    checkedBy: String,      // 06F2 "Checked by"
    remarks: String,
  },
  { timestamps: true }
);

repairTicketSchema.index({ asset: 1, dateReceived: -1 });
repairTicketSchema.index({ status: 1 });

repairTicketSchema.pre("validate", async function () {
  if (this.isNew && !this.ticketNo) this.ticketNo = await generateDocNo("TKT");
});

export default mongoose.model("RepairTicket", repairTicketSchema);
