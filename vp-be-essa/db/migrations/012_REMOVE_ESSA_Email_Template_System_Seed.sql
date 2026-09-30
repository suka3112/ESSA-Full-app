-- Cleanup: remove system-seeded email templates and their version rows.
-- Keeps user-created / duplicated templates (IsSystem = FALSE).
-- Keeps ESSA_EMAIL_SCENARIO and ESSA_EMAIL_SCENARIO_VARIABLE (required catalog).
-- Does not drop tables. Safe to run once on an existing database.
--
-- Prerequisite: db/migrations/011_ESSA_Email_Templates_And_Invoice.sql already applied.

BEGIN;

DELETE FROM "ESSA_EMAIL_TEMPLATE_VERSION" v
USING "ESSA_EMAIL_TEMPLATE" t
WHERE v."TemplateId" = t."Id"
  AND t."IsSystem" = TRUE;

DELETE FROM "ESSA_EMAIL_TEMPLATE_VERSION"
WHERE "Note" = 'System seed';

DELETE FROM "ESSA_EMAIL_TEMPLATE"
WHERE "IsSystem" = TRUE;

COMMIT;

-- ESSA_INVOICE rows are not inserted by migration 011. They are backfilled from
-- uploaded AP_DOCUMENT records when the invoice list is loaded. Deleting them
-- here is optional and they will reappear on the next list call:
--
-- DELETE FROM "ESSA_INVOICE";
