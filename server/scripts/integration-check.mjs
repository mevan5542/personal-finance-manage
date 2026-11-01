// Runs against a fresh temporary database on LOCAL MongoDB only.
// It never reads your application's .env or uses its database name.
import mongoose from "mongoose";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const database = `finance_check_${randomBytes(8).toString("hex")}`;
const uri = `mongodb://127.0.0.1:27017/${database}`;
const serverDirectory = fileURLToPath(new URL("../", import.meta.url));
const listener = createServer(); listener.listen(0, "127.0.0.1"); await once(listener, "listening");
const port = listener.address().port; await new Promise((resolve) => listener.close(resolve));
const origin = "http://localhost:5173";
const password = randomBytes(16).toString("hex");
let child;
try {
  console.log("Checking local MongoDB using a new temporary test database...");
  child = spawn(process.execPath, ["src/server.js"], { cwd: serverDirectory,
    env: { ...process.env, MONGODB_URI: uri, PORT: String(port), CLIENT_ORIGIN: origin,
      SESSION_SECRET: randomBytes(32).toString("hex"), NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error("Test server startup timed out. Check that local MongoDB is running.")), 20000);
    child.stdout.on("data", (chunk) => { output += chunk; if (output.includes("Server running at")) { clearTimeout(timer); resolve(); } });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Test server exited (${code}). ${output}`)); });
  });
  const base = `http://127.0.0.1:${port}/api`;
  async function request(path, { method = "GET", body, cookie } = {}) {
    const response = await fetch(base + path, { method, headers: { Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json(), cookie: response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ") };
  }
  async function account(email) {
    assert.equal((await request("/auth/register", { method: "POST", body: { name: "Test User", email, password } })).status, 201);
    const result = await request("/auth/login", { method: "POST", body: { email, password } });
    assert.equal(result.status, 200); return result.cookie;
  }
  const a = await account("a@finance.example"), b = await account("b@finance.example");
  const entry = { type: "expense", amount: "150", category: "Food", description: "Integration test", date: "2026-10-28" };
  const bytes = Buffer.from("%PDF-1.4\nTest fixture\n%%EOF");
  const payload = { ...entry, uploadId: randomUUID(), file: { name: "test.pdf", base64: bytes.toString("base64") } };
  assert.equal((await request("/documents", { method: "POST", body: payload })).status, 401);
  let result = await request("/documents", { method: "POST", body: payload, cookie: a });
  assert.equal(result.status, 201, JSON.stringify(result.data)); const id = result.data.transactionId;
  assert.equal((await request("/documents", { method: "POST", body: payload, cookie: a })).status, 200);
  assert.equal((await request("/transactions", { cookie: a })).data.pagination.total, 1);
  assert.equal((await request("/documents", { method: "POST", body: { ...payload, amount: "200" }, cookie: a })).status, 409);
  const listed = await request("/documents?month=2026-10", { cookie: a });
  assert.equal(listed.data.documents.length, 1); assert.equal(listed.data.documents[0].receipt.data, undefined);
  assert.equal((await request("/documents", { cookie: b })).data.documents.length, 0);
  assert.equal((await request(`/documents/${id}/file`, { cookie: b })).status, 404);
  assert.equal((await request(`/documents/${id}`, { method: "DELETE", cookie: b })).status, 404);
  const download = await fetch(`${base}/documents/${id}/file`, { headers: { Cookie: a } });
  assert.equal(download.status, 200); assert.match(download.headers.get("content-disposition"), /attachment/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  assert.equal((await request(`/transactions/${id}`, { method: "PUT", body: { ...entry, amount: "250" }, cookie: a })).status, 200);
  assert.equal((await request("/documents", { cookie: a })).data.documents[0].amountCents, 25000);
  assert.equal((await request(`/transactions/${id}`, { method: "PUT", body: entry, cookie: b })).status, 404);
  assert.equal((await request("/budgets", { method: "PUT", body: { month: "2026-10", category: "Overall", amount: "200" }, cookie: a })).status, 200);
  result = await request("/budgets?month=2026-10", { cookie: a });
  assert.equal(result.data.summary.expenseCents, 25000); assert.equal(result.data.budgets[0].spentCents, 25000);
  assert.equal(result.data.budgets[0].limitCents, 20000); const budgetId = result.data.budgets[0]._id;
  assert.equal((await request("/budgets?month=2026-10", { cookie: b })).data.budgets.length, 0);
  assert.equal((await request(`/budgets/${budgetId}`, { method: "DELETE", cookie: b })).status, 404);
  await request("/budgets", { method: "PUT", body: { month: "2026-10", category: "Overall", amount: "500" }, cookie: a });
  assert.equal((await request("/budgets?month=2026-10", { cookie: a })).data.budgets.length, 1);
  assert.equal((await request(`/documents/${id}`, { method: "DELETE", cookie: a })).status, 200);
  assert.equal((await request("/transactions", { cookie: a })).data.pagination.total, 1);
  assert.equal((await request("/documents", { cookie: a })).data.documents.length, 0);
  result = await request("/documents", { method: "POST", body: { ...payload, uploadId: randomUUID() }, cookie: a });
  assert.equal(result.status, 201);
  await request(`/transactions/${result.data.transactionId}`, { method: "DELETE", cookie: a });
  assert.equal((await request("/documents", { cookie: a })).data.documents.length, 0);
  assert.equal((await request("/auth/logout", { method: "POST", cookie: a })).status, 200);
  assert.equal((await request("/transactions", { cookie: a })).status, 401);
  console.log("PASS: real MongoDB uploads, retry protection, downloads, ownership, linked updates, budgets, deletion and logout.");
} catch (error) {
  console.error("Integration check failed:", error.message); process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
  let connection;
  try {
    connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
    await connection.dropDatabase(); console.log("Removed the temporary test database.");
  } catch { console.error(`Could not clean up temporary database ${database}; your application database was not used.`); }
  finally { if (connection) await connection.close(); }
}
