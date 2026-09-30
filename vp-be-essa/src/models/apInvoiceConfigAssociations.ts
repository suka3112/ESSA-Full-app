/**
 * Wire SAP mapping / document validation-rule associations.
 * Soft deletes are application-level — no onDelete CASCADE.
 */
import { ApExtractionInvoiceType } from "./apExtractionInvoiceType";
import { ApExtractionDocument } from "./apExtractionDocument";
import { ApExtractionField } from "./apExtractionField";
import { ApInvoiceConfigVersion } from "./apInvoiceConfigVersion";
import { ApSapFieldMapping } from "./apSapFieldMapping";
import { ApDocumentValidationRule } from "./apDocumentValidationRule";
import { ApValidationResult } from "./apValidationResult";
import { ApValidationRun } from "./apValidationRun";

// Ensure base extraction associations are registered when this module is imported alone.
import "./apExtractionAssociations";

ApExtractionInvoiceType.hasMany(ApInvoiceConfigVersion, {
  foreignKey: "InvoiceTypeId",
  as: "configVersions",
});
ApInvoiceConfigVersion.belongsTo(ApExtractionInvoiceType, {
  foreignKey: "InvoiceTypeId",
  as: "invoiceType",
});

ApInvoiceConfigVersion.hasMany(ApSapFieldMapping, {
  foreignKey: "ConfigVersionId",
  as: "sapMappings",
});
ApSapFieldMapping.belongsTo(ApInvoiceConfigVersion, {
  foreignKey: "ConfigVersionId",
  as: "configVersion",
});

ApExtractionField.hasMany(ApSapFieldMapping, {
  foreignKey: "FieldId",
  as: "sapMappings",
});
ApSapFieldMapping.belongsTo(ApExtractionField, {
  foreignKey: "FieldId",
  as: "extractionField",
});

ApInvoiceConfigVersion.hasMany(ApDocumentValidationRule, {
  foreignKey: "ConfigVersionId",
  as: "documentRules",
});
ApDocumentValidationRule.belongsTo(ApInvoiceConfigVersion, {
  foreignKey: "ConfigVersionId",
  as: "configVersion",
});

ApExtractionDocument.hasMany(ApDocumentValidationRule, {
  foreignKey: "DocumentId",
  as: "validationRules",
});
ApDocumentValidationRule.belongsTo(ApExtractionDocument, {
  foreignKey: "DocumentId",
  as: "document",
});

ApInvoiceConfigVersion.hasMany(ApValidationResult, {
  foreignKey: "ConfigVersionId",
  as: "validationResults",
});
ApValidationResult.belongsTo(ApInvoiceConfigVersion, {
  foreignKey: "ConfigVersionId",
  as: "configVersion",
});

ApSapFieldMapping.hasMany(ApValidationResult, {
  foreignKey: "MappingId",
  as: "validationResults",
});
ApValidationResult.belongsTo(ApSapFieldMapping, {
  foreignKey: "MappingId",
  as: "sapMapping",
});

ApDocumentValidationRule.hasMany(ApValidationResult, {
  foreignKey: "DocumentRuleId",
  as: "validationResults",
});
ApValidationResult.belongsTo(ApDocumentValidationRule, {
  foreignKey: "DocumentRuleId",
  as: "documentRule",
});

ApInvoiceConfigVersion.hasMany(ApValidationRun, {
  foreignKey: "ConfigVersionId",
  as: "validationRuns",
});
ApValidationRun.belongsTo(ApInvoiceConfigVersion, {
  foreignKey: "ConfigVersionId",
  as: "configVersion",
});

ApValidationRun.hasMany(ApValidationResult, {
  foreignKey: "ValidationRunId",
  as: "validationResults",
});
ApValidationResult.belongsTo(ApValidationRun, {
  foreignKey: "ValidationRunId",
  as: "validationRun",
});

export {
  ApInvoiceConfigVersion,
  ApSapFieldMapping,
  ApDocumentValidationRule,
  ApValidationResult,
  ApValidationRun,
  ApExtractionInvoiceType,
  ApExtractionDocument,
  ApExtractionField,
};
