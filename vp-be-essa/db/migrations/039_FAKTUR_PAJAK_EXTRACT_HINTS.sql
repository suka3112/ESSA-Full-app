-- Migration 039: Faktur Pajak field hints point at e-Faktur labels.
-- Stored on the document field so the commercial invoice hints stay unchanged.
-- Idempotent.

SET search_path = cfg, public;

ALTER TABLE "BUNDLE_DOCUMENT_FIELD"
  ADD COLUMN IF NOT EXISTS extraction_hint TEXT;

UPDATE "BUNDLE_DOCUMENT_FIELD" f
   SET extraction_hint = v.hint
  FROM "BUNDLE_DOCUMENT_TYPE" d,
       "DATA_POINT" p,
       (VALUES
         ('DP_1_01', 'Seller name under Pengusaha Kena Pajak (Nama). Example PT. AMANAH LESTARI ENERGY. Not the commercial invoice letterhead.'),
         ('DP_1_03', 'Date only from Tempat dan Tanggal Ditandatangani, or the date beside the QR (Tanggal Faktur). Drop the city. Example 03 September 2026.'),
         ('DP_1_05', 'Referensi only when it prints the commercial invoice number, such as 651/PT.ALE-PAU/09/2026. Do not put the 15-17 digit Kode dan Nomor Seri here.'),
         ('DP_1_08', 'Dasar Pengenaan Pajak (DPP / Harga Jual / Penggantian). Not Jumlah PPN and not the commercial Grand Total.'),
         ('DP_1_09', 'Nama Barang Kena Pajak / Jasa Kena Pajak. Manpower wording such as Manpower Supply may appear here.'),
         ('DP_1_11', 'Buyer name under Pembeli Barang Kena Pajak / Penerima Jasa (Nama), for example PT. PANCA AMARA UTAMA.'),
         ('DP_1_12', 'NPWP under Pengusaha Kena Pajak. Keep the dotted NPWP format.'),
         ('DP_1_13', 'Jumlah PPN (Pajak Pertambahan Nilai), for example 2.320.421,00. Not the DPP.'),
         ('DP_1_14', 'Same tax invoice date as Tempat dan Tanggal Ditandatangani or the date beside the QR.'),
         ('DP_1_15', 'Seller name, Pengusaha Kena Pajak / Nama.'),
         ('DP_1_16', 'Kode dan Nomor Seri Faktur Pajak, the 15-17 digit e-Faktur serial such as 04002600351668820. Not the commercial INVOICE NO.'),
         ('DP_1_17', 'QR or barcode printed on the e-Faktur. Copy the value under it when one is printed.'),
         ('DP_1_25', 'Not printed on the page. The Kode dan Nomor Seri is the value checked for duplicates.'),
         ('DP_1_26', 'IDR when the amounts are Rupiah.'),
         ('DP_1_27', 'Leave empty. These Faktur Pajak pages are IDR and do not print an exchange rate.'),
         ('DP_1_28', 'Dasar Pengenaan Pajak (DPP) and the PPN rate printed beside PPN, usually 11% or 12%.'),
         ('DP_1_31', 'Not a printed label. Use the tax invoice date from Tempat dan Tanggal Ditandatangani.')
       ) AS v(data_point_code, hint)
 WHERE f.bundle_document_type_id = d.bundle_document_type_id
   AND f.data_point_id = p.data_point_id
   AND d.document_code = 'FAKTUR_PAJAK'
   AND p.data_point_code = v.data_point_code;
