import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";
import { AppError } from "../lib/errors.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies[ENV.JWT_COOKIE_NAME];

    if (!token) {
      throw new AppError(401, "Unauthorized");
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);

    if (!decoded?.userId) {
      throw new AppError(401, "Unauthorized");
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.name === "JsonWebTokenError" || error.name === "TokenExpiredError" ? new AppError(401, "Unauthorized") : error);
  }
};