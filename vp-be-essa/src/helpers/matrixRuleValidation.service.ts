/**
 * Load category-scoped EXACT header rules from cfg."VALIDATION_RULE"
 * and compare them to the OCR payload already on the validation request.
 * Does not activate rules and does not query placeholder SAP tables.
 */
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import logger from "../utils/logger";
import matrixDocumentReadService from "./matrixDocumentRead.service";
import {
  classifiedDocumentsFromValidationInput,
  evaluateMatrixRules,
  matrixCategoryCandidates,
  type MatrixOperand,
  type MatrixRule,
  type MatrixRuleOutcome,
} from "./matrixRuleValidation.logic";

export type MatrixValidationInput = {
  header?: object | null;
  lineItems?: readonly object[] | null;
  supportingDocs?: Record<
    string,
    {
      header?: object | null;
      lineItems?: readonly object[] | null;
    } | null
  > | null;
  invoiceTypeCode?: string | null;
  invoiceCategoryCode?: string | null;
  bundleDocuments?: Array<Record<string, unknown>> | null;
};

type RuleRow = {
  rule_code: string;
  rule_name: string;
  rule_type: string;
  rule_stage: string;
  match_level: string;
  target_match_mode: string;
  min_targets_matched: number | null;
  is_active: boolean;
  failure_action: string | null;
  handler_key: string | null;
  tolerance_mode: string | null;
  tolerance_pct: number | string | null;
  tolerance_amount: number | string | null;
  tolerance_days: number | null;
  seq: number | null;
  role: string | null;
  origin: string | null;
  operand_alias: string | null;
  invoice_category_id: string | number | null;
  match_method: string | null;
  document_code: string | null;
  data_point_code: string | null;
  data_point_name: string | null;
  field_label: string | null;
  extraction_key: string | null;
  reference_physical_name: string | null;
  reference_column_name: string | null;
};

const postgresCode = (error: unknown): string | undefined =>
  (error as { original?: { code?: string }; parent?: { code?: string } })?.original?.code
  || (error as { parent?: { code?: string } })?.parent?.code;

const missingRelation = (error: unknown): boolean => {
  const code = postgresCode(error);
  return code === "42P01" || code === "3F000";
};

function categoryId(value: string | number | null): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function groupRules(rows: RuleRow[]): MatrixRule[] {
  const grouped = new Map<string, MatrixRule>();
  for (const row of rows) {
    let rule = grouped.get(row.rule_code);
    if (!rule) {
      rule = {
        ruleCode: row.rule_code,
        ruleName: row.rule_name,
        ruleType: row.rule_type,
        ruleStage: row.rule_stage,
        matchLevel: row.match_level,
        targetMatchMode: row.target_match_mode,
        minTargetsMatched: row.min_targets_matched == null ? null : Number(row.min_targets_matched),
        isActive: row.is_active === true,
        failureAction: row.failure_action,
        handlerKey: row.handler_key,
        toleranceMode: row.tolerance_mode,
        tolerancePct: row.tolerance_pct,
        toleranceAmount: row.tolerance_amount,
        toleranceDays: row.tolerance_days == null ? null : Number(row.tolerance_days),
        operands: [],
      };
      grouped.set(row.rule_code, rule);
    }
    if (row.seq == null || !row.role || !row.origin || !row.operand_alias) continue;
    const operand: MatrixOperand = {
      seq: Number(row.seq),
      role: row.role,
      origin: row.origin,
      operandAlias: row.operand_alias,
      invoiceCategoryId: categoryId(row.invoice_category_id),
      matchMethod: row.match_method || "EXACT",
      documentCode: row.document_code,
      dataPointCode: row.data_point_code,
      dataPointName: row.data_point_name,
      fieldLabel: row.field_label,
      extractionKey: row.extraction_key,
      referencePhysicalName: row.reference_physical_name,
      referenceColumnName: row.reference_column_name,
    };
    rule.operands.push(operand);
  }
  return [...grouped.values()];
}

const RULE_SQL = `
SELECT r.rule_code,
       r.rule_name,
       r.rule_type::text AS rule_type,
       r.rule_stage::text AS rule_stage,
       r.match_level::text AS match_level,
       r.target_match_mode::text AS target_match_mode,
       r.min_targets_matched,
       r.is_active,
       r.failure_action::text AS failure_action,
       r.handler_key,
       r.tolerance_mode::text AS tolerance_mode,
       r.tolerance_pct,
       r.tolerance_amount,
       r.tolerance_days,
       o.seq,
       o.role::text AS role,
       o.origin::text AS origin,
       o.operand_alias,
       o.invoice_category_id,
       o.match_method::text AS match_method,
       d.document_code,
       p.data_point_code,
       p.data_point_name,
       f.field_label,
       f.extraction_key,
       rt.physical_name AS reference_physical_name,
       rf.column_name AS reference_column_name
  FROM cfg."VALIDATION_RULE" r
  LEFT JOIN cfg."RULE_OPERAND" o
    ON o.validation_rule_id = r.validation_rule_id
  LEFT JOIN cfg."BUNDLE_DOCUMENT_FIELD" f
    ON f.bundle_document_field_id = o.bundle_document_field_id
  LEFT JOIN cfg."BUNDLE_DOCUMENT_TYPE" d
    ON d.bundle_document_type_id = f.bundle_document_type_id
  LEFT JOIN cfg."REFERENCE_FIELD" rf
    ON rf.reference_field_id = o.reference_field_id
  LEFT JOIN cfg."REFERENCE_TABLE" rt
    ON rt.reference_table_id = rf.reference_table_id
  LEFT JOIN cfg."DATA_POINT" p
    ON p.data_point_id = COALESCE(f.data_point_id, rf.data_point_id)
 WHERE r.rule_type = 'EXACT'
   AND r.rule_stage = 'HEADER'
   AND r.match_level = 'HEADER'
   AND (
        (
          r.applies_to_all_categories
          AND (
            :hasCategory = 'false'
            OR NOT EXISTS (
              SELECT 1
                FROM cfg."VALIDATION_RULE_CATEGORY" x
                JOIN cfg."VAL_INVOICE_CATEGORY" c
                  ON c.invoice_category_id = x.invoice_category_id
               WHERE x.validation_rule_id = r.validation_rule_id
                 AND x.scope = 'EXCLUDE'
                 AND c.category_code = :categoryCode
            )
          )
        )
        OR (
          :hasCategory = 'true'
          AND NOT r.applies_to_all_categories
          AND EXISTS (
            SELECT 1
              FROM cfg."VALIDATION_RULE_CATEGORY" x
              JOIN cfg."VAL_INVOICE_CATEGORY" c
                ON c.invoice_category_id = x.invoice_category_id
             WHERE x.validation_rule_id = r.validation_rule_id
               AND x.scope = 'INCLUDE'
               AND c.category_code = :categoryCode
          )
        )
       )
 ORDER BY r.priority, r.rule_code, o.seq`;

class MatrixRuleValidationService {
  async evaluate(input: MatrixValidationInput): Promise<MatrixRuleOutcome[]> {
    const category = await matrixDocumentReadService.resolveInvoiceCategory(
      matrixCategoryCandidates(input.invoiceCategoryCode, input.invoiceTypeCode),
    );
    const rows = await this.loadRules(category?.categoryCode ?? null);
    const documents = classifiedDocumentsFromValidationInput({
      header: (input.header || null) as Record<string, unknown> | null,
      lineItems: (input.lineItems || null) as Array<Record<string, unknown>> | null,
      supportingDocs: (input.supportingDocs || null) as Record<
        string,
        {
          header?: Record<string, unknown> | null;
          lineItems?: Array<Record<string, unknown>> | null;
        }
      > | null,
      bundleDocuments: input.bundleDocuments,
    });
    return evaluateMatrixRules(rows, documents, category?.invoiceCategoryId ?? null);
  }

  private async loadRules(categoryCode: string | null): Promise<MatrixRule[]> {
    try {
      const rows = (await sequelize.query(RULE_SQL, {
        replacements: {
          hasCategory: categoryCode ? "true" : "false",
          categoryCode: categoryCode || "",
        },
        type: QueryTypes.SELECT,
      })) as RuleRow[];
      return groupRules(rows);
    } catch (error) {
      if (missingRelation(error)) {
        logger.warn("MATRIX_RULE_LOAD_SKIPPED cfg validation tables are not installed");
        return [];
      }
      throw error;
    }
  }
}

export default new MatrixRuleValidationService();
