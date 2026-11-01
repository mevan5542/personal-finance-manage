import { buildTransactionQuery } from "../utils/buildTransactionQuery.js";
import Transaction from "../models/Transaction.js";
import { validateTransaction } from "../utils/validateTransaction.js";

export async function createTransaction(req, res, next) {
  const result = validateTransaction(req.body);
  if (result.error) return res.status(400).json({ message: result.error });
  try {
    await Transaction.create({ ...result.value, user: req.userId });
    return res.status(201).json({ message: "Transaction saved." });
  } catch (error) {
    next(error);
  }
}

// PUT replaces all editable fields; ownership always comes from the session.
export async function updateTransaction(req, res, next) {
  const { id } = req.params;
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    return res.status(400).json({ message: "Invalid transaction ID." });
  }
  const result = validateTransaction(req.body);
  if (result.error) return res.status(400).json({ message: result.error });
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, user: req.userId },
      { $set: result.value },
      { new: true, runValidators: true },
    );
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }
    return res.status(200).json({ message: "Transaction updated." });
  } catch (error) {
    next(error);
  }
}

export async function getTransactions(req, res, next) {
  const parsed = buildTransactionQuery(req.query, req.userId);
  if (parsed.error) return res.status(400).json({ message: parsed.error });
  const { filter, sort, limit } = parsed;
  let page = parsed.page;
  const fields = {
    type: 1,
    amountCents: 1,
    category: 1,
    description: 1,
    date: 1,
  };
  try {
    // All three branches use the same matching records. Only the list is paginated.
    const [result] = await Transaction.aggregate([
      { $match: filter },
      {
        $facet: {
          transactions: [
            { $sort: sort },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: fields },
          ],
          count: [{ $count: "total" }],
          categoryTotals: [
            {
              $group: {
                _id: { type: "$type", category: "$category" },
                amountCents: { $sum: "$amountCents" },
              },
            },
            { $sort: { amountCents: -1, "_id.category": 1 } },
          ],
        },
      },
    ]);
    const total = result.count[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    let transactions = result.transactions;
    // Deleting the last item on a page should return the previous valid page.
    if (page > totalPages) {
      page = totalPages;
      transactions =
        total === 0
          ? []
          : await Transaction.find(filter)
              .sort(sort)
              .skip((page - 1) * limit)
              .limit(limit)
              .select(fields)
              .lean();
    }
    const breakdown = { income: [], expense: [] };
    let incomeCents = 0;
    let expenseCents = 0;
    for (const item of result.categoryTotals) {
      const entry = {
        category: item._id.category,
        amountCents: item.amountCents,
      };
      if (item._id.type === "income") {
        breakdown.income.push(entry);
        incomeCents += item.amountCents;
      } else if (item._id.type === "expense") {
        breakdown.expense.push(entry);
        expenseCents += item.amountCents;
      }
    }
    return res.json({
      transactions,
      summary: {
        incomeCents,
        expenseCents,
        balanceCents: incomeCents - expenseCents,
      },
      breakdown,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransaction(req, res, next) {
  const { id } = req.params;
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    return res.status(400).json({ message: "Invalid transaction ID." });
  }
  try {
    const transaction = await Transaction.findOne({ _id: id, user: req.userId })
      .select(
        "type amountCents category description date createdAt updatedAt receipt.name",
      )
      .lean();
    if (!transaction)
      return res.status(404).json({ message: "Transaction not found." });
    return res.json({ transaction });
  } catch (error) {
    next(error);
  }
}

export async function deleteTransaction(req, res, next) {
  const { id } = req.params;

  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    return res.status(400).json({
      message: "Invalid transaction ID.",
    });
  }

  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      user: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      message: "Transaction deleted.",
    });
  } catch (error) {
    next(error);
  }
}
