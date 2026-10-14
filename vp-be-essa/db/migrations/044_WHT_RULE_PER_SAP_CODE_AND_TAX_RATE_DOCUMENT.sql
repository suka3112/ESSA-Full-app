-- 044: WHT rule matrix — one row per SAP WHT code, and the versioned Tax Rate document
--
-- 1. cfg."WHT_RULE": rows that listed several SAP codes in one cell ("G4 / G7 / H2",
--    "G1 / G2 / G3" with "0% / 10% / 15%") become one row per code.
--    * Same number of rates and codes -> paired in the order the WHT Matrix lists them.
--    * One rate for several codes     -> every code gets that rate.
--    Both cases are flagged needs_review with the open question, because the WHT
--    Matrix does not say how a payment is assigned to one of those codes.
--    The original combined rows are soft-deleted (kept for traceability).
-- 2. cfg."WHT_TAX_RATE_DOCUMENT": uploaded Tax Rate (treaty) Excel files. Read-only in the
--    app; each upload is a new version, exactly one version is current.
-- Re-runnable.

SET search_path = cfg, public;

ALTER TABLE "WHT_RULE" ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "WHT_RULE" ADD COLUMN IF NOT EXISTS review_note TEXT;

DO $$
DECLARE
  r RECORD;
  codes TEXT[];
  rates TEXT[];
  i INT;
  rate_txt TEXT;
  note TEXT;
BEGIN
  FOR r IN SELECT * FROM "WHT_RULE" WHERE NOT is_deleted AND sap_wht_code LIKE '%/%' ORDER BY wht_rule_id LOOP
    codes := ARRAY(SELECT btrim(x) FROM unnest(string_to_array(r.sap_wht_code, '/')) AS x WHERE btrim(x) <> '');
    rates := ARRAY(SELECT btrim(x) FROM unnest(string_to_array(r.rate_text, '/')) AS x WHERE btrim(x) <> '');
    IF array_length(rates, 1) = array_length(codes, 1) THEN
      note := format('Rate-to-code pairing follows the order in the WHT Matrix (%s ↔ %s). Please confirm.',
                     r.rate_text, r.sap_wht_code);
    ELSE
      note := format('The WHT Matrix lists %s for the same %s rate but does not say which code applies (for example by income type). Please confirm.',
                     r.sap_wht_code, r.rate_text);
    END IF;
    FOR i IN 1 .. array_length(codes, 1) LOOP
      rate_txt := CASE WHEN array_length(rates, 1) = array_length(codes, 1) THEN rates[i] ELSE r.rate_text END;
      INSERT INTO "WHT_RULE"
        (step, category, condition, sub_condition, condition_code, sub_condition_code, wht_article, rate_type,
         rate_pct, rate_text, sap_wht_code, reference_master, requires_document, document_examples, remarks,
         effective_from, effective_to, status, display_order, needs_review, review_note, created_by)
      VALUES
        (r.step, r.category, r.condition, r.sub_condition, r.condition_code, r.sub_condition_code, r.wht_article, r.rate_type,
         NULLIF(regexp_replace(rate_txt, '[^0-9.]', '', 'g'), '')::NUMERIC, rate_txt, codes[i], r.reference_master,
         r.requires_document, r.document_examples, r.remarks, r.effective_from, r.effective_to, r.status,
         r.display_order + i - 1, TRUE, note, r.created_by);
    END LOOP;
    UPDATE "WHT_RULE"
       SET is_deleted = TRUE, updated_at = now(),
           remarks = concat_ws(' ', remarks, '[Split into one row per SAP code by migration 044.]')
     WHERE wht_rule_id = r.wht_rule_id;
  END LOOP;
END $$;

-- Treaty rules now carry their own rate (0%, 10% ...): rate_text is the single value.
UPDATE "WHT_RULE" SET rate_pct = NULLIF(regexp_replace(rate_text, '[^0-9.]', '', 'g'), '')::NUMERIC
 WHERE NOT is_deleted AND rate_type = 'TREATY' AND rate_pct IS NULL AND rate_text ~ '^[0-9.]+%$';

CREATE TABLE IF NOT EXISTS "WHT_TAX_RATE_DOCUMENT" (
  wht_tax_rate_document_id SERIAL PRIMARY KEY,
  version_no        INTEGER      NOT NULL,
  file_name         VARCHAR(255) NOT NULL,
  mime_type         VARCHAR(120),
  file_size         INTEGER      NOT NULL,
  file_data         BYTEA        NOT NULL,
  sheet_name        VARCHAR(120) NOT NULL,
  columns_json      JSONB        NOT NULL,
  rows_json         JSONB        NOT NULL,
  row_count         INTEGER      NOT NULL,
  notes             TEXT,
  is_current        BOOLEAN      NOT NULL DEFAULT FALSE,
  is_deleted        BOOLEAN      NOT NULL DEFAULT FALSE,
  uploaded_at       TIMESTAMP    NOT NULL DEFAULT now(),
  uploaded_by       INTEGER,
  uploaded_by_name  VARCHAR(120),
  deleted_at        TIMESTAMP,
  deleted_by        INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS "UX_WHT_TAX_RATE_DOCUMENT_current" ON "WHT_TAX_RATE_DOCUMENT" (is_current) WHERE is_current AND NOT is_deleted;
CREATE UNIQUE INDEX IF NOT EXISTS "UX_WHT_TAX_RATE_DOCUMENT_version" ON "WHT_TAX_RATE_DOCUMENT" (version_no);

SET search_path = public;
