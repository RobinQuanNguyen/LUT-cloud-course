import { ENV } from "../lib/env.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { sanitizeValue } from "../lib/sanitize.js";

const buildCsp = () => {
  const connectSrc = ["'self'", "https:", "wss:"];

  if (ENV.NODE_ENV !== "production") {
    connectSrc.push("http:", "ws:");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https://res.cloudinary.com",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${connectSrc.join(" ")}`,
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
};

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Content-Security-Policy", buildCsp());

  if (ENV.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  if (req.path.startsWith("/api/auth")) {
    res.setHeader("Cache-Control", "no-store");
  }

  next();
};

export const enforceHttps = (req, res, next) => {
  if (ENV.NODE_ENV !== "production") {
    return next();
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const isSecure = req.secure || forwardedProto === "https";

  if (isSecure) {
    return next();
  }

  const host = req.headers.host;
  if (!host) {
    return next(new AppError(400, "Host header is required"));
  }

  if (["GET", "HEAD"].includes(req.method)) {
    return res.redirect(308, `https://${host}${req.originalUrl}`);
  }

  return next(new AppError(400, "HTTPS is required"));
};

export const requestLogger = (req, res, next) => {
  res.on("finish", () => {
    const durationMs = Date.now() - req.startedAt;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger[level]("http_request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userId: req.user?._id?.toString(),
    });
  });

  next();
};

export const sanitizeRequest = (req, res, next) => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

export const enforceTrustedOrigin = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) {
    return next();
  }

  const allowed = ENV.ALLOWED_ORIGINS;
  const candidate =
    origin ||
    (() => {
      try {
        return new URL(referer).origin;
      } catch {
        return "";
      }
    })();

  if (!candidate || allowed.includes(candidate)) {
    return next();
  }

  next(new AppError(403, "Origin not allowed"));
};

export const notFoundHandler = (req, res, next) => {
  next(new AppError(404, "Route not found"));
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const safeMessage = statusCode >= 500 ? "Internal server error" : err.message || "Request failed";

  logger[statusCode >= 500 ? "error" : "warn"]("request_failed", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    error: err.message,
    details: err.details,
  });

  const payload = { message: safeMessage, requestId: req.requestId };

  if (err.details && statusCode < 500) {
    payload.details = err.details;
  }

  res.status(statusCode).json(payload);
};