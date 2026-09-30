-- Migration 016 (Postgres): Mark a document type as required for extraction
-- (hard-stop if missing after classification).

ALTER TABLE "AP_EXTRACTION_TYPE_DOCUMENT"
  ADD COLUMN IF NOT EXISTS "IsMandatory" BOOLEAN NOT NULL DEFAULT FALSE;
