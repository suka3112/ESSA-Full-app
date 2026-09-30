/**
 * Seed Manpower Services PromptConfig fields from ocr-demo / Amanah MPO mapping
 * and save a generated prompt template.
 *
 * Usage: npm run seed:manpower-extraction-hints
 *
 * Prerequisites:
 *   db/migrations/013_AP_EXTRACTION_PROMPT_TEMPLATES_PG.sql
 *   npm run seed:extraction-prompts
 */
import { Op } from "sequelize";
import { verifyDBConnection, sequelize } from "../src/config/sequelize";
import {
  ApExtractionInvoiceType,
  ApExtractionDocument,
  ApExtractionTypeDocument,
  ApExtractionField,
  ApExtractionPromptTemplate,
  ApExtractionCategory,
} from "../src/models/apExtractionAssociations";
import {
  MANPOWER_SERVICES_OCR_DEMO_DOCUMENTS,
  enrichPromptWithDocumentRules,
} from "./data/manpowerServicesOcrDemoHints";
import { buildExtractionPromptText } from "../src/helpers/extractionPromptConfig.service";

const sqlNow = () => sequelize.literal("NOW()");

async function main() {
  console.log(
    "Seeding Manpower Services extraction hints (Amanah MPO / ocr-demo mapping)…",
  );
  await verifyDBConnection();

  const invoiceType = await ApExtractionInvoiceType.findOne({
    where: { Code: "MANPOWER_SERVICES", IsDeleted: false },
    include: [
      {
        model: ApExtractionCategory,
        as: "category",
        required: false,
      },
    ],
  });
  if (!invoiceType) {
    throw new Error(
      'Invoice type MANPOWER_SERVICES not found. Run "npm run seed:extraction-prompts" first.',
    );
  }

  const category = invoiceType.get("category") as
    | ApExtractionCategory
    | undefined;
  const categoryName = category?.Name || "PO";

  let displayOrder = 0;
  for (const docSeed of MANPOWER_SERVICES_OCR_DEMO_DOCUMENTS) {
    displayOrder += 1;
    const catalogDoc = await ApExtractionDocument.findOne({
      where: {
        IsDeleted: false,
        [Op.or]: [
          { Code: docSeed.documentCode },
          { Name: docSeed.documentName },
        ],
      },
    });
    if (!catalogDoc) {
      console.warn(
        `  skip missing catalog document ${docSeed.documentCode} / ${docSeed.documentName}`,
      );
      continue;
    }

    let typeDoc = await ApExtractionTypeDocument.findOne({
      where: {
        InvoiceTypeId: invoiceType.InvoiceTypeId,
        DocumentId: catalogDoc.DocumentId,
      },
    });

    if (!typeDoc) {
      typeDoc = await ApExtractionTypeDocument.create({
        InvoiceTypeId: invoiceType.InvoiceTypeId,
        DocumentId: catalogDoc.DocumentId,
        IsEnabled: docSeed.isEnabled,
        DisplayOrder: displayOrder,
        IsDeleted: false,
      });
    } else {
      await typeDoc.update({
        IsEnabled: docSeed.isEnabled,
        DisplayOrder: displayOrder,
        IsDeleted: false,
        UpdatedAt: sqlNow(),
      });
    }

    await ApExtractionField.update(
      { IsDeleted: true, UpdatedAt: sqlNow() },
      {
        where: {
          TypeDocumentId: typeDoc.TypeDocumentId,
          IsDeleted: false,
        },
      },
    );

    for (let i = 0; i < docSeed.fields.length; i += 1) {
      const f = docSeed.fields[i];
      await ApExtractionField.create({
        TypeDocumentId: typeDoc.TypeDocumentId,
        FieldName: f.fieldName,
        DisplayName: f.displayName || null,
        Hint: f.hint,
        DisplayOrder: i + 1,
        IsDeleted: false,
      });
    }

    console.log(
      `  ${docSeed.documentName}: enabled=${docSeed.isEnabled}, fields=${docSeed.fields.length}`,
    );
  }

  const typeDocs = await ApExtractionTypeDocument.findAll({
    where: {
      InvoiceTypeId: invoiceType.InvoiceTypeId,
      IsDeleted: false,
    },
    include: [
      { model: ApExtractionDocument, as: "document", required: false },
      { model: ApExtractionField, as: "fields", required: false },
    ],
  });

  const documentsForPrompt = typeDocs
    .slice()
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
    .map((td) => {
      const doc = td.get("document") as ApExtractionDocument | undefined;
      const fields = ((td.get("fields") as ApExtractionField[]) || [])
        .filter((f) => !f.IsDeleted)
        .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
        .map((f) => ({ fieldName: f.FieldName, hint: f.Hint }));
      return {
        name: doc?.Name || "",
        isEnabled: Boolean(td.IsEnabled),
        fields,
      };
    });

  let promptText = buildExtractionPromptText({
    categoryName,
    invoiceTypeName: invoiceType.Name,
    documents: documentsForPrompt,
  });

  promptText = enrichPromptWithDocumentRules(
    promptText,
    MANPOWER_SERVICES_OCR_DEMO_DOCUMENTS.filter((d) => d.isEnabled).map(
      (d) => ({
        name: d.documentName,
        rules: d.documentRules,
      }),
    ),
  );

  const existing = await ApExtractionPromptTemplate.findOne({
    where: { InvoiceTypeId: invoiceType.InvoiceTypeId },
  });
  if (existing) {
    await existing.update({
      PromptText: promptText,
      IsManuallyEdited: false,
      IsDeleted: false,
      UpdatedAt: sqlNow(),
    });
  } else {
    await ApExtractionPromptTemplate.create({
      InvoiceTypeId: invoiceType.InvoiceTypeId,
      PromptText: promptText,
      IsManuallyEdited: false,
      IsDeleted: false,
    });
  }

  console.log(
    `  saved MANPOWER_SERVICES prompt template (${promptText.length} chars, isManuallyEdited=false)`,
  );
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
