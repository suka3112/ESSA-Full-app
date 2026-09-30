import classifyPdf from "../services/classifyPdf.js";
import {
  createUploadFolder,
  // deleteUploadFolder,
} from "../services/uploadFolder.js";
import splitPdfToDisk from "../services/splitPdfToDisk.js";
import { extractSectionsInParallel } from "../services/parallelExtraction.js";
import { getFieldSchemaCatalog } from "../constants/documentFieldSchemas.js";
import { aggregateExtractionResults } from "../services/responseAggregation.js";
import { validate, resolveValidationMode } from "../validation/validate.js";
import { getLimits } from "../config/loadConfig.js";
import { isOpenAiEnabled } from "../config/openai.js";
import { attachPageTextsToVirtualPdfs } from "../utils/pageTextCache.js";
import { recordPhase, startTimer } from "../utils/pipelineTiming.js";
import { normalizeBundleExtractions } from "../services/bundleExtractionNormalization.js";
import { resolvePromptBuilderUsage } from "../utils/invoiceWorkflow.js";
import {
  logInvoiceTypeResolution,
  resolveInvoiceType,
} from "../services/invoiceTypeResolution.js";
import { findMissingMandatoryDocuments } from "../config/invoiceTypeCatalog.js";
import {
  logClassification,
  logPageTextStats,
  logSplitResult,
} from "../utils/classificationSplitLog.js";

function buildReviewPayload({
  typeResolution,
  catalog,
  timing,
  options,
  sourceFile,
}) {
  const typesById = new Map(
    (catalog?.invoiceTypes || []).map((type) => [type.invoiceTypeId, type]),
  );
  const candidates = (typeResolution.candidates || []).map((id) => {
    const type = typesById.get(id);
    const score = (typeResolution.candidateScores || []).find(
      (row) => row.invoiceTypeId === id,
    );
    return {
      invoiceTypeId: id,
      name: type?.name || id,
      confidence: score?.confidence ?? null,
      contentSignals: type?.contentSignals || "",
    };
  });

  return {
    status: "needs_invoice_type_review",
    invoiceTypeResolution: {
      invoiceTypeId: null,
      source: typeResolution.source,
      confidence: typeResolution.confidence,
      lowConfidence: true,
      needsReview: true,
      poNumber: typeResolution.poNumber,
      matchedSeries: typeResolution.matchedSeries,
      signals: typeResolution.signals,
      candidates,
    },
    classification: null,
    split: null,
    documents: [],
    validation: null,
    meta: {
      invoiceTypeId: null,
      invoiceTypeSource: typeResolution.source,
      invoiceTypeConfidence: typeResolution.confidence,
      invoiceTypeLowConfidence: true,
      invoiceTypeNeedsReview: true,
      invoiceWorkflow: null,
      invoiceWorkflowSource: typeResolution.source,
      invoiceWorkflowReasons: typeResolution.signals,
      fileName: sourceFile?.originalname || null,
      timing,
      performanceTargetsMs: {
        classification: 30000,
        splitting: 10000,
        extraction: 60000,
        total: 120000,
      },
      openAiEnabled: isOpenAiEnabled(),
      traceId: options.traceId || null,
    },
  };
}

function slimClassification(classification) {
  if (!classification) return null;
  return {
    totalPages: classification.totalPages,
    method: classification.classificationMethod,
    categories: Object.values(classification.categories || {}),
    documents: classification.documents,
    categoryGroups: classification.categoryGroups,
    pages: (classification.pages || []).map(
      ({
        page,
        documentType,
        categoryLabel,
        confidence,
        classificationMethod,
        isDocumentStart,
        documentIndex,
      }) => ({
        page,
        documentType,
        categoryLabel,
        confidence,
        isDocumentStart,
        documentIndex,
        method: classificationMethod,
      }),
    ),
  };
}

function buildMissingMandatoryPayload({
  typeResolution,
  classification,
  missingMandatory,
  timing,
  options,
  sourceFile,
}) {
  const missing = missingMandatory.map((doc) => ({
    categoryId: doc.categoryId,
    categoryLabel: doc.categoryLabel,
  }));
  const labels = missing.map((doc) => doc.categoryLabel || doc.categoryId);

  return {
    status: "missing_mandatory_documents",
    missingMandatoryDocuments: missing,
    classification: slimClassification(classification),
    split: null,
    documents: [],
    validation: null,
    meta: {
      invoiceTypeId: typeResolution.invoiceTypeId,
      invoiceTypeSource: typeResolution.source,
      invoiceTypeConfidence: typeResolution.confidence,
      invoiceTypeLowConfidence: Boolean(typeResolution.lowConfidence),
      invoiceTypeSignals: typeResolution.signals,
      invoiceTypePoNumber: typeResolution.poNumber,
      invoiceWorkflow: typeResolution.invoiceTypeId || null,
      invoiceWorkflowSource: typeResolution.source,
      invoiceWorkflowReasons: typeResolution.signals,
      missingMandatoryDocuments: missing,
      missingMandatoryLabels: labels,
      fileName: sourceFile?.originalname || null,
      timing,
      performanceTargetsMs: {
        classification: 30000,
        splitting: 10000,
        extraction: 60000,
        total: 120000,
      },
      openAiEnabled: isOpenAiEnabled(),
      traceId: options.traceId || null,
    },
  };
}

/**
 * Full extraction pipeline:
 * resolve invoice type → scoped AI classify → split → parallel extract → validate
 *
 * @param {Buffer} pdfBuffer
 * @param {{ originalname: string, mimetype: string }} sourceFile
 * @param {{
 *   validationMode?: string,
 *   extractionPrompt?: string,
 *   extractionPromptPo?: string,
 *   extractionPrompts?: Record<string, string>,
 *   invoiceTypeCatalog?: object,
 *   invoiceWorkflow?: string,
 *   skipMandatoryDocuments?: boolean,
 *   requestedDocumentTypes?: string[],
 *   traceId?: string,
 * }} options
 */
export async function runExtractPipeline(pdfBuffer, sourceFile, options = {}) {
  const timing = {};
  const pipelineStartedAt = startTimer();
  let uploadFolder = null;
  const catalog = options.invoiceTypeCatalog || null;
  const skipMandatoryDocuments = Boolean(options.skipMandatoryDocuments);

  try {
    let phaseStartedAt = startTimer();
    const { extractPageTexts } = await import("../services/pdfText.js");
    const pageTexts = await extractPageTexts(pdfBuffer);
    recordPhase(timing, "pageTextMs", phaseStartedAt);
    logPageTextStats(options.traceId, pageTexts);

    phaseStartedAt = startTimer();
    let typeResolution = await resolveInvoiceType({
      fileName: sourceFile.originalname,
      pageTexts,
      catalog,
      override: options.invoiceWorkflow,
      traceId: options.traceId,
    });
    recordPhase(timing, "invoiceTypeResolutionMs", phaseStartedAt);
    logInvoiceTypeResolution(options.traceId, typeResolution, {
      lowConfidenceAction: catalog?.lowConfidenceAction || "manual_review",
      confidenceThreshold: catalog?.confidenceThreshold ?? 0.7,
    });

    if (typeResolution.needsReview) {
      const reviewFallback =
        typeResolution.invoiceTypeId || typeResolution.candidates?.[0] || null;
      if (skipMandatoryDocuments && reviewFallback) {
        console.info(
          `[extract][${options.traceId || "-"}] SKIP_INVOICE_TYPE_REVIEW`,
          {
            invoiceTypeId: reviewFallback,
            reason: "skipMandatoryDocuments",
          },
        );
        typeResolution = {
          ...typeResolution,
          invoiceTypeId: reviewFallback,
          needsReview: false,
        };
      } else {
        recordPhase(timing, "totalMs", pipelineStartedAt);
        return buildReviewPayload({
          typeResolution,
          catalog,
          timing,
          options,
          sourceFile,
        });
      }
    }

    phaseStartedAt = startTimer();
    const classification = await classifyPdf(pdfBuffer, {
      invoiceTypeId: typeResolution.invoiceTypeId,
      catalog,
      pageTexts,
      traceId: options.traceId,
      fileName: sourceFile.originalname,
      preferredCategoryIds: options.requestedDocumentTypes || [],
    });
    recordPhase(timing, "classificationMs", phaseStartedAt);
    logClassification(options.traceId, classification, {
      invoiceTypeId: typeResolution.invoiceTypeId,
      allowedCategoryIds: classification.allowedCategoryIds,
      scatteredCategoryIds: classification.scatteredCategoryIds,
      categoryGroupMap: classification.categoryGroupMap,
    });

    const missingMandatory = findMissingMandatoryDocuments(
      catalog,
      typeResolution.invoiceTypeId,
      classification,
    );
    if (missingMandatory.length) {
      const missingIds = missingMandatory.map((doc) => doc.categoryId);
      if (skipMandatoryDocuments) {
        // DOCREQ / mailbox replies often contain only the requested supporting
        // docs (Tax Invoice, Berita Acara). Continue classify + extract so they
        // can be merged into the existing invoice instead of hard-stopping.
        console.info(
          `[extract][${options.traceId || "-"}] SKIP_MANDATORY_DOCUMENTS`,
          {
            invoiceTypeId: typeResolution.invoiceTypeId,
            missing: missingIds,
            reason: "skipMandatoryDocuments",
          },
        );
      } else {
        recordPhase(timing, "totalMs", pipelineStartedAt);
        console.info(
          `[extract][${options.traceId || "-"}] MISSING_MANDATORY_DOCUMENTS`,
          {
            invoiceTypeId: typeResolution.invoiceTypeId,
            missing: missingIds,
          },
        );
        return buildMissingMandatoryPayload({
          typeResolution,
          classification,
          missingMandatory,
          timing,
          options,
          sourceFile,
        });
      }
    }

    const promptPlan = resolvePromptBuilderUsage({
      invoiceTypeId: typeResolution.invoiceTypeId,
      invoiceTypeResolution: typeResolution,
      extractionPrompts: options.extractionPrompts,
      extractionPromptCandidate: options.extractionPrompt,
      extractionPromptPoCandidate: options.extractionPromptPo,
    });
    const activeExtractionPrompt = promptPlan.extractionPrompt;
    console.info(
      `[extract][${options.traceId || "-"}] WORKFLOW_RESOLVED`,
      {
        invoiceTypeId: promptPlan.invoiceTypeId,
        workflow: promptPlan.workflow,
        source: promptPlan.source,
        reasons: promptPlan.reasons,
        confidence: typeResolution.confidence,
        lowConfidence: Boolean(typeResolution.lowConfidence),
        promptBuilderMode: promptPlan.promptBuilderMode,
        promptSourceType: promptPlan.promptSourceType,
        promptCandidateChars: promptPlan.promptCandidateChars,
        nonPoPromptCandidateChars: promptPlan.nonPoPromptCandidateChars,
        poPromptCandidateChars: promptPlan.poPromptCandidateChars,
      },
    );
    if (!promptPlan.promptBuilderMode) {
      console.info(
        `[extract][${options.traceId || "-"}] NO_PROMPT_FOR_INVOICE_TYPE_${promptPlan.invoiceTypeId || "UNRESOLVED"} — falling back to ocr-demo schema/hints`,
      );
    }

    phaseStartedAt = startTimer();
    uploadFolder = createUploadFolder();
    console.log("[extract] created upload folder:", uploadFolder.folderPath);
    const splitResult = await splitPdfToDisk(
      pdfBuffer,
      classification.categoryGroups,
      uploadFolder,
      {
        originalFileName: sourceFile.originalname,
        totalPages: classification.totalPages,
      },
    );
    attachPageTextsToVirtualPdfs(
      splitResult.virtualPdfs,
      classification.pageTextByPage,
    );
    recordPhase(timing, "splittingMs", phaseStartedAt);
    logSplitResult(options.traceId, splitResult, {
      uploadId: uploadFolder.folderName,
      uploadPath: uploadFolder.relativePath,
    });

    phaseStartedAt = startTimer();
    const extractions = await extractSectionsInParallel(
      classification.categoryGroups,
      splitResult.virtualPdfs,
      sourceFile,
      {
        traceId: options.traceId,
        extractionPrompt: activeExtractionPrompt,
      },
    );
    normalizeBundleExtractions(extractions);
    recordPhase(timing, "extractionMs", phaseStartedAt);

    const validationMode = resolveValidationMode(
      extractions,
      options.validationMode,
    );
    const bundleValidation =
      validationMode === "skip"
        ? null
        : validate(extractions, { mode: validationMode });

    const { documents } = aggregateExtractionResults(
      extractions,
      splitResult.sections,
      { promptBuilderMode: promptPlan.promptBuilderMode },
    );

    const limits = getLimits();
    const sectionCount = classification.categoryGroups.length;
    const configuredConcurrency = limits.extractionParallelRequests ?? 0;
    recordPhase(timing, "totalMs", pipelineStartedAt);

    return {
      classification: {
        totalPages: classification.totalPages,
        method: classification.classificationMethod,
        categories: Object.values(classification.categories || {}),
        documents: classification.documents,
        categoryGroups: classification.categoryGroups,
        pages: classification.pages.map(
          ({
            page,
            documentType,
            categoryLabel,
            confidence,
            classificationMethod,
            isDocumentStart,
            documentIndex,
          }) => ({
            page,
            documentType,
            categoryLabel,
            confidence,
            isDocumentStart,
            documentIndex,
            method: classificationMethod,
          }),
        ),
      },
      split: {
        uploadId: uploadFolder.folderName,
        uploadPath: uploadFolder.relativePath,
        metadataPath: `${uploadFolder.relativePath}/metadata.json`,
        sections: splitResult.sections,
      },
      documents,
      validation: bundleValidation,
      meta: {
        validationMode,
        openAiEnabled: isOpenAiEnabled(),
        extractionMode: "parallel",
        extractionConcurrency: configuredConcurrency || sectionCount,
        extractionSectionCount: sectionCount,
        invoiceTypeId: promptPlan.invoiceTypeId,
        invoiceTypeSource: typeResolution.source,
        invoiceTypeConfidence: typeResolution.confidence,
        invoiceTypeLowConfidence: Boolean(typeResolution.lowConfidence),
        invoiceTypeSignals: typeResolution.signals,
        invoiceTypePoNumber: typeResolution.poNumber,
        invoiceWorkflow: promptPlan.workflow,
        invoiceWorkflowSource: promptPlan.source,
        invoiceWorkflowReasons: promptPlan.reasons,
        promptBuilderMode: promptPlan.promptBuilderMode,
        promptSourceType: promptPlan.promptSourceType,
        usedOcrDemoExtractionHints: promptPlan.usedOcrDemoExtractionHints,
        extractionPromptChars: activeExtractionPrompt
          ? String(activeExtractionPrompt).length
          : 0,
        extractionPromptText: activeExtractionPrompt
          ? String(activeExtractionPrompt)
          : null,
        fieldSchemas: getFieldSchemaCatalog(),
        timing,
        performanceTargetsMs: {
          classification: 30000,
          splitting: 10000,
          extraction: 60000,
          total: 120000,
        },
      },
      uploadFolder,
    };
  } catch (error) {
    // if (uploadFolder) {
    //   await deleteUploadFolder(uploadFolder);
    // }
    throw error;
  }
}

export default runExtractPipeline;
