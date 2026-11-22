import { Router } from "express";
import * as c from "../controllers/assetController.js";

const r = Router();
r.get("/types", c.types);
r.get("/stock-logs", c.allStockLogs);
r.get("/next-id", c.nextId);
r.post("/bulk", c.bulkCreate);
r.route("/").get(c.list).post(c.create);
r.route("/:id").get(c.get).put(c.update).delete(c.remove);
r.get("/:id/history", c.history);
r.get("/:id/export/06F2", c.exportHistory);
r.get("/:id/export/06F2/preview", c.previewHistory);
r.route("/:id/stock").get(c.stockLogs).post(c.adjustStock);


export default r;