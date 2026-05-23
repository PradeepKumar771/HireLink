// src/index.ts
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import { createLogger, format, transports } from "winston";
import { collectDefaultMetrics, register } from "prom-client";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Security Middlewares ----
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  referrerPolicy: { policy: "no-referrer" },
  hidePoweredBy: true,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || "*",
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP
}));

app.use(express.json());
app.use(cookieParser());

// CSRF protection – uses double‑submit cookie pattern
app.use(csurf({ cookie: { httpOnly: true, sameSite: "strict", secure: true } }));

// ---- Logger ----
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.originalUrl, ip: req.ip });
  next();
});

// ---- Prometheus Metrics ----
collectDefaultMetrics();
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// ---- Placeholder Routes ----
app.get("/healthz", (_req, res) => res.sendStatus(200));

// TODO: Add authentication routes (register, login, refresh, logout)
// Example placeholder
app.post("/login", (req: Request, res: Response) => {
  // Validate credentials, issue JWT, set HttpOnly cookie
  res.json({ message: "Login endpoint – to be implemented" });
});

app.listen(PORT, () => {
  logger.info(`Auth service listening on port ${PORT}`);
});
