export const categories = {
  income: ["Salary", "Freelance", "Gift", "Other"],
  expense: [
    "Food",
    "Transport",
    "Housing",
    "Bills",
    "Education",
    "Health",
    "Entertainment",
    "Other",
  ],
};

// Shared by create and update so both enforce the same rules.
export function validateTransaction(body) {
  const { type, amount, category, description = "", date } = body ?? {};

  if (type !== "income" && type !== "expense") {
    return {
      error: "Choose income or expense.",
    };
  }

  // Accept a decimal string with at most two decimal places.
  if (typeof amount !== "string" || !/^\d{1,9}(\.\d{1,2})?$/.test(amount)) {
    return {
      error: "Enter a valid amount with at most two decimal places.",
    };
  }

  const [rupees, cents = ""] = amount.split(".");
  const amountCents = Number(rupees) * 100 + Number(cents.padEnd(2, "0"));

  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > 99999999999
  ) {
    return {
      error: "Amount must be between LKR 0.01 and 999,999,999.99.",
    };
  }

  if (typeof category !== "string" || !categories[type].includes(category)) {
    return {
      error: "Choose a valid category for this transaction type.",
    };
  }

  if (typeof description !== "string" || description.length > 200) {
    return {
      error: "Description must contain at most 200 characters.",
    };
  }

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      error: "Choose a valid date.",
    };
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return {
      error: "Choose a real calendar date.",
    };
  }

  return {
    value: {
      type,
      amountCents,
      category,
      description: description.trim(),
      date,
    },
  };
}
