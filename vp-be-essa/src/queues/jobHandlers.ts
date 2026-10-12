import slaEngine from "../helpers/slaEngine.service";
import vendorService from "../helpers/vendor.service";
import InvoiceService from "../helpers/invoice.service";
import apInvoiceAsyncUploadService from "../helpers/apInvoiceAsyncUpload.service";

type InvoiceOcrJob = {
  data?: { documentId?: number };
  retryCount?: number;
  retryLimit?: number;
};

export async function executeSlaTick() {
  await slaEngine.tick();
}

export async function executeVendorSync() {
  const approvedVendor = await vendorService.getApprovedVendorV1();
  await vendorService.UpdateDatasV1(approvedVendor);
  return approvedVendor;
}

export async function executeInvoiceApprovalMail() {
  const result = await InvoiceService.sendApprovalMail();
  await InvoiceService.sendRejectionMail();
  return result;
}

export async function executeInvoiceOcr(job: InvoiceOcrJob): Promise<void> {
  const documentId = Number(job.data?.documentId);
  try {
    await apInvoiceAsyncUploadService.processAcceptedUpload(documentId);
  } catch (error) {
    const retryCount = Number(job.retryCount) || 0;
    const retryLimit = Number(job.retryLimit) || 0;
    if (retryCount >= retryLimit) {
      await apInvoiceAsyncUploadService.markFailedFromQueue(
        documentId,
        error instanceof Error ? error.message : "Invoice processing failed.",
      );
    }
    throw error;
  }
}

/** Used when SCHEDULER_ENABLED=false so an accepted upload still finishes. */
export async function executeInvoiceOcrInline(documentId: number): Promise<void> {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await apInvoiceAsyncUploadService.processAcceptedUpload(documentId);
      return;
    } catch (error) {
      if (attempt === attempts) {
        await apInvoiceAsyncUploadService.markFailedFromQueue(
          documentId,
          error instanceof Error ? error.message : "Invoice processing failed.",
        );
      }
    }
  }
}
