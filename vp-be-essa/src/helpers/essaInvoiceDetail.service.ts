import { ApDocument } from "../models/apDocument";
import { ApValidationResult } from "../models/apValidationResult";
import { ApValidationRun } from "../models/apValidationRun";
import apInvoiceDocumentService from "./apInvoiceDocument.service";
import { resolveEssaInvoice } from "./essaInvoiceActions.service";
import slaService, { remainingMsOf } from "./sla.service";

const toIso = (value: Date | string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

/**
 * Invoice details aggregate — SAD §23 "Get invoice details".
 * Read-only: combines the ESSA_INVOICE row with its extraction, source
 * document metadata, latest validation run and open SLA instance.
 */
class EssaInvoiceDetailService {
  async getInvoiceDetails(rawId: string) {
    const invoice = await resolveEssaInvoice(rawId);
    const documentId = Number(invoice.DocumentId);

    const [extraction, document, latestRun, slaInstances] = await Promise.all([
      apInvoiceDocumentService.getReconstructedExtraction(documentId),
      ApDocument.findByPk(documentId),
      ApValidationRun.findOne({
        where: { DocumentId: documentId },
        order: [["StartedAt", "DESC"], ["ValidationRunId", "DESC"]],
      }),
      slaService.openInstancesForObjects("INVOICE", [String(documentId)]),
    ]);

    const validationResults = latestRun
      ? await ApValidationResult.findAll({
          where: { ValidationRunId: latestRun.ValidationRunId },
          order: [["ValidationId", "ASC"]],
        })
      : [];

    // Same SLA derivation as listEssaInvoices so list and details agree.
    const inst = slaInstances[0];
    const dueFromInst = inst?.DueAt ? new Date(inst.DueAt) : null;
    const slaDue =
      dueFromInst || (invoice.SlaDueAt ? new Date(invoice.SlaDueAt) : null);
    const now = Date.now();
    const remainingMs = inst
      ? remainingMsOf(inst.Status, dueFromInst, inst.FrozenRemainingMs, now)
      : slaDue
        ? slaDue.getTime() - now
        : null;
    const slaBreached = inst
      ? inst.Status === "BREACHED" || (remainingMs != null && remainingMs < 0)
      : !!invoice.SlaBreached;

    return {
      id: invoice.InvoiceNo || `ocr-${documentId}`,
      documentId,
      invoiceNo: invoice.InvoiceNo,
      invoiceDate: invoice.InvoiceDate,
      vendorName: invoice.VendorName,
      vendorCode: invoice.VendorCode,
      poNumber: invoice.PoNumber,
      invoiceWorkflow: invoice.InvoiceWorkflow,
      invoiceType: invoice.InvoiceType,
      workflowStage: invoice.WorkflowStage,
      failedChecks: Number(invoice.FailedChecks) || 0,
      openExceptions: Number(invoice.OpenExceptions) || 0,
      // DECIMAL(18,2) — returned as the persisted string, never a float.
      totalAmount: invoice.TotalAmount != null ? String(invoice.TotalAmount) : null,
      currency: invoice.Currency || "IDR",
      correlationId: invoice.CorrelationId || null,
      createdAt: toIso(invoice.CreatedDt),
      modifiedAt: toIso(invoice.ModifiedDt),
      sla: {
        status: inst?.Status || null,
        dueAt: toIso(slaDue),
        remainingMs,
        breached: slaBreached,
      },
      document: document
        ? {
            documentType: document.DocumentType,
            originalFileName: document.OriginalFileName,
            mimeType: document.MimeType,
            // BIGINT comes back from pg as a string.
            fileSizeBytes:
              document.FileSizeBytes != null ? Number(document.FileSizeBytes) : null,
            extractionStatus: document.ExtractionStatus,
            overallConfidence: document.OverallConfidence,
            lifecycleStatus: document.LifecycleStatus,
            versionNo: document.VersionNo,
            uploadedAt: toIso(document.UploadedAt),
          }
        : null,
      extraction: {
        header: extraction?.header || {},
        lineItems: extraction?.lineItems || [],
      },
      validation: latestRun
        ? {
            validationRunId: Number(latestRun.ValidationRunId),
            configVersionId: latestRun.ConfigVersionId,
            triggerEvent: latestRun.TriggerEvent,
            status: latestRun.Status,
            startedAt: toIso(latestRun.StartedAt),
            completedAt: toIso(latestRun.CompletedAt),
            results: validationResults.map((r) => ({
              ruleCode: r.RuleCode,
              ruleName: r.RuleName,
              severity: r.Severity,
              expectedValue: r.ExpectedValue,
              actualValue: r.ActualValue,
              varianceValue: r.VarianceValue != null ? String(r.VarianceValue) : null,
              message: r.Message,
            })),
          }
        : null,
    };
  }
}

export default new EssaInvoiceDetailService();
