import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from "../controllers/authController.js";

const router = express.Router();

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many registration attempts. Try again in 15 minutes.",
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Try again in 15 minutes.",
  },
});

router.post("/register", registrationLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.get("/me", getCurrentUser);
router.post("/logout", logoutUser);

export default router;
