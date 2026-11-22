import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);
const col = mongoose.connection.collection("servicerequests");

// karaan -> bag-o ("In Progress" parehas na)
const MAP = [
  ["Open", "Pending"],
  ["Done", "Completed"],
  ["Cancelled", "Rejected"],
];

for (const [from, to] of MAP) {
  const res = await col.updateMany({ status: from }, { $set: { status: to } });
  console.log(`${from} -> ${to}: ${res.modifiedCount} updated`);
}

await mongoose.disconnect();
console.log("Done.");