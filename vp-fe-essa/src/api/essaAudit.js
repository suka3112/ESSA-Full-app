import axiosInstance from '../services/axiosSetup'

export const ESSA_AUDIT_LOGS = '/essa/audit-logs'
export const ESSA_INVOICE_FIELDS = (id) =>
  `/essa/invoices/${encodeURIComponent(id)}/fields`
export const ESSA_INVOICE_VERIFY = (id) =>
  `/essa/invoices/${encodeURIComponent(id)}/verify`
export const ESSA_INVOICE_APPROVE = (id) =>
  `/essa/invoices/${encodeURIComponent(id)}/approve`
export const ESSA_INVOICE_OVERRIDE = (id) =>
  `/essa/invoices/${encodeURIComponent(id)}/override`

/**
 * @param {Record<string, string|number|undefined|null>} params
 */
export async function fetchEssaAuditLogs(params = {}) {
  const cleaned = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return
    cleaned[key] = value
  })
  const response = await axiosInstance.get(ESSA_AUDIT_LOGS, { params: cleaned })
  return response?.data?.data || { items: [], total: 0, page: 1, pageSize: 25, facets: {} }
}

/**
 * Persist field corrections and write CORRECT / MANUAL_ENTER audit events.
 * @param {string} invoiceId ocr-{documentId} or invoice number
 * @param {{ reasonRemarks: string, fields: Record<string, string|null>|Array, source?: string }} body
 */
export async function correctEssaInvoiceFields(invoiceId, body) {
  const response = await axiosInstance.patch(ESSA_INVOICE_FIELDS(invoiceId), body)
  return response?.data?.data || null
}

/**
 * AP verifies extracted value(s) unchanged — VERIFY audit events.
 * @param {string} invoiceId
 * @param {{ fields: string[]|Array, reasonRemarks?: string, source?: string }} body
 */
export async function verifyEssaInvoiceFields(invoiceId, body) {
  const response = await axiosInstance.post(ESSA_INVOICE_VERIFY(invoiceId), body)
  return response?.data?.data || null
}

export async function approveEssaInvoiceBackend(invoiceId, body) {
  const response = await axiosInstance.post(ESSA_INVOICE_APPROVE(invoiceId), body)
  return response?.data?.data || null
}

export async function overrideEssaValidation(invoiceId, body) {
  const response = await axiosInstance.post(ESSA_INVOICE_OVERRIDE(invoiceId), body)
  return response?.data?.data || null
}
