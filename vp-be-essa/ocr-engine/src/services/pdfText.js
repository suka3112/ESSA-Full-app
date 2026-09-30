import "./pdfNodeEnv.js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { getLimits } from "../config/loadConfig.js";
import { mapWithConcurrency } from "../utils/concurrency.js";

async function extractSinglePageText(doc, pageNumber) {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return { pageNumber, text };
}

/**
 * Extract plain text from each page of a PDF buffer (parallel page reads).
 * @param {Buffer} pdfBuffer
 */
export async function extractPageTexts(pdfBuffer) {
  const limits = getLimits();
  const data = new Uint8Array(pdfBuffer);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const pageNumbers = Array.from({ length: doc.numPages }, (_, index) => index + 1);

  if (!pageNumbers.length) return [];

  const concurrency = limits.pageTextExtractionConcurrency ?? limits.pageRenderConcurrency;
  const pages = await mapWithConcurrency(pageNumbers, concurrency, (pageNumber) =>
    extractSinglePageText(doc, pageNumber),
  );

  return pages.sort((a, b) => a.pageNumber - b.pageNumber);
}

export async function getPageCount(pdfBuffer) {
  const data = new Uint8Array(pdfBuffer);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  return doc.numPages;
}
