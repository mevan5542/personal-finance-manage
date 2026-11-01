import express from "express";
import { rateLimit } from "express-rate-limit";
import {
  getDocuments,
  createDocument,
  downloadDocument,
  deleteDocument,
} from "../controllers/documentController.js";

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many uploads. Please try again later." },
});
router.get("/", getDocuments);
router.post("/", uploadLimiter, createDocument);
router.get("/:id/file", downloadDocument);
router.delete("/:id", deleteDocument);

export default router;
