import test from "node:test";
import assert from "node:assert/strict";
import { validateReceipt, validMonth, MAX_RECEIPT_BYTES } from "../src/utils/validateReceipt.js";
const file = (data, name = "bill.pdf") => ({ name, base64: data.toString("base64") });
test("PDF bytes are recognised and filenames are sanitised", () => {
  const result = validateReceipt(file(Buffer.from("%PDF-1.4\n test"), "../../bill\r\n.pdf"));
  assert.equal(result.value.mimeType, "application/pdf");
  assert.ok(!/[\r\n/\\]/.test(result.value.name));
});
test("PNG and JPEG use their file signatures rather than the claimed name", () => {
  const png = Buffer.from([137,80,78,71,13,10,26,10,0]);
  assert.equal(validateReceipt(file(png, "wrong.exe")).value.mimeType, "image/png");
  assert.ok(validateReceipt(file(png, "wrong.exe")).value.name.endsWith(".png"));
  assert.equal(validateReceipt(file(Buffer.from([255,216,255,224]))).value.mimeType, "image/jpeg");
});
test("unsupported contents and malformed base64 are rejected", () => {
  for (const input of [null, { name: "a", base64: "!!!!" }, { name: "a", base64: "abcd=" }, file(Buffer.from("<script>bad</script>"))]) assert.ok(validateReceipt(input).error);
});
test("files at the limit are accepted and larger files rejected", () => {
  const buffer = Buffer.alloc(MAX_RECEIPT_BYTES); buffer.write("%PDF-");
  assert.equal(validateReceipt(file(buffer)).value.size, MAX_RECEIPT_BYTES);
  assert.ok(validateReceipt(file(Buffer.concat([buffer, Buffer.from("x")]))).error);
});
test("months are validated before querying records", () => {
  assert.ok(validMonth("2026-10"));
  for (const month of ["2026-13", "2026-00", "0000-01", "2026-1", "anything", {}, null]) assert.equal(validMonth(month), false);
});
