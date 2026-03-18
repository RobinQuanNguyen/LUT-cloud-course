import mongoose from "mongoose";
import { AppError } from "../lib/errors.js";
import { ENV } from "../lib/env.js";
import { getBase64SizeInBytes } from "../lib/sanitize.js";

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const requireString = (value, field, min, max) => {
  if (typeof value !== "string") {
    throw new AppError(400, `${field} is invalid`);
  }

  const normalized = value.trim();

  if (normalized.length < min || normalized.length > max) {
    throw new AppError(400, `${field} must be between ${min} and ${max} characters`);
  }

  return normalized;
};

export const validateSignup = (req, res, next) => {
  try {
    const fullName = requireString(req.body.fullName, "Full name", 2, 80);
    const email = requireString(req.body.email, "Email", 5, 254).toLowerCase();
    const password = requireString(req.body.password, "Password", 8, 72);

    if (!isEmail(email)) {
      throw new AppError(400, "Please provide a valid email address");
    }

    req.body = { fullName, email, password };
    next();
  } catch (error) {
    next(error);
  }
};

export const validateLogin = (req, res, next) => {
  try {
    const email = requireString(req.body.email, "Email", 5, 254).toLowerCase();
    const password = requireString(req.body.password, "Password", 8, 72);

    if (!isEmail(email)) {
      throw new AppError(400, "Please provide a valid email address");
    }

    req.body = { email, password };
    next();
  } catch (error) {
    next(error);
  }
};

export const validateProfileUpdate = (req, res, next) => {
  try {
    const profilePic = requireString(req.body.profilePic, "Profile picture", 30, 10000000);

    if (!profilePic.startsWith("data:image/")) {
      throw new AppError(400, "Profile picture must be an image");
    }

    if (getBase64SizeInBytes(profilePic) > ENV.MAX_IMAGE_UPLOAD_BYTES) {
      throw new AppError(413, "Profile picture is too large");
    }

    req.body = { profilePic };
    next();
  } catch (error) {
    next(error);
  }
};

export const validateMessagePayload = (req, res, next) => {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const image = typeof req.body.image === "string" ? req.body.image.trim() : "";

    if (!text && !image) {
      throw new AppError(400, "Message text or image is required");
    }

    if (text.length > 2000) {
      throw new AppError(400, "Message text must not exceed 2000 characters");
    }

    if (image) {
      if (!image.startsWith("data:image/")) {
        throw new AppError(400, "Image must be a valid image payload");
      }

      if (getBase64SizeInBytes(image) > ENV.MAX_IMAGE_UPLOAD_BYTES) {
        throw new AppError(413, "Image is too large");
      }
    }

    req.body = { text, image };
    next();
  } catch (error) {
    next(error);
  }
};

export const validateObjectIdParam = (paramName) => (req, res, next) => {
  try {
    const value = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new AppError(400, `${paramName} is invalid`);
    }

    next();
  } catch (error) {
    next(error);
  }
};