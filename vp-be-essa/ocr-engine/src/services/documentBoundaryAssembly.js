import { resolveCategoryLabel } from "../constants/categoryUtils.js";
import { DEFAULT_SCATTERED_CATEGORY_IDS } from "../config/invoiceTypeCatalog.js";

function resolveScatteredSet(scatteredCategoryIds) {
  if (scatteredCategoryIds instanceof Set) return scatteredCategoryIds;
  if (Array.isArray(scatteredCategoryIds)) return new Set(scatteredCategoryIds);
  return new Set(DEFAULT_SCATTERED_CATEGORY_IDS);
}

function averageConfidence(values) {
  if (!values.length) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Number((sum / values.length).toFixed(2));
}

function finalizeDocument(doc) {
  const pages = doc.pages;
  return {
    documentIndex: doc.documentIndex,
    categoryId: doc.categoryId,
    categoryLabel: doc.categoryLabel,
    pages,
    startPage: pages[0],
    endPage: pages[pages.length - 1],
    pageCount: pages.length,
    confidence: averageConfidence(doc.confidences),
    methods: [...doc.methods],
  };
}

/**
 * Group per-page classifications into document instances using category and boundary signals.
 * @param {Array<{ page: number, categoryId: string, categoryLabel: string, confidence: number, isDocumentStart?: boolean, classificationMethod?: string }>} pages
 */
export function assembleDocumentInstances(pages) {
  if (!pages?.length) return [];

  const sorted = [...pages].sort((a, b) => a.page - b.page);
  /** @type {Array<ReturnType<typeof finalizeDocument>>} */
  const documents = [];
  let current = null;

  for (const entry of sorted) {
    const startsNew =
      current == null ||
      entry.isDocumentStart === true ||
      entry.categoryId !== current.categoryId;

    if (startsNew) {
      if (current) {
        documents.push(finalizeDocument(current));
      }

      current = {
        documentIndex: documents.length,
        categoryId: entry.categoryId,
        categoryLabel: entry.categoryLabel,
        pages: [entry.page],
        confidences: [entry.confidence],
        methods: new Set([entry.classificationMethod || "ai"]),
      };
      continue;
    }

    current.pages.push(entry.page);
    current.confidences.push(entry.confidence);
    current.methods.add(entry.classificationMethod || "ai");
  }

  if (current) {
    documents.push(finalizeDocument(current));
  }

  return documents;
}

/**
 * Attach documentIndex to each page from assembled document instances.
 * @param {Array<object>} pages
 * @param {Array<{ documentIndex: number, pages: number[] }>} documents
 */
export function annotatePagesWithDocumentIndex(pages, documents) {
  const pageToDocument = new Map();
  for (const doc of documents) {
    for (const page of doc.pages) {
      pageToDocument.set(page, doc.documentIndex);
    }
  }

  return pages.map((entry) => ({
    ...entry,
    documentIndex: pageToDocument.get(entry.page) ?? null,
  }));
}

function buildCategoryGroupLookup(categoryGroups) {
  const lookup = new Map();
  for (const [groupId, members] of Object.entries(categoryGroups || {})) {
    if (!Array.isArray(members)) continue;
    for (const member of members) {
      lookup.set(member, groupId);
    }
  }
  return lookup;
}

/**
 * Merge all pages of the same category into one split/extraction group.
 * Optional categoryGroups maps related categoryIds to a shared output category.
 * @param {Array<{ page: number, categoryId: string, categoryLabel: string, confidence: number, classificationMethod?: string }>} pages
 * @param {Record<string, string[]>} [categoryGroups]
 */
export function assembleCategoryGroups(pages, categoryGroups = {}) {
  if (!pages?.length) return [];

  const lookup = buildCategoryGroupLookup(categoryGroups);
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  /** @type {Map<string, { documentIndex: number, categoryId: string, categoryLabel: string, pages: number[], confidences: number[], methods: Set<string> }>} */
  const groups = new Map();
  /** @type {string[]} */
  const order = [];

  for (const entry of sorted) {
    const categoryId = lookup.get(entry.categoryId) || entry.categoryId;
    let group = groups.get(categoryId);

    if (!group) {
      group = {
        documentIndex: order.length,
        categoryId,
        categoryLabel: resolveCategoryLabel(categoryId),
        pages: [],
        confidences: [],
        methods: new Set(),
      };
      groups.set(categoryId, group);
      order.push(categoryId);
    }

    group.pages.push(entry.page);
    group.confidences.push(entry.confidence);
    group.methods.add(entry.classificationMethod || "ai");
  }

  return order.map((categoryId, index) =>
    finalizeDocument({ ...groups.get(categoryId), documentIndex: index }),
  );
}

/**
 * Build split/extraction sections from per-page classifications.
 * Scattered categories merge across page gaps and across interleaved types
 * (all timesheet pages become one PDF, even when attendance sits between them).
 * Contiguous types split on page gaps so a mislabeled page cannot glue
 * distant documents into one PDF.
 * @param {Array<{ page: number, categoryId: string, categoryLabel: string, confidence: number, classificationMethod?: string }>} pages
 * @param {Record<string, string[]>} [categoryGroups]
 * @param {Set<string> | string[]} [scatteredCategoryIds]
 */
export function assembleSplitSections(
  pages,
  categoryGroups = {},
  scatteredCategoryIds,
) {
  if (!pages?.length) return [];

  const scatteredSet = resolveScatteredSet(scatteredCategoryIds);
  const lookup = buildCategoryGroupLookup(categoryGroups);
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  /** @type {Array<ReturnType<typeof finalizeDocument>>} */
  const sections = [];
  /** @type {{ categoryId: string, categoryLabel: string, pages: number[], confidences: number[], methods: Set<string>, lastPage: number } | null} */
  let current = null;

  for (const entry of sorted) {
    const categoryId = lookup.get(entry.categoryId) || entry.categoryId;
    const scatterMerge = scatteredSet.has(categoryId);
    const continues =
      current != null &&
      current.categoryId === categoryId &&
      (scatterMerge || entry.page === current.lastPage + 1);

    if (!continues) {
      if (current) {
        sections.push(
          finalizeDocument({
            documentIndex: sections.length,
            categoryId: current.categoryId,
            categoryLabel: current.categoryLabel,
            pages: current.pages,
            confidences: current.confidences,
            methods: current.methods,
          }),
        );
      }

      current = {
        categoryId,
        categoryLabel: resolveCategoryLabel(categoryId),
        pages: [entry.page],
        confidences: [entry.confidence],
        methods: new Set([entry.classificationMethod || "ai"]),
        lastPage: entry.page,
      };
      continue;
    }

    current.pages.push(entry.page);
    current.confidences.push(entry.confidence);
    current.methods.add(entry.classificationMethod || "ai");
    current.lastPage = entry.page;
  }

  if (current) {
    sections.push(
      finalizeDocument({
        documentIndex: sections.length,
        categoryId: current.categoryId,
        categoryLabel: current.categoryLabel,
        pages: current.pages,
        confidences: current.confidences,
        methods: current.methods,
      }),
    );
  }

  return coalesceScatteredSections(sections, scatteredSet);
}

/**
 * Scattered types (timesheets, attendance, manhour, PO appendix) belong in
 * one PDF even when another document type is interleaved between pages.
 */
function coalesceScatteredSections(sections, scatteredSet) {
  if (!sections.length) return sections;

  const result = [];
  const indexByCategory = new Map();

  for (const section of sections) {
    if (!scatteredSet.has(section.categoryId)) {
      result.push(section);
      continue;
    }

    const existingIndex = indexByCategory.get(section.categoryId);
    if (existingIndex == null) {
      indexByCategory.set(section.categoryId, result.length);
      result.push({
        ...section,
        pages: [...section.pages],
        methods: [...(section.methods || [])],
      });
      continue;
    }

    const existing = result[existingIndex];
    const pages = [...existing.pages, ...section.pages].sort((a, b) => a - b);
    const totalPages = (existing.pageCount || 0) + (section.pageCount || 0);
    const confidence = Number(
      (
        ((existing.confidence || 0) * (existing.pageCount || 0) +
          (section.confidence || 0) * (section.pageCount || 0)) /
        Math.max(totalPages, 1)
      ).toFixed(2),
    );

    result[existingIndex] = {
      ...existing,
      pages,
      startPage: pages[0],
      endPage: pages[pages.length - 1],
      pageCount: pages.length,
      confidence,
      methods: [
        ...new Set([...(existing.methods || []), ...(section.methods || [])]),
      ],
    };
  }

  return result.map((section, index) => ({
    ...section,
    documentIndex: index,
  }));
}

