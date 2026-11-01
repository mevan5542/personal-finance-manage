import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
    uploadId: { type: String, required: true, select: false },
    submissionHash: { type: String, required: true, select: false },
  },
  { _id: false },
);

const transactionSchema = new mongoose.Schema(
  {
    receipt: { type: receiptSchema, default: undefined },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 1,
      max: 99999999999,
      validate: {
        validator: Number.isSafeInteger,
        message: "Amount must be a safe whole number of cents.",
      },
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
  },
  { timestamps: true },
);

transactionSchema.index({ user: 1, date: -1, createdAt: -1 });

transactionSchema.index(
  { user: 1, "receipt.uploadId": 1 },
  {
    unique: true,
    partialFilterExpression: { "receipt.uploadId": { $type: "string" } },
  },
);

export default mongoose.model("Transaction", transactionSchema);
