import { getGraphClient, isGraphAppConfigured } from "./microsoftGraph.client";
import logger from "../utils/logger";

export type GraphMailAttachment = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline?: boolean;
  contentBytes?: string;
};

export type GraphMailMessage = {
  id: string;
  internetMessageId?: string;
  subject?: string;
  receivedDateTime?: string;
  hasAttachments?: boolean;
  from?: {
    emailAddress?: {
      address?: string;
      name?: string;
    };
  };
  isRead?: boolean;
};

const getMailbox = () => String(process.env.GRAPH_MAILBOX || "").trim();

export const isGraphConfigured = (): boolean => {
  return Boolean(isGraphAppConfigured() && getMailbox());
};

export const isEmailIntakeEnabled = (): boolean => {
  const flag = String(process.env.EMAIL_INTAKE_ENABLED || "")
    .trim()
    .toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
};

const mailboxPath = () => `/users/${encodeURIComponent(getMailbox())}`;

export const listInboxMessages = async (
  top = 25,
): Promise<GraphMailMessage[]> => {
  const client = getGraphClient();
  const response = await client
    .api(`${mailboxPath()}/mailFolders/inbox/messages`)
    .select(
      "id,internetMessageId,subject,receivedDateTime,hasAttachments,from,isRead",
    )
    .orderby("receivedDateTime desc")
    .top(top)
    .get();

  return Array.isArray(response?.value) ? response.value : [];
};

export const listMessageAttachments = async (
  messageId: string,
): Promise<GraphMailAttachment[]> => {
  const client = getGraphClient();
  const response = await client
    .api(`${mailboxPath()}/messages/${encodeURIComponent(messageId)}/attachments`)
    .select("id,name,contentType,size,isInline")
    .get();

  return Array.isArray(response?.value) ? response.value : [];
};

export const downloadFileAttachment = async (
  messageId: string,
  attachmentId: string,
): Promise<GraphMailAttachment | null> => {
  const client = getGraphClient();
  const attachment = await client
    .api(
      `${mailboxPath()}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    )
    .get();

  if (!attachment || attachment["@odata.type"] !== "#microsoft.graph.fileAttachment") {
    return null;
  }

  return {
    id: attachment.id,
    name: attachment.name,
    contentType: attachment.contentType,
    size: attachment.size,
    isInline: attachment.isInline,
    contentBytes: attachment.contentBytes,
  };
};

export const ensureMailFolder = async (displayName: string): Promise<string> => {
  const client = getGraphClient();
  const existing = await client
    .api(`${mailboxPath()}/mailFolders`)
    .filter(`displayName eq '${displayName.replace(/'/g, "''")}'`)
    .top(1)
    .get();

  if (Array.isArray(existing?.value) && existing.value[0]?.id) {
    return String(existing.value[0].id);
  }

  const created = await client.api(`${mailboxPath()}/mailFolders`).post({
    displayName,
  });
  logger.info(`[EmailIntake] Created mailbox folder ${displayName}`);
  return String(created.id);
};

export const moveMessageToFolder = async (
  messageId: string,
  folderDisplayName: string,
): Promise<void> => {
  try {
    const folderId = await ensureMailFolder(folderDisplayName);
    const client = getGraphClient();
    await client
      .api(`${mailboxPath()}/messages/${encodeURIComponent(messageId)}/move`)
      .post({ destinationId: folderId });
  } catch (error) {
    logger.warn(
      `[EmailIntake] Failed to move message ${messageId} to ${folderDisplayName}`,
      error,
    );
  }
};
