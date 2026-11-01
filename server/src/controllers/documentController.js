import { createHash } from "node:crypto";
import Transaction from "../models/Transaction.js";
import { validateTransaction } from "../utils/validateTransaction.js";
import { validateReceipt, validMonth } from "../utils/validateReceipt.js";
const validId = (id) => /^[a-fA-F0-9]{24}$/.test(id);

export async function getDocuments(req, res, next) {
  const { month = "", page = "1" } = req.query;
  if (
    (month && !validMonth(month)) ||
    typeof page !== "string" ||
    !/^[1-9]\d{0,5}$/.test(page)
  ) {
    return res.status(400).json({ message: "Choose a valid month and page." });
  }
  try {
    const filter = { user: req.userId, receipt: { $exists: true } };
    if (month) filter.date = { $gte: `${month}-01`, $lte: `${month}-31` };
    const total = await Transaction.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / 10));
    const current = Math.min(Number(page), pages);
    const documents = await Transaction.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip((current - 1) * 10)
      .limit(10)
      .select(
        "type amountCents category description date receipt.name receipt.mimeType receipt.size",
      )
      .lean();
    res.json({
      documents,
      pagination: { page: current, totalPages: pages, total },
    });
  } catch (error) {
    next(error);
  }
}

export async function createDocument(req, res, next) {
  const entry = validateTransaction(req.body);
  if (entry.error) return res.status(400).json({ message: entry.error });
  const receipt = validateReceipt(req.body?.file);
  if (receipt.error) return res.status(400).json({ message: receipt.error });
  const { uploadId } = req.body;
  if (typeof uploadId !== "string" || !/^[a-f0-9-]{36}$/i.test(uploadId)) {
    return res
      .status(400)
      .json({ message: "Invalid upload reference. Select the file again." });
  }
  const hash = createHash("sha256")
    .update(JSON.stringify(entry.value))
    .update(receipt.value.name)
    .update(receipt.value.data)
    .digest("hex");
  async function previous() {
    return Transaction.findOne({
      user: req.userId,
      "receipt.uploadId": uploadId,
    }).select("+receipt.submissionHash");
  }
  function existingResponse(existing) {
    if (existing.receipt.submissionHash !== hash)
      return res
        .status(409)
        .json({
          message:
            "This upload was already saved with different details. Select the file again for a new entry.",
        });
    return res.json({
      message: "Document and transaction already saved.",
      transactionId: existing._id,
    });
  }
  try {
    const existing = await previous();
    if (existing) return existingResponse(existing);
    // One MongoDB document stores the transaction and receipt together atomically.
    const transaction = await Transaction.create({
      ...entry.value,
      user: req.userId,
      receipt: { ...receipt.value, uploadId, submissionHash: hash },
    });
    res
      .status(201)
      .json({
        message: "Document and transaction saved.",
        transactionId: transaction._id,
      });
  } catch (error) {
    if (error.code === 11000) {
      try {
        const existing = await previous();
        if (existing) return existingResponse(existing);
      } catch (lookupError) {
        return next(lookupError);
      }
    }
    next(error);
  }
}

export async function downloadDocument(req, res, next) {
  if (!validId(req.params.id))
    return res.status(400).json({ message: "Invalid document ID." });
  try {
    const entry = await Transaction.findOne({
      _id: req.params.id,
      user: req.userId,
      receipt: { $exists: true },
    }).select("receipt.name receipt.mimeType +receipt.data");
    if (!entry?.receipt)
      return res.status(404).json({ message: "Document not found." });
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Content-Security-Policy", "sandbox");
    res.attachment(entry.receipt.name);
    res.type(entry.receipt.mimeType);
    res.send(Buffer.from(entry.receipt.data));
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req, res, next) {
  if (!validId(req.params.id))
    return res.status(400).json({ message: "Invalid document ID." });
  try {
    const entry = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, receipt: { $exists: true } },
      { $unset: { receipt: 1 } },
    );
    if (!entry) return res.status(404).json({ message: "Document not found." });
    res.json({ message: "Attachment removed. Its transaction remains saved." });
  } catch (error) {
    next(error);
  }
}
