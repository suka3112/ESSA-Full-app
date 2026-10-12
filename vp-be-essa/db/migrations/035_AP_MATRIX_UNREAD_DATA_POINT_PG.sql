-- Migration 035: one JSON row per uploaded document for data points the
-- matrix says a classified document carries, but extraction did not return.
-- BPD §8.1 (fields per document type) and §6 step 7 (document checklist).
-- Idempotent. Does not change cfg configuration.
-- "UnreadData" is a JSON array. Each item keeps recognizedType, documentCode,
-- documentName, dataPointCode, dataPointName, matrixRef, requirement, reason,
-- and pageRef. Requirement is copied from cfg."CATEGORY_BUNDLE_DOCUMENT".
-- UNRESOLVED means the matrix still says R: do not treat the gap as optional.

CREATE TABLE IF NOT EXISTS "AP_MATRIX_UNREAD_DATA_POINT" (
  "ReadId"              BIGSERIAL PRIMARY KEY,
  "DocumentId"          BIGINT       NOT NULL,
  "InvoiceCategoryCode" VARCHAR(80)  NULL,
  "UnreadData"          JSONB        NOT NULL,
  "CreatedAt"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "UQ_AP_MATRIX_UNREAD_Document" UNIQUE ("DocumentId"),
  CONSTRAINT "CK_AP_MATRIX_UNREAD_Data_Array"
    CHECK (jsonb_typeof("UnreadData") = 'array')
);
