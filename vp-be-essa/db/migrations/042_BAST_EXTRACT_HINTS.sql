-- Migration 042: Work Progress Certificate hints name the certificate labels.
-- Already-read values stay; vendor, ESSA company, completion, and hours
-- are asked for under the keys the extract table uses.
-- Idempotent.

SET search_path = cfg, public;

UPDATE "BUNDLE_DOCUMENT_FIELD" f
   SET extraction_hint = v.hint
  FROM "BUNDLE_DOCUMENT_TYPE" d,
       "DATA_POINT" p,
       (VALUES
         ('DP_1_01', 'Contractor who performed the work. On these certificates that is PT. AMANAH LESTARI ENERGY: the letterhead, Penyedia, Kontraktor, or Pihak Kedua. Not a signatory name and not PT. PANCA AMARA UTAMA.'),
         ('DP_1_04', 'Nomor Kontrak / Contract Number on this certificate. Drop a leading PO. Example 4203000794. Not the invoice number 651/PT.ALE-PAU/09/2026.'),
         ('DP_1_11', 'ESSA company the work is certified to. Example PT. PANCA AMARA UTAMA: Pemberi Kerja, Pemilik, or Pihak Pertama. Not the contractor PT. AMANAH LESTARI ENERGY.'),
         ('DP_1_23', 'This Period percentage only, in the progress table. Example Previous | This Period 7,44% | Cumulative 64,35% means 7,44%. Do not use Cumulative or Previous Period.'),
         ('DP_3_01', 'This Manhours for this period only, for example 408,00. Do not use Previous manhours, Cumulative manhours, or the contract-length total.'),
         ('DP_3_03', 'Overtime hours on this certificate only, when a separate OT or lembur hours figure is printed. Leave empty when the page only shows This Manhours. Do not copy 408,00 into overtime.')
       ) AS v(data_point_code, hint)
 WHERE f.bundle_document_type_id = d.bundle_document_type_id
   AND f.data_point_id = p.data_point_id
   AND d.document_code = 'WORK_PROGRESS_CERTIFICATE_BAST'
   AND p.data_point_code = v.data_point_code;

UPDATE "AP_EXTRACTION_PROMPT_TEMPLATE" p
   SET "PromptText" = replace(replace(replace(replace(
         p."PromptText",
         '- poNumber  // "Nomor Kontrak / Contract Number", drop the "PO" prefix.',
         '- vendorName  // Contractor who did the work. PT. AMANAH LESTARI ENERGY: letterhead, Penyedia, Kontraktor, or Pihak Kedua. Not a signatory name and not PT. PANCA AMARA UTAMA.' || chr(10) ||
         '- essaCompanyName  // ESSA / owner company the certificate is addressed to. PT. PANCA AMARA UTAMA: Pemberi Kerja, Pemilik, or Pihak Pertama. Not the contractor.' || chr(10) ||
         '- poNumber  // "Nomor Kontrak / Contract Number". Drop a leading PO. Example 4203000794. Not the invoice number.'
       ),
         '- periodStart  // Left date of "Periode / Period", e.g. 20 July - 19 August 2026.',
         '- periodStart  // Start of the claim period next to this progress, for example 20 July 2026. If the page also prints a contract window such as 20 January 2026 - 19 January 2027, do not use that longer range.'
       ),
         '- periodEnd  // Right date of the same range; year is printed once at the end.',
         '- periodEnd  // End of that same claim period, for example 19 August 2026. Not 19 January 2027 when that date is only the contract end.'
       ),
         '- pctThisPeriod  // "This Period" percentage, decimal comma (7,44%).' || chr(10) ||
         '- pctCumulative  // "Cumulative" percentage.' || chr(10) ||
         '- manhoursThisPeriod  // "This Manhours", e.g. 408,00.',
         '- percentageCompletion  // "This Period" percentage only. Example 7,44%. Do not use Cumulative (64,35%) or Previous Period. Also set pctThisPeriod to the same value.' || chr(10) ||
         '- pctCumulative  // "Cumulative" percentage, kept separate from This Period.' || chr(10) ||
         '- manhourQuantity  // "This Manhours" for this period only, for example 408,00. Not Previous and not Cumulative. Also set manhoursThisPeriod to the same value.' || chr(10) ||
         '- overtimeQuantity  // Overtime / lembur hours for this period only, when a separate OT figure is printed. Leave null when the certificate only shows This Manhours. Do not copy This Manhours here.'
       ),
       "UpdatedAt" = NOW()
  FROM "AP_EXTRACTION_INVOICE_TYPE" t
 WHERE p."InvoiceTypeId" = t."InvoiceTypeId"
   AND t."Code" = 'MANPOWER_SERVICES'
   AND p."PromptText" LIKE '%- poNumber  // "Nomor Kontrak / Contract Number", drop the "PO" prefix.%';
