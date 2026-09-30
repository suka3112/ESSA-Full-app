import {
  getVisionClassificationPrompts,
  PER_PAGE_CLASSIFY_CONTEXT,
} from "../config/classificationPrompt.js";
import {
  createOpenAiClient,
  requireOpenAi,
  resolveModel,
} from "../config/openai.js";
import { getLimits } from "../config/loadConfig.js";
import {
  slugifyCategoryId,
} from "../constants/categoryUtils.js";
import {
  resolveCanonicalCategoryId,
  resolveCategoryDisplayLabel,
} from "../constants/documentFieldSchemas.js";
import { mapWithConcurrency } from "../utils/concurrency.js";

function normalizePageResult(entry) {
  const page = Number(entry?.page);
  const rawCategoryId = slugifyCategoryId(entry?.categoryId);
  const categoryId = resolveCanonicalCategoryId(rawCategoryId);
  const categoryLabel =
    String(entry?.categoryLabel || "").trim() ||
    resolveCategoryDisplayLabel(categoryId);
  const confidence = Math.min(1, Math.max(0, Number(entry?.confidence) || 0.5));

  return {
    page: Number.isFinite(page) ? page : null,
    categoryId,
    categoryLabel,
    confidence: Number(confidence.toFixed(2)),
    isDocumentStart: entry?.isDocumentStart === true,
    classificationMethod: "vision",
  };
}

function buildChunkContent(chunk, prompts, context, limits, priorPages = []) {
  const pageNumbers = chunk.map((entry) => entry.pageNumber);
  const priorNote = priorPages.length
    ? `Earlier page classifications: ${priorPages
        .map((entry) => `page ${entry.page}=${entry.categoryId}`)
        .join("; ")}.`
    : null;
  const contextNote = [
    context.totalPages ? `Total pages in PDF: ${context.totalPages}.` : null,
    `This batch is pages ${pageNumbers[0]}-${pageNumbers[pageNumbers.length - 1]} (${pageNumbers.length} images).`,
    priorNote
      ? `${priorNote} Earlier types are reference only; do not copy them unless this page is the same form.`
      : null,
    PER_PAGE_CLASSIFY_CONTEXT,
    "Return exactly one JSON object per image below. Do not skip or renumber pages.",
    "When notice, invoice, faktur_pajak, or berita_acara ARE present, they usually appear once near the start. If a type is missing from this PDF, do not invent it. Later pages are usually summary_calculation_manhour, daily_timesheet, daily_attendance, purchase_order, or purchase_order_appendix.",
  ]
    .filter(Boolean)
    .join(" ");

  /** @type {import("openai").Chat.Completions.ChatCompletionContentPart[]} */
  const content = [{ type: "text", text: `${prompts.user}\n\n${contextNote}` }];

  for (const { pageNumber, imageBase64 } of chunk) {
    content.push({ type: "text", text: `Page ${pageNumber}:` });
    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/png;base64,${imageBase64}`,
        detail:
          limits.visionClassificationImageDetail ||
          limits.visionImageDetail ||
          "low",
      },
    });
  }

  return content;
}

/**
 * Classify pages from rendered images when embedded PDF text is missing or sparse.
 * @param {Array<{ pageNumber: number, imageBase64: string }>} pageImages
 * @param {{ totalPages: number, startPage: number, endPage: number }} context
 */
export async function classifyPagesWithVision(pageImages, context = {}) {
  if (!pageImages?.length) return [];

  requireOpenAi();

  const client = await createOpenAiClient();
  if (!client) return [];

  const model = resolveModel("classification");
  const limits = getLimits();
  const prompts = getVisionClassificationPrompts(
    context.invoiceTypeId,
    context.catalog,
  );
  const chunkSize = Math.max(1, Number(limits.visionClassificationChunkSize) || 6);

  const chunks = [];
  for (let offset = 0; offset < pageImages.length; offset += chunkSize) {
    chunks.push(pageImages.slice(offset, offset + chunkSize));
  }

  const classifyChunk = async (chunk, priorPages = []) => {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompts.system },
        {
          role: "user",
          content: buildChunkContent(chunk, prompts, context, limits, priorPages),
        },
      ],
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) return [];

    const parsed = JSON.parse(responseContent);
    const chunkPages = Array.isArray(parsed.pages) ? parsed.pages : [];
    return chunkPages
      .map((entry) => normalizePageResult(entry))
      .filter((entry) => entry.page != null);
  };

  if (chunks.length === 1) {
    return classifyChunk(chunks[0]);
  }

  /** @type {Array<ReturnType<typeof normalizePageResult>>} */
  const pages = [];
  for (const chunk of chunks) {
    const chunkPages = await classifyChunk(chunk, pages.slice(-12));
    pages.push(...chunkPages);
  }
  return pages;
}

const PO_TIMESHEET_DISAMBIGUATION_SYSTEM = `You correct misclassified ESSA bundle pages.

Each image was labeled purchase_order but may actually be a Daily Time Sheet.

For each page image:
1. Read the MAIN TITLE / HEADING at the top (ignore small PO reference numbers in corners).
2. If the heading says "Daily Time Sheet" or the layout has Date, IN, OUT, Sign Workers, Daily Activity, Approved by → categoryId MUST be daily_timesheet.
3. Only keep purchase_order when the page is a PURCHASE ORDER cover (title PURCHASE ORDER, PO Number, PO Date, vendor). Requisition No is optional. A Daily Time Sheet heading is never a PO.

Return JSON only:
{
  "pages": [
    { "page": 1, "categoryId": "daily_timesheet", "confidence": 0.95 }
  ]
}

categoryId must be exactly daily_timesheet or purchase_order.`;

/**
 * Second-pass vision check for pages wrongly labeled purchase_order.
 * @param {Array<{ pageNumber: number, imageBase64: string }>} pageImages
 */
export async function disambiguatePoVsTimesheetPages(pageImages) {
  if (!pageImages?.length) return [];

  requireOpenAi();

  const client = await createOpenAiClient();
  if (!client) return [];

  const model = resolveModel("classification");
  const limits = getLimits();
  const chunkSize = limits.visionClassificationChunkSize;

  const chunks = [];
  for (let offset = 0; offset < pageImages.length; offset += chunkSize) {
    chunks.push(pageImages.slice(offset, offset + chunkSize));
  }

  const chunkResults = await mapWithConcurrency(
    chunks,
    limits.visionParallelRequests,
    async (chunk) => {
      /** @type {import("openai").Chat.Completions.ChatCompletionContentPart[]} */
      const content = [
        {
          type: "text",
          text: "Re-check each page heading. Return daily_timesheet when the title is Daily Time Sheet.",
        },
      ];

      for (const { pageNumber, imageBase64 } of chunk) {
        content.push({ type: "text", text: `Page ${pageNumber}:` });
        content.push({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${imageBase64}`,
            detail:
              limits.visionClassificationImageDetail ||
              limits.visionImageDetail ||
              "high",
          },
        });
      }

      const completion = await client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PO_TIMESHEET_DISAMBIGUATION_SYSTEM },
          { role: "user", content },
        ],
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) return [];

      const parsed = JSON.parse(responseContent);
      const chunkPages = Array.isArray(parsed.pages) ? parsed.pages : [];
      return chunkPages
        .map((entry) => normalizePageResult(entry))
        .filter((entry) => entry.page != null);
    },
  );

  return chunkResults.flat();
}

const TAIL_PO_RECOVERY_SYSTEM = `You find a missed SAP PURCHASE ORDER in the tail of a scanned ESSA manpower bundle.

The commercial invoice is earlier in the file. These images are the LAST pages (timesheets, attendance, PO cover, PO appendix).

For each page:
1. Read the MAIN TITLE.
2. purchase_order — printed/scanned PURCHASE ORDER form (title PURCHASE ORDER / Purchase Order, PO Number, PO Date, vendor). Usually one page immediately before Appendix - 1.
3. purchase_order_appendix — Appendix - 1/2/3, PRICE BREAKDOWN AND DESCRIPTION OF PURCHASE ORDER, SPECIFIC/SPECIAL TERMS, or GENERAL TERMS & CONDITIONS.
4. unchanged — Daily Time Sheet, Face Finger/attendance, or anything else. Do not force a PO label.

A PO number in a timesheet header is NOT purchase_order.

Return JSON only:
{
  "pages": [
    { "page": 48, "categoryId": "purchase_order", "confidence": 0.92 }
  ]
}

categoryId must be exactly purchase_order, purchase_order_appendix, or unchanged.`;

/**
 * When classification missed the PO cover on a scanned tail, re-check last pages.
 * @param {Array<{ pageNumber: number, imageBase64: string }>} pageImages
 */
export async function recoverTailPurchaseOrderPages(pageImages) {
  if (!pageImages?.length) return [];

  requireOpenAi();

  const client = await createOpenAiClient();
  if (!client) return [];

  const model = resolveModel("classification");
  const limits = getLimits();
  const chunkSize = Math.max(1, Number(limits.visionClassificationChunkSize) || 6);

  const chunks = [];
  for (let offset = 0; offset < pageImages.length; offset += chunkSize) {
    chunks.push(pageImages.slice(offset, offset + chunkSize));
  }

  const chunkResults = await mapWithConcurrency(
    chunks,
    limits.visionParallelRequests,
    async (chunk) => {
      /** @type {import("openai").Chat.Completions.ChatCompletionContentPart[]} */
      const content = [
        {
          type: "text",
          text: "Identify the PURCHASE ORDER cover and PO appendix on these last pages of a scanned bundle. Use unchanged when the page is not a PO document.",
        },
      ];

      for (const { pageNumber, imageBase64 } of chunk) {
        content.push({ type: "text", text: `Page ${pageNumber}:` });
        content.push({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${imageBase64}`,
            detail:
              limits.visionClassificationImageDetail ||
              limits.visionImageDetail ||
              "high",
          },
        });
      }

      const completion = await client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: TAIL_PO_RECOVERY_SYSTEM },
          { role: "user", content },
        ],
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) return [];

      const parsed = JSON.parse(responseContent);
      const chunkPages = Array.isArray(parsed.pages) ? parsed.pages : [];
      return chunkPages
        .map((entry) => {
          const categoryId = String(entry?.categoryId || "")
            .trim()
            .toLowerCase();
          if (
            categoryId !== "purchase_order" &&
            categoryId !== "purchase_order_appendix"
          ) {
            return null;
          }
          return normalizePageResult({ ...entry, categoryId });
        })
        .filter(Boolean);
    },
  );

  return chunkResults.flat();
}
