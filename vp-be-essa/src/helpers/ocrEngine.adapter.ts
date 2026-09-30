/**
 * In-process bridge to the vendored ESM OCR engine under /ocr-engine.
 * Uses dynamic import so CJS ts-node can load the ESM package.
 */
import path from "path";
import { pathToFileURL } from "url";
import logger from "../utils/logger";

export type OcrEngineMode = "inprocess" | "http";

export type OcrExtractOptions = {
  validationMode?: string | unknown;
  traceId?: string;
  extractionPrompt?: string;
  extractionPromptPo?: string;
  extractionPrompts?: Record<string, string>;
  invoiceTypeCatalog?: unknown;
  invoiceWorkflow?: string;
  /** When true, classify/extract even if catalog-mandatory docs are absent. */
  skipMandatoryDocuments?: boolean;
  /** DOCREQ: requested supporting-doc types (faktur_pajak, berita_acara, …). */
  requestedDocumentTypes?: string[];
};

export type OcrExtractHttpLikeResponse = {
  status: number;
  data: {
    status?: number;
    message?: string;
    extractionTrace?: Record<string, unknown>;
    data?: any;
    [key: string]: unknown;
  };
};

export type OcrHealthSnapshot = {
  ok: boolean;
  openAiEnabled: boolean | null;
  service: string;
  activeExtracts: number | null;
  queuedExtracts: number | null;
  ocrStatus: string | null;
  engine: OcrEngineMode;
  error?: string;
};

type EngineModules = {
  runExtractPipeline: (
    pdfBuffer: Buffer,
    sourceFile: { originalname: string; mimetype: string },
    options?: OcrExtractOptions,
  ) => Promise<Record<string, unknown>>;
  runExtractExclusive: <T>(fn: () => Promise<T>) => Promise<T>;
  getExtractQueueStatus: () => { active: number; queued: number };
  isOpenAiEnabled: () => boolean;
  loadAppConfig: (force?: boolean) => unknown;
  enrichExtractResponseUrls: (
    data: Record<string, unknown>,
    baseUrl: string,
  ) => Record<string, unknown>;
  resolveUploadsDir: () => string;
};

let enginePromise: Promise<EngineModules> | null = null;

const resolveEngineMode = (): OcrEngineMode => {
  const raw = String(process.env.AP_OCR_ENGINE || "inprocess")
    .trim()
    .toLowerCase();
  return raw === "http" ? "http" : "inprocess";
};

export const getOcrEngineMode = (): OcrEngineMode => resolveEngineMode();

const engineRoot = () =>
  path.resolve(process.cwd(), "ocr-engine");

const toModuleUrl = (relativeFromEngine: string): string =>
  pathToFileURL(path.join(engineRoot(), relativeFromEngine)).href;

async function loadEngine(): Promise<EngineModules> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [
        pipelineMod,
        queueMod,
        openaiMod,
        configMod,
        publicUrlMod,
        uploadFolderMod,
      ] = await Promise.all([
        import(toModuleUrl("src/pipeline/extractPipeline.js")),
        import(toModuleUrl("src/services/extractQueue.js")),
        import(toModuleUrl("src/config/openai.js")),
        import(toModuleUrl("src/config/loadConfig.js")),
        import(toModuleUrl("src/utils/publicUrl.js")),
        import(toModuleUrl("src/services/uploadFolder.js")),
      ]);

      // Ensure limits/prompts JSON are loaded once from ocr-engine/config
      if (typeof configMod.loadAppConfig === "function") {
        configMod.loadAppConfig();
      }

      return {
        runExtractPipeline:
          pipelineMod.runExtractPipeline || pipelineMod.default,
        runExtractExclusive: queueMod.runExtractExclusive,
        getExtractQueueStatus: queueMod.getExtractQueueStatus,
        isOpenAiEnabled: openaiMod.isOpenAiEnabled,
        loadAppConfig: configMod.loadAppConfig,
        enrichExtractResponseUrls: publicUrlMod.enrichExtractResponseUrls,
        resolveUploadsDir: uploadFolderMod.resolveUploadsDir,
      };
    })().catch((error) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

const resolvePublicBaseUrl = (): string => {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const port = process.env.PORT?.trim() || "8090";
  return `http://localhost:${port}`;
};

const buildSuccessBody = (
  result: Record<string, unknown>,
  traceId: string,
  startedAt: number,
  enrich: EngineModules["enrichExtractResponseUrls"],
): OcrExtractHttpLikeResponse["data"] => {
  const statusFlag = String(result.status || "");

  if (statusFlag === "needs_invoice_type_review") {
    return {
      status: 200,
      message: "Invoice type needs manual review before classification",
      extractionTrace: {
        traceId,
        totalMs: Date.now() - startedAt,
        timing: (result.meta as Record<string, unknown> | undefined)?.timing ?? null,
        needsInvoiceTypeReview: true,
      },
      data: result,
    };
  }

  if (statusFlag === "missing_mandatory_documents") {
    const missingDocs = Array.isArray(result.missingMandatoryDocuments)
      ? result.missingMandatoryDocuments
      : [];
    const missing = missingDocs
      .map((doc) =>
        typeof doc === "string"
          ? doc
          : (doc as { categoryLabel?: string; categoryId?: string })
              ?.categoryLabel ||
            (doc as { categoryId?: string })?.categoryId,
      )
      .filter(Boolean);
    return {
      status: 200,
      message: missing.length
        ? `Extraction stopped — required documents were not found: ${missing.join(", ")}.`
        : "Extraction stopped — required documents were not found.",
      extractionTrace: {
        traceId,
        totalMs: Date.now() - startedAt,
        timing: (result.meta as Record<string, unknown> | undefined)?.timing ?? null,
        missingMandatoryDocuments: true,
      },
      data: result,
    };
  }

  const { uploadFolder: _uploadFolder, ...rest } = result as Record<
    string,
    unknown
  > & { uploadFolder?: unknown };
  const payload = enrich(
    {
      classification: rest.classification as Record<string, unknown>,
      split: rest.split as Record<string, unknown>,
      documents: rest.documents as unknown[],
      validation: rest.validation,
      meta: rest.meta as Record<string, unknown>,
      ...(rest.status ? { status: rest.status } : {}),
    } as Record<string, unknown>,
    resolvePublicBaseUrl(),
  );

  return {
    status: 200,
    message: "Document extracted and classified successfully",
    extractionTrace: {
      traceId,
      totalMs: Date.now() - startedAt,
      timing: (rest.meta as Record<string, unknown> | undefined)?.timing ?? null,
    },
    data: payload,
  };
};

/**
 * Run the vendored OCR pipeline and return an axios-shaped response so
 * apInvoiceExtract.service can keep the same post-processing path.
 */
export async function runInProcessExtract(input: {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  options: OcrExtractOptions;
}): Promise<OcrExtractHttpLikeResponse> {
  const startedAt = Date.now();
  const traceId = input.options.traceId || `be-${Date.now().toString(36)}`;

  try {
    const engine = await loadEngine();

    if (!engine.isOpenAiEnabled()) {
      return {
        status: 503,
        data: {
          status: 503,
          message:
            "OpenAI API key is required. Set OPENAI_API_KEY or OPEN_AI_KEY in your environment.",
          extractionTrace: {
            traceId,
            failed: true,
            reason: "OPENAI_DISABLED",
          },
          data: null,
        },
      };
    }

    const result = await engine.runExtractExclusive(() =>
      engine.runExtractPipeline(
        input.buffer,
        {
          originalname: input.originalname,
          mimetype: input.mimetype,
        },
        input.options,
      ),
    );

    return {
      status: 200,
      data: buildSuccessBody(
        result,
        traceId,
        startedAt,
        engine.enrichExtractResponseUrls,
      ),
    };
  } catch (error) {
    logger.error(`[OCR][${traceId}] In-process extract failed:`, error);
    return {
      status: 500,
      data: {
        status: 500,
        message:
          error instanceof Error ? error.message : "Extraction failed",
        extractionTrace: {
          traceId,
          failed: true,
          totalMs: Date.now() - startedAt,
        },
        data: null,
      },
    };
  }
}

export async function getInProcessOcrHealth(): Promise<OcrHealthSnapshot> {
  try {
    const engine = await loadEngine();
    const { active, queued } = engine.getExtractQueueStatus();
    const openAiEnabled = engine.isOpenAiEnabled();
    return {
      ok: true,
      openAiEnabled,
      service: "vp-ocr-engine",
      activeExtracts: active,
      queuedExtracts: queued,
      ocrStatus: active > 0 ? "busy" : "ok",
      engine: "inprocess",
    };
  } catch (error) {
    return {
      ok: false,
      openAiEnabled: null,
      service: "vp-ocr-engine",
      activeExtracts: null,
      queuedExtracts: null,
      ocrStatus: null,
      engine: "inprocess",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function resolveOcrUploadsDir(): Promise<string> {
  const engine = await loadEngine();
  return engine.resolveUploadsDir();
}
