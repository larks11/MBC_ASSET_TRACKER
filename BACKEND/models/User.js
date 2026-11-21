import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Full name is required"], trim: true, maxlength: 100 },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9._-]{3,30}$/, "Username must be 3-30 characters (letters, numbers, . _ -)"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: { type: String, required: [true, "Password is required"], minlength: 8, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

// I-hash ang password (bcrypt) sa dili pa i-save. Dili gayud plain text.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.passwordChangedAt;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);