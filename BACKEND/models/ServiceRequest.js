import mongoose from "mongoose";
import { ALL_SERVICE_TYPES, SATISFACTION } from "../constants/index.js";
import { generateDocNo } from "../utils/generateId.js";

const { Schema } = mongoose;

export const SR_STATUS = ["Pending", "Approved", "In Progress", "On Hold", "Completed", "Rejected"];
export const SR_PRIORITY = ["Low", "Medium", "High", "Urgent"];
export const SR_TYPES = [
  "Hardware Problem",
  "Software Problem",
  "Network / Internet Problem",
  "Printer Problem",
  "CCTV / Security System",
  "Account / Access Problem",
  "Installation Request",
  "Maintenance Request",
  "Other",
];

const personSchema = new Schema({ name: String, date: Date }, { _id: false });

// Matag pagbag-o (status, assignment, edit) naka-save dinhi
const historySchema = new Schema({
  kind: { type: String, enum: ["created", "status", "assignment", "edited"], default: "status" },
  fromStatus: String,
  toStatus: String,
  by: { type: Schema.Types.ObjectId, ref: "User" },
  byName: String,
  at: { type: Date, default: Date.now },
  remarks: String,
});

// 03F1 IT Service Request Form + IT Service Request module
const serviceRequestSchema = new Schema(
  {
    srfNo: { type: String, unique: true },
    dateRequested: { type: Date, default: Date.now },

    // Requestor
    requestorName: { type: String, required: [true, "Employee name is required"], trim: true },
    employeeId: { type: String, trim: true },
    positionDepartment: { type: String, trim: true }, // gamiton isip Department
    contactNo: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    // Request
    requestType: { type: String, enum: SR_TYPES },
    priority: { type: String, enum: SR_PRIORITY, default: "Medium" },
    subject: { type: String, trim: true },
    description: String,

    // Asset (optional)
    assetId: { type: String, trim: true },
    assetDescription: { type: String, trim: true },

    // 03F1 fields (gipabilin para sa Word form)
    services: [{ type: String, enum: ALL_SERVICE_TYPES }],
    othersText: String,
    preparedBy: personSchema,
    approvedBy: personSchema,
    receivedBy: personSchema,
    satisfaction: { type: String, enum: [...SATISFACTION, null], default: null },

    // Workflow
    status: { type: String, enum: SR_STATUS, default: "Pending", index: true },
    resolution: String,
    rejectReason: String,
    completedAt: Date,

    // Technician assignment
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedToName: String,
    assignedAt: Date,
    assignmentRemarks: String,

    // Kinsay nag-submit
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdByName: String,

    statusHistory: [historySchema],

    // "For IT use only" (karaan)
    itRemarks: String,
    ticketNo: String,
  },
  { timestamps: true }
);

serviceRequestSchema.index({ createdBy: 1 });
serviceRequestSchema.index({ assignedTo: 1 });
serviceRequestSchema.index({ dateRequested: -1 });

serviceRequestSchema.pre("validate", async function () {
  if (this.isNew && !this.srfNo) this.srfNo = await generateDocNo("SRF");
});

export default mongoose.model("ServiceRequest", serviceRequestSchema);