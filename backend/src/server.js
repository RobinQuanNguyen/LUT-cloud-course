import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";
import promClient from "prom-client";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";
import { attachRequestContext } from "./middleware/request-context.middleware.js";
import {
  enforceHttps,
  enforceTrustedOrigin,
  errorHandler,
  notFoundHandler,
  requestLogger,
  sanitizeRequest,
  securityHeaders,
} from "./middleware/security.middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = ENV.RUN_PORT || 3001;

if (ENV.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(attachRequestContext);
app.use(requestLogger);
app.use(enforceHttps);
app.use(securityHeaders);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ENV.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: ENV.MAX_JSON_SIZE || "2mb" }));
app.use(express.urlencoded({ extended: false, limit: ENV.MAX_URL_ENCODED_SIZE || "1mb" }));
app.use(cookieParser());
app.use(sanitizeRequest);
app.use(enforceTrustedOrigin);

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/message", messageRoutes);

if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

server.requestTimeout = ENV.REQUEST_TIMEOUT_MS || 15000;
server.headersTimeout = (ENV.REQUEST_TIMEOUT_MS || 15000) + 5000;

server.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectDB();
});