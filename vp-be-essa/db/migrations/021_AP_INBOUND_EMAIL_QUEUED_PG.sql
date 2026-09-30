-- Migration 021 (Postgres): allow QUEUED on inbound email + attachment status

ALTER TABLE "AP_INBOUND_EMAIL"
  DROP CONSTRAINT IF EXISTS "CK_AP_INBOUND_EMAIL_Status";

ALTER TABLE "AP_INBOUND_EMAIL"
  ADD CONSTRAINT "CK_AP_INBOUND_EMAIL_Status" CHECK (
    "Status" IN (
      'QUEUED',
      'PENDING',
      'PROCESSED',
      'NO_DOCUMENT',
      'FAILED',
      'IGNORED',
      'VENDOR_UNMATCHED',
      'INVALID_SUBJECT'
    )
  );

ALTER TABLE "AP_INBOUND_EMAIL_ATTACHMENT"
  DROP CONSTRAINT IF EXISTS "CK_AP_INBOUND_EMAIL_ATTACHMENT_Status";

ALTER TABLE "AP_INBOUND_EMAIL_ATTACHMENT"
  ADD CONSTRAINT "CK_AP_INBOUND_EMAIL_ATTACHMENT_Status" CHECK (
    "Status" IN (
      'QUEUED',
      'PENDING',
      'PROCESSED',
      'SKIPPED',
      'FAILED'
    )
  );
