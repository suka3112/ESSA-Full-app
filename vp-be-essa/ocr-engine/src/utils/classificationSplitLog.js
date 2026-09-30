function prefix(traceId) {
  return `[extract][${traceId || "-"}]`;
}

function formatPageRange(pages = []) {
  if (!pages.length) return "";
  const sorted = [...pages].sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = sorted[i];
    prev = sorted[i];
  }
  parts.push(start === prev ? `${start}` : `${start}-${prev}`);
  return parts.join(",");
}

function methodCounts(pages = []) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const entry of pages) {
    const method = String(entry.classificationMethod || entry.method || "unknown");
    counts[method] = (counts[method] || 0) + 1;
  }
  return counts;
}

function compactPageMap(pages = []) {
  return pages
    .slice()
    .sort((a, b) => a.page - b.page)
    .map((entry) => {
      const type = entry.categoryId || entry.documentType || "unclassified";
      const conf =
        entry.confidence == null ? "?" : Number(entry.confidence).toFixed(2);
      const method = entry.classificationMethod || entry.method || "?";
      const start = entry.isDocumentStart ? "*" : "";
      return `p${entry.page}:${type}@${conf}${start}(${method})`;
    })
    .join(" ");
}

export function logPageTextStats(traceId, pageTexts = []) {
  const lengths = (pageTexts || []).map((entry) =>
    String(entry?.text || "").trim().length,
  );
  const nonempty = lengths.filter((len) => len >= 40).length;
  console.info(
    `${prefix(traceId)} PAGE_TEXT live OCR read ${lengths.length} page(s) ` +
      `(${nonempty} with text, ${lengths.length - nonempty} empty). This is extraction, not a skip.`,
  );
  console.info(`${prefix(traceId)} PAGE_TEXT`, {
    totalPages: lengths.length,
    nonemptyPages: nonempty,
    emptyPages: lengths.length - nonempty,
    sparseRatio: lengths.length
      ? Number((1 - nonempty / lengths.length).toFixed(3))
      : 0,
    nonemptyPageNumbers: (pageTexts || [])
      .filter((entry) => String(entry?.text || "").trim().length >= 40)
      .map((entry) => entry.pageNumber),
  });
}

export function logClassification(traceId, classification, extra = {}) {
  const pages = classification?.pages || [];
  const documents = classification?.documents || [];
  const splitSections = classification?.categoryGroups || [];
  const categories = Object.values(classification?.categories || {});

  console.info(`${prefix(traceId)} CLASSIFICATION_SUMMARY`, {
    invoiceTypeId: extra.invoiceTypeId || null,
    method: classification?.classificationMethod || extra.method || null,
    totalPages: classification?.totalPages ?? pages.length,
    allowedCategoryIds: extra.allowedCategoryIds || [],
    scatteredCategoryIds: extra.scatteredCategoryIds || [],
    categoryGroupMap: extra.categoryGroupMap || {},
    methodCounts: methodCounts(pages),
    categoryCounts: categories.map((row) => ({
      categoryId: row.categoryId,
      pageCount: row.pageCount,
    })),
    documentInstanceCount: documents.length,
    splitSectionCount: splitSections.length,
    unusedAllowedTypes: (extra.allowedCategoryIds || []).filter(
      (id) => !pages.some((page) => (page.categoryId || page.documentType) === id),
    ),
  });

  console.info(`${prefix(traceId)} CLASSIFICATION_PAGES ${compactPageMap(pages)}`);

  console.info(
    `${prefix(traceId)} CLASSIFICATION_DOCUMENTS`,
    documents.map((doc) => ({
      index: doc.documentIndex,
      categoryId: doc.categoryId,
      pages: formatPageRange(doc.pages),
      pageCount: doc.pageCount,
      startPage: doc.startPage,
      endPage: doc.endPage,
      confidence: doc.confidence,
    })),
  );

  const scattered = extra.scatteredCategoryIds;
  const scatteredSet = scattered instanceof Set ? scattered : new Set(scattered || []);

  console.info(
    `${prefix(traceId)} SPLIT_PLAN`,
    splitSections.map((section) => ({
      index: section.documentIndex,
      categoryId: section.categoryId,
      pages: formatPageRange(section.pages),
      pageCount: section.pageCount,
      scattered: scatteredSet.has(section.categoryId),
    })),
  );
}

export function logSplitResult(traceId, splitResult, extra = {}) {
  const sections = splitResult?.sections || [];
  console.info(`${prefix(traceId)} SPLIT_RESULT`, {
    uploadId: extra.uploadId || splitResult?.metadata?.uploadId || null,
    uploadPath: extra.uploadPath || null,
    sectionCount: sections.length,
    sections: sections.map((section) => ({
      index: section.sectionIndex,
      categoryId: section.documentName || section.categoryId,
      label: section.categoryLabel,
      pages: formatPageRange(section.pages),
      pageCount: section.pageCount,
      startPage: section.startPage,
      endPage: section.endPage,
      pdfPath: section.pdfPath,
    })),
  });
}

