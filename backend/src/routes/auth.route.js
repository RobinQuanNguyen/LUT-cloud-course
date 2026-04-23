import express from "express";
import { login, logout, signup, updateProfile, updateContentFilter } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { validateLogin, validateProfileUpdate, validateSignup } from "../middleware/validation.middleware.js";

const router = express.Router();

router.get("/test", (req, res) => {
  res.status(200).json({ message: "Test route is working" });
});

router.post("/signup", arcjetProtection, validateSignup, signup);
router.post("/login", arcjetProtection, validateLogin, login);
router.post("/logout", protectRoute, logout);
router.put("/update-profile", protectRoute, arcjetProtection, validateProfileUpdate, updateProfile);
router.patch("/content-filter", protectRoute, arcjetProtection, updateContentFilter);
router.get("/check", protectRoute, (req, res) => {
  res.status(200).json({ message: "User is authenticated", user: req.user });
});


export default router;