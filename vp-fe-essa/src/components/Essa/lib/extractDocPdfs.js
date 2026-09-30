/** Resolve the PDF source for an Extract & Validate document tab. */
export function resolveExtractDocPdfUrl(inv, tabKey) {
  if (!tabKey) return null

  const fromApi = inv?.extract_doc_pdfs?.[tabKey]
  if (fromApi) return fromApi

  if (tabKey === 'A_nonPoTravel') {
    return inv?.extract_doc_pdfs?.A_invoice ?? null
  }

  if (tabKey === 'H_po') {
    return inv?.extract_doc_pdfs?.I_poAppendix ?? null
  }

  return null
}

/** Default PDF when opening OCR preview before a document tab is selected. */
export function resolveDefaultExtractPdfSrc(inv, { uploadedFile } = {}) {
  const fromApi =
    inv?.extract_doc_pdfs?.A_invoice ||
    inv?.extract_doc_pdfs?.A_nonPoTravel ||
    Object.values(inv?.extract_doc_pdfs || {})[0]

  if (fromApi) return fromApi
  if (uploadedFile instanceof Blob) return uploadedFile
  return null
}
