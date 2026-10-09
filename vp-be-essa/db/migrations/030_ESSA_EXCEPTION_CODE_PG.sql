-- Exception code catalogue and its alignment to validation rule codes.
-- Postgres. Many rule codes can share one exception code.
-- A non-empty MatchHint selects that code only when the failure message
-- names that document (DOC_COMPLETENESS + HCIS Clearing Journal → E-1111).

CREATE TABLE IF NOT EXISTS "ESSA_EXCEPTION_CODE" (
  "Code" VARCHAR(20) PRIMARY KEY,
  "ExceptionType" VARCHAR(80) NOT NULL,
  "Name" VARCHAR(200) NOT NULL,
  "Meaning" TEXT NOT NULL,
  "DocumentName" VARCHAR(200) NULL,
  "Status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "SortOrder" INTEGER NOT NULL,
  CONSTRAINT "CK_ESSA_EXCEPTION_CODE_Status" CHECK ("Status" IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE IF NOT EXISTS "ESSA_EXCEPTION_RULE_MAP" (
  "RuleCode" VARCHAR(100) NOT NULL,
  "MatchHint" VARCHAR(200) NOT NULL DEFAULT '',
  "ExceptionCode" VARCHAR(20) NOT NULL,
  PRIMARY KEY ("RuleCode", "MatchHint"),
  CONSTRAINT "FK_ESSA_EXCEPTION_RULE_MAP_Code"
    FOREIGN KEY ("ExceptionCode") REFERENCES "ESSA_EXCEPTION_CODE" ("Code")
);

CREATE INDEX IF NOT EXISTS "IX_ESSA_EXCEPTION_RULE_MAP_Code"
  ON "ESSA_EXCEPTION_RULE_MAP" ("ExceptionCode");

INSERT INTO "ESSA_EXCEPTION_CODE"
  ("Code", "ExceptionType", "Name", "Meaning", "DocumentName", "Status", "SortOrder")
VALUES
  ('E-1001', 'Extraction Failure', 'Extraction failed', 'The document could not be read well enough to extract its fields.', NULL, 'ACTIVE', 1001),
  ('E-1002', 'Low Confidence', 'Low confidence extraction', 'One or more fields were read with low confidence and need a human check.', NULL, 'ACTIVE', 1002),
  ('E-1003', 'Validation Failure', 'Validation check failed', 'A validation check between documents or against SAP did not pass.', NULL, 'ACTIVE', 1003),
  ('E-1004', 'Missing SAP Reference', 'SAP reference not found', 'The purchase order, goods receipt or service entry sheet is not yet available in SAP.', NULL, 'ACTIVE', 1004),
  ('E-1005', 'Vendor Issue', 'Vendor issue', 'The vendor is blocked, negative-listed or its master data does not match.', NULL, 'ACTIVE', 1005),
  ('E-1006', 'Tax Issue', 'Tax issue', 'The tax invoice or withholding tax treatment needs the Tax Team.', NULL, 'ACTIVE', 1006),
  ('E-1007', 'Approval Issue', 'Approval issue', 'The invoice was rejected or sent back during approval.', NULL, 'ACTIVE', 1007),
  ('E-1008', 'Integration Failure', 'Integration failure', 'A connected system did not respond as expected.', NULL, 'ACTIVE', 1008),
  ('E-1009', 'Technical Failure', 'Technical failure', 'The platform hit a technical error and will retry.', NULL, 'ACTIVE', 1009),
  ('E-1111', 'Missing Supporting Document', 'HCIS clearing journal missing', 'The HCIS clearing journal reference is missing from the bundle.', 'HCIS Clearing Journal', 'ACTIVE', 1111),
  ('E-1112', 'Missing Supporting Document', 'Supporting document missing', 'A required supporting document is missing from the bundle.', 'Supporting Document', 'ACTIVE', 1112)
ON CONFLICT ("Code") DO UPDATE SET
  "ExceptionType" = EXCLUDED."ExceptionType",
  "Name" = EXCLUDED."Name",
  "Meaning" = EXCLUDED."Meaning",
  "DocumentName" = EXCLUDED."DocumentName",
  "Status" = EXCLUDED."Status",
  "SortOrder" = EXCLUDED."SortOrder";

INSERT INTO "ESSA_EXCEPTION_RULE_MAP" ("RuleCode", "MatchHint", "ExceptionCode")
VALUES
  ('DOC_COMPLETENESS', '', 'E-1112'),
  ('DOC_COMPLETENESS', 'HCIS Clearing Journal', 'E-1111'),
  ('PO_NUMBER_MASTER', '', 'E-1004'),
  ('VENDOR_PO_INVOICE', '', 'E-1005'),
  ('BANK_VENDOR_MASTER', '', 'E-1005'),
  ('NON_PKP_VENDOR', '', 'E-1005'),
  ('TAX_INVOICE_MATCH', '', 'E-1006'),
  ('QTY_RECONCILIATION', '', 'E-1003'),
  ('RATE_VALIDATION', '', 'E-1003'),
  ('LATE_DELIVERY_LD', '', 'E-1003'),
  ('PO_VALUE_ZERO_TOLERANCE', '', 'E-1003'),
  ('SES_DEVIATION', '', 'E-1003'),
  ('ADVANCE_RETENTION', '', 'E-1003'),
  ('HCIS_REQUEST_MATCH', '', 'E-1003')
ON CONFLICT ("RuleCode", "MatchHint") DO UPDATE SET
  "ExceptionCode" = EXCLUDED."ExceptionCode";
