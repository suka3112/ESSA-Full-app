/**
 * Resolve invoice type before page classification.
 * A unique PO series locks the type. A shared series (4203) is classified from
 * keywords on the PO appendix pages. No match goes to manual review.
 * Email/subject overrides still win when invoiceWorkflow is a known type id.
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
  /(?:contract\s+order\s+no\.?\s*)?(?<![A-Za-z0-9])po\s*(?:no\.?|number)?[:\s#.|-]*\s*(\d{10,})(?!\d)/gi;

/** PO printed as the document header ("PO Number" / "PO No."), not a mention inside a line. */
const HEADER_PO_RE =
  /(?<![A-Za-z0-9])po\s*(?:no\.?|number)\b[:\s#.|-]*\s*(\d{10,})(?!\d)/gi;

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
    const bare = new RegExp(`\\b(${prefix}\\d{6,})(?!\\d)`, "g");
    for (const match of source.matchAll(bare)) {
      found.add(match[1]);
    }
  }

  return [...found];
}

/**
 * Price-breakdown appendix pages, including table pages that follow the heading
 * until another document (SES, invoice, faktur, berita acara) starts.
 * Terms-and-conditions pages are not used for category keywords.
 * @param {Array<{ pageNumber?: number, text?: string }>} pageTexts
 * @returns {string[]}
 */
export function collectPoAppendixTexts(pageTexts) {
  const pages = (pageTexts || [])
    .map((entry) => String(entry?.text || ""))
    .filter((text) => text.trim().length >= MIN_PAGE_TEXT_CHARS);

  const isAppendix = (text) =>
    /appendix\s*[-–]?\s*\d/i.test(text) ||
    /price\s*breakdown\s+and\s+description\s+of\s+purchase\s+order/i.test(text);

  const isOtherDocument = (text) => {
    const head = text.slice(0, 400);
    return (
      /\bservice\s+entry\b/i.test(head) ||
      /\bses\s*no\b/i.test(head) ||
      /\bfaktur\s+pajak\b/i.test(head) ||
      /\bberita\s+acara\b/i.test(head) ||
      /\bkwitansi\b/i.test(head) ||
      /general\s+terms\s*(&|and)\s*conditions/i.test(head) ||
      /specific\s*\/\s*special\s+terms/i.test(head)
    );
  };

  const texts = [];
  let inAppendix = false;
  for (const text of pages) {
    if (isAppendix(text)) {
      inAppendix = true;
      texts.push(text);
      continue;
    }
    if (!inAppendix) continue;
    if (isOtherDocument(text)) {
      inAppendix = false;
      continue;
    }
    texts.push(text);
  }
  return texts;
}

/**
 * PO numbers next to a "PO Number" or "PO No." label, restricted to catalog series.
 * A line that only says "PO 4203…" is not a header.
 * @param {string} text
 * @param {string[]} prefixes
 * @returns {string[]}
 */
export function extractHeaderPoNumbers(text, prefixes = []) {
  const source = String(text || "");
  const found = new Set();
  const prefixList = (prefixes || [])
    .map((prefix) => String(prefix || "").replace(/\D/g, ""))
    .filter(Boolean);
  const header = new RegExp(HEADER_PO_RE.source, "gi");
  for (const match of source.matchAll(header)) {
    const digits = String(match[1] || "").replace(/\D/g, "").slice(0, 10);
    if (digits.length < 10) continue;
    if (prefixList.some((series) => digits.startsWith(series))) found.add(digits.slice(0, 10));
  }
  return [...found];
}

/**
 * 10-digit PO numbers printed next to a PO label, including prefixes that are
 * not in the catalog. Series matching uses extractPoNumbersFromText.
 * @param {string} text
 * @returns {string[]}
 */
export function extractLabeledPoNumbers(text) {
  const source = String(text || "");
  const found = new Set();
  const labeled = new RegExp(LABELED_PO_RE.source, "gi");
  for (const match of source.matchAll(labeled)) {
    const digits = String(match[1] || "").replace(/\D/g, "");
    if (digits.length >= 10) found.add(digits.slice(0, 10));
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
 *   overrideSource?: string,
 *   classifySharedPoSeries?: (poNumbers: string[], appendixTexts: string[]) => Promise<{
 *     invoiceTypeId?: string | null,
 *     needsReview?: boolean,
 *     confidence?: number,
 *     signals?: string[],
 *   }>,
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
    const source = String(input.overrideSource || "").trim() || "manual_confirm";
    return buildResult({
      invoiceTypeId: overrideType.invoiceTypeId,
      source,
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
  const headerPoNumbers = skipPoNumberStep
    ? []
    : extractHeaderPoNumbers(searchText, allPrefixes);
  const headerMatches = headerPoNumbers.length
    ? matchTypesByPoSeries(headerPoNumbers, poTypes)
    : [];
  // Filename PO, then a labeled "PO Number" / "PO No.", then any other series hit.
  // A PO inside a line description must not override those.
  const fileNamePoNumbers = skipPoNumberStep
    ? []
    : extractPoNumbersFromText(input.fileName || "", allPrefixes);
  const fileNameMatches = fileNamePoNumbers.length
    ? matchTypesByPoSeries(fileNamePoNumbers, poTypes)
    : [];
  const decisionNumbers = fileNameMatches.length
    ? fileNamePoNumbers
    : headerMatches.length
      ? headerPoNumbers
      : poNumbers;
  const decisionMatches = fileNameMatches.length
    ? fileNameMatches
    : headerMatches.length
      ? headerMatches
      : matches;

  const uniqueMatchedTypes = [
    ...new Map(decisionMatches.map((hit) => [hit.type.invoiceTypeId, hit])).values(),
  ];

  if (!skipPoNumberStep && uniqueMatchedTypes.length === 1) {
    const hit = uniqueMatchedTypes[0];
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

  if (!skipPoNumberStep && uniqueMatchedTypes.length > 1) {
    const poNumber = uniqueMatchedTypes[0]?.poNumber || decisionNumbers[0] || null;
    const matchedSeries = uniqueStrings(uniqueMatchedTypes.map((hit) => hit.prefix));
    const sharedPoNumbers = uniqueStrings([
      ...uniqueMatchedTypes.map((hit) => hit.poNumber),
      ...decisionNumbers,
    ]);

    if (typeof input.classifySharedPoSeries === "function") {
      const appendixTexts = collectPoAppendixTexts(input.pageTexts);
      let classified = null;
      try {
        classified = await input.classifySharedPoSeries(sharedPoNumbers, appendixTexts);
      } catch (error) {
        console.warn(
          `[extract][${input.traceId || "-"}] INVOICE_TYPE_PO_APPENDIX_LOOKUP_FAILED`,
          { message: error instanceof Error ? error.message : String(error) },
        );
        classified = { needsReview: true, signals: ["po_appendix_lookup_failed"] };
      }

      if (classified?.invoiceTypeId && !classified.needsReview) {
        return buildResult({
          invoiceTypeId: classified.invoiceTypeId,
          source: "po_line_keywords",
          confidence: classified.confidence ?? 1,
          signals: [
            `poSeries:${matchedSeries[0] || ""}`,
            ...(classified.signals || []),
          ],
          poNumber,
          matchedSeries,
          candidates: [classified.invoiceTypeId],
        });
      }

      return buildResult({
        invoiceTypeId: null,
        source: "po_line_keywords",
        confidence: 0,
        signals: [
          "shared_po_series",
          ...(classified?.signals || ["po_line_keywords_unresolved"]),
        ],
        poNumber,
        matchedSeries,
        candidates: [],
        lowConfidence: true,
        needsReview: true,
      });
    }

    return buildResult({
      invoiceTypeId: null,
      source: "po_series_ambiguous",
      confidence: 0,
      signals: ["shared_po_series", "no_line_classifier"],
      poNumber,
      matchedSeries,
      candidates: [],
      lowConfidence: true,
      needsReview: true,
    });
  }

  let contentCandidates;
  let poNumber = uniqueMatchedTypes[0]?.poNumber || poNumbers[0] || null;
  let matchedSeries = uniqueStrings(uniqueMatchedTypes.map((hit) => hit.prefix));
  let source = "content_classification";

  if (skipPoNumberStep) {
    contentCandidates = poTypes.length ? poTypes : types.filter((type) => type.invoiceTypeId !== "NON_PO");
  } else if (poNumbers.length > 0) {
    return buildResult({
      invoiceTypeId: null,
      source: "po_prefix_unmatched",
      confidence: 0,
      signals: ["po_prefix_unmatched", ...poNumbers.map((num) => `poNumber:${num}`)],
      poNumber: poNumbers[0],
      matchedSeries,
      candidates: [],
      lowConfidence: true,
      needsReview: true,
    });
  } else {
    const labeled = extractLabeledPoNumbers(searchText);
    const unmatched = labeled.filter(
      (num) => !allPrefixes.some((prefix) => String(num).startsWith(String(prefix))),
    );
    if (unmatched.length) {
      return buildResult({
        invoiceTypeId: null,
        source: "po_prefix_unmatched",
        confidence: 0,
        signals: [
          "po_prefix_unmatched",
          ...unmatched.map((num) => `poNumber:${num}`),
        ],
        poNumber: unmatched[0],
        candidates: [],
        lowConfidence: true,
        needsReview: true,
      });
    }

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
  const note = resolution?.needsReview
    ? "Invoice type needs manual review. Extraction was not started."
    : source === "manual_confirm"
      ? "Invoice type was forced by the email subject."
      : source === "po_line_keywords"
        ? "Invoice type was taken from keywords on the PO appendix."
        : source === "po_series"
          ? "Invoice type was taken from the PO number prefix."
          : source === "no_po_number"
            ? "No PO number was found. Invoice type is Non-PO."
            : source === "unresolved"
              ? "Invoice type could not be resolved from the PDF."
              : "Invoice type resolved before extraction.";
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
