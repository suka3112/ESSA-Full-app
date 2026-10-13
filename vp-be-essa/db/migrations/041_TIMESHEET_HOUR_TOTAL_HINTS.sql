-- Migration 041: Timesheet hints ask for the contractor name and for
-- summed regular hours and summed overtime hours.
-- Per-document hints, so the commercial invoice descriptions stay as they are.
-- Idempotent.

SET search_path = cfg, public;

UPDATE "BUNDLE_DOCUMENT_FIELD" f
   SET extraction_hint = v.hint
  FROM "BUNDLE_DOCUMENT_TYPE" d,
       "DATA_POINT" p,
       (VALUES
         ('DP_1_01', 'Contractor company on the timesheet letterhead. Example PT. AMANAH LESTARI ENERGY. Not the worker after Name, not Badge No or No. ID, and not the buyer PT. PANCA AMARA UTAMA.'),
         ('DP_3_01', 'One total for every timesheet page in the bundle. Add regular hours from the Basic Time column, or add each page footer under Basic Time. Skip blanks, dashes, and day-off rows with no hours. Do not return a single day or a single worker.'),
         ('DP_3_03', 'One total for every timesheet page in the bundle. Add overtime hours from the OT Actual column (hours worked). Do not use OT Paid when that column is a weighted figure. Use each page OT Actual footer when it is printed, otherwise add the daily cells. Skip blanks and dashes. Do not return a single day or a single worker.')
       ) AS v(data_point_code, hint)
 WHERE f.bundle_document_type_id = d.bundle_document_type_id
   AND f.data_point_id = p.data_point_id
   AND d.document_code = 'TIMESHEET'
   AND p.data_point_code = v.data_point_code;

UPDATE "AP_EXTRACTION_FIELD" f
   SET "Hint" = v.hint,
       "UpdatedAt" = NOW()
  FROM "AP_EXTRACTION_TYPE_DOCUMENT" td
  JOIN "AP_EXTRACTION_INVOICE_TYPE" t
    ON t."InvoiceTypeId" = td."InvoiceTypeId"
  JOIN "AP_EXTRACTION_DOCUMENT" d
    ON d."DocumentId" = td."DocumentId"
  JOIN (VALUES
    ('vendorName', 'Contractor company on the timesheet letterhead. Example PT. AMANAH LESTARI ENERGY. Not the worker after Name, not Badge No or No. ID, and not the buyer PT. PANCA AMARA UTAMA.'),
    ('manhourQuantity', 'One total for every timesheet page. Add Basic Time (regular hours) for every worker and every date, or add each page Basic Time footer. Skip blanks and dashes.'),
    ('overtimeQuantity', 'One total for every timesheet page. Add OT Actual hours for every worker and every date. Do not use OT Paid when that column is weighted. Skip blanks and dashes.')
  ) AS v(field_name, hint) ON true
 WHERE f."TypeDocumentId" = td."TypeDocumentId"
   AND t."Code" = 'MANPOWER_SERVICES'
   AND d."Name" ILIKE '%time%sheet%'
   AND f."FieldName" = v.field_name
   AND f."IsDeleted" = false;

INSERT INTO "AP_EXTRACTION_FIELD" (
  "TypeDocumentId", "FieldName", "DisplayName", "Hint", "FieldKind", "DisplayOrder", "IsDeleted", "CreatedAt"
)
SELECT td."TypeDocumentId",
       v.field_name,
       v.label,
       v.hint,
       'scalar',
       COALESCE(mx.max_order, 0) + v.ord,
       false,
       NOW()
  FROM "AP_EXTRACTION_TYPE_DOCUMENT" td
  JOIN "AP_EXTRACTION_INVOICE_TYPE" t
    ON t."InvoiceTypeId" = td."InvoiceTypeId"
  JOIN "AP_EXTRACTION_DOCUMENT" d
    ON d."DocumentId" = td."DocumentId"
  JOIN (VALUES
    (1, 'vendorName', 'Vendor name', 'Contractor company on the timesheet letterhead. Example PT. AMANAH LESTARI ENERGY. Not the worker after Name, not Badge No or No. ID, and not the buyer PT. PANCA AMARA UTAMA.'),
    (2, 'manhourQuantity', 'Man-hours Qty.', 'One total for every timesheet page. Add Basic Time (regular hours) for every worker and every date, or add each page Basic Time footer. Skip blanks and dashes.'),
    (3, 'overtimeQuantity', 'Overtime Qty.', 'One total for every timesheet page. Add OT Actual hours for every worker and every date. Do not use OT Paid when that column is weighted. Skip blanks and dashes.')
  ) AS v(ord, field_name, label, hint) ON true
  LEFT JOIN LATERAL (
    SELECT MAX(f."DisplayOrder") AS max_order
      FROM "AP_EXTRACTION_FIELD" f
     WHERE f."TypeDocumentId" = td."TypeDocumentId"
  ) mx ON true
 WHERE t."Code" = 'MANPOWER_SERVICES'
   AND d."Name" ILIKE '%time%sheet%'
   AND NOT EXISTS (
     SELECT 1
       FROM "AP_EXTRACTION_FIELD" f
      WHERE f."TypeDocumentId" = td."TypeDocumentId"
        AND f."FieldName" = v.field_name
        AND f."IsDeleted" = false
   );

UPDATE "AP_EXTRACTION_PROMPT_TEMPLATE" p
   SET "PromptText" = replace(
         p."PromptText",
         '## Daily Timesheet' || chr(10) ||
         '### header (single values ' || chr(8212) || ' put these under JSON key "header")' || chr(10) ||
         '- (no single-value fields)',
         '## Daily Timesheet' || chr(10) ||
         '### header (single values ' || chr(8212) || ' put these under JSON key "header")' || chr(10) ||
         '- vendorName  // Contractor company on the timesheet letterhead. Example PT. AMANAH LESTARI ENERGY. Not the worker after Name, not Badge No or No. ID, and not the buyer PT. PANCA AMARA UTAMA.' || chr(10) ||
         '- poNumber  // PO or Contract Order number printed on the timesheet. Example 4203000794.' || chr(10) ||
         '- manhourQuantity  // One total for every timesheet page. Add regular hours from the Basic Time column, or add each page footer under Basic Time. Skip blanks, dashes, and day-off rows with no hours. Do not return a single day or a single worker.' || chr(10) ||
         '- overtimeQuantity  // One total for every timesheet page. Add overtime hours from OT Actual (hours worked). Do not use OT Paid when that column is a weighted figure. Use each page OT Actual footer when printed, otherwise add the daily OT Actual cells. Skip blanks and dashes. Do not return a single day or a single worker.'
       ),
       "UpdatedAt" = NOW()
  FROM "AP_EXTRACTION_INVOICE_TYPE" t
 WHERE p."InvoiceTypeId" = t."InvoiceTypeId"
   AND t."Code" = 'MANPOWER_SERVICES'
   AND position('- (no single-value fields)' IN substring(p."PromptText" FROM position('## Daily Timesheet' IN p."PromptText") FOR 400)) > 0;
