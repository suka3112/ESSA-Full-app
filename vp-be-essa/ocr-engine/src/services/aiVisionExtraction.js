import { getVisionExtractionPrompt } from "../config/dynamicExtractionPrompt.js";
import {
  createOpenAiClient,
  requireOpenAi,
  resolveModel,
} from "../config/openai.js";
import { getLimits } from "../config/loadConfig.js";
import { mergeExtractionChunks } from "../extractors/mergeExtraction.js";
import { mapWithConcurrency } from "../utils/concurrency.js";

function resolveExtractionChunkSize(pageCount, limits) {
  const base = limits.visionExtractionChunkSize;
  if (pageCount > 24) return Math.max(base, 8);
  if (pageCount > 12) return Math.max(base, 6);
  return base;
}

function buildExtractionChunkContent(
  chunk,
  prompts,
  contextNote,
  limits,
  sourcePageNumbers,
) {
  /** @type {import("openai").Chat.Completions.ChatCompletionContentPart[]} */
  const content = [{ type: "text", text: `${prompts.user}\n\n${contextNote}` }];

  for (const { pageNumber, imageBase64 } of chunk) {
    const sourcePage = sourcePageNumbers[pageNumber - 1] ?? pageNumber;
    content.push({
      type: "text",
      text: `Page ${pageNumber} (source page ${sourcePage}):`,
    });
    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/png;base64,${imageBase64}`,
        detail: limits.visionExtractionImageDetail || "low",
      },
    });
  }

  return content;
}

/**
 * Extract structured data from rendered page images (scanned PDFs).
 * @param {Buffer} pdfBuffer
 * @param {string} categoryId
 * @param {string} categoryLabel
 * @param {number[]} sourcePageNumbers - original page numbers in the uploaded PDF (for context)
 */
export async function extractWithVision(
  pdfBuffer,
  categoryId,
  categoryLabel,
  sourcePageNumbers = [],
  options = {},
) {
  requireOpenAi();

  const client = await createOpenAiClient();
  if (!client) {
    throw new Error("OpenAI client could not be created.");
  }

  const { getPageCount } = await import("./pdfText.js");
  const { renderPagesToBase64 } = await import("./pdfPageImage.js");

  const totalPages = await getPageCount(pdfBuffer);
  if (totalPages === 0) return {};

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const limits = getLimits();
  const prompts = getVisionExtractionPrompt(categoryId, categoryLabel, {
    extractionPrompt: options.extractionPrompt,
  });
  const model = resolveModel("extraction");
  const chunkSize = resolveExtractionChunkSize(totalPages, limits);
  const promptBuilderMode = Boolean(String(options.extractionPrompt || "").trim());
  console.info(
    `[extract][prompt][vision] mode=${promptBuilderMode ? "PROMPT_BUILDER_ONLY" : "OCR_DEMO_SCHEMA_HINTS"} category=${categoryId}`,
  );
  console.info(
    `[extract][prompt][vision] SYSTEM_START\n${prompts.system}\n[extract][prompt][vision] SYSTEM_END`,
  );
  if (promptBuilderMode) {
    console.info(
      `[extract][prompt][vision] PROMPT_BUILDER_TEMPLATE_START\n${String(options.extractionPrompt)}\n[extract][prompt][vision] PROMPT_BUILDER_TEMPLATE_END`,
    );
  }

  const pageImages = await renderPagesToBase64(pdfBuffer, pageNumbers, {
    scale: limits.pageRenderScale,
  });

  const chunks = [];
  for (let offset = 0; offset < pageImages.length; offset += chunkSize) {
    chunks.push({
      images: pageImages.slice(offset, offset + chunkSize),
      offset,
    });
  }

  const chunkResults = await mapWithConcurrency(
    chunks,
    limits.visionParallelRequests,
    async ({ images, offset }) => {
      const virtualStart = images[0].pageNumber;
      const virtualEnd = images[images.length - 1].pageNumber;
      const isContinuation = offset > 0;
      const sourceStart = sourcePageNumbers[virtualStart - 1] ?? virtualStart;
      const sourceEnd = sourcePageNumbers[virtualEnd - 1] ?? virtualEnd;

      const contextNote = [
        `Document category: ${categoryLabel} (${categoryId}).`,
        `Total pages in this document: ${totalPages}.`,
        `Extract data from virtual pages ${virtualStart}-${virtualEnd}`,
        sourcePageNumbers.length
          ? `(original PDF pages ${sourceStart}-${sourceEnd}).`
          : ".",
        isContinuation
          ? "This is a continuation — extract only data visible on these pages; do not repeat line items from earlier pages."
          : "Extract header fields and all visible table rows from these pages.",
      ].join(" ");

      const completion = await client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompts.system },
          {
            role: "user",
            content: buildExtractionChunkContent(
              images,
              prompts,
              contextNote,
              limits,
              sourcePageNumbers,
            ),
          },
        ],
      });

      const responseContent = completion.choices[0]?.message?.content;
      return responseContent ? JSON.parse(responseContent) : null;
    },
  );

  const validResults = chunkResults.filter(Boolean);
  if (!validResults.length) {
    throw new Error(`Vision extraction returned no results for ${categoryId}.`);
  }

  return mergeExtractionChunks(validResults);
}
