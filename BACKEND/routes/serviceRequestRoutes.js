import { Router } from "express";
import * as c from "../controllers/serviceRequestController.js";

const r = Router();

// Kinahanglan una ang fixed paths, sa wala pa ang "/:id"
r.get("/stats", c.stats);
r.get("/technicians", c.technicians);

r.route("/").get(c.list).post(c.create);
r.route("/:id").get(c.get).put(c.update).delete(c.remove);
r.post("/:id/status", c.changeStatus);
r.post("/:id/assign", c.assign);

export default r;