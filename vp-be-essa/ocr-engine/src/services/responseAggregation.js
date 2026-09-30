import {
  normalizeExtraction,
  normalizePurchaseOrderAppendix,
} from "./normalizeExtractionResponse.js";

/**
 * Build the legacy extracted payload for one aggregated document entry.
 * @param {object} extraction
 */
function buildDocumentData(extraction) {
  const { documentType, ...data } = extraction;
  return data;
}

/**
 * Combine parallel extraction results with split section metadata.
 * Each document includes stable `fields` and `entries` keys for the frontend.
 *
 * @param {Array<object>} extractionResults
 * @param {Array<{ documentName?: string, pdfPath?: string, sectionIndex?: number }>} sections
 * @param {{ promptBuilderMode?: boolean }} options
 */
export function aggregateExtractionResults(
  extractionResults,
  sections,
  options = {},
) {
  const promptBuilderMode = Boolean(options.promptBuilderMode);
  const sectionByIndex = new Map(
    sections.map((section, index) => [
      section.sectionIndex ?? index + 1,
      section,
    ]),
  );

  const documents = extractionResults.map((result, index) => {
    const section = sectionByIndex.get(index + 1) || sections[index] || {};
    const categoryId = result.documentType || section.documentName || "unclassified";
    const structured = normalizeExtraction(categoryId, result);
    const appendix = normalizePurchaseOrderAppendix(categoryId, result);

    /** @type {Record<string, unknown>} */
    let fields;
    /** @type {Record<string, unknown[]>} */
    let entries;

    if (promptBuilderMode) {
      // Prompt Builder is the source of truth — do NOT seed ocr-demo schema keys
      // (e.g. confirmNo) into the response.
      fields = {};
      entries = {};
      const header = result.header || {};
      for (const [key, value] of Object.entries(header)) {
        fields[key] = value ?? null;
      }
      // Also promote any leftover top-level scalars (older model quirks).
      for (const [key, value] of Object.entries(result)) {
        if (
          value == null ||
          typeof value === "object" ||
          [
            "documentType",
            "documentTypeLabel",
            "fileName",
            "fileType",
            "status",
            "detectedDocumentType",
            "extractionMethod",
            "error",
            "summary",
          ].includes(key)
        ) {
          continue;
        }
        if (!(key in fields)) {
          fields[key] = value;
        }
      }
      const entryKeys = [
        "invoiceLineItems",
        "manpower",
        "manhourSummary",
        "timesheetEntries",
        "attendanceEntries",
        "poLineItems",
        "appendixItems",
        "sesLineItems",
      ];
      for (const key of entryKeys) {
        if (Array.isArray(result[key])) {
          entries[key] = result[key];
        }
      }
      if (Array.isArray(result.lineItems) && result.lineItems.length > 0) {
        entries.invoiceLineItems = entries.invoiceLineItems?.length
          ? entries.invoiceLineItems
          : result.lineItems;
      }
    } else {
      fields = { ...(structured.fields || {}) };
      entries = { ...(structured.entries || {}) };
    }

    const document = {
      type: categoryId,
      schemaId: promptBuilderMode ? "prompt_builder" : structured.schemaId,
      typeCode: promptBuilderMode ? null : structured.typeCode,
      typeLabel: promptBuilderMode
        ? "Prompt Builder extraction"
        : structured.typeLabel,
      schemaVersion: structured.schemaVersion,
      pdfPath: section.pdfPath ?? null,
      status: result.status || "extracted",
      fields,
      entries,
      data: buildDocumentData(result),
      promptBuilderMode,
    };

    if (appendix && !promptBuilderMode) {
      document.appendix = {
        schemaId: appendix.schemaId,
        typeCode: appendix.typeCode,
        typeLabel: appendix.typeLabel,
        fields: appendix.fields,
        entries: appendix.entries,
      };
    }

    return document;
  });

  return { documents };
}
