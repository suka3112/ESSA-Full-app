-- Migration 032 (Postgres): N-way match rules ("check A against B")
-- One row = one rule: data point, comparison type, scope (Common / categories),
-- anchor document A, compared/extract-only documents (Targets JSON),
-- pass criteria, match level, and on-fail workflow impact.
-- Seeded on first read by helpers/matchRules.service.ts.
--
-- Numbered 032 because 030/031 are already used in this repo.
-- Apply:  npm run migrate:sql -- db/migrations/032_AP_MATCH_RULE_PG.sql

CREATE TABLE IF NOT EXISTS "AP_MATCH_RULE" (
  "RuleId"             BIGSERIAL PRIMARY KEY,
  "RuleKey"            VARCHAR(20)  NOT NULL,
  "DataPoint"          VARCHAR(200) NOT NULL,
  "DataKey"            VARCHAR(60)  NOT NULL,
  "RuleType"           VARCHAR(30)  NOT NULL,
  "Scope"              VARCHAR(20)  NOT NULL DEFAULT 'COMMON',
  "Categories"         JSONB        NOT NULL DEFAULT '[]'::jsonb,
  "DisabledCategories" JSONB        NOT NULL DEFAULT '[]'::jsonb,
  "SourceDoc"          VARCHAR(40)  NOT NULL,
  "Targets"            JSONB        NOT NULL DEFAULT '[]'::jsonb,
  "CompareMode"        VARCHAR(20)  NOT NULL DEFAULT 'ONE_TO_ALL',
  "Criteria"           JSONB        NOT NULL DEFAULT '{}'::jsonb,
  "CriteriaText"       TEXT         NULL,
  "RunCondition"       JSONB        NOT NULL DEFAULT '{"type":"ALWAYS","text":""}'::jsonb,
  "OnFail"             VARCHAR(20)  NOT NULL DEFAULT 'REVIEW',
  "Status"             VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  "BusinessNote"       TEXT         NULL,
  "NoteBy"             VARCHAR(200) NULL,
  "ConfirmWith"        VARCHAR(200) NULL,
  "LinkedCheck"        VARCHAR(60)  NULL,
  "ServerSide"         BOOLEAN      NOT NULL DEFAULT FALSE,
  "RuleGroup"          VARCHAR(20)  NULL,
  "SourceField"        VARCHAR(200) NULL,
  "MatchLevel"         VARCHAR(20)  NOT NULL DEFAULT 'HEADER',
  "IsMandatory"        BOOLEAN      NOT NULL DEFAULT TRUE,
  "MatrixRefs"         VARCHAR(200) NULL,
  "DisplayOrder"       INTEGER      NOT NULL DEFAULT 0,
  "IsDeleted"          BOOLEAN      NOT NULL DEFAULT FALSE,
  "CreatedAt"          TIMESTAMP    NOT NULL DEFAULT NOW(),
  "CreatedBy"          INTEGER      NULL,
  "UpdatedAt"          TIMESTAMP    NULL,
  "UpdatedBy"          INTEGER      NULL
);

ALTER TABLE "AP_MATCH_RULE" ALTER COLUMN "RuleType" TYPE VARCHAR(30);

ALTER TABLE "AP_MATCH_RULE" DROP CONSTRAINT IF EXISTS "CK_AP_MATCH_RULE_RuleType";
ALTER TABLE "AP_MATCH_RULE" ADD CONSTRAINT "CK_AP_MATCH_RULE_RuleType"
  CHECK ("RuleType" IN (
    'EXACT', 'LOGICAL', 'CALCULATION', 'TOLERANCE', 'UNIQUENESS', 'AUTHENTICITY', 'AVAILABILITY',
    'CALCULATION_TOLERANCE', 'EXACT_UNIQUENESS', 'AUTHENTICATE'
  ));

ALTER TABLE "AP_MATCH_RULE" DROP CONSTRAINT IF EXISTS "CK_AP_MATCH_RULE_MatchLevel";
ALTER TABLE "AP_MATCH_RULE" ADD CONSTRAINT "CK_AP_MATCH_RULE_MatchLevel"
  CHECK ("MatchLevel" IN ('HEADER', 'LINE', 'WORKER'));

ALTER TABLE "AP_MATCH_RULE" DROP CONSTRAINT IF EXISTS "CK_AP_MATCH_RULE_Scope";
ALTER TABLE "AP_MATCH_RULE" ADD CONSTRAINT "CK_AP_MATCH_RULE_Scope"
  CHECK ("Scope" IN ('COMMON', 'CATEGORY'));

ALTER TABLE "AP_MATCH_RULE" DROP CONSTRAINT IF EXISTS "CK_AP_MATCH_RULE_CompareMode";
ALTER TABLE "AP_MATCH_RULE" ADD CONSTRAINT "CK_AP_MATCH_RULE_CompareMode"
  CHECK ("CompareMode" IN ('ONE_TO_ALL', 'STEPWISE'));

ALTER TABLE "AP_MATCH_RULE" DROP CONSTRAINT IF EXISTS "CK_AP_MATCH_RULE_OnFail";
ALTER TABLE "AP_MATCH_RULE" ADD CONSTRAINT "CK_AP_MATCH_RULE_OnFail"
  CHECK ("OnFail" IN ('REVIEW', 'BLOCK', 'CALCULATE', 'APPROVAL', 'REPORT'));

ALTER TABLE "AP_MATCH_RULE" DROP CONSTRAINT IF EXISTS "CK_AP_MATCH_RULE_Status";
ALTER TABLE "AP_MATCH_RULE" ADD CONSTRAINT "CK_AP_MATCH_RULE_Status"
  CHECK ("Status" IN ('ACTIVE', 'CONFIRM', 'DRAFT', 'INACTIVE'));

CREATE UNIQUE INDEX IF NOT EXISTS "UX_AP_MATCH_RULE_RuleKey_Active"
  ON "AP_MATCH_RULE" ("RuleKey")
  WHERE "IsDeleted" = FALSE;

CREATE INDEX IF NOT EXISTS "IX_AP_MATCH_RULE_Scope"
  ON "AP_MATCH_RULE" ("Scope", "Status")
  WHERE "IsDeleted" = FALSE;
