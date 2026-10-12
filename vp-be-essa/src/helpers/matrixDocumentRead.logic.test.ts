import assert from "assert";
import {
  categoryCandidatesFromBody,
  classifiedDocumentsFromBody,
  findUnreadDataPoints,
  type MatrixFieldSpec,
} from "./matrixDocumentRead.logic";

const invoiceVendor: MatrixFieldSpec = {
  documentCode: "INVOICE",
  documentName: "Invoice",
  dataPointCode: "DP_1_01",
  dataPointName: "Vendor name",
  fieldLabel: "Vendor name",
  extractionKey: null,
  matrixRef: "1.01",
};

const invoiceDate: MatrixFieldSpec = {
  documentCode: "INVOICE",
  documentName: "Invoice",
  dataPointCode: "DP_1_03",
  dataPointName: "Invoice date",
  fieldLabel: "Invoice date",
  extractionKey: null,
  matrixRef: "1.03",
};

const invoiceAmount: MatrixFieldSpec = {
  documentCode: "INVOICE",
  documentName: "Invoice",
  dataPointCode: "DP_1_08",
  dataPointName: "Invoice Amount",
  fieldLabel: "Invoice Amount",
  extractionKey: null,
  matrixRef: "1.08",
};

const fakturNumber: MatrixFieldSpec = {
  documentCode: "FAKTUR_PAJAK",
  documentName: "Faktur Pajak",
  dataPointCode: "DP_1_16",
  dataPointName: "Faktur Pajak number",
  fieldLabel: "Faktur Pajak number",
  extractionKey: "taxInvoiceNumber",
  matrixRef: "1.16",
};

const fieldsByDocumentCode = new Map<string, MatrixFieldSpec[]>([
  ["INVOICE", [invoiceVendor, invoiceDate, invoiceAmount]],
  ["FAKTUR_PAJAK", [fakturNumber]],
]);

const knownDocumentCodes = new Set(["INVOICE", "FAKTUR_PAJAK", "TIMESHEET"]);

const unread = findUnreadDataPoints({
  documents: [
    {
      type: "invoice",
      typeLabel: "A. Invoice",
      fields: {
        vendorName: "PT Example",
        dueDate: "2026-10-01",
        grandTotal: "1500000",
        totalAmount: "1000",
      },
      entries: {
        invoiceLineItems: [{ description: "Cement", quantity: "" }],
      },
    },
    {
      type: "faktur_pajak",
      typeLabel: "B. Tax Invoice (VAT)",
      fields: { taxInvoiceNumber: "" },
    },
    {
      type: "notice",
      typeLabel: "C. Notice",
      fields: { poNumber: "4500001" },
    },
  ],
  fieldsByDocumentCode,
  knownDocumentCodes,
  requirementByDocumentCode: new Map([
    ["INVOICE", "MANDATORY"],
    ["FAKTUR_PAJAK", "OPTIONAL"],
  ]),
});

assert.deepStrictEqual(
  unread.map((row) => `${row.documentCode || row.recognizedType}:${row.dataPointCode || row.reason}:${row.requirement}`),
  [
    "INVOICE:DP_1_03:MANDATORY",
    "FAKTUR_PAJAK:DP_1_16:OPTIONAL",
    "notice:DOCUMENT_TYPE_UNMAPPED:UNRESOLVED",
  ],
);

const amountKept = findUnreadDataPoints({
  documents: [
    {
      type: "invoice",
      fields: { vendorName: "PT Example", date: "2026-01-02", grandTotal: "1500000" },
    },
  ],
  fieldsByDocumentCode,
  knownDocumentCodes,
  requirementByDocumentCode: new Map(),
});
assert.deepStrictEqual(
  amountKept.map((row) => row.dataPointCode),
  [],
);

const unresolved = findUnreadDataPoints({
  documents: [{ type: "timesheet", typeLabel: "Timesheet", fields: {} }],
  fieldsByDocumentCode: new Map([
    ["TIMESHEET", [{
      documentCode: "TIMESHEET",
      documentName: "Timesheet",
      dataPointCode: "DP_4_01",
      dataPointName: "Worker name",
      fieldLabel: "Worker name",
      extractionKey: null,
      matrixRef: "4.01",
    }]],
  ]),
  knownDocumentCodes,
  requirementByDocumentCode: new Map([["TIMESHEET", "UNRESOLVED"]]),
});
assert.strictEqual(unresolved.length, 1);
assert.strictEqual(unresolved[0].requirement, "UNRESOLVED");
assert.strictEqual(unresolved[0].reason, "VALUE_NOT_FOUND");

const hinted = findUnreadDataPoints({
  documents: [],
  fieldsByDocumentCode,
  knownDocumentCodes,
  requirementByDocumentCode: new Map(),
  hintedDocumentType: "invoice",
});
assert.ok(hinted.some((row) => row.dataPointCode === "DP_1_01" && row.reason === "VALUE_NOT_FOUND"));

const none = findUnreadDataPoints({
  documents: [],
  fieldsByDocumentCode,
  knownDocumentCodes,
  requirementByDocumentCode: new Map(),
  hintedDocumentType: "not-a-document",
});
assert.strictEqual(none[0].reason, "NO_DOCUMENT_CLASSIFIED");

const fromPages = classifiedDocumentsFromBody({
  data: {
    documents: [],
    classification: {
      pages: [
        { page: 1, documentType: "invoice", categoryLabel: "A. Invoice" },
        { page: 2, documentType: "invoice", categoryLabel: "A. Invoice" },
        { page: 3, documentType: "faktur_pajak", categoryLabel: "B. Tax Invoice (VAT)" },
      ],
    },
  },
});
assert.deepStrictEqual(
  fromPages.map((row) => row.type),
  ["invoice", "faktur_pajak"],
);

const keyed = findUnreadDataPoints({
  documents: [{ type: "faktur_pajak", fields: { taxInvoiceNumber: "010.000-26.00000001" } }],
  fieldsByDocumentCode,
  knownDocumentCodes,
  requirementByDocumentCode: new Map([["FAKTUR_PAJAK", "MANDATORY"]]),
});
assert.deepStrictEqual(keyed, []);

assert.deepStrictEqual(
  categoryCandidatesFromBody({
    data: { invoiceCategoryCode: "CATERING", meta: { invoiceTypeName: "Catering" } },
  }),
  ["CATERING", "Catering"],
);
assert.deepStrictEqual(categoryCandidatesFromBody({}), []);

console.log("matrixDocumentRead.logic.test.ts passed");
