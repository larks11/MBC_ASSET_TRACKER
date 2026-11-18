import { Router } from "express";
import { flattened } from "../controllers/reportController.js";

const r = Router();
r.get("/:name", flattened);

export default r;
