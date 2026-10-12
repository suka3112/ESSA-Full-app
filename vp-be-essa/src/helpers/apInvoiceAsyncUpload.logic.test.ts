import assert from "assert";
import path from "path";
import {
  assertFileSignature,
  assertPathInsideRoot,
  classifyExtractResult,
  heartbeatIsAlive,
  placeholderInvoiceNo,
  placeholderWorkflow,
  storedFileName,
} from "./apInvoiceAsyncUpload.logic";

const pdf = Buffer.concat([Buffer.from("%PDF-1.4"), Buffer.alloc(8)]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const zip = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.alloc(8),
]);

assert.doesNotThrow(() => assertFileSignature(pdf, "invoice.pdf"));
assert.throws(() => assertFileSignature(png, "invoice.pdf"), /not a valid PDF/);
assert.throws(() => assertFileSignature(Buffer.alloc(2), "a.pdf"), /too small/);
assert.throws(() => assertFileSignature(pdf, "notes.csv"), /does not match a CSV/);
assert.doesNotThrow(() => assertFileSignature(Buffer.from("a,b\n1,2\n"), "rows.csv"));
assert.doesNotThrow(() => assertFileSignature(zip, "bundle.zip"));
assert.doesNotThrow(() => assertFileSignature(zip, "book.xlsx"));

assert.strictEqual(storedFileName(42, "Vendor Invoice.pdf"), "42.pdf");
assert.strictEqual(storedFileName(7, "noext"), "7.pdf");
assert.throws(() => storedFileName(0, "a.pdf"));

const root = path.resolve("uploads", "ap-invoices");
const inside = path.join(root, "15.pdf");
assert.strictEqual(assertPathInsideRoot(root, inside), path.resolve(inside));
assert.throws(
  () => assertPathInsideRoot(root, path.join(root, "..", "secrets.env")),
  /outside the upload directory/,
);

assert.strictEqual(placeholderInvoiceNo("INV-100.pdf"), "INV-100");
assert.strictEqual(placeholderInvoiceNo(""), "upload");
assert.strictEqual(placeholderInvoiceNo(`${"a".repeat(80)}.pdf`).length, 50);
assert.strictEqual(placeholderWorkflow("po"), "PO");
assert.strictEqual(placeholderWorkflow("NON_PO"), "NON_PO");
assert.strictEqual(placeholderWorkflow("AUTO"), "PENDING");
assert.strictEqual(placeholderWorkflow(null), "PENDING");

assert.deepStrictEqual(
  classifyExtractResult({ success: true, primaryDocumentId: 9, status: "extracted" }),
  { action: "complete" },
);
assert.strictEqual(
  classifyExtractResult({
    success: false,
    status: "missing_mandatory_documents",
    message: "Tax Invoice is required.",
    primaryDocumentId: null,
  }).action,
  "fail",
);
assert.strictEqual(
  classifyExtractResult({
    success: false,
    status: "duplicate_invoice",
    message: "Invoice 1 already exists.",
  }).action,
  "fail",
);
assert.strictEqual(
  classifyExtractResult({
    success: false,
    status: "ocr_unavailable",
    message: "OCR is down",
  }).action,
  "retry",
);
assert.strictEqual(
  classifyExtractResult({ success: true, primaryDocumentId: null, status: "extracted" })
    .action,
  "retry",
);

const now = 1_000_000;
assert.strictEqual(heartbeatIsAlive(now - 1000, now), true);
assert.strictEqual(heartbeatIsAlive(now - 30_000, now), false);
assert.strictEqual(heartbeatIsAlive(null, now), false);

console.log("apInvoiceAsyncUpload.logic.test: ok");
