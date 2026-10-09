/**
 * Appendix-text lookup used when a PO series is shared by more than one invoice type.
 * Upload and SharePoint both call this before type-specific extraction.
 * Keywords are read from the PO appendix in the PDF, not from PO_DETAIL.
 */
import { matchInvoiceCategoryFromLineTexts } from "./poLineInvoiceCategory";

export type SharedPoSeriesClassification = {
  invoiceTypeId: string | null;
  needsReview: boolean;
  confidence: number;
  signals: string[];
};

const normalizePoNumber = (value: string): string =>
  String(value || "").replace(/\D/g, "").slice(0, 10);

function appendixLines(appendixTexts: string[]): string[] {
  return (appendixTexts || [])
    .flatMap((text) => String(text || "").split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => line.length >= 3);
}

/**
 * Classify every PO that shares a series (typically 4203) from appendix lines.
 * One category locks the invoice type. No appendix, no keyword, or two
 * categories → manual review.
 */
export async function classifySharedPoSeries(
  poNumbers: string[],
  appendixTexts: string[] = [],
): Promise<SharedPoSeriesClassification> {
  const numbers = [
    ...new Set(
      (poNumbers || [])
        .map((value) => normalizePoNumber(value))
        .filter((value) => value.length >= 10),
    ),
  ];
  const poSignal = numbers.length ? `poNumber:${numbers.join(",")}` : "missing_po_number";
  const lines = appendixLines(appendixTexts);

  if (!lines.length) {
    return {
      invoiceTypeId: null,
      needsReview: true,
      confidence: 0,
      signals: [poSignal, "po_appendix_not_found"],
    };
  }

  const match = matchInvoiceCategoryFromLineTexts(lines);
  const codeSignals = match.matchedCodes.map((code) => `poAppendix:${code}`);

  if (match.invoiceTypeId) {
    return {
      invoiceTypeId: match.invoiceTypeId,
      needsReview: false,
      confidence: 1,
      signals: [poSignal, ...codeSignals],
    };
  }

  return {
    invoiceTypeId: null,
    needsReview: true,
    confidence: 0,
    signals: [
      poSignal,
      match.invoiceTypeIds.length
        ? "po_appendix_keywords_ambiguous"
        : "po_appendix_keywords_missing",
      ...match.invoiceTypeIds.map((id) => `category:${id}`),
      ...codeSignals,
    ],
  };
}
