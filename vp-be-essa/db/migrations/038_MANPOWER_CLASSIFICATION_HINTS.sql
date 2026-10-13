-- Migration 038: page-classifier hints for Manpower documents.
-- Written from ALE invoices 651/PT.ALE-PAU/09/2026 (PO 4203000794)
-- and 652/PT.ALE-PAU/09/2026 (PO 4203000560), plus the matrix document roles.
-- Idempotent.

SET search_path = cfg, public;

ALTER TABLE "CATEGORY_BUNDLE_DOCUMENT"
  ADD COLUMN IF NOT EXISTS classification_hints TEXT;

UPDATE "CATEGORY_BUNDLE_DOCUMENT" b
   SET classification_hints = v.hint
  FROM "VAL_INVOICE_CATEGORY" c,
       "BUNDLE_DOCUMENT_TYPE" d,
       (VALUES
         ('INVOICE', 'Commercial invoice with a large INVOICE heading, vendor letterhead such as PT. AMANAH LESTARI ENERGY, JOB NO, MESSRS, ATTENTION, INVOICE NO like 651/PT.ALE-PAU/09/2026, DATE, PAYMENT TERM, a DESCRIPTION claim table (Manpower Supply, Nth Claim, period, Direct Cost or Monday to Friday, Overtime, Site Management), Contract Order No. PO 4203, Total, VAT 11%, Grand Total, and Please remit to the following bank. One continuous block. A page titled KWITANSI with Sudah Terima Dari is not this invoice.'),
         ('PO', 'Purchase order from PO master or a scanned PURCHASE ORDER. Title PURCHASE ORDER, PO number in the 4203 series such as 4203000794 or 4203000560, vendor, and manpower role lines with quantity and unit rate. Not the commercial invoice, which only cites Contract Order No.'),
         ('FAKTUR_PAJAK', 'Indonesian Faktur Pajak or e-Faktur. DJP logo, QR or barcode, Kode dan Nomor Seri Faktur Pajak, seller NPWP, DPP, and PPN. Not the commercial invoice, even when that invoice prints a VAT 11% row and a Grand Total, and not a Kwitansi.'),
         ('WORK_PROGRESS_CERTIFICATE_BAST', 'Berita Acara, Work Progress Certificate, BAP, or BAST. Approval block such as Prepared, Reviewed, Acknowledged, Approved, plus the work period and certified man-hours or claim value. A claim line on the commercial invoice, such as 7th Claim or 9th Claim, is not Berita Acara.'),
         ('TIMESHEET', 'Daily time sheet, usually landscape. Date, worker name, IN and OUT or hours, daily activity, and a sign-off. The period matches the invoice claim, such as 20 July - 19 August 2026 or 01 - 31 August 2026. A PO number in the header does not make this a purchase order. Pages are often scattered through the bundle.'),
         ('FACE_ID', 'Daily attendance from Face ID or a fingerprint log. Date, person name or ID, and check-in or check-out events. Not a daily time sheet and not a meal attendance sheet.'),
         ('MANPOWER_SUMMARY', 'Manhour summary or summary of claim. Rows by worker or role with man-hour quantity, unit rate, overtime hours, and period totals. Not the commercial invoice, which prints claim amounts only and does not show hours times rate.'),
         ('CONTRACT_ENGAGEMENT_LETTER', 'Contract or engagement letter for manpower supply. Parties, contract or PO number, man-hour unit rates, payment terms, and any retention or liquidated damages clause. Not a monthly invoice and not a timesheet.'),
         ('OVERTIME_APPROVAL', 'Overtime approval. Named workers or roles, overtime hours, the claim period, and an approval signature. Not the commercial invoice overtime lump amount and not the daily time sheet.')
       ) AS v(document_code, hint)
 WHERE b.invoice_category_id = c.invoice_category_id
   AND b.bundle_document_type_id = d.bundle_document_type_id
   AND c.category_code = 'MANPOWER_OUTSOURCING'
   AND d.document_code = v.document_code;
