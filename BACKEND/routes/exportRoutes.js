import { Router } from "express";
import * as c from "../controllers/exportController.js";

const r = Router();
r.get("/masterlist", c.masterlist);
r.get("/memorandum-receipt/:id", c.memorandumReceipt);
r.get("/repairs", c.repairs);
r.get("/disposal/:id", c.disposal);

export default r;
