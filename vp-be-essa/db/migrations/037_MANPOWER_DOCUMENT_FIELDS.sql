-- Migration 037: Manpower bundle documents and capture fields.
-- Common documents from Data Point x Doc Matrix V2, plus manpower documents:
-- Invoice, PO, Faktur Pajak, Work Progress Certificate / BAST,
-- Timesheet, Daily attendance (Face ID), Manpower Summary.
-- Contract and Overtime approval stay because section 3 marks them.
-- Idempotent.

SET search_path = cfg, public;

INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'PO', 'PO', 'SYSTEM_GENERATED', 'PO Master', 'G'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'PO');

INSERT INTO "BUNDLE_DOCUMENT_TYPE" (document_code, document_name, channel, supplied_by, matrix_column_ref)
SELECT 'FACE_ID', 'Daily attendance', 'SYSTEM_GENERATED', 'Biometric Machine - ESSA', 'AB'
WHERE NOT EXISTS (SELECT 1 FROM "BUNDLE_DOCUMENT_TYPE" WHERE document_code = 'FACE_ID');

INSERT INTO "CATEGORY_BUNDLE_DOCUMENT" (invoice_category_id, bundle_document_type_id, requirement, display_order)
SELECT c.invoice_category_id, d.bundle_document_type_id, 'UNRESOLVED', v.display_order
FROM "VAL_INVOICE_CATEGORY" c
JOIN (VALUES
  ('INVOICE', 1),
  ('PO', 2),
  ('FAKTUR_PAJAK', 3),
  ('WORK_PROGRESS_CERTIFICATE_BAST', 4),
  ('TIMESHEET', 5),
  ('FACE_ID', 6),
  ('MANPOWER_SUMMARY', 7),
  ('CONTRACT_ENGAGEMENT_LETTER', 8),
  ('OVERTIME_APPROVAL', 9)
) AS v(document_code, display_order) ON TRUE
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.document_code = v.document_code
WHERE c.category_code = 'MANPOWER_OUTSOURCING'
  AND NOT EXISTS (
    SELECT 1 FROM "CATEGORY_BUNDLE_DOCUMENT" b
    WHERE b.invoice_category_id = c.invoice_category_id
      AND b.bundle_document_type_id = d.bundle_document_type_id
  );

UPDATE "CATEGORY_BUNDLE_DOCUMENT" b
   SET display_order = v.display_order
  FROM "VAL_INVOICE_CATEGORY" c,
       "BUNDLE_DOCUMENT_TYPE" d,
       (VALUES
         ('INVOICE', 1),
         ('PO', 2),
         ('FAKTUR_PAJAK', 3),
         ('WORK_PROGRESS_CERTIFICATE_BAST', 4),
         ('TIMESHEET', 5),
         ('FACE_ID', 6),
         ('MANPOWER_SUMMARY', 7),
         ('CONTRACT_ENGAGEMENT_LETTER', 8),
         ('OVERTIME_APPROVAL', 9)
       ) AS v(document_code, display_order)
 WHERE b.invoice_category_id = c.invoice_category_id
   AND b.bundle_document_type_id = d.bundle_document_type_id
   AND c.category_code = 'MANPOWER_OUTSOURCING'
   AND d.document_code = v.document_code;

-- PO and daily attendance fields marked for Common or Manpower on those columns.
INSERT INTO "BUNDLE_DOCUMENT_FIELD" (
  bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label, extraction_key, is_active
)
SELECT d.bundle_document_type_id, p.data_point_id, v.matrix_ref, 'EXACT'::cfg.matrix_mark,
       p.data_point_name, v.extraction_key, TRUE
FROM "BUNDLE_DOCUMENT_TYPE" d
JOIN (VALUES
  ('PO', 'DP_1_01', '1.01', 'vendorName'),
  ('PO', 'DP_1_04', '1.04', 'poNumber'),
  ('PO', 'DP_1_06', '1.06', 'unitRate'),
  ('PO', 'DP_1_07', '1.07', 'paymentTerms'),
  ('PO', 'DP_1_08', '1.08', 'invoiceAmount'),
  ('PO', 'DP_1_09', '1.09', 'itemDescription'),
  ('PO', 'DP_1_10', '1.10', 'quantity'),
  ('PO', 'DP_1_11', '1.11', 'essaCompanyName'),
  ('PO', 'DP_1_20', '1.20', 'liquidatedClause'),
  ('PO', 'DP_1_21', '1.21', 'retentionClause'),
  ('PO', 'DP_1_22', '1.22', 'advanceRecoveryClause'),
  ('PO', 'DP_1_23', '1.23', 'percentageCompletion'),
  ('PO', 'DP_1_26', '1.26', 'currency'),
  ('PO', 'DP_1_30', '1.30', 'paymentDueDate'),
  ('PO', 'DP_1_32', '1.32', 'poRemainingBalance'),
  ('PO', 'DP_3_01', '3.01', 'manhourQuantity'),
  ('PO', 'DP_3_02', '3.02', 'manhourUnitRate'),
  ('PO', 'DP_3_03', '3.03', 'overtimeQuantity'),
  ('PO', 'DP_3_04', '3.04', 'overtimeUnitRate'),
  ('FACE_ID', 'DP_1_10', '1.10', 'quantity')
) AS v(document_code, data_point_code, matrix_ref, extraction_key) ON d.document_code = v.document_code
JOIN "DATA_POINT" p ON p.data_point_code = v.data_point_code
WHERE NOT EXISTS (
  SELECT 1 FROM "BUNDLE_DOCUMENT_FIELD" f
  WHERE f.bundle_document_type_id = d.bundle_document_type_id
    AND f.data_point_id = p.data_point_id
);

UPDATE "BUNDLE_DOCUMENT_FIELD" f
   SET extraction_key = v.extraction_key,
       is_active = TRUE
  FROM "DATA_POINT" p,
       (VALUES
         ('DP_1_01', 'vendorName'),
         ('DP_1_02', 'bankAccountNumber'),
         ('DP_1_03', 'invoiceDate'),
         ('DP_1_04', 'poNumber'),
         ('DP_1_05', 'invoiceNumber'),
         ('DP_1_06', 'unitRate'),
         ('DP_1_07', 'paymentTerms'),
         ('DP_1_08', 'invoiceAmount'),
         ('DP_1_09', 'itemDescription'),
         ('DP_1_10', 'quantity'),
         ('DP_1_11', 'essaCompanyName'),
         ('DP_1_12', 'vendorNpwp'),
         ('DP_1_13', 'fakturPajakValue'),
         ('DP_1_14', 'fakturPajakDate'),
         ('DP_1_15', 'fakturPajakVendorName'),
         ('DP_1_16', 'fakturPajakNumber'),
         ('DP_1_17', 'fakturPajakBarcode'),
         ('DP_1_18', 'negativeVendorList'),
         ('DP_1_20', 'liquidatedClause'),
         ('DP_1_21', 'retentionClause'),
         ('DP_1_22', 'advanceRecoveryClause'),
         ('DP_1_23', 'percentageCompletion'),
         ('DP_1_24', 'duplicateInvoiceCheck'),
         ('DP_1_25', 'duplicateFakturPajakCheck'),
         ('DP_1_26', 'currency'),
         ('DP_1_27', 'exchangeRate'),
         ('DP_1_28', 'ppnRateAndDpp'),
         ('DP_1_29', 'whtTypeAndRate'),
         ('DP_1_30', 'paymentDueDate'),
         ('DP_1_31', 'dateSequence'),
         ('DP_1_32', 'poRemainingBalance'),
         ('DP_1_33', 'bankAccountChanged'),
         ('DP_3_01', 'manhourQuantity'),
         ('DP_3_02', 'manhourUnitRate'),
         ('DP_3_03', 'overtimeQuantity'),
         ('DP_3_04', 'overtimeUnitRate')
       ) AS v(data_point_code, extraction_key)
 WHERE f.data_point_id = p.data_point_id
   AND p.data_point_code = v.data_point_code
   AND f.bundle_document_type_id IN (
     SELECT bundle_document_type_id FROM "BUNDLE_DOCUMENT_TYPE"
     WHERE document_code IN (
       'INVOICE', 'PO', 'FAKTUR_PAJAK', 'WORK_PROGRESS_CERTIFICATE_BAST',
       'TIMESHEET', 'FACE_ID', 'MANPOWER_SUMMARY',
       'CONTRACT_ENGAGEMENT_LETTER', 'OVERTIME_APPROVAL'
     )
   );

UPDATE "DATA_POINT" AS p
   SET description = v.hint
  FROM (VALUES
    ('DP_1_13', 'VAT amount. On the ALE invoices this is the VAT 11% row: Rp 2.320.421 on invoice 651 and Rp 2.771.729 on invoice 652. Match it to the Faktur Pajak value.'),
    ('DP_1_14', 'Tax invoice date. It is not the commercial DATE (03/09/2026 or 10/09/2026). Read it from the Faktur Pajak.'),
    ('DP_1_15', 'Seller name on the Faktur Pajak. The commercial letterhead is PT. AMANAH LESTARI ENERGY.'),
    ('DP_1_16', 'Faktur Pajak number. It is not the commercial INVOICE NO 651/PT.ALE-PAU/09/2026 or 652/PT.ALE-PAU/09/2026.'),
    ('DP_1_17', 'Barcode or QR on the Faktur Pajak. The commercial invoice and Kwitansi do not print one.'),
    ('DP_1_18', 'SAP vendor-master block flag. Not printed on the ALE manpower invoice.'),
    ('DP_1_20', 'Liquidated damages clause on the PO or contract. Not printed on invoices 651 or 652.'),
    ('DP_1_21', 'Retention clause on the PO or contract. These invoices have no retention line.'),
    ('DP_1_22', 'Advance recovery clause on the PO or contract. These invoices have no advance recovery line.'),
    ('DP_1_23', 'Completion percent on the BAST. These invoices show a claim number in the line, such as 7th Claim or 9th Claim, not a percent.'),
    ('DP_1_24', 'Duplicate check on vendor, invoice number, amount, and date. Example keys: PT. AMANAH LESTARI ENERGY, 651/PT.ALE-PAU/09/2026, Rp 21.094.733, 03/09/2026.'),
    ('DP_1_25', 'Duplicate check on the Faktur Pajak number against the tax invoice register.'),
    ('DP_1_27', 'These invoices are IDR only (AMOUNT (IDR), values prefixed Rp). Leave empty unless an exchange rate is printed.'),
    ('DP_1_29', 'Withholding tax is not printed. The only tax row is VAT 11%.'),
    ('DP_1_30', 'PAYMENT TERM is 30 Days From Invoice Date. Due date is the invoice date plus 30 days, from 03/09/2026 or 10/09/2026.'),
    ('DP_1_31', 'Service period is inside the claim line (20 July - 19 August 2026 or 01 - 31 August 2026), then the invoice DATE, then the Faktur Pajak date.'),
    ('DP_1_32', 'Remaining PO balance for Contract Order No. PO 4203000794 or PO4203000560. Read it from the PO, not the invoice.'),
    ('DP_1_33', 'Compare the remit Bank Account, for example 151-00-1017369-5, with the account on the last payment.')
  ) AS v(code, hint)
 WHERE p.data_point_code = v.code;
