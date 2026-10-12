-- =====================================================================
-- EAPA – Validation Configuration (Admin Config) – PostgreSQL 14+
-- v2: extends the "final agreed model" so every construct in the
-- Data Point x Doc Matrix (V2 tab) and Document Completeness tab can be
-- stored as configuration.
--
-- Unchanged principles from v1:
--   * no config versioning (results keep a rule_snapshot instead)
--   * bundle documents = documents inside the scanned PDF bundle
--   * EAPA DB = SAP sync tables
--
-- Change markers:  [NEW] new object   [CHG] changed vs v1
--
-- v3 (matrix fit):
--   * X / o stored as matrix_mark EXACT / PARTIAL. "o" is a partial match,
--     not extraction-only. V_MATRIX_ROW counts marks: 0 no source, 1 extract, 2+ validate.
--   * LOGICAL is deterministic. LOGICAL_AI still requires a prompt.
--   * Uniqueness may be a reference lookup. Authenticity still needs a handler.
--   * One template may use different documents per category (operand invoice_category_id).
--   * failure_action is Block / Warn / Route / No impact. Route requires a queue.
--   * Empty build-spec stays DRAFT and inactive. Document "R" is UNRESOLVED.
--   * TODO(annexure-I-5) LD, TODO(V-005) Faktur Pajak age, FX 1% placeholder
--     are parameters, not hardcoded values.
--
-- Naming: table and view names are UPPERCASE and double-quoted, so every
-- query must quote them, e.g.  SELECT * FROM cfg."VALIDATION_RULE";
-- invoice_category is renamed "VAL_INVOICE_CATEGORY" (name already in use).
-- Column, type and index names stay lowercase. Comments below still refer
-- to tables by their lowercase descriptive names.
-- =====================================================================

-- Not re-runnable: CREATE TYPE / CREATE TABLE fail if the objects exist.
-- If v1 was already installed in schema cfg and holds no data you need,
-- reset first (DESTROYS everything in cfg):
--   DROP SCHEMA IF EXISTS cfg CASCADE;

CREATE SCHEMA IF NOT EXISTS cfg;
SET search_path = cfg, public;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
-- [CHG] + PERCENT, DATETIME, JSON (occupancy %, check-in time, lists)
CREATE TYPE value_data_type   AS ENUM ('TEXT', 'NUMBER', 'AMOUNT', 'PERCENT', 'DATE', 'DATETIME', 'CODE', 'BOOLEAN', 'JSON');

-- [CHG] WORKER generalised to GROUP: matching per worker, per date + meal
--       type, per trip, per BOQ item ... keys defined in rule_match_key
CREATE TYPE match_level       AS ENUM ('HEADER', 'LINE', 'GROUP');

-- [CHG] UNIQUENESS_AI -> UNIQUENESS (duplicate checks are deterministic
--       lookups; an AI prompt can still be attached optionally)
--       + FUZZY for the matrix "o" partial match (Nitish S. = Nitish Sharma)
--       + LOGICAL for deterministic logic (date sequence, bank-account
--         change). LOGICAL_AI is only the prompted comparison.
CREATE TYPE rule_type         AS ENUM ('PRESENCE', 'EXACT', 'FUZZY', 'TOLERANCE', 'LOGICAL', 'LOGICAL_AI',
                                       'UNIQUENESS', 'AUTHENTICITY', 'CALCULATION');

-- [CHG] + NOT_EQUALS, LT, GT, BETWEEN (validity windows), CONTAINS,
--       ASCENDING (date sequence: service period <= GRN <= invoice <= FP)
CREATE TYPE rule_comparator   AS ENUM ('EQUALS', 'NOT_EQUALS', 'LT', 'LTE', 'GT', 'GTE',
                                       'WITHIN_TOLERANCE', 'BETWEEN', 'CONTAINS', 'ASCENDING');

-- [CHG] + INPUT: operands feeding a CALCULATION expression without being
--       compared themselves (qty, rate, DPP ...)
CREATE TYPE operand_role      AS ENUM ('SOURCE', 'TARGET', 'INPUT');

-- [CHG] + EXTERNAL_SERVICE (DJP Coretax), MANUAL_INPUT (IO number keyed by
--       AP for visa charges), SYSTEM (processing date, invoice category ...)
CREATE TYPE operand_origin    AS ENUM ('BUNDLE_DOCUMENT', 'EAPA_DB', 'EXTERNAL_SERVICE', 'MANUAL_INPUT', 'SYSTEM');

-- [CHG] + AVG, COUNT_DISTINCT (headcount, distinct workers)
CREATE TYPE operand_aggregate AS ENUM ('NONE', 'SUM', 'COUNT', 'COUNT_DISTINCT', 'MAX', 'MIN', 'AVG');

CREATE TYPE tolerance_mode    AS ENUM ('LOWER_OF', 'HIGHER_OF', 'PERCENT_ONLY', 'AMOUNT_ONLY');
CREATE TYPE rule_severity     AS ENUM ('INFO', 'WARNING', 'ERROR', 'HARD_FAIL');
CREATE TYPE result_status     AS ENUM ('PASS', 'WARNING', 'FAIL', 'HARD_FAIL', 'NOT_APPLICABLE', 'ERROR');

-- [NEW] how a single value is compared
CREATE TYPE match_method      AS ENUM ('EXACT', 'NORMALIZED', 'FUZZY', 'TOKEN_CONTAINS');
-- [NEW] how several TARGETs combine: all must match, or any one is enough
CREATE TYPE target_match_mode AS ENUM ('ALL', 'ANY', 'AT_LEAST_N');
-- [NEW] what to do when a value / optional document is missing
CREATE TYPE missing_action    AS ENUM ('FAIL', 'WARN', 'NOT_APPLICABLE');
-- [NEW] where a document arrives from (matrix row 4 "Source")
CREATE TYPE document_channel  AS ENUM ('VENDOR_BUNDLE', 'USER_UPLOAD', 'SYSTEM_GENERATED');
-- [NEW] Document Completeness tab: M / O / conditional.
--       UNRESOLVED is the matrix "R" placeholder (not yet M or O).
--       Fail-safe: an UNRESOLVED row must not be treated as optional.
CREATE TYPE document_requirement AS ENUM ('MANDATORY', 'OPTIONAL', 'CONDITIONAL', 'UNRESOLVED');
-- [NEW] matrix cell mark. EXACT = "X". PARTIAL = "o"
--       (Nitish Sharma matches Nitish S.). This is not "extraction only".
--       A row is extraction-only when it has fewer than two marks in total.
CREATE TYPE matrix_mark         AS ENUM ('EXACT', 'PARTIAL');
-- [NEW] matrix column "Action on Failure" (Block / Warn / Route).
--       NO_IMPACT is both on_fail flags false.
CREATE TYPE failure_action      AS ENUM ('BLOCK', 'WARN', 'ROUTE', 'NO_IMPACT');
-- [NEW] build-spec gate. DRAFT cannot be activated. READY means the open
--       build-spec columns were confirmed, not guessed.
CREATE TYPE spec_status         AS ENUM ('DRAFT', 'READY');
-- [NEW] what kind of reference source sits behind a reference_table
CREATE TYPE reference_source_kind AS ENUM ('SAP_SYNC', 'EXTERNAL_API', 'INTERNAL_REGISTER');
-- [NEW] execution stage; completeness runs before any field comparison
CREATE TYPE rule_stage        AS ENUM ('COMPLETENESS', 'AUTHENTICITY', 'HEADER', 'LINE', 'TAX', 'COMPLIANCE');
-- [NEW] include / exclude a rule for a category
CREATE TYPE scope_type        AS ENUM ('INCLUDE', 'EXCLUDE');

-- ---------------------------------------------------------------------
-- 1. Invoice categories
-- ---------------------------------------------------------------------
CREATE TABLE "VAL_INVOICE_CATEGORY" (
  invoice_category_id  BIGSERIAL PRIMARY KEY,
  category_code        TEXT    NOT NULL UNIQUE,            -- [NEW] TRAVEL_NPO
  category_name        TEXT    NOT NULL UNIQUE,            -- Travel - Non PO
  matrix_ref           TEXT,                               -- [NEW] '9' (matrix section no.)
  is_po_based          BOOLEAN NOT NULL DEFAULT TRUE,      -- [NEW] lets PO/GRN common rules be scoped out
  is_active            BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------
-- 2. Document types (bundle + user uploads)
-- ---------------------------------------------------------------------
CREATE TABLE "BUNDLE_DOCUMENT_TYPE" (
  bundle_document_type_id  BIGSERIAL PRIMARY KEY,
  document_code            TEXT UNIQUE,                    -- INVOICE, FAKTUR_PAJAK, BOOKING_CONFIRMATION
  document_name            TEXT    NOT NULL,               -- name as in the Data Point x Doc Matrix
  channel                  document_channel NOT NULL DEFAULT 'VENDOR_BUNDLE',  -- [NEW]
  supplied_by              TEXT,                           -- [NEW] Vendor / User (matrix row 4)
  matrix_column_ref        TEXT,                           -- [NEW] 'AJ' (traceability)
  is_active                BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------
-- 3. Documents expected per category (Document Completeness tab)
-- ---------------------------------------------------------------------
CREATE TABLE "CATEGORY_BUNDLE_DOCUMENT" (
  category_bundle_document_id  BIGSERIAL PRIMARY KEY,
  invoice_category_id          BIGINT NOT NULL REFERENCES "VAL_INVOICE_CATEGORY",
  bundle_document_type_id      BIGINT NOT NULL REFERENCES "BUNDLE_DOCUMENT_TYPE",
  requirement                  document_requirement NOT NULL DEFAULT 'UNRESOLVED', -- [NEW] M / O / conditional / matrix R
  min_count                    SMALLINT NOT NULL DEFAULT 1,  -- [NEW] e.g. several receipts
  max_count                    SMALLINT,                     -- [NEW] NULL = unlimited
  on_missing                   missing_action NOT NULL DEFAULT 'FAIL', -- [NEW]
  display_order                INT    NOT NULL DEFAULT 0,
  UNIQUE (invoice_category_id, bundle_document_type_id),
  CHECK (max_count IS NULL OR max_count >= min_count)
);
-- CONDITIONAL rows get their "required when" logic from rule_condition
-- (owner = category_bundle_document_id), e.g. Non-PKP statement only when
-- the vendor is non-PKP; Internal Order only for visa lines.
-- UNRESOLVED (matrix "R") is fail-safe: do not treat the document as
-- optional and do not park the invoice on that category until M or O is set.

-- ---------------------------------------------------------------------
-- 4. Data points (matrix rows, de-duplicated)
-- ---------------------------------------------------------------------
CREATE TABLE "DATA_POINT" (
  data_point_id     BIGSERIAL PRIMARY KEY,
  data_point_code   TEXT            NOT NULL UNIQUE,       -- VENDOR_NAME
  data_point_name   TEXT            NOT NULL,              -- Vendor name
  data_type         value_data_type NOT NULL,
  default_level     match_level     NOT NULL DEFAULT 'HEADER',
  normalizer_key    TEXT,                                  -- [NEW] NPWP_DIGITS, COMPANY_NAME (strip PT/Tbk), DATE_ISO
  description       TEXT                                   -- [NEW]
);

-- ---------------------------------------------------------------------
-- 5. Data point on each document (matrix "X" and "o")
-- ---------------------------------------------------------------------
CREATE TABLE "BUNDLE_DOCUMENT_FIELD" (
  bundle_document_field_id  BIGSERIAL PRIMARY KEY,
  bundle_document_type_id   BIGINT      NOT NULL REFERENCES "BUNDLE_DOCUMENT_TYPE",
  data_point_id             BIGINT      NOT NULL REFERENCES "DATA_POINT",
  matrix_ref                TEXT,                          -- [CHG] was INT; matrix uses '1.04', '9.01'
  matrix_mark               matrix_mark NOT NULL,          -- [NEW] EXACT = X, PARTIAL = o
  field_label               TEXT        NOT NULL,          -- Seller name & NPWP
  extraction_key            TEXT,                          -- [CHG] null until the OCR key is mapped; the PDF does not supply it
  field_level               match_level NOT NULL DEFAULT 'HEADER',
  min_extraction_confidence NUMERIC(5,2) CHECK (min_extraction_confidence BETWEEN 0 AND 100), -- [NEW]
  is_active                 BOOLEAN     NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX ux_bdf_cell ON "BUNDLE_DOCUMENT_FIELD"
  (bundle_document_type_id, data_point_id, COALESCE(matrix_ref, ''));
CREATE UNIQUE INDEX ux_bdf_extraction ON "BUNDLE_DOCUMENT_FIELD"
  (bundle_document_type_id, extraction_key, COALESCE(matrix_ref, ''))
  WHERE extraction_key IS NOT NULL;
CREATE INDEX ix_bdf_data_point ON "BUNDLE_DOCUMENT_FIELD" (data_point_id);
-- "o" is matrix_mark PARTIAL (fuzzy participation in a comparison).
-- A field with no rule_operand is not automatically "o".
-- Extraction-only vs validation is count of marks on the matrix_ref:
--   0 marks = no source, 1 mark = extraction only, 2+ marks = validation.
-- See "V_MATRIX_ROW".

-- ---------------------------------------------------------------------
-- 6. Reference sources: SAP sync tables, external APIs, registers
-- ---------------------------------------------------------------------
CREATE TABLE "REFERENCE_TABLE" (
  reference_table_id    BIGSERIAL PRIMARY KEY,
  physical_name         TEXT    NOT NULL UNIQUE,           -- sap_po_master, coretax_efaktur
  display_name          TEXT    NOT NULL,                  -- PO Master
  source_kind           reference_source_kind NOT NULL DEFAULT 'SAP_SYNC', -- [NEW]
  connector_key         TEXT,                              -- [NEW] API adapter for EXTERNAL_API
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (source_kind <> 'EXTERNAL_API' OR connector_key IS NOT NULL)
);
-- [CHG] lookup_column / lookup_data_point_id moved to reference_lookup:
--       one table is looked up by different (often composite) keys,
--       e.g. invoice history by vendor+invoice no. OR by FP number.

-- [NEW] named lookups on a reference table
CREATE TABLE "REFERENCE_LOOKUP" (
  reference_lookup_id  BIGSERIAL PRIMARY KEY,
  reference_table_id   BIGINT  NOT NULL REFERENCES "REFERENCE_TABLE",
  lookup_code          TEXT    NOT NULL,                   -- BY_PO_LINE, BY_FP_NUMBER
  is_default           BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (reference_table_id, lookup_code)
);
CREATE UNIQUE INDEX ux_lookup_default ON "REFERENCE_LOOKUP" (reference_table_id) WHERE is_default;

-- [NEW] key columns of a lookup (composite keys)
CREATE TABLE "REFERENCE_LOOKUP_KEY" (
  reference_lookup_key_id  BIGSERIAL PRIMARY KEY,
  reference_lookup_id      BIGINT   NOT NULL REFERENCES "REFERENCE_LOOKUP" ON DELETE CASCADE,
  seq                      SMALLINT NOT NULL,
  column_name              TEXT     NOT NULL,              -- po_number, po_item
  data_point_id            BIGINT   NOT NULL REFERENCES "DATA_POINT",
  UNIQUE (reference_lookup_id, seq)
);

-- ---------------------------------------------------------------------
-- 7. Selectable columns in reference sources
-- ---------------------------------------------------------------------
CREATE TABLE "REFERENCE_FIELD" (
  reference_field_id  BIGSERIAL PRIMARY KEY,
  reference_table_id  BIGINT          NOT NULL REFERENCES "REFERENCE_TABLE",
  column_name         TEXT            NOT NULL,            -- vendor_name
  display_name        TEXT            NOT NULL,
  data_point_id       BIGINT          REFERENCES "DATA_POINT",
  sap_source_field    TEXT,                                -- FMXDOCNR
  data_type           value_data_type NOT NULL,
  is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
  UNIQUE (reference_table_id, column_name)
);

-- [NEW] X / o on a system column (Vendor Master, Coretax, invoice history).
--       Same meaning as bundle_document_field.matrix_mark. The matrix does
--       not say which mark is the comparison source; that choice is the
--       SOURCE operand on the rule, and the rule stays DRAFT until set.
CREATE TABLE "REFERENCE_DATA_POINT_MARK" (
  reference_data_point_mark_id  BIGSERIAL PRIMARY KEY,
  reference_field_id            BIGINT      NOT NULL REFERENCES "REFERENCE_FIELD",
  data_point_id                 BIGINT      NOT NULL REFERENCES "DATA_POINT",
  matrix_ref                    TEXT        NOT NULL,      -- 1.01
  matrix_mark                   matrix_mark NOT NULL,
  UNIQUE (reference_field_id, matrix_ref)
);
CREATE INDEX ix_ref_mark_point ON "REFERENCE_DATA_POINT_MARK" (data_point_id, matrix_ref);

-- ---------------------------------------------------------------------
-- 8. AI prompt templates (backend preset)
-- ---------------------------------------------------------------------
CREATE TABLE "PROMPT_TEMPLATE" (
  prompt_template_id  BIGSERIAL PRIMARY KEY,
  template_key        TEXT      NOT NULL,                  -- logical_match.item_description
  template_version    INT       NOT NULL DEFAULT 1,
  rule_type           rule_type NOT NULL                   -- [CHG] usable by FUZZY / UNIQUENESS / AUTHENTICITY too
    CHECK (rule_type IN ('LOGICAL_AI', 'FUZZY', 'UNIQUENESS', 'AUTHENTICITY')),
  model_name          TEXT,                                -- [NEW]
  prompt_text         TEXT      NOT NULL,
  few_shot_examples   JSONB,
  is_active           BOOLEAN   NOT NULL DEFAULT TRUE,
  UNIQUE (template_key, template_version)
);

-- ---------------------------------------------------------------------
-- 9. Validation rule settings
-- ---------------------------------------------------------------------
CREATE TABLE "VALIDATION_RULE" (
  validation_rule_id        BIGSERIAL PRIMARY KEY,
  -- [CHG] invoice_category_id removed -> validation_rule_category.
  --       Common rules (1.xx) and templates (NPO-SETTLE, NPO-WHT ...)
  --       are configured once and scoped to many categories.
  applies_to_all_categories BOOLEAN         NOT NULL DEFAULT FALSE,  -- [NEW] Common section
  rule_code                 TEXT            NOT NULL UNIQUE,   -- CMN-BANK-001
  rule_name                 TEXT            NOT NULL,
  matrix_ref                TEXT,                              -- [NEW] '1.02'
  rule_template_code        TEXT,                              -- [NEW] matrix column BH
  description               TEXT,                              -- [NEW]
  rule_stage                rule_stage      NOT NULL DEFAULT 'HEADER', -- [NEW]
  rule_type                 rule_type       NOT NULL,
  comparator                rule_comparator NOT NULL DEFAULT 'EQUALS',
  match_level               match_level     NOT NULL DEFAULT 'HEADER',
  -- [CHG] line_match_data_point_id -> rule_match_key (composite keys)

  -- [NEW] multi-target semantics
  target_match_mode         target_match_mode NOT NULL DEFAULT 'ALL',
  min_targets_matched       SMALLINT,
  on_missing_value          missing_action  NOT NULL DEFAULT 'FAIL',

  -- [NEW] calculation: expression over operand aliases and parameters,
  --       e.g.  src = round(qty * rate, 2)
  --             src = round(dpp * param.PPN_RATE / 100, 0)
  --       handler_key remains for logic too complex for an expression.
  expression                TEXT,
  handler_key               TEXT,

  tolerance_pct             NUMERIC(7,4),
  tolerance_amount          NUMERIC(18,2),
  tolerance_currency        CHAR(3)         DEFAULT 'IDR',
  tolerance_days            INT,                               -- [NEW] date tolerance
  tolerance_mode            tolerance_mode,
  tolerance_base_role       operand_role,

  prompt_template_id        BIGINT          REFERENCES "PROMPT_TEMPLATE",
  ai_min_confidence         NUMERIC(5,2)    CHECK (ai_min_confidence BETWEEN 0 AND 100),
  fuzzy_min_score           NUMERIC(5,2)    CHECK (fuzzy_min_score BETWEEN 0 AND 100), -- [NEW]

  is_mandatory              BOOLEAN         NOT NULL DEFAULT TRUE, -- fail-safe until Mandatory/Optional is confirmed
  on_fail_raise_exception   BOOLEAN         NOT NULL DEFAULT TRUE,
  on_fail_block             BOOLEAN         NOT NULL DEFAULT FALSE,
  on_fail_notify            BOOLEAN         NOT NULL DEFAULT TRUE,
  stop_on_fail              BOOLEAN         NOT NULL DEFAULT FALSE,  -- [NEW] skip later rules
  severity                  rule_severity   NOT NULL DEFAULT 'ERROR',
  failure_action            failure_action,                    -- [NEW] Block / Warn / Route / No impact; null while the matrix cell is empty
  outcome_code              TEXT,
  exception_owner           TEXT,                              -- [NEW] matrix build-spec "Exception Owner"
  exception_queue           TEXT,                              -- [NEW] required when failure_action = ROUTE
  priority                  INT             NOT NULL DEFAULT 100,
  spec_status               spec_status     NOT NULL DEFAULT 'DRAFT', -- [NEW] empty build-spec cannot go live
  is_active                 BOOLEAN         NOT NULL DEFAULT FALSE,

  created_by                TEXT            NOT NULL,
  created_at                TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_by                TEXT,
  updated_at                TIMESTAMPTZ,

  -- Mode is required only once the rule is activated. The matrix gives
  -- both 5% and 200,000 IDR for 1.23 and 7.01 and does not say LOWER_OF
  -- vs PERCENT_ONLY. Do not invent the mode; leave the rule DRAFT.
  CONSTRAINT ck_tolerance CHECK (
    rule_type <> 'TOLERANCE'
    OR NOT is_active
    OR (tolerance_mode IS NOT NULL AND tolerance_base_role IS NOT NULL
        AND (tolerance_pct IS NOT NULL OR tolerance_amount IS NOT NULL OR tolerance_days IS NOT NULL))
  ),
  CONSTRAINT ck_ai_prompt CHECK (
    rule_type <> 'LOGICAL_AI' OR prompt_template_id IS NOT NULL
  ),
  -- Deterministic Logical rows (1.31 date sequence, 1.33 bank change)
  -- must not be forced through a prompt.
  CONSTRAINT ck_logical CHECK (
    rule_type <> 'LOGICAL'
    OR handler_key IS NOT NULL
    OR expression IS NOT NULL
    OR comparator IN ('NOT_EQUALS', 'LT', 'LTE', 'GT', 'GTE', 'BETWEEN', 'CONTAINS', 'ASCENDING')
  ),
  CONSTRAINT ck_fuzzy CHECK (
    rule_type <> 'FUZZY' OR fuzzy_min_score IS NOT NULL OR prompt_template_id IS NOT NULL
  ),
  CONSTRAINT ck_calculation CHECK (
    rule_type <> 'CALCULATION' OR expression IS NOT NULL OR handler_key IS NOT NULL
  ),
  -- Authenticity (QR / barcode) stays a plugin. Uniqueness may be a
  -- reference lookup with no handler; V_RULE_CONFIG_ISSUE checks that.
  CONSTRAINT ck_handler CHECK (
    rule_type <> 'AUTHENTICITY' OR handler_key IS NOT NULL
  ),
  CONSTRAINT ck_failure_action CHECK (
    failure_action IS NULL
    OR (failure_action = 'BLOCK'
        AND on_fail_block AND on_fail_raise_exception AND severity = 'HARD_FAIL')
    OR (failure_action = 'WARN'
        AND NOT on_fail_block AND on_fail_raise_exception AND severity = 'WARNING')
    OR (failure_action = 'ROUTE'
        AND NOT on_fail_block AND on_fail_raise_exception
        AND severity IN ('ERROR', 'WARNING') AND exception_queue IS NOT NULL)
    OR (failure_action = 'NO_IMPACT'
        AND NOT on_fail_block AND NOT on_fail_raise_exception AND severity = 'INFO')
  ),
  -- Fail-safe: an empty build-spec (action, owner, READY) cannot run.
  CONSTRAINT ck_active_spec CHECK (
    NOT is_active
    OR (spec_status = 'READY'
        AND failure_action IS NOT NULL
        AND (failure_action = 'NO_IMPACT' OR exception_owner IS NOT NULL))
  ),
  CONSTRAINT ck_at_least_n CHECK (
    (target_match_mode = 'AT_LEAST_N') = (min_targets_matched IS NOT NULL)
  ),
  -- Block requires Raise exception; "No impact" = both false
  CONSTRAINT ck_impact CHECK (NOT (on_fail_block AND NOT on_fail_raise_exception)),
  CONSTRAINT ck_severity_impact CHECK (
       (on_fail_block AND severity = 'HARD_FAIL')
    OR (NOT on_fail_block AND on_fail_raise_exception AND severity IN ('ERROR', 'WARNING'))
    OR (NOT on_fail_block AND NOT on_fail_raise_exception AND severity = 'INFO')
  )
);
CREATE INDEX ix_rule_active ON "VALIDATION_RULE" (rule_stage, priority) WHERE is_active;

-- ---------------------------------------------------------------------
-- 9a. [NEW] Category scope of a rule
--     applies_to_all = FALSE -> INCLUDE rows list the categories
--     applies_to_all = TRUE  -> EXCLUDE rows remove categories
--                              (e.g. PO number check out of Travel - Non PO)
-- ---------------------------------------------------------------------
CREATE TABLE "VALIDATION_RULE_CATEGORY" (
  validation_rule_id   BIGINT     NOT NULL REFERENCES "VALIDATION_RULE" ON DELETE CASCADE,
  invoice_category_id  BIGINT     NOT NULL REFERENCES "VAL_INVOICE_CATEGORY",
  scope                scope_type NOT NULL DEFAULT 'INCLUDE',
  PRIMARY KEY (validation_rule_id, invoice_category_id)
);
CREATE INDEX ix_rule_category ON "VALIDATION_RULE_CATEGORY" (invoice_category_id);

-- ---------------------------------------------------------------------
-- 9b. [NEW] Match keys for LINE / GROUP rules (composite)
--     Travel: employee name + travel date + airline + route
--     Catering: meal date + meal type;  Manpower: worker id
-- ---------------------------------------------------------------------
CREATE TABLE "RULE_MATCH_KEY" (
  rule_match_key_id   BIGSERIAL PRIMARY KEY,
  validation_rule_id  BIGINT       NOT NULL REFERENCES "VALIDATION_RULE" ON DELETE CASCADE,
  seq                 SMALLINT     NOT NULL,
  data_point_id       BIGINT       NOT NULL REFERENCES "DATA_POINT",
  match_method        match_method NOT NULL DEFAULT 'NORMALIZED',
  fuzzy_min_score     NUMERIC(5,2) CHECK (fuzzy_min_score BETWEEN 0 AND 100),
  UNIQUE (validation_rule_id, seq),
  UNIQUE (validation_rule_id, data_point_id)
);

-- ---------------------------------------------------------------------
-- 9c. [NEW] Parameters / constants used by rules (global if rule is NULL)
--     PPN rate, WHT 2% / 4% (SIUJK), special-meal limits, FX tolerance ...
--     Effective dating covers statutory changes without config versioning.
--     TODO(annexure-I-5) LD rate, cap and waiver — do not insert a formula.
--     TODO(V-005) Faktur Pajak age window — do not insert a number of months.
--     The matrix FX 1% on row 1.27 is a stated placeholder, not a decision.
--     Store it only with is_placeholder = true; an active rule cannot use it.
-- ---------------------------------------------------------------------
CREATE TABLE "RULE_PARAMETER" (
  rule_parameter_id   BIGSERIAL PRIMARY KEY,
  validation_rule_id  BIGINT REFERENCES "VALIDATION_RULE" ON DELETE CASCADE,
  param_key           TEXT    NOT NULL,                    -- PPN_RATE
  param_value         JSONB   NOT NULL,                    -- 12
  is_placeholder      BOOLEAN NOT NULL DEFAULT FALSE,      -- [NEW] matrix/BPD value not yet confirmed
  company_code        TEXT,                                -- PAU / EII; NULL = all
  effective_from      DATE    NOT NULL DEFAULT DATE '1900-01-01',
  effective_to        DATE,
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE UNIQUE INDEX ux_rule_parameter ON "RULE_PARAMETER"
  (COALESCE(validation_rule_id, 0), param_key, COALESCE(company_code, '*'), effective_from);

-- ---------------------------------------------------------------------
-- 9d. [NEW] Rule dependencies (run B only if A ended with given status)
-- ---------------------------------------------------------------------
CREATE TABLE "RULE_DEPENDENCY" (
  validation_rule_id     BIGINT        NOT NULL REFERENCES "VALIDATION_RULE" ON DELETE CASCADE,
  depends_on_rule_id     BIGINT        NOT NULL REFERENCES "VALIDATION_RULE",
  required_status        result_status NOT NULL DEFAULT 'PASS',
  PRIMARY KEY (validation_rule_id, depends_on_rule_id),
  CHECK (validation_rule_id <> depends_on_rule_id)
);

-- ---------------------------------------------------------------------
-- 10. Rule operands: source, "Check against" targets, calculation inputs
-- ---------------------------------------------------------------------
CREATE TABLE "RULE_OPERAND" (
  rule_operand_id           BIGSERIAL PRIMARY KEY,
  validation_rule_id        BIGINT            NOT NULL REFERENCES "VALIDATION_RULE" ON DELETE CASCADE,
  seq                       SMALLINT          NOT NULL,        -- 1 = source
  role                      operand_role      NOT NULL,
  origin                    operand_origin    NOT NULL,
  operand_alias             TEXT              NOT NULL,        -- [NEW] name used in expression: src, qty, rate
  -- [NEW] NULL = every category the rule applies to.
  --       Set when one rule_template_code uses different documents per category
  --       (ITEM-DESC, SLA-CONF, NPO-VENDOR). The engine prefers the row for
  --       the invoice category over the NULL row.
  invoice_category_id       BIGINT            REFERENCES "VAL_INVOICE_CATEGORY",

  bundle_document_field_id  BIGINT            REFERENCES "BUNDLE_DOCUMENT_FIELD",
  bundle_document_type_id   BIGINT            REFERENCES "BUNDLE_DOCUMENT_TYPE",  -- PRESENCE only
  reference_field_id        BIGINT            REFERENCES "REFERENCE_FIELD",
  reference_lookup_id       BIGINT            REFERENCES "REFERENCE_LOOKUP",      -- [NEW] NULL = default lookup
  data_point_id             BIGINT            REFERENCES "DATA_POINT",            -- [NEW] MANUAL_INPUT
  system_value_key          TEXT,                                               -- [NEW] PROCESSING_DATE, INVOICE_CATEGORY

  aggregate_fn              operand_aggregate NOT NULL DEFAULT 'NONE',
  match_method              match_method      NOT NULL DEFAULT 'EXACT',         -- [NEW] per operand ("X" vs "o")
  fuzzy_min_score           NUMERIC(5,2)      CHECK (fuzzy_min_score BETWEEN 0 AND 100), -- [NEW]
  on_missing                missing_action,                                     -- [NEW] NULL = rule default
  CONSTRAINT ck_operand_origin CHECK (
       (origin = 'BUNDLE_DOCUMENT'
          AND num_nonnulls(bundle_document_field_id, bundle_document_type_id) = 1
          AND num_nonnulls(reference_field_id, reference_lookup_id, data_point_id, system_value_key) = 0)
    OR (origin IN ('EAPA_DB', 'EXTERNAL_SERVICE')
          AND reference_field_id IS NOT NULL
          AND num_nonnulls(bundle_document_field_id, bundle_document_type_id, data_point_id, system_value_key) = 0)
    OR (origin = 'MANUAL_INPUT'
          AND data_point_id IS NOT NULL
          AND num_nonnulls(bundle_document_field_id, bundle_document_type_id, reference_field_id, reference_lookup_id, system_value_key) = 0)
    OR (origin = 'SYSTEM'
          AND system_value_key IS NOT NULL
          AND num_nonnulls(bundle_document_field_id, bundle_document_type_id, reference_field_id, reference_lookup_id, data_point_id) = 0)
  ),
  CONSTRAINT ck_source_first CHECK ((seq = 1) = (role = 'SOURCE'))
);
-- One SOURCE per rule per category bucket. 0 = the default operand (every category).
CREATE UNIQUE INDEX ux_operand_one_source ON "RULE_OPERAND"
  (validation_rule_id, COALESCE(invoice_category_id, 0)) WHERE role = 'SOURCE';
CREATE UNIQUE INDEX ux_operand_seq ON "RULE_OPERAND"
  (validation_rule_id, seq, COALESCE(invoice_category_id, 0));
CREATE UNIQUE INDEX ux_operand_alias ON "RULE_OPERAND"
  (validation_rule_id, operand_alias, COALESCE(invoice_category_id, 0));
-- [CHG] v1 unique indexes on (rule, field) dropped: a calculation can use
--       the same field twice with different aggregates (SUM and COUNT).

-- [NEW] where the key values for a reference lookup come from, when not
--       from the SOURCE operand's document (default resolution)
CREATE TABLE "RULE_OPERAND_KEY_BINDING" (
  rule_operand_id          BIGINT NOT NULL REFERENCES "RULE_OPERAND" ON DELETE CASCADE,
  reference_lookup_key_id  BIGINT NOT NULL REFERENCES "REFERENCE_LOOKUP_KEY",
  from_operand_alias       TEXT,                           -- take value from another operand
  constant_value           JSONB,                          -- or a fixed value
  PRIMARY KEY (rule_operand_id, reference_lookup_key_id),
  CHECK (num_nonnulls(from_operand_alias, constant_value) = 1)
);

-- ---------------------------------------------------------------------
-- 11. Conditions: "Applies when" on rules, "Required when" on documents,
--     and row filters on operands.   [CHG] generalised
--     Within one condition_group: AND.  Between groups: OR.
-- ---------------------------------------------------------------------
CREATE TABLE "RULE_CONDITION" (
  rule_condition_id            BIGSERIAL PRIMARY KEY,
  -- owner (exactly one)
  validation_rule_id           BIGINT REFERENCES "VALIDATION_RULE" ON DELETE CASCADE,
  category_bundle_document_id  BIGINT REFERENCES "CATEGORY_BUNDLE_DOCUMENT" ON DELETE CASCADE, -- [NEW]
  rule_operand_id              BIGINT REFERENCES "RULE_OPERAND" ON DELETE CASCADE,             -- [NEW] row filter
  condition_group              SMALLINT NOT NULL DEFAULT 1,                                   -- [NEW] OR groups
  -- tested value (exactly one)
  bundle_document_field_id     BIGINT REFERENCES "BUNDLE_DOCUMENT_FIELD",
  reference_field_id           BIGINT REFERENCES "REFERENCE_FIELD",
  data_point_id                BIGINT REFERENCES "DATA_POINT",          -- [NEW] resolved invoice value
  system_value_key             TEXT,                                  -- [NEW] INVOICE_CATEGORY, COMPANY_CODE
  operator                     TEXT   NOT NULL
    CHECK (operator IN ('=', '<>', '>', '>=', '<', '<=', 'IN', 'NOT_IN', 'BETWEEN',
                        'CONTAINS', 'IS_PRESENT', 'IS_ABSENT')),
  compare_value                JSONB,                                 -- 0, ["PKP"], [101]
  compare_operand_alias        TEXT,                                  -- [NEW] compare with another operand
  CONSTRAINT ck_condition_owner CHECK (
    num_nonnulls(validation_rule_id, category_bundle_document_id, rule_operand_id) = 1),
  CONSTRAINT ck_condition_field CHECK (
    num_nonnulls(bundle_document_field_id, reference_field_id, data_point_id, system_value_key) = 1),
  CONSTRAINT ck_condition_value CHECK (
    operator IN ('IS_PRESENT', 'IS_ABSENT')
    OR num_nonnulls(compare_value, compare_operand_alias) = 1)
);
CREATE INDEX ix_condition_rule    ON "RULE_CONDITION" (validation_rule_id);
CREATE INDEX ix_condition_doc     ON "RULE_CONDITION" (category_bundle_document_id);
CREATE INDEX ix_condition_operand ON "RULE_CONDITION" (rule_operand_id);

-- ---------------------------------------------------------------------
-- 12. Change audit trail (unchanged)
-- ---------------------------------------------------------------------
CREATE TABLE "CONFIG_CHANGE_LOG" (
  config_change_log_id  BIGSERIAL PRIMARY KEY,
  entity_name           TEXT        NOT NULL,
  entity_id             BIGINT      NOT NULL,
  action                TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DEACTIVATE', 'DELETE')),
  before_json           JSONB,
  after_json            JSONB,
  changed_by            TEXT        NOT NULL,
  changed_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_change_entity ON "CONFIG_CHANGE_LOG" (entity_name, entity_id);

-- ---------------------------------------------------------------------
-- 13. Runtime results
-- ---------------------------------------------------------------------
CREATE TABLE "VALIDATION_RUN" (
  validation_run_id    BIGSERIAL PRIMARY KEY,
  invoice_id           BIGINT      NOT NULL,   -- FK to invoice table in EAPA core schema
  invoice_category_id  BIGINT      REFERENCES "VAL_INVOICE_CATEGORY",  -- [NEW] category used for the run
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at          TIMESTAMPTZ,
  triggered_by         TEXT        NOT NULL    -- SYSTEM, REVALIDATION:<user>
);
CREATE INDEX ix_run_invoice ON "VALIDATION_RUN" (invoice_id);

CREATE TABLE "VALIDATION_RESULT" (
  validation_result_id  BIGSERIAL PRIMARY KEY,
  validation_run_id     BIGINT        NOT NULL REFERENCES "VALIDATION_RUN" ON DELETE CASCADE,
  validation_rule_id    BIGINT        REFERENCES "VALIDATION_RULE",       -- [CHG] NULL for checklist results
  category_bundle_document_id BIGINT  REFERENCES "CATEGORY_BUNDLE_DOCUMENT", -- [NEW] completeness result
  rule_snapshot         JSONB,
  line_ref              TEXT,
  group_key             JSONB,                                        -- [NEW] {"meal_date":"2026-08-01","meal_type":"LUNCH"}
  status                result_status NOT NULL,
  outcome_code          TEXT,
  message               TEXT,
  ai_confidence         NUMERIC(5,2),
  ai_explanation        TEXT,
  evaluated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(validation_rule_id, category_bundle_document_id) = 1)
);
CREATE INDEX ix_result_run  ON "VALIDATION_RESULT" (validation_run_id);
CREATE INDEX ix_result_rule ON "VALIDATION_RESULT" (validation_rule_id);

CREATE TABLE "VALIDATION_RESULT_OPERAND" (
  validation_result_operand_id  BIGSERIAL PRIMARY KEY,
  validation_result_id          BIGINT NOT NULL REFERENCES "VALIDATION_RESULT" ON DELETE CASCADE,
  rule_operand_id               BIGINT NOT NULL REFERENCES "RULE_OPERAND",
  raw_value                     TEXT,
  normalized_value              TEXT,
  numeric_value                 NUMERIC(18,4),
  variance_abs                  NUMERIC(18,4),
  variance_pct                  NUMERIC(9,4),
  match_score                   NUMERIC(5,2),                   -- [NEW] fuzzy / AI score
  is_match                      BOOLEAN,
  source_ref                    TEXT,      -- extracted value id or SAP row key
  document_instance_ref         TEXT       -- [NEW] which copy/page when a document repeats
);
CREATE INDEX ix_result_operand ON "VALIDATION_RESULT_OPERAND" (validation_result_id);

-- ---------------------------------------------------------------------
-- 14. [NEW] Matrix row usage. "o" is PARTIAL, not "captured only".
--     0 marks = no source (nothing to build)
--     1 mark  = extraction only
--     2+ marks = validation
-- ---------------------------------------------------------------------
CREATE VIEW "V_MATRIX_ROW" AS
SELECT m.matrix_ref,
       m.data_point_id,
       count(*) AS mark_count,
       count(*) FILTER (WHERE m.matrix_mark = 'EXACT')   AS exact_count,
       count(*) FILTER (WHERE m.matrix_mark = 'PARTIAL') AS partial_count,
       CASE
         WHEN count(*) >= 2 THEN 'VALIDATION'
         WHEN count(*) = 1  THEN 'EXTRACTION_ONLY'
         ELSE 'NO_SOURCE'
       END AS row_use
FROM (
  SELECT matrix_ref, data_point_id, matrix_mark
  FROM "BUNDLE_DOCUMENT_FIELD"
  WHERE is_active AND matrix_ref IS NOT NULL
  UNION ALL
  SELECT matrix_ref, data_point_id, matrix_mark
  FROM "REFERENCE_DATA_POINT_MARK"
) m
GROUP BY m.matrix_ref, m.data_point_id;

-- ---------------------------------------------------------------------
-- 15. [NEW] Rules that apply to a category (resolves INCLUDE / EXCLUDE)
-- ---------------------------------------------------------------------
CREATE VIEW "V_CATEGORY_RULE" AS
SELECT c.invoice_category_id, r.validation_rule_id
FROM "VAL_INVOICE_CATEGORY" c
JOIN "VALIDATION_RULE" r ON r.is_active
WHERE c.is_active
  AND (
        (r.applies_to_all_categories
          AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x
                          WHERE x.validation_rule_id = r.validation_rule_id
                            AND x.invoice_category_id = c.invoice_category_id
                            AND x.scope = 'EXCLUDE'))
     OR (NOT r.applies_to_all_categories
          AND EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x
                      WHERE x.validation_rule_id = r.validation_rule_id
                        AND x.invoice_category_id = c.invoice_category_id
                        AND x.scope = 'INCLUDE'))
      );

-- ---------------------------------------------------------------------
-- 16. [NEW] Configuration health check: cross-table rules that a CHECK
--     constraint cannot enforce. Run before activating config.
--     Listed for every rule, including DRAFT, so an empty build-spec
--     is visible before anyone sets is_active.
-- ---------------------------------------------------------------------
CREATE VIEW "V_RULE_CONFIG_ISSUE" AS
SELECT r.validation_rule_id, r.rule_code, i.issue
FROM "VALIDATION_RULE" r
CROSS JOIN LATERAL (
  SELECT 'No source operand' AS issue
  WHERE NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o
                    WHERE o.validation_rule_id = r.validation_rule_id AND o.role = 'SOURCE')
  UNION ALL
  SELECT 'Category in scope has no source operand'
  WHERE EXISTS (SELECT 1 FROM "RULE_OPERAND" o
                WHERE o.validation_rule_id = r.validation_rule_id AND o.role = 'SOURCE')
    AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o
                    WHERE o.validation_rule_id = r.validation_rule_id
                      AND o.role = 'SOURCE' AND o.invoice_category_id IS NULL)
    AND EXISTS (
      SELECT 1 FROM "VAL_INVOICE_CATEGORY" c
      WHERE c.is_active
        AND (
          (r.applies_to_all_categories
            AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x
                            WHERE x.validation_rule_id = r.validation_rule_id
                              AND x.invoice_category_id = c.invoice_category_id
                              AND x.scope = 'EXCLUDE'))
          OR (NOT r.applies_to_all_categories
            AND EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x
                        WHERE x.validation_rule_id = r.validation_rule_id
                          AND x.invoice_category_id = c.invoice_category_id
                          AND x.scope = 'INCLUDE'))
        )
        AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o
                        WHERE o.validation_rule_id = r.validation_rule_id
                          AND o.role = 'SOURCE'
                          AND o.invoice_category_id = c.invoice_category_id)
    )
  UNION ALL
  SELECT 'Comparison rule without a target'
  WHERE r.rule_type IN ('EXACT', 'FUZZY', 'TOLERANCE', 'LOGICAL_AI')
    AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o
                    WHERE o.validation_rule_id = r.validation_rule_id AND o.role = 'TARGET')
  UNION ALL
  SELECT 'LINE/GROUP rule without match keys'
  WHERE r.match_level <> 'HEADER'
    AND NOT EXISTS (SELECT 1 FROM "RULE_MATCH_KEY" k WHERE k.validation_rule_id = r.validation_rule_id)
  UNION ALL
  SELECT 'Rule applies to no category'
  WHERE NOT r.applies_to_all_categories
    AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x
                    WHERE x.validation_rule_id = r.validation_rule_id AND x.scope = 'INCLUDE')
  UNION ALL
  SELECT 'PRESENCE rule source is not a document type'
  WHERE r.rule_type = 'PRESENCE'
    AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o
                    WHERE o.validation_rule_id = r.validation_rule_id
                      AND o.role = 'SOURCE' AND o.bundle_document_type_id IS NOT NULL)
  UNION ALL
  SELECT 'AT_LEAST_N exceeds number of targets'
  WHERE r.target_match_mode = 'AT_LEAST_N'
    AND r.min_targets_matched > (SELECT count(*) FROM "RULE_OPERAND" o
                                 WHERE o.validation_rule_id = r.validation_rule_id AND o.role = 'TARGET')
  UNION ALL
  SELECT 'Action on failure is not set'
  WHERE r.failure_action IS NULL
  UNION ALL
  SELECT 'Exception owner is not set'
  WHERE r.failure_action IS DISTINCT FROM 'NO_IMPACT' AND r.exception_owner IS NULL
  UNION ALL
  SELECT 'Tolerance mode is not decided'
  WHERE r.rule_type = 'TOLERANCE'
    AND (r.tolerance_mode IS NULL OR r.tolerance_base_role IS NULL
         OR (r.tolerance_pct IS NULL AND r.tolerance_amount IS NULL AND r.tolerance_days IS NULL))
  UNION ALL
  SELECT 'Uniqueness has neither a handler nor a reference target'
  WHERE r.rule_type = 'UNIQUENESS'
    AND r.handler_key IS NULL
    AND NOT EXISTS (SELECT 1 FROM "RULE_OPERAND" o
                    WHERE o.validation_rule_id = r.validation_rule_id
                      AND o.role = 'TARGET'
                      AND o.origin IN ('EAPA_DB', 'EXTERNAL_SERVICE'))
  UNION ALL
  SELECT 'Operand category is outside the rule scope'
  WHERE EXISTS (
    SELECT 1 FROM "RULE_OPERAND" o
    WHERE o.validation_rule_id = r.validation_rule_id
      AND o.invoice_category_id IS NOT NULL
      AND NOT (
        (r.applies_to_all_categories
          AND NOT EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x
                          WHERE x.validation_rule_id = r.validation_rule_id
                            AND x.invoice_category_id = o.invoice_category_id
                            AND x.scope = 'EXCLUDE'))
        OR (NOT r.applies_to_all_categories
          AND EXISTS (SELECT 1 FROM "VALIDATION_RULE_CATEGORY" x
                      WHERE x.validation_rule_id = r.validation_rule_id
                        AND x.invoice_category_id = o.invoice_category_id
                        AND x.scope = 'INCLUDE'))
      )
  )
  UNION ALL
  SELECT 'PARTIAL mark (o) compared with an exact method'
  WHERE EXISTS (
    SELECT 1 FROM "RULE_OPERAND" o
    JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.bundle_document_field_id = o.bundle_document_field_id
    WHERE o.validation_rule_id = r.validation_rule_id
      AND f.matrix_mark = 'PARTIAL'
      AND o.match_method IN ('EXACT', 'NORMALIZED')
  )
  UNION ALL
  SELECT 'Active comparison reads a field with no extraction key'
  WHERE r.is_active
    AND EXISTS (
      SELECT 1 FROM "RULE_OPERAND" o
      JOIN "BUNDLE_DOCUMENT_FIELD" f ON f.bundle_document_field_id = o.bundle_document_field_id
      WHERE o.validation_rule_id = r.validation_rule_id
        AND f.extraction_key IS NULL
    )
  UNION ALL
  SELECT 'Active rule uses a placeholder parameter'
  WHERE r.is_active
    AND EXISTS (
      SELECT 1 FROM "RULE_PARAMETER" p
      WHERE p.is_placeholder
        AND p.validation_rule_id = r.validation_rule_id
    )
) i;

-- ---------------------------------------------------------------------
-- 17. [NEW] Completeness rows still marked R on the matrix.
--     Fail-safe: do not treat these as optional and do not park.
-- ---------------------------------------------------------------------
CREATE VIEW "V_COMPLETENESS_UNRESOLVED" AS
SELECT c.invoice_category_id,
       c.category_code,
       d.bundle_document_type_id,
       d.document_code,
       b.category_bundle_document_id
FROM "CATEGORY_BUNDLE_DOCUMENT" b
JOIN "VAL_INVOICE_CATEGORY" c ON c.invoice_category_id = b.invoice_category_id
JOIN "BUNDLE_DOCUMENT_TYPE" d ON d.bundle_document_type_id = b.bundle_document_type_id
WHERE b.requirement = 'UNRESOLVED';
