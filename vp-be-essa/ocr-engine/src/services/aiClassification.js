import { getClassificationPrompts, PER_PAGE_CLASSIFY_CONTEXT } from "../config/classificationPrompt.js";
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
import { getAllowedCategoryIdsForType } from "../config/invoiceTypeCatalog.js";
import { mapWithConcurrency } from "../utils/concurrency.js";

function normalizePageResult(entry, method = "ai") {
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
    classificationMethod: method,
  };
}

function buildPriorContext(classifiedPages, upToPage) {
  const recent = classifiedPages
    .filter((entry) => entry.page < upToPage)
    .sort((a, b) => b.page - a.page)
    .slice(0, 8)
    .reverse();

  if (!recent.length) return null;

  return recent
    .map(
      (entry) =>
        `page ${entry.page}: ${entry.categoryId} (${entry.categoryLabel}, confidence ${entry.confidence})`,
    )
    .join("; ");
}

function needsVisionFallback(textResult, minTextChars) {
  const textLen = textResult?.textLength ?? 0;
  const weak =
    !textResult ||
    textResult.categoryId === "unclassified" ||
    textResult.confidence < 0.35;

  return textLen < minTextChars || (textLen < minTextChars * 2 && weak);
}

function buildTextChunks(pageTexts, chunkSize) {
  const chunks = [];

  for (let offset = 0; offset < pageTexts.length; offset += chunkSize) {
    const chunk = pageTexts.slice(offset, offset + chunkSize);
    chunks.push({
      chunk,
      chunkStart: chunk[0]?.pageNumber,
      chunkEnd: chunk[chunk.length - 1]?.pageNumber,
    });
  }

  return chunks;
}

function buildChunkPayload(chunk, limits, minTextChars) {
  return chunk.map(({ pageNumber, text }) => {
    const trimmed = String(text || "").trim();
    return {
      page: pageNumber,
      text: trimmed.slice(0, limits.classificationPreviewChars),
      textLength: trimmed.length,
      hasEmbeddedText: trimmed.length >= minTextChars,
    };
  });
}

async function classifyTextChunk(
  client,
  chunkInfo,
  context,
  prompts,
  model,
  limits,
  minTextChars,
) {
  const { chunk, chunkStart, chunkEnd } = chunkInfo;
  const payload = buildChunkPayload(chunk, limits, minTextChars);

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompts.system },
      {
        role: "user",
        content: `${prompts.user}\n\n${context}\n\nPages:\n${JSON.stringify(payload)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content);
  const chunkPages = Array.isArray(parsed.pages) ? parsed.pages : [];
  return chunkPages
    .map((entry) => normalizePageResult(entry, "ai"))
    .filter((entry) => entry.page != null);
}

/**
 * @param {Array<{ pageNumber: number, text: string }>} pageTexts
 * @param {{ pdfBuffer?: Buffer, invoiceTypeId?: string, catalog?: object }} [options]
 */
export async function classifyPagesWithAI(pageTexts, options = {}) {
  requireOpenAi();

  const client = await createOpenAiClient();
  if (!client) return null;

  const model = resolveModel("classification");
  const limits = getLimits();
  const prompts = getClassificationPrompts(options.invoiceTypeId, options.catalog);
  const totalPages = pageTexts.length;
  const minTextChars = limits.minPageTextChars;
  const sparsePageCount = pageTexts.filter(
    ({ text }) => String(text || "").trim().length < minTextChars,
  ).length;
  const mostlyScanned =
    sparsePageCount / Math.max(pageTexts.length, 1) >=
    limits.scannedPdfTextRatioThreshold;

  /** @type {Array<{ page: number, categoryId: string, categoryLabel: string, confidence: number, classificationMethod: string }>} */
  const pages = [];

  if (!mostlyScanned) {
    const chunks = buildTextChunks(pageTexts, limits.classificationChunkSize);
    const parallelChunks =
      chunks.length > 1 && (limits.classificationParallelRequests ?? 0) > 0;

    if (parallelChunks) {
      const chunkResults = await mapWithConcurrency(
        chunks,
        limits.classificationParallelRequests,
        async (chunkInfo) => {
          const context = [
            `Total pages in PDF: ${totalPages}.`,
            `Classify pages ${chunkInfo.chunkStart}-${chunkInfo.chunkEnd} of ${totalPages}.`,
            PER_PAGE_CLASSIFY_CONTEXT,
            "Set isDocumentStart true only on the first page of each logical document instance.",
          ].join("\n");

          return classifyTextChunk(
            client,
            chunkInfo,
            context,
            prompts,
            model,
            limits,
            minTextChars,
          );
        },
      );

      for (const chunkPages of chunkResults) {
        pages.push(...chunkPages);
      }
    } else {
      for (const chunkInfo of chunks) {
        const priorContext = buildPriorContext(pages, chunkInfo.chunkStart);
        const context = [
          `Total pages in PDF: ${totalPages}.`,
          `Classify pages ${chunkInfo.chunkStart}-${chunkInfo.chunkEnd} of ${totalPages}.`,
          priorContext
            ? `Earlier-page types (reference only; do not copy unless this page is the same form): ${priorContext}.`
            : null,
          PER_PAGE_CLASSIFY_CONTEXT,
          "Set isDocumentStart true only on the first page of each logical document instance.",
        ]
          .filter(Boolean)
          .join("\n");

        const chunkPages = await classifyTextChunk(
          client,
          chunkInfo,
          context,
          prompts,
          model,
          limits,
          minTextChars,
        );
        pages.push(...chunkPages);
      }
    }
  }

  const textByPage = new Map(
    pageTexts.map(({ pageNumber, text }) => [
      pageNumber,
      String(text || "").trim().length,
    ]),
  );
  const aiByPage = new Map(pages.map((entry) => [entry.page, entry]));

  const visionCandidates = mostlyScanned
    ? pageTexts.map(({ pageNumber }) => pageNumber)
    : pageTexts
        .filter(({ pageNumber }) => {
          const textLen = textByPage.get(pageNumber) ?? 0;
          const ai = aiByPage.get(pageNumber);
          return needsVisionFallback(
            ai ? { ...ai, textLength: textLen } : { textLength: textLen },
            minTextChars,
          );
        })
        .map(({ pageNumber }) => pageNumber);

  if (visionCandidates.length > 0 && options.pdfBuffer) {
    const { renderPagesToBase64 } = await import("./pdfPageImage.js");
    const { classifyPagesWithVision } =
      await import("./aiVisionClassification.js");

    const pageImages = await renderPagesToBase64(
      options.pdfBuffer,
      visionCandidates,
      {
        scale: limits.pageRenderScale,
      },
    );

    const visionPages = await classifyPagesWithVision(pageImages, {
      totalPages,
      invoiceTypeId: options.invoiceTypeId,
      catalog: options.catalog,
    });

    const visionByPage = new Map(
      visionPages.map((entry) => [entry.page, entry]),
    );

    const missingPages = visionCandidates.filter((pageNumber) => !visionByPage.has(pageNumber));
    if (missingPages.length && missingPages.length < visionCandidates.length) {
      const retryImages = pageImages.filter((entry) =>
        missingPages.includes(entry.pageNumber),
      );
      const retryPages = await classifyPagesWithVision(retryImages, {
        totalPages,
        invoiceTypeId: options.invoiceTypeId,
        catalog: options.catalog,
      });
      for (const entry of retryPages) {
        visionByPage.set(entry.page, entry);
      }
    }

    for (let i = 0; i < pages.length; i += 1) {
      const vision = visionByPage.get(pages[i].page);
      if (vision) {
        pages[i] = vision;
      }
    }

    for (const vision of visionByPage.values()) {
      if (!aiByPage.has(vision.page)) {
        pages.push(vision);
      }
    }
  }

  const allowedIds = new Set(
    getAllowedCategoryIdsForType(options.catalog, options.invoiceTypeId),
  );
  const poTimesheetDisambiguation =
    allowedIds.has("purchase_order") && allowedIds.has("daily_timesheet");
  const poPages = poTimesheetDisambiguation
    ? pages.filter((entry) => entry.categoryId === "purchase_order")
    : [];
  if (poPages.length > 0 && options.pdfBuffer) {
    const { renderPagesToBase64 } = await import("./pdfPageImage.js");
    const { disambiguatePoVsTimesheetPages } =
      await import("./aiVisionClassification.js");

    const poPageNumbers = poPages.map((entry) => entry.page);
    const poImages = await renderPagesToBase64(
      options.pdfBuffer,
      poPageNumbers,
      { scale: limits.pageRenderScale },
    );

    const corrected = await disambiguatePoVsTimesheetPages(poImages);
    const correctedByPage = new Map(
      corrected.map((entry) => [entry.page, entry]),
    );

    for (let i = 0; i < pages.length; i += 1) {
      const fix = correctedByPage.get(pages[i].page);
      if (!fix) continue;

      if (fix.categoryId === "daily_timesheet") {
        pages[i] = {
          ...pages[i],
          ...fix,
          classificationMethod: pages[i].classificationMethod
            ? `${pages[i].classificationMethod}+heading-fix`
            : "heading-fix",
        };
        continue;
      }

      if (fix.categoryId === "purchase_order") {
        pages[i] = {
          ...pages[i],
          ...fix,
          poHeadingConfirmed: true,
          classificationMethod: pages[i].classificationMethod
            ? `${pages[i].classificationMethod}+heading-fix`
            : "heading-fix",
        };
      }
    }
  }

  pages.sort((a, b) => a.page - b.page);

  const previewByPage = new Map(
    pageTexts.map(({ pageNumber, text }) => [pageNumber, text || ""]),
  );
  const pagesWithPreview = pages.map((entry) => ({
    ...entry,
    preview: previewByPage.get(entry.page) || "",
  }));

  const { refinePageClassifications } =
    await import("./classificationRefinement.js");
  let refined = refinePageClassifications(pagesWithPreview, {
    allowedCategoryIds: [...allowedIds],
  });

  const poMissing =
    allowedIds.has("purchase_order") &&
    !refined.some((entry) => entry.categoryId === "purchase_order");
  if (poMissing && options.pdfBuffer) {
    refined = await recoverMissedPurchaseOrderFromTail(refined, {
      pdfBuffer: options.pdfBuffer,
      totalPages,
      limits,
    });
    refined = refinePageClassifications(refined, {
      allowedCategoryIds: [...allowedIds],
    });
  }

  return refined;
}

async function recoverMissedPurchaseOrderFromTail(
  pages,
  { pdfBuffer, totalPages, limits },
) {
  const TAIL_PAGES = 12;
  const skip = new Set([
    "notice",
    "invoice",
    "faktur_pajak",
    "berita_acara",
    "summary_calculation_manhour",
  ]);
  const lastPage = pages[pages.length - 1]?.page || totalPages;
  const candidates = pages
    .filter(
      (entry) =>
        entry.page >= Math.max(1, lastPage - TAIL_PAGES + 1) &&
        !skip.has(entry.categoryId),
    )
    .map((entry) => entry.page);
  if (!candidates.length) return pages;

  const { renderPagesToBase64 } = await import("./pdfPageImage.js");
  const { recoverTailPurchaseOrderPages } =
    await import("./aiVisionClassification.js");

  const images = await renderPagesToBase64(pdfBuffer, candidates, {
    scale: limits.pageRenderScale,
  });
  const recovered = await recoverTailPurchaseOrderPages(images);
  if (!recovered.length) return pages;

  const recoveredByPage = new Map(recovered.map((entry) => [entry.page, entry]));
  return pages.map((entry) => {
    const fix = recoveredByPage.get(entry.page);
    if (
      !fix ||
      (fix.categoryId !== "purchase_order" &&
        fix.categoryId !== "purchase_order_appendix")
    ) {
      return entry;
    }
    return {
      ...entry,
      ...fix,
      poHeadingConfirmed: fix.categoryId === "purchase_order",
      classificationMethod: entry.classificationMethod
        ? `${entry.classificationMethod}+po-tail-recover`
        : "po-tail-recover",
    };
  });
}
