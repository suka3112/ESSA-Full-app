import fs from "fs";
import path from "path";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { ApSesHeader } from "../models/apSesHeader";
import logger from "../utils/logger";

export type SesManifestEntry = {
  sesNo: string;
  poNumber: string;
  fileName: string;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
};

export type BackendSesAttachment = {
  sesNo: string;
  poNumber: string | null;
  fileName: string;
  pdfPath: string;
  source: "backend";
  header: Record<string, string | null>;
  lineItems: Array<Record<string, string | null>>;
  section: Record<string, unknown>;
};

type ResolveSesInput = {
  sesNo?: string | null;
  poNumber?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
};

const MANIFEST_PATH = path.join(
  __dirname,
  "../../data/ses-documents/manifest.json",
);
const FILES_DIR = path.join(__dirname, "../../data/ses-documents/files");

let manifestCache: SesManifestEntry[] | null = null;

const loadManifest = (): SesManifestEntry[] => {
  if (manifestCache) return manifestCache;
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw) as SesManifestEntry[];
    manifestCache = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.warn("SES document manifest not loaded", error);
    manifestCache = [];
  }
  return manifestCache;
};

const normalizeToken = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "");

const parseDateMs = (value: unknown): number | null => {
  const token = String(value ?? "").trim();
  if (!token) return null;
  const ms = Date.parse(token);
  return Number.isFinite(ms) ? ms : null;
};

const pickManifestEntry = (
  input: ResolveSesInput,
): SesManifestEntry | null => {
  const manifest = loadManifest();
  if (!manifest.length) return null;

  const sesNo = normalizeToken(input.sesNo);
  if (sesNo) {
    const exact = manifest.find((row) => normalizeToken(row.sesNo) === sesNo);
    if (exact) return exact;
  }

  const poNumber = normalizeToken(input.poNumber);
  if (!poNumber) return null;

  const poMatches = manifest.filter(
    (row) => normalizeToken(row.poNumber) === poNumber,
  );
  if (!poMatches.length) return null;
  if (poMatches.length === 1) return poMatches[0];

  const periodStart = parseDateMs(input.periodStart);
  const periodEnd = parseDateMs(input.periodEnd);
  if (periodStart != null && periodEnd != null) {
    let best: SesManifestEntry | null = null;
    let bestOverlap = -1;
    for (const row of poMatches) {
      const rowStart = parseDateMs(row.serviceStartDate);
      const rowEnd = parseDateMs(row.serviceEndDate);
      if (rowStart == null || rowEnd == null) continue;
      const overlap =
        Math.min(periodEnd, rowEnd) - Math.max(periodStart, rowStart);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = row;
      }
    }
    if (best) return best;
  }

  return poMatches[poMatches.length - 1];
};

const formatDateValue = (value: unknown): string | null => {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const token = String(value).trim();
  if (!token) return null;
  const ms = Date.parse(token);
  if (Number.isFinite(ms)) return new Date(ms).toISOString().slice(0, 10);
  return token;
};

const toMoneyString = (value: unknown): string | null => {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return String(num);
};

async function fetchSesLineItems(
  sesNo: string,
): Promise<Array<Record<string, string | null>>> {
  try {
    const rows = (await sequelize.query(
      `SELECT Description, Unit, CAST(AcceptedQty AS FLOAT) AS AcceptedQty,
              CAST(LineValue AS FLOAT) AS LineValue
       FROM AP_SES_DETAIL
       WHERE SESNo = :sesNo
       ORDER BY POLnNo`,
      { replacements: { sesNo }, type: QueryTypes.SELECT },
    )) as Array<{
      Description?: string | null;
      Unit?: string | null;
      AcceptedQty?: number | null;
      LineValue?: number | null;
    }>;

    return rows.map((row) => ({
      description: row.Description ?? null,
      unit: row.Unit ?? null,
      quantity:
        row.AcceptedQty != null ? String(row.AcceptedQty) : null,
      lineValue: row.LineValue != null ? String(row.LineValue) : null,
    }));
  } catch {
    return [];
  }
}

async function fetchSesHeaderRecord(
  sesNo: string,
): Promise<ApSesHeader | null> {
  try {
    return await ApSesHeader.findOne({ where: { SESNo: sesNo } });
  } catch {
    return null;
  }
}

function buildSesSection(
  header: Record<string, string | null>,
  lineItems: Array<Record<string, string | null>>,
): Record<string, unknown> {
  return {
    sesHeaderInfo: header.sesNo ? `SES ${header.sesNo}` : null,
    sesNo: header.sesNo ?? null,
    poNumber: header.poNumber ?? null,
    transactionDate: header.transactionDate ?? null,
    vendorName: header.vendorName ?? null,
    site: header.site ?? null,
    projectName: header.projectName ?? header.sesDescription ?? null,
    totalSesValue: header.totalSesValue ?? null,
    currency: header.currency ?? "IDR",
    lineItems,
  };
}

function buildHeaderFromDb(
  dbHeader: ApSesHeader | null,
  manifest: SesManifestEntry,
): Record<string, string | null> {
  if (!dbHeader) {
    return {
      sesNo: manifest.sesNo,
      poNumber: manifest.poNumber,
      transactionDate: manifest.serviceEndDate ?? null,
      serviceStartDate: manifest.serviceStartDate ?? null,
      serviceEndDate: manifest.serviceEndDate ?? null,
      currency: "IDR",
    };
  }

  return {
    sesNo: dbHeader.SESNo ?? manifest.sesNo,
    poNumber: dbHeader.PONo ?? manifest.poNumber,
    prNo: dbHeader.PRNo ?? null,
    transactionDate: formatDateValue(dbHeader.TransactionDate),
    serviceStartDate: formatDateValue(dbHeader.ServiceStartDate),
    serviceEndDate: formatDateValue(dbHeader.ServiceEndDate),
    vendorName: dbHeader.VendorName ?? null,
    site: dbHeader.Site ?? null,
    projectName: dbHeader.SESDescription ?? null,
    sesDescription: dbHeader.SESDescription ?? null,
    poValue: toMoneyString(dbHeader.POValue),
    totalSesValue: toMoneyString(dbHeader.TotalSESValueIDR),
    totalSesValueUsd: toMoneyString(dbHeader.TotalSESValueUSD),
    remainingPoBalance: toMoneyString(dbHeader.RemainingPOBalance),
    currency: "IDR",
  };
}

export function getSesDocumentFilePath(sesNo: string): string | null {
  const manifest = loadManifest();
  const entry =
    manifest.find((row) => normalizeToken(row.sesNo) === normalizeToken(sesNo)) ??
    null;
  if (!entry) return null;
  const filePath = path.join(FILES_DIR, entry.fileName);
  return fs.existsSync(filePath) ? filePath : null;
}

export function extractSesContextFromBatch(
  responseData: Record<string, unknown>,
): ResolveSesInput {
  const documents = Array.isArray(responseData.documents)
    ? (responseData.documents as Array<Record<string, unknown>>)
    : [];

  let sesNo: string | null = null;
  let poNumber: string | null = null;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  const readHeader = (doc: Record<string, unknown>) => {
    const data =
      doc.data && typeof doc.data === "object"
        ? (doc.data as Record<string, unknown>)
        : doc;
    const header =
      (data.header as Record<string, unknown> | undefined) ||
      (data.structuredFields as Record<string, unknown> | undefined) ||
      {};

    if (!sesNo) {
      sesNo =
        String(header.sesNo ?? header.sesNumber ?? header.SESNo ?? "").trim() ||
        null;
    }
    if (!poNumber) {
      poNumber =
        String(header.poNumber ?? header.PONo ?? header.po_number ?? "").trim() ||
        null;
    }
    if (!periodStart) {
      periodStart = formatDateValue(header.periodStart ?? header.serviceStartDate);
    }
    if (!periodEnd) {
      periodEnd = formatDateValue(header.periodEnd ?? header.serviceEndDate);
    }
  };

  for (const doc of documents) {
    const docType = String(
      doc.documentType ?? doc.document_type ?? "",
    ).toLowerCase();
    if (docType === "ses") {
      readHeader(doc);
      break;
    }
  }

  if (!sesNo || !poNumber || !periodStart || !periodEnd) {
    for (const doc of documents) {
      const docType = String(
        doc.documentType ?? doc.document_type ?? "",
      ).toLowerCase();
      if (docType === "invoice" || docType === "berita_acara") {
        readHeader(doc);
      }
    }
  }

  return { sesNo, poNumber, periodStart, periodEnd };
}

class ApSesDocumentService {
  async resolveForInvoice(
    input: ResolveSesInput,
  ): Promise<BackendSesAttachment | null> {
    const manifestEntry = pickManifestEntry(input);
    if (!manifestEntry) return null;

    const filePath = path.join(FILES_DIR, manifestEntry.fileName);
    if (!fs.existsSync(filePath)) {
      logger.warn(`SES PDF missing on disk: ${filePath}`);
      return null;
    }

    const sesNo = manifestEntry.sesNo;
    const dbHeader = await fetchSesHeaderRecord(sesNo);
    const header = buildHeaderFromDb(dbHeader, manifestEntry);
    const lineItems = await fetchSesLineItems(sesNo);
    const section = buildSesSection(header, lineItems);

    return {
      sesNo,
      poNumber: header.poNumber ?? manifestEntry.poNumber,
      fileName: manifestEntry.fileName,
      pdfPath: filePath,
      source: "backend",
      header,
      lineItems,
      section,
    };
  }

  async enrichExtractResponse(
    responseData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const context = extractSesContextFromBatch(responseData);
    const backendSes = await this.resolveForInvoice(context);
    if (!backendSes) return responseData;
    return { ...responseData, backendSes };
  }
}

export default new ApSesDocumentService();
