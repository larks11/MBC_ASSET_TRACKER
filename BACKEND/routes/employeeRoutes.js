import { Router } from "express";
import * as c from "../controllers/employeeController.js";

const r = Router();
r.route("/").get(c.list).post(c.create);
r.route("/:id").get(c.get).put(c.update).delete(c.remove);
r.get("/:id/assets", c.assets);

export default r;
