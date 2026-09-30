/**
 * Base URL for links returned to the frontend (no trailing slash).
 * @param {{ protocol?: string, get?: (name: string) => string | undefined } | null | undefined} [req]
 */
export function resolvePublicBaseUrl(req) {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (req?.protocol && typeof req.get === "function") {
    const host = req.get("host");
    if (host) return `${req.protocol}://${host}`;
  }

  const port = process.env.PORT?.trim() || "3000";
  return `http://localhost:${port}`;
}

/**
 * Turn a repo-relative path (e.g. uploads/upload_20250618_1234/section_1.pdf)
 * into a browser-ready URL.
 * @param {string | null | undefined} relativePath
 * @param {string} baseUrl
 */
export function toPublicUrl(relativePath, baseUrl) {
  if (!relativePath || !baseUrl) return null;

  const normalized = String(relativePath).replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return null;

  return `${baseUrl.replace(/\/+$/, "")}/${normalized}`;
}

/**
 * Add pdfUrl / metadataUrl to split sections and extracted documents.
 * @param {object} data
 * @param {string} baseUrl
 */
export function enrichExtractResponseUrls(data, baseUrl) {
  if (!data || !baseUrl) return data;

  const split = data.split
    ? {
        ...data.split,
        metadataUrl: toPublicUrl(data.split.metadataPath, baseUrl),
        sections: (data.split.sections || []).map((section) => ({
          ...section,
          pdfUrl: toPublicUrl(section.pdfPath, baseUrl),
        })),
      }
    : data.split;

  const documents = (data.documents || []).map((document) => ({
    ...document,
    pdfUrl: toPublicUrl(document.pdfPath, baseUrl),
  }));

  return {
    ...data,
    split,
    documents,
    meta: data.meta
      ? {
          ...data.meta,
          publicBaseUrl: baseUrl,
        }
      : data.meta,
  };
}
