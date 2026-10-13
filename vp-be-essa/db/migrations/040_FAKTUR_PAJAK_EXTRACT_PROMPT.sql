-- Migration 040: Manpower Faktur Pajak extraction prompt asks for the e-Faktur fields.
-- The live extractor uses AP_EXTRACTION_PROMPT_TEMPLATE, not the cfg hint column.
-- Idempotent: the prompt replace matches the previous three-field block only.

UPDATE "AP_EXTRACTION_FIELD" f
   SET "Hint" = v.hint,
       "UpdatedAt" = NOW()
  FROM "AP_EXTRACTION_TYPE_DOCUMENT" td
  JOIN "AP_EXTRACTION_INVOICE_TYPE" t
    ON t."InvoiceTypeId" = td."InvoiceTypeId"
  JOIN "AP_EXTRACTION_DOCUMENT" d
    ON d."DocumentId" = td."DocumentId"
  JOIN (VALUES
    ('taxInvoiceNumber', 'Kode dan Nomor Seri Faktur Pajak, the 15-17 digit e-Faktur serial such as 04002600351668820. Not the commercial INVOICE NO.'),
    ('taxInvoiceDate', 'Date only from Tempat dan Tanggal Ditandatangani, or the date beside the QR. Drop the city. Example 03 September 2026.'),
    ('date', 'Date only from Tempat dan Tanggal Ditandatangani, or the date beside the QR. Drop the city. Example 03 September 2026.'),
    ('vatAmount', 'Jumlah PPN exactly as printed, for example 2.320.421,00. Not the DPP.')
  ) AS v(field_name, hint) ON true
 WHERE f."TypeDocumentId" = td."TypeDocumentId"
   AND t."Code" = 'MANPOWER_SERVICES'
   AND d."Name" IN ('Tax Invoice', 'Tax Invoice (VAT)')
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
    (1, 'invoiceDate', 'Tax invoice date', 'Same date as taxInvoiceDate. Date only from Tempat dan Tanggal Ditandatangani, or the date beside the QR.'),
    (2, 'invoiceAmount', 'DPP', 'Dasar Pengenaan Pajak (DPP / Harga Jual / Penggantian). Not Jumlah PPN and not the commercial Grand Total.'),
    (3, 'vendorName', 'Seller name', 'Seller name under Pengusaha Kena Pajak (Nama). Example PT. AMANAH LESTARI ENERGY. Not the commercial invoice letterhead.'),
    (4, 'vendorNpwp', 'Seller NPWP', 'NPWP under Pengusaha Kena Pajak. Keep the dotted NPWP format.'),
    (5, 'essaCompanyName', 'Buyer name', 'Buyer name under Pembeli Barang Kena Pajak / Penerima Jasa (Nama), for example PT. PANCA AMARA UTAMA.'),
    (6, 'invoiceNumber', 'Referenced invoice number', 'Referensi only when it prints the commercial invoice number, such as 651/PT.ALE-PAU/09/2026. Do not put the 15-17 digit Kode dan Nomor Seri here.'),
    (7, 'itemDescription', 'Taxable goods or services', 'Nama Barang Kena Pajak / Jasa Kena Pajak. Manpower wording such as Manpower Supply may appear here.'),
    (8, 'taxAmount', 'PPN amount', 'Same as Jumlah PPN / vatAmount.'),
    (9, 'fakturPajakNumber', 'Faktur Pajak serial', 'Copy taxInvoiceNumber, the Kode dan Nomor Seri.'),
    (10, 'fakturPajakDate', 'Faktur Pajak date', 'Copy the tax invoice date.'),
    (11, 'fakturPajakValue', 'Faktur Pajak PPN', 'Copy Jumlah PPN.'),
    (12, 'fakturPajakVendorName', 'Faktur Pajak seller', 'Copy the seller name under Pengusaha Kena Pajak.'),
    (13, 'fakturPajakBarcode', 'Faktur Pajak barcode', 'QR or barcode printed on the e-Faktur. Leave empty when none is printed.'),
    (14, 'currency', 'Currency', 'IDR when the amounts are Rupiah.'),
    (15, 'ppnRateAndDpp', 'PPN rate and DPP', 'Dasar Pengenaan Pajak (DPP) and the PPN rate printed beside PPN, usually 11% or 12%.')
  ) AS v(ord, field_name, label, hint) ON true
  LEFT JOIN LATERAL (
    SELECT MAX(f."DisplayOrder") AS max_order
      FROM "AP_EXTRACTION_FIELD" f
     WHERE f."TypeDocumentId" = td."TypeDocumentId"
  ) mx ON true
 WHERE t."Code" = 'MANPOWER_SERVICES'
   AND d."Name" = 'Tax Invoice'
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
         $old$## Tax Invoice
### header (single values — put these under JSON key "header")
- taxInvoiceNumber  // After "Kode dan Nomor Seri Faktur Pajak". Digits only.
- taxInvoiceDate  // Bottom right next to the signature: "KAB. BANGGAI, 03 September 2026".
- vatAmount  // "Jumlah PPN". Format 2.320.421,00.
$old$,
         $new$## Tax Invoice
### header (single values — put these under JSON key "header")
- taxInvoiceNumber  // Kode dan Nomor Seri Faktur Pajak, the 15-17 digit e-Faktur serial such as 04002600351668820. Not the commercial INVOICE NO.
- taxInvoiceDate  // Date only from Tempat dan Tanggal Ditandatangani, or the date beside the QR. Drop the city. Example 03 September 2026.
- invoiceDate  // Same date as taxInvoiceDate.
- vatAmount  // Jumlah PPN exactly as printed, for example 2.320.421,00. Not the DPP.
- taxAmount  // Same as vatAmount.
- invoiceAmount  // Dasar Pengenaan Pajak (DPP / Harga Jual / Penggantian). Not Jumlah PPN and not the commercial Grand Total.
- vendorName  // Seller name under Pengusaha Kena Pajak (Nama). Example PT. AMANAH LESTARI ENERGY. Not the commercial invoice letterhead.
- vendorNpwp  // NPWP under the seller block. Keep the dotted NPWP format.
- essaCompanyName  // Buyer name under Pembeli Barang Kena Pajak / Penerima Jasa (Nama), for example PT. PANCA AMARA UTAMA.
- invoiceNumber  // Referensi only when it prints the commercial invoice number, such as 651/PT.ALE-PAU/09/2026. Otherwise null.
- itemDescription  // Nama Barang Kena Pajak / Jasa Kena Pajak.
- fakturPajakNumber  // Copy taxInvoiceNumber.
- fakturPajakDate  // Copy taxInvoiceDate.
- fakturPajakValue  // Copy vatAmount.
- fakturPajakVendorName  // Copy vendorName.
- fakturPajakBarcode  // QR or barcode printed on the e-Faktur. Null when none is printed.
- currency  // IDR when the amounts are Rupiah.
- ppnRateAndDpp  // DPP and the printed PPN rate beside PPN, usually 11% or 12%.
$new$
       ),
       "UpdatedAt" = NOW()
  FROM "AP_EXTRACTION_INVOICE_TYPE" t
 WHERE p."InvoiceTypeId" = t."InvoiceTypeId"
   AND t."Code" = 'MANPOWER_SERVICES'
   AND p."PromptText" LIKE '%After "Kode dan Nomor Seri Faktur Pajak". Digits only.%';
