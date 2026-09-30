import "./pdfNodeEnv.js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { getLimits } from "../config/loadConfig.js";
import { mapWithConcurrency } from "../utils/concurrency.js";

async function renderSinglePage(doc, pageNumber, scale) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return {
    pageNumber,
    imageBase64: canvas.toBuffer("image/png").toString("base64"),
  };
}

/**
 * Render selected PDF pages to PNG base64 strings for vision classification.
 * @param {Buffer} pdfBuffer
 * @param {number[]} pageNumbers - 1-based page numbers
 * @param {{ scale?: number, concurrency?: number }} [options]
 */
export async function renderPagesToBase64(pdfBuffer, pageNumbers, options = {}) {
  const limits = getLimits();
  const scale = options.scale ?? limits.pageRenderScale;
  const concurrency = options.concurrency ?? limits.pageRenderConcurrency;
  const data = new Uint8Array(pdfBuffer);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  const uniquePages = [...new Set(pageNumbers)]
    .filter((page) => page >= 1 && page <= doc.numPages)
    .sort((a, b) => a - b);

  if (!uniquePages.length) return [];

  const results = await mapWithConcurrency(uniquePages, concurrency, (pageNumber) =>
    renderSinglePage(doc, pageNumber, scale),
  );

  return results.sort((a, b) => a.pageNumber - b.pageNumber);
}
