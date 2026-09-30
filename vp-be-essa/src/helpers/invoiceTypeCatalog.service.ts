/**
 * Assemble the invoice-type catalog JSON posted to the OCR engine on /extract.
 *
 * Document Types per invoice type come from prompt-builder-mockup.html.
 * DB enabled / classification settings overlay that list when a matching
 * document name exists.
 *
 * Extract hard-stop (`mandatory`) starts from Invoice Config rules that are
 * Mandatory + Missing Action = BLOCK. Document Types Optional (isMandatory
 * false) vetoes that hard-stop so extraction continues without the document.
 */
import logger from "../utils/logger";
import extractionPromptConfigService from "./extractionPromptConfig.service";
import {
  loadActiveInvoiceConfigByTypeCode,
  runtimeDocTypesForRule,
} from "./invoiceConfig.service";
import {
  INVOICE_TYPE_CATALOG_GLOBALS,
  INVOICE_TYPE_RESOLUTION_DEFAULTS,
  MOCKUP_DOCUMENTS_BY_TYPE,
  buildMockupDocumentsForType,
  resolveDocumentClassificationDefaults,
} from "./invoiceTypeCatalog.fixture";

export type OcrCatalogDocument = {
  categoryId: string;
  categoryLabel: string;
  enabled: boolean;
  mandatory: boolean;
  splitBehavior: "contiguous" | "scattered";
  classificationHints: string;
};

export type OcrCatalogInvoiceType = {
  invoiceTypeId: string;
  name: string;
  poSeries: string[];
  contentSignals: string;
  documents: OcrCatalogDocument[];
};

export type OcrInvoiceTypeCatalog = {
  confidenceThreshold: number;
  lowConfidenceAction: "manual_review" | "best_guess";
  invoiceTypes: OcrCatalogInvoiceType[];
};

type PromptConfigDocument = {
  code?: string;
  name?: string;
  isEnabled?: boolean;
  isMandatory?: boolean;
  categoryId?: string;
  splitBehavior?: string;
  classificationHints?: string;
};

type PromptConfigInvoiceType = {
  code?: string;
  name?: string;
  documents?: PromptConfigDocument[];
};

type PromptConfigCategory = {
  invoiceTypes?: PromptConfigInvoiceType[];
};

type CatalogDocumentInternal = OcrCatalogDocument & {
  /** Document Types Optional — strip before posting the catalog to OCR. */
  promptOptional?: boolean;
};

function warn(message: string, extra?: Record<string, unknown>) {
  logger.warn(`[invoiceTypeCatalog] ${message}`, extra || {});
}

function normalizeName(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const CATEGORY_ID_ALIASES: Record<string, string> = {
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

function canonicalizeCategoryId(value: unknown): string {
  const id = String(value || "")
    .trim()
    .toLowerCase();
  if (!id || id === "unclassified") return "";
  return CATEGORY_ID_ALIASES[id] || id;
}

function collapsedName(value: string): string {
  return normalizeName(value).replace(/[^a-z0-9]/g, "");
}

function isPoAlias(value: string): boolean {
  const token = collapsedName(value);
  return token === "po" || token === "purchaseorder";
}

function isTaxInvoiceAlias(value: string): boolean {
  const token = collapsedName(value);
  return (
    token.includes("fakturpajak") ||
    token.includes("taxinvoice") ||
    token === "efaktur"
  );
}

function isMandatoryFlag(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const token = value.trim().toLowerCase();
    return token === "true" || token === "1" || token === "yes";
  }
  if (Buffer.isBuffer(value)) return value.length > 0 && value[0] !== 0;
  return Boolean(value);
}

function resolvedDbCategoryId(dbDoc: PromptConfigDocument): string {
  const fromRow = canonicalizeCategoryId(dbDoc.categoryId);
  if (fromRow) return fromRow;
  const defaults = resolveDocumentClassificationDefaults(
    String(dbDoc.code || ""),
    String(dbDoc.name || ""),
  );
  return canonicalizeCategoryId(defaults.categoryId);
}

function overlayCatalogDocument(
  doc: OcrCatalogDocument,
  dbDoc: PromptConfigDocument,
): CatalogDocumentInternal {
  const split =
    dbDoc.splitBehavior === "scattered" || dbDoc.splitBehavior === "contiguous"
      ? dbDoc.splitBehavior
      : doc.splitBehavior;
  const categoryId =
    canonicalizeCategoryId(dbDoc.categoryId) ||
    canonicalizeCategoryId(doc.categoryId) ||
    doc.categoryId;
  return {
    ...doc,
    categoryId,
    enabled:
      dbDoc.isEnabled === undefined ? doc.enabled : Boolean(dbDoc.isEnabled),
    mandatory: false,
    promptOptional: !isMandatoryFlag(dbDoc.isMandatory),
    splitBehavior: split,
    classificationHints:
      dbDoc.classificationHints == null
        ? doc.classificationHints
        : String(dbDoc.classificationHints),
  };
}

function takeMatchingDbDocument(
  unused: PromptConfigDocument[],
  mockup: OcrCatalogDocument,
): PromptConfigDocument | null {
  const mockName = normalizeName(mockup.categoryLabel);
  const nameIdx = unused.findIndex(
    (dbDoc) => normalizeName(String(dbDoc.name || "")) === mockName,
  );
  if (nameIdx >= 0) {
    const [matched] = unused.splice(nameIdx, 1);
    return matched;
  }

  const mockCategoryId = canonicalizeCategoryId(mockup.categoryId);
  const mockIsTax = isTaxInvoiceAlias(mockup.categoryLabel) || mockCategoryId === "faktur_pajak";
  const categoryIdx = unused.findIndex((dbDoc) => {
    const dbCategoryId = resolvedDbCategoryId(dbDoc);
    if (mockCategoryId && dbCategoryId && mockCategoryId === dbCategoryId) return true;
    if (mockIsTax && (dbCategoryId === "faktur_pajak" || isTaxInvoiceAlias(String(dbDoc.name || "")))) {
      return true;
    }
    return false;
  });
  if (categoryIdx >= 0) {
    const [matched] = unused.splice(categoryIdx, 1);
    return matched;
  }
  return null;
}

function mergeDocuments(
  invoiceTypeId: string,
  dbDocuments: PromptConfigDocument[],
): OcrCatalogDocument[] {
  const mockupDocs = buildMockupDocumentsForType(invoiceTypeId);
  const unused = dbDocuments.filter((doc) => doc.name);

  const merged: OcrCatalogDocument[] = mockupDocs.map((doc) => {
    const dbDoc = takeMatchingDbDocument(unused, doc);
    if (dbDoc) return overlayCatalogDocument(doc, dbDoc);
    return doc;
  });

  for (const dbDoc of unused) {
    const defaults = resolveDocumentClassificationDefaults(
      String(dbDoc.code || ""),
      String(dbDoc.name || ""),
    );
    merged.push(
      overlayCatalogDocument(
        {
          categoryId: defaults.categoryId,
          categoryLabel: String(dbDoc.name || defaults.categoryId),
          enabled: dbDoc.isEnabled !== false,
          mandatory: false,
          splitBehavior: defaults.splitBehavior,
          classificationHints: defaults.classificationHints,
        },
        dbDoc,
      ),
    );
  }

  return merged;
}

export async function assembleInvoiceTypeCatalog(): Promise<OcrInvoiceTypeCatalog> {
  const tree = await extractionPromptConfigService.getPromptConfigTree();
  const dbTypes = ((tree?.categories || []) as PromptConfigCategory[]).flatMap(
    (category) => category.invoiceTypes || [],
  );
  const dbByCode = new Map(
    dbTypes
      .filter((type) => type.code)
      .map((type) => [String(type.code).trim().toUpperCase(), type]),
  );

  const typeIds = [
    ...new Set([
      ...Object.keys(MOCKUP_DOCUMENTS_BY_TYPE),
      ...dbByCode.keys(),
    ]),
  ];

  const invoiceTypes: OcrCatalogInvoiceType[] = [];

  for (const invoiceTypeId of typeIds) {
    const dbType = dbByCode.get(invoiceTypeId);
    const overlay =
      INVOICE_TYPE_RESOLUTION_DEFAULTS[invoiceTypeId] || {
        poSeries: [],
        contentSignals: "",
      };
    if (!INVOICE_TYPE_RESOLUTION_DEFAULTS[invoiceTypeId]) {
      warn("no fixture overlay for invoice type — empty poSeries/contentSignals", {
        invoiceTypeId,
      });
    }

    invoiceTypes.push({
      invoiceTypeId,
      name: String(dbType?.name || invoiceTypeId),
      poSeries: overlay.poSeries,
      contentSignals: overlay.contentSignals,
      documents: mergeDocuments(invoiceTypeId, dbType?.documents || []),
    });
  }

  for (const type of invoiceTypes) {
    await applyBlockValidationMandatory(type);
    logger.info(`[invoiceTypeCatalog] ${type.invoiceTypeId} extract hard-stop`, {
      mandatory: type.documents
        .filter((doc) => doc.mandatory)
        .map((doc) => doc.categoryLabel),
      optional: type.documents
        .filter((doc) => !doc.mandatory)
        .map((doc) => doc.categoryLabel),
    });
  }

  if (!invoiceTypes.length) {
    warn("no invoice types to post — catalog is empty");
  }

  return {
    confidenceThreshold: INVOICE_TYPE_CATALOG_GLOBALS.confidenceThreshold,
    lowConfidenceAction: INVOICE_TYPE_CATALOG_GLOBALS.lowConfidenceAction,
    invoiceTypes,
  };
}

function stripCatalogInternals(type: OcrCatalogInvoiceType) {
  for (const doc of type.documents as CatalogDocumentInternal[]) {
    delete doc.promptOptional;
  }
}

async function applyBlockValidationMandatory(type: OcrCatalogInvoiceType) {
  const docs = type.documents as CatalogDocumentInternal[];
  try {
    const config = await loadActiveInvoiceConfigByTypeCode(type.invoiceTypeId);
    const blockRules = (config?.documentRules || []).filter(
      (rule) =>
        Boolean(rule.IsMandatory) &&
        String(rule.MissingAction || "").trim().toUpperCase() === "BLOCK",
    );
    for (const doc of docs) {
      doc.mandatory = false;
    }
    if (!blockRules.length) return;

    const blockTitles = new Set<string>();
    const blockCategoryIds = new Set<string>();
    for (const rule of blockRules) {
      const title = String(
        rule.DocumentTitle ||
          (rule as { document?: { Name?: string } }).document?.Name ||
          "",
      );
      const normalized = normalizeName(title);
      if (normalized) blockTitles.add(normalized);
      if (isPoAlias(title)) {
        blockTitles.add("po");
        blockTitles.add("purchase order");
        blockCategoryIds.add("purchase_order");
      }
      for (const runtimeType of runtimeDocTypesForRule(rule as { DocumentTitle?: string | null; document?: { Name?: string | null } | null })) {
        const categoryId = canonicalizeCategoryId(runtimeType);
        if (categoryId) blockCategoryIds.add(categoryId);
      }
    }

    const optionalCategoryIds = new Set<string>();
    for (const doc of docs) {
      if (!doc.promptOptional) continue;
      const categoryId = canonicalizeCategoryId(doc.categoryId);
      if (categoryId) optionalCategoryIds.add(categoryId);
      if (isTaxInvoiceAlias(doc.categoryLabel)) optionalCategoryIds.add("faktur_pajak");
    }

    for (const doc of docs) {
      const label = normalizeName(doc.categoryLabel);
      const categoryId = canonicalizeCategoryId(doc.categoryId);
      // Optional Document Types win over seeded BLOCK rules, including aliases
      // (Faktur Pajak ↔ Tax Invoice (VAT) share faktur_pajak).
      if (doc.promptOptional) continue;
      if (categoryId && optionalCategoryIds.has(categoryId)) continue;
      if (isTaxInvoiceAlias(doc.categoryLabel) && optionalCategoryIds.has("faktur_pajak")) {
        continue;
      }
      if (
        (label && blockTitles.has(label)) ||
        (categoryId && blockCategoryIds.has(categoryId)) ||
        (isPoAlias(doc.categoryLabel) && blockCategoryIds.has("purchase_order"))
      ) {
        doc.mandatory = true;
      }
    }
  } catch (error) {
    warn("failed to overlay BLOCK validation rules onto catalog mandatory flags", {
      invoiceTypeId: type.invoiceTypeId,
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    stripCatalogInternals(type);
  }
}

function getEnabledCatalogDocuments(type: OcrCatalogInvoiceType | undefined): OcrCatalogDocument[] {
  if (!type) return [];
  const enabled = type.documents.filter((doc) => doc.enabled);
  return enabled.length ? enabled : type.documents;
}

function collectPresentCategoryIds(classification: unknown): Set<string> {
  const present = new Set<string>();
  const add = (value: unknown) => {
    const id = String(value || "")
      .trim()
      .toLowerCase();
    if (!id || id === "unclassified") return;
    present.add(id);
    const canonical = canonicalizeCategoryId(id);
    if (canonical) present.add(canonical);
  };

  const source = (classification || {}) as {
    pages?: Array<{ categoryId?: string; documentType?: string }>;
    categoryGroups?: Array<{ categoryId?: string; documentName?: string }>;
    documents?: Array<{ categoryId?: string; documentType?: string }>;
    categories?:
      | Array<{ categoryId?: string }>
      | Record<string, { categoryId?: string }>;
  };

  for (const page of source.pages || []) {
    add(page.categoryId || page.documentType);
  }
  for (const group of source.categoryGroups || []) {
    add(group.categoryId || group.documentName);
  }
  for (const doc of source.documents || []) {
    add(doc.categoryId || doc.documentType);
  }
  const categories = Array.isArray(source.categories)
    ? source.categories
    : Object.values(source.categories || {});
  for (const cat of categories) {
    add(cat?.categoryId);
  }
  return present;
}

function resolveCatalogInvoiceTypeId(
  catalog: OcrInvoiceTypeCatalog | null | undefined,
  invoiceTypeId: string | null | undefined,
): string {
  const raw = String(invoiceTypeId || "")
    .trim()
    .toUpperCase();
  if (!raw || raw === "AUTO") return "";
  if (raw === "PO") return "MANPOWER_SERVICES";
  if ((catalog?.invoiceTypes || []).some((row) => row.invoiceTypeId === raw)) {
    return raw;
  }
  return raw;
}

export function findMissingMandatoryDocuments(
  catalog: OcrInvoiceTypeCatalog | null | undefined,
  invoiceTypeId: string | null | undefined,
  classification: unknown,
): OcrCatalogDocument[] {
  const id = resolveCatalogInvoiceTypeId(catalog, invoiceTypeId);
  const type = (catalog?.invoiceTypes || []).find(
    (row) => row.invoiceTypeId === id,
  );
  const mandatory = getEnabledCatalogDocuments(type).filter((doc) => doc.mandatory);
  if (!mandatory.length) return [];

  const present = collectPresentCategoryIds(classification);
  return mandatory.filter((doc) => {
    const categoryId = canonicalizeCategoryId(doc.categoryId);
    return Boolean(categoryId) && !present.has(categoryId);
  });
}

export function buildMissingMandatoryExtractPayload(
  ocrData: Record<string, unknown> | null | undefined,
  missing: OcrCatalogDocument[],
): Record<string, unknown> {
  const listed = missing.map((doc) => ({
    categoryId: doc.categoryId,
    categoryLabel: doc.categoryLabel,
  }));
  const labels = listed.map((doc) => doc.categoryLabel || doc.categoryId);
  const meta =
    ocrData?.meta && typeof ocrData.meta === "object"
      ? (ocrData.meta as Record<string, unknown>)
      : {};

  return {
    status: "missing_mandatory_documents",
    missingMandatoryDocuments: listed,
    classification: ocrData?.classification || null,
    split: null,
    documents: [],
    validation: null,
    meta: {
      ...meta,
      missingMandatoryDocuments: listed,
      missingMandatoryLabels: labels,
    },
  };
}

export async function assembleExtractionPromptMap(): Promise<Record<string, string>> {
  return extractionPromptConfigService.getPromptTextMap();
}
