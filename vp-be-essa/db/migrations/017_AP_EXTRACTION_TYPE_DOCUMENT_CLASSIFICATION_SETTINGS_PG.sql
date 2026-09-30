-- Migration 017 (Postgres): Persist Document Types inspect settings
-- (classifier slug, split behavior, classification hints).

ALTER TABLE "AP_EXTRACTION_TYPE_DOCUMENT"
  ADD COLUMN IF NOT EXISTS "OcrCategoryId" VARCHAR(100) NULL;

ALTER TABLE "AP_EXTRACTION_TYPE_DOCUMENT"
  ADD COLUMN IF NOT EXISTS "SplitBehavior" VARCHAR(20) NULL;

ALTER TABLE "AP_EXTRACTION_TYPE_DOCUMENT"
  ADD COLUMN IF NOT EXISTS "ClassificationHints" TEXT NULL;
