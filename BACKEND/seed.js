import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import Counter from "./models/Counter.js";
import Employee from "./models/Employee.js";
import Asset from "./models/Asset.js";

await connectDB();
// WARNING: deletes existing employees/assets/counters (development only)
await Promise.all([Counter.deleteMany(), Employee.deleteMany(), Asset.deleteMany()]);

const employees = await Employee.insertMany([
  { name: "Juan Dela Cruz", position: "Site Engineer", department: "Engineering" },
  { name: "Maria Santos", position: "Accountant", department: "Accounting" },
]);

const assets = [
  { assetType: "Laptop", brand: "Lenovo", model: "ThinkPad E14", serialNo: "PF-3XK001", status: "Available",
    specs: { operatingSystem: "Windows 11 Pro", processor: "Intel Core i5", ram: "16GB", hardDisk: "512GB SSD" } },
  { assetType: "Laptop", brand: "Dell", model: "Latitude 3420", serialNo: "DL-77A210", status: "Available" },
  { assetType: "Desktop", brand: "HP", model: "ProDesk 400 G7", serialNo: "HP-55B901", status: "Available" },
  { assetType: "Printer", brand: "Epson", model: "L3210", serialNo: "EP-10029", status: "Available" },
  { assetType: "Monitor", brand: "Dell", model: "P2422H", serialNo: "DM-90311", status: "Available" },
  { assetType: "DVR", brand: "Hikvision", model: "DS-7208HQHI", serialNo: "HK-20931", status: "Available", location: "Server Room" },
  { assetType: "Keyboard", category: "Consumable", brand: "A4Tech", model: "KR-85", quantity: 12, unit: "pcs", reorderLevel: 3 },
];
for (const a of assets) await Asset.create(a); // sequential to keep Asset IDs in order

console.log(`Seeded ${employees.length} employees, ${assets.length} assets`);
await mongoose.disconnect();
