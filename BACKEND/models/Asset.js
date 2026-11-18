import mongoose from "mongoose";
import { ASSET_STATUS, ASSET_CATEGORIES } from "../constants/index.js";
import { generateAssetId } from "../utils/generateId.js";

const { Schema } = mongoose;

// 06F2 Asset History Record: details for desktops & laptops
const specsSchema = new Schema(
  {
    operatingSystem: String,
    systemType: String,
    processor: String,
    ram: String,
    hardDisk: String,
    motherboard: String,
    opticalDiskDrive: String,
    cardReader: String,
    programsInstalled: String,
  },
  { _id: false }
);

const assetSchema = new Schema(
  {
    assetId: { type: String, unique: true, immutable: true }, // auto: ICT-XX-00001
    company: { type: String, trim: true, default: "MAC Builders Corp." },
    category: { type: String, enum: ASSET_CATEGORIES, default: "Non-Consumable" },
    assetType: { type: String, required: [true, "Asset type is required"], trim: true },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    serialNo: { type: String, trim: true },
    status: { type: String, enum: ASSET_STATUS, default: "Available" },
    currentUser: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    location: { type: String, trim: true },

    // Consumables
    quantity: { type: Number, default: 1, min: 0 },
    unit: { type: String, trim: true },
    reorderLevel: { type: Number, default: 0, min: 0 },

    // 01F1 / 01F2: request & receiving info
    rfNo: String,
    acumaticaRI: String,
    poNo: String,
    datePurchased: Date,
    supplier: String,
    invoiceDate: Date,
    invoiceNo: String,
    warrantyDate: Date,
    rrNo: String,
    amount: { type: Number, min: 0 },
    receivedDate: Date,

    specs: { type: specsSchema, default: () => ({}) },
    remarks: String,
  },
  { timestamps: true }
);

assetSchema.index({ category: 1, status: 1 });
assetSchema.index({ assetType: 1 });
assetSchema.index({ currentUser: 1 });
assetSchema.index({ serialNo: 1 });

assetSchema.pre("validate", async function () {
  if (this.isNew && !this.assetId && this.assetType) {
    this.assetId = await generateAssetId(this.assetType);
  }
});

export default mongoose.model("Asset", assetSchema);
