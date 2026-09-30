-- Migration 024 (Postgres): Graph message/attachment ids exceed VARCHAR(255).
-- DOCREQ replies failed with: value too long for type character varying(255)

ALTER TABLE "AP_INBOUND_EMAIL"
  ALTER COLUMN "MessageId" TYPE TEXT;

ALTER TABLE "AP_INBOUND_EMAIL_ATTACHMENT"
  ALTER COLUMN "AttachmentId" TYPE TEXT;

ALTER TABLE "AP_DOCUMENT"
  ALTER COLUMN "OriginalFileName" TYPE VARCHAR(1000);

ALTER TABLE "AP_DOCUMENT_REQUEST"
  ALTER COLUMN "GraphDraftMessageId" TYPE TEXT;

ALTER TABLE "AP_INBOUND_SHAREPOINT"
  ALTER COLUMN "DriveItemId" TYPE TEXT;
