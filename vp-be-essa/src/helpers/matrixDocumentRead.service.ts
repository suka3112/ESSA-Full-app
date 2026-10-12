/**
 * After OCR classifies the uploaded PDF, persist matrix data points that
 * were not read so the invoice screen can show them.
 * BPD §8.1, §6 step 7. Does not park, post, or change workflow stage.
 */
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { EssaAuditEvent } from "../models/essaAuditEvent";
import logger from "../utils/logger";
import {
  categoryCandidatesFromBody,
  classifiedDocumentsFromBody,
  findUnreadDataPoints,
  type MatrixFieldSpec,
  type UnreadDataPoint,
} from "./matrixDocumentRead.logic";

export type MatrixUnreadRow = {
  readId: number;
  documentId: number;
  invoiceCategoryCode: string | null;
  recognizedType: string;
  documentCode: string | null;
  documentName: string;
  dataPointCode: string | null;
  dataPointName: string;
  matrixRef: string | null;
  requirement: string;
  reason: string;
  pageRef: string | null;
};

type FieldRow = {
  document_code: string;
  document_name: string;
  data_point_code: string;
  data_point_name: string;
  field_label: string;
  extraction_key: string | null;
  matrix_ref: string | null;
};

type RequirementRow = {
  document_code: string;
  requirement: string;
};

const postgresCode = (error: unknown): string | undefined =>
  (error as { original?: { code?: string }; parent?: { code?: string } })?.original?.code
  || (error as { parent?: { code?: string } })?.parent?.code;

const missingRelation = (error: unknown): boolean => {
  const code = postgresCode(error);
  return code === "42P01" || code === "3F000";
};

const missingColumn = (error: unknown): boolean => postgresCode(error) === "42703";

function unreadItemsFromJson(value: unknown): UnreadDataPoint[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is UnreadDataPoint => !!item && typeof item === "object",
  );
}

class MatrixDocumentReadService {
  async recordUnread(input: {
    documentId: number;
    extractBody: Record<string, unknown>;
    hintedDocumentType?: string | null;
    invoiceCategoryCode?: string | null;
  }): Promise<number> {
    const documentId = Number(input.documentId);
    if (!Number.isInteger(documentId) || documentId <= 0) return 0;

    const categoryCode = await this.resolveCategoryCode(
      input.invoiceCategoryCode,
      categoryCandidatesFromBody(input.extractBody),
    );
    const knownDocumentCodes = await this.loadDocumentCodes();
    const documents = classifiedDocumentsFromBody(input.extractBody);
    const codes = new Set<string>();
    for (const code of knownDocumentCodes) codes.add(code);

    const fieldsByDocumentCode = await this.loadFields([...codes]);
    const requirementByDocumentCode = categoryCode
      ? await this.loadRequirements(categoryCode)
      : new Map<string, string>();

    const unread = findUnreadDataPoints({
      documents,
      fieldsByDocumentCode,
      knownDocumentCodes: codes,
      requirementByDocumentCode,
      hintedDocumentType: input.hintedDocumentType,
    });

    await this.replaceUnread(documentId, categoryCode, unread);
    return unread.length;
  }

  async listForDocument(documentId: number): Promise<MatrixUnreadRow[]> {
    const id = Number(documentId);
    if (!Number.isInteger(id) || id <= 0) return [];
    try {
      const rows = (await sequelize.query(
        `SELECT "ReadId" AS "readId",
                "DocumentId" AS "documentId",
                "InvoiceCategoryCode" AS "invoiceCategoryCode",
                "UnreadData" AS "unreadData"
           FROM "AP_MATRIX_UNREAD_DATA_POINT"
          WHERE "DocumentId" = :documentId`,
        { replacements: { documentId: id }, type: QueryTypes.SELECT },
      )) as Array<{
        readId: number;
        documentId: number;
        invoiceCategoryCode: string | null;
        unreadData: unknown;
      }>;
      const stored = rows[0];
      if (!stored) return [];
      return unreadItemsFromJson(stored.unreadData).map((item) => ({
        readId: Number(stored.readId),
        documentId: Number(stored.documentId),
        invoiceCategoryCode: stored.invoiceCategoryCode,
        recognizedType: item.recognizedType,
        documentCode: item.documentCode,
        documentName: item.documentName,
        dataPointCode: item.dataPointCode,
        dataPointName: item.dataPointName,
        matrixRef: item.matrixRef,
        requirement: item.requirement,
        reason: item.reason,
        pageRef: item.pageRef,
      }));
    } catch (error) {
      if (missingRelation(error) || missingColumn(error)) {
        logger.warn(
          "[MatrixRead] AP_MATRIX_UNREAD_DATA_POINT is not in the JSON shape. Apply migration 035.",
        );
        return [];
      }
      throw error;
    }
  }

  /**
   * Active matrix category for a code or a unique category name.
   * An unknown or ambiguous candidate resolves to null.
   */
  async resolveInvoiceCategory(
    candidates: string[],
  ): Promise<{ categoryCode: string; invoiceCategoryId: number } | null> {
    const list = candidates.map((value) => String(value || "").trim()).filter(Boolean);
    try {
      for (const code of list) {
        if (!/^[A-Z0-9_]+$/.test(code)) continue;
        const rows = (await sequelize.query(
          `SELECT invoice_category_id, category_code
             FROM cfg."VAL_INVOICE_CATEGORY"
            WHERE category_code = :code AND is_active
            LIMIT 1`,
          { replacements: { code }, type: QueryTypes.SELECT },
        )) as Array<{ invoice_category_id: string | number; category_code: string }>;
        const row = rows[0];
        const invoiceCategoryId = Number(row?.invoice_category_id);
        if (row?.category_code && Number.isInteger(invoiceCategoryId)) {
          return { categoryCode: row.category_code, invoiceCategoryId };
        }
      }
      const names = [...new Set(list)];
      if (names.length === 0) return null;
      const named = (await sequelize.query(
        `SELECT invoice_category_id, category_code
           FROM cfg."VAL_INVOICE_CATEGORY"
          WHERE is_active AND category_name IN (:names)`,
        { replacements: { names }, type: QueryTypes.SELECT },
      )) as Array<{ invoice_category_id: string | number; category_code: string }>;
      const distinct = new Map<string, number>();
      for (const row of named) {
        const invoiceCategoryId = Number(row.invoice_category_id);
        if (!row.category_code || !Number.isInteger(invoiceCategoryId)) continue;
        distinct.set(row.category_code, invoiceCategoryId);
      }
      if (distinct.size !== 1) return null;
      const [categoryCode, invoiceCategoryId] = [...distinct.entries()][0];
      return { categoryCode, invoiceCategoryId };
    } catch (error) {
      if (missingRelation(error)) return null;
      throw error;
    }
  }

  private async resolveCategoryCode(
    candidate: string | null | undefined,
    extraCandidates: string[] = [],
  ): Promise<string | null> {
    const resolved = await this.resolveInvoiceCategory([
      String(candidate || "").trim(),
      ...extraCandidates,
    ]);
    return resolved?.categoryCode ?? null;
  }

  private async loadDocumentCodes(): Promise<Set<string>> {
    const rows = (await sequelize.query(
      `SELECT document_code
         FROM cfg."BUNDLE_DOCUMENT_TYPE"
        WHERE is_active AND document_code IS NOT NULL`,
      { type: QueryTypes.SELECT },
    )) as Array<{ document_code: string }>;
    return new Set(rows.map((row) => row.document_code));
  }

  private async loadFields(
    documentCodes: string[],
  ): Promise<Map<string, MatrixFieldSpec[]>> {
    const grouped = new Map<string, MatrixFieldSpec[]>();
    if (documentCodes.length === 0) return grouped;
    const rows = (await sequelize.query(
      `SELECT d.document_code,
              d.document_name,
              p.data_point_code,
              p.data_point_name,
              f.field_label,
              f.extraction_key,
              f.matrix_ref
         FROM cfg."BUNDLE_DOCUMENT_FIELD" f
         JOIN cfg."BUNDLE_DOCUMENT_TYPE" d
           ON d.bundle_document_type_id = f.bundle_document_type_id
         JOIN cfg."DATA_POINT" p
           ON p.data_point_id = f.data_point_id
        WHERE f.is_active
          AND d.is_active
          AND d.document_code IN (:documentCodes)
        ORDER BY d.document_code, f.matrix_ref`,
      { replacements: { documentCodes }, type: QueryTypes.SELECT },
    )) as FieldRow[];
    for (const row of rows) {
      const spec: MatrixFieldSpec = {
        documentCode: row.document_code,
        documentName: row.document_name,
        dataPointCode: row.data_point_code,
        dataPointName: row.data_point_name,
        fieldLabel: row.field_label,
        extractionKey: row.extraction_key,
        matrixRef: row.matrix_ref,
      };
      const list = grouped.get(row.document_code) || [];
      list.push(spec);
      grouped.set(row.document_code, list);
    }
    return grouped;
  }

  private async loadRequirements(categoryCode: string): Promise<Map<string, string>> {
    const rows = (await sequelize.query(
      `SELECT d.document_code, b.requirement::text AS requirement
         FROM cfg."CATEGORY_BUNDLE_DOCUMENT" b
         JOIN cfg."BUNDLE_DOCUMENT_TYPE" d
           ON d.bundle_document_type_id = b.bundle_document_type_id
         JOIN cfg."VAL_INVOICE_CATEGORY" c
           ON c.invoice_category_id = b.invoice_category_id
        WHERE c.category_code = :categoryCode
          AND c.is_active
          AND d.is_active`,
      { replacements: { categoryCode }, type: QueryTypes.SELECT },
    )) as RequirementRow[];
    return new Map(rows.map((row) => [row.document_code, row.requirement]));
  }

  private async replaceUnread(
    documentId: number,
    categoryCode: string | null,
    unread: UnreadDataPoint[],
  ): Promise<void> {
    const transaction = await sequelize.transaction();
    try {
      if (unread.length === 0) {
        await sequelize.query(
          `DELETE FROM "AP_MATRIX_UNREAD_DATA_POINT" WHERE "DocumentId" = :documentId`,
          { replacements: { documentId }, transaction },
        );
      } else {
        await sequelize.query(
          `INSERT INTO "AP_MATRIX_UNREAD_DATA_POINT" (
             "DocumentId", "InvoiceCategoryCode", "UnreadData"
           ) VALUES (:documentId, :categoryCode, :unreadData::jsonb)
           ON CONFLICT ("DocumentId") DO UPDATE
             SET "InvoiceCategoryCode" = EXCLUDED."InvoiceCategoryCode",
                 "UnreadData" = EXCLUDED."UnreadData",
                 "CreatedAt" = NOW()`,
          {
            replacements: {
              documentId,
              categoryCode,
              unreadData: JSON.stringify(unread),
            },
            transaction,
          },
        );
      }

      const idRows = (await sequelize.query(
        `SELECT nextval('"ESSA_AUDIT_EVENT_ID_SEQ"') AS "nextId"`,
        { type: QueryTypes.SELECT, transaction },
      )) as Array<{ nextId: string | number }>;
      const nextId = Number(idRows[0]?.nextId);
      const eventId = Number.isFinite(nextId) && nextId > 0
        ? `AUD-${nextId}`
        : `AUD-${Date.now()}`;
      const documentCodes = [
        ...new Set(unread.map((row) => row.documentCode || row.recognizedType)),
      ];
      await EssaAuditEvent.create(
        {
          EventId: eventId,
          EventTime: new Date(),
          Action: "EXTRACT",
          ActorId: "system",
          ActorName: "AP Automation Engine",
          ActorRole: "SYSTEM",
          ActorType: "SYSTEM",
          ReasonRemarks:
            "Matrix data points that could not be read from the classified documents",
          Source: "UPLOAD",
          Result: "SUCCESS",
          ObjectType: "INVOICE",
          ObjectId: `ocr-${documentId}`,
          InvoiceId: documentId,
          OutcomeCode: "MATRIX_UNREAD",
          NewValue: String(unread.length),
          DetailsJson: JSON.stringify({
            unreadCount: unread.length,
            invoiceCategoryCode: categoryCode,
            documentCodes,
          }).slice(0, 20000),
        },
        { transaction },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      if (missingRelation(error) || missingColumn(error)) {
        logger.warn(
          "[MatrixRead] matrix tables are not in the JSON shape. Apply migrations 033, 034, and 035.",
        );
        return;
      }
      throw error;
    }
  }
}

export default new MatrixDocumentReadService();
