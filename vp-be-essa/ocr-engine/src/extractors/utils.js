const NULLISH = /^(null|undefined|n\/a|na|-|none)$/i;

export function coerceNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text || NULLISH.test(text)) return null;
  return text;
}

export function buildBaseResult(
  documentType,
  documentTypeLabel,
  sourceFile,
  pages,
  status = "extracted",
) {
  return {
    documentType,
    documentTypeLabel,
    fileName: sourceFile.originalname,
    fileType: sourceFile.mimetype,
    status,
    detectedDocumentType: null,
    pages,
    header: {},
    lineItems: [],
    fields: [],
    documentId: null,
    validation: null,
  };
}

export async function readVirtualPdfPageTexts(virtualPdf) {
  if (Array.isArray(virtualPdf?.pageTexts) && virtualPdf.pageTexts.length > 0) {
    return virtualPdf.pageTexts;
  }

  const { extractPageTexts } = await import("../services/pdfText.js");
  return extractPageTexts(virtualPdf.buffer);
}

/**
 * True when embedded text is too sparse for reliable text-only extraction.
 * @param {Array<{ pageNumber: number, text: string }>} pageTexts
 * @param {number} minPageTextChars
 */
export function needsVisionExtraction(pageTexts, minPageTextChars) {
  if (!pageTexts?.length) return true;

  const totalChars = pageTexts.reduce(
    (sum, page) => sum + String(page.text || "").trim().length,
    0,
  );
  const threshold = minPageTextChars * pageTexts.length;

  if (totalChars < threshold) return true;

  const sparsePages = pageTexts.filter(
    (page) => String(page.text || "").trim().length < minPageTextChars,
  ).length;

  return sparsePages > 0 && sparsePages / pageTexts.length >= 0.5;
}

export function mergeDynamicAiResult(base, aiResult) {
  if (!aiResult || typeof aiResult !== "object") return base;

  const RESERVED = new Set([
    "documentType",
    "documentTypeLabel",
    "fileName",
    "fileType",
    "status",
    "detectedDocumentType",
    "pages",
    "fields",
    "tables",
    "validation",
    "meta",
    "summary",
    "error",
    "extractionMethod",
    "header",
    "lineItems",
    "invoiceLineItems",
    "manpowerRoles",
    "manpower",
    "manhourSummary",
    "timesheetEntries",
    "attendanceEntries",
    "poLineItems",
    "appendixItems",
    "sesLineItems",
    "timesheets",
  ]);

  const ENTRY_KEYS = [
    "invoiceLineItems",
    "manpowerRoles",
    "manpower",
    "manhourSummary",
    "timesheetEntries",
    "attendanceEntries",
    "poLineItems",
    "appendixItems",
    "sesLineItems",
  ];

  /** @type {Record<string, unknown>} */
  const header = {};
  /** @type {Record<string, unknown[]>} */
  const entries = {};

  const assignScalar = (key, value) => {
    if (key == null || RESERVED.has(key)) return;
    if (Array.isArray(value)) return;
    if (value && typeof value === "object") return;
    header[key] = value ?? null;
  };

  const assignEntry = (key, value) => {
    if (!ENTRY_KEYS.includes(key)) return;
    if (Array.isArray(value) && value.length > 0) {
      entries[key] = value;
    }
  };

  const ingestObject = (obj, { allowNestedHeader = true } = {}) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;

    if (allowNestedHeader && obj.header && typeof obj.header === "object" && !Array.isArray(obj.header)) {
      for (const [k, v] of Object.entries(obj.header)) {
        assignScalar(k, v);
      }
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key === "header") continue;
      assignEntry(key, value);
      if (key === "lineItems" && Array.isArray(value) && value.length > 0) {
        if (!entries.invoiceLineItems?.length) {
          entries.invoiceLineItems = value;
        }
      }
      assignScalar(key, value);
    }
  };

  // 1) Canonical { header, invoiceLineItems, ... } shape
  ingestObject(aiResult);

  // 2) Prompt Builder "grouped by document name" shape:
  //    { "Invoice": { invNo, ... } } or { "Invoice": { header: {...}, invoiceLineItems: [...] } }
  for (const [key, value] of Object.entries(aiResult)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    if (RESERVED.has(key) && key !== "header") continue;

    const looksLikeDocGroup =
      /invoice|tax|berita|notice|faktur|contract|guarantee|reservation|document|receipt|kwitansi/i.test(
        key,
      ) ||
      Object.prototype.hasOwnProperty.call(value, "invNo") ||
      Object.prototype.hasOwnProperty.call(value, "invoiceNumber") ||
      Object.prototype.hasOwnProperty.call(value, "invoiceLineItems") ||
      (value.header && typeof value.header === "object");

    if (!looksLikeDocGroup) continue;
    ingestObject(value);
  }

  // 3) fields as object map { invNo: "..." } (not only [{name,value}])
  if (aiResult.fields && typeof aiResult.fields === "object" && !Array.isArray(aiResult.fields)) {
    for (const [k, v] of Object.entries(aiResult.fields)) {
      assignScalar(k, v);
    }
  }

  const merged = {
    ...base,
    detectedDocumentType:
      coerceNull(aiResult.documentType) ?? base.detectedDocumentType,
    header: { ...base.header, ...header },
    lineItems:
      Array.isArray(entries.invoiceLineItems) && entries.invoiceLineItems.length > 0
        ? entries.invoiceLineItems
        : Array.isArray(aiResult.lineItems) && aiResult.lineItems.length > 0
          ? aiResult.lineItems
          : base.lineItems,
    pages:
      Array.isArray(base.pages) && base.pages.length > 0
        ? base.pages
        : Array.isArray(aiResult.pages) && aiResult.pages.length > 0
          ? aiResult.pages
          : base.pages,
  };

  if (Array.isArray(aiResult.fields) && aiResult.fields.length > 0) {
    merged.fields = aiResult.fields;
  }

  if (Array.isArray(aiResult.tables) && aiResult.tables.length > 0) {
    merged.tables = aiResult.tables;
  }

  if (Array.isArray(aiResult.timesheets) && aiResult.timesheets.length > 0) {
    merged.timesheets = aiResult.timesheets;
  }

  for (const key of ENTRY_KEYS) {
    if (Array.isArray(entries[key]) && entries[key].length > 0) {
      merged[key] = entries[key];
    } else if (Array.isArray(aiResult[key]) && aiResult[key].length > 0) {
      merged[key] = aiResult[key];
    }
  }

  if (coerceNull(aiResult.summary)) {
    merged.summary = coerceNull(aiResult.summary);
  }

  return merged;
}
