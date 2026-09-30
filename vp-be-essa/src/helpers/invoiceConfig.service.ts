/**
 * Load active invoice config (SAP mappings + document validation rules)
 * for a given extraction invoice type.
 */
import {
  ApInvoiceConfigVersion,
  ApSapFieldMapping,
  ApDocumentValidationRule,
} from "../models/apInvoiceConfigAssociations";
import { ApExtractionInvoiceType } from "../models/apExtractionInvoiceType";
import { ApExtractionDocument } from "../models/apExtractionDocument";

export type ActiveInvoiceConfig = {
  configVersionId: number;
  invoiceTypeId: number;
  invoiceTypeCode: string;
  versionCode: string;
  sapMappings: ApSapFieldMapping[];
  documentRules: ApDocumentValidationRule[];
};

/** Catalog document name / title → OCR runtime doc type keys used by validation. */
const DOCUMENT_TITLE_TO_RUNTIME_TYPES: Record<string, string[]> = {
  Invoice: ["invoice"],
  "Tax Invoice (VAT)": ["tax_invoice"],
  "Tax Invoice": ["tax_invoice"],
  "Tax Invoice (Faktur Pajak)": ["tax_invoice"],
  "Work Progress Certificate (Berita Acara)": ["berita_acara"],
  "Work Progress Certificate": ["berita_acara"],
  "Berita Acara": ["berita_acara"],
  "Summary Calculation Manhour (Monthly Man-days Summary)": ["manhour_summary"],
  "Summary Calculation Manhour": ["manhour_summary"],
  "Daily Time Sheet": ["timesheet"],
  "Daily Attendance (biometrics)": ["attendance"],
  "Attendance Sheet": ["attendance"],
  PO: ["po"],
  "Purchase Order": ["po"],
  "PO Appendix": ["po_appendix"],
  "Packing List": ["packing_list"],
  "Underlying Contract": ["underlying_contract"],
  "Guarantee Letter (If any)": ["guarantee_letter"],
  "Guarantee Letter": ["guarantee_letter"],
};

export function runtimeDocTypesForRule(rule: {
  DocumentTitle?: string | null;
  document?: { Name?: string | null } | null;
}): string[] {
  const title = String(rule.DocumentTitle || rule.document?.Name || "").trim();
  if (!title) return [];
  if (DOCUMENT_TITLE_TO_RUNTIME_TYPES[title]) {
    return DOCUMENT_TITLE_TO_RUNTIME_TYPES[title];
  }
  // Fuzzy: try known prefixes
  for (const [key, types] of Object.entries(DOCUMENT_TITLE_TO_RUNTIME_TYPES)) {
    if (title.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(title.toLowerCase())) {
      return types;
    }
  }
  return [];
}

export async function loadActiveInvoiceConfigByTypeCode(
  invoiceTypeCode: string,
): Promise<ActiveInvoiceConfig | null> {
  const code = String(invoiceTypeCode || "").trim().toUpperCase();
  if (!code) return null;

  const invoiceType = await ApExtractionInvoiceType.findOne({
    where: { Code: code, IsDeleted: false },
  });
  if (!invoiceType) return null;

  return loadActiveInvoiceConfigByTypeId(invoiceType.InvoiceTypeId, invoiceType.Code);
}

export async function loadActiveInvoiceConfigByTypeId(
  invoiceTypeId: number,
  invoiceTypeCode?: string,
): Promise<ActiveInvoiceConfig | null> {
  const version = await ApInvoiceConfigVersion.findOne({
    where: {
      InvoiceTypeId: invoiceTypeId,
      Status: "Active",
      IsDeleted: false,
    },
    include: [
      {
        model: ApSapFieldMapping,
        as: "sapMappings",
        where: { IsDeleted: false, Status: "Active" },
        required: false,
      },
      {
        model: ApDocumentValidationRule,
        as: "documentRules",
        where: { IsDeleted: false, Status: "Active" },
        required: false,
        include: [
          {
            model: ApExtractionDocument,
            as: "document",
            required: false,
          },
        ],
      },
    ],
  });

  if (!version) return null;

  let typeCode = invoiceTypeCode;
  if (!typeCode) {
    const type = await ApExtractionInvoiceType.findByPk(invoiceTypeId);
    typeCode = type?.Code || String(invoiceTypeId);
  }

  const sapMappings = ([...((version as any).sapMappings || [])] as ApSapFieldMapping[]).sort(
    (a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0),
  );
  const documentRules = ([
    ...((version as any).documentRules || []),
  ] as ApDocumentValidationRule[]).sort(
    (a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0),
  );

  return {
    configVersionId: version.ConfigVersionId,
    invoiceTypeId,
    invoiceTypeCode: typeCode,
    versionCode: version.VersionCode,
    sapMappings,
    documentRules,
  };
}

/** Prefer the resolved type code; fall back to Manpower for legacy PO. */
export async function loadActiveInvoiceConfigForWorkflow(
  workflow: "PO" | "NON_PO" | string | null | undefined,
): Promise<ActiveInvoiceConfig | null> {
  const code = String(workflow || "").trim().toUpperCase();
  if (!code || code === "AUTO" || code === "PO") {
    return loadActiveInvoiceConfigByTypeCode("MANPOWER_SERVICES");
  }
  if (code === "NON_PO") {
    return loadActiveInvoiceConfigByTypeCode("NON_PO");
  }
  return loadActiveInvoiceConfigByTypeCode(code);
}

export async function listActiveDocumentRules(
  configVersionId: number,
): Promise<ApDocumentValidationRule[]> {
  return ApDocumentValidationRule.findAll({
    where: {
      ConfigVersionId: configVersionId,
      IsDeleted: false,
      Status: "Active",
    },
    include: [{ model: ApExtractionDocument, as: "document", required: false }],
    order: [["DisplayOrder", "ASC"]],
  });
}
