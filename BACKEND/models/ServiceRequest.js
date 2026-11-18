import mongoose from "mongoose";
import { ALL_SERVICE_TYPES, SATISFACTION } from "../constants/index.js";
import { generateDocNo } from "../utils/generateId.js";

const { Schema } = mongoose;

const personSchema = new Schema({ name: String, date: Date }, { _id: false });

// 03F1 IT Service Request Form
const serviceRequestSchema = new Schema(
  {
    srfNo: { type: String, unique: true },
    requestorName: { type: String, required: [true, "Requestor name is required"], trim: true },
    positionDepartment: { type: String, trim: true },
    dateRequested: { type: Date, default: Date.now },
    services: [{ type: String, enum: ALL_SERVICE_TYPES }],
    othersText: String,
    description: String,
    preparedBy: personSchema,
    approvedBy: personSchema,
    receivedBy: personSchema,
    satisfaction: { type: String, enum: [...SATISFACTION, null], default: null },

    // "For IT use only"
    status: { type: String, enum: ["Open", "In Progress", "Done", "Cancelled"], default: "Open" },
    itRemarks: String,
    ticketNo: String,
  },
  { timestamps: true }
);

serviceRequestSchema.pre("validate", async function () {
  if (this.isNew && !this.srfNo) this.srfNo = await generateDocNo("SRF");
});

export default mongoose.model("ServiceRequest", serviceRequestSchema);
