import { Router } from "express";
import assetRoutes from "./assetRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import repairRoutes from "./repairRoutes.js";
import employeeRoutes from "./employeeRoutes.js";
import maintenanceRoutes from "./maintenanceRoutes.js";
import serviceRequestRoutes from "./serviceRequestRoutes.js";
import exportRoutes from "./exportRoutes.js";
import reportRoutes from "./reportRoutes.js";
import authRoutes from "./authRoutes.js";
import adminRoutes from "./adminRoutes.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { summary } from "../controllers/dashboardController.js";
import * as K from "../constants/index.js";
import { DESKTOP_CHECKLIST, CCTV_CHECKLIST } from "../constants/checklists.js";
import { TYPE_CODES } from "../utils/generateId.js";

const router = Router();

// PUBLIC: login ug register ra
router.use("/auth", authRoutes);

// PRIVATE: tanan sa ubos kinahanglan naka-login (ug approved)
router.use(protect);

// ADMIN ONLY
router.use("/admin", adminOnly, adminRoutes);

router.get("/dashboard", summary);

// Dropdown options + checklist definitions for the frontend
router.get("/meta", (req, res) =>
  res.json({
    assetStatus: K.ASSET_STATUS,
    assetCategories: K.ASSET_CATEGORIES,
    assetTypes: Object.keys(TYPE_CODES),
    txnTypes: K.TXN_TYPES,
    txnStatus: K.TXN_STATUS,
    repairStatus: K.REPAIR_STATUS,
    stockMovements: K.STOCK_MOVEMENTS,
    logTypes: K.LOG_TYPES,
    serviceTypes: K.SERVICE_TYPES,
    satisfaction: K.SATISFACTION,
    serverRoomStandard: K.SERVER_ROOM_STANDARD,
    desktopChecklist: DESKTOP_CHECKLIST,
    cctvChecklist: CCTV_CHECKLIST,
  })
);

router.use("/assets", assetRoutes);
router.use("/transactions", transactionRoutes);
router.use("/repairs", repairRoutes);
router.use("/employees", employeeRoutes);
router.use("/maintenance", maintenanceRoutes);
router.use("/service-requests", serviceRequestRoutes);
router.use("/exports", exportRoutes);
router.use("/reports", reportRoutes);

export default router;