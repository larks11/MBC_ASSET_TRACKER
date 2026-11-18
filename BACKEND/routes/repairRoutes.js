import { Router } from "express";
import * as c from "../controllers/repairController.js";

const r = Router();
r.route("/").get(c.list).post(c.create);
r.route("/:id").get(c.get).put(c.update).delete(c.remove);

export default r;
