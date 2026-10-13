-- 043: WHT (withholding tax) configuration
--   cfg."WHT_RULE"             step-by-step WHT matrix (WHT Matrix update, Oct 2026)
--   cfg."WHT_TAX_TREATY"       treaty rates per country (offshore vendors with a DGT form)
--   cfg."WHT_VENDOR_FACILITY"  vendor SKB / PP23 facilities
--   cfg."WHT_SBUJK"            vendor SBUJK construction classification
-- Steps are evaluated in order: 1 Offshore, 2 Individual, then (domestic company)
-- 3 Facility, 4 Rental, 5 Construction, 6 Service, 7 Default. The first step that
-- applies decides the WHT article, rate and SAP WHT code.
-- Re-runnable: tables are created if missing and seed rows are only added once.

SET search_path = cfg, public;

CREATE TABLE IF NOT EXISTS "WHT_RULE" (
  wht_rule_id          SERIAL PRIMARY KEY,
  step                 SMALLINT     NOT NULL CHECK (step BETWEEN 1 AND 99),
  category             VARCHAR(60)  NOT NULL,
  condition            VARCHAR(120) NOT NULL,
  sub_condition        VARCHAR(120),
  condition_code       VARCHAR(40)  NOT NULL,
  sub_condition_code   VARCHAR(40),
  wht_article          VARCHAR(20)  NOT NULL,
  rate_type            VARCHAR(20)  NOT NULL DEFAULT 'FIXED'
                         CHECK (rate_type IN ('FIXED', 'TREATY', 'PROGRESSIVE')),
  rate_pct             NUMERIC(6,3),
  rate_text            VARCHAR(60)  NOT NULL,
  sap_wht_code         VARCHAR(40)  NOT NULL,
  reference_master     VARCHAR(30)
                         CHECK (reference_master IN ('TAX_TREATY', 'SKB', 'PP23', 'SBUJK', 'PPH21_TARIFF')),
  requires_document    BOOLEAN      NOT NULL DEFAULT FALSE,
  document_examples    VARCHAR(200),
  remarks              TEXT,
  effective_from       DATE         NOT NULL DEFAULT DATE '2024-01-01',
  effective_to         DATE,
  status               VARCHAR(12)  NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE', 'DRAFT', 'INACTIVE')),
  display_order        INTEGER      NOT NULL DEFAULT 0,
  is_deleted           BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMP    NOT NULL DEFAULT now(),
  created_by           INTEGER,
  updated_at           TIMESTAMP,
  updated_by           INTEGER
);
CREATE INDEX IF NOT EXISTS "IX_WHT_RULE_step" ON "WHT_RULE" (step, condition_code, sub_condition_code) WHERE NOT is_deleted;

CREATE TABLE IF NOT EXISTS "WHT_TAX_TREATY" (
  wht_tax_treaty_id      SERIAL PRIMARY KEY,
  country                VARCHAR(80)  NOT NULL,
  dividend_portfolio_pct NUMERIC(6,3),
  dividend_substantial_pct NUMERIC(6,3),
  interest_pct           NUMERIC(6,3),
  royalty_pct            NUMERIC(6,3),
  service_pct            NUMERIC(6,3),
  service_treatment      VARCHAR(60),
  notes                  TEXT,
  effective_from         DATE         NOT NULL DEFAULT DATE '2024-01-01',
  effective_to           DATE,
  status                 VARCHAR(12)  NOT NULL DEFAULT 'ACTIVE'
                           CHECK (status IN ('ACTIVE', 'DRAFT', 'INACTIVE')),
  is_deleted             BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMP    NOT NULL DEFAULT now(),
  created_by             INTEGER,
  updated_at             TIMESTAMP,
  updated_by             INTEGER
);

CREATE TABLE IF NOT EXISTS "WHT_VENDOR_FACILITY" (
  wht_vendor_facility_id SERIAL PRIMARY KEY,
  vendor_code            VARCHAR(20)  NOT NULL,
  vendor_name            VARCHAR(250) NOT NULL,
  facility_type          VARCHAR(10)  NOT NULL CHECK (facility_type IN ('SKB', 'PP23')),
  certificate_no         VARCHAR(80)  NOT NULL,
  valid_from             DATE         NOT NULL,
  valid_to               DATE         NOT NULL,
  notes                  TEXT,
  status                 VARCHAR(12)  NOT NULL DEFAULT 'ACTIVE'
                           CHECK (status IN ('ACTIVE', 'INACTIVE')),
  is_deleted             BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMP    NOT NULL DEFAULT now(),
  created_by             INTEGER,
  updated_at             TIMESTAMP,
  updated_by             INTEGER
);
CREATE INDEX IF NOT EXISTS "IX_WHT_VENDOR_FACILITY_vendor" ON "WHT_VENDOR_FACILITY" (vendor_code) WHERE NOT is_deleted;

CREATE TABLE IF NOT EXISTS "WHT_SBUJK" (
  wht_sbujk_id           SERIAL PRIMARY KEY,
  vendor_code            VARCHAR(20)  NOT NULL,
  vendor_name            VARCHAR(250) NOT NULL,
  sbujk_no               VARCHAR(80)  NOT NULL,
  business_scope         VARCHAR(20)  NOT NULL CHECK (business_scope IN ('EXECUTION', 'PLANNING_CONSULTING')),
  business_scope_text    VARCHAR(120),
  qualification          VARCHAR(20)  NOT NULL CHECK (qualification IN ('SMALL', 'NON_SMALL')),
  qualification_text     VARCHAR(60),
  valid_to               DATE         NOT NULL,
  notes                  TEXT,
  status                 VARCHAR(12)  NOT NULL DEFAULT 'ACTIVE'
                           CHECK (status IN ('ACTIVE', 'INACTIVE')),
  is_deleted             BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMP    NOT NULL DEFAULT now(),
  created_by             INTEGER,
  updated_at             TIMESTAMP,
  updated_by             INTEGER
);
CREATE INDEX IF NOT EXISTS "IX_WHT_SBUJK_vendor" ON "WHT_SBUJK" (vendor_code) WHERE NOT is_deleted;

-- Seed: WHT Matrix update (WHT Matrix).csv
INSERT INTO "WHT_RULE"
  (step, category, condition, sub_condition, condition_code, sub_condition_code, wht_article, rate_type, rate_pct, rate_text,
   sap_wht_code, reference_master, requires_document, document_examples, remarks, display_order)
SELECT v.* FROM (VALUES
  (1, 'Offshore', 'No DGT Form', NULL, 'NO_DGT', NULL, 'Art. 26', 'FIXED', 20.0, '20%', 'G4 / G7 / H2', NULL, FALSE, NULL, NULL, 10),
  (1, 'Offshore', 'With DGT Form', 'Dividend / Interest', 'WITH_DGT', 'DIVIDEND_INTEREST', 'Art. 26', 'TREATY', NULL, '0% / 10% / 15%', 'G1 / G2 / G3', 'TAX_TREATY', TRUE, 'See Tax Treaty Rates', 'Based on the treaty with each country; may differ if the tax treaty changes.', 20),
  (1, 'Offshore', 'With DGT Form', 'Services', 'WITH_DGT', 'SERVICES', 'Art. 26', 'TREATY', NULL, '0% / 10%', 'G5 / G6', 'TAX_TREATY', TRUE, 'See Tax Treaty Rates', 'Based on the treaty with each country; may differ if the tax treaty changes.', 30),
  (1, 'Offshore', 'With DGT Form', 'Royalty', 'WITH_DGT', 'ROYALTY', 'Art. 26', 'TREATY', NULL, '0% / 10% / 15% / 8%', 'G8 / G9 / H1 / H3', 'TAX_TREATY', TRUE, 'See Tax Treaty Rates', 'Based on the treaty with each country; may differ if the tax treaty changes.', 40),
  (1, 'Offshore', 'With DGT Form', 'Technical Service', 'WITH_DGT', 'TECHNICAL_SERVICE', 'Art. 26', 'TREATY', 7.5, '7.5%', 'H5', 'TAX_TREATY', TRUE, 'See Tax Treaty Rates', 'Based on the treaty with each country; may differ if the tax treaty changes.', 50),
  (2, 'Individual Vendor', 'Not Rental', NULL, 'NOT_RENTAL', NULL, 'Art. 21', 'PROGRESSIVE', NULL, 'Progressive', 'D1', 'PPH21_TARIFF', FALSE, NULL, 'Refer to table "Tarif PPh Orang Pribadi".', 60),
  (3, 'Facility', 'Has SKB', NULL, 'HAS_SKB', NULL, 'Art. 23', 'FIXED', 0.0, '0%', 'E2', 'SKB', TRUE, 'See SKB examples', 'RPA selects the matching SAP code from the code on the invoice and creates the parked document; the WHT calculation happens in SAP.', 70),
  (3, 'Facility', 'PP23 Eligible', NULL, 'PP23', NULL, 'Art. 4(2)', 'FIXED', 0.5, '0.5%', 'I1', 'PP23', TRUE, 'See PP23 examples', NULL, 80),
  (4, 'Rental', 'Land / Building', NULL, 'LAND_BUILDING', NULL, 'Art. 4(2)', 'FIXED', 10.0, '10%', 'I2', NULL, FALSE, NULL, NULL, 90),
  (4, 'Rental', 'Movable Asset', NULL, 'MOVABLE_ASSET', NULL, 'Art. 23', 'FIXED', 2.0, '2%', 'E5', NULL, FALSE, NULL, NULL, 100),
  (5, 'Construction', 'Execution', 'SBUJK + Small', 'EXECUTION', 'SBUJK_SMALL', 'Art. 4(2)', 'FIXED', 1.75, '1.75%', 'I3', 'SBUJK', TRUE, 'See SBUJK examples', NULL, 110),
  (5, 'Construction', 'Execution', 'SBUJK + Non-small', 'EXECUTION', 'SBUJK_NON_SMALL', 'Art. 4(2)', 'FIXED', 2.65, '2.65%', 'I4', 'SBUJK', TRUE, 'See SBUJK examples', NULL, 120),
  (5, 'Construction', 'Execution', 'No SBUJK', 'EXECUTION', 'NO_SBUJK', 'Art. 4(2)', 'FIXED', 4.0, '4%', 'I5', NULL, FALSE, NULL, NULL, 130),
  (5, 'Construction', 'Planning / Consulting', 'SBUJK', 'PLANNING_CONSULTING', 'SBUJK', 'Art. 4(2)', 'FIXED', 3.5, '3.5%', 'I6', 'SBUJK', TRUE, 'See SBUJK examples', NULL, 140),
  (5, 'Construction', 'Planning / Consulting', 'No SBUJK', 'PLANNING_CONSULTING', 'NO_SBUJK', 'Art. 4(2)', 'FIXED', 6.0, '6%', 'I7', NULL, FALSE, NULL, NULL, 150),
  (6, 'Service', 'Not Subject to VAT', NULL, 'NOT_VAT', NULL, 'Art. 23', 'FIXED', 2.0, '2%', 'E1', NULL, FALSE, NULL, NULL, 160),
  (6, 'Service', 'Freight / Travel', NULL, 'FREIGHT_TRAVEL', NULL, 'Art. 23', 'FIXED', 2.0, '2%', 'E7', NULL, FALSE, NULL, NULL, 170),
  (6, 'Service', 'Royalty / License', NULL, 'ROYALTY_LICENSE', NULL, 'Art. 23', 'FIXED', 15.0, '15%', 'E8', NULL, FALSE, NULL, NULL, 180),
  (6, 'Service', 'Interest', NULL, 'INTEREST', NULL, 'Art. 23', 'FIXED', 15.0, '15%', 'E9', NULL, FALSE, NULL, NULL, 190),
  (6, 'Service', 'Domestic Shipping', NULL, 'DOMESTIC_SHIPPING', NULL, 'Art. 15', 'FIXED', 1.2, '1.2%', 'J1', NULL, FALSE, NULL, NULL, 200),
  (6, 'Service', 'Domestic Airline', NULL, 'DOMESTIC_AIRLINE', NULL, 'Art. 15', 'FIXED', 1.8, '1.8%', 'J2', NULL, FALSE, NULL, NULL, 210),
  (6, 'Service', 'Foreign Shipping', NULL, 'FOREIGN_SHIPPING', NULL, 'Art. 15', 'FIXED', 2.64, '2.64%', 'J3', NULL, FALSE, NULL, NULL, 220),
  (7, 'Default', 'Other Services', NULL, 'OTHER_SERVICES', NULL, 'Art. 23', 'FIXED', 2.0, '2%', 'E3', NULL, FALSE, NULL, NULL, 230)
) AS v(step, category, condition, sub_condition, condition_code, sub_condition_code, wht_article, rate_type, rate_pct, rate_text,
       sap_wht_code, reference_master, requires_document, document_examples, remarks, display_order)
WHERE NOT EXISTS (SELECT 1 FROM "WHT_RULE");

-- Sample treaty rows from the WHT Configuration wireframe. Seeded as DRAFT: the tax team
-- must confirm each country against the current treaty before activating it.
INSERT INTO "WHT_TAX_TREATY"
  (country, dividend_portfolio_pct, dividend_substantial_pct, interest_pct, royalty_pct, service_pct, service_treatment, notes, status)
SELECT v.* FROM (VALUES
  ('Germany',        5.0, 15.0, 10.0,  5.0, 7.5, 'Technical services', 'Sample from wireframe - confirm against the current treaty.', 'DRAFT'),
  ('Singapore',      0.0,  0.0, 10.0, 10.0, 10.0, 'FTS',               'Sample from wireframe - confirm against the current treaty.', 'DRAFT'),
  ('Japan',         10.0, 10.0, 10.0, 10.0, 10.0, 'FTS',               'Sample from wireframe - confirm against the current treaty.', 'DRAFT'),
  ('United States',  5.0, 15.0, 10.0, 10.0, 10.0, 'FTS',               'Sample from wireframe - confirm against the current treaty.', 'DRAFT'),
  ('Netherlands',    5.0, 15.0, 10.0,  5.0, 7.5, 'Technical services', 'Sample from wireframe - confirm against the current treaty.', 'DRAFT')
) AS v(country, dividend_portfolio_pct, dividend_substantial_pct, interest_pct, royalty_pct, service_pct, service_treatment, notes, status)
WHERE NOT EXISTS (SELECT 1 FROM "WHT_TAX_TREATY");

SET search_path = public;
