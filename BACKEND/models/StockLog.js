import mongoose from "mongoose";
import { STOCK_MOVEMENTS } from "../constants/index.js";

const stockLogSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true, index: true },
    movement: { type: String, enum: STOCK_MOVEMENTS, required: true },
    qty: { type: Number, required: true, min: 1 },
    balanceAfter: Number,
    refNo: String,
    requestedBy: String,
    remarks: String,
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("StockLog", stockLogSchema);
