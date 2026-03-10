import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

const cookieOptions = {
  maxAge: ENV.JWT_COOKIE_MAX_AGE_MS,
  httpOnly: true,
  sameSite: "strict",
  secure: ENV.NODE_ENV === "production",
  path: "/",
};

if (ENV.COOKIE_DOMAIN) {
  cookieOptions.domain = ENV.COOKIE_DOMAIN;
}

export const generateToken = (userId, res) => {
  if (!ENV.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const token = jwt.sign({ userId }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  });

  res.cookie(ENV.JWT_COOKIE_NAME, token, cookieOptions);
  return token;
};

export const clearAuthCookie = (res) => {
  res.cookie(ENV.JWT_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
};