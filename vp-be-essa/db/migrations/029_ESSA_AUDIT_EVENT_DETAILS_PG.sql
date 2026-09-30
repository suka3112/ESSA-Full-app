-- Migration 029: Structured details for invoice-process audit (maker-checker, N-way operands, outcome codes).
ALTER TABLE "ESSA_AUDIT_EVENT"
  ADD COLUMN IF NOT EXISTS "DetailsJson" TEXT NULL;

ALTER TABLE "ESSA_AUDIT_EVENT"
  ADD COLUMN IF NOT EXISTS "OutcomeCode" VARCHAR(40) NULL;

CREATE INDEX IF NOT EXISTS "IX_ESSA_AUDIT_EVENT_OutcomeCode"
  ON "ESSA_AUDIT_EVENT" ("OutcomeCode")
  WHERE "OutcomeCode" IS NOT NULL;
