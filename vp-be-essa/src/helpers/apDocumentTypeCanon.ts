/**
 * Canonical OCR document-type keys for DOCREQ matching.
 * Completeness labels ("Tax Invoice (Faktur Pajak)") must map to the same
 * key OCR uses (faktur_pajak), not a naive slug (tax_invoice_faktur_pajak).
 */

export function normalizeDocTypeKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const CANONICAL_BY_ALIAS: Record<string, string> = {
  faktur_pajak: "faktur_pajak",
  tax_invoice: "faktur_pajak",
  taxinvoice: "faktur_pajak",
  tax_invoice_vat: "faktur_pajak",
  tax_invoice_faktur_pajak: "faktur_pajak",
  vat_tax_invoice: "faktur_pajak",
  berita_acara: "berita_acara",
  work_progress_certificate: "berita_acara",
  work_progress_certificate_berita_acara: "berita_acara",
  invoice: "invoice",
  commercial_invoice: "invoice",
  notice: "notice",
  kwitansi: "notice",
  receipt: "notice",
  manhour_summary: "manhour_summary",
  summary_calculation_manhour: "manhour_summary",
  summary_calculation: "manhour_summary",
  timesheet: "timesheet",
  daily_timesheet: "timesheet",
  daily_time_sheet: "timesheet",
  attendance: "attendance",
  daily_attendance: "attendance",
  attendance_sheet: "attendance",
  purchase_order: "po",
  po: "po",
  purchase_order_appendix: "po_appendix",
  po_appendix: "po_appendix",
};

export function canonicalDocTypeKey(value: unknown): string {
  const normalized = normalizeDocTypeKey(value);
  if (!normalized) return "";
  if (CANONICAL_BY_ALIAS[normalized]) return CANONICAL_BY_ALIAS[normalized];
  if (
    normalized.includes("faktur") ||
    (normalized.includes("tax") && normalized.includes("invoice"))
  ) {
    return "faktur_pajak";
  }
  if (normalized.includes("berita") || normalized.includes("work_progress")) {
    return "berita_acara";
  }
  if (normalized.includes("manhour") || normalized.includes("summary_calculation")) {
    return "manhour_summary";
  }
  if (normalized.includes("timesheet")) return "timesheet";
  if (normalized.includes("attendance")) return "attendance";
  if (normalized.includes("po_appendix") || normalized.includes("purchase_order_appendix")) {
    return "po_appendix";
  }
  if (normalized === "po" || normalized.includes("purchase_order")) return "po";
  return normalized;
}

export function documentTypesMatch(left: unknown, right: unknown): boolean {
  const a = canonicalDocTypeKey(left);
  const b = canonicalDocTypeKey(right);
  return Boolean(a && b && a === b);
}

/** Uppercase stored AP_DOCUMENT_REQUEST_ITEM.DocumentType. */
export function toStoredDocumentType(value: unknown): string {
  const canonical = canonicalDocTypeKey(value);
  return (canonical || normalizeDocTypeKey(value)).toUpperCase();
}

export function inferDocTypeFromFileName(fileName: unknown): string | null {
  const name = String(fileName || "").toLowerCase();
  if (!name) return null;
  if (/berita\s*acara|work\s*progress\s*certificate/.test(name)) {
    return "berita_acara";
  }
  if (/faktur\s*pajak|e-?faktur|\btax\s*invoice\b/.test(name)) {
    return "faktur_pajak";
  }
  return null;
}
