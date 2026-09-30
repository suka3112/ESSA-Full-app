import { writeFile } from "fs/promises";
import path from "path";
import splitPdf from "./splitPdf.js";

function toPosixRelativePath(...segments) {
  return path.posix.join(...segments);
}

/**
 * Split a PDF into section files on disk and write metadata.json for the upload folder.
 * @param {Buffer} pdfBuffer
 * @param {Array<{ documentIndex: number, categoryId: string, categoryLabel?: string, pages: number[], startPage?: number, endPage?: number }>} documentInstances
 * @param {{ folderName: string, folderPath: string, relativePath: string }} uploadFolder
 * @param {{ originalFileName?: string, totalPages?: number, uploadedAt?: string }} [meta]
 */
export async function splitPdfToDisk(pdfBuffer, documentInstances, uploadFolder, meta = {}) {
  console.log("[split] writing split PDFs to upload folder:", uploadFolder.folderPath);
  console.log("[split] original file:", meta.originalFileName ?? "(unknown)", "| sections:", documentInstances.length);

  const virtualPdfs = await splitPdf(pdfBuffer, documentInstances);

  const sections = await Promise.all(
    documentInstances.map(async (instance) => {
      const virtualPdf = virtualPdfs[instance.documentIndex];
      if (!virtualPdf) return null;

      const absolutePdfPath = path.join(uploadFolder.folderPath, virtualPdf.fileName);
      await writeFile(absolutePdfPath, virtualPdf.buffer);
      console.log(
        "[split] saved section PDF:",
        absolutePdfPath,
        `(${virtualPdf.pageCount} page(s), ${virtualPdf.buffer.length} bytes)`,
      );

      return {
        sectionIndex: instance.documentIndex + 1,
        documentName: instance.categoryId,
        categoryLabel: instance.categoryLabel || instance.categoryId,
        startPage: virtualPdf.startPage,
        endPage: virtualPdf.endPage,
        pageCount: virtualPdf.pageCount,
        pages: virtualPdf.pages,
        pdfPath: toPosixRelativePath(uploadFolder.relativePath, virtualPdf.fileName),
      };
    }),
  );

  const resolvedSections = sections.filter(Boolean);
  const metadata = {
    uploadId: uploadFolder.folderName,
    originalFileName: meta.originalFileName || null,
    uploadedAt: meta.uploadedAt || new Date().toISOString(),
    totalPages: meta.totalPages ?? null,
    sections: resolvedSections,
  };

  const metadataPath = path.join(uploadFolder.folderPath, "metadata.json");
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  console.log("[split] saved metadata:", metadataPath, "| sections written:", resolvedSections.length);

  return {
    virtualPdfs,
    metadata,
    metadataPath,
    sections: resolvedSections,
  };
}

export default splitPdfToDisk;
