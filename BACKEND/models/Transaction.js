import mongoose from "mongoose";
import { TXN_TYPES, TXN_STATUS } from "../constants/index.js";

const { Schema } = mongoose;

const itemSchema = new Schema(
  {
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    qty: { type: Number, default: 1, min: 1 },
    details: String,              // MR: Details / Particulars
    particulars: String,          // 01F1
    unit: String,                 // 01F1
    condition: { type: String, enum: ["Good", "Damaged"], default: "Good" }, // Return / TurnOver
    ticketNo: String,             // 06F4 Disposal log
    meansOfDisposal: String,      // 06F4 Disposal log
  },
  { _id: false }
);

const personSchema = new Schema({ name: String, position: String }, { _id: false });

const transactionSchema = new Schema(
  {
    type: { type: String, enum: TXN_TYPES, required: true },
    transactionNo: { type: String, unique: true },   // MR-2026-00001 etc.
    date: { type: Date, default: Date.now },         // Date Issued
    status: { type: String, enum: TXN_STATUS, default: "Pending" },

    employee: { type: Schema.Types.ObjectId, ref: "Employee" },
    employeeSnapshot: { name: String, position: String, department: String },
    department: String,
    location: String,

    documentType: String,   // e.g. RF, MR, Project Turnover
    documentNo: String,
    projectName: String,
    ticketNo: String,       // Return / Turn over reference

    items: { type: [itemSchema], validate: [(v) => v.length > 0, "At least one item is required"] },

    // 01F1 Request monitoring
    request: {
      rfNo: String,
      rfDate: Date,
      acumaticaRI: String,
      receivedDate: Date,
      source: { type: String, enum: ["Purchased", "Provided by ICT", null] },
    },

    // 06F4 Disposal log
    disposalDate: Date,
    taskNo: String,

    // Sign-off blocks (MR / disposal)
    issuedBy: personSchema,
    notedBy: personSchema,
    approvedBy: personSchema,

    remarks: String,
    rejectReason: String,
    completedAt: Date,
  },
  { timestamps: true }
);

transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ "items.asset": 1 });
transactionSchema.index({ employee: 1 });

export default mongoose.model("Transaction", transactionSchema);
