/**
 * BPD §8.1 — after a PDF is classified into document types, read the data
 * points the matrix marks on each type. BPD §7.3 — this does not split one
 * PDF into more than one invoice.
 *
 * extraction_key is null on the seeded matrix, so a value is read only when
 * the OCR field key or label is the data-point name, or a listed OCR key for
 * that same fact. A miss is stored for the UI. Requirement comes from the
 * category checklist and stays UNRESOLVED when the matrix still says R.
 */

export type Requirement = "MANDATORY" | "OPTIONAL" | "CONDITIONAL" | "UNRESOLVED";

export type UnreadReason =
  | "VALUE_NOT_FOUND"
  | "DOCUMENT_TYPE_UNMAPPED"
  | "NO_DOCUMENT_CLASSIFIED";

export type MatrixFieldSpec = {
  documentCode: string;
  documentName: string;
  dataPointCode: string;
  dataPointName: string;
  fieldLabel: string;
  extractionKey: string | null;
  matrixRef: string | null;
};

export type ClassifiedDocument = {
  type?: string | null;
  documentType?: string | null;
  schemaId?: string | null;
  typeLabel?: string | null;
  page?: number | string | null;
  fields?: Record<string, unknown> | null;
  entries?: Record<string, unknown> | null;
};

export type UnreadDataPoint = {
  recognizedType: string;
  documentCode: string | null;
  documentName: string;
  dataPointCode: string | null;
  dataPointName: string;
  matrixRef: string | null;
  requirement: Requirement;
  reason: UnreadReason;
  pageRef: string | null;
};

export type ExtractedScalar = {
  key: string;
  label: string;
  value: string;
};

/**
 * OCR schema keys that name the same fact as a matrix data point.
 * Used only because the matrix Source System Field column is empty.
 * Order is the preference when more than one key is present.
 */
const OCR_KEY_ALIASES: Record<string, Record<string, string[]>> = {
  INVOICE: {
    DP_1_01: ["vendorname"],
    DP_1_02: ["bankaccountnumber"],
    DP_1_03: ["invoicedate", "date"],
    DP_1_04: ["ponumber"],
    DP_1_05: ["invoicenumber", "invno"],
    DP_1_06: ["unitrate", "manhourunitrate", "unitprice"],
    DP_1_07: ["paymentterms"],
    DP_1_08: ["invoiceamount", "grandtotal", "totalamount"],
    DP_1_09: ["itemdescription", "description"],
    DP_1_10: ["quantity"],
    DP_1_11: ["essacompanyname", "buyername"],
    DP_1_12: ["vendornpwpnumber", "vendortaxid"],
  },
  FAKTUR_PAJAK: {
    DP_1_13: ["fakturpajakvalue", "vatamount"],
    DP_1_14: ["fakturpajakdate", "taxinvoicedate", "date"],
    DP_1_15: ["fakturpajakvendorname", "vendorname"],
    DP_1_16: ["fakturpajaknumber", "taxinvoicenumber"],
  },
};

/** Classifier ids that are the same bundle document as a matrix column. */
const OCR_TYPE_TO_DOCUMENT_CODE: Record<string, string> = {
  invoice: "INVOICE",
  faktur_pajak: "FAKTUR_PAJAK",
  tax_invoice: "FAKTUR_PAJAK",
  berita_acara: "WORK_PROGRESS_CERTIFICATE_BAST",
  work_progress_certificate: "WORK_PROGRESS_CERTIFICATE_BAST",
  daily_timesheet: "TIMESHEET",
  daily_time_sheet: "TIMESHEET",
  timesheet: "TIMESHEET",
  summary_calculation_manhour: "MANPOWER_SUMMARY",
  summary_calculation: "MANPOWER_SUMMARY",
};

const REQUIREMENTS = new Set<Requirement>([
  "MANDATORY",
  "OPTIONAL",
  "CONDITIONAL",
  "UNRESOLVED",
]);

export function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function scalarText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object" && value && "value" in value) {
    return scalarText((value as { value: unknown }).value);
  }
  return "";
}

export function collectExtractedFields(document: ClassifiedDocument): ExtractedScalar[] {
  const found: ExtractedScalar[] = [];
  const fields =
    document.fields && typeof document.fields === "object" ? document.fields : {};
  for (const [key, value] of Object.entries(fields)) {
    const text = scalarText(value);
    if (text) found.push({ key, label: key, value: text });
  }
  const entries =
    document.entries && typeof document.entries === "object" ? document.entries : {};
  for (const rows of Object.values(entries)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        const text = scalarText(value);
        if (text) found.push({ key, label: key, value: text });
      }
    }
  }
  return found;
}

function unwrapData(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return body;
}

/** Exact category code or category name carried on the extract payload. */
export function categoryCandidatesFromBody(
  body: Record<string, unknown> | null | undefined,
): string[] {
  if (!body || typeof body !== "object") return [];
  const data = unwrapData(body);
  const meta =
    data.meta && typeof data.meta === "object"
      ? (data.meta as Record<string, unknown>)
      : {};
  const values = [
    data.invoiceCategoryCode,
    data.invoice_category_code,
    meta.invoiceCategoryCode,
    meta.invoiceTypeName,
    data.invoiceType,
  ];
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const value of values) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    candidates.push(text);
  }
  return candidates;
}

/** Classified sections of the one invoice PDF. Does not create invoices. */
export function classifiedDocumentsFromBody(
  body: Record<string, unknown> | null | undefined,
): ClassifiedDocument[] {
  if (!body || typeof body !== "object") return [];
  const data = unwrapData(body);
  if (Array.isArray(data.documents) && data.documents.length > 0) {
    return data.documents.filter(
      (row): row is ClassifiedDocument => !!row && typeof row === "object",
    );
  }
  const nested = data.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const inner = (nested as Record<string, unknown>).documents;
    if (Array.isArray(inner) && inner.length > 0) {
      return inner.filter(
        (row): row is ClassifiedDocument => !!row && typeof row === "object",
      );
    }
  }
  const classification = data.classification;
  const pages =
    classification &&
    typeof classification === "object" &&
    Array.isArray((classification as { pages?: unknown }).pages)
      ? ((classification as { pages: Array<Record<string, unknown>> }).pages)
      : [];
  const grouped = new Map<string, ClassifiedDocument>();
  for (const page of pages) {
    const type = String(page.documentType || page.type || "").trim();
    if (!type || type.toLowerCase() === "unclassified") continue;
    if (grouped.has(type)) continue;
    grouped.set(type, {
      type,
      typeLabel: String(page.categoryLabel || page.typeLabel || type),
      page: (page.page as number | string | null) ?? null,
      fields: {},
      entries: {},
    });
  }
  return [...grouped.values()];
}

export function documentCodeForRecognizedType(
  recognizedType: string,
  knownDocumentCodes: Set<string>,
): string | null {
  const raw = String(recognizedType || "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (knownDocumentCodes.has(upper)) return upper;
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const mapped = OCR_TYPE_TO_DOCUMENT_CODE[slug];
  if (mapped && knownDocumentCodes.has(mapped)) return mapped;
  return null;
}

export function requirementForDocument(
  documentCode: string | null,
  requirementByDocumentCode: Map<string, string>,
): Requirement {
  if (!documentCode) return "UNRESOLVED";
  const value = requirementByDocumentCode.get(documentCode);
  if (value && REQUIREMENTS.has(value as Requirement)) return value as Requirement;
  return "UNRESOLVED";
}

function recognizedTypeOf(document: ClassifiedDocument): string {
  return String(document.type || document.documentType || document.schemaId || "")
    .trim();
}

function pageRefOf(document: ClassifiedDocument): string | null {
  if (document.page == null || document.page === "") return null;
  const text = String(document.page).trim();
  return text ? text.slice(0, 40) : null;
}

function readFieldValue(
  spec: MatrixFieldSpec,
  extracted: ExtractedScalar[],
): string | null {
  if (spec.extractionKey) {
    const keyed = extracted.find(
      (field) => field.key === spec.extractionKey && field.value,
    );
    if (keyed) return keyed.value;
  }
  const names = new Set(
    [spec.dataPointName, spec.fieldLabel].map(normalizeToken).filter(Boolean),
  );
  const aliases = OCR_KEY_ALIASES[spec.documentCode]?.[spec.dataPointCode] || [];
  for (const alias of aliases) {
    const hit = extracted.find((field) => normalizeToken(field.key) === alias && field.value);
    if (hit) return hit.value;
  }
  for (const field of extracted) {
    if (!field.value) continue;
    if (names.has(normalizeToken(field.key)) || names.has(normalizeToken(field.label))) {
      return field.value;
    }
  }
  return null;
}

/** Value of one matrix field on the classified bundle. extraction_key wins; otherwise the alias map. */
export function readBundleDocumentValue(
  documents: ClassifiedDocument[],
  spec: MatrixFieldSpec,
): string | null {
  const known = new Set(spec.documentCode ? [spec.documentCode] : []);
  for (const document of documents) {
    const recognized = recognizedTypeOf(document);
    if (documentCodeForRecognizedType(recognized, known) !== spec.documentCode) continue;
    const value = readFieldValue(spec, collectExtractedFields(document));
    if (value) return value;
  }
  return null;
}

export function findUnreadDataPoints(input: {
  documents: ClassifiedDocument[];
  fieldsByDocumentCode: Map<string, MatrixFieldSpec[]>;
  knownDocumentCodes: Set<string>;
  requirementByDocumentCode: Map<string, string>;
  hintedDocumentType?: string | null;
}): UnreadDataPoint[] {
  const documents =
    input.documents.length > 0
      ? input.documents
      : hintedDocument(input.hintedDocumentType, input.knownDocumentCodes);
  const unread: UnreadDataPoint[] = [];
  const seen = new Set<string>();

  const push = (row: UnreadDataPoint) => {
    const key = [
      row.reason,
      row.documentCode || "",
      row.dataPointCode || "",
      row.matrixRef || "",
      row.recognizedType,
    ].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    unread.push(row);
  };

  if (documents.length === 0) {
    push({
      recognizedType: "unclassified",
      documentCode: null,
      documentName: "Unclassified document",
      dataPointCode: null,
      dataPointName: "Document type",
      matrixRef: null,
      requirement: "UNRESOLVED",
      reason: "NO_DOCUMENT_CLASSIFIED",
      pageRef: null,
    });
    return unread;
  }

  for (const document of documents) {
    const recognizedType = recognizedTypeOf(document) || "unclassified";
    const documentCode = documentCodeForRecognizedType(
      recognizedType,
      input.knownDocumentCodes,
    );
    const pageRef = pageRefOf(document);
    if (!documentCode) {
      push({
        recognizedType,
        documentCode: null,
        documentName: String(document.typeLabel || recognizedType || "Unrecognized document"),
        dataPointCode: null,
        dataPointName: "Document type",
        matrixRef: null,
        requirement: "UNRESOLVED",
        reason: "DOCUMENT_TYPE_UNMAPPED",
        pageRef,
      });
      continue;
    }

    const specs = input.fieldsByDocumentCode.get(documentCode) || [];
    const extracted = collectExtractedFields(document);
    const requirement = requirementForDocument(
      documentCode,
      input.requirementByDocumentCode,
    );
    const documentName = specs[0]?.documentName || documentCode;
    for (const spec of specs) {
      if (readFieldValue(spec, extracted)) continue;
      push({
        recognizedType,
        documentCode,
        documentName,
        dataPointCode: spec.dataPointCode,
        dataPointName: spec.dataPointName,
        matrixRef: spec.matrixRef,
        requirement,
        reason: "VALUE_NOT_FOUND",
        pageRef,
      });
    }
  }

  return unread;
}

function hintedDocument(
  hintedDocumentType: string | null | undefined,
  knownDocumentCodes: Set<string>,
): ClassifiedDocument[] {
  const code = documentCodeForRecognizedType(
    String(hintedDocumentType || ""),
    knownDocumentCodes,
  );
  if (!code) return [];
  return [{ type: code, typeLabel: code, fields: {}, entries: {} }];
}
