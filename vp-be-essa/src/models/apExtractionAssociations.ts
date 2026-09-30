/**
 * Wire extraction-prompt associations.
 * Import this module once from services/seeds that need eager loading.
 * Soft deletes are application-level — no onDelete CASCADE.
 */
import { ApExtractionCategory } from "./apExtractionCategory";
import { ApExtractionInvoiceType } from "./apExtractionInvoiceType";
import { ApExtractionDocument } from "./apExtractionDocument";
import { ApExtractionTypeDocument } from "./apExtractionTypeDocument";
import { ApExtractionField } from "./apExtractionField";
import { ApExtractionPromptTemplate } from "./apExtractionPromptTemplate";

ApExtractionCategory.hasMany(ApExtractionInvoiceType, {
  foreignKey: "CategoryId",
  as: "invoiceTypes",
});
ApExtractionInvoiceType.belongsTo(ApExtractionCategory, {
  foreignKey: "CategoryId",
  as: "category",
});

ApExtractionInvoiceType.hasMany(ApExtractionTypeDocument, {
  foreignKey: "InvoiceTypeId",
  as: "typeDocuments",
});
ApExtractionTypeDocument.belongsTo(ApExtractionInvoiceType, {
  foreignKey: "InvoiceTypeId",
  as: "invoiceType",
});

ApExtractionDocument.hasMany(ApExtractionTypeDocument, {
  foreignKey: "DocumentId",
  as: "typeDocuments",
});
ApExtractionTypeDocument.belongsTo(ApExtractionDocument, {
  foreignKey: "DocumentId",
  as: "document",
});

ApExtractionTypeDocument.hasMany(ApExtractionField, {
  foreignKey: "TypeDocumentId",
  as: "fields",
});
ApExtractionField.belongsTo(ApExtractionTypeDocument, {
  foreignKey: "TypeDocumentId",
  as: "typeDocument",
});

ApExtractionInvoiceType.hasOne(ApExtractionPromptTemplate, {
  foreignKey: "InvoiceTypeId",
  as: "promptTemplate",
});
ApExtractionPromptTemplate.belongsTo(ApExtractionInvoiceType, {
  foreignKey: "InvoiceTypeId",
  as: "invoiceType",
});

export {
  ApExtractionCategory,
  ApExtractionInvoiceType,
  ApExtractionDocument,
  ApExtractionTypeDocument,
  ApExtractionField,
  ApExtractionPromptTemplate,
};
