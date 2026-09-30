-- Migration 018 (Postgres): Mark Document Types as required when the active
-- invoice-config validation rule is mandatory + BLOCK (e.g. manpower PO).

UPDATE "AP_EXTRACTION_TYPE_DOCUMENT" td
SET "IsMandatory" = TRUE,
    "UpdatedAt" = NOW()
FROM "AP_EXTRACTION_DOCUMENT" d,
     "AP_EXTRACTION_INVOICE_TYPE" t,
     "AP_INVOICE_CONFIG_VERSION" v,
     "AP_DOCUMENT_VALIDATION_RULE" r
WHERE td."DocumentId" = d."DocumentId"
  AND td."InvoiceTypeId" = t."InvoiceTypeId"
  AND v."InvoiceTypeId" = t."InvoiceTypeId"
  AND v."Status" = 'Active'
  AND v."IsDeleted" = FALSE
  AND r."ConfigVersionId" = v."ConfigVersionId"
  AND r."IsDeleted" = FALSE
  AND r."Status" = 'Active'
  AND r."IsMandatory" = TRUE
  AND UPPER(COALESCE(r."MissingAction", '')) = 'BLOCK'
  AND td."IsDeleted" = FALSE
  AND (
    r."DocumentId" = d."DocumentId"
    OR LOWER(TRIM(r."DocumentTitle")) = LOWER(TRIM(d."Name"))
    OR (
      LOWER(REGEXP_REPLACE(TRIM(r."DocumentTitle"), '[^a-zA-Z0-9]', '', 'g')) IN ('po', 'purchaseorder')
      AND LOWER(REGEXP_REPLACE(TRIM(d."Name"), '[^a-zA-Z0-9]', '', 'g')) IN ('po', 'purchaseorder')
    )
  );
