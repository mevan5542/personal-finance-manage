import mongoose from "mongoose";
import { categories } from "../utils/validateTransaction.js";
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: {
        type: String,
        required: true,
        match: /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/,
    },
    category: {
          type: String,
          required: true,
          enum: ["Overall", ...categories.expense],
    },
    limitCents: {
             type: Number,
             required: true,
             min: 1,
             max: 99999999999,
             validate: Number.isSafeInteger,
    },
  },
  { timestamps: true },
);
schema.index({ user: 1, month: 1, category: 1 }, { unique: true });
export default mongoose.model("Budget", schema);
