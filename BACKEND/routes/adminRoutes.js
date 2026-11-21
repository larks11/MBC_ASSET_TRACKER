import { Router } from "express";
import {
  stats, listUsers, approveUser, rejectUser, deleteUser,
} from "../controllers/adminController.js";

// Ang protect + adminOnly gi-apply na sa routes/index.js
const router = Router();

router.get("/stats", stats);
router.get("/users", listUsers);
router.patch("/users/:id/approve", approveUser);
router.patch("/users/:id/reject", rejectUser);
router.delete("/users/:id", deleteUser);

export default router;