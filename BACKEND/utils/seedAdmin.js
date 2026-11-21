import User from "../models/User.js";

const DEFAULT_ADMIN = {
  username: "admin",
  name: "System Administrator",
  email: "admin@macbuilders.local",
};

// Gi-run sa matag start sa server. Safe ni i-run balik-balik: dili maghimo og duplicate.
export default async function seedAdmin() {
  // Mga account nga gihimo sa dili pa ang approval system = Approved na (aron dili ma-lock out)
  const migrated = await User.updateMany(
    { status: { $exists: false } },
    { $set: { status: "approved" } }
  );
  if (migrated.modifiedCount)
    console.log(`Marked ${migrated.modifiedCount} existing account(s) as approved`);

  const exists = await User.findOne({
    $or: [{ username: DEFAULT_ADMIN.username }, { email: DEFAULT_ADMIN.email }],
  });
  if (exists) return; // Ayaw i-overwrite, kay basin giusab na sa admin ang iyang password

  await User.create({
    ...DEFAULT_ADMIN,
    password: process.env.DEFAULT_ADMIN_PASSWORD || "adminMBC1234", // ma-hash sa bcrypt sa User model
    role: "admin",
    status: "approved",
  });
  console.log("Default admin account created (username: admin)");
}