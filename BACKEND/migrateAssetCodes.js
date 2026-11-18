import "dotenv/config";
import mongoose from "mongoose";
import Asset from "./models/Asset.js";
import RepairTicket from "./models/RepairTicket.js";
import { nextSeq, peekSeq } from "./models/Counter.js";

// karaan -> bag-o (ang uban wala nausab)
const MAP = { LT: "LP", MN: "MT", DT: "DC", CC: "CV", UP: "PS", SW: "ST" };

await mongoose.connect(process.env.MONGO_URI);

const maxSeq = {}; // bag-ong code -> pinakadako nga numero
const assets = await Asset.find({ assetId: /^ICT-[A-Z]{2}-\d+$/ }).lean();

let renamed = 0;
for (const a of assets) {
  const [, oldCode, digits] = a.assetId.match(/^ICT-([A-Z]{2})-(\d+)$/);
  const newCode = MAP[oldCode];
  if (!newCode) continue;

  const newId = `ICT-${newCode}-${digits}`;
  if (await Asset.exists({ assetId: newId })) {
    console.warn(`Skipped ${a.assetId}: ${newId} already exists`);
    continue;
  }

  // collection.updateOne aron malabay ang "immutable" sa Asset ID
  await Asset.collection.updateOne({ _id: a._id }, { $set: { assetId: newId } });
  await RepairTicket.updateMany({ asset: a._id }, { $set: { assetCode: newId } });
  maxSeq[newCode] = Math.max(maxSeq[newCode] || 0, Number(digits));
  renamed++;
  console.log(`${a.assetId} -> ${newId}`);
}

// i-set ang counter aron ang sunod nga asset mo-padayon sa saktong numero
for (const [code, max] of Object.entries(maxSeq)) {
  while ((await peekSeq(`asset:${code}`)) <= max) await nextSeq(`asset:${code}`);
}

console.log(`Done. Renamed ${renamed} asset(s).`);
await mongoose.disconnect();