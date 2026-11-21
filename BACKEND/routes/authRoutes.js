import { Router } from "express";
import { register, login, me, changePassword } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.post("/change-password", protect, changePassword);

export default router;