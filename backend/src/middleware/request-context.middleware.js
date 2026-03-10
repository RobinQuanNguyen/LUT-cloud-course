import crypto from "crypto";

export const attachRequestContext = (req, res, next) => {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.startedAt = Date.now();
  res.setHeader("X-Request-Id", req.requestId);
  next();
};