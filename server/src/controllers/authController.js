import argon2 from "argon2";
import validator from "validator";
import { promisify } from "node:util";
import User from "../models/User.js";

// REGISTER
export async function registerUser(req, res) {
  const { name, email, password } = req.body ?? {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "Name, email, and password are required.",
    });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanName.length < 2 || cleanName.length > 80) {
    return res.status(400).json({
      message: "Name must contain between 2 and 80 characters.",
    });
  }

  if (cleanEmail.length > 254 || !validator.isEmail(cleanEmail)) {
    return res.status(400).json({
      message: "Please enter a valid email address.",
    });
  }

  if (password.length < 15 || password.length > 128) {
    return res.status(400).json({
      message: "Password must contain between 15 and 128 characters.",
    });
  }

  try {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
    });

    return res.status(201).json({
      message: "Account created successfully.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration failed:", error.name);

    return res.status(500).json({
      message: "Unable to create your account. Please try again.",
    });
  }
}

// LOGIN
export async function loginUser(req, res) {
  const { email, password } = req.body ?? {};

  if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      password.length === 0 ||
      password.length > 128
  ) {
    return res.status(400).json({
      message: "Please provide a valid email and password.",
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!validator.isEmail(cleanEmail)) {
    return res.status(400).json({
      message: "Please provide a valid email and password.",
    });
  }

  try {
    const user = await User.findOne({
      email: cleanEmail,
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await argon2.verify(user.passwordHash, password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    await promisify(req.session.regenerate).call(req.session);

    req.session.userId = user._id.toString();

    await promisify(req.session.save).call(req.session);

    return res.status(200).json({
      message: "Logged in successfully.",
      user: {
         id: user._id.toString(),
         name: user.name,
         email: user.email,
      },
    });
  } catch (error) {
    console.error("Login failed:", error.name);

    return res.status(500).json({
        message: "Unable to log in. Please try again.",
    });
  }
}

// CURRENT ACCOUNT
export async function getCurrentUser(req, res) {
  res.set("Cache-Control", "no-store");

  if (!req.session.userId) {
    return res.status(401).json({
         message: "Please log in to continue.",
    });
  }

  try {
    const user = await User.findById(req.session.userId).select("name email");

    if (!user) {
      return res.status(401).json({
         message: "Your account is unavailable. Please log in again.",
      });
    }

    return res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Account lookup failed:", error.name);

    return res.status(500).json({
           message: "Unable to load your account.",
    });
  }
}

// LOGOUT
export async function logoutUser(req, res) {
  try {
    await promisify(req.session.destroy).call(req.session);

    res.clearCookie("finance.sid", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
           message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout failed:", error.name);

    return res.status(500).json({
         message: "Unable to log out. Please try again.",
    });
  }
}
