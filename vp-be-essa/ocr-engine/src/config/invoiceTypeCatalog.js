/**
 * Invoice-type catalog contract consumed by ocr-demo.
 *
 * Posted by BE on each /extract request as JSON (multipart field
 * `invoiceTypeCatalog`). Numeric DB ids never appear here — only type codes.
 *
 * @typedef {{
 *   categoryId: string,
 *   categoryLabel: string,
 *   enabled: boolean,
 *   mandatory: boolean,
 *   splitBehavior: 'contiguous' | 'scattered',
 *   classificationHints: string,
 * }} CatalogDocument
 *
 * @typedef {{
 *   invoiceTypeId: string,
 *   name: string,
 *   poSeries: string[],
 *   contentSignals: string,
 *   documents: CatalogDocument[],
 * }} CatalogInvoiceType
 *
 * @typedef {{
 *   confidenceThreshold: number,
 *   lowConfidenceAction: 'manual_review' | 'best_guess',
 *   invoiceTypes: CatalogInvoiceType[],
 * }} InvoiceTypeCatalog
 */

import {
  CLASSIFICATION_CATEGORIES,
  getAllowedCategoryIds,
  getClassificationCatalogText,
} from "../constants/documentFieldSchemas.js";
import { slugifyCategoryId } from "../constants/categoryUtils.js";
import { buildMockupInvoiceTypeCatalog } from "./invoiceTypeDocuments.js";

let mockupCatalogCache = null;
function getMockupCatalog() {
  if (!mockupCatalogCache) mockupCatalogCache = buildMockupInvoiceTypeCatalog();
  return mockupCatalogCache;
}

export const KNOWN_INVOICE_TYPE_IDS = [
  "MANPOWER_SERVICES",
  "CIVIL_CONTRACTOR",
  "MATERIAL_IMPORT",
  "CAMP_SERVICE_AND_CATERING",
  "NON_PO",
];

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
export const DEFAULT_LOW_CONFIDENCE_ACTION = "manual_review";

/** Fallback scattered set when a type has no splitBehavior config. */
export const DEFAULT_SCATTERED_CATEGORY_IDS = [
  "daily_timesheet",
  "daily_attendance",
  "summary_calculation_manhour",
  "purchase_order_appendix",
];

function warn(message, extra = {}) {
  console.warn(`[invoiceTypeCatalog] ${message}`, extra);
}

export function normalizeInvoiceTypeId(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isKnownInvoiceTypeId(value) {
  const id = normalizeInvoiceTypeId(value);
  return KNOWN_INVOICE_TYPE_IDS.includes(id);
}

const CATEGORY_ID_ALIASES = {
  tax_invoice: "faktur_pajak",
  kwitansi: "notice",
  receipt: "notice",
  payment_notice: "notice",
  work_progress_certificate: "berita_acara",
  summary_calculation: "summary_calculation_manhour",
  summary_of_claim: "summary_calculation_manhour",
  manhour_summary: "summary_calculation_manhour",
  daily_time_sheet: "daily_timesheet",
  timesheet: "daily_timesheet",
  face_finger: "daily_attendance",
  fabrication_report: "daily_attendance",
  attendance_sheet: "daily_attendance",
  attendance: "daily_attendance",
  biometrics: "daily_attendance",
  po: "purchase_order",
  purchase_order_terms: "purchase_order_appendix",
  po_appendix: "purchase_order_appendix",
  ses: "service_entry_sheet",
};

function canonicalizeCategoryId(value) {
  const id = String(value || "")
    .trim()
    .toLowerCase();
  if (!id || id === "unclassified") return "";
  return CATEGORY_ID_ALIASES[id] || id;
}

export function getMandatoryDocuments(catalog, invoiceTypeId) {
  return getEnabledDocuments(catalog, invoiceTypeId).filter((doc) => doc.mandatory);
}

function collectPresentCategoryIds(classification) {
  const present = new Set();
  const add = (value) => {
    const id = String(value || "")
      .trim()
      .toLowerCase();
    if (!id || id === "unclassified") return;
    present.add(id);
    const canonical = canonicalizeCategoryId(id);
    if (canonical) present.add(canonical);
  };

  for (const page of classification?.pages || []) {
    add(page.categoryId || page.documentType);
  }
  for (const group of classification?.categoryGroups || []) {
    add(group.categoryId || group.documentName);
  }
  for (const doc of classification?.documents || []) {
    add(doc.categoryId || doc.documentType);
  }
  const categories = classification?.categories;
  const categoryList = Array.isArray(categories)
    ? categories
    : Object.values(categories || {});
  for (const cat of categoryList) {
    add(cat?.categoryId);
  }
  return present;
}

/**
 * Enabled documents marked mandatory that were not found after classification.
 * Empty array means extraction may proceed.
 */
export function findMissingMandatoryDocuments(
  catalog,
  invoiceTypeId,
  classification,
) {
  const mandatory = getMandatoryDocuments(catalog, invoiceTypeId);
  if (!mandatory.length) return [];

  const present = collectPresentCategoryIds(classification);
  return mandatory.filter((doc) => {
    const categoryId = canonicalizeCategoryId(doc.categoryId);
    return categoryId && !present.has(categoryId);
  });
}

function normalizeSplitBehavior(value) {
  const token = String(value || "")
    .trim()
    .toLowerCase();
  return token === "scattered" ? "scattered" : "contiguous";
}

function normalizePoSeries(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((part) => part.trim());
  return [
    ...new Set(
      list
        .map((prefix) => String(prefix || "").replace(/\D/g, ""))
        .filter(Boolean),
    ),
  ];
}

function normalizeDocument(raw) {
  const categoryLabel = String(raw?.categoryLabel || raw?.name || "").trim();
  const categoryId =
    slugifyCategoryId(raw?.categoryId || categoryLabel) || "unclassified";
  const classificationHints = String(raw?.classificationHints || "").trim();
  const enabled = raw?.enabled !== false;
  const mandatory = raw?.mandatory === true || raw?.isMandatory === true;

  return {
    categoryId,
    categoryLabel: categoryLabel || categoryId,
    enabled,
    mandatory,
    splitBehavior: normalizeSplitBehavior(raw?.splitBehavior),
    classificationHints,
  };
}

function normalizeInvoiceType(raw) {
  const invoiceTypeId = normalizeInvoiceTypeId(raw?.invoiceTypeId || raw?.code);
  const name = String(raw?.name || invoiceTypeId).trim();
  const poSeries = normalizePoSeries(raw?.poSeries);
  const contentSignals = String(raw?.contentSignals || "").trim();
  const documents = Array.isArray(raw?.documents)
    ? raw.documents.map((doc) => normalizeDocument(doc))
    : [];

  if (!invoiceTypeId) return null;

  if (!contentSignals && poSeries.length > 0) {
    warn("empty contentSignals", { invoiceTypeId });
  }

  return {
    invoiceTypeId,
    name,
    poSeries,
    contentSignals,
    documents,
  };
}

/**
 * Parse a posted catalog (object or JSON string). Empty / invalid input
 * falls back to the mockup Document Types lists so each invoice type still
 * has its own classification catalog.
 * @param {unknown} raw
 * @returns {InvoiceTypeCatalog}
 */
export function parseInvoiceTypeCatalog(raw) {
  const mockupFallback = () => {
    warn(
      "invoiceTypeCatalog missing or invalid — using prompt-builder-mockup Document Types lists",
    );
    return getMockupCatalog();
  };

  let source = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return mockupFallback();
    try {
      source = JSON.parse(trimmed);
    } catch (error) {
      warn("failed to parse invoiceTypeCatalog JSON — using mockup Document Types lists", {
        message: error instanceof Error ? error.message : String(error),
      });
      return mockupFallback();
    }
  }

  if (!source || typeof source !== "object") return mockupFallback();

  const threshold = Number(source.confidenceThreshold);
  const action = String(source.lowConfidenceAction || "")
    .trim()
    .toLowerCase();

  const invoiceTypes = Array.isArray(source.invoiceTypes)
    ? source.invoiceTypes.map(normalizeInvoiceType).filter(Boolean)
    : [];

  if (!invoiceTypes.length) return mockupFallback();

  return {
    confidenceThreshold: Number.isFinite(threshold)
      ? Math.min(1, Math.max(0, threshold))
      : DEFAULT_CONFIDENCE_THRESHOLD,
    lowConfidenceAction:
      action === "best_guess" ? "best_guess" : DEFAULT_LOW_CONFIDENCE_ACTION,
    invoiceTypes,
  };
}

/**
 * @param {unknown} raw
 * @returns {Record<string, string>}
 */
export function parseExtractionPromptMap(raw) {
  let source = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      source = JSON.parse(trimmed);
    } catch (error) {
      warn("failed to parse extractionPrompts JSON", {
        message: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {};
  }

  /** @type {Record<string, string>} */
  const map = {};
  for (const [key, value] of Object.entries(source)) {
    const typeId = normalizeInvoiceTypeId(key);
    const text = String(value || "").trim();
    if (typeId && text) map[typeId] = text;
  }
  return map;
}

export function catalogHasTypes(catalog) {
  return Boolean(catalog?.invoiceTypes?.length);
}

export function findInvoiceType(catalog, invoiceTypeId) {
  const id = normalizeInvoiceTypeId(invoiceTypeId);
  if (!id) return null;
  return (
    catalog?.invoiceTypes?.find((type) => type.invoiceTypeId === id) || null
  );
}

/**
 * Enabled documents for a type. If none are enabled, fall back to every
 * document listed for that type (broadest default).
 * @param {InvoiceTypeCatalog | null | undefined} catalog
 * @param {string} invoiceTypeId
 * @returns {CatalogDocument[]}
 */
export function getEnabledDocuments(catalog, invoiceTypeId) {
  const type = findInvoiceType(catalog, invoiceTypeId);
  const mockupType = findInvoiceType(getMockupCatalog(), invoiceTypeId);
  const documents = type?.documents?.length
    ? type.documents
    : mockupType?.documents || [];

  if (!type && mockupType) {
    warn(
      "invoice type missing from posted catalog — using mockup Document Types list",
      { invoiceTypeId },
    );
  }

  const enabled = documents.filter((doc) => doc.enabled);
  if (enabled.length > 0) return enabled;

  if (documents.length > 0) {
    warn(
      "no enabled documents — falling back to all Document Types for this invoice type",
      { invoiceTypeId: invoiceTypeId || type?.invoiceTypeId },
    );
    return documents;
  }

  return [];
}

export function getAllowedCategoryIdsForType(catalog, invoiceTypeId) {
  const docs = getEnabledDocuments(catalog, invoiceTypeId);
  if (docs.length > 0) {
    return [...new Set(docs.map((doc) => doc.categoryId).filter(Boolean))];
  }

  if (invoiceTypeId) {
    warn(
      "invoiceTypeId has no document catalog — falling back to global CLASSIFICATION_CATEGORIES",
      { invoiceTypeId },
    );
  }

  return getAllowedCategoryIds();
}

export function getClassificationCatalogEntries(catalog, invoiceTypeId) {
  const docs = getEnabledDocuments(catalog, invoiceTypeId);
  if (docs.length > 0) {
    return docs.map((doc) => {
      const canonical = CLASSIFICATION_CATEGORIES.find(
        (entry) => entry.categoryId === doc.categoryId,
      );
      return {
        categoryId: doc.categoryId,
        categoryLabel: canonical?.categoryLabel || doc.categoryLabel,
        identifiers:
          doc.classificationHints ||
          canonical?.identifiers ||
          doc.categoryLabel ||
          doc.categoryId,
      };
    });
  }

  return CLASSIFICATION_CATEGORIES.map((entry) => ({
    categoryId: entry.categoryId,
    categoryLabel: entry.categoryLabel,
    identifiers: entry.identifiers,
  }));
}

export function getClassificationCatalogTextForType(catalog, invoiceTypeId) {
  const entries = getClassificationCatalogEntries(catalog, invoiceTypeId);
  if (!entries.length) return getClassificationCatalogText();

  return entries
    .map(
      (entry) =>
        `- ${entry.categoryId} → ${entry.categoryLabel}\n  Identify by: ${entry.identifiers}`,
    )
    .join("\n");
}

/**
 * @param {InvoiceTypeCatalog | null | undefined} catalog
 * @param {string} invoiceTypeId
 * @returns {Set<string>}
 */
export function getScatteredCategoryIds(catalog, invoiceTypeId) {
  const docs = getEnabledDocuments(catalog, invoiceTypeId);
  if (docs.length > 0) {
    const scattered = docs
      .filter((doc) => doc.splitBehavior === "scattered")
      .map((doc) => doc.categoryId);
    if (scattered.length > 0) return new Set(scattered);

    const allowed = new Set(docs.map((doc) => doc.categoryId));
    const fallback = DEFAULT_SCATTERED_CATEGORY_IDS.filter((id) =>
      allowed.has(id),
    );
    warn(
      "no scattered splitBehavior on this type — using default scattered set for known types",
      { invoiceTypeId, fallback },
    );
    return new Set(fallback);
  }

  warn(
    "invoiceTypeId unresolved for splitBehavior — falling back to default scattered set",
    { invoiceTypeId },
  );
  return new Set(DEFAULT_SCATTERED_CATEGORY_IDS);
}

export function getNonPoInvoiceTypeId(catalog) {
  const emptySeries = (catalog?.invoiceTypes || []).filter(
    (type) => type.poSeries.length === 0,
  );
  if (emptySeries.length === 1) return emptySeries[0].invoiceTypeId;
  if (findInvoiceType(catalog, "NON_PO")) return "NON_PO";
  return "NON_PO";
}
