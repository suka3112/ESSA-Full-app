-- Migration 031 (Postgres): scalar vs table extraction fields.
-- table = JSON array of row objects. Existing known array keys are backfilled.

ALTER TABLE "AP_EXTRACTION_FIELD"
  ADD COLUMN IF NOT EXISTS "FieldKind" VARCHAR(20) NOT NULL DEFAULT 'scalar';

UPDATE "AP_EXTRACTION_FIELD"
SET "FieldKind" = 'table'
WHERE "IsDeleted" = FALSE
  AND LOWER("FieldName") IN (
    'invoicelineitems',
    'lineitems',
    'manpower',
    'manhoursummary',
    'timesheetentries',
    'timesheets',
    'attendanceentries',
    'polineitems',
    'appendixitems',
    'transmittalitems',
    'progresslineitems',
    'classifications',
    'seslineitems'
  );
