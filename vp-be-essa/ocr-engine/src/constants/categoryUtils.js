/** Human-readable label from any AI-discovered category slug. */
export function resolveCategoryLabel(categoryId) {
  return String(categoryId || "unclassified")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function slugifyCategoryId(categoryId) {
  return (
    String(categoryId || "unclassified")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unclassified"
  );
}

/** File name for a split section PDF on disk (1-based section index). */
export function resolveSectionPdfName(sectionIndex, categoryId) {
  const index = Number(sectionIndex);
  const sectionNumber = Number.isFinite(index) ? index + 1 : 1;
  return `section_${sectionNumber}_${slugifyCategoryId(categoryId)}.pdf`;
}
