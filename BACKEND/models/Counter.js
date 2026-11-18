import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String },          // e.g. "asset:LT", "doc:MR:2026"
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);
export default Counter;

export async function nextSeq(key) {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

export async function peekSeq(key) {
  const doc = await Counter.findById(key).lean();
  return (doc?.seq || 0) + 1;
}
