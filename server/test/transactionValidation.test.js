import test from "node:test";
import assert from "node:assert/strict";
import { buildTransactionQuery } from "../src/utils/buildTransactionQuery.js";
import { validateTransaction } from "../src/utils/validateTransaction.js";

const valid = { type: "expense", amount: "1250.50", category: "Food", description: " Lunch ", date: "2026-10-28" };

test("money is converted to integer cents and description is trimmed", () => {
  const result = validateTransaction(valid);
  assert.equal(result.value.amountCents, 125050);
  assert.equal(result.value.description, "Lunch");
});
test("the smallest and largest allowed amounts are accepted", () => {
  assert.equal(validateTransaction({ ...valid, amount: "0.01" }).value.amountCents, 1);
  assert.equal(validateTransaction({ ...valid, amount: "999999999.99" }).value.amountCents, 99999999999);
});
test("invalid amounts are rejected", () => {
  for (const amount of ["0", "-1", "1.001", "1e3", "1000000000", 10, {}, ""]) {
    assert.ok(validateTransaction({ ...valid, amount }).error, JSON.stringify(amount));
  }
});
test("category must belong to the transaction type", () => {
  assert.ok(validateTransaction({ ...valid, type: "income" }).error);
  assert.ok(validateTransaction({ ...valid, type: "income", category: "Salary" }).value);
});
test("transaction dates must be real calendar dates", () => {
  assert.ok(validateTransaction({ ...valid, date: "2026-02-30" }).error);
  assert.ok(validateTransaction({ ...valid, date: "2028-02-29" }).value);
});
test("missing input, long descriptions and unknown types are rejected", () => {
  assert.ok(validateTransaction(null).error);
  assert.ok(validateTransaction({ ...valid, description: "x".repeat(201) }).error);
  assert.ok(validateTransaction({ ...valid, type: "transfer" }).error);
});
test("only editable fields are returned for saving", () => {
  const result = validateTransaction({ ...valid, user: "another-user", _id: "changed", amountCents: 1 });
  assert.deepEqual(Object.keys(result.value).sort(), ["amountCents", "category", "date", "description", "type"]);
});
test("default listing is scoped to the authenticated user", () => {
  const result = buildTransactionQuery({}, "owner-a");
  assert.deepEqual(result.filter, { user: "owner-a" });
  assert.equal(result.page, 1);
  assert.equal(result.limit, 10);
});
test("filters combine type, category and inclusive dates", () => {
  const result = buildTransactionQuery({ type: "expense", category: "Food", from: "2026-10-01", to: "2026-10-31" }, "owner-a");
  assert.deepEqual(result.filter, { user: "owner-a", type: "expense", category: "Food", date: { $gte: "2026-10-01", $lte: "2026-10-31" } });
});
test("search treats regex characters literally and ignores case", () => {
  const q = "Lunch (work) + [tea].*";
  const result = buildTransactionQuery({ q }, "owner-a");
  const condition = result.filter.$or[0].description;
  const regex = new RegExp(condition.$regex, condition.$options);
  assert.ok(regex.test(q.toLowerCase()));
  assert.equal(regex.test("Lunch work with tea"), false);
  assert.equal(result.filter.$or.length, 2);
});
test("filter values cannot be arrays or MongoDB query objects", () => {
  for (const query of [{ type: { $ne: "income" } }, { q: ["one", "two"] }, { user: "other-user" }, { "type[$ne]": "income" }]) {
    assert.ok(buildTransactionQuery(query, "owner-a").error);
  }
});
test("invalid types, categories, sorts and oversized search are rejected", () => {
  for (const query of [{ type: "unknown" }, { type: "income", category: "Food" }, { category: "unknown" }, { sort: "constructor" }, { type: "toString" }, { q: "x".repeat(101) }]) {
    assert.ok(buildTransactionQuery(query, "owner-a").error);
  }
});
test("invalid and reversed filter dates are rejected", () => {
  for (const query of [{ from: "2026-02-30" }, { to: "tomorrow" }, { from: "2026-10-20", to: "2026-10-01" }]) {
    assert.ok(buildTransactionQuery(query, "owner-a").error);
  }
});
test("page and page size are bounded whole numbers", () => {
  for (const query of [{ page: "0" }, { page: "-1" }, { page: "1.5" }, { page: "1000000" }, { limit: "1000" }, { limit: "0" }]) {
    assert.ok(buildTransactionQuery(query, "owner-a").error);
  }
  const result = buildTransactionQuery({ page: "3", limit: "5" }, "owner-a");
  assert.equal(result.page, 3);
  assert.equal(result.limit, 5);
});
test("all supported sorts include an ID tie breaker", () => {
  for (const sort of ["date-desc", "date-asc", "amount-desc", "amount-asc"]) {
    const result = buildTransactionQuery({ sort }, "owner-a");
    assert.ok(result.sort._id === 1 || result.sort._id === -1);
  }
});
