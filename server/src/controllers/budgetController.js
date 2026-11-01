import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import {
  categories,
  validateTransaction,
} from "../utils/validateTransaction.js";
import { validMonth } from "../utils/validateReceipt.js";

export async function getBudgets(req, res, next) {
  const { month } = req.query;
  if (!validMonth(month))
    return res.status(400).json({ message: "Choose a valid month." });
  try {
    const [budgets, groups] = await Promise.all([
      Budget.find({ user: req.userId, month }).sort({ category: 1 }).lean(),
      Transaction.aggregate([
        {
          $match: {
            user: req.userId,
            date: { $gte: `${month}-01`, $lte: `${month}-31` },
          },
        },
        {
          $group: {
            _id: { type: "$type", category: "$category" },
            total: { $sum: "$amountCents" },
          },
        },
      ]),
    ]);
    let incomeCents = 0,
      expenseCents = 0;
    const expenses = {};
    for (const group of groups) {
      if (group._id.type === "income") incomeCents += group.total;
      else {
        expenseCents += group.total;
        expenses[group._id.category] = group.total;
      }
    }
    res.json({
      month,
      summary: {
        incomeCents,
        expenseCents,
        balanceCents: incomeCents - expenseCents,
      },
      spending: Object.entries(expenses)
        .map(([category, amountCents]) => ({ category, amountCents }))
        .sort((a, b) => b.amountCents - a.amountCents),
      budgets: budgets.map((budget) => ({
        ...budget,
        spentCents:
          budget.category === "Overall"
            ? expenseCents
            : expenses[budget.category] || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function saveBudget(req, res, next) {
  const { month, category, amount } = req.body ?? {};
  if (
    !validMonth(month) ||
    !["Overall", ...categories.expense].includes(category)
  ) {
    return res
      .status(400)
      .json({ message: "Choose a valid month and budget category." });
  }
  const result = validateTransaction({
    type: "expense",
    category: "Food",
    amount,
    date: `${month}-01`,
  });
  if (result.error) return res.status(400).json({ message: result.error });
  const filter = { user: req.userId, month, category };
  try {
    await Budget.findOneAndUpdate(
      filter,
      { $set: { limitCents: result.value.amountCents } },
      { upsert: true, runValidators: true },
    );
    res.json({ message: "Budget saved." });
  } catch (error) {
    // Concurrent first saves may race on the unique index; update the existing budget.
    if (error.code === 11000) {
      try {
        await Budget.updateOne(
          filter,
          { $set: { limitCents: result.value.amountCents } },
          { runValidators: true },
        );
        return res.json({ message: "Budget saved." });
      } catch (retryError) {
        return next(retryError);
      }
    }
    next(error);
  }
}

export async function deleteBudget(req, res, next) {
  if (!/^[a-fA-F0-9]{24}$/.test(req.params.id))
    return res.status(400).json({ message: "Invalid budget ID." });
  try {
    const result = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!result) return res.status(404).json({ message: "Budget not found." });
    res.json({ message: "Budget removed. Transactions are unchanged." });
  } catch (error) {
    next(error);
  }
}
