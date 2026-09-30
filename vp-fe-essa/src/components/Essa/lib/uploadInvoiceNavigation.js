import {
  buildValidationState,
  buildValidationMapOptions,
  canRunBundleValidation,
  hasPoWorkflowSignals,
  resolveBatchInvoiceWorkflow,
  validateApDocument
} from 'api/apInvoiceOcr'
import { persistUploadedInvoice } from 'api/essaUploadedInvoices'
import { INVOICE_DETAIL } from 'constants/url'
import {
  isNonPoInvoice,
  buildNonPoValidationState
} from './nonPoInvoiceDetail'

/** True when an uploaded invoice should use the non-PO detail workflow. */
export function isNonPoUploadDetail(detail, fileName = '') {
  const name = fileName || detail?.file_name || detail?.fileName || ''
  if (!detail) return false
  if (detail.invoice_workflow === 'PO') return false
  if (
    hasPoWorkflowSignals({
      header: detail.ocr?.header,
      poNumber: detail.po_number,
      batchDocumentTypes: detail.batch_document_types,
      ocrByType: detail.ocr_by_type,
      classification: detail.classification,
      fileName: name
    })
  ) {
    return false
  }
  if (detail.invoice_workflow === 'NON_PO') return true
  if (detail.po_number) return false
  if (isNonPoInvoice(detail)) return true
  const hdr = detail.ocr?.header || {}
  const poFromBatch =
    detail.ocr_by_type?.po?.header?.poNumber ||
    detail.ocr_by_type?.berita_acara?.header?.poNumber ||
    null
  return (
    resolveBatchInvoiceWorkflow(
      { ...hdr, poNumber: hdr.poNumber || detail.po_number || poFromBatch },
      detail.po_number || poFromBatch,
      {
        fileName: name,
        batchDocumentTypes: detail.batch_document_types,
        ocrByType: detail.ocr_by_type,
        classification: detail.classification
      }
    ) === 'NON_PO'
  )
}

/**
 * Prepare OCR detail for navigation: persist to client store for listing,
 * validate PO bundles when possible.
 */
export async function prepareUploadInvoiceDetail(detail, { fileName } = {}) {
  if (!detail) return { detail: null, id: null, isNonPo: false }

  const uploadFileName = fileName || detail.file_name || detail.fileName || ''
  const isNonPo = isNonPoUploadDetail(detail, uploadFileName)
  let prepared = { ...detail }
  const documentId =
    prepared.validation?.documentId || prepared.ocr?.documentId || null

  if (isNonPo) {
    prepared.invoice_workflow = 'NON_PO'
    prepared.po_number = null
    prepared.overall = prepared.overall || 'pass'
    prepared.validation = {
      ...(prepared.validation || {}),
      ...buildNonPoValidationState(prepared)
    }
  } else {
    prepared.invoice_workflow =
      prepared.invoice_workflow ||
      resolveBatchInvoiceWorkflow(prepared.ocr?.header, prepared.po_number, {
        fileName: uploadFileName,
        batchDocumentTypes: prepared.batch_document_types,
        ocrByType: prepared.ocr_by_type,
        classification: prepared.classification
      })

    if (documentId || canRunBundleValidation(prepared)) {
      try {
        const result = await validateApDocument(documentId, prepared)
        if (result) {
          prepared.validation = buildValidationState(result, {
            confidence: prepared.ocr_confidence,
            documentId,
            header: prepared.ocr?.header,
            inv: prepared,
            ...buildValidationMapOptions(prepared, prepared.ocr?.header)
          })
        }
      } catch {
        // Detail page will retry bundle validation on load.
      }
    }
  }

  const persisted = persistUploadedInvoice(prepared, { fileName: uploadFileName })
  prepared = { ...persisted.detail, id: persisted.id }

  return { detail: prepared, id: persisted.id, isNonPo }
}

export function buildInvoiceDetailPath(userType, id) {
  return `/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(id))}`
}
