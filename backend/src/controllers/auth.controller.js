import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import User from "../models/User.js";
import { generateToken, clearAuthCookie } from "../lib/utils.js";
import { AppError } from "../lib/errors.js";

export const signup = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(409, "Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email, password: hashedPassword });

    generateToken(user._id.toString(), res);

    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      contentFilter: user.contentFilter
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      throw new AppError(401, "Invalid credentials");
    }

    generateToken(user._id.toString(), res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      contentFilter: user.contentFilter

    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { profilePic } = req.body;
    const uploadResponse = await cloudinary.uploader.upload(profilePic, {
      folder: "chatify/profile-pictures",
      resource_type: "image",
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const updateContentFilter = async (req, res, next) => {
  try {
    const { contentFilter } = req.body;
    if (typeof contentFilter !== "boolean") {
      throw new AppError(400, "contentFilter must be a boolean");
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { contentFilter },
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};