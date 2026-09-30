import { resolveCategoryLabel } from "../constants/categoryUtils.js";
import { resolveSchemaId } from "../constants/documentFieldSchemas.js";
import { getDynamicExtractionPrompt } from "../config/dynamicExtractionPrompt.js";
import { extractPurchaseOrderPoNumber } from "../utils/poNumber.js";
import {
  createOpenAiClient,
  requireOpenAi,
  resolveModel,
} from "../config/openai.js";
import { getLimits } from "../config/loadConfig.js";
import { mergeTextAndVisionExtraction } from "./mergeExtraction.js";
import {
  buildBaseResult,
  mergeDynamicAiResult,
  needsVisionExtraction,
  readVirtualPdfPageTexts,
} from "./utils.js";

async function extractWithOpenAI(
  categoryId,
  categoryLabel,
  text,
  pages,
  options = {},
) {
  requireOpenAi();

  const client = await createOpenAiClient();
  if (!client) {
    throw new Error("OpenAI client could not be created.");
  }

  const prompts = getDynamicExtractionPrompt(categoryId, categoryLabel, {
    extractionPrompt: options.extractionPrompt,
  });
  const model = resolveModel("extraction");
  const limits = getLimits();
  const userContent = `${prompts.user}\n\nCategory: ${categoryId}\nPages: ${pages.join(", ")}\n\nText:\n${text.slice(0, limits.extractionTextLimitChars)}`;
  const promptBuilderMode = Boolean(String(options.extractionPrompt || "").trim());

  console.info(
    `[extract][prompt] mode=${promptBuilderMode ? "PROMPT_BUILDER_ONLY" : "OCR_DEMO_SCHEMA_HINTS"} category=${categoryId}`,
  );
  console.info(
    `[extract][prompt] systemChars=${prompts.system.length} userChars=${userContent.length}`,
  );
  console.info(
    `[extract][prompt] SYSTEM_START\n${prompts.system}\n[extract][prompt] SYSTEM_END`,
  );
  if (promptBuilderMode) {
    console.info(
      `[extract][prompt] PROMPT_BUILDER_TEMPLATE_START\n${String(options.extractionPrompt)}\n[extract][prompt] PROMPT_BUILDER_TEMPLATE_END`,
    );
  }

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompts.system },
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error(
      `OpenAI returned an empty extraction response for ${categoryId}.`,
    );
  }

  return JSON.parse(content);
}

function resolveExtractionMethod({ usedText, usedVision }) {
  if (usedText && usedVision) return "ai+vision";
  if (usedVision) return "vision";
  return "ai";
}

/**
 * AI-driven extractor for any document category.
 * Uses text extraction by default; falls back to vision for scanned/sparse pages.
 * @param {{ buffer: Buffer, pages: number[], fileName: string }} virtualPdf
 * @param {{ originalname: string, mimetype: string }} sourceFile
 * @param {{ categoryId: string, categoryLabel?: string, extractionPrompt?: string }} category
 */
export async function extractDynamic(virtualPdf, sourceFile, category = {}) {
  const categoryId = category.categoryId || "unclassified";
  const categoryLabel =
    category.categoryLabel || resolveCategoryLabel(categoryId);
  const extractionPrompt = category.extractionPrompt || "";
  const limits = getLimits();

  const pageTexts = await readVirtualPdfPageTexts(virtualPdf);
  const text = pageTexts.map((p) => p.text).join("\n");
  const useVision = needsVisionExtraction(pageTexts, limits.minPageTextChars);
  const hasUsableText = text.trim().length >= limits.minPageTextChars;
  const isPurchaseOrder = resolveSchemaId(categoryId) === "purchase_order";

  const base = buildBaseResult(
    categoryId,
    categoryLabel,
    sourceFile,
    virtualPdf.pages,
  );
  base.detectedDocumentType = categoryLabel;

  let aiResult = null;
  let usedText = false;
  let usedVision = false;

  if (hasUsableText && !useVision) {
    aiResult = await extractWithOpenAI(
      categoryId,
      categoryLabel,
      text,
      virtualPdf.pages,
      { extractionPrompt },
    );
    usedText = true;
  }

  const textIsThin =
    usedText &&
    (!aiResult ||
      (Object.keys(aiResult.header || {}).length === 0 &&
        (aiResult.lineItems?.length ?? 0) === 0 &&
        (aiResult.fields?.length ?? 0) === 0));

  const allowVisionFallback = limits.extractionVisionFallback === true;
  const missingPoNumber =
    isPurchaseOrder && usedText && !extractPurchaseOrderPoNumber(aiResult);

  if (
    useVision ||
    isPurchaseOrder ||
    missingPoNumber ||
    (allowVisionFallback && textIsThin)
  ) {
    const { extractWithVision } =
      await import("../services/aiVisionExtraction.js");
    const visionResult = await extractWithVision(
      virtualPdf.buffer,
      categoryId,
      categoryLabel,
      virtualPdf.pages,
      { extractionPrompt },
    );
    usedVision = true;
    aiResult = usedText
      ? mergeTextAndVisionExtraction(aiResult, visionResult)
      : visionResult;
  }

  if (!aiResult) {
    throw new Error(`No extraction result for ${categoryId}.`);
  }

  return {
    ...mergeDynamicAiResult(base, aiResult),
    extractionMethod: resolveExtractionMethod({ usedText, usedVision }),
  };
}
