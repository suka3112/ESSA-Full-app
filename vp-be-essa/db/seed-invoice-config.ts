/**
 * Seed v1.0 SAP field mappings + document validation rules — idempotent.
 * Usage: npm run seed:invoice-config
 *
 * Prerequisites:
 *   - db/migrations/014_AP_SAP_MAPPING_AND_VALIDATION_RULES_PG.sql
 *   - Extraction catalog seeded (npm run seed:extraction-prompts)
 *
 * Scope: InvoiceTypeId — Manpower Services + Non-PO (recommended plan default).
 */
import { Op } from "sequelize";
import { verifyDBConnection, sequelize } from "../src/config/sequelize";
import {
  ApExtractionInvoiceType,
  ApExtractionDocument,
  ApExtractionField,
  ApExtractionTypeDocument,
} from "../src/models/apExtractionAssociations";
import {
  ApInvoiceConfigVersion,
  ApSapFieldMapping,
  ApDocumentValidationRule,
} from "../src/models/apInvoiceConfigAssociations";
import { CAPTURED_TO_FIELD_NAMES } from "../src/helpers/sapCapturedFieldMap";

const sqlNow = () => sequelize.literal("NOW()");

type SapMappingSeed = {
  capturedFieldCode: string;
  capturedFieldDescription: string;
  sapFieldName: string;
  sapFieldDescription: string;
  validationType: string;
  toleranceType: string;
  toleranceValue: number | null;
  isMandatory: boolean;
};

type DocRuleSeed = {
  documentTitle: string;
  catalogDocumentName: string;
  ruleCode: string;
  ruleName: string;
  checkScope: "AVAILABILITY_CONTENT" | "AVAILABILITY_ONLY";
  isMandatory: boolean;
  missingAction: "BLOCK" | "WARNING";
  contentValidation: boolean;
  workflowImpact: string;
  workflowImpactDetail: string;
};

const BLOCK_HOLD = "Create exception and block workflow until uploaded.";
const BLOCK_HOLD_SHORT = "Exception + Hold";
const WARNING_ONLY = "Create exception";
const WARNING_ONLY_SHORT = "Exception";

const MANPOWER_MAPPINGS: SapMappingSeed[] = [
  { capturedFieldCode: "INV_NO", capturedFieldDescription: "Invoice Number", sapFieldName: "BKPF-XBLNR", sapFieldDescription: "Reference Document", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "INV_DATE", capturedFieldDescription: "Invoice Date", sapFieldName: "BSEG-BLDAT", sapFieldDescription: "Document Date", validationType: "DATE_MATCH", toleranceType: "DAYS", toleranceValue: 3, isMandatory: true },
  { capturedFieldCode: "VENDOR_CODE", capturedFieldDescription: "Vendor Code", sapFieldName: "LFA1-LIFNR", sapFieldDescription: "Vendor Code", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "VENDOR_NAME", capturedFieldDescription: "Vendor Name", sapFieldName: "LFA1-NAME1", sapFieldDescription: "Vendor Name", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "PO_NUMBER", capturedFieldDescription: "PO Number", sapFieldName: "EKKO-EBELN", sapFieldDescription: "Purchasing Document", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "CURRENCY", capturedFieldDescription: "Currency", sapFieldName: "BKPF-WAERS", sapFieldDescription: "Currency Key", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "GROSS_AMT", capturedFieldDescription: "Gross Amount", sapFieldName: "BSEG-WRBTR", sapFieldDescription: "Amount in Document Currency", validationType: "AMOUNT_MATCH", toleranceType: "PERCENT", toleranceValue: 2, isMandatory: true },
  { capturedFieldCode: "TAX_AMT", capturedFieldDescription: "Tax Amount", sapFieldName: "BSEG-WMWST", sapFieldDescription: "Tax Amount", validationType: "AMOUNT_MATCH", toleranceType: "PERCENT", toleranceValue: 2, isMandatory: true },
  { capturedFieldCode: "NET_AMT", capturedFieldDescription: "Net Amount", sapFieldName: "BSEG-DMBTR", sapFieldDescription: "Amount in Local Currency", validationType: "AMOUNT_MATCH", toleranceType: "PERCENT", toleranceValue: 2, isMandatory: true },
  { capturedFieldCode: "DUE_DATE", capturedFieldDescription: "Due Date", sapFieldName: "BSEG-ZFBDT", sapFieldDescription: "Baseline Date for Due Date Calculation", validationType: "DATE_MATCH", toleranceType: "DAYS", toleranceValue: 3, isMandatory: false },
  { capturedFieldCode: "TAX_CODE", capturedFieldDescription: "Tax Code", sapFieldName: "BSEG-MWSKZ", sapFieldDescription: "Tax Code", validationType: "CODE_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "COMPANY_CODE", capturedFieldDescription: "Company Code", sapFieldName: "BKPF-BUKRS", sapFieldDescription: "Company Code", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "COST_CENTER", capturedFieldDescription: "Cost Center", sapFieldName: "BSEG-KOSTL", sapFieldDescription: "Cost Center", validationType: "CODE_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: false },
  { capturedFieldCode: "GL_ACCOUNT", capturedFieldDescription: "G/L Account", sapFieldName: "BSEG-HKONT", sapFieldDescription: "G/L Account", validationType: "CODE_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "PAYMENT_TERM", capturedFieldDescription: "Payment Term", sapFieldName: "BSEG-ZTERM", sapFieldDescription: "Payment Terms", validationType: "LIST_MATCH", toleranceType: "RANGE", toleranceValue: null, isMandatory: false },
  { capturedFieldCode: "BANK_ACCOUNT", capturedFieldDescription: "Bank Account", sapFieldName: "LFBK-BANKN", sapFieldDescription: "Bank Account Number", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "BANK_KEY", capturedFieldDescription: "Bank Key", sapFieldName: "LFBK-BANKL", sapFieldDescription: "Bank Key", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "WHT_AMT", capturedFieldDescription: "Withholding Tax", sapFieldName: "WITH_ITEM-WT_QSSHB", sapFieldDescription: "Withholding Tax Amount", validationType: "AMOUNT_MATCH", toleranceType: "PERCENT", toleranceValue: 2, isMandatory: false },
  { capturedFieldCode: "SES_NO", capturedFieldDescription: "SES Number", sapFieldName: "ESSR-LBLNI", sapFieldDescription: "Entry Sheet Number", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
];

const NON_PO_MAPPINGS: SapMappingSeed[] = [
  { capturedFieldCode: "INV_NO", capturedFieldDescription: "Invoice Number", sapFieldName: "BKPF-XBLNR", sapFieldDescription: "Reference Document", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "INV_DATE", capturedFieldDescription: "Invoice Date", sapFieldName: "BSEG-BLDAT", sapFieldDescription: "Document Date", validationType: "DATE_MATCH", toleranceType: "DAYS", toleranceValue: 3, isMandatory: true },
  { capturedFieldCode: "VENDOR_CODE", capturedFieldDescription: "Vendor Code", sapFieldName: "LFA1-LIFNR", sapFieldDescription: "Vendor Code", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "VENDOR_NAME", capturedFieldDescription: "Vendor Name", sapFieldName: "LFA1-NAME1", sapFieldDescription: "Vendor Name", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "CURRENCY", capturedFieldDescription: "Currency", sapFieldName: "BKPF-WAERS", sapFieldDescription: "Currency Key", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
  { capturedFieldCode: "GROSS_AMT", capturedFieldDescription: "Gross Amount", sapFieldName: "BSEG-WRBTR", sapFieldDescription: "Amount in Document Currency", validationType: "AMOUNT_MATCH", toleranceType: "PERCENT", toleranceValue: 2, isMandatory: true },
  { capturedFieldCode: "TAX_AMT", capturedFieldDescription: "Tax Amount", sapFieldName: "BSEG-WMWST", sapFieldDescription: "Tax Amount", validationType: "AMOUNT_MATCH", toleranceType: "PERCENT", toleranceValue: 2, isMandatory: true },
  { capturedFieldCode: "BANK_ACCOUNT", capturedFieldDescription: "Bank Account", sapFieldName: "LFBK-BANKN", sapFieldDescription: "Bank Account Number", validationType: "EXACT_MATCH", toleranceType: "EXACT", toleranceValue: null, isMandatory: true },
];

const MANPOWER_RULES: DocRuleSeed[] = [
  {
    documentTitle: "Invoice",
    catalogDocumentName: "Invoice",
    ruleCode: "INVOICE_PRESENCE",
    ruleName: "Invoice Presence Check",
    checkScope: "AVAILABILITY_CONTENT",
    isMandatory: true,
    missingAction: "BLOCK",
    contentValidation: true,
    workflowImpact: BLOCK_HOLD_SHORT,
    workflowImpactDetail: BLOCK_HOLD,
  },
  {
    documentTitle: "Tax Invoice (VAT)",
    catalogDocumentName: "Tax Invoice (VAT)",
    ruleCode: "TAX_INVOICE_MATCH_DOC",
    ruleName: "Tax Invoice Match",
    checkScope: "AVAILABILITY_CONTENT",
    isMandatory: true,
    missingAction: "BLOCK",
    contentValidation: true,
    workflowImpact: BLOCK_HOLD_SHORT,
    workflowImpactDetail: BLOCK_HOLD,
  },
  {
    documentTitle: "Work Progress Certificate (Berita Acara)",
    catalogDocumentName: "Work Progress Certificate (Berita Acara)",
    ruleCode: "BERITA_ACARA_COMPLETENESS",
    ruleName: "Berita Acara Completeness",
    checkScope: "AVAILABILITY_CONTENT",
    isMandatory: true,
    missingAction: "WARNING",
    contentValidation: true,
    workflowImpact: WARNING_ONLY_SHORT,
    workflowImpactDetail: WARNING_ONLY,
  },
  {
    documentTitle: "Daily Attendance (biometrics)",
    catalogDocumentName: "Daily Attendance (biometrics)",
    ruleCode: "ATTENDANCE_AVAILABILITY",
    ruleName: "Attendance Sheet Availability",
    checkScope: "AVAILABILITY_ONLY",
    isMandatory: true,
    missingAction: "BLOCK",
    contentValidation: false,
    workflowImpact: BLOCK_HOLD_SHORT,
    workflowImpactDetail: BLOCK_HOLD,
  },
  {
    documentTitle: "Daily Time Sheet",
    catalogDocumentName: "Daily Time Sheet",
    ruleCode: "TIMESHEET_AVAILABILITY",
    ruleName: "Timesheet Availability",
    checkScope: "AVAILABILITY_ONLY",
    isMandatory: true,
    missingAction: "WARNING",
    contentValidation: false,
    workflowImpact: WARNING_ONLY_SHORT,
    workflowImpactDetail: WARNING_ONLY,
  },
  {
    documentTitle: "Summary Calculation Manhour (Monthly Man-days Summary)",
    catalogDocumentName: "Summary Calculation Manhour (Monthly Man-days Summary)",
    ruleCode: "MANHOUR_SUMMARY_CHECK",
    ruleName: "Manhour Summary Check",
    checkScope: "AVAILABILITY_CONTENT",
    isMandatory: true,
    missingAction: "BLOCK",
    contentValidation: true,
    workflowImpact: BLOCK_HOLD_SHORT,
    workflowImpactDetail: BLOCK_HOLD,
  },
  {
    documentTitle: "PO",
    catalogDocumentName: "PO",
    ruleCode: "PO_DOCUMENT_PRESENCE",
    ruleName: "PO Document Presence",
    checkScope: "AVAILABILITY_ONLY",
    isMandatory: true,
    missingAction: "BLOCK",
    contentValidation: false,
    workflowImpact: BLOCK_HOLD_SHORT,
    workflowImpactDetail: BLOCK_HOLD,
  },
  {
    documentTitle: "PO Appendix",
    catalogDocumentName: "PO Appendix",
    ruleCode: "PO_APPENDIX_AVAILABILITY",
    ruleName: "PO Appendix Availability",
    checkScope: "AVAILABILITY_ONLY",
    isMandatory: false,
    missingAction: "WARNING",
    contentValidation: false,
    workflowImpact: WARNING_ONLY_SHORT,
    workflowImpactDetail: WARNING_ONLY,
  },
];

const NON_PO_RULES: DocRuleSeed[] = [
  {
    documentTitle: "Invoice",
    catalogDocumentName: "Invoice",
    ruleCode: "NONPO_INVOICE_PRESENCE",
    ruleName: "Non-PO Invoice Presence",
    checkScope: "AVAILABILITY_CONTENT",
    isMandatory: true,
    missingAction: "BLOCK",
    contentValidation: true,
    workflowImpact: BLOCK_HOLD_SHORT,
    workflowImpactDetail: BLOCK_HOLD,
  },
  {
    documentTitle: "Tax Invoice",
    catalogDocumentName: "Tax Invoice",
    ruleCode: "NONPO_TAX_INVOICE_AVAILABILITY",
    ruleName: "Tax Invoice Availability",
    checkScope: "AVAILABILITY_CONTENT",
    isMandatory: true,
    missingAction: "BLOCK",
    contentValidation: true,
    workflowImpact: BLOCK_HOLD_SHORT,
    workflowImpactDetail: BLOCK_HOLD,
  },
  {
    documentTitle: "Underlying Contract",
    catalogDocumentName: "Underlying Contract",
    ruleCode: "UNDERLYING_CONTRACT_CHECK",
    ruleName: "Contract Document Check",
    checkScope: "AVAILABILITY_ONLY",
    isMandatory: true,
    missingAction: "WARNING",
    contentValidation: false,
    workflowImpact: WARNING_ONLY_SHORT,
    workflowImpactDetail: WARNING_ONLY,
  },
  {
    documentTitle: "Guarantee Letter (If any)",
    catalogDocumentName: "Guarantee Letter (If any)",
    ruleCode: "GUARANTEE_LETTER_AVAILABILITY",
    ruleName: "Guarantee Letter Availability",
    checkScope: "AVAILABILITY_ONLY",
    isMandatory: false,
    missingAction: "WARNING",
    contentValidation: false,
    workflowImpact: WARNING_ONLY_SHORT,
    workflowImpactDetail: WARNING_ONLY,
  },
];

function parseSapTable(sapFieldName: string): string | null {
  const idx = sapFieldName.indexOf("-");
  return idx > 0 ? sapFieldName.slice(0, idx) : null;
}

async function resolveFieldId(
  invoiceTypeId: number,
  capturedFieldCode: string,
): Promise<number | null> {
  const candidates = CAPTURED_TO_FIELD_NAMES[capturedFieldCode] || [
    capturedFieldCode,
    capturedFieldCode.toLowerCase(),
  ];
  const typeDocs = await ApExtractionTypeDocument.findAll({
    where: { InvoiceTypeId: invoiceTypeId, IsDeleted: false },
    attributes: ["TypeDocumentId"],
  });
  const typeDocumentIds = typeDocs.map((d) => d.TypeDocumentId);
  if (typeDocumentIds.length === 0) return null;

  const field = await ApExtractionField.findOne({
    where: {
      TypeDocumentId: { [Op.in]: typeDocumentIds },
      FieldName: { [Op.in]: candidates },
      IsDeleted: false,
    },
    order: [["DisplayOrder", "ASC"]],
  });
  return field?.FieldId ?? null;
}

async function upsertActiveVersion(
  invoiceTypeId: number,
  versionCode: string,
  versionLabel: string,
  effectiveFrom: string,
): Promise<ApInvoiceConfigVersion> {
  // Deactivate other active versions for this type (one-active filtered unique index).
  await ApInvoiceConfigVersion.update(
    { Status: "Inactive", UpdatedAt: sqlNow() },
    {
      where: {
        InvoiceTypeId: invoiceTypeId,
        Status: "Active",
        IsDeleted: false,
        VersionCode: { [Op.ne]: versionCode },
      },
    },
  );

  const existing = await ApInvoiceConfigVersion.findOne({
    where: { InvoiceTypeId: invoiceTypeId, VersionCode: versionCode },
  });
  if (existing) {
    await existing.update({
      VersionLabel: versionLabel,
      EffectiveFrom: effectiveFrom,
      EffectiveTo: null,
      Status: "Active",
      IsDeleted: false,
      UpdatedAt: sqlNow(),
    });
    return existing;
  }

  return ApInvoiceConfigVersion.create({
    InvoiceTypeId: invoiceTypeId,
    VersionCode: versionCode,
    VersionLabel: versionLabel,
    EffectiveFrom: effectiveFrom,
    EffectiveTo: null,
    Status: "Active",
    IsDeleted: false,
  });
}

async function upsertSapMapping(
  configVersionId: number,
  invoiceTypeId: number,
  seed: SapMappingSeed,
  displayOrder: number,
): Promise<void> {
  const fieldId = await resolveFieldId(invoiceTypeId, seed.capturedFieldCode);
  const sapTable = parseSapTable(seed.sapFieldName);
  const existing = await ApSapFieldMapping.findOne({
    where: {
      ConfigVersionId: configVersionId,
      CapturedFieldCode: seed.capturedFieldCode,
    },
  });

  const payload = {
    FieldId: fieldId,
    CapturedFieldDescription: seed.capturedFieldDescription,
    SapTable: sapTable,
    SapFieldName: seed.sapFieldName,
    SapFieldDescription: seed.sapFieldDescription,
    ValidationType: seed.validationType,
    ToleranceType: seed.toleranceType,
    ToleranceValue: seed.toleranceValue,
    ToleranceMin: null as number | null,
    ToleranceMax: null as number | null,
    IsMandatory: seed.isMandatory,
    Status: "Active",
    DisplayOrder: displayOrder,
    IsDeleted: false,
    UpdatedAt: sqlNow(),
  };

  if (existing) {
    await existing.update(payload);
    return;
  }

  await ApSapFieldMapping.create({
    ConfigVersionId: configVersionId,
    CapturedFieldCode: seed.capturedFieldCode,
    ...payload,
    UpdatedAt: null,
  });
}

async function upsertDocumentRule(
  configVersionId: number,
  seed: DocRuleSeed,
  displayOrder: number,
): Promise<void> {
  const document = await ApExtractionDocument.findOne({
    where: { Name: seed.catalogDocumentName, IsDeleted: false },
  });

  const existing = seed.ruleCode
    ? await ApDocumentValidationRule.findOne({
        where: {
          ConfigVersionId: configVersionId,
          RuleCode: seed.ruleCode,
        },
      })
    : null;

  const payload = {
    DocumentId: document?.DocumentId ?? null,
    DocumentTitle: seed.documentTitle,
    RuleCode: seed.ruleCode,
    RuleName: seed.ruleName,
    CheckScope: seed.checkScope,
    IsMandatory: seed.isMandatory,
    MissingAction: seed.missingAction,
    ContentValidation: seed.contentValidation,
    WorkflowImpact: seed.workflowImpact,
    WorkflowImpactDetail: seed.workflowImpactDetail,
    Status: "Active",
    DisplayOrder: displayOrder,
    IsDeleted: false,
    UpdatedAt: sqlNow(),
  };

  if (existing) {
    await existing.update(payload);
    return;
  }

  await ApDocumentValidationRule.create({
    ConfigVersionId: configVersionId,
    ...payload,
    UpdatedAt: null,
  });
}

async function seedInvoiceTypeConfig(
  invoiceTypeCode: string,
  mappings: SapMappingSeed[],
  rules: DocRuleSeed[],
): Promise<void> {
  const invoiceType = await ApExtractionInvoiceType.findOne({
    where: { Code: invoiceTypeCode, IsDeleted: false },
  });
  if (!invoiceType) {
    throw new Error(
      `Invoice type ${invoiceTypeCode} not found. Run seed:extraction-prompts first.`,
    );
  }

  const version = await upsertActiveVersion(
    invoiceType.InvoiceTypeId,
    "v1.0",
    "v1.0 (01-May-2025 - Active)",
    "2025-05-01",
  );
  console.log(
    `  ${invoiceTypeCode}: config version ${version.VersionCode} (id=${version.ConfigVersionId})`,
  );

  for (let i = 0; i < mappings.length; i += 1) {
    await upsertSapMapping(
      version.ConfigVersionId,
      invoiceType.InvoiceTypeId,
      mappings[i],
      i + 1,
    );
  }
  console.log(`    sap mappings: ${mappings.length}`);

  for (let i = 0; i < rules.length; i += 1) {
    await upsertDocumentRule(version.ConfigVersionId, rules[i], i + 1);
  }
  console.log(`    document rules: ${rules.length}`);
}

async function main() {
  console.log("Seeding invoice config (SAP mapping + validation rules)…");
  await verifyDBConnection();

  await seedInvoiceTypeConfig("MANPOWER_SERVICES", MANPOWER_MAPPINGS, MANPOWER_RULES);
  await seedInvoiceTypeConfig("NON_PO", NON_PO_MAPPINGS, NON_PO_RULES);

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
