import { createHash } from "crypto";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import {
  ApExtractionCategory,
  ApExtractionInvoiceType,
  ApExtractionDocument,
  ApExtractionTypeDocument,
  ApExtractionField,
  ApExtractionPromptTemplate,
} from "../models/apExtractionAssociations";

const toId = (value: unknown): number => Number(value);

const notDeleted = { IsDeleted: false };

/** Use DB clock so timestamp literals stay dialect-safe (Postgres NOW()). */
const sqlNow = () => sequelize.literal("NOW()");

/** Stable fingerprint of one document's field config (for per-doc staleness). */
export function computeDocumentConfigHash(input: {
  documentCode: string;
  fields: Array<{
    fieldName?: string | null;
    displayName?: string | null;
    hint?: string | null;
  }>;
}): string {
  const payload = {
    documentCode: String(input.documentCode || "").trim().toUpperCase(),
    fields: (input.fields || []).map((f) => ({
      name: String(f.fieldName || "").trim(),
      displayName: String(f.displayName || "").trim(),
      hint: String(f.hint || "").trim(),
    })),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

/** Map Prompt Config document codes → OCR classifier categoryId slugs. */
export const DOCUMENT_CODE_TO_OCR_TYPE: Record<string, string> = {
  INVOICE: "invoice",
  TAX_INVOICE: "faktur_pajak",
  TAX_INVOICE_VAT: "faktur_pajak",
  BERITA_ACARA: "berita_acara",
  SUMMARY_CALCULATION_MANHOUR: "summary_calculation_manhour",
  MANHOUR_SUMMARY: "summary_calculation_manhour",
  TIMESHEET: "daily_timesheet",
  DAILY_TIME_SHEET: "daily_timesheet",
  ATTENDANCE: "daily_attendance",
  ATTENDANCE_LIST: "daily_attendance",
  DAILY_ATTENDANCE: "daily_attendance",
  PURCHASE_ORDER: "purchase_order",
  PO: "purchase_order",
  PO_APPENDIX: "purchase_order_appendix",
  SES: "service_entry_sheet",
  NOTICE_LETTER: "notice_letter",
  LISTING_INVOICES: "listing_invoices",
  UNDERLYING_CONTRACT: "underlying_contract",
  GUARANTEE_LETTER: "guarantee_letter",
  ROOM_RESERVATION_FORM: "room_reservation_form",
};

/** Legacy persist/validation slugs that still appear on stored documents. */
const OCR_TYPE_LEGACY_ALIASES: Record<string, string[]> = {
  daily_timesheet: ["timesheet"],
  purchase_order: ["po"],
  summary_calculation_manhour: ["manhour_summary"],
  daily_attendance: ["attendance"],
  purchase_order_appendix: ["po_appendix"],
  faktur_pajak: ["tax_invoice"],
  service_entry_sheet: ["ses"],
};

export function resolveOcrDocumentTypeFromCode(code: string): string {
  const key = String(code || "").trim().toUpperCase();
  if (DOCUMENT_CODE_TO_OCR_TYPE[key]) return DOCUMENT_CODE_TO_OCR_TYPE[key];
  return key.toLowerCase().replace(/\s+/g, "_");
}

/** Build a stable catalog code from a human document name. */
export function slugifyDocumentCode(name: string): string {
  const base = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || "CUSTOM_DOCUMENT";
}

export function buildExtractionPromptText(input: {
  categoryName: string;
  invoiceTypeName: string;
  documents: Array<{
    name: string;
    isEnabled: boolean;
    fields: Array<{ fieldName: string; hint?: string | null }>;
  }>;
}): string {
  const activeDocs = input.documents.filter((d) => d.isEnabled);
  const lines = [
    `You are extracting structured data from documents belonging to a "${input.invoiceTypeName}" invoice (${input.categoryName}).`,
    "",
    "Scan the ENTIRE page (header, body tables, passenger/ticket detail blocks, bank footer, signature).",
    "Match labels by meaning (English / Bahasa Indonesia). Preserve printed values exactly (including thousand separators).",
    "Never invent values. Use null when a field is not present after a full-page scan.",
    "",
  ];

  if (activeDocs.length === 0) {
    lines.push(
      "No documents selected yet — toggle on the documents you want this prompt to cover.",
    );
    return lines.join("\n");
  }

  const isEntryField = (name: string) =>
    /^(invoiceLineItems|lineItems|manpower|manhourSummary|timesheetEntries|timesheets|attendanceEntries|poLineItems|appendixItems|transmittalItems|progressLineItems|classifications)$/i.test(
      String(name || "").trim(),
    );

  for (const doc of activeDocs) {
    const fields = doc.fields || [];
    const scalars = fields.filter((f) => !isEntryField(f.fieldName));
    const entries = fields.filter((f) => isEntryField(f.fieldName));

    lines.push(`## ${doc.name}`);
    lines.push("### header (scalars — put all of these under JSON key \"header\")");
    if (scalars.length === 0) {
      lines.push("- (no scalar fields defined yet)");
    } else {
      for (const f of scalars) {
        const name = String(f.fieldName || "").trim() || "{{field}}";
        const hint = String(f.hint || "").trim();
        lines.push(`- ${name}${hint ? `  // ${hint}` : ""}`);
      }
    }

    if (entries.length > 0) {
      lines.push("");
      lines.push("### entries (arrays at JSON top level)");
      for (const f of entries) {
        const name = String(f.fieldName || "").trim() || "{{field}}";
        const hint = String(f.hint || "").trim();
        lines.push(`- ${name}${hint ? `  // ${hint}` : ""}`);
      }
    } else {
      lines.push("");
      lines.push(
        '### entries',
        '- invoiceLineItems  // array of row objects with description, quantity, unitPrice, amount, and any travel keys also present in header',
      );
    }
    lines.push("");
  }

  lines.push(
    "OUTPUT RULES:",
    '1. Return ONE JSON object with top-level keys: "header", "invoiceLineItems", "lineItems".',
    "2. Do NOT wrap fields under the document section title (e.g. do not return { \"Invoice\": { ... } }).",
    "3. Put every scalar field listed above inside header with the exact key names; null if absent.",
    "4. Mirror invoiceLineItems into lineItems (identical rows/order).",
    "5. Do NOT put summary/tax rows (Subtotal, Total, VAT/PPN, Grand Total) inside invoiceLineItems — map those to header.subtotal / vatAmount / totalAmount / grandTotal.",
    "6. Travel / ticket agency invoices: copy passengerName, ticketClass, routeFrom, routeTo, bookingRef (Confirm No / PNR), ticketNo, airline, flightNo, routeCodeFrom, routeCodeTo into header AND into invoiceLineItems[0] when a passenger/ticket detail block exists.",
    "7. Bank lines like \"Bank BCA : 6970747999\" → bankName + bankAccountNumber (split carefully).",
    "8. For Non-PO invoices with no printed contract/PO reference, header.poNumber must be null.",
    "",
    "Example shape:",
    "{",
    '  "header": { "invNo": null, "vendorName": null, "bookingRef": null, "vatAmount": null, "grandTotal": null },',
    '  "invoiceLineItems": [{ "description": null, "quantity": null, "unitPrice": null, "amount": null, "passengerName": null, "bookingRef": null }],',
    '  "lineItems": [{ "description": null, "quantity": null, "unitPrice": null, "amount": null, "passengerName": null, "bookingRef": null }]',
    "}",
  );

  return lines.join("\n");
}

function mapField(field: ApExtractionField) {
  return {
    fieldId: toId(field.FieldId),
    fieldName: field.FieldName,
    displayName: field.DisplayName ?? "",
    hint: field.Hint ?? "",
    displayOrder: field.DisplayOrder,
  };
}

function normalizeSplitBehavior(value: unknown): "contiguous" | "scattered" | null {
  const token = String(value || "")
    .trim()
    .toLowerCase();
  if (token === "scattered") return "scattered";
  if (token === "contiguous") return "contiguous";
  return null;
}

function normalizeOcrCategoryId(value: unknown): string | null {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
  return slug || null;
}

function mapTypeDocument(td: ApExtractionTypeDocument) {
  const doc = td.get("document") as ApExtractionDocument | undefined;
  const fields = ((td.get("fields") as ApExtractionField[]) || [])
    .filter((f) => !f.IsDeleted)
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
    .map(mapField);
  const code = doc?.Code ?? "";
  const splitBehavior = normalizeSplitBehavior(td.SplitBehavior);

  return {
    typeDocumentId: toId(td.TypeDocumentId),
    documentId: toId(td.DocumentId),
    code,
    name: doc?.Name ?? "",
    isEnabled: Boolean(td.IsEnabled),
    isMandatory: Boolean(td.IsMandatory),
    categoryId: td.OcrCategoryId || undefined,
    splitBehavior: splitBehavior || undefined,
    classificationHints:
      td.ClassificationHints == null ? undefined : String(td.ClassificationHints),
    displayOrder: td.DisplayOrder,
    ocrDocumentType: resolveOcrDocumentTypeFromCode(code),
    configHash: computeDocumentConfigHash({
      documentCode: code,
      fields: fields.map((f) => ({
        fieldName: f.fieldName,
        displayName: f.displayName,
        hint: f.hint,
      })),
    }),
    fields,
  };
}

function mapPromptTemplate(tpl: ApExtractionPromptTemplate | null | undefined) {
  if (!tpl || tpl.IsDeleted) return null;
  return {
    promptTemplateId: toId(tpl.PromptTemplateId),
    promptText: tpl.PromptText ?? "",
    isManuallyEdited: Boolean(tpl.IsManuallyEdited),
  };
}

function mapInvoiceType(type: ApExtractionInvoiceType, categoryName: string) {
  const typeDocs = ((type.get("typeDocuments") as ApExtractionTypeDocument[]) || [])
    .filter((td) => !td.IsDeleted)
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
    .map(mapTypeDocument);

  const prompt = mapPromptTemplate(
    type.get("promptTemplate") as ApExtractionPromptTemplate | undefined,
  );

  return {
    invoiceTypeId: toId(type.InvoiceTypeId),
    code: type.Code,
    name: type.Name,
    displayOrder: type.DisplayOrder,
    categoryName,
    documents: typeDocs,
    promptTemplate: prompt,
  };
}

const typeInclude = [
  {
    model: ApExtractionTypeDocument,
    as: "typeDocuments",
    where: notDeleted,
    required: false,
    include: [
      {
        model: ApExtractionDocument,
        as: "document",
        where: notDeleted,
        required: false,
      },
      {
        model: ApExtractionField,
        as: "fields",
        where: notDeleted,
        required: false,
      },
    ],
  },
  {
    model: ApExtractionPromptTemplate,
    as: "promptTemplate",
    where: notDeleted,
    required: false,
  },
];

class ExtractionPromptConfigService {
  async getPromptConfigTree() {
    const categories = await ApExtractionCategory.findAll({
      where: notDeleted,
      include: [
        {
          model: ApExtractionInvoiceType,
          as: "invoiceTypes",
          where: notDeleted,
          required: false,
          include: typeInclude,
        },
      ],
    });

    return {
      categories: categories
        .slice()
        .sort((a, b) => toId(a.CategoryId) - toId(b.CategoryId))
        .map((cat) => {
        const types = ((cat.get("invoiceTypes") as ApExtractionInvoiceType[]) || [])
          .filter((t) => !t.IsDeleted)
          .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
          .map((t) => mapInvoiceType(t, cat.Name));

        return {
          categoryId: toId(cat.CategoryId),
          code: cat.Code,
          name: cat.Name,
          invoiceTypes: types,
        };
      }),
    };
  }

  async getInvoiceTypeDetail(invoiceTypeId: number) {
    const type = await ApExtractionInvoiceType.findOne({
      where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
      include: [
        {
          model: ApExtractionCategory,
          as: "category",
          where: notDeleted,
          required: false,
        },
        ...typeInclude,
      ],
    });

    if (!type) {
      throw new APIError("Invoice type not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const category = type.get("category") as ApExtractionCategory | undefined;
    return mapInvoiceType(type, category?.Name ?? "");
  }

  async upsertDocuments(
    invoiceTypeId: number,
    documents: Array<{
      typeDocumentId: number;
      isEnabled?: boolean;
      isMandatory?: boolean;
      categoryId?: string | null;
      splitBehavior?: string | null;
      classificationHints?: string | null;
      displayOrder?: number;
      fields?: Array<{
        fieldId?: number | null;
        fieldName: string;
        displayName?: string | null;
        hint?: string | null;
        displayOrder?: number;
      }>;
    }>,
    userId?: number | null,
  ) {
    const type = await ApExtractionInvoiceType.findOne({
      where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
    });
    if (!type) {
      throw new APIError("Invoice type not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    await sequelize.transaction(async (transaction) => {
      for (const doc of documents || []) {
        const typeDoc = await ApExtractionTypeDocument.findOne({
          where: {
            TypeDocumentId: doc.typeDocumentId,
            InvoiceTypeId: invoiceTypeId,
            ...notDeleted,
          },
          transaction,
        });
        if (!typeDoc) {
          throw new APIError(
            `Type document ${doc.typeDocumentId} not found for invoice type`,
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }

        await typeDoc.update(
          {
            IsEnabled:
              doc.isEnabled === undefined ? typeDoc.IsEnabled : Boolean(doc.isEnabled),
            IsMandatory:
              doc.isMandatory === undefined
                ? typeDoc.IsMandatory
                : Boolean(doc.isMandatory),
            OcrCategoryId:
              doc.categoryId === undefined
                ? typeDoc.OcrCategoryId
                : normalizeOcrCategoryId(doc.categoryId),
            SplitBehavior:
              doc.splitBehavior === undefined
                ? typeDoc.SplitBehavior
                : normalizeSplitBehavior(doc.splitBehavior),
            ClassificationHints:
              doc.classificationHints === undefined
                ? typeDoc.ClassificationHints
                : String(doc.classificationHints ?? ""),
            DisplayOrder:
              doc.displayOrder === undefined
                ? typeDoc.DisplayOrder
                : Number(doc.displayOrder),
            UpdatedAt: sqlNow(),
            UpdatedBy: userId ?? null,
          },
          { transaction },
        );

        if (!Array.isArray(doc.fields)) continue;

        const incomingIds = doc.fields
          .map((f) => (f.fieldId != null ? Number(f.fieldId) : null))
          .filter((id): id is number => id != null && !Number.isNaN(id));

        const existingFields = await ApExtractionField.findAll({
          where: { TypeDocumentId: typeDoc.TypeDocumentId, ...notDeleted },
          transaction,
        });

        for (const existing of existingFields) {
          if (!incomingIds.includes(toId(existing.FieldId))) {
            await existing.update(
              {
                IsDeleted: true,
                UpdatedAt: sqlNow(),
                UpdatedBy: userId ?? null,
              },
              { transaction },
            );
          }
        }

        for (let i = 0; i < doc.fields.length; i += 1) {
          const field = doc.fields[i];
          const displayOrder =
            field.displayOrder !== undefined ? Number(field.displayOrder) : i + 1;
          const fieldName =
            String(field.fieldName || "").trim() || "{{field}}";
          const displayName =
            field.displayName != null ? String(field.displayName).trim() : "";
          const hint = field.hint != null ? String(field.hint) : null;

          if (field.fieldId != null && !Number.isNaN(Number(field.fieldId))) {
            const existing = existingFields.find(
              (f) => toId(f.FieldId) === Number(field.fieldId),
            );
            if (existing) {
              await existing.update(
                {
                  FieldName: fieldName,
                  DisplayName: displayName || null,
                  Hint: hint,
                  DisplayOrder: displayOrder,
                  UpdatedAt: sqlNow(),
                  UpdatedBy: userId ?? null,
                  IsDeleted: false,
                },
                { transaction },
              );
              continue;
            }
          }

          await ApExtractionField.create(
            {
              TypeDocumentId: typeDoc.TypeDocumentId,
              FieldName: fieldName,
              DisplayName: displayName || null,
              Hint: hint,
              DisplayOrder: displayOrder,
              IsDeleted: false,
              CreatedBy: userId ?? null,
            },
            { transaction },
          );
        }
      }
    });

    return this.getInvoiceTypeDetail(invoiceTypeId);
  }

  /**
   * Create a custom document for an invoice type (catalog row + type-document link).
   * Reuses an existing catalog document by name when present; never duplicates the link.
   */
  async createDocumentForInvoiceType(
    invoiceTypeId: number,
    input: { name: string; isEnabled?: boolean; isMandatory?: boolean },
    userId?: number | null,
  ) {
    const type = await ApExtractionInvoiceType.findOne({
      where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
    });
    if (!type) {
      throw new APIError("Invoice type not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const name = String(input.name || "").trim();
    if (!name) {
      throw new APIError("Document name is required", StatusCodeEnum.HTTP_BAD_REQUEST);
    }
    if (name.length > 200) {
      throw new APIError(
        "Document name must be 200 characters or fewer",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const isEnabled = input.isEnabled === undefined ? true : Boolean(input.isEnabled);
    const isMandatory = Boolean(input.isMandatory);

    await sequelize.transaction(async (transaction) => {
      let catalog = await ApExtractionDocument.findOne({
        where: { Name: name },
        transaction,
      });

      if (catalog?.IsDeleted) {
        await catalog.update(
          {
            IsDeleted: false,
            UpdatedAt: sqlNow(),
            UpdatedBy: userId ?? null,
          },
          { transaction },
        );
      }

      if (!catalog) {
        const baseCode = slugifyDocumentCode(name);
        let code = baseCode;
        for (let suffix = 2; suffix <= 999; suffix += 1) {
          const clash = await ApExtractionDocument.findOne({
            where: { Code: code },
            transaction,
          });
          if (!clash) break;
          const suffixText = `_${suffix}`;
          code = `${baseCode.slice(0, Math.max(1, 50 - suffixText.length))}${suffixText}`;
          if (suffix === 999) {
            throw new APIError(
              "Unable to allocate a unique document code",
              StatusCodeEnum.HTTP_CONFLICT,
            );
          }
        }

        catalog = await ApExtractionDocument.create(
          {
            Code: code,
            Name: name,
            IsDeleted: false,
            CreatedBy: userId ?? null,
          },
          { transaction },
        );
      }

      const existingLink = await ApExtractionTypeDocument.findOne({
        where: {
          InvoiceTypeId: invoiceTypeId,
          DocumentId: catalog.DocumentId,
        },
        transaction,
      });

      if (existingLink && !existingLink.IsDeleted) {
        throw new APIError(
          `Document "${name}" is already linked to this invoice type`,
          StatusCodeEnum.HTTP_CONFLICT,
        );
      }

      const maxOrderRow = await ApExtractionTypeDocument.findOne({
        where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
        order: [["DisplayOrder", "DESC"]],
        transaction,
      });
      const nextOrder = (maxOrderRow?.DisplayOrder ?? 0) + 1;

      if (existingLink) {
        await existingLink.update(
          {
            IsDeleted: false,
            IsEnabled: isEnabled,
            IsMandatory: isMandatory,
            DisplayOrder: nextOrder,
            UpdatedAt: sqlNow(),
            UpdatedBy: userId ?? null,
          },
          { transaction },
        );
      } else {
        await ApExtractionTypeDocument.create(
          {
            InvoiceTypeId: invoiceTypeId,
            DocumentId: catalog.DocumentId,
            IsEnabled: isEnabled,
            IsMandatory: isMandatory,
            DisplayOrder: nextOrder,
            IsDeleted: false,
            CreatedBy: userId ?? null,
          },
          { transaction },
        );
      }
    });

    return this.getInvoiceTypeDetail(invoiceTypeId);
  }

  /**
   * Rename a document linked to an invoice type (updates catalog Name; Code stays stable).
   */
  async renameDocumentForInvoiceType(
    invoiceTypeId: number,
    typeDocumentId: number,
    input: { name: string },
    userId?: number | null,
  ) {
    const type = await ApExtractionInvoiceType.findOne({
      where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
    });
    if (!type) {
      throw new APIError("Invoice type not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const name = String(input.name || "").trim();
    if (!name) {
      throw new APIError("Document name is required", StatusCodeEnum.HTTP_BAD_REQUEST);
    }
    if (name.length > 200) {
      throw new APIError(
        "Document name must be 200 characters or fewer",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const typeDoc = await ApExtractionTypeDocument.findOne({
      where: {
        TypeDocumentId: typeDocumentId,
        InvoiceTypeId: invoiceTypeId,
        ...notDeleted,
      },
      include: [
        {
          model: ApExtractionDocument,
          as: "document",
          required: false,
        },
      ],
    });
    if (!typeDoc) {
      throw new APIError("Document not found for invoice type", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const catalog =
      (typeDoc.get("document") as ApExtractionDocument | undefined) ||
      (await ApExtractionDocument.findByPk(typeDoc.DocumentId));
    if (!catalog || catalog.IsDeleted) {
      throw new APIError("Document catalog entry not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    if (catalog.Name === name) {
      return this.getInvoiceTypeDetail(invoiceTypeId);
    }

    const clash = await ApExtractionDocument.findOne({
      where: {
        Name: name,
        DocumentId: { [Op.ne]: catalog.DocumentId },
      },
    });
    if (clash) {
      throw new APIError(
        `A document named "${name}" already exists`,
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }

    await catalog.update({
      Name: name,
      UpdatedAt: sqlNow(),
      UpdatedBy: userId ?? null,
      IsDeleted: false,
    });

    return this.getInvoiceTypeDetail(invoiceTypeId);
  }

  /**
   * Soft-delete a type-document link (and its fields) for an invoice type.
   * Catalog document is kept so it can be re-linked later.
   */
  async softDeleteDocumentForInvoiceType(
    invoiceTypeId: number,
    typeDocumentId: number,
    userId?: number | null,
  ) {
    const type = await ApExtractionInvoiceType.findOne({
      where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
    });
    if (!type) {
      throw new APIError("Invoice type not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const typeDoc = await ApExtractionTypeDocument.findOne({
      where: {
        TypeDocumentId: typeDocumentId,
        InvoiceTypeId: invoiceTypeId,
        ...notDeleted,
      },
    });
    if (!typeDoc) {
      throw new APIError("Document not found for invoice type", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const stamp = {
      IsDeleted: true,
      UpdatedAt: sqlNow(),
      UpdatedBy: userId ?? null,
    };

    await sequelize.transaction(async (transaction) => {
      await ApExtractionField.update(stamp, {
        where: { TypeDocumentId: typeDoc.TypeDocumentId, ...notDeleted },
        transaction,
      });
      await typeDoc.update(stamp, { transaction });
    });

    return this.getInvoiceTypeDetail(invoiceTypeId);
  }

  async savePrompt(
    invoiceTypeId: number,
    input: { promptText?: string | null; isManuallyEdited?: boolean },
    userId?: number | null,
  ) {
    const type = await ApExtractionInvoiceType.findOne({
      where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
    });
    if (!type) {
      throw new APIError("Invoice type not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const existing = await ApExtractionPromptTemplate.findOne({
      where: { InvoiceTypeId: invoiceTypeId },
    });

    const promptText = input.promptText ?? "";
    const isManuallyEdited =
      input.isManuallyEdited === undefined ? true : Boolean(input.isManuallyEdited);

    if (existing) {
      await existing.update({
        PromptText: promptText,
        IsManuallyEdited: isManuallyEdited,
        IsDeleted: false,
        UpdatedAt: sqlNow(),
        UpdatedBy: userId ?? null,
      });
    } else {
      await ApExtractionPromptTemplate.create({
        InvoiceTypeId: invoiceTypeId,
        PromptText: promptText,
        IsManuallyEdited: isManuallyEdited,
        IsDeleted: false,
        CreatedBy: userId ?? null,
      });
    }

    return this.getInvoiceTypeDetail(invoiceTypeId);
  }

  async regeneratePrompt(
    invoiceTypeId: number,
    options: { force?: boolean } = {},
    userId?: number | null,
  ) {
    const detail = await this.getInvoiceTypeDetail(invoiceTypeId);
    const existing = detail.promptTemplate;
    const force = Boolean(options.force);

    if (existing?.isManuallyEdited && !force) {
      throw new APIError(
        "Prompt was manually edited. Pass force=true to overwrite.",
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }

    const promptText = buildExtractionPromptText({
      categoryName: detail.categoryName,
      invoiceTypeName: detail.name,
      documents: detail.documents.map((d) => ({
        name: d.name,
        isEnabled: d.isEnabled,
        fields: d.fields.map((f) => ({
          fieldName: f.fieldName,
          hint: f.hint,
        })),
      })),
    });

    return this.savePrompt(
      invoiceTypeId,
      { promptText, isManuallyEdited: false },
      userId,
    );
  }

  async createCategory(
    { name, code }: { name: string; code?: string | null },
    userId?: number | null,
  ) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      throw new APIError("Category name is required", StatusCodeEnum.HTTP_BAD_REQUEST);
    }

    const resolvedCode = code
      ? String(code).trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").slice(0, 50)
      : trimmedName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 50);

    const existing = await ApExtractionCategory.findOne({
      where: { Code: resolvedCode },
    });
    if (existing) {
      throw new APIError(
        `A category with code "${resolvedCode}" already exists`,
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }

    const category = await ApExtractionCategory.create({
      Code: resolvedCode,
      Name: trimmedName,
      IsDeleted: false,
      CreatedBy: userId ?? null,
    } as any);

    return {
      categoryId: toId(category.CategoryId),
      code: category.Code,
      name: category.Name,
      invoiceTypes: [] as ReturnType<typeof mapInvoiceType>[],
    };
  }

  async createInvoiceType(
    categoryId: number,
    { name, code }: { name: string; code?: string | null },
    userId?: number | null,
  ) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      throw new APIError("Invoice type name is required", StatusCodeEnum.HTTP_BAD_REQUEST);
    }

    const category = await ApExtractionCategory.findOne({
      where: { CategoryId: categoryId, ...notDeleted },
    });
    if (!category) {
      throw new APIError("Category not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const resolvedCode = code
      ? String(code).trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").slice(0, 50)
      : trimmedName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 50);

    const existing = await ApExtractionInvoiceType.findOne({
      where: { Code: resolvedCode },
    });
    if (existing) {
      throw new APIError(
        `An invoice type with code "${resolvedCode}" already exists`,
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }

    const maxOrder = await ApExtractionInvoiceType.max<number, ApExtractionInvoiceType>(
      "DisplayOrder",
      { where: { CategoryId: categoryId, ...notDeleted } },
    );
    const displayOrder = (Number(maxOrder) || 0) + 1;

    const type = await ApExtractionInvoiceType.create({
      CategoryId: categoryId,
      Code: resolvedCode,
      Name: trimmedName,
      DisplayOrder: displayOrder,
      IsDeleted: false,
      CreatedBy: userId ?? null,
    } as any);

    return this.getInvoiceTypeDetail(toId(type.InvoiceTypeId));
  }

  async updateInvoiceType(
    invoiceTypeId: number,
    input: { name?: string | null; categoryId?: number | null },
    userId?: number | null,
  ) {
    const type = await ApExtractionInvoiceType.findOne({
      where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
    });
    if (!type) {
      throw new APIError("Invoice type not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const patch: Record<string, unknown> = {
      UpdatedAt: sqlNow(),
      UpdatedBy: userId ?? null,
    };

    if (input.name !== undefined) {
      const trimmedName = String(input.name || "").trim();
      if (!trimmedName) {
        throw new APIError("Invoice type name is required", StatusCodeEnum.HTTP_BAD_REQUEST);
      }
      if (trimmedName.length > 200) {
        throw new APIError(
          "Invoice type name must be 200 characters or fewer",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      patch.Name = trimmedName;
    }

    if (input.categoryId !== undefined && input.categoryId !== null) {
      const categoryId = Number(input.categoryId);
      if (!categoryId || Number.isNaN(categoryId)) {
        throw new APIError("Invalid category ID", StatusCodeEnum.HTTP_BAD_REQUEST);
      }
      const category = await ApExtractionCategory.findOne({
        where: { CategoryId: categoryId, ...notDeleted },
      });
      if (!category) {
        throw new APIError("Category not found", StatusCodeEnum.HTTP_NOT_FOUND);
      }
      patch.CategoryId = categoryId;

      if (type.CategoryId !== categoryId) {
        const maxOrder = await ApExtractionInvoiceType.max<number, ApExtractionInvoiceType>(
          "DisplayOrder",
          { where: { CategoryId: categoryId, ...notDeleted } },
        );
        patch.DisplayOrder = (Number(maxOrder) || 0) + 1;
      }
    }

    await type.update(patch);
    return this.getInvoiceTypeDetail(invoiceTypeId);
  }

  async softDeleteCategory(categoryId: number, userId?: number | null) {
    const category = await ApExtractionCategory.findOne({
      where: { CategoryId: categoryId, ...notDeleted },
    });
    if (!category) {
      throw new APIError("Category not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const activeTypes = await ApExtractionInvoiceType.count({
      where: { CategoryId: categoryId, ...notDeleted },
    });
    if (activeTypes > 0) {
      throw new APIError(
        "Delete or move all invoice types out of this category before deleting it",
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }

    await category.update({
      IsDeleted: true,
      UpdatedAt: sqlNow(),
      UpdatedBy: userId ?? null,
    });

    return { categoryId };
  }

  async softDeleteInvoiceType(invoiceTypeId: number, userId?: number | null) {
    const type = await ApExtractionInvoiceType.findOne({
      where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
    });
    if (!type) {
      throw new APIError("Invoice type not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    await sequelize.transaction(async (transaction) => {
      const typeDocs = await ApExtractionTypeDocument.findAll({
        where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
        transaction,
      });
      const typeDocIds = typeDocs.map((td) => td.TypeDocumentId);
      const stamp = {
        IsDeleted: true,
        UpdatedAt: sqlNow(),
        UpdatedBy: userId ?? null,
      };

      if (typeDocIds.length > 0) {
        await ApExtractionField.update(stamp, {
          where: { TypeDocumentId: { [Op.in]: typeDocIds }, ...notDeleted },
          transaction,
        });
        await ApExtractionTypeDocument.update(stamp, {
          where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
          transaction,
        });
      }

      await ApExtractionPromptTemplate.update(stamp, {
        where: { InvoiceTypeId: invoiceTypeId, ...notDeleted },
        transaction,
      });

      await type.update(stamp, { transaction });
    });

    return { invoiceTypeId };
  }

  /** Resolve saved Prompt Builder text by invoice type code (e.g. NON_PO). */
  async getPromptTextByInvoiceTypeCode(code: string): Promise<string | null> {
    const type = await ApExtractionInvoiceType.findOne({
      where: { Code: String(code || "").trim(), ...notDeleted },
    });
    if (!type) return null;

    const tpl = await ApExtractionPromptTemplate.findOne({
      where: { InvoiceTypeId: type.InvoiceTypeId, ...notDeleted },
    });
    const text = String(tpl?.PromptText || "").trim();
    return text || null;
  }

  /** All saved Prompt Builder texts keyed by invoice type code. */
  async getPromptTextMap(): Promise<Record<string, string>> {
    const types = await ApExtractionInvoiceType.findAll({
      where: notDeleted,
      include: [
        {
          model: ApExtractionPromptTemplate,
          as: "promptTemplate",
          where: notDeleted,
          required: false,
        },
      ],
    });

    const map: Record<string, string> = {};
    for (const type of types) {
      const code = String(type.Code || "").trim().toUpperCase();
      const tpl = type.get("promptTemplate") as ApExtractionPromptTemplate | undefined;
      const text = String(tpl?.PromptText || "").trim();
      if (code && text) map[code] = text;
    }
    return map;
  }

  /**
   * Per-document config hashes for an invoice type, keyed by OCR documentType
   * and by catalog document code (uppercase).
   */
  async getDocumentConfigHashesByInvoiceTypeCode(code: string): Promise<{
    byOcrType: Record<string, string>;
    byDocumentCode: Record<string, string>;
  }> {
    const type = await ApExtractionInvoiceType.findOne({
      where: { Code: String(code || "").trim(), ...notDeleted },
      attributes: ["InvoiceTypeId"],
    });
    if (!type) return { byOcrType: {}, byDocumentCode: {} };

    const detail = await this.getInvoiceTypeDetail(toId(type.InvoiceTypeId));
    const byOcrType: Record<string, string> = {};
    const byDocumentCode: Record<string, string> = {};

    for (const doc of detail.documents) {
      const hash = doc.configHash;
      const docCode = String(doc.code || "").trim().toUpperCase();
      if (docCode) byDocumentCode[docCode] = hash;
      const ocrType = doc.ocrDocumentType || resolveOcrDocumentTypeFromCode(docCode);
      if (ocrType) {
        byOcrType[ocrType] = hash;
        for (const alias of OCR_TYPE_LEGACY_ALIASES[ocrType] || []) {
          byOcrType[alias] = hash;
        }
      }
    }

    return { byOcrType, byDocumentCode };
  }
}

export default new ExtractionPromptConfigService();
