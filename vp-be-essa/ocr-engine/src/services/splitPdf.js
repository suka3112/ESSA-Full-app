import { PDFDocument } from "pdf-lib";
import { resolveSectionPdfName } from "../constants/categoryUtils.js";

async function buildSectionPdf(sourceDoc, totalPages, instance) {
  const validPages = [...new Set(instance.pages)]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  if (validPages.length === 0) return null;

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(
    sourceDoc,
    validPages.map((page) => page - 1),
  );
  copiedPages.forEach((page) => newDoc.addPage(page));

  const bytes = await newDoc.save();
  const documentIndex = instance.documentIndex;
  const categoryId = instance.categoryId;
  const categoryLabel = instance.categoryLabel || categoryId;

  return {
    buffer: Buffer.from(bytes),
    pages: validPages,
    fileName: resolveSectionPdfName(documentIndex, categoryId),
    pageCount: validPages.length,
    documentIndex,
    categoryId,
    categoryLabel,
    startPage: instance.startPage ?? validPages[0],
    endPage: instance.endPage ?? validPages[validPages.length - 1],
  };
}

/**
 * Split a PDF in memory into virtual PDFs — one per detected document section.
 * @param {Buffer} pdfBuffer
 * @param {Array<{ documentIndex: number, categoryId: string, categoryLabel?: string, pages: number[], startPage?: number, endPage?: number }>} documentInstances
 */
export async function splitPdf(pdfBuffer, documentInstances) {
  const sourceDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = sourceDoc.getPageCount();

  const sections = await Promise.all(
    documentInstances.map((instance) => buildSectionPdf(sourceDoc, totalPages, instance)),
  );

  /** @type {Record<number, object>} */
  const virtualPdfs = {};
  for (const section of sections) {
    if (section) {
      virtualPdfs[section.documentIndex] = section;
    }
  }

  return virtualPdfs;
}

export default splitPdf;
