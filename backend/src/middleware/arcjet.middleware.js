import { isSpoofedBot } from "@arcjet/inspect";
import aj from "../lib/arcjet.js";
import { AppError } from "../lib/errors.js";

export const arcjetProtection = async (req, res, next) => {
  try {
    const decision = await aj.protect(req, { requested: 1 });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return next(new AppError(429, "Rate limit exceeded. Please try again later."));
      }

      if (decision.reason.isBot()) {
        return next(new AppError(403, "Bot access denied."));
      }

      return next(new AppError(403, "Access denied."));
    }

    if (decision.results.some(isSpoofedBot)) {
      return next(new AppError(403, "Malicious bot activity detected."));
    }

    next();
  } catch {
    next();
  }
};