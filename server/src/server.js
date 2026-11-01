import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import transactionRoutes from "./routes/transactionRoutes.js";

import authRoutes from "./routes/authRoutes.js";
import { requireAuth } from "./middleware/requireAuth.js";
import documentRoutes from "./routes/documentRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import Transaction from "./models/Transaction.js";
import Budget from "./models/Budget.js";
import User from "./models/User.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    if (!process.env.CLIENT_ORIGIN) {
      throw new Error("CLIENT_ORIGIN is missing from server/.env");
    }

    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      throw new Error("Set a strong SESSION_SECRET in server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    await Promise.all([User.init(), Transaction.init(), Budget.init()]);

    const sessionStore = MongoStore.create({
      client: mongoose.connection.getClient(),
      collectionName: "sessions",
    });

    sessionStore.on("error", (error) => {
      console.error("Session storage error:", error.name);
    });

    app.use(
      cors({
        origin: process.env.CLIENT_ORIGIN,
        credentials: true,
      }),
    );

    // Reject state-changing browser requests from other origins.
    app.use("/api", (req, res, next) => {
      const safeMethods = ["GET", "HEAD", "OPTIONS"];

      if (
        !safeMethods.includes(req.method) &&
        req.get("Origin") !== process.env.CLIENT_ORIGIN
      ) {
        return res.status(403).json({
          message: "Request origin is not allowed.",
        });
      }

      next();
    });

    app.use(
      session({
        name: "finance.sid",
        secret: process.env.SESSION_SECRET,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 1000 * 60 * 60 * 8,
        },
      }),
    );

    app.get("/api/health", (req, res) => {
      res.json({
        success: true,
        message: "Personal Finance Manager backend is working!",
      });
    });

    // Larger JSON bodies are accepted only for authenticated document uploads.
    app.use(
      "/api/documents",
      requireAuth,
      express.json({ limit: "3mb" }),
      documentRoutes,
    );
    app.use(express.json({ limit: "10kb" }));
    app.use("/api/budgets", requireAuth, budgetRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/transactions", transactionRoutes);

    app.use((error, req, res, next) => {
      if (res.headersSent) {
        return next(error);
      }

      if (error.type === "entity.parse.failed") {
        return res.status(400).json({
          message: "The request contains invalid JSON.",
        });
      }

      if (error.type === "entity.too.large") {
        return res.status(413).json({
          message: "The request is too large.",
        });
      }

      console.error("Request failed:", error.name);

      return res.status(500).json({
        message: "An unexpected server error occurred.",
      });
    });

    app.listen(PORT, () => {
      console.log("Connected to MongoDB");
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
