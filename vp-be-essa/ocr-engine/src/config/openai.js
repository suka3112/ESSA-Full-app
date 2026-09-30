import { getLimits } from "./loadConfig.js";

/**
 * OpenAI client and model configuration.
 * Supports OPENAI_API_KEY or OPEN_AI_KEY.
 */

export function getOpenAiConfig() {
  const apiKey =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.OPEN_AI_KEY?.trim() ||
    null;
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;

  const defaultModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o";
  const extractionModel =
    process.env.OPENAI_EXTRACTION_MODEL?.trim() || defaultModel;
  const classificationModel =
    process.env.OPENAI_CLASSIFICATION_MODEL?.trim() || defaultModel;

  return {
    apiKey,
    baseURL,
    defaultModel,
    extractionModel,
    classificationModel,
    timeoutMs: getLimits().openAiTimeoutMs,
  };
}

export function isOpenAiEnabled() {
  return Boolean(getOpenAiConfig().apiKey);
}

export function requireOpenAi() {
  if (!isOpenAiEnabled()) {
    throw new Error(
      "OpenAI API key is required. Set OPENAI_API_KEY or OPEN_AI_KEY in your environment.",
    );
  }
}

export async function createOpenAiClient() {
  const config = getOpenAiConfig();
  if (!config.apiKey) return null;

  const OpenAI = (await import("openai")).default;
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.timeoutMs,
    maxRetries: 1,
  });
}

export function resolveModel(purpose = "extraction") {
  const config = getOpenAiConfig();
  if (purpose === "classification") return config.classificationModel;
  return config.extractionModel;
}
