import { coerceNull } from "../extractors/utils.js";

const INVOICE_NO_ALIASES = [
  "invNo",
  "invoiceNumber",
  "invoice_no",
  "invoiceNo",
  "INVOICE NO",
  "Invoice No",
  "Invoice Number",
];

const NOTICE_REF_ALIASES = [
  "No",
  "No.",
  "documentNumber",
  "document_number",
  "receiptNumber",
  "kwitansiNo",
];

function findInHeaderOrFields(header, fields, aliases) {
  for (const key of aliases) {
    const value = coerceNull(header?.[key]);
    if (value) return value;
  }

  const aliasSet = new Set(aliases.map((alias) => alias.toLowerCase()));
  for (const [key, value] of Object.entries(header || {})) {
    if (aliasSet.has(key.toLowerCase()) && coerceNull(value)) {
      return coerceNull(value);
    }
  }

  for (const field of fields || []) {
    const name = String(field?.name || "").toLowerCase();
    if (aliasSet.has(name) && coerceNull(field?.value)) {
      return coerceNull(field.value);
    }
  }

  return null;
}

/**
 * Fingerprint for ESSA-style refs: 568/PT.ALE-PAU/04/2026
 * @param {unknown} ref
 */
export function referenceFingerprint(ref) {
  const text = String(ref || "").trim();
  const match = text.match(/^(\d+)\/(.*)\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return text.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  const [, lead, middle, month, year] = match;
  const compactMiddle = middle.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${lead}-${compactMiddle}-${month}-${year}`;
}

export function referencesLikelySame(a, b) {
  if (!a || !b) return false;
  return referenceFingerprint(a) === referenceFingerprint(b);
}

function preferFormattedReference(a, b) {
  const score = (value) => {
    const text = String(value || "");
    return (/\./.test(text) ? 2 : 0) + (/-/.test(text) ? 1 : 0) + (/^\d+\//.test(text) ? 3 : 0);
  };
  return score(a) >= score(b) ? a : b;
}

function looksLikeEssaInvoiceRef(ref) {
  return /^\d+\/[^/]+\/\d{2}\/\d{4}$/.test(String(ref || "").trim());
}

function refsShareInvoiceSuffix(a, b) {
  const parse = (ref) => {
    const parts = String(ref || "")
      .trim()
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 3) return null;

    const year = parts[parts.length - 1];
    const month = parts[parts.length - 2];
    const middle = parts.slice(1, -2).join("/").toLowerCase().replace(/[^a-z0-9]/g, "");
    return { suffix: `${month}/${year}`, middle };
  };

  const left = parse(a);
  const right = parse(b);
  if (!left || !right || left.suffix !== right.suffix) return false;

  if (left.middle === right.middle) return true;
  const normalizeMiddle = (value) => value.replace(/^plt/, "pt").replace(/\./g, "");
  return normalizeMiddle(left.middle) === normalizeMiddle(right.middle);
}

function setHeaderAlias(header, aliases, value) {
  if (!value) return;
  for (const alias of aliases) {
    header[alias] = value;
  }
}

function extractNoticeReference(doc) {
  const fromHeader = findInHeaderOrFields(doc.header, doc.fields, NOTICE_REF_ALIASES);
  if (fromHeader && looksLikeEssaInvoiceRef(fromHeader)) return fromHeader;

  for (const field of doc.fields || []) {
    const name = String(field?.name || "").toLowerCase();
    if (!name.includes("pembayaran") && !name.includes("payment")) continue;

    const match = String(field.value || "").match(
      /\b(\d+\/[A-Za-z0-9.\-]+\/\d{2}\/\d{4})\b/,
    );
    if (match) return match[1];
  }

  return fromHeader;
}

function shouldCorrectInvoiceFromNotice(invoiceRef, noticeRef) {
  if (!noticeRef) return false;
  if (!invoiceRef) return true;
  if (referencesLikelySame(noticeRef, invoiceRef)) return true;
  if (refsShareInvoiceSuffix(noticeRef, invoiceRef)) return true;
  if (looksLikeEssaInvoiceRef(noticeRef) && !looksLikeEssaInvoiceRef(invoiceRef)) {
    return true;
  }
  return false;
}

function correctInvoiceReference(invoiceDoc, noticeRef) {
  if (!noticeRef) return invoiceDoc;

  const header = { ...(invoiceDoc.header || {}) };
  const invoiceRef = findInHeaderOrFields(
    header,
    invoiceDoc.fields,
    INVOICE_NO_ALIASES,
  );

  if (!shouldCorrectInvoiceFromNotice(invoiceRef, noticeRef)) {
    return invoiceDoc;
  }

  const corrected = preferFormattedReference(noticeRef, invoiceRef || noticeRef);
  setHeaderAlias(
    header,
    ["invNo", "invoiceNumber", "INVOICE NO", "invoice_no", "invoiceNo"],
    corrected,
  );

  return { ...invoiceDoc, header };
}

/**
 * Cross-correct invoice number from the notice/kwitansi in the same bundle.
 * Does not alter PO numbers — those stay per-document.
 * @param {Array<object>} extractions
 */
export function normalizeBundleExtractions(extractions) {
  if (!Array.isArray(extractions) || !extractions.length) return extractions;

  const noticeDoc = extractions.find(
    (entry) => entry.documentType === "notice" || entry.documentType === "kwitansi",
  );
  const noticeRef = noticeDoc ? extractNoticeReference(noticeDoc) : null;

  for (let index = 0; index < extractions.length; index += 1) {
    if (extractions[index].documentType === "invoice") {
      extractions[index] = correctInvoiceReference(extractions[index], noticeRef);
    }
  }

  return extractions;
}
