import { getGraphClient, isGraphAppConfigured } from "./microsoftGraph.client";
import logger from "../utils/logger";

export type GraphDriveItem = {
  id: string;
  name: string;
  size?: number;
  webUrl?: string;
  lastModifiedDateTime?: string;
  file?: {
    mimeType?: string;
  };
  folder?: Record<string, unknown>;
};

const getSiteId = () => String(process.env.SHAREPOINT_SITE_ID || "").trim();
const getDriveId = () => String(process.env.SHAREPOINT_DRIVE_ID || "").trim();
const getFolderPath = () =>
  String(process.env.SHAREPOINT_FOLDER_PATH || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");

export const isSharePointConfigured = (): boolean => {
  return Boolean(
    isGraphAppConfigured() && getSiteId() && getDriveId() && getFolderPath(),
  );
};

/** Site + drive configured (watch folder path optional — used for filing). */
export const isGraphAppConfiguredForSharePointDrive = (): boolean => {
  return Boolean(isGraphAppConfigured() && getSiteId() && getDriveId());
};

export const isSharePointIntakeEnabled = (): boolean => {
  const flag = String(process.env.SHAREPOINT_INTAKE_ENABLED || "")
    .trim()
    .toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
};

const encodeFolderPath = (folderPath: string): string =>
  folderPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

const driveRoot = (): string => {
  const siteId = encodeURIComponent(getSiteId());
  const driveId = encodeURIComponent(getDriveId());
  return `/sites/${siteId}/drives/${driveId}`;
};

const folderChildrenPath = (): string => {
  const folder = encodeFolderPath(getFolderPath());
  return `${driveRoot()}/root:/${folder}:/children`;
};

const itemContentPath = (driveItemId: string): string => {
  return `${driveRoot()}/items/${encodeURIComponent(driveItemId)}/content`;
};

export const getSharePointFolderPath = (): string => getFolderPath();

/** Parent of Incoming, e.g. "ESSA AP Intake/Incoming" → "ESSA AP Intake". */
const intakeBasePath = (): string => {
  const incoming = getFolderPath();
  if (!incoming) return "";
  const parent = incoming.replace(/\/Incoming$/i, "").replace(/\/+$/g, "");
  return parent && parent !== incoming ? parent : "";
};

export const getSharePointFiledRoot = (): string => {
  const explicit = String(process.env.SHAREPOINT_FILED_ROOT || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (explicit) return explicit;
  const base = intakeBasePath();
  return base ? `${base}/Filed` : "";
};

export const getSharePointExceptionRoot = (): string => {
  const explicit = String(process.env.SHAREPOINT_EXCEPTION_ROOT || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (explicit) return explicit;
  const base = intakeBasePath();
  return base ? `${base}/Exception` : "";
};

/**
 * Resolve a folder by path under the drive root (e.g. "ESSA AP Intake/Incoming").
 */
export const getFolderByPath = async (
  folderPath: string,
): Promise<GraphDriveItem | null> => {
  const normalized = String(folderPath || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!normalized) return null;

  const client = getGraphClient();
  try {
    const item = await client
      .api(`${driveRoot()}/root:/${encodeFolderPath(normalized)}`)
      .select("id,name,webUrl,folder,lastModifiedDateTime")
      .get();
    return item?.id ? (item as GraphDriveItem) : null;
  } catch (error: any) {
    const status = error?.statusCode || error?.code;
    if (status === 404 || String(error?.code || "").includes("itemNotFound")) {
      return null;
    }
    throw error;
  }
};

/**
 * Ensure each path segment exists as a folder (idempotent).
 * Returns the leaf folder item.
 */
export const ensureFolderPath = async (
  folderPath: string,
): Promise<GraphDriveItem> => {
  if (!isGraphAppConfigured() || !getSiteId() || !getDriveId()) {
    throw new Error(
      "SharePoint is not configured. Set GRAPH_* and SHAREPOINT_SITE_ID / SHAREPOINT_DRIVE_ID.",
    );
  }

  const segments = String(folderPath || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!segments.length) {
    throw new Error("folderPath is empty");
  }

  const client = getGraphClient();
  let parentPath = "";
  let leaf: GraphDriveItem | null = null;

  for (const segment of segments) {
    const nextPath = parentPath ? `${parentPath}/${segment}` : segment;
    const existing = await getFolderByPath(nextPath);
    if (existing?.id) {
      leaf = existing;
      parentPath = nextPath;
      continue;
    }

    const parentApi = parentPath
      ? `${driveRoot()}/root:/${encodeFolderPath(parentPath)}:/children`
      : `${driveRoot()}/root/children`;

    try {
      const created = await client.api(parentApi).post({
        name: segment,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      });

      leaf = {
        id: String(created.id),
        name: String(created.name || segment),
        webUrl: created.webUrl,
        folder: created.folder || {},
      };
      logger.info(`[SharePoint] Created folder ${nextPath} (${leaf.id})`);
    } catch (error: any) {
      // Race / already exists — re-resolve
      const again = await getFolderByPath(nextPath);
      if (!again?.id) throw error;
      leaf = again;
      logger.info(`[SharePoint] Folder already exists ${nextPath}`);
    }
    parentPath = nextPath;
  }

  if (!leaf?.id) {
    throw new Error(`Failed to ensure folder path: ${folderPath}`);
  }
  return leaf;
};

/**
 * Upload (or replace) a file under an existing folder path.
 * Uses simple PUT content (suitable for typical invoice PDF sizes).
 */
export const uploadFileToFolderPath = async (input: {
  folderPath: string;
  fileName: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<GraphDriveItem> => {
  const folder = String(input.folderPath || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  const name = String(input.fileName || "invoice.pdf").trim();
  if (!folder || !name) {
    throw new Error("folderPath and fileName are required");
  }
  if (!input.buffer?.length) {
    throw new Error("file buffer is empty");
  }

  const client = getGraphClient();
  const itemPath = `${driveRoot()}/root:/${encodeFolderPath(`${folder}/${name}`)}:/content`;

  const uploaded = await client
    .api(itemPath)
    .header("Content-Type", input.contentType || "application/pdf")
    .put(input.buffer);

  return {
    id: String(uploaded.id),
    name: String(uploaded.name || name),
    size: uploaded.size,
    webUrl: uploaded.webUrl,
    file: uploaded.file,
  };
};

export const listFolderPdfItems = async (
  top = 25,
): Promise<GraphDriveItem[]> => {
  if (!isSharePointConfigured()) {
    throw new Error(
      "SharePoint is not configured. Set GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET, SHAREPOINT_SITE_ID, SHAREPOINT_DRIVE_ID, SHAREPOINT_FOLDER_PATH.",
    );
  }

  const client = getGraphClient();
  // Graph often rejects orderby on drive children (400). Prefer unsorted + client filter.
  const response = await client
    .api(folderChildrenPath())
    .select("id,name,size,webUrl,lastModifiedDateTime,file,folder")
    .top(Math.max(1, Math.min(200, top)))
    .get();

  const items: GraphDriveItem[] = Array.isArray(response?.value)
    ? response.value
    : [];

  const files = items.filter((item) => {
    if (item.folder) return false;
    const name = String(item.name || "").toLowerCase();
    const mime = String(item.file?.mimeType || "").toLowerCase();
    const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
    const isZip =
      mime === "application/zip" ||
      mime === "application/x-zip-compressed" ||
      name.endsWith(".zip");
    return isPdf || isZip;
  });

  files.sort((a, b) => {
    const ta = Date.parse(String(a.lastModifiedDateTime || "")) || 0;
    const tb = Date.parse(String(b.lastModifiedDateTime || "")) || 0;
    return tb - ta;
  });

  return files;
};

/**
 * Download file bytes from SharePoint. Graph returns the raw stream for /content.
 */
export const downloadDriveItemContent = async (
  driveItemId: string,
): Promise<Buffer> => {
  const client = getGraphClient();
  try {
    const response = await client
      .api(itemContentPath(driveItemId))
      .responseType("arraybuffer" as any)
      .get();

    if (Buffer.isBuffer(response)) return response;
    if (response instanceof ArrayBuffer) return Buffer.from(response);
    if (response?.buffer && response.byteLength != null) {
      return Buffer.from(response as ArrayBuffer);
    }
    // Some graph client versions return a stream-like / Uint8Array
    if (ArrayBuffer.isView(response)) {
      const view = response as ArrayBufferView;
      return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
    }
    throw new Error("Unexpected SharePoint content response type");
  } catch (error) {
    logger.error(
      `[SharePointIntake] Failed to download driveItem ${driveItemId}`,
      error,
    );
    throw error;
  }
};
