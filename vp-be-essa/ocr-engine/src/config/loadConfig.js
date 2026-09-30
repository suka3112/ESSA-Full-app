import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_DIR = path.resolve(__dirname, "../../config");

/** @type {{ prompts: object, limits: object, validation: object, configDir: string } | null} */
let cache = null;

function resolveConfigDir() {
  const custom = process.env.CONFIG_DIR?.trim();
  if (custom) return path.resolve(custom);
  return DEFAULT_CONFIG_DIR;
}

function readJsonFile(configDir, fileName) {
  const filePath = path.join(configDir, fileName);
  if (!existsSync(filePath)) {
    throw new Error(`Missing config file: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function applyLimitEnvOverrides(limits) {
  return {
    ...limits,
    // Do not bind to the parent BE PORT — this package never listens.
    // Keep limits.json port only for standalone ocr-demo compatibility.
    port: limits.port,
    maxFileSizeBytes: toNumber(process.env.MAX_FILE_SIZE_BYTES, limits.maxFileSizeBytes),
    classificationChunkSize: toNumber(
      process.env.CLASSIFICATION_CHUNK_SIZE,
      limits.classificationChunkSize,
    ),
    classificationParallelRequests: toNumber(
      process.env.CLASSIFICATION_PARALLEL_REQUESTS,
      limits.classificationParallelRequests,
    ),
    classificationPreviewChars: toNumber(
      process.env.CLASSIFICATION_PREVIEW_CHARS,
      limits.classificationPreviewChars,
    ),
    classificationPagePreviewChars: toNumber(
      process.env.CLASSIFICATION_PAGE_PREVIEW_CHARS,
      limits.classificationPagePreviewChars,
    ),
    extractionTextLimitChars: toNumber(
      process.env.EXTRACTION_TEXT_LIMIT_CHARS,
      limits.extractionTextLimitChars,
    ),
    extractionParallelRequests: toNumber(
      process.env.EXTRACTION_PARALLEL_REQUESTS,
      limits.extractionParallelRequests,
    ),
    extractionVisionFallback:
      process.env.EXTRACTION_VISION_FALLBACK === "true"
      || limits.extractionVisionFallback === true,
    openAiTimeoutMs: toNumber(process.env.OPENAI_TIMEOUT_MS, limits.openAiTimeoutMs),
    minPageTextChars: toNumber(process.env.MIN_PAGE_TEXT_CHARS, limits.minPageTextChars),
    visionClassificationChunkSize: toNumber(
      process.env.VISION_CLASSIFICATION_CHUNK_SIZE,
      limits.visionClassificationChunkSize,
    ),
    pageRenderScale: toNumber(process.env.PAGE_RENDER_SCALE, limits.pageRenderScale),
    visionExtractionChunkSize: toNumber(
      process.env.VISION_EXTRACTION_CHUNK_SIZE,
      limits.visionExtractionChunkSize,
    ),
    visionParallelRequests: toNumber(
      process.env.VISION_PARALLEL_REQUESTS,
      limits.visionParallelRequests,
    ),
    pageRenderConcurrency: toNumber(
      process.env.PAGE_RENDER_CONCURRENCY,
      limits.pageRenderConcurrency,
    ),
    pageTextExtractionConcurrency: toNumber(
      process.env.PAGE_TEXT_EXTRACTION_CONCURRENCY,
      limits.pageTextExtractionConcurrency,
    ),
    scannedPdfTextRatioThreshold: toNumber(
      process.env.SCANNED_PDF_TEXT_RATIO_THRESHOLD,
      limits.scannedPdfTextRatioThreshold,
    ),
  };
}

export function loadAppConfig(force = false) {
  if (cache && !force) return cache;

  const configDir = resolveConfigDir();
  cache = {
    configDir,
    prompts: readJsonFile(configDir, "prompts.json"),
    limits: applyLimitEnvOverrides(readJsonFile(configDir, "limits.json")),
    validation: readJsonFile(configDir, "validation.json"),
  };

  return cache;
}

export function getLimits() {
  return loadAppConfig().limits;
}

export function getPromptsConfig() {
  return loadAppConfig().prompts;
}

export function getValidationConfig() {
  return loadAppConfig().validation;
}

export function fillTemplate(template, variables) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return variables[key] ?? "";
  });
}
