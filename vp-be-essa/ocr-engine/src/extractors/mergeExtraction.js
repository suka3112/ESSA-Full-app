import { coerceNull } from "./utils.js";
import { extractPurchaseOrderPoNumber } from "../utils/poNumber.js";

function fieldIdentity(field) {
  return String(field?.name || field?.label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const ENTRY_ARRAY_KEYS = [
  "invoiceLineItems",
  "manpower",
  "manhourSummary",
  "timesheetEntries",
  "attendanceEntries",
  "poLineItems",
  "appendixItems",
  "sesLineItems",
];

function isEmptyValue(value) {
  return coerceNull(value) == null;
}

function mergeHeader(target, source) {
  if (!source || typeof source !== "object") return;
  for (const [key, value] of Object.entries(source)) {
    if (!isEmptyValue(value) && isEmptyValue(target[key])) {
      target[key] = value;
    }
  }
}

function mergeArrays(target, source) {
  if (!Array.isArray(source) || source.length === 0) return;
  target.push(...source);
}

function mergeFieldArrays(targetFields, sourceFields) {
  if (!Array.isArray(sourceFields) || sourceFields.length === 0) return;

  const merged = Array.isArray(targetFields) ? [...targetFields] : [];
  const seen = new Set(merged.map((field) => fieldIdentity(field)).filter(Boolean));

  for (const field of sourceFields) {
    const identity = fieldIdentity(field);
    if (identity && seen.has(identity)) continue;
    merged.push(field);
    if (identity) seen.add(identity);
  }

  return merged;
}

/**
 * Merge partial extraction results from multiple page batches into one document.
 * @param {Array<object>} chunks
 */
export function mergeExtractionChunks(chunks) {
  if (!chunks?.length) return {};
  if (chunks.length === 1) return chunks[0];

  const merged = {
    documentType:
      chunks.find((chunk) => coerceNull(chunk.documentType))?.documentType ??
      null,
    header: {},
    lineItems: [],
    fields: [],
    tables: [],
    summary: null,
    pages: [],
  };

  for (const chunk of chunks) {
    mergeHeader(merged.header, chunk.header);
    mergeArrays(merged.lineItems, chunk.lineItems);
    mergeArrays(merged.fields, chunk.fields);
    mergeArrays(merged.tables, chunk.tables);
    mergeArrays(merged.pages, chunk.pages);
    for (const key of ENTRY_ARRAY_KEYS) {
      if (Array.isArray(chunk[key]) && chunk[key].length > 0) {
        merged[key] = merged[key] || [];
        mergeArrays(merged[key], chunk[key]);
      }
    }
    if (Array.isArray(chunk.timesheets)) {
      merged.timesheets = merged.timesheets || [];
      mergeArrays(merged.timesheets, chunk.timesheets);
    }
  }

  const summaries = chunks
    .map((chunk) => coerceNull(chunk.summary))
    .filter(Boolean);
  if (summaries.length > 0) {
    merged.summary = summaries[0];
  }

  return merged;
}

/**
 * Merge a text extraction with a vision extraction (vision fills gaps).
 * @param {object} textResult
 * @param {object} visionResult
 */
export function mergeTextAndVisionExtraction(textResult, visionResult) {
  if (!visionResult || typeof visionResult !== "object") return textResult;
  if (!textResult || typeof textResult !== "object") return visionResult;

  const textHasContent =
    Object.keys(textResult.header || {}).length > 0 ||
    (textResult.lineItems?.length ?? 0) > 0 ||
    (textResult.fields?.length ?? 0) > 0;

  if (!textHasContent) return visionResult;

  const merged = { ...textResult };
  mergeHeader((merged.header = { ...merged.header }), visionResult.header);

  const visionPoNumber = extractPurchaseOrderPoNumber(visionResult);
  if (visionPoNumber && !extractPurchaseOrderPoNumber(merged)) {
    merged.header = { ...merged.header, poNumber: visionPoNumber };
  }

  if ((merged.lineItems?.length ?? 0) === 0 && visionResult.lineItems?.length) {
    merged.lineItems = visionResult.lineItems;
  }
  for (const key of ENTRY_ARRAY_KEYS) {
    if ((merged[key]?.length ?? 0) === 0 && visionResult[key]?.length) {
      merged[key] = visionResult[key];
    }
  }
  merged.fields = mergeFieldArrays(merged.fields, visionResult.fields);
  if ((merged.tables?.length ?? 0) === 0 && visionResult.tables?.length) {
    merged.tables = visionResult.tables;
  }
  if (!coerceNull(merged.summary) && coerceNull(visionResult.summary)) {
    merged.summary = visionResult.summary;
  }
  if (
    !coerceNull(merged.documentType) &&
    coerceNull(visionResult.documentType)
  ) {
    merged.documentType = visionResult.documentType;
  }

  return merged;
}
