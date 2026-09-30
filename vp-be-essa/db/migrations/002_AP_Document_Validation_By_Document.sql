-- Migration 002: Persist OCR extractions and validate by DocumentId.
-- Allows the validation results to be linked to an uploaded document
-- (AP_DOCUMENT) before an INVOICE_HEADER record exists.

-- AP_VALIDATION_RESULT: make InvoiceHeaderId optional and link to AP_DOCUMENT.
IF COL_LENGTH('dbo.AP_VALIDATION_RESULT', 'InvoiceHeaderId') IS NOT NULL
BEGIN
  ALTER TABLE dbo.AP_VALIDATION_RESULT ALTER COLUMN InvoiceHeaderId INT NULL;
END;
GO

IF COL_LENGTH('dbo.AP_VALIDATION_RESULT', 'DocumentId') IS NULL
BEGIN
  ALTER TABLE dbo.AP_VALIDATION_RESULT ADD DocumentId BIGINT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_AP_VALIDATION_RESULT_DocumentId'
    AND object_id = OBJECT_ID('dbo.AP_VALIDATION_RESULT')
)
BEGIN
  CREATE INDEX IX_AP_VALIDATION_RESULT_DocumentId
    ON dbo.AP_VALIDATION_RESULT (DocumentId);
END;
GO
