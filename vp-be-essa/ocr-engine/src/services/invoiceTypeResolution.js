/**
 * Resolve invoice type from PO series, then (when a series is shared) from
 * a lightweight content-classification pass. Runs before page classification.
 */

import { getPromptsConfig } from "../config/loadConfig.js";
import {
  catalogHasTypes,
  findInvoiceType,
  getNonPoInvoiceTypeId,
  isKnownInvoiceTypeId,
  normalizeInvoiceTypeId,
} from "../config/invoiceTypeCatalog.js";
import {
  createOpenAiClient,
  requireOpenAi,
  resolveModel,
} from "../config/openai.js";

const CONTENT_PAGES = 3;
const CONTENT_CHARS_PER_PAGE = 4000;
const MIN_PAGE_TEXT_CHARS = 40;

const LABELED_PO_RE =
  /(?:contract\s+order\s+no\.?\s*)?\bpo\s*(?:no\.?|number)?[:\s#-|]*\s*(\d{10,})\b/gi;

const FILENAME_TYPE_HINTS = [
  {
    invoiceTypeId: "MANPOWER_SERVICES",
    re: /\bmpo\b|\bmps\b|manpower|amanah|ale-pau|cleaning for production/i,
    signal: "filename_mpo_or_manpower",
  },
  {
    invoiceTypeId: "CIVIL_CONTRACTOR",
    re: /\bcivil\b|kontraktor|berca|bbs-bap|buana\s+sakti/i,
    signal: "filename_civil",
  },
  {
    invoiceTypeId: "MATERIAL_IMPORT",
    re: /material\s*import|packing\s*list|bill\s*of\s*lading/i,
    signal: "filename_materials",
  },
  {
    invoiceTypeId: "CAMP_SERVICE_AND_CATERING",
    re: /catering|camp\s*service/i,
    signal: "filename_catering",
  },
];

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function collectPageSlice(pageTexts, pageLimit = CONTENT_PAGES) {
  const nonEmpty = (pageTexts || [])
    .map((entry) => String(entry?.text || "").trim())
    .filter((text) => text.length >= MIN_PAGE_TEXT_CHARS);

  if (!nonEmpty.length) return [];

  const head = nonEmpty.slice(0, pageLimit);
  if (nonEmpty.length <= pageLimit) {
    return head.map((text) => text.slice(0, CONTENT_CHARS_PER_PAGE));
  }

  const tail = nonEmpty.slice(-Math.min(2, nonEmpty.length - head.length));
  return [...head, ...tail].map((text) => text.slice(0, CONTENT_CHARS_PER_PAGE));
}

function matchFilenameTypeHint(fileName, invoiceTypes) {
  const name = String(fileName || "");
  if (!name.trim()) return null;
  const allowed = new Set(
    (invoiceTypes || []).map((type) => type.invoiceTypeId).filter(Boolean),
  );
  const hits = FILENAME_TYPE_HINTS.filter(
    (hint) => hint.re.test(name) && allowed.has(hint.invoiceTypeId),
  );
  return hits.length === 1 ? hits[0] : null;
}

function joinSearchText(fileName, pageTexts) {
  const pages = (pageTexts || [])
    .map((entry) => String(entry?.text || ""))
    .join("\n");
  return `${fileName || ""}\n${pages}`;
}

/**
 * Pull PO numbers from filename + page text, optionally restricted to
 * configured series prefixes (not a hardcoded 4201/4202/4203 check).
 * @param {string} text
 * @param {string[]} prefixes
 * @returns {string[]}
 */
export function extractPoNumbersFromText(text, prefixes = []) {
  const source = String(text || "");
  const found = new Set();
  const prefixList = (prefixes || [])
    .map((prefix) => String(prefix || "").replace(/\D/g, ""))
    .filter(Boolean);

  const matchesConfiguredSeries = (digits) => {
    if (!prefixList.length) return false;
    return prefixList.some((series) => digits.startsWith(series) && digits.length >= series.length + 6);
  };

  for (const match of source.matchAll(LABELED_PO_RE)) {
    const digits = String(match[1] || "").replace(/\D/g, "");
    // Ticket / e-ticket numbers are often 10 digits next to "No". Only keep catalog series.
    if (matchesConfiguredSeries(digits)) found.add(digits);
  }

  for (const prefix of prefixList) {
    const bare = new RegExp(`\\b(${prefix}\\d{6,})\\b`, "g");
    for (const match of source.matchAll(bare)) {
      found.add(match[1]);
    }
  }

  return [...found];
}

function matchTypesByPoSeries(poNumbers, invoiceTypes) {
  /** @type {Array<{ type: object, poNumber: string, prefix: string }>} */
  const hits = [];

  for (const type of invoiceTypes) {
    for (const prefix of type.poSeries || []) {
      const poNumber = poNumbers.find((num) => num.startsWith(prefix));
      if (poNumber) {
        hits.push({ type, poNumber, prefix });
        break;
      }
    }
  }

  return hits;
}

function buildCandidateAppendix(candidates) {
  const lines = candidates.map((type) => {
    const signals = type.contentSignals
      ? type.contentSignals
      : "(no contentSignals configured — use the type name and typical document mix)";
    return `- ${type.invoiceTypeId} (${type.name})\n  Content signals: ${signals}`;
  });

  return [
    "",
    "CANDIDATE invoiceTypeId values (use exactly one of these):",
    candidates.map((type) => type.invoiceTypeId).join(", "),
    "",
    "Candidate types:",
    lines.join("\n"),
  ].join("\n");
}

function sanitizeCandidateScores(rawCandidates, allowedIds) {
  const allowed = new Set(allowedIds);
  /** @type {Array<{ invoiceTypeId: string, confidence: number }>} */
  const scores = [];

  for (const entry of rawCandidates || []) {
    const invoiceTypeId = normalizeInvoiceTypeId(
      entry?.invoiceTypeId || entry?.id || entry?.code,
    );
    if (!allowed.has(invoiceTypeId)) continue;
    const confidence = Math.min(1, Math.max(0, Number(entry?.confidence) || 0));
    scores.push({
      invoiceTypeId,
      confidence: Number(confidence.toFixed(2)),
    });
  }

  return scores;
}

function pickHighest(scores, fallbackId) {
  if (!scores.length) {
    return { invoiceTypeId: fallbackId, confidence: 0 };
  }
  return scores.reduce((best, entry) =>
    entry.confidence > best.confidence ? entry : best,
  );
}

async function classifyInvoiceTypeByContent({
  candidates,
  pageTexts,
  fileName,
  traceId,
}) {
  if (candidates.length === 1) {
    return {
      invoiceTypeId: candidates[0].invoiceTypeId,
      confidence: 1,
      signals: ["single_candidate"],
      candidateScores: [{ invoiceTypeId: candidates[0].invoiceTypeId, confidence: 1 }],
    };
  }

  const missingSignals = candidates.filter((type) => !type.contentSignals);
  if (missingSignals.length) {
    console.warn(
      `[extract][${traceId || "-"}] INVOICE_TYPE_EMPTY_CONTENT_SIGNALS`,
      { invoiceTypeIds: missingSignals.map((type) => type.invoiceTypeId) },
    );
  }

  requireOpenAi();
  const client = await createOpenAiClient();
  if (!client) {
    const fallback = candidates[0];
    console.warn(
      `[extract][${traceId || "-"}] INVOICE_TYPE_CONTENT_CLASSIFY_NO_CLIENT — falling back to ${fallback.invoiceTypeId}`,
    );
    return {
      invoiceTypeId: fallback.invoiceTypeId,
      confidence: 0,
      signals: ["openai_unavailable"],
      candidateScores: candidates.map((type, index) => ({
        invoiceTypeId: type.invoiceTypeId,
        confidence: index === 0 ? 0 : 0,
      })),
    };
  }

  const prompts = getPromptsConfig().invoiceTypeClassification;
  if (!prompts?.system || !prompts?.user) {
    throw new Error("Missing invoiceTypeClassification prompt in prompts.json");
  }

  const slice = collectPageSlice(pageTexts);
  const model = resolveModel("classification");
  const appendix = buildCandidateAppendix(candidates);

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: `${prompts.system}${appendix}` },
      {
        role: "user",
        content: [
          prompts.user,
          "",
          `Filename: ${fileName || "(none)"}`,
          `Page text (first ${slice.length} page(s)):`,
          slice.length ? slice.join("\n\n--- page break ---\n\n") : "(no extractable text)",
        ].join("\n"),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    const fallback = candidates[0];
    return {
      invoiceTypeId: fallback.invoiceTypeId,
      confidence: 0,
      signals: ["empty_model_response"],
      candidateScores: candidates.map((type) => ({
        invoiceTypeId: type.invoiceTypeId,
        confidence: 0,
      })),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.warn(
      `[extract][${traceId || "-"}] INVOICE_TYPE_CONTENT_CLASSIFY_PARSE_FAILED`,
      { message: error instanceof Error ? error.message : String(error) },
    );
    const fallback = candidates[0];
    return {
      invoiceTypeId: fallback.invoiceTypeId,
      confidence: 0,
      signals: ["invalid_model_json"],
      candidateScores: candidates.map((type) => ({
        invoiceTypeId: type.invoiceTypeId,
        confidence: 0,
      })),
    };
  }
  const allowedIds = candidates.map((type) => type.invoiceTypeId);
  let scores = sanitizeCandidateScores(parsed.candidates, allowedIds);

  const chosenId = normalizeInvoiceTypeId(parsed.invoiceTypeId);
  const chosenConfidence = Math.min(
    1,
    Math.max(0, Number(parsed.confidence) || 0),
  );
  if (allowedIds.includes(chosenId) && !scores.some((row) => row.invoiceTypeId === chosenId)) {
    scores = [{ invoiceTypeId: chosenId, confidence: Number(chosenConfidence.toFixed(2)) }, ...scores];
  }

  const picked = pickHighest(
    scores.length ? scores : [{ invoiceTypeId: chosenId, confidence: chosenConfidence }],
    candidates[0].invoiceTypeId,
  );
  const invoiceTypeId = allowedIds.includes(picked.invoiceTypeId)
    ? picked.invoiceTypeId
    : candidates[0].invoiceTypeId;

  const signals = Array.isArray(parsed.signals)
    ? parsed.signals.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return {
    invoiceTypeId,
    confidence: picked.confidence,
    signals: signals.length ? signals : ["content_classification"],
    candidateScores: allowedIds.map((id) => {
      const row = scores.find((entry) => entry.invoiceTypeId === id);
      return {
        invoiceTypeId: id,
        confidence: row?.confidence ?? (id === invoiceTypeId ? picked.confidence : 0),
      };
    }),
  };
}

function buildResult({
  invoiceTypeId,
  source,
  confidence,
  signals,
  poNumber = null,
  matchedSeries = [],
  candidates = [],
  candidateScores = [],
  lowConfidence = false,
  needsReview = false,
}) {
  return {
    invoiceTypeId: invoiceTypeId || null,
    source,
    confidence: Number((confidence ?? 0).toFixed(2)),
    signals: uniqueStrings(signals),
    poNumber,
    matchedSeries,
    candidates,
    candidateScores,
    lowConfidence,
    needsReview,
  };
}

/**
 * @param {{
 *   fileName?: string,
 *   pageTexts?: Array<{ pageNumber?: number, text?: string }>,
 *   catalog?: object,
 *   override?: string,
 *   traceId?: string,
 * }} input
 */
export async function resolveInvoiceType(input = {}) {
  const catalog = input.catalog;
  const override = normalizeInvoiceTypeId(input.override);
  const types = catalog?.invoiceTypes || [];
  const threshold = catalog?.confidenceThreshold ?? 0.7;
  const lowConfidenceAction = catalog?.lowConfidenceAction || "manual_review";

  const overrideType =
    override && override !== "AUTO" && override !== "PO"
      ? findInvoiceType(catalog, override) ||
        (isKnownInvoiceTypeId(override) ? { invoiceTypeId: override } : null)
      : null;
  if (overrideType) {
    return buildResult({
      invoiceTypeId: overrideType.invoiceTypeId,
      source: "manual_confirm",
      confidence: 1,
      signals: [`override:${overrideType.invoiceTypeId}`],
      candidates: [overrideType.invoiceTypeId],
    });
  }

  const skipPoNumberStep = override === "PO";
  if (skipPoNumberStep) {
    console.warn(
      `[extract][${input.traceId || "-"}] INVOICE_WORKFLOW_PO_DEPRECATED — ` +
        "legacy PO override skips PO-number matching and runs content disambiguation among PO types",
    );
  }

  if (!catalogHasTypes(catalog)) {
    console.warn(
      `[extract][${input.traceId || "-"}] INVOICE_TYPE_CATALOG_MISSING — ` +
        "cannot resolve invoice type; page classification will use the global catalog",
    );
    return buildResult({
      invoiceTypeId: null,
      source: "unresolved",
      confidence: 0,
      signals: ["catalog_missing"],
    });
  }

  const poTypes = types.filter((type) => type.poSeries.length > 0);
  const allPrefixes = uniqueStrings(poTypes.flatMap((type) => type.poSeries));
  const searchText = joinSearchText(input.fileName, input.pageTexts);
  const poNumbers = skipPoNumberStep
    ? []
    : extractPoNumbersFromText(searchText, allPrefixes);
  const matches = skipPoNumberStep
    ? []
    : matchTypesByPoSeries(poNumbers, poTypes);

  const uniqueMatchedTypes = [
    ...new Map(matches.map((hit) => [hit.type.invoiceTypeId, hit])).values(),
  ];

  if (!skipPoNumberStep && uniqueMatchedTypes.length === 1) {
    const hit = uniqueMatchedTypes[0];
    const filenameOverride = matchFilenameTypeHint(input.fileName, types);
    if (
      filenameOverride &&
      filenameOverride.invoiceTypeId !== hit.type.invoiceTypeId
    ) {
      return buildResult({
        invoiceTypeId: filenameOverride.invoiceTypeId,
        source: "po_series+filename",
        confidence: 0.95,
        signals: [
          filenameOverride.signal,
          `poSeries:${hit.prefix}`,
          `poNumber:${hit.poNumber}`,
        ],
        poNumber: hit.poNumber,
        matchedSeries: [hit.prefix],
        candidates: [hit.type.invoiceTypeId, filenameOverride.invoiceTypeId],
      });
    }
    return buildResult({
      invoiceTypeId: hit.type.invoiceTypeId,
      source: "po_series",
      confidence: 1,
      signals: [`poSeries:${hit.prefix}`, `poNumber:${hit.poNumber}`],
      poNumber: hit.poNumber,
      matchedSeries: [hit.prefix],
      candidates: [hit.type.invoiceTypeId],
    });
  }

  const seriesCandidates = uniqueMatchedTypes.map((hit) => hit.type);
  const filenameHint = matchFilenameTypeHint(
    input.fileName,
    seriesCandidates.length ? seriesCandidates : types,
  );
  if (filenameHint && uniqueMatchedTypes.length > 1) {
    const hit = uniqueMatchedTypes.find(
      (row) => row.type.invoiceTypeId === filenameHint.invoiceTypeId,
    );
    return buildResult({
      invoiceTypeId: filenameHint.invoiceTypeId,
      source: "po_series+filename",
      confidence: 0.95,
      signals: [
        filenameHint.signal,
        hit ? `poSeries:${hit.prefix}` : null,
        hit ? `poNumber:${hit.poNumber}` : null,
      ].filter(Boolean),
      poNumber: hit?.poNumber || poNumbers[0] || null,
      matchedSeries: uniqueStrings(uniqueMatchedTypes.map((row) => row.prefix)),
      candidates: seriesCandidates.map((type) => type.invoiceTypeId),
    });
  }
  if (filenameHint && uniqueMatchedTypes.length === 0 && !skipPoNumberStep) {
    return buildResult({
      invoiceTypeId: filenameHint.invoiceTypeId,
      source: "filename_hint",
      confidence: 0.9,
      signals: [filenameHint.signal, poNumbers.length ? null : "no_po_number_in_text"],
      poNumber: poNumbers[0] || null,
      candidates: [filenameHint.invoiceTypeId],
    });
  }

  const sparseContent = collectPageSlice(input.pageTexts).length === 0;
  if (uniqueMatchedTypes.length > 1 && sparseContent) {
    const civilHint =
      matchFilenameTypeHint(input.fileName, types) ||
      (/\bcivil\b|kontraktor|berca|buana\s+sakti|progress\s+claim|transmittal/i.test(
        searchText,
      )
        ? { invoiceTypeId: "CIVIL_CONTRACTOR", signal: "sparse_text_civil" }
        : null);
    if (civilHint) {
      const hit =
        uniqueMatchedTypes.find(
          (row) => row.type.invoiceTypeId === civilHint.invoiceTypeId,
        ) || uniqueMatchedTypes[0];
      return buildResult({
        invoiceTypeId: civilHint.invoiceTypeId,
        source: "po_series+sparse_civil",
        confidence: 0.9,
        signals: [
          civilHint.signal,
          hit ? `poSeries:${hit.prefix}` : null,
          hit ? `poNumber:${hit.poNumber}` : null,
        ].filter(Boolean),
        poNumber: hit?.poNumber || poNumbers[0] || null,
        matchedSeries: uniqueStrings(uniqueMatchedTypes.map((row) => row.prefix)),
        candidates: seriesCandidates.map((type) => type.invoiceTypeId),
      });
    }
    const manpower = uniqueMatchedTypes.find(
      (hit) => hit.type.invoiceTypeId === "MANPOWER_SERVICES",
    );
    if (manpower) {
      return buildResult({
        invoiceTypeId: manpower.type.invoiceTypeId,
        source: "po_series+sparse_default_manpower",
        confidence: 0.86,
        signals: [
          `poSeries:${manpower.prefix}`,
          `poNumber:${manpower.poNumber}`,
          "sparse_text_default_manpower",
        ],
        poNumber: manpower.poNumber,
        matchedSeries: uniqueStrings(uniqueMatchedTypes.map((row) => row.prefix)),
        candidates: seriesCandidates.map((type) => type.invoiceTypeId),
      });
    }
  }

  let contentCandidates;
  let poNumber = uniqueMatchedTypes[0]?.poNumber || poNumbers[0] || null;
  let matchedSeries = uniqueStrings(uniqueMatchedTypes.map((hit) => hit.prefix));
  let source = "content_classification";

  if (skipPoNumberStep) {
    contentCandidates = poTypes.length ? poTypes : types.filter((type) => type.invoiceTypeId !== "NON_PO");
  } else if (uniqueMatchedTypes.length > 1) {
    contentCandidates = uniqueMatchedTypes.map((hit) => hit.type);
  } else if (poNumbers.length > 0) {
    console.warn(
      `[extract][${input.traceId || "-"}] INVOICE_TYPE_PO_SERIES_UNMATCHED — ` +
        "labeled PO found but no configured series matched; content-classifying PO types",
      { poNumbers },
    );
    contentCandidates = poTypes.length ? poTypes : types;
    source = "content_classification";
  } else {
    const emptySeries = types.filter((type) => type.poSeries.length === 0);
    if (emptySeries.length <= 1) {
      const invoiceTypeId = getNonPoInvoiceTypeId(catalog);
      return buildResult({
        invoiceTypeId,
        source: "no_po_number",
        confidence: 1,
        signals: ["no_po_number"],
        candidates: [invoiceTypeId],
      });
    }

    console.warn(
      `[extract][${input.traceId || "-"}] INVOICE_TYPE_MULTIPLE_EMPTY_SERIES — ` +
        "content-classifying types with no poSeries",
      { invoiceTypeIds: emptySeries.map((type) => type.invoiceTypeId) },
    );
    contentCandidates = emptySeries;
  }

  if (!contentCandidates.length) {
    return buildResult({
      invoiceTypeId: getNonPoInvoiceTypeId(catalog),
      source: "no_po_number",
      confidence: 1,
      signals: ["no_content_candidates"],
    });
  }

  const classified = await classifyInvoiceTypeByContent({
    candidates: contentCandidates,
    pageTexts: input.pageTexts,
    fileName: input.fileName,
    traceId: input.traceId,
  });

  const belowThreshold = classified.confidence < threshold;
  if (belowThreshold && filenameHint) {
    return buildResult({
      invoiceTypeId: filenameHint.invoiceTypeId,
      source: `${source}+filename`,
      confidence: Math.max(classified.confidence, 0.85),
      signals: [...classified.signals, filenameHint.signal, "filename_override_low_confidence"],
      poNumber,
      matchedSeries,
      candidates: contentCandidates.map((type) => type.invoiceTypeId),
      candidateScores: classified.candidateScores,
      lowConfidence: false,
      needsReview: false,
    });
  }
  if (belowThreshold && !poNumber) {
    const invoiceTypeId = getNonPoInvoiceTypeId(catalog);
    return buildResult({
      invoiceTypeId,
      source: "no_po_number",
      confidence: 1,
      signals: [...classified.signals, "no_po_number", "low_confidence_non_po_fallback"],
      candidates: [invoiceTypeId, ...contentCandidates.map((type) => type.invoiceTypeId)],
      candidateScores: classified.candidateScores,
      lowConfidence: false,
      needsReview: false,
    });
  }
  if (belowThreshold && lowConfidenceAction === "manual_review") {
    console.warn(
      `[extract][${input.traceId || "-"}] INVOICE_TYPE_LOW_CONFIDENCE — ` +
        "continuing with best guess; no review UI is wired",
      {
        invoiceTypeId: classified.invoiceTypeId,
        confidence: classified.confidence,
        threshold,
      },
    );
    return buildResult({
      invoiceTypeId: classified.invoiceTypeId,
      source: `${source}+best_guess`,
      confidence: classified.confidence,
      signals: [...classified.signals, "low_confidence_best_guess"],
      poNumber,
      matchedSeries,
      candidates: contentCandidates.map((type) => type.invoiceTypeId),
      candidateScores: classified.candidateScores,
      lowConfidence: true,
      needsReview: false,
    });
  }

  return buildResult({
    invoiceTypeId: classified.invoiceTypeId,
    source,
    confidence: classified.confidence,
    signals: classified.signals,
    poNumber,
    matchedSeries,
    candidates: contentCandidates.map((type) => type.invoiceTypeId),
    candidateScores: classified.candidateScores,
    lowConfidence: belowThreshold,
    needsReview: false,
  });
}

export function logInvoiceTypeResolution(traceId, resolution, extra = {}) {
  const source = resolution?.source ?? null;
  const note =
    source === "manual_confirm"
      ? "Invoice type was forced by the email/SharePoint subject (not classified from PDF content)."
      : source === "unresolved"
        ? "Invoice type could not be resolved from the PDF."
        : "Invoice type resolved from document content / PO series.";
  console.info(
    `[extract][${traceId || "-"}] INVOICE_TYPE_RESOLVED ${resolution?.invoiceTypeId || "unknown"} ` +
      `via ${source || "unknown"}. ${note}`,
  );
  console.info(`[extract][${traceId || "-"}] INVOICE_TYPE_RESOLVED`, {
    invoiceTypeId: resolution?.invoiceTypeId ?? null,
    source,
    confidence: resolution?.confidence ?? null,
    lowConfidence: Boolean(resolution?.lowConfidence),
    needsReview: Boolean(resolution?.needsReview),
    poNumber: resolution?.poNumber ?? null,
    matchedSeries: resolution?.matchedSeries || [],
    candidates: resolution?.candidates || [],
    candidateScores: resolution?.candidateScores || [],
    signals: resolution?.signals || [],
    note,
    ...extra,
  });
}
