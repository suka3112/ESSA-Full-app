/**
 * @param {Array<{ pageNumber: number, text: string }>} pageTexts
 */
export function buildPageTextByPage(pageTexts) {
  return new Map(pageTexts.map(({ pageNumber, text }) => [pageNumber, text]));
}

function slicePageTexts(pageTextByPage, pages) {
  return pages.map((pageNumber) => ({
    pageNumber,
    text: pageTextByPage.get(pageNumber) ?? "",
  }));
}

/**
 * Attach pre-extracted page text to split virtual PDFs to avoid re-parsing PDFs.
 * @param {Record<number, object>} virtualPdfs
 * @param {Map<number, string>} pageTextByPage
 */
export function attachPageTextsToVirtualPdfs(virtualPdfs, pageTextByPage) {
  for (const virtualPdf of Object.values(virtualPdfs)) {
    virtualPdf.pageTexts = slicePageTexts(pageTextByPage, virtualPdf.pages);
  }

  return virtualPdfs;
}
