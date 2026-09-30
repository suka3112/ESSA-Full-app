import { resolveCategoryDisplayLabel } from "../constants/documentFieldSchemas.js";

const LOW_CONFIDENCE_THRESHOLD = 0.35;

const PO_FOLLOWING_CATEGORIES = new Set([
  "purchase_order_appendix",
  "service_entry_sheet",
]);

function isWeakClassification(entry) {
  return (
    entry.categoryId === "unclassified" ||
    entry.confidence < LOW_CONFIDENCE_THRESHOLD
  );
}

function looksLikeTimesheetText(text) {
  const sample = String(text || "");
  if (!sample.trim()) return false;

  return (
    /daily\s*time\s*sheet/i.test(sample) ||
    /sign\s*workers?/i.test(sample) ||
    /daily\s*activit/i.test(sample) ||
    /approved\s*by/i.test(sample) ||
    /work\s*order/i.test(sample) ||
    (/\bin\b/i.test(sample) && /\bout\b/i.test(sample) && /total/i.test(sample))
  );
}

function isSparsePreview(text) {
  return String(text || "").trim().length < 40;
}

function looksLikePurchaseOrderText(text) {
  const sample = String(text || "");
  if (!sample.trim()) return false;
  if (looksLikePoAppendixText(sample)) return false;

  return (
    (/purchase\s*order/i.test(sample) && /po\s*number/i.test(sample)) ||
    /requisition\s*no/i.test(sample) ||
    (/vendor\s*code/i.test(sample) && /po\s*number/i.test(sample)) ||
    (/po\s*number/i.test(sample) && /po\s*date/i.test(sample))
  );
}

function looksLikePoAppendixText(text) {
  const sample = String(text || "");
  if (!sample.trim()) return false;

  return (
    /appendix\s*[-–]?\s*\d/i.test(sample) ||
    /price\s*breakdown\s+and\s+description\s+of\s+purchase\s+order/i.test(sample) ||
    /specific\s*\/\s*special\s+terms/i.test(sample) ||
    /general\s+terms\s*(&|and)\s*conditions/i.test(sample)
  );
}

function looksLikeKwitansiText(text) {
  const sample = String(text || "");
  if (!sample.trim()) return false;

  return (
    /\bkwitansi\b/i.test(sample) ||
    /sudah\s*terima\s*dari/i.test(sample) ||
    /untuk\s*pembayaran/i.test(sample) ||
    (/\breceipt\b/i.test(sample) && /received\s*from/i.test(sample))
  );
}

function looksLikeTransmittalText(text) {
  const sample = String(text || "");
  return /transmittal\s*note/i.test(sample) || /\btransmittal\b/i.test(sample);
}

function looksLikeMonthlyProgressText(text) {
  const sample = String(text || "");
  return (
    /monthly\s*progress\s*report/i.test(sample) ||
    (/\bwbs-0?\d/i.test(sample) && /weight\s*factor/i.test(sample))
  );
}

function looksLikeSbuText(text) {
  const sample = String(text || "");
  return (
    /sertifikat\s*badan\s*usaha/i.test(sample) ||
    /\bpb-umku\b/i.test(sample) ||
    (/nomor\s*induk\s*berusaha/i.test(sample) && /\bnib\b/i.test(sample))
  );
}

function looksLikeIujkText(text) {
  const sample = String(text || "");
  return (
    /izin\s*usaha\s*jasa\s*konstruksi/i.test(sample) ||
    /\biujk\b/i.test(sample)
  );
}

function looksLikeNoticeLetterText(text) {
  const sample = String(text || "");
  return (
    /notice\s*of\s*total\s*value/i.test(sample) ||
    (/progress\s*claim/i.test(sample) && /payment\s*details/i.test(sample))
  );
}

function looksLikeInvoiceTitleText(text) {
  const sample = String(text || "");
  if (!sample.trim()) return false;
  if (looksLikeKwitansiText(sample)) return false;

  return (
    /\binvoice\b/i.test(sample) &&
    (/invoice\s*no/i.test(sample) || /payment\s*term/i.test(sample) || /grand\s*total/i.test(sample))
  );
}

function looksLikeFakturPajakText(text) {
  const sample = String(text || "");
  if (!sample.trim()) return false;
  return (
    /faktur\s*pajak/i.test(sample) ||
    /e-?faktur/i.test(sample) ||
    /coretax/i.test(sample) ||
    /kode\s*(dan\s*)?nomor\s*seri/i.test(sample) ||
    (/\bdjp\b/i.test(sample) && /\bppn\b/i.test(sample) && /\bdpp\b/i.test(sample))
  );
}

function looksLikeBeritaAcaraText(text) {
  const sample = String(text || "");
  if (!sample.trim()) return false;
  const titled =
    /berita\s*acara/i.test(sample) ||
    /work\s*progress\s*certificate/i.test(sample) ||
    /\bbap\b/i.test(sample);
  const approvalGrid =
    /prepared/i.test(sample) &&
    /reviewed/i.test(sample) &&
    /acknowledged/i.test(sample) &&
    /approved/i.test(sample);
  return titled || approvalGrid;
}

function looksLikeManhourSummaryText(text) {
  const sample = String(text || "");
  if (!sample.trim()) return false;
  return (
    /summary\s*(calculation|of\s*claim)/i.test(sample) ||
    /monthly\s*man-?days/i.test(sample) ||
    (/regular\s*manhour/i.test(sample) && /overtime/i.test(sample)) ||
    /manhour\s*summary/i.test(sample)
  );
}

function looksLikeAttendanceText(text) {
  const sample = String(text || "");
  if (!sample.trim()) return false;
  return (
    /biometric/i.test(sample) ||
    /face\s*finger/i.test(sample) ||
    /daily\s*attendance/i.test(sample) ||
    (/username/i.test(sample) && /check[- ]?(in|out)/i.test(sample)) ||
    /fabrication\s*report/i.test(sample)
  );
}

function looksLikeSesText(text) {
  const sample = String(text || "");
  if (!sample.trim()) return false;
  return /service\s*entry\s*sheet|\bses\b/i.test(sample);
}

function detectCategoryFromPreview(preview, allowedIds = new Set()) {
  const text = String(preview || "");
  if (!text.trim()) return null;

  /** @type {Array<[string, number]>} */
  const hits = [];
  const allow = (id) => !allowedIds.size || allowedIds.has(id);

  if (allow("daily_timesheet") && looksLikeTimesheetText(text)) {
    hits.push(["daily_timesheet", 4]);
  }
  if (allow("daily_attendance") && looksLikeAttendanceText(text)) {
    hits.push(["daily_attendance", 4]);
  }
  if (allow("faktur_pajak") && looksLikeFakturPajakText(text)) {
    hits.push(["faktur_pajak", 4]);
  }
  if (allow("berita_acara") && looksLikeBeritaAcaraText(text)) {
    hits.push(["berita_acara", 4]);
  }
  if (allow("summary_calculation_manhour") && looksLikeManhourSummaryText(text)) {
    hits.push(["summary_calculation_manhour", 3]);
  }
  if (
    allow("purchase_order") &&
    looksLikePurchaseOrderText(text) &&
    !looksLikeTimesheetText(text)
  ) {
    hits.push(["purchase_order", 3]);
  }
  if (allow("purchase_order_appendix") && looksLikePoAppendixText(text)) {
    hits.push(["purchase_order_appendix", 3]);
  }
  if (allow("service_entry_sheet") && looksLikeSesText(text)) {
    hits.push(["service_entry_sheet", 3]);
  }
  if (allow("notice") && looksLikeKwitansiText(text)) hits.push(["notice", 3]);
  if (allow("invoice") && looksLikeInvoiceTitleText(text)) hits.push(["invoice", 2]);

  if (!hits.length) return null;
  hits.sort((left, right) => right[1] - left[1]);
  const [bestId, bestScore] = hits[0];
  const secondScore = hits[1]?.[1] || 0;
  if (bestScore === secondScore) return null;
  return bestId;
}

const STICKY_BUNDLE_TYPES = new Set([
  "berita_acara",
  "faktur_pajak",
  "invoice",
  "notice",
]);

function splitStickySingleTypeRuns(pages, allowedIds = new Set()) {
  if (!pages?.length || pages.length < 4) return pages;

  const sorted = [...pages].sort((a, b) => a.page - b.page);
  /** @type {Record<string, number>} */
  const counts = {};
  for (const entry of sorted) {
    const id = entry.categoryId || "unclassified";
    counts[id] = (counts[id] || 0) + 1;
  }
  const [topId, topCount] = Object.entries(counts).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const collapsed =
    topCount / sorted.length >= 0.7 && STICKY_BUNDLE_TYPES.has(topId);
  const allSame = Object.keys(counts).length === 1;
  if (!collapsed && !allSame) return sorted;

  return sorted.map((entry) => {
    const detected = detectCategoryFromPreview(entry.preview, allowedIds);
    if (!detected || detected === entry.categoryId) return entry;
    return {
      ...retarget(entry, detected, "sticky-split"),
      isDocumentStart: true,
    };
  });
}

function isEssaPoBoundarySlot(prev, next) {
  return (
    prev?.categoryId === "daily_timesheet" &&
    PO_FOLLOWING_CATEGORIES.has(next?.categoryId)
  );
}

function retarget(entry, categoryId, methodSuffix) {
  return {
    ...entry,
    categoryId,
    categoryLabel: resolveCategoryDisplayLabel(categoryId),
    classificationMethod: entry.classificationMethod
      ? `${entry.classificationMethod}+${methodSuffix}`
      : methodSuffix,
  };
}

function toTimesheetCategory(entry) {
  return retarget(entry, "daily_timesheet", "timesheet-fix");
}

function toPurchaseOrderCategory(entry) {
  return retarget(entry, "purchase_order", "po-boundary");
}

function toPoAppendixCategory(entry) {
  return retarget(entry, "purchase_order_appendix", "appendix-fix");
}

function toNoticeCategory(entry, allowedIds = new Set()) {
  const target = allowedIds.has("notice")
    ? "notice"
    : allowedIds.has("notice_letter")
      ? "notice_letter"
      : "notice";
  return retarget(entry, target, "kwitansi-fix");
}

function fixKwitansiMisclassifiedAsInvoice(pages, allowedIds = new Set()) {
  return pages.map((entry) => {
    if (entry.categoryId !== "invoice" && entry.categoryId !== "unclassified") {
      return entry;
    }
    if (looksLikeKwitansiText(entry.preview) && !looksLikeInvoiceTitleText(entry.preview)) {
      return toNoticeCategory(entry, allowedIds);
    }
    return entry;
  });
}

function fixCivilDocumentLabels(pages, allowedIds) {
  const hasCivilDocs =
    allowedIds.has("transmittal") ||
    allowedIds.has("monthly_progress_report") ||
    allowedIds.has("sertifikat_badan_usaha") ||
    allowedIds.has("izin_usaha_jasa_konstruksi") ||
    allowedIds.has("notice_letter");
  if (!hasCivilDocs) return pages;

  return pages.map((entry) => {
    const preview = entry.preview || "";
    if (allowedIds.has("transmittal") && looksLikeTransmittalText(preview)) {
      return retarget(entry, "transmittal", "civil-transmittal-fix");
    }
    if (allowedIds.has("monthly_progress_report") && looksLikeMonthlyProgressText(preview)) {
      return retarget(entry, "monthly_progress_report", "civil-progress-fix");
    }
    if (allowedIds.has("sertifikat_badan_usaha") && looksLikeSbuText(preview) && !looksLikeIujkText(preview)) {
      return retarget(entry, "sertifikat_badan_usaha", "civil-sbu-fix");
    }
    if (allowedIds.has("izin_usaha_jasa_konstruksi") && looksLikeIujkText(preview)) {
      return retarget(entry, "izin_usaha_jasa_konstruksi", "civil-iujk-fix");
    }
    if (
      allowedIds.has("notice_letter") &&
      (looksLikeNoticeLetterText(preview) || looksLikeKwitansiText(preview)) &&
      entry.categoryId === "invoice"
    ) {
      return retarget(entry, "notice_letter", "civil-notice-fix");
    }
    return entry;
  });
}

function fixPoAppendixMisclassifiedAsPo(pages) {
  return pages.map((entry) => {
    if (
      entry.categoryId !== "purchase_order" &&
      entry.categoryId !== "unclassified"
    ) {
      return entry;
    }
    if (looksLikePoAppendixText(entry.preview || "")) {
      return toPoAppendixCategory(entry);
    }
    return entry;
  });
}

function refinePurchaseOrderRun(run) {
  return run.map((entry, index) => {
    if (looksLikePoAppendixText(entry.preview || "")) {
      return toPoAppendixCategory(entry);
    }
    if (looksLikeTimesheetText(entry.preview || "")) {
      return toTimesheetCategory(entry);
    }
    if (entry.poHeadingConfirmed || looksLikePurchaseOrderText(entry.preview || "")) {
      return entry;
    }
    // Fully scanned PO cover + following appendix pages have empty text.
    // Keep the first page as the cover; later pages in the run are appendix.
    if (isSparsePreview(entry.preview)) {
      return index === 0 ? entry : toPoAppendixCategory(entry);
    }
    return toTimesheetCategory(entry);
  });
}

function fixConsecutivePoBlocks(pages) {
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const refined = sorted.map((entry) => ({ ...entry }));

  let i = 0;
  while (i < refined.length) {
    if (refined[i].categoryId !== "purchase_order") {
      i += 1;
      continue;
    }

    let j = i;
    while (
      j + 1 < refined.length &&
      refined[j + 1].categoryId === "purchase_order" &&
      refined[j + 1].page === refined[j].page + 1
    ) {
      j += 1;
    }

    const run = refined.slice(i, j + 1);
    if (run.length >= 2) {
      const updated = refinePurchaseOrderRun(run);
      for (let k = 0; k < updated.length; k += 1) {
        refined[i + k] = updated[k];
      }
    }

    i = j + 1;
  }

  return refined;
}

/**
 * Timesheet pages are often misclassified as purchase_order when a PO reference
 * is handwritten in the header. Prefer daily_timesheet when layout/text says so.
 * @param {Array<{ page: number, categoryId: string, preview?: string, poHeadingConfirmed?: boolean }>} pages
 */
function fixTimesheetMisclassifiedAsPo(pages) {
  const sorted = [...pages].sort((a, b) => a.page - b.page);

  return sorted.map((entry, index) => {
    if (entry.categoryId !== "purchase_order") return entry;
    if (entry.poHeadingConfirmed) return entry;

    const preview = entry.preview || "";
    const prev = sorted[index - 1];
    const next = sorted[index + 1];
    const neighborTimesheets =
      (prev?.categoryId === "daily_timesheet" ? 1 : 0) +
      (next?.categoryId === "daily_timesheet" ? 1 : 0);

    if (isEssaPoBoundarySlot(prev, next)) {
      return entry;
    }

    if (looksLikePurchaseOrderText(preview) && !looksLikeTimesheetText(preview)) {
      return entry;
    }

    if (looksLikeTimesheetText(preview)) {
      return toTimesheetCategory(entry);
    }

    const lastPage = sorted[sorted.length - 1]?.page || entry.page;
    const nearTail = entry.page >= Math.max(1, lastPage - 12);
    // Scanned SAP PO covers sit at the tail with no embedded text. Do not
    // relabel them as timesheets just because neighboring pages are timesheets.
    if (
      neighborTimesheets >= 2 &&
      !looksLikePurchaseOrderText(preview) &&
      !nearTail &&
      !isSparsePreview(preview)
    ) {
      return toTimesheetCategory(entry);
    }

    return entry;
  });
}

/**
 * ESSA bundles place the SAP PO form on one page between timesheets and the
 * appendix / SES. Restore pages wrongly downgraded by timesheet refinement.
 * @param {Array<{ page: number, categoryId: string, classificationMethod?: string }>} pages
 */
function restoreEssaPurchaseOrderBoundaryPages(pages) {
  const sorted = [...pages].sort((a, b) => a.page - b.page);

  return sorted.map((entry, index) => {
    if (entry.categoryId !== "daily_timesheet") return entry;

    const prev = sorted[index - 1];
    const next = sorted[index + 1];
    if (!isEssaPoBoundarySlot(prev, next)) return entry;

    const wasDowngradedFromPo = String(entry.classificationMethod || "").includes(
      "timesheet-fix",
    );

    if (wasDowngradedFromPo) {
      return toPurchaseOrderCategory(entry);
    }

    return entry;
  });
}

/**
 * Manpower bundles put the SAP/PAU PO cover immediately before Appendix - 1.
 * That cover is often a flattened scan (zero embedded text), so vision may
 * label it timesheet/unclassified while the digital appendix is detected.
 * Promote the page before the first appendix-text page to purchase_order.
 */
function restorePoCoverBeforeAppendix(pages, allowedIds) {
  if (!allowedIds.has("purchase_order")) return pages;

  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const appendixIndex = sorted.findIndex(
    (entry) =>
      entry.categoryId === "purchase_order_appendix" ||
      looksLikePoAppendixText(entry.preview || ""),
  );
  if (appendixIndex <= 0) return pages;

  const coverIndex = appendixIndex - 1;
  const cover = sorted[coverIndex];
  if (cover.categoryId === "purchase_order") return sorted;
  if (HEADER_SINGLETONS.has(cover.categoryId)) return sorted;
  if (looksLikePoAppendixText(cover.preview || "")) return sorted;
  if (looksLikeTimesheetText(cover.preview || "") && !isSparsePreview(cover.preview)) {
    return sorted;
  }

  const preview = String(cover.preview || "").trim();
  const canPromote =
    looksLikePurchaseOrderText(cover.preview || "") ||
    !preview ||
    isWeakClassification(cover) ||
    cover.categoryId === "unclassified" ||
    cover.categoryId === "daily_timesheet" ||
    cover.categoryId === "daily_attendance" ||
    cover.categoryId === "purchase_order_appendix";

  if (!canPromote) return sorted;

  const refined = sorted.map((entry) => ({ ...entry }));
  refined[coverIndex] = toPurchaseOrderCategory(cover);
  return refined;
}

const HEADER_SINGLETONS = new Set([
  "notice",
  "invoice",
  "faktur_pajak",
  "berita_acara",
]);

const BODY_CATEGORIES = new Set([
  "summary_calculation_manhour",
  "daily_timesheet",
  "daily_attendance",
]);

function remapExtraHeaderPage(entry, sorted, index, allowedIds) {
  const prev = sorted[index - 1];
  const next = sorted[index + 1];
  const neighborBody = [prev, next].find(
    (row) => row && BODY_CATEGORIES.has(row.categoryId),
  );
  if (neighborBody && allowedIds.has(neighborBody.categoryId)) {
    return retarget(entry, neighborBody.categoryId, "header-dup-fix");
  }

  const seenBa = sorted
    .slice(0, index)
    .some((row) => row.categoryId === "berita_acara");
  if (seenBa && allowedIds.has("daily_timesheet")) {
    return retarget(entry, "daily_timesheet", "header-dup-fix");
  }
  if (seenBa && allowedIds.has("summary_calculation_manhour")) {
    return retarget(entry, "summary_calculation_manhour", "header-dup-fix");
  }

  return entry;
}

/**
 * Manpower bundles have one Kwitansi, invoice, Faktur Pajak, and Berita Acara.
 * Extra copies of those labels on later scanned pages are almost always
 * summary / timesheet / attendance pages.
 */
function fixDuplicateManpowerHeaders(pages, allowedIds) {
  if (!allowedIds.has("daily_timesheet") && !allowedIds.has("summary_calculation_manhour")) {
    return pages;
  }

  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const seen = new Set();

  return sorted.map((entry, index) => {
    if (!HEADER_SINGLETONS.has(entry.categoryId)) return entry;
    if (!seen.has(entry.categoryId)) {
      seen.add(entry.categoryId);
      return entry;
    }
    return remapExtraHeaderPage(entry, sorted, index, allowedIds);
  });
}

const TAIL_PO_TYPES = new Set(["purchase_order", "purchase_order_appendix"]);
const TIMESHEET_BODY = new Set(["daily_timesheet", "daily_attendance"]);

function nearestTimesheetBodyType(sorted, index) {
  for (let distance = 1; distance < sorted.length; distance += 1) {
    const prev = sorted[index - distance];
    const next = sorted[index + distance];
    if (prev && TIMESHEET_BODY.has(prev.categoryId)) return prev.categoryId;
    if (next && TIMESHEET_BODY.has(next.categoryId)) return next.categoryId;
  }
  return "daily_timesheet";
}

/**
 * Manpower PO / appendix belong at the tail. If timesheets or attendance
 * continue after a PO block, that block was a timesheet with a PO number
 * in the header — not the SAP PO.
 */
function fixPoBlockBeforeLaterTimesheets(pages, allowedIds) {
  if (!allowedIds.has("daily_timesheet") && !allowedIds.has("daily_attendance")) {
    return pages;
  }

  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const lastBodyPage = sorted.reduce((last, entry) => {
    if (
      TIMESHEET_BODY.has(entry.categoryId) &&
      looksLikeTimesheetText(entry.preview || "")
    ) {
      return Math.max(last, entry.page);
    }
    return last;
  }, 0);
  if (!lastBodyPage) return pages;

  return sorted.map((entry, index) => {
    if (!TAIL_PO_TYPES.has(entry.categoryId)) return entry;
    if (entry.page >= lastBodyPage) return entry;

    const bodyType = nearestTimesheetBodyType(sorted, index);
    const target = allowedIds.has(bodyType) ? bodyType : "daily_timesheet";
    if (!allowedIds.has(target)) return entry;
    return retarget(entry, target, "mid-bundle-po-fix");
  });
}

/**
 * Fill isolated weak pages sandwiched between pages with the same strong category.
 * @param {Array<{ page: number, categoryId: string, categoryLabel: string, confidence: number }>} pages
 */
function fillIsolatedGaps(pages) {
  if (pages.length < 3) return pages;

  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const refined = sorted.map((entry) => ({ ...entry }));

  for (let i = 1; i < refined.length - 1; i += 1) {
    const prev = refined[i - 1];
    const current = refined[i];
    const next = refined[i + 1];

    if (
      isWeakClassification(current) &&
      prev.categoryId === next.categoryId &&
      prev.categoryId !== "unclassified" &&
      prev.confidence >= LOW_CONFIDENCE_THRESHOLD &&
      next.confidence >= LOW_CONFIDENCE_THRESHOLD &&
      next.page - prev.page === 2 &&
      !detectCategoryFromPreview(current.preview)
    ) {
      refined[i] = {
        ...current,
        categoryId: prev.categoryId,
        categoryLabel: prev.categoryLabel,
        confidence: Math.min(prev.confidence, next.confidence) * 0.85,
        isDocumentStart: false,
        classificationMethod: current.classificationMethod || "refined",
      };
    }
  }

  return refined;
}

/**
 * Apply post-classification refinement to improve contiguous splits.
 * @param {Array<{ page: number, categoryId: string, categoryLabel: string, confidence: number, classificationMethod?: string, preview?: string, poHeadingConfirmed?: boolean }>} pages
 * @param {{ allowedCategoryIds?: string[] }} [options]
 */
export function refinePageClassifications(pages, options = {}) {
  if (!pages?.length) return pages;
  const allowedIds = new Set(options.allowedCategoryIds || []);
  return fillIsolatedGaps(
    splitStickySingleTypeRuns(
      restorePoCoverBeforeAppendix(
        fixPoBlockBeforeLaterTimesheets(
          restoreEssaPurchaseOrderBoundaryPages(
            fixTimesheetMisclassifiedAsPo(
              fixConsecutivePoBlocks(
                fixPoAppendixMisclassifiedAsPo(
                  fixDuplicateManpowerHeaders(
                    fixCivilDocumentLabels(
                      fixKwitansiMisclassifiedAsInvoice(pages, allowedIds),
                      allowedIds,
                    ),
                    allowedIds,
                  ),
                ),
              ),
            ),
          ),
          allowedIds,
        ),
        allowedIds,
      ),
      allowedIds,
    ),
  );
}
