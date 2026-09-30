import { classifyPagesWithAI } from "./aiClassification.js";
import { requireOpenAi } from "../config/openai.js";
import { getLimits } from "../config/loadConfig.js";
import { resolveCategoryGroupsWithAI } from "./categoryGroupResolution.js";
import { resolveCategoryLabel } from "../constants/categoryUtils.js";
import {
  annotatePagesWithDocumentIndex,
  assembleDocumentInstances,
  assembleSplitSections,
} from "./documentBoundaryAssembly.js";
import { buildPageTextByPage } from "../utils/pageTextCache.js";
import { getScatteredCategoryIds, getAllowedCategoryIdsForType } from "../config/invoiceTypeCatalog.js";

function buildCategorySummary(splitSections) {
  /** @type {Record<string, { categoryId: string, categoryLabel: string, pageCount: number }>} */
  const categories = {};

  for (const group of splitSections) {
    const existing = categories[group.categoryId];
    if (existing) {
      existing.pageCount += group.pageCount;
      continue;
    }

    categories[group.categoryId] = {
      categoryId: group.categoryId,
      categoryLabel: group.categoryLabel,
      pageCount: group.pageCount,
    };
  }

  return categories;
}

function ensureFirstPageStartsDocument(pages) {
  if (!pages.length) return pages;

  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const firstPage = sorted[0].page;

  return pages.map((entry) =>
    entry.page === firstPage ? { ...entry, isDocumentStart: true } : entry,
  );
}

function inferCategoryFromFileName(fileName) {
  const name = String(fileName || "").toLowerCase();
  if (!name) return null;
  if (/berita\s*acara|work\s*progress\s*certificate/.test(name)) {
    return "berita_acara";
  }
  if (/faktur\s*pajak|e-?faktur|\btax\s*invoice\b/.test(name)) {
    return "faktur_pajak";
  }
  return null;
}

function filenameNegatesHint(fileName, hint) {
  const name = String(fileName || "").toLowerCase();
  if (!name) return false;
  const typePattern =
    hint === "faktur_pajak"
      ? "(?:tax\\s*invoice|faktur\\s*pajak|e-?faktur)"
      : hint === "berita_acara"
        ? "(?:berita\\s*acara|work\\s*progress\\s*certificate|\\bbap\\b)"
        : null;
  if (!typePattern) return false;
  return new RegExp(
    `(?:without|w\\s*/\\s*o|missing|no|except|exclude|minus|not\\s+including)\\s+(?:a\\s+|the\\s+|any\\s+)?${typePattern}|${typePattern}\\s+(?:is\\s+|are\\s+)?(?:missing|absent|not\\s+included|removed)`,
    "i",
  ).test(name);
}

function preferredHintAllowed(hint, preferredCategoryIds) {
  if (!hint) return false;
  const preferred = (preferredCategoryIds || [])
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_"),
    )
    .filter(Boolean);
  if (!preferred.length) return true;
  return preferred.some((token) => {
    if (token === hint) return true;
    if (hint === "faktur_pajak" && (token.includes("faktur") || token.includes("tax_invoice"))) {
      return true;
    }
    if (hint === "berita_acara" && (token.includes("berita") || token.includes("work_progress"))) {
      return true;
    }
    return false;
  });
}

/**
 * Filename may identify a standalone supporting PDF (1–2 pages).
 * Never stamp a mixed manpower bundle, and never invent a type the pages
 * did not classify as — that inverts completeness for "missing tax invoice"
 * / "missing berita acara" test files whose names mention those types.
 */
function applyFilenameClassificationHint(pages, options = {}) {
  const hint = inferCategoryFromFileName(options.fileName);
  if (!hint || !preferredHintAllowed(hint, options.preferredCategoryIds)) {
    return pages;
  }
  if (filenameNegatesHint(options.fileName, hint)) {
    console.info("[classify] FILENAME_HINT_SKIP_ABSENT", {
      fileName: options.fileName,
      hint,
    });
    return pages;
  }
  if (pages.some((page) => page.categoryId === hint)) return pages;

  const distinct = new Set(
    pages
      .map((page) => page.categoryId)
      .filter((id) => id && id !== "unclassified"),
  );
  const weakPages = pages.filter(
    (page) =>
      page.categoryId === "unclassified" || Number(page.confidence) < 0.35,
  );
  const standaloneUnclassified =
    pages.length <= 2 &&
    distinct.size <= 1 &&
    weakPages.length === pages.length;

  if (!standaloneUnclassified) {
    console.info("[classify] FILENAME_HINT_SKIP_MIXED_BUNDLE", {
      fileName: options.fileName,
      hint,
      pages: pages.length,
      previous: [...distinct],
    });
    return pages;
  }

  console.info("[classify] FILENAME_HINT_UNCLASSIFIED", {
    fileName: options.fileName,
    hint,
  });

  const label = resolveCategoryLabel(hint);
  return pages.map((page, index) => ({
    ...page,
    documentType: hint,
    categoryId: hint,
    categoryLabel: label,
    classificationMethod: "filename_hint",
    isDocumentStart: index === 0 ? true : page.isDocumentStart,
  }));
}

/**
 * Classify each page of a PDF using OpenAI (text + vision fallback for scanned pages).
 * Invoice type must already be resolved — the per-page catalog is scoped to that type.
 *
 * @param {Buffer} pdfBuffer
 * @param {{
 *   invoiceTypeId?: string | null,
 *   catalog?: object,
 *   pageTexts?: Array<{ pageNumber: number, text: string }>,
 *   fileName?: string,
 *   preferredCategoryIds?: string[],
 * }} [options]
 */
export async function classifyPdf(pdfBuffer, options = {}) {
  requireOpenAi();

  const pageTexts =
    options.pageTexts ||
    (await (await import("./pdfText.js")).extractPageTexts(pdfBuffer));
  const limits = getLimits();
  const invoiceTypeId = options.invoiceTypeId || null;
  const catalog = options.catalog || null;
  const allowedCategoryIds = getAllowedCategoryIdsForType(catalog, invoiceTypeId);

  const aiPages = await classifyPagesWithAI(pageTexts, {
    pdfBuffer,
    invoiceTypeId,
    catalog,
  });
  if (!aiPages?.length) {
    throw new Error("AI classification returned no page results.");
  }

  const aiByPage = new Map(aiPages.map((entry) => [entry.page, entry]));

  let pages = pageTexts.map(({ pageNumber, text }) => {
    const ai = aiByPage.get(pageNumber);
    const documentType = ai?.categoryId || "unclassified";
    const categoryLabel = ai?.categoryLabel || resolveCategoryLabel(documentType);
    const method = ai?.classificationMethod || "ai";

    return {
      page: pageNumber,
      documentType,
      categoryId: documentType,
      categoryLabel,
      confidence: ai?.confidence ?? 0.2,
      isDocumentStart: ai?.isDocumentStart === true,
      preview: text.slice(0, limits.classificationPagePreviewChars),
      classificationMethod: method,
    };
  });

  pages = applyFilenameClassificationHint(pages, options);
  pages = ensureFirstPageStartsDocument(pages);

  const pageEntries = pages.map((entry) => ({
    page: entry.page,
    categoryId: entry.categoryId,
    categoryLabel: entry.categoryLabel,
    confidence: entry.confidence,
    isDocumentStart: entry.isDocumentStart,
    classificationMethod: entry.classificationMethod,
  }));

  const documents = assembleDocumentInstances(pageEntries);
  const categoryGroupMap = await resolveCategoryGroupsWithAI(
    pageEntries.map((entry) => entry.categoryId),
    { invoiceTypeId, catalog },
  );
  const scatteredCategoryIds = getScatteredCategoryIds(catalog, invoiceTypeId);
  const categoryGroups = assembleSplitSections(
    pageEntries,
    categoryGroupMap,
    scatteredCategoryIds,
  );

  pages = annotatePagesWithDocumentIndex(pages, documents);

  const usedVision = pages.some((entry) =>
    String(entry.classificationMethod || "").includes("vision"),
  );
  const categories = buildCategorySummary(categoryGroups);

  return {
    totalPages: pages.length,
    pages,
    documents,
    categoryGroups,
    categories,
    classificationMethod: usedVision ? "ai+vision" : "ai",
    pageTextByPage: buildPageTextByPage(pageTexts),
    allowedCategoryIds,
    scatteredCategoryIds: [...scatteredCategoryIds],
    categoryGroupMap,
  };
}

export default classifyPdf;
