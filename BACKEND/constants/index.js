export const ASSET_STATUS = ["Active", "Available", "Damaged", "For Repair", "Disposed"];
export const ASSET_CATEGORIES = ["Non-Consumable", "Consumable"];

export const TXN_TYPES = ["CheckoutRequest", "Deploy", "Return", "TurnOver", "Disposal"];
export const TXN_STATUS = ["Pending", "Completed", "Rejected"];

export const REPAIR_STATUS = ["For Repair", "Repaired", "Damaged"]; // 06F3 legend
export const STOCK_MOVEMENTS = ["Added", "Request", "Pull-out", "Return"];

export const LOG_TYPES = [
  "DESKTOP_LAPTOP",     // 02F1
  "CCTV_PM",            // 02F3
  "CCTV_DAILY_BACKUP",  // 05F1
  "DB_WEEKLY_BACKUP",   // 05F2
  "HUMIDITY_TEMP",      // 02F2
];

export const SATISFACTION = [
  "Very unsatisfied", "Unsatisfied", "Neutral", "Satisfied", "Very satisfied",
];

// 03F1 IT Service Request Form
export const SERVICE_TYPES = {
  "Information and Communication Services": [
    "Software Installation/Issue", "LAN Problem", "Internet Access", "LAN Connection",
    "Printer Problem", "Telephone Problem", "Computer Problem",
  ],
  "Other Services": [
    "Domain Account", "Acumatica Account", "Email Account", "Move/Transfer of IT Asset/s",
    "Hardware Installation", "Access Card", "Asset Inventory", "IT Policies and Procedure",
    "Install/Repair CCTV Camera", "Relocate/Remove CCTV Camera", "Install/Repair DVR",
    "Install/Repair Biometrics", "Others",
  ],
};
export const ALL_SERVICE_TYPES = Object.values(SERVICE_TYPES).flat();

// 02F2 standard specification
export const SERVER_ROOM_STANDARD = { temperature: "18°C – 25°C", humidity: "50% – 70%" };
