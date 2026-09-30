import { extractDocument } from "../extractors/index.js";
import { getLimits } from "../config/loadConfig.js";
import { resolveCategoryLabel } from "../constants/categoryUtils.js";
import { mapWithConcurrency } from "../utils/concurrency.js";

function buildExtractionFailure(
  docInstance,
  sourceFile,
  category,
  errorMessage,
  pages,
) {
  return {
    documentType: docInstance.categoryId,
    documentTypeLabel: category.categoryLabel,
    fileName: sourceFile.originalname,
    fileType: sourceFile.mimetype,
    status: "extraction_failed",
    pages,
    header: {},
    lineItems: [],
    fields: [],
    error: errorMessage,
    extractionMethod: "error",
  };
}

/**
 * Extract one split PDF section. Used as an independent async task.
 * @param {{ documentIndex: number, categoryId: string, categoryLabel?: string, pages: number[] }} docInstance
 * @param {Record<number, { buffer: Buffer, pages: number[] }>} virtualPdfs
 * @param {{ originalname: string, mimetype: string }} sourceFile
 * @param {{ extractionPrompt?: string }} options
 */
async function extractSection(docInstance, virtualPdfs, sourceFile, options = {}) {
  const virtualPdf = virtualPdfs[docInstance.documentIndex];
  const category = {
    categoryId: docInstance.categoryId,
    categoryLabel:
      docInstance.categoryLabel || resolveCategoryLabel(docInstance.categoryId),
    extractionPrompt: options.extractionPrompt || "",
  };

  if (!virtualPdf) {
    return buildExtractionFailure(
      docInstance,
      sourceFile,
      category,
      "Split PDF section was not created.",
      docInstance.pages,
    );
  }

  try {
    return await extractDocument(virtualPdf, sourceFile, category);
  } catch (error) {
    return buildExtractionFailure(
      docInstance,
      sourceFile,
      category,
      error instanceof Error ? error.message : String(error),
      virtualPdf.pages,
    );
  }
}

/**
 * Submit all split PDF sections for extraction in parallel.
 * When extractionParallelRequests is 0, every section starts at once (Promise.all).
 * When set to N > 0, at most N extractions run concurrently.
 *
 * @param {Array<{ documentIndex: number, categoryId: string, categoryLabel?: string, pages: number[] }>} documentInstances
 * @param {Record<number, { buffer: Buffer, pages: number[] }>} virtualPdfs
 * @param {{ originalname: string, mimetype: string }} sourceFile
 */
const DEFAULT_EXTRACTION_CONCURRENCY = 6;

const resolveExtractionConcurrency = (limits) => {
  const configured = Number(limits.extractionParallelRequests);
  // 0 used to mean "all sections at once", which often stalls on OpenAI rate limits
  // for large PO bundles (10–15 vision sections). Use a safe default instead.
  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_EXTRACTION_CONCURRENCY;
  }
  return configured;
};

export async function extractSectionsInParallel(
  documentInstances,
  virtualPdfs,
  sourceFile,
  options = {},
) {
  if (!documentInstances.length) return [];

  const limits = getLimits();
  const maxConcurrency = resolveExtractionConcurrency(limits);
  const traceId = options.traceId || "ocr";
  const total = documentInstances.length;

  return mapWithConcurrency(
    documentInstances,
    maxConcurrency,
    async (docInstance, index) => {
      const label = docInstance.categoryId || docInstance.categoryLabel || "section";
      const startedAt = Date.now();
      console.info(
        `[extract][${traceId}] SECTION_START ${index + 1}/${total} ${label} (concurrency=${maxConcurrency})`,
      );
      try {
        const result = await extractSection(
          docInstance,
          virtualPdfs,
          sourceFile,
          { extractionPrompt: options.extractionPrompt },
        );
        console.info(
          `[extract][${traceId}] SECTION_DONE ${index + 1}/${total} ${label} (+${Date.now() - startedAt}ms)`,
        );
        return result;
      } catch (error) {
        console.error(
          `[extract][${traceId}] SECTION_FAIL ${index + 1}/${total} ${label} (+${Date.now() - startedAt}ms)`,
          error,
        );
        throw error;
      }
    },
  );
}

