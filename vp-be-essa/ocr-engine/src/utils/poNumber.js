import { coerceNull } from "../extractors/utils.js";

const PO_DIGIT_PATTERN = /4203\d{6}/;
const ESSA_PO_EXACT_RE = /^4203\d{6}$/;

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Parse a SAP-style PO number from free text. Returns digits only or null.
 * @param {unknown} value
 */
export function parsePoNumber(value) {
  const text = coerceNull(value);
  if (!text) return null;

  const digitMatch = text.match(PO_DIGIT_PATTERN);
  if (digitMatch) return digitMatch[0];

  const labeledMatch = text.match(/\bPO\s*[:#.]?\s*([0-9][0-9./\-\s]{6,}[0-9])/i);
  if (labeledMatch?.[1]) {
    const digits = labeledMatch[1].replace(/\D/g, "");
    const sap = digits.match(PO_DIGIT_PATTERN);
    // Ticket / confirm / e-ticket numbers are also 10 digits. Only SAP 4203xxxxxx is a PO.
    if (sap) return sap[0];
  }

  return null;
}

/** True when the value is an ESSA SAP PO (4203 + 6 digits), not a ticket number. */
export function isEssaPoNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return ESSA_PO_EXACT_RE.test(digits);
}

function getHeaderValue(header, keys) {
  for (const key of keys) {
    const value = coerceNull(header?.[key]);
    if (value != null) return value;
  }
  return null;
}

const PO_FIELD_NAME_HINTS = [
  "ponumber",
  "pono",
  "contractorder",
  "nomorkontrak",
  "purchaseorder",
  "purchaseorderno",
];

const INVOICE_PO_HEADER_KEYS = [
  "poNumber",
  "PO Number",
  "PO No",
  "PO No.",
  "PO NUMBER",
  "contractOrderNo",
  "Contract Order No",
  "contract order no",
  "purchaseOrder",
  "Purchase Order",
];

const INVOICE_PO_FIELD_HINTS = [
  "ponumber",
  "pono",
  "contractorder",
  "contractorderno",
  "purchaseorder",
  "purchaseorderno",
];

function findPoInHeader(header) {
  const fromExact = parsePoNumber(
    getHeaderValue(header, [
      "poNumber",
      "PO Number",
      "PO No",
      "PO No.",
      "PO NUMBER",
      "Nomor Kontrak",
      "contractOrderNo",
      "Contract Order No",
      "purchaseOrder",
      "Purchase Order",
    ]),
  );
  if (fromExact) return fromExact;

  for (const [key, value] of Object.entries(header || {})) {
    const normalized = normalizeKey(key);
    if (
      normalized.includes("ponumber") ||
      normalized === "pono" ||
      normalized.includes("purchaseorderno") ||
      normalized.includes("purchaseordernumber")
    ) {
      const parsed = parsePoNumber(value);
      if (parsed) return parsed;
    }
  }

  for (const value of Object.values(header || {})) {
    const parsed = parsePoNumber(value);
    if (parsed) return parsed;
  }

  return null;
}

function fieldKey(field) {
  return normalizeKey(field?.name || field?.label || "");
}

function findPoInFields(fields) {
  for (const field of fields || []) {
    const name = fieldKey(field);
    if (
      !PO_FIELD_NAME_HINTS.some((hint) => name.includes(hint)) &&
      !name.includes("ponumber") &&
      name !== "pono"
    ) {
      continue;
    }

    const parsed = parsePoNumber(field?.value);
    if (parsed) return parsed;
  }

  for (const field of fields || []) {
    const name = fieldKey(field);
    if (name.includes("requisition") || name.includes("date") || name.includes("vendor")) {
      continue;
    }
    const parsed = parsePoNumber(field?.value);
    if (parsed) return parsed;
  }

  return null;
}

function findPoInRawExtraction(extraction) {
  const serialized = JSON.stringify({
    header: extraction?.header || {},
    fields: extraction?.fields || [],
    summary: extraction?.summary || null,
  });
  return parsePoNumber(serialized);
}

/**
 * PO on invoices only when a labeled Contract Order / PO field is present.
 * Non-PO invoices (travel, ticket, no contract block) must return null.
 * @param {object} extraction
 */
export function extractInvoicePoNumber(extraction) {
  const header = extraction?.header || {};

  const fromHeader = parsePoNumber(getHeaderValue(header, INVOICE_PO_HEADER_KEYS));
  if (fromHeader) return fromHeader;

  for (const field of extraction?.fields || []) {
    const name = normalizeKey(field?.name);
    if (!INVOICE_PO_FIELD_HINTS.some((hint) => name.includes(hint))) continue;

    const parsed = parsePoNumber(field.value);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Purchase order pages — read PO number from header block and labeled fields.
 * Broader than invoice rules because a real PO always has a PO number on-page.
 * @param {object} extraction
 */
export function extractPurchaseOrderPoNumber(extraction) {
  const fromHeader = findPoInHeader(extraction?.header);
  if (fromHeader) return fromHeader;

  const fromFields = findPoInFields(extraction?.fields);
  if (fromFields) return fromFields;

  const fromLineItems = parsePoNumber(
    JSON.stringify((extraction?.lineItems || []).slice(0, 2)),
  );
  if (fromLineItems) return fromLineItems;

  return findPoInRawExtraction(extraction);
}

/**
 * Extract PO number printed on THIS document only (header + labeled fields).
 * Does not infer from line items, service titles, or other bundle documents.
 * @param {object} extraction
 */
export function extractPoNumberFromDocument(extraction) {
  const fromHeader = findPoInHeader(extraction?.header);
  if (fromHeader) return fromHeader;

  return findPoInFields(extraction?.fields);
}
