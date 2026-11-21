import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./config/db.js";
import routes from "./routes/index.js";
import seedAdmin from "./utils/seedAdmin.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (process.env.CLIENT_URL || "http://localhost:5173").split(","),
    exposedHeaders: ["Content-Disposition"], // needed for file downloads (Step 4)
  })
);
app.use(express.json({ limit: "5mb" }));
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(seedAdmin)
  .then(() => app.listen(PORT, () => console.log(`IAMS API running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });