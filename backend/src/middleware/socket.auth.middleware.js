import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";

const getCookieValue = (cookieHeader, cookieName) => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const target = cookies.find((entry) => entry.startsWith(`${cookieName}=`));
  return target ? decodeURIComponent(target.split("=").slice(1).join("=")) : null;
};

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = getCookieValue(socket.handshake.headers.cookie, ENV.JWT_COOKIE_NAME);

    if (!token) {
      return next(new Error("Authentication error"));
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);

    if (!decoded?.userId) {
      return next(new Error("Authentication error"));
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return next(new Error("Authentication error"));
    }

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch {
    next(new Error("Authentication error"));
  }
};