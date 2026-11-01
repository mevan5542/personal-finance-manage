// HTTP handlers are tested with model doubles; these do not replace a live MongoDB check.
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomBytes, randomUUID } from "node:crypto";
import Transaction from "../src/models/Transaction.js";
import Budget from "../src/models/Budget.js";
import User from "../src/models/User.js";
import { requireAuth } from "../src/middleware/requireAuth.js";
import documentRoutes from "../src/routes/documentRoutes.js";
import budgetRoutes from "../src/routes/budgetRoutes.js";

function matches(document, filter) {
  return Object.entries(filter).every(([key, value]) => {
    const actual = key.split(".").reduce((o, part) => o?.[part], document);
    if (value && typeof value === "object") {
      if ("$exists" in value) return (actual !== undefined) === value.$exists;
      if ("$gte" in value) return actual >= value.$gte && actual <= value.$lte;
    }
    return String(actual) === String(value);
  });
}
function query(value) {
  return { sort() { return this; }, skip(n) { if (Array.isArray(value)) value = value.slice(n); return this; },
    limit(n) { if (Array.isArray(value)) value = value.slice(0,n); return this; }, select() { return this; },
    lean() { return Promise.resolve(value); }, then(resolve, reject) { return Promise.resolve(value).then(resolve,reject); } };
}

test("document and budget HTTP flows (model doubles)", async (t) => {
  const rows = [], limits = [];
  User.findById = (id) => query(["owner-a", "owner-b"].includes(id) ? { _id: id } : null);
  Transaction.findOne = (filter) => query(rows.find((row) => matches(row,filter)) || null);
  Transaction.find = (filter) => query(rows.filter((row) => matches(row,filter)));
  Transaction.countDocuments = async (filter) => rows.filter((row) => matches(row,filter)).length;
  Transaction.create = async (data) => { const row = { ...data, _id: randomBytes(12).toString("hex") }; rows.push(row); return row; };
  Transaction.findOneAndUpdate = async (filter, update) => { const row = rows.find((item) => matches(item,filter)); if (row && update.$unset?.receipt) delete row.receipt; return row || null; };
  Transaction.aggregate = async (pipeline) => {
    const groups = new Map();
    for (const row of rows.filter((r) => matches(r,pipeline[0].$match))) {
      const key = `${row.type}/${row.category}`;
      if (!groups.has(key)) groups.set(key, { _id: { type: row.type, category: row.category }, total: 0 });
      groups.get(key).total += row.amountCents;
    }
    return [...groups.values()];
  };
  Budget.find = (filter) => query(limits.filter((row) => matches(row,filter)));
  Budget.findOneAndUpdate = async (filter, update) => {
    let row = limits.find((r) => matches(r,filter));
    if (!row) { row = { ...filter, _id: randomBytes(12).toString("hex") }; limits.push(row); }
    Object.assign(row,update.$set); return row;
  };
  Budget.findOneAndDelete = async (filter) => { const index = limits.findIndex((row) => matches(row,filter)); return index < 0 ? null : limits.splice(index,1)[0]; };
  const app = express();
  app.use((req,res,next) => { req.session = req.get("x-test-owner") ? { userId: req.get("x-test-owner") } : {}; next(); });
  app.use(requireAuth, express.json({ limit: "3mb" }));
  app.use("/documents", documentRoutes); app.use("/budgets", budgetRoutes);
  app.use((error,req,res,next) => { res.status(500).json({message:error.message}); });
  const server = app.listen(0,"127.0.0.1"); await new Promise((resolve) => server.once("listening",resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, owner="owner-a", method="GET", body) {
    const response = await fetch(base+path,{method,headers:{...(owner?{"x-test-owner":owner}:{}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
    return {status:response.status,data:await response.json()};
  }
  const bytes=Buffer.from("%PDF-1.4\nReceipt example\n%%EOF");
  const payload={type:"expense",amount:"150",category:"Food",date:"2026-10-28",description:"Lunch",uploadId:randomUUID(),file:{name:"bill.pdf",base64:bytes.toString("base64")}};
  let id, budgetId;
  await t.test("authentication is required", async () => { assert.equal((await request("/documents",null)).status,401); });
  await t.test("saving a document creates one owned transaction and retries do not duplicate", async () => {
    const first=await request("/documents","owner-a","POST",{...payload,user:"owner-b"}); assert.equal(first.status,201);id=first.data.transactionId;
    assert.equal(rows[0].user,"owner-a");assert.equal(rows[0].amountCents,15000);
    assert.equal((await request("/documents","owner-a","POST",payload)).status,200);assert.equal(rows.length,1);
    assert.equal((await request("/documents","owner-a","POST",{...payload,amount:"200"})).status,409);
  });
  await t.test("other users cannot list, download or remove the attachment", async () => {
    assert.equal((await request("/documents","owner-b")).data.documents.length,0);
    assert.equal((await request(`/documents/${id}/file`,"owner-b")).status,404);
    assert.equal((await request(`/documents/${id}`,"owner-b","DELETE")).status,404);
  });
  await t.test("download returns exact bytes as an attachment", async () => {
    const response=await fetch(`${base}/documents/${id}/file`,{headers:{"x-test-owner":"owner-a"}});
    assert.equal(response.status,200);assert.match(response.headers.get("content-disposition"),/attachment/);
    assert.equal(response.headers.get("x-content-type-options"),"nosniff");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
  });
  await t.test("month filter and invalid upload validation", async () => {
    assert.equal((await request("/documents?month=2026-11")).data.documents.length,0);
    assert.equal((await request("/documents?month=2026-13")).status,400);
    assert.equal((await request("/documents","owner-a","POST",{...payload,uploadId:randomUUID(),file:{name:"bad.pdf",base64:Buffer.from("not a PDF").toString("base64")}})).status,400);
  });
  await t.test("budgets use monthly spending and saving again updates the same limit", async () => {
    assert.equal((await request("/budgets","owner-a","PUT",{month:"2026-10",category:"Overall",amount:"100"})).status,200);
    let result=await request("/budgets?month=2026-10");assert.equal(result.data.summary.expenseCents,15000);assert.equal(result.data.budgets[0].spentCents,15000);budgetId=result.data.budgets[0]._id;
    await request("/budgets","owner-a","PUT",{month:"2026-10",category:"Overall",amount:"300"});
    result=await request("/budgets?month=2026-10");assert.equal(result.data.budgets.length,1);assert.equal(result.data.budgets[0].limitCents,30000);
  });
  await t.test("budgets cannot be read or removed by another user", async () => {
    assert.equal((await request("/budgets?month=2026-10","owner-b")).data.budgets.length,0);
    assert.equal((await request(`/budgets/${budgetId}`,"owner-b","DELETE")).status,404);
  });
  await t.test("removing an attachment keeps its transaction", async () => {
    assert.equal((await request(`/documents/${id}`,"owner-a","DELETE")).status,200);
    assert.equal(rows.length,1);assert.equal(rows[0].receipt,undefined);
    assert.equal((await request("/documents")).data.documents.length,0);
  });
});
