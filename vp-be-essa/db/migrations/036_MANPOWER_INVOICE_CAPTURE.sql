-- Migration 036: Manpower category display name, and Invoice capture
-- field names plus hints taken from ALE manpower invoices
-- 651/PT.ALE-PAU/09/2026 (PO 4203000794, FRP craftsman)
-- and 652/PT.ALE-PAU/09/2026 (PO 4203000560, machinist workshop).
-- Idempotent. Safe to re-run after 034.

SET search_path = cfg, public;

UPDATE "VAL_INVOICE_CATEGORY"
   SET category_name = 'Manpower'
 WHERE category_code = 'MANPOWER_OUTSOURCING';

UPDATE "DATA_POINT" AS p
   SET description = v.hint
  FROM (VALUES
    ('DP_1_01', 'Letterhead under the ALE logo, for example PT. AMANAH LESTARI ENERGY. Also Account Name in Please remit to the following bank, and the payee under Mohon Dikirimkan Di on the Kwitansi.'),
    ('DP_1_02', 'Bank Account in Please remit to the following bank, for example 151-00-1017369-5. On the Kwitansi the same account sits under Mohon Dikirimkan Di, Bank MANDIRI Cabang Luwuk.'),
    ('DP_1_03', 'Label DATE next to INVOICE NO, written DD/MM/YYYY, for example 03/09/2026 or 10/09/2026. The Kwitansi repeats it as Desa Padang, 03 September 2026.'),
    ('DP_1_04', 'Contract Order No. under the claim lines, for example PO 4203000794 or PO4203000560. The Kwitansi Untuk Pembayaran line also contains the PO number.'),
    ('DP_1_05', 'Label INVOICE NO, for example 651/PT.ALE-PAU/09/2026 or 652/PT.ALE-PAU/09/2026. The Kwitansi shows the same value as No.'),
    ('DP_1_06', 'These manpower invoices print claim line amounts, not a unit rate. Leave empty unless a rate is printed. The man-hour rate is on the timesheet or manpower summary.'),
    ('DP_1_07', 'Label PAYMENT TERM, for example 30 Days From Invoice Date.'),
    ('DP_1_08', 'The Total row before VAT, for example Rp 21.094.733 or Rp 25.197.533. Do not use Grand Total. Grand Total is Total plus VAT 11%.'),
    ('DP_1_09', 'Service title under DESCRIPTION, for example Manpower Supply for FRP (Pipe Fitter & Craftsman) or Manpower Supply for Machinist workshop, plus each claim line and its amount. The period is inside the line, such as 20 July - 19 August 2026 or 01 - 31 August 2026.'),
    ('DP_1_10', 'These invoices have no quantity column. Each claim line is a description and an amount only.'),
    ('DP_1_11', 'MESSRS bill-to, for example PT. PANCA AMARA UTAMA. On the Kwitansi this is Sudah Terima Dari.'),
    ('DP_1_12', 'Letterhead NPWP, for example 82.212.670.2.832.000.'),
    ('DP_1_26', 'Amount column is AMOUNT (IDR) and values are prefixed Rp. Currency is IDR.'),
    ('DP_1_28', 'DPP is the Total row before tax. PPN is the VAT 11% row, for example Rp 2.320.421 on DPP Rp 21.094.733. Grand Total is Total plus VAT.'),
    ('DP_3_01', 'Not printed as a quantity on the ALE manpower invoice. Claim lines are amounts only (for example Direct Cost or Monday to Friday). Take the man-hour count from the timesheet or manpower summary.'),
    ('DP_3_02', 'Not printed on the ALE manpower invoice. The invoice shows claim line amounts, not a rate. Take the man-hour unit rate from the timesheet or manpower summary.'),
    ('DP_3_03', 'The invoice has an Overtime claim line with an amount only, for example 7th Claim for 20 July - 19 August 2026 Overtime. Hours are not on the invoice. Take overtime hours from the timesheet or overtime approval.'),
    ('DP_3_04', 'Not printed on the ALE manpower invoice. The Overtime row is a lump amount (Rp 2.869.000 or Rp 3.752.000). Take the overtime unit rate from the timesheet or overtime approval.')
  ) AS v(code, hint)
 WHERE p.data_point_code = v.code;

UPDATE "BUNDLE_DOCUMENT_FIELD" AS f
   SET extraction_key = v.field_name
  FROM "BUNDLE_DOCUMENT_TYPE" d,
       "DATA_POINT" p,
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
         ('DP_1_26', 'currency'),
         ('DP_1_28', 'ppnRateAndDpp'),
         ('DP_3_01', 'manhourQuantity'),
         ('DP_3_02', 'manhourUnitRate'),
         ('DP_3_03', 'overtimeQuantity'),
         ('DP_3_04', 'overtimeUnitRate')
       ) AS v(code, field_name)
 WHERE f.bundle_document_type_id = d.bundle_document_type_id
   AND f.data_point_id = p.data_point_id
   AND d.document_code = 'INVOICE'
   AND p.data_point_code = v.code;
