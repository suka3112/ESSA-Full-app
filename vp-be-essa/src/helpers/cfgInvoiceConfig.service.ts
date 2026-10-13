/**
 * Invoice Configuration tabs (Invoice Category, Document Types, Fields to Capture)
 * read and write the matrix tables in schema cfg (migrations 033 / 034).
 * Extraction prompts and OCR keep using AP_EXTRACTION_*.
 */
import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../config/sequelize";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import {
  computeDocumentConfigHash,
  normalizeFieldKind,
  resolveOcrDocumentTypeFromCode,
  slugifyDocumentCode,
} from "./extractionPromptConfig.service";

type CategoryRow = {
  invoice_category_id: string;
  category_code: string;
  category_name: string;
  is_po_based: boolean;
  matrix_ref: string | null;
};

type LinkRow = {
  category_bundle_document_id: string;
  invoice_category_id: string;
  bundle_document_type_id: string;
  requirement: string;
  display_order: number;
  document_code: string;
  document_name: string;
  classification_hints: string | null;
};

type FieldRow = {
  bundle_document_field_id: string;
  bundle_document_type_id: string;
  data_point_id: string;
  field_label: string;
  extraction_key: string | null;
  data_point_code: string;
  data_point_name: string;
  data_type: string;
  default_level: string;
  description: string | null;
  extraction_hint: string | null;
  matrix_ref: string | null;
};

type FieldInput = {
  fieldId?: number | null;
  fieldName?: string | null;
  displayName?: string | null;
  hint?: string | null;
  fieldKind?: string | null;
  kind?: string | null;
  displayOrder?: number;
};

type DocumentInput = {
  typeDocumentId: number;
  isEnabled?: boolean;
  isMandatory?: boolean;
  displayOrder?: number;
  classificationHints?: string | null;
  fields?: FieldInput[];
};

const bad = (message: string, status = StatusCodeEnum.HTTP_BAD_REQUEST) =>
  new APIError(message, status);

const q = async <T>(sql: string, replacements?: Record<string, unknown>, transaction?: Transaction) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction }) as Promise<T[]>;

const one = async <T>(sql: string, replacements?: Record<string, unknown>, transaction?: Transaction) => {
  const rows = await q<T>(sql, replacements, transaction);
  return rows[0] || null;
};

/** Common rows are section 1. A category only sees its own section, for example Manpower section 3. */
const dataPointInCategoryScope = (dataPointCode: string, matrixRef: string | null) => {
  const section = /^DP_(\d+)_/.exec(String(dataPointCode || ""))?.[1];
  if (!section) return true;
  if (section === "1") return true;
  return matrixRef != null && section === String(matrixRef).trim();
};

const slug = (value: string, fallback: string) => {
  const code = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return code || fallback;
};

const fieldKindOf = (row: FieldRow) => {
  if (row.data_type === "JSON" || row.default_level === "LINE" || row.default_level === "GROUP") return "table";
  return normalizeFieldKind(null, row.extraction_key || row.data_point_code);
};

const mapField = (row: FieldRow, displayOrder: number) => {
  const fieldName = row.extraction_key || row.data_point_code;
  const fieldKind = fieldKindOf(row);
  return {
    fieldId: Number(row.bundle_document_field_id),
    fieldName,
    displayName: row.field_label || row.data_point_name,
    hint: row.extraction_hint || row.description || "",
    fieldKind,
    displayOrder,
  };
};

const mapDocument = (link: LinkRow, fields: FieldRow[]) => {
  const mappedFields = fields.map((field, index) => mapField(field, index + 1));
  return {
    typeDocumentId: Number(link.category_bundle_document_id),
    documentId: Number(link.bundle_document_type_id),
    code: link.document_code,
    name: link.document_name,
    isEnabled: true,
    isMandatory: link.requirement === "MANDATORY",
    classificationHints: link.classification_hints || "",
    categoryId: resolveOcrDocumentTypeFromCode(link.document_code),
    displayOrder: Number(link.display_order) || 0,
    ocrDocumentType: resolveOcrDocumentTypeFromCode(link.document_code),
    configHash: computeDocumentConfigHash({
      documentCode: link.document_code,
      fields: mappedFields,
    }),
    fields: mappedFields,
  };
};

async function loadLinks(transaction?: Transaction) {
  return q<LinkRow>(
    `SELECT b.category_bundle_document_id, b.invoice_category_id, b.bundle_document_type_id,
            b.requirement::text AS requirement, b.display_order, b.classification_hints,
            d.document_code, d.document_name
       FROM cfg."CATEGORY_BUNDLE_DOCUMENT" b
       JOIN cfg."BUNDLE_DOCUMENT_TYPE" d ON d.bundle_document_type_id = b.bundle_document_type_id
      WHERE d.is_active
      ORDER BY b.display_order, d.document_name`,
    undefined,
    transaction,
  );
}

async function loadFields(transaction?: Transaction) {
  return q<FieldRow>(
    `SELECT f.bundle_document_field_id, f.bundle_document_type_id, f.data_point_id,
            f.field_label, f.extraction_key, f.extraction_hint, f.matrix_ref,
            p.data_point_code, p.data_point_name, p.data_type::text AS data_type,
            p.default_level::text AS default_level, p.description
       FROM cfg."BUNDLE_DOCUMENT_FIELD" f
       JOIN cfg."DATA_POINT" p ON p.data_point_id = f.data_point_id
      WHERE f.is_active
      ORDER BY f.matrix_ref NULLS LAST, f.bundle_document_field_id`,
    undefined,
    transaction,
  );
}

async function loadCategories(transaction?: Transaction) {
  return q<CategoryRow>(
    `SELECT invoice_category_id, category_code, category_name, is_po_based, matrix_ref
       FROM cfg."VAL_INVOICE_CATEGORY"
      WHERE is_active
      ORDER BY NULLIF(matrix_ref, '')::int NULLS LAST, category_name`,
    undefined,
    transaction,
  );
}

function assemble(categories: CategoryRow[], links: LinkRow[], fields: FieldRow[]) {
  const fieldsByDoc = new Map<number, FieldRow[]>();
  for (const field of fields) {
    const id = Number(field.bundle_document_type_id);
    const list = fieldsByDoc.get(id) || [];
    list.push(field);
    fieldsByDoc.set(id, list);
  }
  const linksByCategory = new Map<number, LinkRow[]>();
  for (const link of links) {
    const id = Number(link.invoice_category_id);
    const list = linksByCategory.get(id) || [];
    list.push(link);
    linksByCategory.set(id, list);
  }

  const toType = (category: CategoryRow) => ({
    invoiceTypeId: Number(category.invoice_category_id),
    code: category.category_code,
    name: category.category_name,
    displayOrder: Number(category.invoice_category_id),
    categoryName: category.is_po_based ? "PO" : "Non-PO",
    documents: (linksByCategory.get(Number(category.invoice_category_id)) || []).map((link) =>
      mapDocument(
        link,
        (fieldsByDoc.get(Number(link.bundle_document_type_id)) || []).filter((field) =>
          dataPointInCategoryScope(field.data_point_code, category.matrix_ref),
        ),
      ),
    ),
    promptTemplate: null as null,
  });

  const po = categories.filter((category) => category.is_po_based).map(toType);
  const nonPo = categories.filter((category) => !category.is_po_based).map(toType);
  return {
    categories: [
      { categoryId: 1, code: "PO", name: "PO", invoiceTypes: po },
      { categoryId: 2, code: "NON_PO", name: "Non-PO", invoiceTypes: nonPo },
    ],
  };
}

async function requireCategory(invoiceCategoryId: number, transaction?: Transaction) {
  const row = await one<CategoryRow>(
    `SELECT invoice_category_id, category_code, category_name, is_po_based, matrix_ref
       FROM cfg."VAL_INVOICE_CATEGORY"
      WHERE invoice_category_id = :id AND is_active`,
    { id: invoiceCategoryId },
    transaction,
  );
  if (!row) throw bad("Invoice category not found", StatusCodeEnum.HTTP_NOT_FOUND);
  return row;
}

async function detail(invoiceCategoryId: number, transaction?: Transaction) {
  const category = await requireCategory(invoiceCategoryId, transaction);
  const links = (await loadLinks(transaction)).filter(
    (link) => Number(link.invoice_category_id) === invoiceCategoryId,
  );
  const docIds = new Set(links.map((link) => Number(link.bundle_document_type_id)));
  const fields = (await loadFields(transaction)).filter((field) =>
    docIds.has(Number(field.bundle_document_type_id)),
  );
  return assemble([category], links, fields).categories
    .flatMap((group) => group.invoiceTypes)
    .find((type) => type.invoiceTypeId === invoiceCategoryId) || null;
}

async function syncFields(
  bundleDocumentTypeId: number,
  fields: FieldInput[] | undefined,
  matrixRef: string | null,
  transaction: Transaction,
) {
  if (!Array.isArray(fields)) return;
  const kept = new Set<number>();

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    const displayName = String(field.displayName || field.fieldName || "").trim();
    const fieldName = String(field.fieldName || displayName || "").trim();
    if (!displayName && !fieldName) continue;
    const kind = normalizeFieldKind(field.fieldKind || field.kind, fieldName);
    const dataType = kind === "table" ? "JSON" : "TEXT";
    const level = kind === "table" ? "LINE" : "HEADER";
    const code = slug(fieldName || displayName, `FIELD_${index + 1}`);
    const label = displayName || fieldName;

    const point = await one<{ data_point_id: string }>(
      `INSERT INTO cfg."DATA_POINT" (data_point_code, data_point_name, data_type, default_level, description)
       VALUES (:code, :label, :dataType::cfg.value_data_type, :level::cfg.match_level, :hint)
       ON CONFLICT (data_point_code) DO UPDATE
         SET data_point_name = EXCLUDED.data_point_name,
             data_type = EXCLUDED.data_type,
             default_level = EXCLUDED.default_level
       RETURNING data_point_id`,
      { code, label, dataType, level, hint: String(field.hint || "") },
      transaction,
    );
    const dataPointId = Number(point?.data_point_id);
    if (!dataPointId) continue;

    const requestedId = field.fieldId != null ? Number(field.fieldId) : 0;
    const existing = await one<{ bundle_document_field_id: string }>(
      `SELECT bundle_document_field_id
         FROM cfg."BUNDLE_DOCUMENT_FIELD"
        WHERE bundle_document_type_id = :docId
          AND (
            (:fieldId > 0 AND bundle_document_field_id = :fieldId)
            OR data_point_id = :dataPointId
          )
        ORDER BY CASE WHEN :fieldId > 0 AND bundle_document_field_id = :fieldId THEN 0 ELSE 1 END
        LIMIT 1`,
      { docId: bundleDocumentTypeId, fieldId: requestedId, dataPointId },
      transaction,
    );

    if (existing) {
      const id = Number(existing.bundle_document_field_id);
      await sequelize.query(
        `UPDATE cfg."BUNDLE_DOCUMENT_FIELD"
            SET data_point_id = :dataPointId,
                field_label = :label,
                extraction_key = :extractionKey,
                extraction_hint = :hint,
                field_level = :level::cfg.match_level,
                is_active = TRUE
          WHERE bundle_document_field_id = :id`,
        { replacements: { id, dataPointId, label, extractionKey: code, level, hint: String(field.hint || "") }, transaction },
      );
      kept.add(id);
    } else {
      const inserted = await one<{ bundle_document_field_id: string }>(
        `INSERT INTO cfg."BUNDLE_DOCUMENT_FIELD" (
           bundle_document_type_id, data_point_id, matrix_mark, field_label, extraction_key, extraction_hint, field_level, is_active
         ) VALUES (
           :docId, :dataPointId, 'EXACT'::cfg.matrix_mark, :label, :extractionKey, :hint, :level::cfg.match_level, TRUE
         )
         RETURNING bundle_document_field_id`,
        { docId: bundleDocumentTypeId, dataPointId, label, extractionKey: code, hint: String(field.hint || ""), level },
        transaction,
      );
      if (inserted) kept.add(Number(inserted.bundle_document_field_id));
    }
  }

  const current = await q<{ bundle_document_field_id: string; data_point_code: string }>(
    `SELECT f.bundle_document_field_id, p.data_point_code
       FROM cfg."BUNDLE_DOCUMENT_FIELD" f
       JOIN cfg."DATA_POINT" p ON p.data_point_id = f.data_point_id
      WHERE f.bundle_document_type_id = :docId AND f.is_active`,
    { docId: bundleDocumentTypeId },
    transaction,
  );
  for (const row of current) {
    const id = Number(row.bundle_document_field_id);
    if (kept.has(id)) continue;
    if (!dataPointInCategoryScope(row.data_point_code, matrixRef)) continue;
    await sequelize.query(
      `UPDATE cfg."BUNDLE_DOCUMENT_FIELD" SET is_active = FALSE WHERE bundle_document_field_id = :id`,
      { replacements: { id }, transaction },
    );
  }
}

export async function getCfgPromptConfigTree() {
  try {
    return assemble(await loadCategories(), await loadLinks(), await loadFields());
  } catch (error) {
    const code = (error as { parent?: { code?: string } })?.parent?.code;
    if (code === "42P01" || code === "3F000") {
      throw bad("Matrix tables are not installed. Apply migrations 033 and 034.", StatusCodeEnum.HTTP_NOT_FOUND);
    }
    throw error;
  }
}

export async function getCfgInvoiceCategory(invoiceCategoryId: number) {
  const row = await detail(invoiceCategoryId);
  if (!row) throw bad("Invoice category not found", StatusCodeEnum.HTTP_NOT_FOUND);
  return row;
}

export async function upsertCfgDocuments(invoiceCategoryId: number, documents: DocumentInput[]) {
  await sequelize.transaction(async (transaction) => {
    const category = await requireCategory(invoiceCategoryId, transaction);
    for (const doc of documents || []) {
      const link = await one<LinkRow>(
        `SELECT b.category_bundle_document_id, b.invoice_category_id, b.bundle_document_type_id,
                b.requirement::text AS requirement, b.display_order, b.classification_hints,
                d.document_code, d.document_name
           FROM cfg."CATEGORY_BUNDLE_DOCUMENT" b
           JOIN cfg."BUNDLE_DOCUMENT_TYPE" d ON d.bundle_document_type_id = b.bundle_document_type_id
          WHERE b.category_bundle_document_id = :linkId
            AND b.invoice_category_id = :categoryId`,
        { linkId: doc.typeDocumentId, categoryId: invoiceCategoryId },
        transaction,
      );
      if (!link) throw bad(`Document ${doc.typeDocumentId} is not on this invoice category`);

      if (doc.isEnabled === false) {
        await sequelize.query(
          `DELETE FROM cfg."CATEGORY_BUNDLE_DOCUMENT" WHERE category_bundle_document_id = :linkId`,
          { replacements: { linkId: doc.typeDocumentId }, transaction },
        );
        continue;
      }

      const requirement = doc.isMandatory ? "MANDATORY" : link.requirement === "MANDATORY" ? "OPTIONAL" : link.requirement;
      const classificationHints =
        doc.classificationHints == null ? link.classification_hints : String(doc.classificationHints);
      await sequelize.query(
        `UPDATE cfg."CATEGORY_BUNDLE_DOCUMENT"
            SET requirement = :requirement::cfg.document_requirement,
                display_order = :displayOrder,
                classification_hints = :classificationHints
          WHERE category_bundle_document_id = :linkId`,
        {
          replacements: {
            linkId: doc.typeDocumentId,
            requirement,
            displayOrder: doc.displayOrder ?? link.display_order,
            classificationHints,
          },
          transaction,
        },
      );
      await syncFields(Number(link.bundle_document_type_id), doc.fields, category.matrix_ref, transaction);
    }
  });
  return getCfgInvoiceCategory(invoiceCategoryId);
}

export async function createCfgDocument(
  invoiceCategoryId: number,
  input: { name?: string; isMandatory?: boolean },
) {
  const name = String(input?.name || "").trim();
  if (!name) throw bad("Document name is required");
  const code = slugifyDocumentCode(name);
  await sequelize.transaction(async (transaction) => {
    await requireCategory(invoiceCategoryId, transaction);
    const existing = await one<{ bundle_document_type_id: string }>(
      `SELECT bundle_document_type_id FROM cfg."BUNDLE_DOCUMENT_TYPE" WHERE document_code = :code`,
      { code },
      transaction,
    );
    let documentTypeId = existing ? Number(existing.bundle_document_type_id) : 0;
    if (!documentTypeId) {
      const inserted = await one<{ bundle_document_type_id: string }>(
        `INSERT INTO cfg."BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by)
         VALUES (:code, :name, 'VENDOR_BUNDLE'::cfg.document_channel, 'Vendor')
         RETURNING bundle_document_type_id`,
        { code, name },
        transaction,
      );
      documentTypeId = Number(inserted?.bundle_document_type_id);
    } else {
      await sequelize.query(
        `UPDATE cfg."BUNDLE_DOCUMENT_TYPE" SET document_name = :name, is_active = TRUE WHERE bundle_document_type_id = :id`,
        { replacements: { id: documentTypeId, name }, transaction },
      );
    }
    const requirement = input.isMandatory ? "MANDATORY" : "OPTIONAL";
    await sequelize.query(
      `INSERT INTO cfg."CATEGORY_BUNDLE_DOCUMENT" (
         invoice_category_id, bundle_document_type_id, requirement, display_order
       ) VALUES (
         :categoryId, :documentTypeId, :requirement::cfg.document_requirement,
         COALESCE((SELECT MAX(display_order) + 1 FROM cfg."CATEGORY_BUNDLE_DOCUMENT" WHERE invoice_category_id = :categoryId), 1)
       )
       ON CONFLICT (invoice_category_id, bundle_document_type_id) DO UPDATE
         SET requirement = EXCLUDED.requirement`,
      { replacements: { categoryId: invoiceCategoryId, documentTypeId, requirement }, transaction },
    );
  });
  return getCfgInvoiceCategory(invoiceCategoryId);
}

export async function renameCfgDocument(invoiceCategoryId: number, linkId: number, name: string) {
  const next = String(name || "").trim();
  if (!next) throw bad("Document name is required");
  await sequelize.transaction(async (transaction) => {
    const link = await one<{ bundle_document_type_id: string }>(
      `SELECT bundle_document_type_id
         FROM cfg."CATEGORY_BUNDLE_DOCUMENT"
        WHERE category_bundle_document_id = :linkId AND invoice_category_id = :categoryId`,
      { linkId, categoryId: invoiceCategoryId },
      transaction,
    );
    if (!link) throw bad("Document not found on this invoice category", StatusCodeEnum.HTTP_NOT_FOUND);
    await sequelize.query(
      `UPDATE cfg."BUNDLE_DOCUMENT_TYPE" SET document_name = :name WHERE bundle_document_type_id = :id`,
      { replacements: { id: Number(link.bundle_document_type_id), name: next }, transaction },
    );
  });
  return getCfgInvoiceCategory(invoiceCategoryId);
}

export async function deleteCfgDocument(invoiceCategoryId: number, linkId: number) {
  const removed = await q<{ category_bundle_document_id: string }>(
    `DELETE FROM cfg."CATEGORY_BUNDLE_DOCUMENT"
      WHERE category_bundle_document_id = :linkId AND invoice_category_id = :categoryId
      RETURNING category_bundle_document_id`,
    { linkId, categoryId: invoiceCategoryId },
  );
  if (!removed.length) throw bad("Document not found on this invoice category", StatusCodeEnum.HTTP_NOT_FOUND);
  return getCfgInvoiceCategory(invoiceCategoryId);
}
