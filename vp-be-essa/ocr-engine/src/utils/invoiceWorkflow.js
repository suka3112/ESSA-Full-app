/**
 * Select the Prompt Builder extraction text for an already-resolved invoice type.
 *
 * Override / resolution happens in invoiceTypeResolution.js before classification.
 * This module only maps the resolved type code onto the prompt map posted by BE.
 */

import { normalizeInvoiceTypeId } from "../config/invoiceTypeCatalog.js";

export function workflowFromInvoiceTypeId(invoiceTypeId) {
  const id = normalizeInvoiceTypeId(invoiceTypeId);
  if (!id) return "NON_PO";
  return id === "NON_PO" ? "NON_PO" : "PO";
}

/**
 * @param {{
 *   invoiceTypeId?: string | null,
 *   invoiceTypeResolution?: object,
 *   extractionPrompts?: Record<string, string>,
 *   extractionPromptCandidate?: string,
 *   extractionPromptPoCandidate?: string,
 * }} input
 */
export function resolvePromptBuilderUsage({
  invoiceTypeId,
  invoiceTypeResolution,
  extractionPrompts,
  extractionPromptCandidate,
  extractionPromptPoCandidate,
} = {}) {
  const typeId = normalizeInvoiceTypeId(invoiceTypeId);
  const promptMap =
    extractionPrompts && typeof extractionPrompts === "object"
      ? extractionPrompts
      : {};

  let selectedCandidate = String(promptMap[typeId] || "").trim();
  if (!selectedCandidate) {
    selectedCandidate =
      typeId === "NON_PO"
        ? String(extractionPromptCandidate || "").trim()
        : String(
            promptMap.MANPOWER_SERVICES || extractionPromptPoCandidate || "",
          ).trim();
  }

  const workflow = workflowFromInvoiceTypeId(typeId);
  const usePromptBuilder = selectedCandidate.length > 0;
  const source = invoiceTypeResolution?.source || "unresolved";
  const reasons = [
    ...(invoiceTypeResolution?.signals || []),
    typeId ? `invoiceTypeId:${typeId}` : "invoiceTypeId:unresolved",
  ];

  return {
    workflow,
    invoiceTypeId: typeId || null,
    source,
    reasons,
    extractionPrompt: usePromptBuilder ? selectedCandidate : "",
    promptBuilderMode: usePromptBuilder,
    usedOcrDemoExtractionHints: !usePromptBuilder,
    promptCandidateChars: selectedCandidate.length,
    promptSourceType: usePromptBuilder ? typeId || null : null,
    nonPoPromptCandidateChars: String(
      promptMap.NON_PO || extractionPromptCandidate || "",
    ).trim().length,
    poPromptCandidateChars: String(
      promptMap.MANPOWER_SERVICES || extractionPromptPoCandidate || "",
    ).trim().length,
  };
}
