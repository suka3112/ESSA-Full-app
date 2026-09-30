-- Migration 026 (Postgres): CHECK on AP_VALIDATION_RESULT.Severity
-- Matches TypeScript ValidationSeverity: PASS | WARNING | FAIL | BLOCKED | SKIP
-- Skips adding the constraint if existing rows contain other values.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CK_AP_VALIDATION_RESULT_Severity'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "AP_VALIDATION_RESULT"
    WHERE "Severity" IS NOT NULL
      AND "Severity" NOT IN ('PASS', 'WARNING', 'FAIL', 'BLOCKED', 'SKIP')
  ) THEN
    RAISE NOTICE 'Skipping CK_AP_VALIDATION_RESULT_Severity: existing Severity values are outside the allowed set.';
    RETURN;
  END IF;

  ALTER TABLE "AP_VALIDATION_RESULT"
    ADD CONSTRAINT "CK_AP_VALIDATION_RESULT_Severity"
      CHECK ("Severity" IN ('PASS', 'WARNING', 'FAIL', 'BLOCKED', 'SKIP'));
END $$;
