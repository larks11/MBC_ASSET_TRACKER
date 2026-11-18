import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    employeeNo: {
      type: String, trim: true, unique: true, sparse: true,
      set: (v) => v || undefined,
    },
    name: { type: String, required: [true, "Employee name is required"], trim: true },
    position: { type: String, trim: true },
    department: { type: String, trim: true }, // Department / Project location
    email: { type: String, trim: true, lowercase: true },
    contactNo: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeSchema.index({ name: 1 });

export default mongoose.model("Employee", employeeSchema);
