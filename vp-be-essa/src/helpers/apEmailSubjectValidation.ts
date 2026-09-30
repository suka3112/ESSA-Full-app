/**
 * Email intake subject-line gate (EAPA format).
 * Strict full-match after trim (and after stripping Re:/Fw: prefixes).
 * Fail early before OCR / attachment download.
 *
 * PO:     [EAPA][CATEGORY][PO:XXXXXXXXXX] <VENDOR NAME> - <INVOICE NUMBER>
 * NonPO:  [EAPA][NONPO][CATEGORY] <VENDOR NAME> - <INVOICE NUMBER>
 * DocReq: [EAPA][DOCREQ][INV:INV-…][REQ:REQ-…]([DOC:TYPE])? <VENDOR> - <INVOICE>
 */

export type EmailSubjectInvoiceType = "PO" | "NON_PO" | "DOCREQ";

export type EmailSubjectPoCategory =
  | "MANPOWER"
  | "CATERING"
  | "CIVIL"
  | "MATERIAL_IMPORT"
  | "HOUSEKEEPING"
  | "COMPOSITE"
  | "NATURAL_GAS"
  | "SERVICE";

export type EmailSubjectNonPoCategory = "TRAVEL" | "EXPENSE" | "MISC";

/** @deprecated use EmailSubjectPoCategory | EmailSubjectNonPoCategory */
export type EmailSubjectCategoryCode =
  | EmailSubjectPoCategory
  | EmailSubjectNonPoCategory;

export type EmailSubjectRejectReason =
  | "no_recognized_prefix"
  | "malformed_po_subject"
  | "malformed_non_po_subject"
  | "malformed_docreq_subject"
  | "empty_subject";

export type EmailSubjectValidationResult =
  | {
      valid: true;
      type: "NON_PO";
      invoiceNumber: string;
      vendorName: string;
      category: EmailSubjectNonPoCategory;
      poNumber?: undefined;
      invoiceWorkflow: string;
      invoiceTypeId: string;
    }
  | {
      valid: true;
      type: "PO";
      invoiceNumber: string;
      vendorName: string;
      poNumber: string;
      category: EmailSubjectPoCategory;
      invoiceWorkflow: string;
      invoiceTypeId: string;
    }
  | {
      valid: true;
      type: "DOCREQ";
      eapaInvoiceId: string;
      primaryDocumentId: number;
      requestCode: string;
      requestId: number;
      documentType: string | null;
      invoiceNumber: string;
      vendorName: string;
      /** Not used for OCR workflow override on DOCREQ merge path */
      invoiceWorkflow: string;
      invoiceTypeId: string;
    }
  | {
      valid: false;
      reason: EmailSubjectRejectReason;
    };

const PO_CATEGORIES =
  "MANPOWER|CATERING|CIVIL|MATERIAL_IMPORT|HOUSEKEEPING|COMPOSITE|NATURAL_GAS|SERVICE";

const NON_PO_CATEGORIES = "TRAVEL|EXPENSE|MISC";

/** PO category → OCR invoiceTypeId / workflow override */
export const SUBJECT_PO_CATEGORY_TO_INVOICE_TYPE: Record<
  EmailSubjectPoCategory,
  string
> = {
  MANPOWER: "MANPOWER_SERVICES",
  CATERING: "CAMP_SERVICE_AND_CATERING",
  CIVIL: "CIVIL_CONTRACTOR",
  MATERIAL_IMPORT: "MATERIAL_IMPORT",
  // Not yet dedicated extraction types — leave AUTO so OCR can classify
  HOUSEKEEPING: "AUTO",
  COMPOSITE: "AUTO",
  NATURAL_GAS: "AUTO",
  SERVICE: "AUTO",
};

/** Non-PO category → OCR invoiceTypeId / workflow override */
export const SUBJECT_NON_PO_CATEGORY_TO_INVOICE_TYPE: Record<
  EmailSubjectNonPoCategory,
  string
> = {
  // Catalog currently has NON_PO only for non-PO workflows
  TRAVEL: "NON_PO",
  EXPENSE: "NON_PO",
  MISC: "NON_PO",
};

/** Legacy alias used by older call sites */
export const SUBJECT_CATEGORY_TO_INVOICE_TYPE: Record<string, string> = {
  ...SUBJECT_PO_CATEGORY_TO_INVOICE_TYPE,
  MATERIAL: "MATERIAL_IMPORT",
  CAMP: "CAMP_SERVICE_AND_CATERING",
  ...SUBJECT_NON_PO_CATEGORY_TO_INVOICE_TYPE,
};

/**
 * PO: [EAPA][CATEGORY][PO:XXXXXXXXXX] <VENDOR> - <INVOICE>
 * NonPO: [EAPA][NONPO][CATEGORY] <VENDOR> - <INVOICE>
 * Invoice / vendor may include spaces, slashes, dots, hyphens.
 */
const PO_SUBJECT_REGEX = new RegExp(
  `^\\[EAPA\\]\\[(${PO_CATEGORIES})\\]\\[PO:([A-Z0-9]+)\\]\\s+(.+?)\\s+-\\s+(.+)$`,
  "i",
);

const NON_PO_SUBJECT_REGEX = new RegExp(
  `^\\[EAPA\\]\\[NONPO\\]\\[(${NON_PO_CATEGORIES})\\]\\s+(.+?)\\s+-\\s+(.+)$`,
  "i",
);

/** Single or multi-doc DOCREQ. Optional [DOC:TYPE]. */
const DOCREQ_SUBJECT_REGEX =
  /^\[EAPA\]\[DOCREQ\]\[INV:(INV-\d+)\]\[REQ:(REQ-\d+)\](?:\[DOC:([A-Z0-9_]+)\])?\s+(.+?)\s+-\s+(.+)$/i;

const REPLY_PREFIX_REGEX = /^(?:(?:RE|FW|FWD)\s*:\s*)+/i;

/** Strip Outlook/Graph reply prefixes so DOCREQ / PO gates still match. */
export function stripReplySubjectPrefixes(subject: string): string {
  return String(subject || "")
    .trim()
    .replace(REPLY_PREFIX_REGEX, "")
    .trim();
}

export function formatEapaInvoiceId(primaryDocumentId: number): string {
  const n = Math.trunc(Number(primaryDocumentId));
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("primaryDocumentId must be a positive integer");
  }
  return `INV-${String(n).padStart(7, "0")}`;
}

export function formatRequestCode(requestId: number): string {
  const n = Math.trunc(Number(requestId));
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("requestId must be a positive integer");
  }
  return `REQ-${String(n).padStart(7, "0")}`;
}

export function parseEapaInvoiceId(
  value: string | null | undefined,
): number | null {
  const match = String(value || "")
    .trim()
    .toUpperCase()
    .match(/^INV-0*(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function parseRequestCode(
  value: string | null | undefined,
): number | null {
  const match = String(value || "")
    .trim()
    .toUpperCase()
    .match(/^REQ-0*(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Build the locked DOCREQ subject for Report to vendor.
 * Omit [DOC:…] when more than one document type is requested.
 */
export function buildDocReqSubject(input: {
  primaryDocumentId: number;
  requestId: number;
  documentTypes: string[];
  vendorName: string;
  invoiceNumber: string;
}): string {
  const inv = formatEapaInvoiceId(input.primaryDocumentId);
  const req = formatRequestCode(input.requestId);
  const types = (input.documentTypes || [])
    .map((t) =>
      String(t || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_"),
    )
    .filter(Boolean);
  const uniqueTypes = [...new Set(types)];
  const docToken =
    uniqueTypes.length === 1 ? `[DOC:${uniqueTypes[0]}]` : "";
  const vendor = String(input.vendorName || "Vendor").trim() || "Vendor";
  const invoiceNo =
    String(input.invoiceNumber || "").trim() || "UNKNOWN";
  return `[EAPA][DOCREQ][INV:${inv}][REQ:${req}]${docToken} ${vendor} - ${invoiceNo}`;
}

export function validateEmailSubject(
  subject: string | null | undefined,
): EmailSubjectValidationResult {
  const trimmed = stripReplySubjectPrefixes(String(subject ?? ""));

  if (!trimmed) {
    return { valid: false, reason: "empty_subject" };
  }

  const upper = trimmed.toUpperCase();

  if (!upper.startsWith("[EAPA]")) {
    return { valid: false, reason: "no_recognized_prefix" };
  }

  // DOCREQ first — also starts with [EAPA]
  if (upper.startsWith("[EAPA][DOCREQ]")) {
    const match = trimmed.match(DOCREQ_SUBJECT_REGEX);
    if (!match) {
      return { valid: false, reason: "malformed_docreq_subject" };
    }
    const eapaInvoiceId = match[1].toUpperCase();
    const requestCode = match[2].toUpperCase();
    const documentType = match[3]
      ? String(match[3]).trim().toUpperCase()
      : null;
    const vendorName = match[4].trim();
    const invoiceNumber = match[5].trim();
    const primaryDocumentId = parseEapaInvoiceId(eapaInvoiceId);
    const requestId = parseRequestCode(requestCode);
    if (
      !primaryDocumentId ||
      !requestId ||
      !vendorName ||
      !invoiceNumber
    ) {
      return { valid: false, reason: "malformed_docreq_subject" };
    }
    return {
      valid: true,
      type: "DOCREQ",
      eapaInvoiceId,
      primaryDocumentId,
      requestCode,
      requestId,
      documentType,
      vendorName,
      invoiceNumber,
      invoiceWorkflow: "DOCREQ",
      invoiceTypeId: "DOCREQ",
    };
  }

  // Non-PO
  if (upper.startsWith("[EAPA][NONPO]")) {
    const match = trimmed.match(NON_PO_SUBJECT_REGEX);
    if (!match) {
      return { valid: false, reason: "malformed_non_po_subject" };
    }
    const category = match[1].toUpperCase() as EmailSubjectNonPoCategory;
    const vendorName = match[2].trim();
    const invoiceNumber = match[3].trim();
    if (!vendorName || !invoiceNumber) {
      return { valid: false, reason: "malformed_non_po_subject" };
    }
    const invoiceTypeId =
      SUBJECT_NON_PO_CATEGORY_TO_INVOICE_TYPE[category] || "NON_PO";
    return {
      valid: true,
      type: "NON_PO",
      category,
      vendorName,
      invoiceNumber,
      invoiceWorkflow: invoiceTypeId,
      invoiceTypeId,
    };
  }

  const poMatch = trimmed.match(PO_SUBJECT_REGEX);
  if (poMatch) {
    const category = poMatch[1].toUpperCase() as EmailSubjectPoCategory;
    const poNumber = poMatch[2].trim();
    const vendorName = poMatch[3].trim();
    const invoiceNumber = poMatch[4].trim();
    if (!poNumber || !vendorName || !invoiceNumber) {
      return { valid: false, reason: "malformed_po_subject" };
    }
    const invoiceTypeId =
      SUBJECT_PO_CATEGORY_TO_INVOICE_TYPE[category] || "AUTO";
    return {
      valid: true,
      type: "PO",
      category,
      poNumber,
      vendorName,
      invoiceNumber,
      invoiceWorkflow: invoiceTypeId,
      invoiceTypeId,
    };
  }

  // Starts with [EAPA] but didn't match either template
  if (upper.includes("[DOCREQ]")) {
    return { valid: false, reason: "malformed_docreq_subject" };
  }
  if (upper.includes("[NONPO]")) {
    return { valid: false, reason: "malformed_non_po_subject" };
  }
  if (upper.includes("[PO:")) {
    return { valid: false, reason: "malformed_po_subject" };
  }
  return { valid: false, reason: "no_recognized_prefix" };
}

export function formatSubjectRejectMessage(
  reason: EmailSubjectRejectReason,
): string {
  switch (reason) {
    case "empty_subject":
      return "Subject is empty. Use [EAPA][CATEGORY][PO:…] Vendor - Invoice, [EAPA][NONPO][CATEGORY] Vendor - Invoice, or [EAPA][DOCREQ][INV:…][REQ:…] ….";
    case "malformed_po_subject":
      return "PO subject format invalid. Expected [EAPA][CATEGORY][PO:XXXXXXXXXX] <VENDOR NAME> - <INVOICE NUMBER>.";
    case "malformed_non_po_subject":
      return "Non-PO subject format invalid. Expected [EAPA][NONPO][CATEGORY] <VENDOR NAME> - <INVOICE NUMBER>.";
    case "malformed_docreq_subject":
      return "Document-request subject format invalid. Expected [EAPA][DOCREQ][INV:INV-…][REQ:REQ-…]([DOC:TYPE])? <VENDOR> - <INVOICE>.";
    case "no_recognized_prefix":
    default:
      return "Subject must start with [EAPA]. Other mail is ignored by intake.";
  }
}
