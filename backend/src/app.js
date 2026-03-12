import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import companyRoutes from "./routes/companies.js";
import waitTimeRoutes from "./routes/waittimes.js";
import betaRoutes from "./routes/beta.js";
import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

const allowedOrigins = env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim());

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    }
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/waittimes", waitTimeRoutes);
app.use("/api/beta-signup", betaRoutes);
app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use(express.static(frontendDir, { extensions: ["html"] }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  return res.sendFile(path.join(frontendDir, "index.html"));
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

