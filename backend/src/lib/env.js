import "dotenv/config";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "undefined") return fallback;
  return value === "true" || value === "1";
};

const toList = (value, fallback = []) => {
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const defaultOrigins = ["http://localhost:8080", "http://localhost:5173"];
const configuredOrigins = toList(process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL, defaultOrigins);

export const ENV = {
  RUN_PORT: toNumber(process.env.RUN_PORT, 3001),
  MONGO_URI: process.env.MONGO_URI,
  MONGO_URI_TEST: process.env.MONGO_URI_TEST,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  JWT_COOKIE_NAME: process.env.JWT_COOKIE_NAME || "jwt",
  JWT_COOKIE_MAX_AGE_MS: toNumber(process.env.JWT_COOKIE_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000),
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || configuredOrigins[0],
  ALLOWED_ORIGINS: configuredOrigins,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  ARCJET_KEY: process.env.ARCJET_KEY,
  ARCJET_ENV: process.env.ARCJET_ENV,
  TRUST_PROXY: toBoolean(process.env.TRUST_PROXY, false),
  MAX_JSON_SIZE: process.env.MAX_JSON_SIZE || "2mb",
  MAX_URL_ENCODED_SIZE: process.env.MAX_URL_ENCODED_SIZE || "1mb",
  MAX_IMAGE_UPLOAD_BYTES: toNumber(process.env.MAX_IMAGE_UPLOAD_BYTES, 5 * 1024 * 1024),
  REQUEST_TIMEOUT_MS: toNumber(process.env.REQUEST_TIMEOUT_MS, 15000),
  APP_DOMAIN: process.env.APP_DOMAIN || "",
  TLS_EMAIL: process.env.TLS_EMAIL || "",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};