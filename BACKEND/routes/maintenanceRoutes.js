import { Router } from "express";
import * as c from "../controllers/maintenanceController.js";
import { adminOnly } from "../middleware/auth.js";

// Ang protect gi-apply na sa routes/index.js
const r = Router();

r.post("/desktop/perform", c.performDesktop);
r.post("/:id/verify", adminOnly, c.verify);

r.route("/").get(c.list).post(c.create);
r.route("/:id").get(c.get).put(c.update).delete(c.remove);

export default r;