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

// Gitugotan nga mga origin (comma-separated). I-trim ug tangtangon ang "/" sa katapusan
// aron dili mag-mismatch kung naay sayop sa pagsulat sa CLIENT_URL.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

console.log("CORS allowed origins:", allowedOrigins.join(", "));

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Walay origin = same-origin / curl / health check: tugotan
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin.replace(/\/+$/, ""))) return callback(null, true);
      console.warn(`CORS blocked origin: ${origin}`);
      return callback(null, false);
    },
    exposedHeaders: ["Content-Disposition"], // needed for file downloads
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