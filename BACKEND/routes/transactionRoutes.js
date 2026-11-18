import { Router } from "express";
import * as c from "../controllers/transactionController.js";

const r = Router();
r.route("/").get(c.list).post(c.create);
r.route("/:id").get(c.get).put(c.update).delete(c.remove);
r.post("/:id/complete", c.complete);
r.post("/:id/reject", c.reject);

export default r;
