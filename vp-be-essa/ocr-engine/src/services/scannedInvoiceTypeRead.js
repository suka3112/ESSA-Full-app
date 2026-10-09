import { getLimits, getPromptsConfig } from "../config/loadConfig.js";
import { createOpenAiClient, isOpenAiEnabled, resolveModel } from "../config/openai.js";
import { renderPagesToBase64 } from "./pdfPageImage.js";

const MIN_PAGE_TEXT_CHARS = 40;

/** True when pdf.js found no usable text, which is typical of a flattened scan. */
export function pageTextsLackEmbeddedText(pageTexts) {
  const pages = pageTexts || [];
  if (!pages.length) return true;
  return !pages.some(
    (page) => String(page?.text || "").trim().length >= MIN_PAGE_TEXT_CHARS,
  );
}

function parseTranscribedPages(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const rows = Array.isArray(parsed?.pages) ? parsed.pages : [];
  return rows
    .map((row) => ({
      pageNumber: Number(row?.page),
      text: String(row?.text || "").trim(),
    }))
    .filter((row) => Number.isInteger(row.pageNumber) && row.pageNumber > 0 && row.text);
}

/**
 * Read a scanned invoice so PO appendix keywords (Rental, HRG-LIFT_EQP, …)
 * can be matched. Returns page text only; it does not choose the invoice type.
 * @param {Buffer} pdfBuffer
 * @param {{ traceId?: string, pageCount?: number }} [options]
 * @returns {Promise<Array<{ pageNumber: number, text: string }>>}
 */
export async function readScannedPagesForInvoiceType(pdfBuffer, options = {}) {
  const traceId = options.traceId || "-";
  if (!isOpenAiEnabled()) return [];

  const prompts = getPromptsConfig().scannedInvoiceTypeRead;
  if (!prompts?.system || !prompts?.user) {
    console.warn(
      `[extract][${traceId}] SCANNED_INVOICE_TYPE_READ_NO_PROMPT`,
    );
    return [];
  }

  const pageCount = Number(options.pageCount) || 0;
  if (pageCount < 1) return [];

  let images = [];
  try {
    images = await renderPagesToBase64(
      pdfBuffer,
      Array.from({ length: pageCount }, (_, index) => index + 1),
    );
  } catch (error) {
    console.warn(`[extract][${traceId}] SCANNED_INVOICE_TYPE_READ_RENDER_FAILED`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
  if (!images.length) return [];

  const client = await createOpenAiClient();
  if (!client) return [];

  const model = resolveModel("classification");
  const limits = getLimits();
  const chunkSize = Math.max(1, Number(limits.visionClassificationChunkSize) || 6);
  const detail =
    limits.visionClassificationImageDetail || limits.visionImageDetail || "high";
  /** @type {Array<{ pageNumber: number, text: string }>} */
  const pages = [];

  for (let offset = 0; offset < images.length; offset += chunkSize) {
    const chunk = images.slice(offset, offset + chunkSize);
    /** @type {import("openai").Chat.Completions.ChatCompletionContentPart[]} */
    const content = [{ type: "text", text: prompts.user }];
    for (const image of chunk) {
      content.push({ type: "text", text: `Page ${image.pageNumber}:` });
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${image.imageBase64}`,
          detail,
        },
      });
    }

    try {
      const completion = await client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompts.system },
          { role: "user", content },
        ],
      });
      pages.push(...parseTranscribedPages(completion.choices[0]?.message?.content));
    } catch (error) {
      console.warn(`[extract][${traceId}] SCANNED_INVOICE_TYPE_READ_FAILED`, {
        pages: chunk.map((image) => image.pageNumber),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.info(`[extract][${traceId}] SCANNED_INVOICE_TYPE_READ`, {
    pages: pages.length,
    chars: pages.reduce((total, page) => total + page.text.length, 0),
  });
  return pages;
}
