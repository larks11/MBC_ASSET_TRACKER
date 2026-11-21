import { Router } from "express";
import * as c from "../controllers/employeeController.js";
import { adminOnly } from "../middleware/auth.js";

// Ang protect gi-apply na sa routes/index.js
const r = Router();

r.get("/", c.list);
r.get("/departments", c.departments); // kinahanglan una sa "/:id"
r.get("/:id/assets", c.assets);
r.get("/:id", c.get);
r.post("/", adminOnly, c.create);
r.put("/:id", adminOnly, c.update);
r.delete("/:id", adminOnly, c.remove);

export default r;