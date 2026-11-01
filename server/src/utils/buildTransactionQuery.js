import { categories } from "./validateTransaction.js";

const sortOptions = {
  "date-desc": { date: -1, createdAt: -1, _id: -1 },
  "date-asc": { date: 1, createdAt: 1, _id: 1 },
  "amount-desc": { amountCents: -1, date: -1, _id: -1 },
  "amount-asc": { amountCents: 1, date: -1, _id: -1 },
};
const allowedKeys = new Set([
  "q",
  "type",
  "category",
  "from",
  "to",
  "sort",
  "page",
  "limit",
]);

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

// Validate URL query strings before constructing a MongoDB query.
export function buildTransactionQuery(query, userId) {
  for (const [key, value] of Object.entries(query)) {
    if (!allowedKeys.has(key) || typeof value !== "string") {
      return { error: "Invalid filter parameters." };
    }
  }
  const q = (query.q || "").trim();
  const type = query.type || "";
  const category = query.category || "";
  const from = query.from || "";
  const to = query.to || "";
  const sortName = query.sort || "date-desc";
  const pageText = query.page || "1";
  const limitText = query.limit || "10";

  if (q.length > 100)
    return { error: "Search must contain at most 100 characters." };
  if (type && !Object.hasOwn(categories, type))
    return { error: "Choose a valid transaction type." };
  const availableCategories = type
    ? categories[type]
    : [...categories.income, ...categories.expense];
  if (category && !availableCategories.includes(category)) {
    return { error: "Choose a valid category for the selected type." };
  }
  if ((from && !isCalendarDate(from)) || (to && !isCalendarDate(to))) {
    return { error: "Choose real calendar dates for the date range." };
  }
  if (from && to && from > to)
    return { error: "The start date must be on or before the end date." };
  if (!Object.hasOwn(sortOptions, sortName))
    return { error: "Choose a valid sorting option." };
  if (!/^[1-9]\d{0,5}$/.test(pageText))
    return { error: "Page must be between 1 and 999999." };
  if (!["5", "10", "20", "50"].includes(limitText))
    return { error: "Page size must be 5, 10, 20 or 50." };

  // The user ID always comes from authentication, never from URL parameters.
  const filter = { user: userId };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  if (q) {
    // Escape regex characters so a search like "lunch (work)" is literal text.
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { description: { $regex: escaped, $options: "i" } },
      { category: { $regex: escaped, $options: "i" } },
    ];
  }
  return {
    filter,
    sort: sortOptions[sortName],
    page: Number(pageText),
    limit: Number(limitText),
  };
}
