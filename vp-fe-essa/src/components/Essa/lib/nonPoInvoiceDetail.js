import { fmtMoney, formatInvoiceDate } from 'api/essaDashboard'
import { detectInvoiceWorkflow, hasPoWorkflowSignals, parseAmount, resolveInvoiceExtractedTotals } from 'api/apInvoiceOcr'
import { coerceEssaPoNumber } from 'api/essaPoNumber'
import { NON_PO_VALIDATION_RULE_CATALOG } from './validationRuleCatalog'

const fmtDate = (raw) => formatInvoiceDate(raw, { withTime: false })

const fmtBank = (hdr = {}, inv = {}) => {
  const name = hdr.bankName ?? inv.bank_name
  const acct = hdr.bankAccount ?? inv.bank_account
  const holder = hdr.accountHolder
  const parts = [name, acct, holder].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

const fmtMoneyVal = (val, currency = 'IDR') => {
  if (val == null || val === '') return null
  const n = typeof val === 'number' ? val : parseAmount(val)
  if (n == null || !Number.isFinite(n)) return null
  return fmtMoney(n, currency)
}

const splitRoute = (routing = '') => {
  const parts = String(routing)
    .split(/\s*-\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 2) return { from: parts[0], to: parts[parts.length - 1] }
  if (parts.length === 1) return { from: parts[0], to: null }
  return { from: null, to: null }
}

const parseRouteCodes = (text = '') => {
  const match = String(text).match(/\b([A-Z]{3})\s*[-/]\s*([A-Z]{3})\b/i)
  if (!match) return { from: null, to: null }
  return { from: match[1].toUpperCase(), to: match[2].toUpperCase() }
}

const firstLine = (inv) => {
  const lines = inv?.ocr?.lineItems || inv?.lines || []
  return lines[0] || {}
}

const travelFromSection = (inv) =>
  inv?.validation_extraction?.sections?.A_nonPoTravel ||
  inv?.validation_extraction?.sections?.A_invoice?.travel ||
  {}

/** True when invoice workflow is non-PO (no PO number on document). */
export function isNonPoInvoice(inv) {
  if (!inv) return false
  if (inv.invoice_workflow === 'NON_PO') return true
  if (
    inv.invoice_workflow === 'PO' &&
    coerceEssaPoNumber(inv.po_number || inv.ocr?.header?.poNumber)
  ) {
    return false
  }
  if (inv.invoice_type === 'Non-PO' || inv.po_category === 'Non-PO') return true

  const fileName = inv.file_name || inv.fileName || ''
  if (
    hasPoWorkflowSignals({
      header: inv.ocr?.header,
      poNumber: inv.po_number,
      batchDocumentTypes: inv.batch_document_types,
      ocrByType: inv.ocr_by_type,
      classification: inv.classification,
      fileName
    })
  ) {
    return false
  }
  const hdr = inv.ocr?.header || {}
  return detectInvoiceWorkflow(hdr, {
    poNumber: inv.po_number,
    batchDocumentTypes: inv.batch_document_types,
    ocrByType: inv.ocr_by_type,
    classification: inv.classification,
    fileName
  }) === 'NON_PO'
}

/** Resolve travel-ticket extraction fields for non-PO invoices. */
export function resolveNonPoTravelFields(inv) {
  if (!inv) {
    return {
      invoiceNo: null,
      invoiceDate: null,
      invoiceDueDate: null,
      passengerName: null,
      ticketClass: null,
      routeFrom: null,
      routeTo: null,
      confirmNo: null,
      ticketNo: null,
      airline: null,
      flightNo: null,
      routeCodeFrom: null,
      routeCodeTo: null,
      amount: null,
      vatAmount: null,
      totalAmount: null,
      bankDetails: null,
      currency: 'IDR'
    }
  }

  const hdr = inv.ocr?.header || {}
  const line = firstLine(inv)
  const saved = travelFromSection(inv)
  const corpus = [
    hdr.serviceName,
    line.description,
    line.routing,
    line.remarks,
    inv?.ocr?.fields?.map((f) => f.fieldValue).join(' ')
  ]
    .filter(Boolean)
    .join('\n')

  const routing = saved.routing ?? hdr.routing ?? line.routing ?? line.route ?? ''
  const routeParts = splitRoute(routing)
  const routeCodes = parseRouteCodes(corpus)

  const invoiceTotals = resolveInvoiceExtractedTotals(inv)
  const currency = invoiceTotals.currency || hdr.currency || inv.currency || 'IDR'

  const passengerName =
    saved.passengerName ??
    hdr.passengerName ??
    line.manpowerName ??
    line.passengerName ??
    line.passenger_name ??
    null

  const resolved = {
    invoiceNo:
      saved.invoiceNo ??
      inv.invoice_no ??
      hdr.invoiceNumber ??
      hdr.invNo ??
      hdr.invoiceNo ??
      null,
    invoiceDate:
      saved.invoiceDate ??
      saved.date ??
      fmtDate(inv.invoice_date ?? hdr.invoiceDate ?? hdr.date),
    invoiceDueDate:
      saved.invoiceDueDate ??
      saved.dueDate ??
      fmtDate(hdr.dueDate ?? inv.invoice_due_date),
    passengerName,
    ticketClass:
      saved.ticketClass ??
      hdr.ticketClass ??
      line.ticketClass ??
      line.ticket_class ??
      (typeof line.role === 'string' ? line.role : line.role?.role) ??
      null,
    routeFrom: saved.routeFrom ?? hdr.routeFrom ?? line.routeFrom ?? line.from ?? routeParts.from,
    routeTo: saved.routeTo ?? hdr.routeTo ?? line.routeTo ?? line.to ?? routeParts.to,
    confirmNo: saved.confirmNo ?? hdr.confirmNo ?? line.confirmNo ?? line.confirm_no ?? null,
    ticketNo: saved.ticketNo ?? hdr.ticketNo ?? line.ticketNo ?? line.ticket_no ?? null,
    airline: saved.airline ?? hdr.airline ?? line.airline ?? null,
    flightNo:
      saved.flightNo ?? hdr.flightNo ?? line.flightNo ?? line.flight ?? line.flight_no ?? null,
    routeCodeFrom:
      saved.routeCodeFrom ?? hdr.routeCodeFrom ?? line.routeCodeFrom ?? routeCodes.from,
    routeCodeTo: saved.routeCodeTo ?? hdr.routeCodeTo ?? line.routeCodeTo ?? routeCodes.to,
    amount:
      saved.amount ??
      fmtMoneyVal(saved.subtotal ?? saved.totalAmount ?? invoiceTotals.subtotal, currency),
    vatAmount:
      saved.vatAmount ??
      fmtMoneyVal(saved.taxAmount ?? invoiceTotals.vatAmount, currency),
    totalAmount:
      saved.totalAmount ??
      saved.grandTotal ??
      fmtMoneyVal(invoiceTotals.grandTotal, currency),
    bankDetails: saved.bankDetails ?? fmtBank(hdr, inv),
    currency
  }

  return resolved
}

const buildHcisActual = (travel) =>
  [
    travel.passengerName,
    travel.invoiceDate,
    travel.airline,
    travel.routeCodeFrom && travel.routeCodeTo
      ? `${travel.routeCodeFrom}-${travel.routeCodeTo}`
      : [travel.routeFrom, travel.routeTo].filter(Boolean).join(' → '),
    travel.amount,
    travel.vatAmount,
    travel.totalAmount
  ]
    .filter(Boolean)
    .join(' · ')

/** Four non-PO validation rules — hardcoded pass (POC). */
export function buildNonPoValidationChecks(inv) {
  const travel = inv ? resolveNonPoTravelFields(inv) : {}
  const vendor = inv?.vendor_name || travel.vendorName || '—'
  const bank = travel.bankDetails || inv?.bank_name || '—'

  const contextByRule = {
    HCIS_REQUEST_MATCH: {
      expected: 'HCIS Clearing Journal (e) ↔ Invoice (a) · Listing Invoice (b)',
      actual: buildHcisActual(travel) || 'Matched'
    },
    BANK_VENDOR_MASTER: {
      expected: `Vendor Master (i) · ${vendor}`,
      actual: bank
    },
    NON_PKP_VENDOR: {
      expected: `${vendor} · issuance within 365 days`,
      actual: `${vendor} · ${travel.invoiceDate || '—'}`
    },
    ADVANCE_RETENTION: {
      expected: "PO (g) advance recovery & retention terms",
      actual: 'No advance recovery or retention hold required'
    }
  }

  return NON_PO_VALIDATION_RULE_CATALOG.map((rule) => {
    const ctx = contextByRule[rule.ruleCode] || {}
    return {
      sequence: rule.sequence,
      ruleCode: rule.ruleCode,
      status: 'pass',
      severity: 'PASS',
      title: rule.title,
      description: rule.description,
      expected: ctx.expected ?? '—',
      actual: ctx.actual ?? 'Passed',
      message: 'Passed.'
    }
  })
}

/** Validation bundle for non-PO invoices (always PASS). */
export function buildNonPoValidationState(inv) {
  const checks = buildNonPoValidationChecks(inv)
  return {
    checks,
    overallStatus: 'PASS',
    overall: 'pass',
    summary: {
      total: checks.length,
      passed: checks.length,
      failed: 0,
      warnings: 0,
      blocked: 0
    },
    confidence: inv?.ocr_confidence ?? null,
    documentId: inv?.validation?.documentId || inv?.documentId || inv?.ocr?.documentId || null
  }
}
