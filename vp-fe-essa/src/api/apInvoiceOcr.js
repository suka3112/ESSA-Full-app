import axios from 'axios'
import axiosInstance from '../services/axiosSetup'
import { createExtractionTrace, logExtractCheckpoint } from './extractionTrace'
import { fetchPromptTextByInvoiceTypeCode } from './extractionPromptConfig'
import { deriveValidationOverallStatus, resolveRateValidationStatus } from '../components/Essa/lib/validationRuleCatalog'
import {
  invoiceTypeCodeFromLabel,
  resolveInvoiceTypeLabel
} from './essaInvoiceType'
import { coerceEssaPoNumber } from './essaPoNumber'
import {
  bankAccountsMatch,
  normalizeBankAccountNumber
} from './bankAccountMatch'

export { coerceEssaPoNumber, bankAccountsMatch, normalizeBankAccountNumber }

export const AP_INVOICE_OCR_EXTRACT = '/ap-invoice-ocr/extract'
export const AP_INVOICE_OCR_HEALTH = '/ap-invoice-ocr/ocr-health'
export const AP_INVOICE_OCR_UPLOADS = '/ap-invoice-ocr/uploads'
export const AP_INVOICE_OCR_SES_RESOLVE = '/ap-invoice-ocr/ses-documents/resolve'
export const AP_INVOICE_NUMBER_EXISTS = '/ap-invoice-ocr/invoice-number/exists'
export const AP_INVOICE_OCR_SECTION_FILE = '/ap-invoice-ocr/ocr-uploads'
export const AP_INVOICE_OCR_EMAIL_INTAKE_SIMULATE = '/ap-invoice-ocr/email-intake/simulate'
export const AP_INVOICE_OCR_EMAIL_INTAKE_INBOUND = '/ap-invoice-ocr/email-intake/inbound'
export const AP_INVOICE_OCR_EMAIL_INTAKE_POLL = '/ap-invoice-ocr/email-intake/poll'
export const AP_INVOICE_OCR_DOCUMENT_REQUESTS = '/ap-invoice-ocr/document-requests'
export const AP_INVOICE_OCR_SHAREPOINT_INTAKE_SIMULATE =
  '/ap-invoice-ocr/sharepoint-intake/simulate'
export const AP_INVOICE_OCR_SHAREPOINT_INTAKE_INBOUND =
  '/ap-invoice-ocr/sharepoint-intake/inbound'
export const AP_INVOICE_OCR_SHAREPOINT_INTAKE_POLL = '/ap-invoice-ocr/sharepoint-intake/poll'

const normalizeSourceChannel = (value) => {
  const channel = String(value || 'UPLOAD').toUpperCase()
  if (channel === 'EMAIL') return 'EMAIL'
  if (channel === 'SHAREPOINT') return 'SHAREPOINT'
  return 'UPLOAD'
}

/** Authenticated API path for a backend-stored SES PDF (fetch as blob in the UI). */
export const buildBackendSesPdfApiPath = (sesNo) =>
  sesNo ? `${AP_INVOICE_OCR_SES_RESOLVE.replace('/resolve', '')}/${encodeURIComponent(sesNo)}/file` : null

export const fetchSesDocumentFile = async (sesNo) => {
  const path = buildBackendSesPdfApiPath(sesNo)
  if (!path) return null
  const response = await axiosInstance.get(path, { responseType: 'blob' })
  return response?.data instanceof Blob ? response.data : null
}

/** Rewrite split-section PDF URLs to the authenticated backend proxy. */
export const rewriteOcrSectionPdfUrl = (url) => {
  if (!url || typeof url !== 'string') return url
  const normalized = url.replace(/\\/g, '/')
  const match = normalized.match(
    /(?:https?:\/\/[^/]+\/)?uploads\/(upload_\d+_\d+)\/([^/?#]+\.pdf)/i
  )
  if (!match) return url
  return `${AP_INVOICE_OCR_SECTION_FILE}/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`
}

export const fetchOcrSectionFile = async (url) => {
  const path = rewriteOcrSectionPdfUrl(url)
  if (!path || typeof path !== 'string') return null
  const response = await axiosInstance.get(path, { responseType: 'blob' })
  return response?.data instanceof Blob ? response.data : null
}

export const resolveBackendSesDocument = async ({
  sesNo,
  poNumber,
  periodStart,
  periodEnd
} = {}) => {
  try {
    const response = await axiosInstance.get(AP_INVOICE_OCR_SES_RESOLVE, {
      params: {
        sesNo: sesNo || undefined,
        poNumber: poNumber || undefined,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined
      }
    })
    return response?.data?.data || null
  } catch {
    return null
  }
}

/** Attach backend SES metadata + PDF tab when SES is not part of the uploaded bundle. */
export const mergeBackendSesIntoInvoice = (inv, backendSes) => {
  if (!inv || !backendSes?.sesNo) return inv

  const sections = { ...(inv.validation_extraction?.sections || {}) }
  sections.K_ses = {
    ...(sections.K_ses || {}),
    ...(backendSes.section || {})
  }

  const batchTypes = [...new Set([...(inv.batch_document_types || []), 'ses'])]
  const pdfPath = buildBackendSesPdfApiPath(backendSes.sesNo)
  const extractDocPdfs = {
    ...(inv.extract_doc_pdfs || {}),
    ...(pdfPath ? { K_ses: pdfPath } : {})
  }

  const ocrByType = {
    ...(inv.ocr_by_type || {}),
    ses: {
      documentType: 'ses',
      header: backendSes.header || {},
      lineItems: backendSes.lineItems || [],
      structuredFields: backendSes.header || null
    }
  }

  return {
    ...inv,
    backend_ses: backendSes,
    ses_no: backendSes.sesNo,
    validation_extraction: {
      ...(inv.validation_extraction || {}),
      sections
    },
    batch_document_types: batchTypes,
    extract_doc_pdfs: Object.keys(extractDocPdfs).length ? extractDocPdfs : undefined,
    ocr_by_type: ocrByType,
    validation: {
      ...(inv.validation || {}),
      ses_no: backendSes.sesNo
    }
  }
}

export const enrichInvoiceWithBackendSes = async (inv) => {
  if (!inv || inv.backend_ses?.sesNo) return inv
  if (inv.invoice_workflow === 'NON_PO' || inv.invoice_type === 'Non-PO' || inv.po_category === 'Non-PO') {
    return inv
  }
  if (inv.batch_document_types?.includes('ses') && inv.extract_doc_pdfs?.K_ses) return inv

  const sections = inv.validation_extraction?.sections || {}
  const berita = sections.D_beritaAcara || {}
  const backendSes =
    (await resolveBackendSesDocument({
      sesNo: inv.ses_no || inv.validation?.ses_no || inv.ocr?.header?.sesNo,
      poNumber: inv.po_number || inv.ocr?.header?.poNumber,
      periodStart: berita.periodStart,
      periodEnd: berita.periodEnd
    })) || null

  return backendSes ? mergeBackendSesIntoInvoice(inv, backendSes) : inv
}

export const OCR_DOCUMENT_TYPES = [{ value: 'invoice', label: 'Invoice (Non-PO/PO-based)' }]

const PO_WORKFLOW_DOC_TYPES = new Set(['po', 'po_appendix'])

const PO_CLASSIFICATION_CATEGORY_IDS = new Set([
  'purchase_order',
  'purchase_order_appendix',
  'purchase_order_terms',
  'purchase_order_special_terms',
  'po',
  'po_header',
  'po_appendix'
])

/** Collect unique category slugs from an OCR `classification` block. */
export const collectClassificationCategoryIds = (classification) => {
  if (!classification || typeof classification !== 'object') return []

  const ids = new Set()
  const add = (value) => {
    const token = normalizeDocTypeToken(value)
    if (token) ids.add(token)
  }

  for (const cat of classification.categories || []) add(cat.categoryId)
  for (const grp of classification.categoryGroups || []) add(grp.categoryId)
  for (const doc of classification.documents || []) add(doc.categoryId)
  for (const page of classification.pages || []) {
    add(page.documentType)
    add(page.categoryId)
  }

  return [...ids]
}

const isPoClassificationCategoryId = (categoryId) => {
  const token = normalizeDocTypeToken(categoryId)
  if (!token) return false
  if (PO_CLASSIFICATION_CATEGORY_IDS.has(token)) return true
  if (!token.includes('purchase_order') && token !== 'po' && token !== 'po_header') return false
  return (
    token === 'purchase_order' ||
    token === 'po' ||
    token === 'po_header' ||
    token.includes('appendix') ||
    token.includes('term')
  )
}

/** Map classification categories to canonical ESSA document types for batch metadata. */
export const inferBatchTypesFromClassification = (classification) => {
  const types = []
  for (const id of collectClassificationCategoryIds(classification)) {
    const canon = normalizeValidationDocumentType(id)
    if (canon) types.push(canon)
  }
  return [...new Set(types)]
}

/**
 * True when the upload is a PO / manpower invoice bundle — from extracted PO number,
 * classified PO / PO appendix sections, or extracted po / po_appendix documents.
 */
export const hasPoWorkflowSignals = ({
  header = {},
  batchDocumentTypes = [],
  ocrByType = {},
  classification = null,
  poNumber = null,
  fileName = ''
} = {}) => {
  const resolvedPo =
    poNumber ?? header?.poNumber ?? header?.po_number ?? null
  if (coerceEssaPoNumber(resolvedPo)) return true

  const poFromFileName = extractPoNumber(String(fileName || ''))
  if (poFromFileName) return true

  const docTypes = new Set(
    (batchDocumentTypes || [])
      .map((type) => normalizeValidationDocumentType(type) || type)
      .filter(Boolean)
  )
  for (const type of Object.keys(ocrByType || {})) {
    const canon = normalizeValidationDocumentType(type) || type
    if (canon) docTypes.add(canon)
  }
  if ([...docTypes].some((type) => PO_WORKFLOW_DOC_TYPES.has(type))) return true

  return collectClassificationCategoryIds(classification).some(isPoClassificationCategoryId)
}

/** PO when a PO number or PO-classified sections are present; otherwise non-PO workflow. */
export const detectInvoiceWorkflow = (header = {}, context = {}) =>
  hasPoWorkflowSignals({ header, ...context }) ? 'PO' : 'NON_PO'

/** Resolve PO vs non-PO for a merged upload batch (filename hints + PO across sections). */
export const resolveBatchInvoiceWorkflow = (
  primaryHeader = {},
  batchPoNumber = null,
  context = {}
) => {
  const fileName = String(context.fileName || context.file_name || '')
  if (isPoDemoUploadFileName(fileName)) return 'PO'
  if (isNonPoTravelUploadFileName(fileName)) return 'NON_PO'

  if (
    hasPoWorkflowSignals({
      header: primaryHeader,
      poNumber: batchPoNumber,
      batchDocumentTypes: context.batchDocumentTypes,
      ocrByType: context.ocrByType,
      classification: context.classification,
      fileName
    })
  ) {
    return 'PO'
  }

  if (primaryHeader.invoiceWorkflow === 'NON_PO' || primaryHeader.demoScenario === 'ocrold') {
    return 'NON_PO'
  }

  return 'NON_PO'
}

/** Map remote extract API / classifier section types to internal ESSA document types. */
export const EXTRACT_API_DOCUMENT_TYPE_MAP = {
  // Receipt / kwitansi — keep separate from commercial invoice
  kwitansi: 'receipt',
  kwintansi: 'receipt',
  receipt: 'receipt',

  // Commercial invoice
  commercial_invoice: 'invoice',
  billing_invoice: 'invoice',
  credit_note: 'invoice',
  debit_note: 'invoice',
  manpower_supply_claim: 'invoice',

  // Tax invoice
  faktur_pajak: 'tax_invoice',
  faktur: 'tax_invoice',
  efaktur: 'tax_invoice',
  e_faktur: 'tax_invoice',
  vat_invoice: 'tax_invoice',

  // Manhour summary (align with ocr-demo classifier synonyms)
  summary_calculation: 'manhour_summary',
  summary_calculation_manhour: 'manhour_summary',
  summary_calculation_manhour_claim: 'manhour_summary',
  summary_calculation_manpower_claim: 'manhour_summary',
  summary_calculation_overtime_claim: 'manhour_summary',
  summary_of_claim: 'manhour_summary',
  manhour_summary_sheet: 'manhour_summary',

  // Timesheet & attendance
  daily_timesheet: 'timesheet',
  daily_time_sheet: 'timesheet',
  time_sheet: 'timesheet',
  daily_attendance: 'attendance',
  attendance_sheet: 'attendance',
  attendance_log: 'attendance',
  biometric: 'attendance',

  // Notice / kwitansi cover
  notice: 'notice',

  // PO
  purchase_order: 'po',
  purchase_order_appendix: 'po_appendix',
  purchase_order_terms: 'po_appendix',
  purchase_order_special_terms: 'po_appendix',

  // SES
  service_entry_sheet: 'ses',

  // Non-submission sections (terms, cover pages, etc.)
  general_terms_conditions: null,
  other: null,
  unknown: null
}

const CANONICAL_VALIDATION_DOC_TYPES = new Set([
  'invoice',
  'receipt',
  'tax_invoice',
  'notice',
  'berita_acara',
  'manhour_summary',
  'timesheet',
  'attendance',
  'po',
  'po_appendix',
  'ses'
])

const normalizeDocTypeToken = (rawType) =>
  String(rawType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

/** True when an extract API document row is the purchase-order section. */
export const isPurchaseOrderExtractDocument = (doc) => {
  if (!doc || typeof doc !== 'object') return false
  const tokens = [doc.type, doc.schemaId, doc.documentType, doc.rawType, doc.document_type]
    .map(normalizeDocTypeToken)
    .filter(Boolean)
  return tokens.some((t) => t === 'purchase_order' || t === 'po' || t === 'po_header')
}

/** Find the purchase-order document in a classified extract `documents[]` array. */
export const findPurchaseOrderExtractDocument = (documents = []) =>
  documents.find(isPurchaseOrderExtractDocument) || null

/**
 * Map OCR classifier / API section ids to canonical ESSA document types used by
 * validation, extract tabs, and DOC_COMPLETENESS.
 */
export const normalizeValidationDocumentType = (rawType) => {
  const type = normalizeDocTypeToken(rawType)
  if (!type) return null
  if (CANONICAL_VALIDATION_DOC_TYPES.has(type)) return type

  if (Object.prototype.hasOwnProperty.call(EXTRACT_API_DOCUMENT_TYPE_MAP, type)) {
    return EXTRACT_API_DOCUMENT_TYPE_MAP[type]
  }

  if (type.includes('faktur') || type.includes('tax_invoice')) return 'tax_invoice'
  if (type.includes('kwitansi') || type === 'receipt') return 'receipt'
  if (type.includes('commercial_invoice')) return 'invoice'
  if (type.includes('berita_acara') || type === 'bap' || type.includes('work_progress')) {
    return 'berita_acara'
  }
  if (type.includes('summary_calculation') || type.includes('manhour_summary')) {
    return 'manhour_summary'
  }
  if (type.includes('manpower_supply')) return 'invoice'
  if (type.includes('purchase_order') && (type.includes('term') || type.includes('appendix'))) {
    return 'po_appendix'
  }
  if (type.includes('purchase_order') || type === 'po_header') return 'po'
  if (type.includes('timesheet') || type.includes('time_sheet')) return 'timesheet'
  if (type.includes('attendance') || type.includes('biometric')) return 'attendance'
  if (type.includes('service_entry') || type === 'ses_sheet') return 'ses'
  if (type.includes('general_terms') || type.includes('terms_conditions')) return null

  return null
}

export const OCR_FIELD_LABELS_BY_TYPE = {
  tax_invoice: {
    taxInvoiceNumber: 'Tax Invoice Number',
    invoiceDate: 'Date',
    taxAmount: 'VAT Amount (Jumlah PPN)'
  },
  berita_acara: {
    poNumber: 'PO Number',
    periodStart: 'Period Start',
    periodEnd: 'Period End',
    manhourCompletionPct: 'MH % Complete',
    thisManhours: 'This Man Hours',
    serviceName: 'Service Name',
    manpowerRoles: 'Manpower Roles',
    manpowerNames: 'Manpower Names'
  }
}

export const OCR_FIELD_LABELS = {
  invoiceNumber: 'Invoice Number',
  invoiceDate: 'Invoice Date',
  dueDate: 'Due Date',
  paymentTerms: 'Payment Terms',
  manhourUnitRate: 'Manhour Unit Rate Calculation',
  totalAmount: 'Total Amount',
  taxAmount: 'VAT Amount',
  taxInvoiceNumber: 'Tax Invoice Number',
  grandTotal: 'Grand Total',
  bankName: 'Bank Name',
  bankAccount: 'Bank Account',
  bankBranch: 'Bank Branch',
  accountHolder: 'Account Holder',
  serviceName: 'Service Name (Activity Name)',
  noticeDate: 'Notice Date',
  noticeNumber: 'Notice Number',
  description: 'Description',
  poNumber: 'PO Number',
  periodStart: 'Period Start',
  periodEnd: 'Period End',
  manhourCompletionPct: 'Manhour % Completion',
  thisManhours: 'This Man Hours',
  preparedBy: 'Prepared By',
  reviewedBy: 'Reviewed By',
  acknowledgedBy: 'Acknowledged By',
  approvedBy: 'Approved By',
  totalRegularManhour: 'Total Regular Manhour',
  totalOvertimeManhour: 'Total Overtime Manhour',
  manpowerCount: 'Manpower Count',
  site: 'Site',
  poDate: 'PO Date',
  vendorName: 'Vendor Name',
  vendorAddress: 'Vendor Address',
  vendorTaxId: 'Vendor Tax ID',
  vendorCode: 'Vendor Code',
  buyerName: 'Buyer Name',
  projectName: 'Project Name',
  requisitionNo: 'Requisition No',
  deliveryDate: 'Delivery Date',
  serviceStartDate: 'Service Start Date',
  serviceEndDate: 'Service End Date',
  incoterms: 'Incoterms',
  sesNo: 'SES Number',
  prNo: 'PR Number',
  transactionDate: 'Transaction Date',
  sesDescription: 'SES Description',
  poValue: 'PO Value',
  totalSesValue: 'Total SES Value',
  totalSesValueUsd: 'Total SES Value (USD)',
  remainingPoBalance: 'Remaining PO Balance',
  currency: 'Currency',
  regularManhour: 'Regular Manhour',
  overtimeManhour: 'Overtime Manhour',
  username: 'Username',
  manpowerRole: 'Manpower Role',
  subtotal: 'Subtotal',
  lineItemsSubtotal: 'Line Items Subtotal',
  calculatedGrandTotal: 'Calculated Grand Total'
}

/** Computed / internal header keys — never show in extraction UI. */
export const OCR_HEADER_HIDDEN_KEYS = new Set([
  'lineItemsSubtotal',
  'calculatedGrandTotal',
  'totalAmount'
])

/** A. Invoice — fields used for validation (matches extract & validate checklist). */
export const OCR_INVOICE_VALIDATION_HEADER_KEYS = [
  'invoiceNumber',
  'invoiceDate',
  'paymentTerms',
  'manhourUnitRate',
  'subtotal',
  'taxAmount',
  'grandTotal',
  'bankName',
  'bankAccount',
  'bankBranch',
  'accountHolder',
  'serviceName',
  'manpowerRoles'
]

/** PO, vendor, and other document header fields on the commercial invoice. */
export const OCR_INVOICE_DOCUMENT_HEADER_KEYS = [
  'poNumber',
  'dueDate',
  'vendorName',
  'vendorAddress',
  'vendorTaxId',
  'buyerName',
  'currency'
]

export const OCR_INVOICE_VALIDATION_LABELS = {
  invoiceNumber: 'Inv No',
  invoiceDate: 'Date',
  subtotal: 'Total Amount',
  taxAmount: 'VAT Amount',
  manhourUnitRate: 'Manhour Unit Rate Calculation',
  serviceName: 'Service Name (Activity Name)',
  manpowerRoles: 'Roles of Manpower'
}

export const OCR_HEADER_ORDER = {
  invoice: [...OCR_INVOICE_VALIDATION_HEADER_KEYS, ...OCR_INVOICE_DOCUMENT_HEADER_KEYS],
  tax_invoice: ['taxInvoiceNumber', 'invoiceDate', 'taxAmount'],
  notice: [
    'taxInvoiceNumber',
    'noticeDate',
    'taxAmount',
    'noticeNumber',
    'vendorName',
    'description'
  ],
  berita_acara: [
    'poNumber',
    'periodStart',
    'periodEnd',
    'manhourCompletionPct',
    'thisManhours',
    'serviceName',
    'manpowerRoles',
    'manpowerNames'
  ],
  manhour_summary: [
    'poNumber',
    'periodStart',
    'periodEnd',
    'vendorName',
    'projectName',
    'totalRegularManhour',
    'totalOvertimeManhour',
    'manpowerCount',
    'currency'
  ],
  timesheet: ['poNumber', 'periodStart', 'periodEnd', 'vendorName', 'projectName'],
  attendance: ['site', 'periodStart', 'periodEnd', 'vendorName'],
  po: [
    'poNumber',
    'poDate',
    'vendorName',
    'vendorCode',
    'buyerName',
    'projectName',
    'requisitionNo',
    'deliveryDate',
    'serviceStartDate',
    'serviceEndDate',
    'currency',
    'subtotal',
    'taxAmount',
    'totalAmount',
    'paymentTerms',
    'incoterms'
  ],
  po_appendix: [
    'poNumber',
    'poDate',
    'vendorName',
    'vendorCode',
    'buyerName',
    'projectName',
    'currency'
  ],
  ses: [
    'sesNo',
    'poNumber',
    'prNo',
    'transactionDate',
    'vendorName',
    'site',
    'projectName',
    'serviceStartDate',
    'serviceEndDate',
    'poValue',
    'totalSesValue',
    'totalSesValueUsd',
    'remainingPoBalance',
    'currency'
  ]
}

export const OCR_LINE_ITEM_COLUMNS = {
  invoice: [
    { key: 'description', label: 'Description' },
    { key: 'quantity', label: 'Qty' },
    { key: 'unitPrice', label: 'Unit price' },
    { key: 'manhourUnitRate', label: 'Manhour rate' },
    { key: 'amount', label: 'Amount', align: 'end' }
  ],
  tax_invoice: [
    { key: 'serviceName', label: 'Service' },
    { key: 'role', label: 'Role' },
    { key: 'description', label: 'Description' },
    { key: 'quantity', label: 'Qty' },
    { key: 'unitPrice', label: 'Unit price' },
    { key: 'amount', label: 'Amount', align: 'end' }
  ],
  notice: [],
  berita_acara: [
    { key: 'serviceName', label: 'Service' },
    { key: 'role', label: 'Role' },
    { key: 'manpowerName', label: 'Manpower name' },
    { key: 'completionPct', label: '% Complete' },
    { key: 'quantity', label: 'Qty' },
    { key: 'amount', label: 'Amount', align: 'end' }
  ],
  manhour_summary: [
    { key: 'role', label: 'Role' },
    { key: 'manpowerName', label: 'Manpower name' },
    { key: 'regularManhour', label: 'Regular hrs' },
    { key: 'overtimeManhour', label: 'OT hrs' },
    { key: 'unitPrice', label: 'Unit rate (IDR/hr)' },
    { key: 'description', label: 'Notes' }
  ],
  timesheet: [
    { key: 'date', label: 'Date' },
    { key: 'username', label: 'Username' },
    { key: 'role', label: 'Role' },
    { key: 'manpowerName', label: 'Manpower name' },
    { key: 'regularManhour', label: 'Regular hrs' },
    { key: 'overtimeManhour', label: 'OT hrs' }
  ],
  timesheet_display: [
    { key: 'date', label: 'Date' },
    { key: 'username', label: 'Username' },
    { key: 'regularManhour', label: 'Regular Manhour', align: 'end' },
    { key: 'overtimeManhour', label: 'Overtime Manhour', align: 'end' },
    { key: 'role', label: 'Role' },
    { key: 'manpowerName', label: 'Manpower Name' }
  ],
  attendance: [
    { key: 'date', label: 'Date' },
    { key: 'username', label: 'Username' },
    { key: 'event', label: 'Event' }
  ],
  po: [
    { key: 'description', label: 'Description' },
    { key: 'deliveryDate', label: 'Delivery date' },
    { key: 'quantity', label: 'Qty' },
    { key: 'unitPrice', label: 'Unit price' },
    { key: 'amount', label: 'Amount', align: 'end' }
  ],
  po_appendix: [
    { key: 'unitPrice', label: 'Unit Price' },
    { key: 'quantity', label: 'Qty' },
    { key: 'manpowerRole', label: 'Role of Manpower' }
  ],
  ses: [
    { key: 'description', label: 'Description' },
    { key: 'quantity', label: 'Qty' },
    { key: 'lineValue', label: 'Line value', align: 'end' }
  ]
}

const INVOICE_DETAIL_TYPES = new Set(['invoice', 'tax_invoice'])
const OCR_PREVIEW_TYPES = new Set([
  'invoice',
  'tax_invoice',
  'notice',
  'berita_acara',
  'manhour_summary',
  'timesheet',
  'attendance',
  'po',
  'po_appendix',
  'ses'
])

const isBatchDocumentReady = (doc) =>
  (doc?.status === 'done' || doc?.status === 'extracted') && doc?.ocr

export const isOcrInvoiceDocumentType = (documentType) => INVOICE_DETAIL_TYPES.has(documentType)

export const isOcrPreviewDocumentType = (documentType) => OCR_PREVIEW_TYPES.has(documentType)

/** Parse IDR amounts — supports Indonesian dot thousands (e.g. 61.082.745) and comma decimals (e.g. 6.053.245,00). */
export const parseAmount = (value) => {
  if (value == null || value === '') return null

  let s = String(value).replace(/Rp\.?/gi, '').replace(/\s/g, '').trim()
  s = s.replace(/[^\d.,-]/g, '')
  if (!s) return null

  const dotCount = (s.match(/\./g) || []).length
  const commaCount = (s.match(/,/g) || []).length

  if (dotCount > 1) {
    s = s.replace(/\./g, '')
  } else if (commaCount > 1) {
    s = s.replace(/,/g, '')
  } else if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (s.includes(',')) {
    const parts = s.split(',')
    if (parts.length === 2 && parts[1].length <= 2) {
      s = s.replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  }

  // After thousand-dot removal: "6053245,00" still needs comma → decimal conversion
  if (s.includes(',')) {
    const parts = s.split(',')
    if (parts.length === 2 && parts[1].length <= 2) {
      s = `${parts[0]}.${parts[1]}`
    } else {
      s = s.replace(/,/g, '')
    }
  }

  // Indonesian shorthand hourly rates: "60.000" / "40.000" IDR/hr (single dot, thousands)
  if (/^\d{1,3}\.\d{3}$/.test(s)) {
    s = s.replace('.', '')
  }

  const num = Number(s)
  return Number.isFinite(num) ? num : null
}

/** Manhour quantities are hours, not IDR — reject money-scale values (e.g. 5.410.000). */
export const MAX_PLAUSIBLE_MANHOUR_TOTAL = 10000

export const isPlausibleManhour = (value, { max = MAX_PLAUSIBLE_MANHOUR_TOTAL } = {}) => {
  const num = parseAmount(value)
  return num != null && num >= 0 && num <= max
}

/** Parse a manhour cell — comma decimals (178,00) ok; IDR amounts rejected. */
export const parseManhour = (value) => {
  const num = parseAmount(value)
  if (num == null || !Number.isFinite(num)) return null
  if (num > MAX_PLAUSIBLE_MANHOUR_TOTAL) return null
  return num
}

const isManhourQuantityFieldName = (name = '') => {
  const n = normalizeLabelKey(name)
  return !/\bamount\b/.test(n) && !/\bidr\b/.test(n) && !/\brp\b/.test(n)
}

const isManhourSummaryTotalRow = (row = {}) => {
  const tokens = [
    row.manpowerName,
    row.name,
    row.Name,
    row.role,
    row.Position,
    row.position,
    row.description,
    row['No.']
  ]
    .map((value) => String(value ?? '').trim().toUpperCase())
    .filter(Boolean)
  return tokens.some((token) => token === 'TOTAL' || token === 'GRAND TOTAL')
}

const resolveManhourLineOvertimeHours = (line = {}) => {
  const weekday = parseManhour(
    line.overtimeMondaySaturdayManhour ??
      line.overtimeMondaySaturday ??
      line['Overtime Monday-Saturday'] ??
      line['Overtime Monday - Saturday']
  )
  const sunday = parseManhour(
    line.overtimeSundayHolidayManhour ??
      line.overtimeSundayPublicHoliday ??
      line['Overtime Sunday & Public Holiday']
  )
  if (weekday != null || sunday != null) return (weekday ?? 0) + (sunday ?? 0)
  return parseManhour(line.overtimeManhour) ?? 0
}

/** Coerce OCR/header values to a safe display string (never a raw object). */
export const formatOcrDisplayValue = (value) => {
  if (value == null || value === '') return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    const parts = value.map(formatOcrDisplayValue).filter(Boolean)
    return parts.length ? parts.join(', ') : null
  }
  if (typeof value === 'object') {
    if (value.bankName || value.bankAccount || value.bankBranch || value.accountHolder) {
      return [value.bankName, value.bankBranch, value.bankAccount, value.accountHolder]
        .filter(Boolean)
        .join(' · ')
    }
    if (value.role != null || value.name != null) {
      return [value.role, value.name].filter(Boolean).join(' · ')
    }
    const nested = Object.values(value)
      .map(formatOcrDisplayValue)
      .filter(Boolean)
    return nested.length ? nested.join(' · ') : null
  }
  return String(value)
}

const formatManhourNumeric = (value) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  })

/** Weekday OT + Sunday/holiday OT from hour columns only (never IDR amount columns). */
export const combineManhourSummaryOvertime = (item = {}) => {
  const hours = resolveManhourLineOvertimeHours(item)
  if (hours > 0) return formatManhourNumeric(hours)

  const regular = parseManhour(item.regularManhour ?? item.actualMhr ?? item['Actual Mhr'])
  const totalActual = parseManhour(item.totalActualManhour ?? item.totalManhour ?? item['Total Actual Mhr'])
  if (regular != null && totalActual != null) {
    const derived = totalActual - regular
    if (derived >= 0) return formatManhourNumeric(derived)
  }

  const existing = parseManhour(item.overtimeManhour)
  return existing != null ? formatManhourNumeric(existing) : (item.overtimeManhour ?? null)
}

/** Count personnel rows on Summary Calculation Manhour (excludes total/summary rows). */
export const countManhourSummaryWorkers = (lineItems = []) =>
  (lineItems || []).filter((row) => {
    const name = coerceNullish(row?.manpowerName ?? row?.name)
    const id = coerceNullish(row?.username ?? row?.idNo)
    if (!name && !id) return false

    const hasWork =
      parseAmount(row?.regularManhour ?? row?.actualMhr ?? row?.actualMHR) != null ||
      parseAmount(row?.totalActualManhour ?? row?.totalActualMhr) != null ||
      parseAmount(row?.dayWork) != null ||
      parseAmount(row?.overtimeManhour) != null

    return hasWork || Boolean(name)
  }).length

/** Timesheet daily row: Basic Time → regularManhour, OT Actual → overtimeManhour. */
export const reconcileTimesheetEntryHours = (entry = {}) => {
  const basicTime = entry.basicTime ?? entry.basic_time
  const otActual = entry.otActual ?? entry.ot_actual
  const regularRaw = basicTime ?? entry.regularManhour
  const otRaw = otActual ?? entry.overtimeManhour

  const regularNum = parseAmount(regularRaw)
  const otNum = parseAmount(otRaw)

  return {
    ...entry,
    regularManhour: regularNum != null ? formatManhourNumeric(regularNum) : (regularRaw ?? null),
    overtimeManhour: otNum != null ? formatManhourNumeric(otNum) : (otRaw ?? null)
  }
}

const finalizeTimesheetSheetEntries = (sheet = {}) => {
  const entries = (sheet.entries || []).map(reconcileTimesheetEntryHours)
  const entryRegularSum = entries.reduce(
    (sum, entry) => sum + (parseAmount(entry.regularManhour) ?? 0),
    0
  )
  const entryOtSum = entries.reduce(
    (sum, entry) => sum + (parseAmount(entry.overtimeManhour) ?? 0),
    0
  )

  return {
    ...sheet,
    entries,
    totalRegularManhour:
      entryRegularSum > 0
        ? formatManhourNumeric(entryRegularSum)
        : (sheet.totalRegularManhour ?? sheet.totalBasicTime ?? null),
    totalOvertimeManhour:
      entryOtSum > 0
        ? formatManhourNumeric(entryOtSum)
        : (sheet.totalOvertimeManhour ?? sheet.totalOtActual ?? null)
  }
}

const NULLISH_STRINGS = /^(null|undefined|n\/a|na|-|none)$/i

const coerceNullish = (value) => {
  if (value == null) return null
  const s = String(value).trim()
  if (!s || NULLISH_STRINGS.test(s)) return null
  return s
}

const ESSA_PO_RE = /^4203\d{6}$/

const isLikelyTicketNumber = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return /^\d{10}$/.test(digits) && !ESSA_PO_RE.test(digits)
}

const salvageTicketFromInvalidPo = (header = {}) => {
  const raw = header.poNumber
  const coerced = coerceEssaPoNumber(raw)
  if (coerced) return { ...header, poNumber: coerced }
  const next = { ...header, poNumber: null }
  if (!next.ticketNo && isLikelyTicketNumber(raw)) {
    next.ticketNo = String(raw).replace(/\D/g, '')
  }
  return next
}

const isPoOnlyNumber = (value) => !!coerceEssaPoNumber(value)

const INVOICE_NUMBER_BLOCKLIST = new Set(['invoice', 'date', 'page', 'no', 'number'])

const isLikelyInvoiceNumber = (value) => {
  if (!value || isPoOnlyNumber(value)) return false
  const v = String(value).trim()
  if (INVOICE_NUMBER_BLOCKLIST.has(v.toLowerCase())) return false
  return /[\/\-.]/.test(v) || /[A-Za-z]{2,}/.test(v)
}

const extractPoNumber = (text) => {
  const source = String(text)
  const glued = source.match(/\bpo\s*(?:no\.?|number)?[:\s#-|]*\s*(4203\d{6})\b/i)
  if (glued?.[1]) return glued[1]

  const labeled = source.match(
    /(?:contract\s+order\s+no\.?\s*)?\bpo\s*(?:no\.?|number)?[:\s#-|]*(4203\d{6})\b/i
  )
  if (labeled?.[1]) return labeled[1]

  const nomor = source.match(/nomor\s+po[:\s#-]*(4203\d{6})\b/i)
  if (nomor?.[1]) return nomor[1]

  const beforeAppendix = source.split(/appendix\s*-\s*\d+/i)[0] || source
  const bare = beforeAppendix.match(/\b(4203\d{6})\b/)
  return bare?.[1] || null
}

const PO_HEADER_KNOWN_LABELS = [
  'PO Number',
  'PO Date',
  'Vendor Code',
  'Project Code',
  'Requisition No.',
  'Requisition No',
  'Total Amount',
  'Payment Terms',
  'Delivery Date'
]

const PO_HEADER_LABEL_TO_KEY = {
  'po number': 'poNumber',
  'po date': 'poDate',
  'vendor code': 'vendorCode',
  'project code': 'projectName',
  'requisition no': 'requisitionNo',
  'requisition no.': 'requisitionNo',
  'total amount': 'totalAmount',
  'payment terms': 'paymentTerms',
  'delivery date': 'deliveryDate',
  'terms': 'incoterms'
}

const isSoftNullExtractValue = (value) => {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()
  return !v || v === 'null' || v === 'n/a' || v === '-'
}

const parsePoHeaderSegment = (segment) => {
  const trimmed = String(segment || '').trim()
  if (!trimmed) return null

  const colonMatch = trimmed.match(/^(.+?):\s*(.+)$/)
  if (colonMatch) {
    return { label: colonMatch[1].trim(), value: colonMatch[2].trim() }
  }

  for (const label of PO_HEADER_KNOWN_LABELS) {
    if (trimmed.toLowerCase().startsWith(label.toLowerCase())) {
      return { label, value: trimmed.slice(label.length).trim() }
    }
  }

  if (/^PT\s+/i.test(trimmed)) {
    return { label: 'From', value: trimmed }
  }

  return null
}

/** Parse `poHeaderInformation` blobs separated by `;` or `|`. */
const parsePoHeaderInformation = (blob) => {
  const text = String(blob || '').trim()
  if (!text) return {}

  const parsed = {}
  const segments = text.split(/\s*[;|]\s*/)
  for (const segment of segments) {
    const entry = parsePoHeaderSegment(segment)
    if (!entry || isSoftNullExtractValue(entry.value)) continue

    const key = normalizeLabelKey(entry.label)
    const mapped = PO_HEADER_LABEL_TO_KEY[key]
    if (mapped) {
      parsed[mapped] = entry.value
      continue
    }

    if (entry.label === 'From' && !parsed.buyerName) {
      parsed.buyerName = entry.value.replace(/\s*\(address:.*$/i, '').trim()
    }
  }

  if (!parsed.poNumber) {
    const po = extractPoNumber(text)
    if (po) parsed.poNumber = po
  }

  return parsed
}

const splitPoDeliveryRange = (value) => {
  const text = String(value || '').trim()
  if (!text) return { start: null, end: null }

  const rangeMatch = text.match(/^(.+?)\s*[-–—]\s*(.+)$/)
  if (rangeMatch) {
    return { start: rangeMatch[1].trim(), end: rangeMatch[2].trim() }
  }

  return { start: text, end: null }
}

const isPoDeliveryDateFieldName = (name = '') => {
  const key = String(name)
    .trim()
    .toLowerCase()
    .replace(/[.:]+$/g, '')
    .replace(/\s+/g, ' ')
  return key === 'delivery date' || key === 'deliverydate' || key.includes('delivery date')
}

const applyPoDeliveryRangeToHeader = (header = {}) => {
  const next = { ...header }
  if (!next.deliveryDate) return next

  const deliveryRange = splitPoDeliveryRange(next.deliveryDate)
  if (!next.serviceStartDate && deliveryRange.start) {
    next.serviceStartDate = extractDateFromText(deliveryRange.start) || deliveryRange.start
  }
  if (!next.serviceEndDate && deliveryRange.end) {
    next.serviceEndDate = extractDateFromText(deliveryRange.end) || deliveryRange.end
  }

  return next
}

const extractPoSummaryTotal = (summary) => {
  const text = String(summary || '')
  const match =
    text.match(/total\s+(?:amount|price|value)\s*(?:\([^)]+\))?\s*:?\s*([\d,.]+)/i) ||
    text.match(/\btotal\b\s*:?\s*([\d,.]+)/i)
  return match?.[1] || null
}

/** PO total from OCR header, line sum, or table total row — not the first line only. */
export const resolvePoExtractedTotal = (poOcr = {}) => {
  const header = poOcr?.header || {}
  const lineItems = poOcr?.lineItems || []
  const tables = poOcr?.tables || []

  const headerCandidates = [
    parseAmount(header.poValue),
    parseAmount(header.totalAmount),
    parseAmount(header.totalPrice)
  ].filter((value) => value != null && value > 0)
  if (headerCandidates.length) {
    return Math.max(...headerCandidates)
  }

  let lineSum = 0
  let hasLineAmount = false
  for (const line of lineItems) {
    const amount = parseAmount(line?.amount ?? line?.totalPrice ?? line?.totalAmount)
    if (amount != null && amount > 0) {
      lineSum += amount
      hasLineAmount = true
    }
  }
  if (hasLineAmount && lineSum > 0) {
    return lineSum
  }

  for (const table of tables) {
    const columns = (table.columns || []).map((col) => String(col || '').trim())
    const amountCol = columns.findIndex((col) =>
      /total\s*price|total\s*amount|amount|net\s*amount/i.test(col)
    )
    if (amountCol < 0) continue

    let tableLineSum = 0
    let hasTableLine = false
    for (const row of table.rows || []) {
      if (!Array.isArray(row)) continue
      const isTotalRow = row.some((cell) => /^total$/i.test(String(cell ?? '').trim()))
      const amount = parseAmount(row[amountCol])
      if (isTotalRow) {
        if (amount != null && amount > 0) return amount
      } else if (amount != null && amount > 0) {
        tableLineSum += amount
        hasTableLine = true
      }
    }
    if (hasTableLine && tableLineSum > 0) return tableLineSum
  }

  const summaryTotal = parseAmount(extractPoSummaryTotal(poOcr?.summary))
  if (summaryTotal != null && summaryTotal > 0) {
    return summaryTotal
  }

  return null
}

const applyPoNamedFieldsToHeader = (header, fields = []) => {
  const next = { ...header }

  for (const field of fields) {
    const name = normalizeLabelKey(field?.fieldName || field?.name || field?.label || '')
    const val = coerceNullish(field?.fieldValue ?? field?.value)
    if (val == null || isSoftNullExtractValue(val)) continue

    if ((name === 'po number' || name === 'nomor po') && !next.poNumber) next.poNumber = val
    if (name === 'po date' && !next.poDate) next.poDate = extractDateFromText(val) || val
    if (name === 'vendor code' && !next.vendorCode) next.vendorCode = val
    if ((name === 'requisition no' || name === 'requisition no.') && !next.requisitionNo) {
      next.requisitionNo = val
    }
    if ((name === 'kepada' || name === 'to' || name === 'vendor') && !next.vendorName) {
      next.vendorName = val
    }
    if (
      (name === 'from' || name === 'buyer' || name === 'buyer name' || name === 'bill to' || name === 'kepada yth' || name === 'sold to') &&
      !next.buyerName
    ) next.buyerName = val
    if (isPoDeliveryDateFieldName(name)) {
      if (!next.deliveryDate) next.deliveryDate = val
    }
    if (name === 'tanggal pengiriman' && !next.serviceEndDate) {
      next.serviceEndDate = extractDateFromText(val) || val
    }
    if (
      (name === 'payment terms' || name === 'terms of payment' || name === 'syarat pembayaran' || name === 'cara pembayaran') &&
      !next.paymentTerms
    ) next.paymentTerms = val
    if (
      (name === 'terms' || name === 'delivery terms' || name === 'incoterms' || name === 'syarat pengiriman') &&
      !next.incoterms
    ) next.incoterms = val
    if (
      (name === 'project code' || name === 'project' || name === 'project name' || name === 'nama proyek') &&
      !next.projectName
    ) next.projectName = val
    if ((name === 'total amount' || name === 'total price' || name === 'po value') && !next.totalAmount) {
      next.totalAmount = val
      if (!next.poValue) next.poValue = val
    }
  }

  return next
}

const enrichPoHeaderFields = (header, { fields = [], lineItems = [], source = {} } = {}) => {
  const next = { ...header }

  if (next.poHeaderInformation) {
    Object.assign(next, parsePoHeaderInformation(next.poHeaderInformation))
  }

  Object.assign(next, applyPoNamedFieldsToHeader(next, fields))

  if (!next.description && source?.fields?.description) {
    next.description = coerceNullish(source.fields.description)
  }

  if (!next.deliveryDate && source?.fields?.deliveryDate) {
    next.deliveryDate = coerceNullish(source.fields.deliveryDate)
  }

  Object.assign(next, applyPoDeliveryRangeToHeader(next))

  if (!next.poDate && next.poHeaderInformation) {
    const parsedDate = parsePoHeaderInformation(next.poHeaderInformation).poDate
    if (parsedDate) next.poDate = extractDateFromText(parsedDate) || parsedDate
  }

  if (!next.poNumber && next.poHeaderInformation) {
    const po = extractPoNumber(next.poHeaderInformation)
    if (po) next.poNumber = po
  }

  if (!next.buyerName && next.poHeaderInformation) {
    const buyerMatch = next.poHeaderInformation.match(/\|\s*(PT\s+[^|(]+?)(?:\s*\(|$)/i)
    if (buyerMatch?.[1]) next.buyerName = buyerMatch[1].trim()
  }

  const summaryTotal = extractPoSummaryTotal(source?.summary)
  if (summaryTotal && !next.totalAmount) next.totalAmount = summaryTotal

  const resolvedTotal = resolvePoExtractedTotal({
    header: next,
    lineItems,
    tables: source?.tables || [],
    summary: source?.summary
  })
  if (resolvedTotal != null) {
    next.totalAmount = String(resolvedTotal)
    next.poValue = String(resolvedTotal)
  } else {
    for (const item of lineItems || []) {
      if (!next.totalAmount) {
        const amount = coerceNullish(item?.amount ?? item?.totalAmount ?? item?.totalPrice)
        if (amount) next.totalAmount = amount
      }
      if (!next.currency && item?.currency) next.currency = item.currency
      if (!next.description && item?.description) {
        const shortDesc = String(item.description).split('\n')[0]?.trim()
        if (shortDesc) next.description = shortDesc
      }
    }
    if (next.totalAmount && !next.poValue) next.poValue = next.totalAmount
  }

  if (!next.currency) {
    next.currency =
      extractCurrencyFromMoney(next.totalAmount) ||
      extractCurrencyFromMoney(source?.summary) ||
      'IDR'
  }

  return next
}

const mapManhourSummaryRow = (row = {}) => ({
  manpowerName: row?.name ?? row?.manpowerName ?? null,
  role: row?.role ?? row?.position ?? null,
  username: row?.idNo ?? row?.username ?? null,
  regularManhour: row?.regularManhour ?? row?.actualMhr ?? row?.actualMHR ?? null,
  overtimeMondaySaturday:
    row?.overtimeMondaySaturday ?? row?.overtimeMondaySaturdayManhour ?? null,
  overtimeSundayPublicHoliday:
    row?.overtimeSundayPublicHoliday ?? row?.overtimeSundayHolidayManhour ?? null,
  overtimeManhour: row?.overtimeManhour ?? null,
  totalActualManhour: row?.totalActualMhr ?? row?.totalActualManhour ?? null,
  unitPrice:
    row?.unitPrice ??
    row?.unitPricePerHour ??
    row?.unitPriceHourIDR ??
    row?.['Unit Price / Hour (IDR)'] ??
    null,
  unitPriceHourIDR:
    row?.unitPriceHourIDR ?? row?.unitPricePerHour ?? row?.unitPrice ?? row?.['Unit Price / Hour (IDR)'] ?? null
})

const extractManhourContractRatesFromTables = (tables = []) => {
  let welder = null
  let pipeFitter = null
  let fitter = null

  for (const table of tables) {
    const columns = (table.columns || []).map((col) => String(col || '').trim())
    const rateCol = columns.findIndex((col) =>
      /unit\s*price.*hour|unit\s*price.*\(idr\)/i.test(col)
    )
    if (rateCol < 0) continue

    const posCol = columns.findIndex((col) => /^position$/i.test(col))
    const roleCol =
      posCol >= 0
        ? posCol
        : columns.findIndex((col) => /^role$/i.test(col) || /^position$/i.test(col))

    for (const row of table.rows || []) {
      if (!Array.isArray(row)) continue
      const position = roleCol >= 0 ? String(row[roleCol] || '').trim() : ''
      if (!position || /^total$/i.test(position)) continue
      const rate = parseAmount(row[rateCol])
      if (rate == null) continue
      const upper = position.toUpperCase()
      if (/\bWELDER\b/.test(upper) && !/\bFITTER\b/.test(upper)) {
        welder = welder ?? rate
      } else if (/\bPIPE\s*FITTER\b/.test(upper)) {
        pipeFitter = pipeFitter ?? rate
      } else if (/\bFITTER\b/.test(upper)) {
        fitter = fitter ?? rate
      }
    }
  }

  return { welder, fitter: pipeFitter ?? fitter }
}

const applyManhourNamedFieldsToHeader = (header, fields = []) => {
  const next = { ...header }
  let otWeekday = null
  let otSunday = null

  for (const field of fields) {
    const name = normalizeLabelKey(field?.fieldName || field?.name || field?.label || '')
    const val = coerceNullish(field?.fieldValue ?? field?.value)
    if (val == null || isSoftNullExtractValue(val)) continue

    if (
      isManhourQuantityFieldName(name) &&
      (name.includes('total actual mhr') ||
        name === 'total man hour' ||
        name === 'total actual manhour' ||
        (name.includes('actual mhr') && name.includes('total')))
    ) {
      if (isPlausibleManhour(val) && !next.totalRegularManhour) {
        next.totalRegularManhour = val
      }
    }
    if (
      isManhourQuantityFieldName(name) &&
      (name.includes('total overtime monday') ||
        name.includes('overtime monday saturday') ||
        name.includes('overtime monday - saturday'))
    ) {
      if (isPlausibleManhour(val)) otWeekday = val
    }
    if (
      isManhourQuantityFieldName(name) &&
      (name.includes('total overtime sunday') ||
        name.includes('overtime sunday & public holiday') ||
        (name.includes('overtime sunday') && name.includes('public holiday')))
    ) {
      if (isPlausibleManhour(val)) otSunday = val
    }
    if (name.includes('unit rate') && name.includes('welder')) {
      next.welderUnitRate = val
    }
    if (name.includes('unit rate') && name.includes('pipe') && name.includes('fitter')) {
      next.pipeFitterUnitRate = val
    }
    if (
      name.includes('unit rate') &&
      name.includes('fitter') &&
      !name.includes('pipe')
    ) {
      next.fitterUnitRate = val
    }
  }

  if (!next.totalOvertimeManhour && (otWeekday || otSunday)) {
    const weekday = parseManhour(otWeekday) ?? 0
    const sunday = parseManhour(otSunday) ?? 0
    if (weekday + sunday > 0) {
      next.totalOvertimeManhour = formatManhourNumeric(weekday + sunday)
    }
  }

  if (next.totalOvertimeManhour && !isPlausibleManhour(next.totalOvertimeManhour)) {
    delete next.totalOvertimeManhour
  }
  if (next.totalRegularManhour && !isPlausibleManhour(next.totalRegularManhour)) {
    delete next.totalRegularManhour
  }

  return next
}

const enrichManhourSummaryFields = (header, { fields = [], lineItems = [], source = {} } = {}) => {
  let next = applyManhourNamedFieldsToHeader({ ...header }, fields)
  const nestedHeader = source?.header && typeof source.header === 'object' ? source.header : {}

  if (!next.vendorName) {
    next.vendorName = coerceNullish(next.company ?? nestedHeader.company)
  }
  if (!next.projectName) {
    next.projectName = coerceNullish(next.project ?? nestedHeader.project)
  }
  if (!next.currency) {
    next.currency = coerceNullish(next.currency ?? nestedHeader.currency)
  }

  const periodText = coerceNullish(next.period ?? nestedHeader.period)
  if (periodText) {
    const range = splitPoDeliveryRange(periodText)
    if (!next.periodStart && range.start) next.periodStart = range.start
    if (!next.periodEnd && range.end) next.periodEnd = range.end
    if (!next.period) next.period = periodText
  }

  const scopeText = coerceNullish(next.scope ?? nestedHeader.scope)
  if (!next.poNumber && scopeText) {
    const po = extractPoNumber(scopeText)
    if (po) next.poNumber = po
  }

  const totalRow = (lineItems || []).find((row) => isManhourSummaryTotalRow(row))
  const workerRows = (lineItems || []).filter((row) => !isManhourSummaryTotalRow(row))

  const processedLines = workerRows.map((item) => ({
    ...item,
    overtimeManhour: combineManhourSummaryOvertime(item)
  }))

  const lineRegularSum = processedLines.reduce(
    (sum, item) => sum + (parseManhour(item.regularManhour ?? item.actualMhr) ?? 0),
    0
  )
  if (!next.totalRegularManhour && lineRegularSum > 0) {
    next.totalRegularManhour = formatManhourNumeric(lineRegularSum)
  }
  if (!next.totalRegularManhour && totalRow) {
    const fromTotal = parseManhour(
      totalRow.regularManhour ?? totalRow.actualMhr ?? totalRow['Actual Mhr']
    )
    if (fromTotal != null) next.totalRegularManhour = formatManhourNumeric(fromTotal)
  }

  if (!next.totalOvertimeManhour && totalRow) {
    const fromTotalRow = resolveManhourLineOvertimeHours(totalRow)
    if (fromTotalRow > 0) {
      next.totalOvertimeManhour = formatManhourNumeric(fromTotalRow)
    }
  }

  if (!next.totalOvertimeManhour) {
    const lineOtSum = processedLines.reduce(
      (sum, item) => sum + (parseManhour(item.overtimeManhour) ?? 0),
      0
    )
    if (lineOtSum > 0) {
      next.totalOvertimeManhour = formatManhourNumeric(lineOtSum)
    }
  }

  if (next.totalOvertimeManhour && !isPlausibleManhour(next.totalOvertimeManhour)) {
    next.totalOvertimeManhour = null
  }

  const workerSource =
    processedLines.length > 0
      ? processedLines
      : Array.isArray(source?.manhourSummary)
        ? source.manhourSummary
        : []
  const workerCount = countManhourSummaryWorkers(workerSource)
  if (workerCount > 0) {
    next.manpowerCount = String(workerCount)
  }

  for (const line of workerSource) {
    const rate = parseAmount(
      line?.unitPrice ?? line?.unitPriceHourIDR ?? line?.['Unit Price / Hour (IDR)']
    )
    if (!rate) continue
    const role = String(line?.role ?? line?.Position ?? line?.position ?? '').toUpperCase()
    if (/\bWELDER\b/.test(role) && !/\bFITTER\b/.test(role) && !next.welderUnitRate) {
      next.welderUnitRate = String(rate)
    }
    if (/\bPIPE\s*FITTER\b/.test(role)) {
      next.fitterUnitRate = String(rate)
      next.pipeFitterUnitRate = String(rate)
    } else if (/\bFITTER\b/.test(role) && !next.fitterUnitRate) {
      next.fitterUnitRate = String(rate)
    }
  }

  if (!next.welderUnitRate || !next.fitterUnitRate) {
    const tableRates = extractManhourContractRatesFromTables(source?.tables || [])
    if (!next.welderUnitRate && tableRates.welder != null) {
      next.welderUnitRate = String(tableRates.welder)
    }
    if (!next.fitterUnitRate && tableRates.fitter != null) {
      next.fitterUnitRate = String(tableRates.fitter)
    }
  }

  const noteCorpus = [
    source?.summary,
    nestedHeader.calculation,
    nestedHeader.scope,
    next.calculation,
    next.scope
  ]
    .filter(Boolean)
    .join('\n')
  if (!next.welderUnitRate) {
    const welderMatch = noteCorpus.match(/welder[^0-9]{0,40}([\d.,]+)/i)
    if (welderMatch?.[1]) next.welderUnitRate = String(parseAmount(welderMatch[1]))
  }
  if (!next.fitterUnitRate) {
    const fitterMatch = noteCorpus.match(/(?:pipe\s*fitter|fitter)[^0-9]{0,40}([\d.,]+)/i)
    if (fitterMatch?.[1]) next.fitterUnitRate = String(parseAmount(fitterMatch[1]))
  }
  if (!next.manhourUnitRate && next.welderUnitRate && next.fitterUnitRate) {
    next.manhourUnitRate = `Welder ${next.welderUnitRate} · Fitter ${next.fitterUnitRate}`
  }

  // Detect lump-sum pricing: look for "Price Lumpsum" / "Lump Sum" in note fields first,
  // then fall back to broader corpus (calculation, scope, summary).
  // When found, also parse the largest IDR amount in those notes as lumpSumTotal.
  const lumpNoteText = [next.pricingNote, next.notes].filter(Boolean).join(' ')
  const lumpBroadText = [next.calculation, next.scope, source?.summary].filter(Boolean).join(' ')
  if (/lump\s*sum/i.test(lumpNoteText) || /lump\s*sum/i.test(lumpBroadText)) {
    next.isLumpSum = true
    if (!next.lumpSumTotal) {
      // Extract the largest plausible IDR total from the note text (≥ 100,000)
      const searchText = lumpNoteText || lumpBroadText
      const allNums = [...searchText.matchAll(/\b(\d{1,3}(?:[,.]\d{3})+(?:\.\d+)?|\d{6,}(?:\.\d+)?)\b/g)]
        .map((m) => parseAmount(m[1]))
        .filter((n) => n != null && n >= 100000)
      if (allNums.length) next.lumpSumTotal = Math.max(...allNums)
    }
  }

  return next
}

const isTaxInvoiceSerial = (value) => {
  if (!value) return false
  const digits = String(value).replace(/\s/g, '')
  return /^\d{15,17}$/.test(digits)
}

const extractTaxInvoiceNumber = (text) => {
  const patterns = [
    /(?:kode\s+dan\s+)?nomor\s+seri\s+faktur\s+pajak\s*[:\-]?\s*(\d{10,20})/i,
    /faktur\s+pajak\s*(?:no\.?|number)?\s*[:\-]?\s*(\d{10,20})/i,
    /tax\s+invoice\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/.]+)/i
  ]
  for (const pattern of patterns) {
    const match = String(text).match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

const extractTaxAmount = (text) => {
  const patterns = [
    /jumlah\s+ppn\s*[:\s]*(?:rp\.?\s*)?([0-9][0-9.,\s]*)/i,
    /(?:^|\n)\s*ppn\s*[:\s]*(?:rp\.?\s*)?([0-9][0-9.,\s]*)/im,
    /vat\s*(?:amount|11%)?\s*[:\s]*(?:rp\.?\s*)?([0-9][0-9.,\s]*)/i,
    /taxAmount\s*[:\s]*([0-9][0-9.,\s]*)/i
  ]
  for (const pattern of patterns) {
    const match = String(text).match(pattern)
    if (match?.[1]) {
      const parsed = parseAmount(match[1])
      if (parsed != null) return String(parsed)
      const trimmed = match[1].trim()
      if (trimmed) return trimmed
    }
  }
  return null
}

const extractSesValueUsd = (text) => {
  const patterns = [
    /total\s+ses\s+value\s*\(?usd\)?\s*[:\s]*([0-9][0-9.,]*)/i,
    /ses\s+value\s*\(?usd\)?\s*[:\s]*([0-9][0-9.,]*)/i,
    /value\s*\(?usd\)?\s*[:\s]*([0-9][0-9.,]*)/i,
    /totalSesValueUsd\s*[:\s]*([0-9][0-9.,]*)/i
  ]
  for (const pattern of patterns) {
    const match = String(text).match(pattern)
    if (match?.[1]) {
      const parsed = parseAmount(match[1])
      if (parsed != null) return parsed === 0 ? '0.00' : String(parsed)
    }
  }
  return null
}

const TAX_INVOICE_HEADER_KEYS = ['taxInvoiceNumber', 'invoiceDate', 'taxAmount', 'vatAmount']

const BERITA_ACARA_HEADER_KEYS = [
  'poNumber',
  'periodStart',
  'periodEnd',
  'manhourCompletionPct',
  'thisManhours',
  'serviceName',
  'preparedBy',
  'reviewedBy',
  'acknowledgedBy',
  'approvedBy',
  'manpowerRoles',
  'manpowerNames'
]

const parseBeritaAcaraMetric = (value) => {
  let raw = String(value ?? '')
    .replace(/\s*hours?\s*$/i, '')
    .replace(/%/g, '')
    .trim()
  if (!raw) return null

  // Fix OCR artifact: "7,58.50" should be "758.50" (spurious comma inserted mid-number)
  // Pattern: digit(s), comma, 2 digits, dot, 2 digits — remove the comma
  raw = raw.replace(/^(\d+),(\d{2})\.(\d+)$/, '$1$2.$3')

  const commaMatch = raw.match(/^(\d+),(\d{1,3})$/)
  if (commaMatch) return `${commaMatch[1]}.${commaMatch[2]}`

  const parsed = parseAmount(raw)
  return parsed != null ? String(parsed) : coerceNullish(value)
}

const extractBeritaAcaraProgressFields = (header = {}, tables = [], corpus = '') => {
  const result = {
    manhourCompletionPct: null,
    thisManhours: null,
    previousPeriodPct: null,
    cumulativePct: null,
    previousManhours: null,
    cumulativeManhours: null
  }

  const directPct =
    header.manhourCompletionPct ??
    header.manhourPercentageCompletion ??
    header.thisPeriodCompletion
  if (directPct != null && directPct !== '') {
    result.manhourCompletionPct = parseBeritaAcaraMetric(directPct)
  }

  const directMh = header.thisManhours ?? header.thisPeriodManhours ?? header.thisManHours
  if (directMh != null && directMh !== '') {
    result.thisManhours = parseBeritaAcaraMetric(directMh)
  }

  for (const table of tables) {
    if (!table?.rows?.length) continue
    const headers = (table.headers || []).map((cell) => String(cell ?? '').toLowerCase())
    const previousIdx = headers.findIndex((label) =>
      /previous\s*period|periode\s*sebelumnya/i.test(label)
    )
    const thisPeriodIdx = headers.findIndex((label) =>
      /this\s*period|periode\s*ini|period\s*ini/i.test(label)
    )
    const cumulativeIdx = headers.findIndex((label) => /cumulative|kumulatif/i.test(label))

    for (const row of table.rows) {
      let description, previousCell, thisCell, cumulativeCell
      if (Array.isArray(row) && row.length) {
        description = String(row[0] ?? '').toLowerCase()
        previousCell = previousIdx >= 0 ? row[previousIdx] : row[1]
        thisCell = thisPeriodIdx >= 0 ? row[thisPeriodIdx] : row[2] ?? row[1]
        cumulativeCell = cumulativeIdx >= 0 ? row[cumulativeIdx] : row[3] ?? row[2]
      } else if (row && typeof row === 'object' && !Array.isArray(row)) {
        // Object rows keyed by column name (e.g. {"Description": "Manhours", "This Period": "758,50 Hours"})
        const keys = Object.keys(row)
        const descKey = keys.find((k) => /description|uraian|item/i.test(k)) || keys[0]
        const prevKey = keys.find((k) => /previous\s*period|periode\s*sebelumnya/i.test(k))
        const thisKey = keys.find((k) => /this\s*period|periode\s*ini|period\s*ini/i.test(k))
        const cumKey = keys.find((k) => /cumulative|kumulatif/i.test(k))
        description = String(row[descKey] ?? '').toLowerCase()
        previousCell = prevKey ? row[prevKey] : null
        thisCell = thisKey ? row[thisKey] : null
        cumulativeCell = cumKey ? row[cumKey] : null
      } else {
        continue
      }

      if (/progress|completion|persentase/i.test(description)) {
        if (!result.previousPeriodPct) {
          result.previousPeriodPct = parseBeritaAcaraMetric(previousCell)
        }
        if (!result.manhourCompletionPct) {
          result.manhourCompletionPct = parseBeritaAcaraMetric(thisCell)
        }
        if (!result.cumulativePct) {
          result.cumulativePct = parseBeritaAcaraMetric(cumulativeCell)
        }
      }

      if (/man\s*hours?|manhour|jam\s*kerja/i.test(description)) {
        if (!result.previousManhours) {
          result.previousManhours = parseBeritaAcaraMetric(previousCell)
        }
        if (!result.thisManhours) {
          result.thisManhours = parseBeritaAcaraMetric(thisCell)
        }
        if (!result.cumulativeManhours) {
          result.cumulativeManhours = parseBeritaAcaraMetric(cumulativeCell)
        }
      }
    }
  }

  const text = String(corpus || '')
  const progressStart = text.search(
    /progress\s+as\s+follow|performed\s+the\s+work\s+with\s+the\s+progress|kemajuan\s+pekerjaan/i
  )
  const slice = progressStart >= 0 ? text.slice(progressStart, progressStart + 1400) : text

  if (!result.previousPeriodPct) {
    const match = slice.match(/previous\s*period\s*[:\s]*([0-9][0-9.,]+)\s*%/i)
    if (match?.[1]) result.previousPeriodPct = parseBeritaAcaraMetric(match[1])
  }

  if (!result.manhourCompletionPct) {
    const pctMatch = slice.match(/this\s*period\s*[:\s]*([0-9][0-9.,]+)\s*%/i)
    if (pctMatch?.[1]) {
      result.manhourCompletionPct = parseBeritaAcaraMetric(pctMatch[1])
    }
  }

  if (!result.cumulativePct) {
    const match = slice.match(/cumulative\s*[:\s]*([0-9][0-9.,]+)\s*%/i)
    if (match?.[1]) result.cumulativePct = parseBeritaAcaraMetric(match[1])
  }

  if (!result.previousManhours) {
    const match = slice.match(/previous\s*man\s*hours?\s*[:\s]*([0-9][0-9.,]+)/i)
    if (match?.[1]) result.previousManhours = parseBeritaAcaraMetric(match[1])
  }

  if (!result.thisManhours) {
    const mhMatch = slice.match(/this\s*man\s*hours?\s*[:\s]*([0-9][0-9.,]+)/i)
    if (mhMatch?.[1]) {
      result.thisManhours = parseBeritaAcaraMetric(mhMatch[1])
    }
  }

  if (!result.cumulativeManhours) {
    const match = slice.match(/cumulative\s*mh[^0-9]{0,40}([0-9][0-9.,]+)/i)
    if (match?.[1]) result.cumulativeManhours = parseBeritaAcaraMetric(match[1])
  }

  return result
}

const formatBeritaAcaraProgressManhours = (value) => {
  if (value == null || value === '') return null
  const parsed = parseAmount(value)
  if (parsed == null) return String(value)
  return parsed.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatBeritaAcaraProgressPct = (value) => {
  if (value == null || value === '') return null
  const metric = parseBeritaAcaraMetric(value)
  return metric ? `${metric}%` : null
}

const buildBeritaAcaraCorpusFromOcr = (ocr = {}) => {
  const header = ocr.header || {}
  const parts = []
  if (ocr.summary) parts.push(String(ocr.summary))
  for (const [key, value] of Object.entries(header)) {
    if (value != null && value !== '') parts.push(`${key}: ${value}`)
  }
  for (const field of ocr.fields || []) {
    const name = field?.fieldName || field?.name
    const value = field?.fieldValue ?? field?.value
    if (name && value != null && value !== '') parts.push(`${name}: ${value}`)
  }
  return parts.join('\n')
}

/** Build the work-progress table shown under Berita Acara extraction. */
export const buildBeritaAcaraProgressExtractTable = (ocr = {}) => {
  const header = ocr.header || {}
  const corpus = buildBeritaAcaraCorpusFromOcr(ocr)
  const progress = extractBeritaAcaraProgressFields(header, ocr.tables || [], corpus)

  const hasProgress =
    progress.thisManhours ||
    progress.manhourCompletionPct ||
    progress.previousManhours ||
    progress.cumulativeManhours

  if (!hasProgress) return null

  const rows = [
    {
      metric: 'Completion %',
      previousPeriod: formatBeritaAcaraProgressPct(progress.previousPeriodPct),
      thisPeriod: formatBeritaAcaraProgressPct(progress.manhourCompletionPct),
      cumulative: formatBeritaAcaraProgressPct(progress.cumulativePct)
    },
    {
      metric: 'Man hours',
      previousPeriod: formatBeritaAcaraProgressManhours(progress.previousManhours),
      thisPeriod: formatBeritaAcaraProgressManhours(progress.thisManhours),
      cumulative: formatBeritaAcaraProgressManhours(progress.cumulativeManhours)
    }
  ].filter(
    (row) =>
      row.previousPeriod != null || row.thisPeriod != null || row.cumulative != null
  )

  if (!rows.length) return null

  return {
    title: 'Work Progress',
    columns: [
      { key: 'metric', label: 'Metric' },
      { key: 'previousPeriod', label: 'Previous Period', align: 'end' },
      { key: 'thisPeriod', label: 'This Period', align: 'end' },
      { key: 'cumulative', label: 'Cumulative', align: 'end' }
    ],
    rows
  }
}

const extractBeritaAcaraThisManhours = (header = {}, tables = [], corpus = '') => {
  const progress = extractBeritaAcaraProgressFields(header, tables, corpus)
  return progress.thisManhours
}

const aggregateManpowerFromLines = (lineItems = []) => {
  const roles = [...new Set(lineItems.map((l) => l.role).filter(Boolean))]
  const names = lineItems.map((l) => l.manpowerName).filter(Boolean)
  return {
    manpowerRoles: roles.length ? roles.join(', ') : null,
    manpowerNames: names.length ? names.join(', ') : null
  }
}

const reconcileBeritaAcaraFields = (header, corpus, lineItems = [], tables = []) => {
  const next = { ...header, ...aggregateManpowerFromLines(lineItems) }
  const extractedPo = extractPoNumber(corpus)
  if (extractedPo) next.poNumber = extractedPo

  const progress = extractBeritaAcaraProgressFields(next, tables, corpus)
  if (progress.thisManhours) next.thisManhours = progress.thisManhours
  if (progress.manhourCompletionPct) next.manhourCompletionPct = progress.manhourCompletionPct

  const picked = {}
  for (const key of BERITA_ACARA_HEADER_KEYS) {
    picked[key] = coerceNullish(next[key])
  }
  return picked
}

const reconcileTaxInvoiceFields = (header, corpus) => {
  const next = { ...header }
  const extractedTaxNo = extractTaxInvoiceNumber(corpus)

  if (isTaxInvoiceSerial(next.invoiceNumber) && !next.taxInvoiceNumber) {
    next.taxInvoiceNumber = next.invoiceNumber
  }
  if (extractedTaxNo) next.taxInvoiceNumber = extractedTaxNo

  const picked = {}
  for (const key of TAX_INVOICE_HEADER_KEYS) {
    picked[key] = coerceNullish(next[key])
  }
  if (!picked.taxAmount && picked.vatAmount) {
    picked.taxAmount = picked.vatAmount
  }
  if (!picked.taxAmount) {
    const fromCorpus = extractTaxAmount(corpus)
    if (fromCorpus) picked.taxAmount = fromCorpus
  }
  return picked
}

const extractPpnAmount = (text) => {
  const patterns = [
    /\bppn\s*[:\-]?\s*(?:rp\.?\s*)?([0-9][0-9.,]+)/i,
    /(?:^|[\s,])(?:ppn|vat)\s*(?:11%?)?\s*[:\-]?\s*(?:rp\.?\s*)?([0-9][0-9.,]+)/im
  ]
  for (const pattern of patterns) {
    const match = String(text).match(pattern)
    if (!match?.[1]) continue
    const parsed = parseAmount(match[1])
    if (parsed != null) return String(parsed)
  }
  return null
}

const extractPaymentTermsFromText = (text) => {
  const source = String(text)
  const block = source.match(
    /terms?\s+of\s+paym?e?nt\s*[:\-]?\s*([\s\S]*?)(?=\n\s*this\s+is\s+a\s+computer|$)/i
  )
  if (block?.[1]) {
    const bullets = block[1]
      .split('\n')
      .map((line) => line.replace(/^[-•]\s*/, '').trim())
      .filter((line) => line.length >= 8)
    if (bullets.length) return bullets.join(' · ')
  }

  const patterns = [
    /payment\s+terms?\s*[:\-]?\s*([^\n]+)/i,
    /invoice\s+payment\s+due\s+by\s+([^\n]+)/i
  ]
  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (!match?.[1]) continue
    const raw = match[1]
      .replace(/\s+/g, ' ')
      .replace(/^[-•]\s*/, '')
      .trim()
    if (raw.length >= 8) return raw
  }
  return null
}

const extractTravelBankDetails = (text) => {
  const source = String(text)
  const patterns = [
    /(?:^|[\n\r]|[-•]\s*)(.+?)\s+[Bb]ank\s+([A-Za-z][A-Za-z0-9]*)\s*[:\-]?\s*([0-9][0-9\-]+)/im,
    /(?:transfer|rekening|account)[^\n]{0,120}?[Bb]ank\s+([A-Za-z][A-Za-z0-9]*)\s*[:\-]?\s*([0-9][0-9\-]+)/im,
    /([A-Z][A-Za-z0-9.&\s]{2,80}?)\s+Bank\s+(BCA|Mandiri|BNI|BRI|DBS|CIMB|Permata)\s*[:\-]?\s*([0-9]{6,20})/im
  ]

  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (!match) continue

    if (match.length === 4) {
      return {
        bankName: `Bank ${match[2].trim()}`,
        bankAccount: match[3].replace(/\s/g, '') || null,
        accountHolder: match[1].replace(/^[-•\s]+/, '').trim() || null
      }
    }

    return {
      bankName: `Bank ${match[1].trim()}`,
      bankAccount: match[2].replace(/\s/g, '') || null,
      accountHolder: null
    }
  }

  return null
}

const applyBankDetailsToHeader = (header = {}) => {
  const next = { ...header }
  const bankSources = [
    next.bankDetails,
    next.paymentTerms,
    next['Terms of payment'],
    next['Bank Details']
  ].filter(Boolean)

  if (next.bankName && next.bankAccount) return next

  for (const source of bankSources) {
    const bank = extractIndonesianBankDetails(source) || extractTravelBankDetails(source)
    if (!bank) continue
    if (!next.bankName && bank.bankName) next.bankName = bank.bankName
    if (!next.bankAccount && bank.bankAccount) next.bankAccount = bank.bankAccount
    if (!next.accountHolder && bank.accountHolder) next.accountHolder = bank.accountHolder
    if (next.bankName && next.bankAccount) break
  }

  return next
}

const extractInvoiceNumber = (text) => {
  const patterns = [
    /\b((?:INV|KW)\/[A-Z0-9]{2,}\/[0-9]+\/[0-9]+)\b/i,
    /invoice\s*no\.?[\s\S]{0,120}?\b((?:INV|KW)[\/\-][A-Z0-9][A-Z0-9\-/.]+)/i,
    /invoice\s*(?:no\.?|number|#)\s*[:\-]?\s*((?:INV|KW)[A-Z0-9\-/.]+)/i,
    /nomor\s*(?:invoice|faktur)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/.]+)/i,
    /kwitansi[\s\S]{0,200}?no\.?\s*[:\-]?\s*([0-9]{2,}[A-Z0-9\-/.]+)/i,
    /invoice\s*(?:no\.?|number|#)\s*[:\-]?\s*(\/?[A-Z0-9][A-Z0-9\-/.]*)/i
  ]
  for (const pattern of patterns) {
    const match = String(text).match(pattern)
    if (match?.[1] && isLikelyInvoiceNumber(match[1].trim())) return match[1].trim()
  }
  return null
}

const reconcileInvoiceFields = (header, corpus, lineItems = []) => {
  const next = { ...header }
  const isExplicitNonPo = header.demoScenario === 'ocrold'
  const extractedInvoice = extractInvoiceNumber(corpus)
  const extractedPo = extractPoNumber(corpus)

  if (extractedInvoice) {
    next.invoiceNumber = extractedInvoice
  } else if (next.invoiceNumber && isPoOnlyNumber(next.invoiceNumber)) {
    if (!next.poNumber) next.poNumber = next.invoiceNumber
    next.invoiceNumber = null
  } else if (next.invoiceNumber && !isLikelyInvoiceNumber(next.invoiceNumber)) {
    next.invoiceNumber = null
  }

  if (extractedPo && !isExplicitNonPo) next.poNumber = extractedPo
  Object.assign(next, salvageTicketFromInvalidPo(next))

  if (!next.paymentTerms) {
    const terms = extractPaymentTermsFromText(corpus)
    if (terms) next.paymentTerms = terms
  }

  if (!next.taxAmount) {
    const ppn = extractPpnAmount(corpus)
    if (ppn) next.taxAmount = ppn
  }

  Object.assign(next, applyBankDetailsToHeader(next))

  if (!next.bankAccount || !next.bankName) {
    const bank = extractTravelBankDetails(corpus)
    if (bank) {
      if (!next.bankName && bank.bankName) next.bankName = bank.bankName
      if (!next.bankAccount && bank.bankAccount) next.bankAccount = bank.bankAccount
      if (!next.accountHolder && bank.accountHolder) next.accountHolder = bank.accountHolder
    }
  }

  if (!next.serviceName && lineItems.length) {
    const primary = lineItems.find((item) => item?.description)
    if (primary?.description) next.serviceName = primary.description
  }

  if (lineItems.some((item) => isTravelTicketLineItem(item, next))) {
    Object.assign(next, promoteTravelFieldsToHeader(next, lineItems))
  }

  const lineSum = lineItems.reduce((sum, item) => sum + (parseAmount(item?.amount) ?? 0), 0)
  if (lineSum > 0) {
    const sub = parseAmount(next.subtotal) ?? parseAmount(next.totalAmount)
    const tax = parseAmount(next.taxAmount) ?? 0
    const grand = parseAmount(next.grandTotal)
    const totalsConsistent =
      sub != null && grand != null && Math.abs(sub + tax - grand) <= 1

    if (
      !totalsConsistent &&
      (!next.subtotal || Math.abs(parseAmount(next.subtotal) - lineSum) > 1)
    ) {
      next.subtotal = String(lineSum)
    }
  }

  if (isExplicitNonPo) {
    next.poNumber = null
    next.invoiceWorkflow = 'NON_PO'
  } else {
    next.invoiceWorkflow = detectInvoiceWorkflow(next)
  }

  return next
}

const flattenTablesToText = (tables = []) => {
  const parts = []
  for (const table of tables || []) {
    if (!table?.rows?.length) continue
    for (const row of table.rows) {
      if (Array.isArray(row)) {
        const line = row.map((cell) => String(cell ?? '').trim()).filter(Boolean).join(' ')
        if (line) parts.push(line)
      } else if (row && typeof row === 'object') {
        const line = Object.values(row)
          .map((cell) => String(cell ?? '').trim())
          .filter(Boolean)
          .join(' ')
        if (line) parts.push(line)
      }
    }
  }
  return parts.join('\n')
}

const buildTextCorpus = (header, fields, lineItems, options = {}) => {
  const { tables, summary } = options
  return [
    ...Object.entries(header || {}).map(([k, v]) => `${k}: ${v}`),
    ...(fields || []).map(
      (f) =>
        `${f.fieldName || f.name || f.label || f.key || ''}: ${f.fieldValue ?? f.value ?? ''}`
    ),
    ...(lineItems || []).map((line) => Object.values(line).filter(Boolean).join(' ')),
    summary ? String(summary) : '',
    flattenTablesToText(tables)
  ]
    .filter(Boolean)
    .join('\n')
}

const normalizeLabelKey = (key) =>
  String(key)
    .trim()
    .toLowerCase()
    .replace(/[.:]+$/g, '')
    .replace(/\s+/g, ' ')

const HEADER_LABEL_ALIASES = {
  'invoice no': 'invoiceNumber',
  'invoice number': 'invoiceNumber',
  invoiceno: 'invoiceNumber',
  'invoice date': 'invoiceDate',
  'invoice due date': 'dueDate',
  'total amount': 'totalAmount',
  'supplier name': 'vendorName',
  suppliername: 'vendorName',
  'contract order no': 'poNumber',
  contractorderno: 'poNumber',
  'payment term': 'paymentTerms',
  paymentterm: 'paymentTerms',
  'grand total': 'grandTotal',
  grandtotal: 'grandTotal',
  'total (net)': 'subtotal',
  'vat 11%': 'taxAmount',
  'jumlah (angka)': 'grandTotal',
  'kode dan nomor seri faktur pajak': 'taxInvoiceNumber',
  'tempat dan tanggal ditandatangani': 'invoiceDate',
  'tanggal/tempat': 'invoiceDate',
  'mohon dikirimkan di': 'bankDetails',
  'sudah terima dari': 'receivedFrom',
  'pengusaha kena pajak - nama': 'vendorName',
  recipient: 'buyerName',
  'booking ref': 'bookingRef',
  'issued by': 'issuedBy',
  npwp: 'vendorTaxId',
  ppn: 'taxAmount',
  'bank details': 'bankDetails',
  'bank name': 'bankName',
  'bank account': 'bankAccount',
  'bank account number': 'bankAccount',
  'bank account no': 'bankAccount',
  bankaccountnumber: 'bankAccount',
  'account number': 'bankAccount',
  'bank account name': 'accountHolder',
  bankaccountname: 'accountHolder',
  'account holder': 'accountHolder',
  'account name': 'accountHolder',
  'bank branch': 'bankBranch',
  branch: 'bankBranch',
  'terms of payment': 'paymentTerms',
  'terms of paymnet': 'paymentTerms',
  'total amount in words': 'totalAmountInWords',
  'customer name': 'vendorName',
  'departure date': 'departure',
  route: 'routing',
  airline: 'airline',
  'passenger name': 'passengerName',
  'ticket class': 'ticketClass',
  'ticket no': 'ticketNo',
  'confirm no': 'confirmNo'
}

const LINE_ITEM_LABEL_ALIASES = {
  'passenger name': 'passengerName',
  'ticket no': 'ticketNo',
  'confirm no': 'confirmNo',
  'ticket class': 'ticketClass',
  departure: 'departure',
  routing: 'routing',
  airline: 'airline',
  flight: 'flight',
  amount: 'amount',
  'passport no': 'passportNo'
}

const mergeLabelAliases = (record = {}, aliasMap = {}) => {
  const next = { ...record }
  for (const [rawKey, value] of Object.entries(record)) {
    if (value == null || value === '') continue
    const canon = aliasMap[normalizeLabelKey(rawKey)]
    if (canon && (next[canon] == null || next[canon] === '')) {
      next[canon] = value
    }
  }
  return next
}

const flattenExtractHeaderLabels = (header = {}) => mergeLabelAliases(header, HEADER_LABEL_ALIASES)

const flattenExtractLineItemLabels = (item = {}) => mergeLabelAliases(item, LINE_ITEM_LABEL_ALIASES)

const isTravelTicketLineItem = (item = {}, header = null) => {
  if (
    item.passengerName ||
    item.routing ||
    item.airline ||
    item.ticketNo ||
    item.confirmNo ||
    item.routeFrom ||
    item.routeTo ||
    item.routeCodeFrom ||
    item.routeCodeTo ||
    item['Passenger Name'] ||
    item.Routing ||
    item.Airline
  ) {
    return true
  }
  if (header && isTravelDomesticInvoice(header)) {
    const desc = String(item?.description ?? '').trim()
    return Boolean(desc) && parseAmount(item?.amount ?? item?.totalAmount) != null
  }
  const desc = String(item?.description ?? '').trim()
  if (/ticket|travel|flight|shuttle/i.test(desc) && parseAmount(item?.amount ?? item?.totalAmount) != null) {
    return true
  }
  return false
}

const isTravelDomesticInvoice = (header = {}) => {
  if (coerceEssaPoNumber(header.poNumber)) return false
  const service = String(header.serviceName || '').trim()
  if (!service) return false
  return /ticket|travel|flight|wisata|shuttle|hotel|accommodation/i.test(service)
}

const promoteTravelFieldsToHeader = (header = {}, lineItems = []) => {
  const primary = lineItems.find((item) => isTravelTicketLineItem(item, header))
  if (!primary) return header

  const next = { ...header }
  const assign = (key, value) => {
    if (value != null && value !== '' && (next[key] == null || next[key] === '')) {
      next[key] = value
    }
  }

  assign('passengerName', primary.passengerName)
  assign('ticketClass', primary.ticketClass)
  assign('departure', primary.departure)
  assign('routing', primary.routing)
  assign('airline', primary.airline)
  assign('flightNo', primary.flightNo || primary.flight)
  assign('confirmNo', primary.confirmNo)
  assign('ticketNo', primary.ticketNo)

  const routing = primary.routing || next.routing
  if (routing) {
    const route = splitTravelRoute(routing)
    assign('routeFrom', route.from)
    assign('routeTo', route.to)
  }

  if (!next.poNumber) {
    next.invoiceWorkflow = 'NON_PO'
  }

  return next
}

const splitTravelRoute = (routing = '') => {
  const parts = String(routing)
    .split(/\s*-\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 2) return { from: parts[0], to: parts[parts.length - 1] }
  if (parts.length === 1) return { from: parts[0], to: null }
  return { from: null, to: null }
}

const parseTravelRouteCodesFromText = (text = '') => {
  const match = String(text).match(/\b([A-Z]{3})\s*[-/]\s*([A-Z]{3})\b/i)
  if (!match) return { from: null, to: null }
  return { from: match[1].toUpperCase(), to: match[2].toUpperCase() }
}

const applyAliasedExtractFieldsToHeader = (header = {}, fields = []) => {
  const next = { ...header }
  for (const field of fields) {
    const rawName = field.fieldName ?? field.name ?? field.label ?? field.key ?? ''
    const val = coerceNullish(field.fieldValue ?? field.value)
    if (val == null) continue
    const key = normalizeLabelKey(rawName)
    const mapped = HEADER_LABEL_ALIASES[key] || LINE_ITEM_LABEL_ALIASES[key]
    if (mapped && (next[mapped] == null || next[mapped] === '')) {
      next[mapped] = val
    }
  }
  return next
}

const promoteStructuredInvoiceHeaderKeys = (header = {}) => {
  const next = { ...header }
  if (!next.invoiceNumber && next.invoiceNo) next.invoiceNumber = next.invoiceNo
  if (!next.invoiceNumber && next.invNo) next.invoiceNumber = next.invNo
  if (!next.invoiceDate && next.date) next.invoiceDate = next.date
  if (!next.taxAmount && next.vatAmount) next.taxAmount = next.vatAmount
  if (!next.bankAccount && next.bankAccountNumber) next.bankAccount = next.bankAccountNumber
  if (!next.accountHolder && next.bankAccountName) next.accountHolder = next.bankAccountName
  if (!next.vendorName && next.bankAccountName) next.vendorName = next.bankAccountName
  return next
}

const buildTravelLineItemFromFieldRecords = (fields = [], header = {}) => {
  const mapped = applyAliasedExtractFieldsToHeader({}, fields)
  const routing = mapped.routing || header.routing
  const line = {
    description: header.serviceName || 'Ticket Domestic',
    passengerName: mapped.passengerName,
    routing,
    departure: mapped.departure,
    airline: mapped.airline,
    ticketNo: mapped.ticketNo,
    ticketClass: mapped.ticketClass,
    confirmNo: mapped.confirmNo,
    flightNo: mapped.flightNo || mapped.flight,
    amount: header.subtotal ?? header.totalAmount ?? mapped.amount ?? null
  }
  return isTravelTicketLineItem(line) ? line : null
}

const enrichTravelInvoiceHeader = (header = {}, fields = [], lineItems = []) => {
  let next = promoteStructuredInvoiceHeaderKeys(applyAliasedExtractFieldsToHeader(header, fields))
  next = applyFieldsToHeader(next, fields)

  if (!next.dueDate && next.paymentTerms) {
    const dueMatch = String(next.paymentTerms).match(/due\s+by\s+(.+)/i)
    if (dueMatch?.[1]) next.dueDate = dueMatch[1].trim()
  }

  const remarksField = fields.find((field) =>
    normalizeLabelKey(field.fieldName ?? field.name ?? field.label ?? field.key ?? '').includes(
      'remark'
    )
  )
  const remarksText = remarksField?.fieldValue ?? remarksField?.value ?? ''
  const routeCodes = parseTravelRouteCodesFromText(remarksText)
  if (routeCodes.from && !next.routeCodeFrom) next.routeCodeFrom = routeCodes.from
  if (routeCodes.to && !next.routeCodeTo) next.routeCodeTo = routeCodes.to

  const primary = lineItems.find((item) => isTravelTicketLineItem(item, next))
  if (primary) {
    next = promoteTravelFieldsToHeader(next, lineItems)
  }

  if (isTravelDomesticInvoice(next)) {
    next.invoiceWorkflow = 'NON_PO'
    next.poNumber = null
  }

  const routing = next.routing || primary?.routing
  if (routing) {
    const route = splitTravelRoute(routing)
    if (!next.routeFrom) next.routeFrom = route.from
    if (!next.routeTo) next.routeTo = route.to
  }

  return next
}

const pickHeaderValue = (header, ...keys) => {
  for (const key of keys) {
    const val = coerceNullish(header?.[key])
    if (val != null) return val
  }
  return null
}

const extractCurrencyFromMoney = (value) => {
  if (!value) return null
  const match = String(value).match(/\b([A-Z]{3})\b/)
  return match?.[1] || null
}

const pickFieldValue = (fields = [], ...patterns) => {
  const list = Array.isArray(fields) ? fields : []
  for (const field of list) {
    const name = normalizeLabelKey(field?.fieldName || field?.name || '')
    for (const pattern of patterns) {
      const token = normalizeLabelKey(pattern)
      if (!token) continue
      if (name.includes(token) || name === token) {
        const val = coerceNullish(field?.fieldValue ?? field?.value)
        if (val != null) return val
      }
    }
  }
  return null
}

const extractDateFromText = (text) => {
  if (!text) return null
  const source = String(text)
  const match =
    source.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/) ||
    source.match(/(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/)
  return match?.[1] || null
}

/** Parse Indonesian receipt/invoice bank lines such as "Bank MANDIRI Cabang Luwuk 151-00-1017369-5 PT. …". */
const extractIndonesianBankDetails = (text) => {
  if (!text) return null
  const source = String(text).trim()

  const cabangMatch = source.match(/bank\s+(.+?)\s+cabang\s+(.+?)\s+([\d][\d\-\s]+?)\s+(.+)$/i)
  if (cabangMatch) {
    return {
      bankName: `Bank ${cabangMatch[1].trim()}`,
      bankBranch: `Cabang ${cabangMatch[2].trim()}`,
      bankAccount: cabangMatch[3].replace(/\s/g, ''),
      accountHolder: cabangMatch[4].trim()
    }
  }

  const mandiriField = source.match(/^(PT\.?\s*.+?)\s+cabang\s+(.+)$/i)
  if (mandiriField) {
    return {
      bankName: mandiriField[1].trim(),
      bankBranch: mandiriField[2].trim(),
      bankAccount: null,
      accountHolder: null
    }
  }

  return extractTravelBankDetails(source)
}

const applyBankFieldsToHeader = (header = {}, fields = []) => {
  const next = { ...header }
  const bankNameBranch = pickFieldValue(fields, 'bank name / branch', 'bank - bank name')
  const accountName = pickFieldValue(fields, 'bank account name', 'account name', 'account holder')
  const accountNumber = pickFieldValue(fields, 'bank account number', 'account number')

  if (accountName && !next.accountHolder) next.accountHolder = accountName
  if (accountNumber && !next.bankAccount) next.bankAccount = accountNumber

  if (bankNameBranch && (!next.bankName || !next.bankBranch)) {
    const branchIdx = String(bankNameBranch).toLowerCase().lastIndexOf('cabang')
    if (branchIdx >= 0) {
      if (!next.bankName) next.bankName = bankNameBranch.slice(0, branchIdx).trim()
      if (!next.bankBranch) next.bankBranch = bankNameBranch.slice(branchIdx).trim()
    } else if (!next.bankName) {
      next.bankName = bankNameBranch
    }
  }

  return next
}

const promoteDynamicTaxInvoiceHeaderKeys = (header = {}) => {
  const next = { ...header }
  for (const [rawKey, value] of Object.entries(header)) {
    const val = coerceNullish(value)
    if (val == null) continue
    const key = normalizeLabelKey(rawKey)

    if (
      !next.taxInvoiceNumber &&
      (key.includes('faktur pajak') ||
        key.includes('nomor seri') ||
        key.includes('tax invoice number'))
    ) {
      next.taxInvoiceNumber = val
    }
    if (
      !next.invoiceDate &&
      (key.includes('tanggal ditandatangani') || key.includes('tanggal/tempat'))
    ) {
      next.invoiceDate = extractDateFromText(val) || val
    }
    if (
      !next.taxAmount &&
      (key.includes('jumlah ppn') || (key.includes('ppn') && !key.includes('ppnbm')))
    ) {
      next.taxAmount = val
    }
    if (!next.vendorName && key.includes('pengusaha kena pajak') && key.includes('nama')) {
      next.vendorName = val
    }
    if (!next.buyerName && key.includes('pembeli') && key.includes('nama')) {
      next.buyerName = val
    }
  }
  return next
}

const resolveExtractDocumentType = (rawType) =>
  normalizeValidationDocumentType(rawType) ?? 'invoice'

const isStructuredExtractFields = (fields) =>
  fields != null && typeof fields === 'object' && !Array.isArray(fields)

const isEmptyMergeValue = (value) => value == null || value === ''

/** Merge header objects; non-empty values win over later null placeholders. */
const preferNonEmptyHeaderMerge = (...headers) => {
  const merged = {}
  for (const header of headers) {
    if (!header || typeof header !== 'object') continue
    for (const [key, value] of Object.entries(header)) {
      if (!isEmptyMergeValue(value)) merged[key] = value
      else if (!(key in merged)) merged[key] = value
    }
  }
  return merged
}

/** Read structured `fields` from a purchase-order extract document. */
export const resolvePurchaseOrderFieldsFromPayload = (payload) => {
  const doc = findPurchaseOrderExtractDocument(payload?.documents || [])
  if (!doc) return null
  if (isStructuredExtractFields(doc.fields)) return { ...doc.fields }
  const nested = doc.data && typeof doc.data === 'object' ? doc.data : null
  if (nested && isStructuredExtractFields(nested.fields)) return { ...nested.fields }
  return null
}

const PO_HEADER_SCHEMA_FIELD_LABELS = {
  poNumber: 'PO Number',
  poHeaderInformation: 'PO Header Information',
  description: 'Description',
  deliveryDate: 'Delivery Date'
}

/** Label for a PO Header tab field from `meta.fieldSchemas.documents.purchase_order`. */
export const resolvePoHeaderFieldLabel = (fieldKey, fieldSchemas) => {
  const schema = fieldSchemas?.documents?.purchase_order?.fields?.[fieldKey]
  if (typeof schema === 'string') return schema
  if (schema?.label) return schema.label
  return PO_HEADER_SCHEMA_FIELD_LABELS[fieldKey] || fieldKey
}

/** Map structured extract API `fields` object keys onto OCR header keys. */
const STRUCTURED_FIELD_MAPS = {
  invoice: {
    invNo: 'invoiceNo',
    invoiceNo: 'invoiceNo',
    date: 'date',
    dueDate: 'dueDate',
    vendorName: 'vendorName',
    vendorAddress: 'vendorAddress',
    vendorTaxId: 'vendorTaxId',
    buyerName: 'buyerName',
    poNumber: 'poNumber',
    currency: 'currency',
    paymentTerms: 'paymentTerms',
    manhourUnitRate: 'manhourUnitRate',
    calculation: 'calculation',
    subtotal: 'subtotal',
    totalAmount: 'totalAmount',
    vatAmount: 'vatAmount',
    grandTotal: 'grandTotal',
    bankAccountName: 'bankAccountName',
    bankName: 'bankName',
    bankBranch: 'bankBranch',
    bankAccountNumber: 'bankAccountNumber',
    authorizedSignatory: 'authorizedSignatory',
    serviceName: 'serviceName',
    rolesOfManpower: 'manpowerRoles',
    passengerName: 'passengerName',
    ticketClass: 'ticketClass',
    routeFrom: 'routeFrom',
    routeTo: 'routeTo',
    confirmNo: 'confirmNo',
    ticketNo: 'ticketNo',
    airline: 'airline',
    flightNo: 'flightNo',
    routeCodeFrom: 'routeCodeFrom',
    routeCodeTo: 'routeCodeTo',
    routing: 'routing',
    departure: 'departure'
  },
  tax_invoice: {
    taxInvoiceNumber: 'taxInvoiceNumber',
    date: 'date',
    vatAmount: 'vatAmount'
  },
  notice: {
    taxInvoiceNumber: 'taxInvoiceNumber',
    date: 'date',
    vatAmount: 'vatAmount'
  },
  berita_acara: {
    poNumber: 'poNumber',
    periodStart: 'periodStart',
    periodEnd: 'periodEnd',
    // both old and new field name variants accepted
    manhourPercentageCompletion: 'manhourPercentageCompletion',
    manhourCompletionPct: 'manhourCompletionPct',
    thisManhours: 'thisManhours',
    // old approval field names
    approvalPrepared: 'approvalPrepared',
    approvalReviewed: 'approvalReviewed',
    approvalAcknowledged: 'approvalAcknowledged',
    approvalApproved: 'approvalApproved',
    // new approval field names from updated hint
    preparedBy: 'preparedBy',
    reviewedBy: 'reviewedBy',
    acknowledgedBy: 'acknowledgedBy',
    approvedBy: 'approvedBy',
    serviceName: 'serviceName',
    rolesOfManpower: 'rolesOfManpower'
  },
  po: {
    poNumber: 'poNumber',
    poHeaderInformation: 'poHeaderInformation',
    description: 'description',
    deliveryDate: 'deliveryDate',
    poDate: 'poDate',
    vendorName: 'vendorName',
    vendorCode: 'vendorCode',
    buyerName: 'buyerName',
    projectName: 'projectName',
    requisitionNo: 'requisitionNo',
    serviceStartDate: 'serviceStartDate',
    serviceEndDate: 'serviceEndDate',
    currency: 'currency',
    subtotal: 'subtotal',
    taxAmount: 'taxAmount',
    totalAmount: 'totalAmount',
    paymentTerms: 'paymentTerms',
    incoterms: 'incoterms'
  },
  po_appendix: {
    poNumber: 'poNumber',
    poHeaderInformation: 'poHeaderInformation'
  },
  ses: {
    sesHeaderInfo: 'sesHeaderInfo',
    qty: 'qty'
  }
}

const resolveStructuredInvoiceAmounts = (header = {}) => {
  const next = { ...header }
  const subtotal = parseAmount(next.subtotal ?? next.totalAmount)
  const vat = parseAmount(next.vatAmount ?? next.taxAmount)
  const grand = parseAmount(next.grandTotal)
  const totalAmount = parseAmount(next.totalAmount)

  if (next.vatAmount != null && next.vatAmount !== '' && next.taxAmount == null) {
    next.taxAmount = next.vatAmount
  }

  if (subtotal != null && vat != null && grand != null && Math.abs(subtotal + vat - grand) <= 1) {
    next.subtotal = String(subtotal)
    next.taxAmount = String(vat)
    next.grandTotal = String(grand)
    return next
  }

  if (
    totalAmount != null &&
    vat != null &&
    grand != null &&
    Math.abs(totalAmount + vat - grand) <= 1
  ) {
    next.subtotal = String(totalAmount)
    next.taxAmount = String(vat)
    next.grandTotal = String(grand)
  }

  return next
}

const coerceStructuredFieldsToHeader = (fields, documentType = 'invoice') => {
  if (!isStructuredExtractFields(fields)) return {}

  const fieldMap = STRUCTURED_FIELD_MAPS[documentType] || {}
  const header = {}

  for (const [rawKey, rawValue] of Object.entries(fields)) {
    const value = coerceNullish(rawValue)
    if (value == null) continue
    const mappedKey = fieldMap[rawKey] || rawKey
    header[mappedKey] = value
  }

  if (header.poNumber) {
    Object.assign(header, salvageTicketFromInvalidPo(header))
  }

  if (documentType === 'invoice') {
    if (header.manhourUnitRate || header.calculation) {
      const parts = [header.manhourUnitRate, header.calculation].filter(Boolean)
      if (parts.length) header.manhourUnitRateCalculation = parts.join(' · ')
    }
    if (Array.isArray(header.manpowerRoles)) {
      header.manpowerRoles = header.manpowerRoles
        .map((row) =>
          typeof row === 'string' ? row : row?.role ?? row?.name ?? null
        )
        .filter(Boolean)
    }
    return promoteStructuredInvoiceHeaderKeys(resolveStructuredInvoiceAmounts(header))
  }

  if (documentType === 'tax_invoice' || documentType === 'notice') {
    if (header.vatAmount != null && header.taxAmount == null) header.taxAmount = header.vatAmount
    if (header.date && !header.invoiceDate) header.invoiceDate = header.date
  }

  if (documentType === 'berita_acara') {
    if (header.manhourPercentageCompletion != null && header.manhourCompletionPct == null) {
      header.manhourCompletionPct = header.manhourPercentageCompletion
    }
    if (header.thisManhours != null && header.thisManHours == null) {
      header.thisManHours = header.thisManhours
    }
    if (header.approvalPrepared && !header.preparedBy) header.preparedBy = header.approvalPrepared
    if (header.approvalReviewed && !header.reviewedBy) header.reviewedBy = header.approvalReviewed
    if (header.approvalAcknowledged && !header.acknowledgedBy) {
      header.acknowledgedBy = header.approvalAcknowledged
    }
    if (header.approvalApproved && !header.approvedBy) header.approvedBy = header.approvalApproved
    if (header.rolesOfManpower && !header.manpowerRoles) {
      header.manpowerRoles = header.rolesOfManpower
    }
  }

  if (documentType === 'po' && header.poHeaderInformation && !header.poNumber) {
    const po = extractPoNumber(header.poHeaderInformation)
    if (po) header.poNumber = po
  }

  if (documentType === 'po_appendix' && header.poHeaderInformation && !header.poNumber) {
    const po = extractPoNumber(header.poHeaderInformation)
    if (po) header.poNumber = po
  }

  if (documentType === 'po' || documentType === 'po_appendix') {
    return applyPoDeliveryRangeToHeader(header)
  }

  return header
}

/** Header values for the PO Header tab from the purchase-order extract document only. */
export const resolvePurchaseOrderHeaderForTab = (inv = {}) => {
  const structured = inv?.po_extract_fields
  if (isStructuredExtractFields(structured)) {
    return coerceStructuredFieldsToHeader(structured, 'po')
  }
  const poOcr = inv?.ocr_by_type?.po
  if (poOcr?.structuredFields && isStructuredExtractFields(poOcr.structuredFields)) {
    return coerceStructuredFieldsToHeader(poOcr.structuredFields, 'po')
  }
  if (poOcr) {
    return enrichOcrPayload({ ...poOcr, documentType: 'po' })?.header || {}
  }
  return {}
}

/** PO number from the purchase-order extract document (`fields.poNumber`), not invoice/classification. */
export const resolvePurchaseOrderPoNumber = (inv = {}) => {
  const fromStored = coerceEssaPoNumber(inv?.po_extract_fields?.poNumber)
  if (fromStored) return fromStored
  return coerceEssaPoNumber(resolvePurchaseOrderHeaderForTab(inv)?.poNumber)
}

const isInvoiceRoleOnlyLine = (row = {}) => {
  const desc = String(row?.description ?? '').trim()
  const role = String(row?.role ?? '').trim()
  return Boolean(role) && !desc && row?.amount == null && row?.quantity == null
}

const isInvoiceBillingLine = (row = {}) => {
  if (!row || typeof row !== 'object' || isInvoiceRoleOnlyLine(row)) return false
  const desc = String(row?.description ?? '').trim()
  if (parseAmount(row?.amount ?? row?.totalAmount) != null) return true
  if (!desc) return false
  return /claim|direct\s*cost|overtime|stationery|overhead|profit|mcu|ppe|msc|helper/i.test(desc)
}

const mapInvoiceBillingLineItem = (row = {}) => ({
  description: row?.description ?? null,
  amount: row?.amount ?? row?.totalAmount ?? null,
  quantity: row?.quantity ?? null,
  unit: row?.unit ?? null,
  unitPrice: row?.unitPrice ?? row?.manhourUnitRate ?? null,
  manhourUnitRate: row?.manhourUnitRate ?? null,
  role: row?.role ?? null,
  passengerName: row?.passengerName ?? row?.name ?? row?.passenger_name ?? null,
  ticketClass: row?.ticketClass ?? row?.ticket_class ?? null,
  routing: row?.routing ?? row?.route ?? null,
  routeFrom: row?.routeFrom ?? row?.from ?? null,
  routeTo: row?.routeTo ?? row?.to ?? null,
  confirmNo: row?.confirmNo ?? row?.confirm_no ?? null,
  ticketNo: row?.ticketNo ?? row?.ticket_no ?? null,
  airline: row?.airline ?? null,
  flightNo: row?.flightNo ?? row?.flight ?? row?.flight_no ?? null,
  routeCodeFrom: row?.routeCodeFrom ?? row?.route_code_from ?? null,
  routeCodeTo: row?.routeCodeTo ?? row?.route_code_to ?? null,
  departure: row?.departure ?? null
})

const mapTravelInvoiceLineItem = (row = {}) => mapInvoiceBillingLineItem(flattenExtractLineItemLabels(row))

/** Prefer claim/billing rows from nested `data.lineItems` over `entries.manpowerRoles`. */
const collectInvoiceBillingLineItems = (...sources) => {
  for (const list of sources) {
    if (!Array.isArray(list) || !list.length) continue
    const billing = list
      .filter((row) => isInvoiceBillingLine(row))
      .map(mapInvoiceBillingLineItem)
    if (billing.length) return billing
  }
  return []
}

/** Map schema `entries` and nested `data.*` arrays onto normalized line-item rows. */
const resolveStructuredExtractEntries = (entries = {}, source = {}, documentType = 'invoice') => {
  const e = entries && typeof entries === 'object' ? entries : {}
  const d = source && typeof source === 'object' ? source : {}
  const result = {
    lineItems: [],
    timesheets: [],
    manhourSummary: [],
    attendanceEntries: [],
    appendixItems: []
  }

  if (documentType === 'invoice') {
    const candidateLists = [
      e.invoiceLineItems,
      d.invoiceLineItems,
      d.lineItems,
      e.lineItems
    ]
    const entryHeader = {
      serviceName: coerceNullish(e.serviceName) ?? coerceNullish(d.serviceName),
      poNumber: coerceNullish(e.poNumber) ?? coerceNullish(d.poNumber)
    }
    for (const list of candidateLists) {
      if (!Array.isArray(list) || !list.length) continue
      const labeled = list.map((row) => flattenExtractLineItemLabels(row))
      const travel = labeled.filter((row) => isTravelTicketLineItem(row, entryHeader))
      if (travel.length) {
        result.lineItems = travel.map(mapTravelInvoiceLineItem)
        return result
      }
    }

    const billing = collectInvoiceBillingLineItems(
      d.lineItems,
      e.lineItems,
      e.invoiceLineItems,
      d.invoiceLineItems
    )
    if (billing.length) {
      result.lineItems = billing
      return result
    }

    const roles = e.manpowerRoles || d.manpowerRoles
    if (Array.isArray(roles) && roles.length) {
      result.lineItems = roles.map((row) => ({
        role: typeof row === 'string' ? row : row?.role ?? null,
        manpowerName: typeof row === 'object' ? row?.name ?? row?.manpowerName ?? null : null
      }))
    }
  }

  if (documentType === 'berita_acara') {
    const manpower = e.manpower || d.manpower
    if (Array.isArray(manpower) && manpower.length) {
      result.lineItems = manpower.map((row) => ({
        manpowerName: row?.name ?? row?.manpowerName ?? null,
        role: row?.role ?? null
      }))
    }
  }

  if (documentType === 'manhour_summary') {
    const summary = e.manhourSummary || d.manhourSummary
    const dataLines = Array.isArray(d.lineItems) && d.lineItems.length ? d.lineItems : null
    const hasRichLines = dataLines?.some(
      (row) => row?.actualMhr || row?.actualMHR || row?.name || row?.position
    )
    const sourceRows = hasRichLines ? dataLines : summary
    if (Array.isArray(sourceRows) && sourceRows.length) {
      result.manhourSummary = summary || sourceRows
      result.lineItems = sourceRows.map(mapManhourSummaryRow)
    }
  }

  if (documentType === 'attendance') {
    const attendance = e.attendanceEntries || d.attendanceEntries
    if (Array.isArray(attendance) && attendance.length) {
      result.attendanceEntries = attendance
      result.lineItems = attendance.map((row) => ({
        date: row?.date ?? null,
        username: row?.username ?? null,
        event: row?.event ?? null
      }))
    }
  }

  if (documentType === 'timesheet') {
    const sheets = e.timesheetEntries || d.timesheetEntries
    if (Array.isArray(sheets) && sheets.length) {
      result.lineItems = sheets.map((row) => ({
        date: row?.date ?? null,
        username: row?.username ?? null,
        regularManhour: row?.regularManhour ?? null,
        overtimeManhour: row?.overtimeManhour ?? null,
        role: row?.role ?? null,
        manpowerName: row?.name ?? row?.manpowerName ?? null
      }))
    }
  }

  if (documentType === 'po') {
    const dataLines = Array.isArray(d.lineItems) && d.lineItems.length ? d.lineItems : null
    const poLines = e.poLineItems || d.poLineItems
    const sourceLines = dataLines || poLines
    if (Array.isArray(sourceLines) && sourceLines.length) {
      result.lineItems = sourceLines.map((row) => ({
        description: row?.description ?? null,
        deliveryDate: row?.deliveryDate ?? null,
        quantity: row?.quantity ?? row?.qty ?? null,
        unit: row?.unit ?? null,
        unitPrice: row?.unitPrice ?? null,
        amount: row?.totalAmount ?? row?.amount ?? row?.totalPrice ?? null,
        currency: row?.currency ?? null
      }))
    }
  }

  if (documentType === 'po_appendix') {
    const appendix = e.appendixItems || d.appendixItems
    if (Array.isArray(appendix) && appendix.length) {
      result.appendixItems = appendix
      result.lineItems = appendix.map((row) => ({
        unitPrice: row?.unitPrice ?? null,
        quantity: row?.qty ?? row?.quantity ?? null,
        manpowerRole: row?.roleOfManpower ?? row?.role ?? null,
        role: row?.roleOfManpower ?? row?.role ?? null,
        description: row?.roleOfManpower ?? row?.description ?? null
      }))
    }
  }

  if (documentType === 'ses') {
    const sesLines = e.sesLineItems || d.sesLineItems
    if (Array.isArray(sesLines) && sesLines.length) {
      result.lineItems = sesLines.map((row) => ({
        description: row?.description ?? null,
        quantity: row?.qty ?? row?.quantity ?? null
      }))
    }
  }

  return result
}

const normalizeExtractFields = (fields = []) => {
  if (Array.isArray(fields)) {
    return fields.map((field) => ({
      fieldName: field.fieldName ?? field.name ?? field.label ?? field.key ?? '',
      fieldValue: field.fieldValue ?? field.value ?? '',
      confidence: field.confidence
    }))
  }

  if (isStructuredExtractFields(fields)) {
    return Object.entries(fields).map(([fieldName, fieldValue]) => ({
      fieldName,
      fieldValue: fieldValue ?? '',
      confidence: undefined
    }))
  }

  return []
}

const applyFieldsToHeader = (header, fields = []) => {
  const next = { ...header }
  for (const field of fields) {
    const name = String(field.fieldName || field.name || field.label || field.key || '')
      .toLowerCase()
      .trim()
    const val = coerceNullish(field.fieldValue ?? field.value)
    if (!val) continue

    if (name.includes('prepared by') || name === 'prepared') next.preparedBy = val
    if (name.includes('reviewed by') || name === 'reviewed') next.reviewedBy = val
    if (name.includes('approved by') || name === 'approved') next.approvedBy = val
    if (name.includes('acknowledged by') || name === 'acknowledged') next.acknowledgedBy = val
    if (name === 'npwp') next.vendorTaxId = val
    if (name === 'ppn' || (name.includes('ppn') && !name.includes('npwp'))) {
      next.taxAmount = val
    }
    if (name.includes('bank detail')) {
      const bank = extractTravelBankDetails(val)
      if (bank) {
        if (!next.bankName && bank.bankName) next.bankName = bank.bankName
        if (!next.bankAccount && bank.bankAccount) next.bankAccount = bank.bankAccount
        if (!next.accountHolder && bank.accountHolder) next.accountHolder = bank.accountHolder
      }
      if (!next.bankDetails) next.bankDetails = val
    }
    if (
      name.includes('terms of payment') ||
      name.includes('terms of paymnet') ||
      name.includes('payment term')
    ) {
      next.paymentTerms = val
      const dueMatch = String(val).match(/due\s+by\s+(.+)/i)
      if (dueMatch?.[1] && !next.dueDate) next.dueDate = dueMatch[1].trim()
    }
    if (name.includes('payment for')) {
      const po = extractPoNumber(val)
      if (po && !next.poNumber) next.poNumber = po
      if (!next.serviceName) next.serviceName = val
    }
    if (name.includes('contract no') && !next.poNumber) {
      const po = extractPoNumber(val)
      if (po) next.poNumber = po
    }
    if (
      !next.poNumber &&
      name.includes('contract') &&
      (name.includes('order') || name.includes('po'))
    ) {
      const po = extractPoNumber(`${name}: ${val}`)
      if (po) next.poNumber = po
    }
    if ((name.includes('bank account number') || name === 'account number') && !next.bankAccount) {
      next.bankAccount = val
    }
    if (
      (name.includes('bank account name') ||
        name === 'account name' ||
        name === 'account holder') &&
      !next.accountHolder
    ) {
      next.accountHolder = val
    }
    if (name.includes('bank name') && !next.bankName) {
      next.bankName = val
    }
    if (name.includes('bank branch') && !next.bankBranch) {
      next.bankBranch = val
    }
    if (name.includes('grand total') && !next.grandTotal) {
      next.grandTotal = val
    }
    if ((name.includes('total (net)') || name === 'total (net)') && !next.subtotal) {
      next.subtotal = val
    }
    if (
      (name.includes('vat') || name.includes('ppn')) &&
      !name.includes('npwp') &&
      !next.taxAmount
    ) {
      next.taxAmount = val
    }
    if (name.includes('contract order') && !next.poNumber) {
      const po = extractPoNumber(val)
      if (po) next.poNumber = po
    }
    if (name.includes('contract order no') && !next.poNumber) {
      const po = extractPoNumber(val)
      if (po) next.poNumber = po
    }
    if (
      (name.includes('jumlah ppn') || (name.includes('ppn') && name.includes('jumlah'))) &&
      !next.taxAmount
    ) {
      next.taxAmount = val
    }
    if (isPoDeliveryDateFieldName(name) && !next.deliveryDate) {
      next.deliveryDate = val
    }
    if (name === 'invoice due date' && !next.dueDate) next.dueDate = val
    if (name === 'passenger name' && !next.passengerName) next.passengerName = val
    if (name === 'route' && !next.routing) next.routing = val
    if (name === 'departure date' && !next.departure) next.departure = val
    if (name === 'ticket no' && !next.ticketNo) next.ticketNo = val
    if (name === 'ticket class' && !next.ticketClass) next.ticketClass = val
    if (name === 'airline' && !next.airline) next.airline = val
    if (name === 'booking ref' && !next.bookingRef) next.bookingRef = val
    if (name === 'customer name' && !next.vendorName) next.vendorName = val
  }
  return next
}

const promoteDynamicInvoiceHeaderKeys = (header = {}) => {
  const next = { ...header }
  for (const [rawKey, value] of Object.entries(header)) {
    const val = coerceNullish(value)
    if (val == null) continue
    const key = normalizeLabelKey(rawKey)

    if (!next.vendorName && (key.includes('supplier') || key === 'company')) {
      next.vendorName = val
    }
    if (!next.invoiceNumber && (key === 'invno' || ((key.includes('invoice') || key === 'invno') && key.includes('no')))) {
      next.invoiceNumber = val
    }
    if (!next.invoiceDate && (key === 'date' || key.includes('invoice date'))) {
      next.invoiceDate = val
    }
    if (!next.poNumber && key.includes('contract') && key.includes('order')) {
      const po = extractPoNumber(val)
      if (po) next.poNumber = po
    }
    if (!next.taxAmount && (key.includes('vat') || key.includes('ppn')) && !key.includes('npwp')) {
      next.taxAmount = val
    }
    if (!next.grandTotal && key.includes('grand') && key.includes('total')) {
      next.grandTotal = val
    }
    if (!next.subtotal && key === 'total') {
      next.subtotal = val
    }
  }
  return next
}

const normalizeExtractHeader = (header = {}, documentType = 'invoice') => {
  const next = { ...header }

  if (documentType === 'tax_invoice') {
    next.taxInvoiceNumber = pickHeaderValue(
      header,
      'taxInvoiceNumber',
      'invoiceNo',
      'invoiceNumber',
      'no'
    )
    next.invoiceDate = pickHeaderValue(header, 'invoiceDate', 'date')
    next.taxAmount = pickHeaderValue(header, 'taxAmount', 'vatAmount', 'ppn')
    next.grandTotal = pickHeaderValue(header, 'grandTotal', 'total', 'totalAmount')
    next.vendorName = pickHeaderValue(
      header,
      'vendorName',
      'from',
      'vendor',
      'Pengusaha Kena Pajak - Nama'
    )
    next.buyerName = pickHeaderValue(header, 'buyerName', 'to', 'Pembeli / Penerima Jasa - Nama')
    next.vendorTaxId = pickHeaderValue(header, 'vendorTaxId', 'npwp', 'NPWP')
    if (Array.isArray(header.address)) {
      next.vendorAddress = header.address.filter(Boolean).join(', ')
    }
  }

  if (documentType === 'invoice') {
    next.invoiceNumber = pickHeaderValue(header, 'invoiceNumber', 'invoiceNo', 'invNo', 'no')
    next.invoiceDate = pickHeaderValue(header, 'invoiceDate', 'date')
    next.dueDate = pickHeaderValue(header, 'dueDate', 'invoiceDueDate')
    next.poNumber = pickHeaderValue(header, 'poNumber', 'poNo', 'contractNo', 'contractOrderNo')
    next.vendorName = pickHeaderValue(
      header,
      'vendorName',
      'supplierName',
      'companyName',
      'company',
      'from',
      'accountHolder'
    )
    next.buyerName = pickHeaderValue(header, 'buyerName', 'recipient', 'messrs')
    next.bookingRef = pickHeaderValue(header, 'bookingRef')
    next.grandTotal = pickHeaderValue(header, 'grandTotal', 'amountInFigures')
    next.totalAmount = pickHeaderValue(header, 'totalAmount', 'grandTotal')
    next.subtotal = pickHeaderValue(header, 'subtotal', 'total')
    next.taxAmount = pickHeaderValue(header, 'taxAmount', 'vatAmount', 'ppn', 'vat11%')
    next.paymentTerms = pickHeaderValue(header, 'paymentTerms', 'paymentTerm', 'dueDate')
    next.bankName = pickHeaderValue(header, 'bankName', 'bank')
    next.bankAccount = pickHeaderValue(header, 'bankAccount', 'bankAccountNumber', 'accountNumber')
    next.accountHolder = pickHeaderValue(header, 'accountHolder', 'bankAccountName', 'accountName')
    next.bankBranch = pickHeaderValue(header, 'bankBranch', 'branch')
    next.serviceName = pickHeaderValue(header, 'serviceName')
    next.manpowerRoles = pickHeaderValue(header, 'manpowerRoles', 'rolesOfManpower')
    next.manhourUnitRateCalculation = pickHeaderValue(
      header,
      'manhourUnitRateCalculation',
      'manhourUnitRate',
      'calculation'
    )
    if (!next.subtotal) {
      next.subtotal = pickHeaderValue(header, 'subtotal', 'total', 'totalAmount')
    }
    next.passengerName = pickHeaderValue(header, 'passengerName')
    next.ticketClass = pickHeaderValue(header, 'ticketClass')
    next.ticketNo = pickHeaderValue(header, 'ticketNo')
    next.confirmNo = pickHeaderValue(header, 'confirmNo')
    next.airline = pickHeaderValue(header, 'airline')
    next.flightNo = pickHeaderValue(header, 'flightNo', 'flight')
    next.routing = pickHeaderValue(header, 'routing', 'route')
    next.departure = pickHeaderValue(header, 'departure')
    next.routeFrom = pickHeaderValue(header, 'routeFrom')
    next.routeTo = pickHeaderValue(header, 'routeTo')
    next.routeCodeFrom = pickHeaderValue(header, 'routeCodeFrom')
    next.routeCodeTo = pickHeaderValue(header, 'routeCodeTo')
    Object.assign(next, salvageTicketFromInvalidPo(next))
  }

  if (documentType === 'po' || documentType === 'po_appendix') {
    next.poNumber = coerceEssaPoNumber(
      pickHeaderValue(header, 'poNumber', 'poNo', 'contractOrderNo')
    )
    next.poDate = pickHeaderValue(header, 'poDate', 'date')
    next.vendorName = pickHeaderValue(header, 'vendorName', 'supplierName', 'kepada')
    next.vendorCode = pickHeaderValue(header, 'vendorCode')
    next.buyerName = pickHeaderValue(header, 'buyerName', 'companyName', 'from')
    next.projectName = pickHeaderValue(header, 'projectName', 'project', 'projectCode')
    next.requisitionNo = pickHeaderValue(header, 'requisitionNo', 'requisitionNumber')
    next.serviceStartDate = pickHeaderValue(header, 'serviceStartDate')
    next.serviceEndDate = pickHeaderValue(header, 'serviceEndDate')
    next.paymentTerms = pickHeaderValue(header, 'paymentTerms', 'paymentTerm')
    next.incoterms = pickHeaderValue(header, 'incoterms', 'terms')
    next.totalAmount = pickHeaderValue(header, 'totalAmount', 'totalPrice', 'poValue')
    next.poHeaderInformation = pickHeaderValue(header, 'poHeaderInformation')
    next.description = pickHeaderValue(header, 'description')
    next.deliveryDate = pickHeaderValue(header, 'deliveryDate')
    next.currency =
      pickHeaderValue(header, 'currency') || extractCurrencyFromMoney(header.totalPrice)
    if (!next.poNumber && next.poHeaderInformation) {
      const po = extractPoNumber(next.poHeaderInformation)
      if (po) next.poNumber = po
    }
    Object.assign(next, applyPoDeliveryRangeToHeader(next))
  }

  if (documentType === 'berita_acara') {
    next.poNumber = pickHeaderValue(header, 'poNumber', 'contractNo')
    next.periodStart = pickHeaderValue(header, 'periodStart')
    next.periodEnd = pickHeaderValue(header, 'periodEnd')
    next.manhourCompletionPct = pickHeaderValue(
      header,
      'manhourCompletionPct',
      'manhourPercentageCompletion'
    )
    next.thisManhours = pickHeaderValue(
      header,
      'thisManhours',
      'thisPeriodManhours',
      'thisManHours',
      'thisManHour'
    )
    next.serviceName = pickHeaderValue(header, 'serviceName')
    next.manpowerRoles = pickHeaderValue(header, 'manpowerRoles', 'rolesOfManpower')
    next.preparedBy = pickHeaderValue(header, 'preparedBy', 'approvalPrepared')
    next.reviewedBy = pickHeaderValue(header, 'reviewedBy', 'approvalReviewed')
    next.acknowledgedBy = pickHeaderValue(header, 'acknowledgedBy', 'approvalAcknowledged')
    next.approvedBy = pickHeaderValue(header, 'approvedBy', 'approvalApproved')
    next.invoiceDate = pickHeaderValue(header, 'invoiceDate', 'date')
  }

  if (documentType === 'notice') {
    next.taxInvoiceNumber = pickHeaderValue(header, 'taxInvoiceNumber', 'invoiceNo', 'no')
    next.invoiceDate = pickHeaderValue(header, 'invoiceDate', 'date')
    next.taxAmount = pickHeaderValue(header, 'taxAmount', 'vatAmount')
  }

  if (documentType === 'ses') {
    next.sesHeaderInfo = pickHeaderValue(header, 'sesHeaderInfo')
    next.quantity = pickHeaderValue(header, 'quantity', 'qty')
    next.sesNo = pickHeaderValue(header, 'sesNo', 'sesNumber')
    next.poNumber = pickHeaderValue(header, 'poNumber', 'poNo')
  }

  if (documentType === 'manhour_summary') {
    next.vendorName = pickHeaderValue(header, 'vendorName', 'companyName', 'company')
    next.projectName = pickHeaderValue(header, 'projectName', 'project')
    next.periodStart = pickHeaderValue(header, 'periodStart', 'period', 'claimPeriod', 'date')
    next.periodEnd = pickHeaderValue(header, 'periodEnd')
    next.totalRegularManhour = pickHeaderValue(
      header,
      'totalRegularManhour',
      'totalActualMhr',
      'totalActualManhour',
      'totalActualMHR'
    )
    next.totalOvertimeManhour = pickHeaderValue(
      header,
      'totalOvertimeManhour',
      'totalOvertime',
      'totalOvertimeMondaySaturday',
      'totalOvertimeSundayPublicHoliday'
    )
    next.manpowerCount = pickHeaderValue(header, 'manpowerCount')
    next.poNumber = pickHeaderValue(header, 'poNumber', 'poNo')
    if (!next.poNumber && next.scope) {
      const po = extractPoNumber(next.scope)
      if (po) next.poNumber = po
    }
    if (!next.periodEnd && next.period) {
      const range = splitPoDeliveryRange(next.period)
      if (!next.periodStart && range.start) next.periodStart = range.start
      if (range.end) next.periodEnd = range.end
    }
  }

  if (documentType === 'timesheet') {
    next.periodStart = pickHeaderValue(header, 'periodStart', 'period', 'For Period')
    next.manpowerName = pickHeaderValue(header, 'manpowerName', 'employeeName', 'Name')
    next.username = pickHeaderValue(header, 'username', 'employeeID', 'employeeId')
    next.role = pickHeaderValue(header, 'role', 'position', 'Position')
    next.vendorName = pickHeaderValue(header, 'vendorName', 'Company', 'companyName')
  }

  if (documentType === 'receipt') {
    next.invoiceNumber = pickHeaderValue(header, 'invoiceNumber', 'invoiceNo', 'no', 'No.')
    next.grandTotal = pickHeaderValue(
      header,
      'grandTotal',
      'amountInFigures',
      'amount',
      'Jumlah (angka)'
    )
    next.invoiceDate =
      pickHeaderValue(header, 'invoiceDate', 'date') ||
      extractDateFromText(pickHeaderValue(header, 'Tanggal/Tempat'))
    next.receivedFrom = pickHeaderValue(header, 'receivedFrom', 'Sudah Terima Dari')
    next.bankDetails = pickHeaderValue(header, 'bankDetails', 'Mohon Dikirimkan Di')
    next.bankName = pickHeaderValue(header, 'bankName', 'bank')
    next.bankAccount = pickHeaderValue(header, 'bankAccount', 'accountNumber')
  }

  return next
}

const normalizeLineItemKey = (item, ...candidates) => {
  for (const key of candidates) {
    if (item?.[key] != null && item[key] !== '') return item[key]
  }
  return null
}

const lineItemsFromTables = (tables = []) => {
  const table = tables.find((entry) => Array.isArray(entry?.rows) && entry.rows.length) || tables[0]
  if (!table?.rows?.length) return []

  const columnDefs = table.columns || table.headers
  if (!columnDefs?.length) {
    const firstRow = table.rows[0]
    if (firstRow && typeof firstRow === 'object' && !Array.isArray(firstRow)) {
      return table.rows.filter((row) => row && typeof row === 'object')
    }
    return []
  }

  const headerKeys = columnDefs.map((col, index) => {
    if (typeof col === 'string') return col
    return col?.key || col?.name || col?.label || `col_${index}`
  })

  let rows = table.rows
  if (rows.length && Array.isArray(rows[0])) {
    const matchesHeader = columnDefs.every((col, index) => {
      const label = typeof col === 'string' ? col : col?.label || col?.name
      if (!label) return true
      return String(rows[0][index] ?? '')
        .trim()
        .toLowerCase() === String(label).trim().toLowerCase()
    })
    if (matchesHeader) rows = rows.slice(1)
  }

  return rows
    .map((row) => {
      if (Array.isArray(row)) {
        return Object.fromEntries(headerKeys.map((key, index) => [key, row[index] ?? null]))
      }
      if (row && typeof row === 'object') return row
      return null
    })
    .filter(Boolean)
}

const normalizeInvoiceDescriptionKey = (desc) =>
  String(desc || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const pickInvoiceTableCell = (row, ...keys) => {
  for (const key of keys) {
    const value = coerceNullish(row?.[key])
    if (value) return value
  }
  for (const [key, value] of Object.entries(row || {})) {
    const normalized = key.toLowerCase().replace(/\s+/g, ' ')
    if (keys.some((candidate) => normalized.includes(candidate.toLowerCase())) && coerceNullish(value)) {
      return coerceNullish(value)
    }
  }
  return null
}

const normalizeInvoiceTableRow = (row) => {
  const description = pickInvoiceTableCell(row, 'description', 'Description', 'DESCRIPTION')
  if (!description) return null
  const amountRaw = pickInvoiceTableCell(
    row,
    'amount',
    'Amount',
    'AMOUNT (IDR)',
    'AMOUNT',
    'Total (IDR)',
    'Total Amount (Rp)'
  )
  const amount = parseAmount(amountRaw)
  return {
    description,
    amount: amount != null ? String(amount) : null
  }
}

const extractInvoiceLinesFromCorpus = (corpus = '') => {
  const results = []
  const seen = new Set()

  const pushLine = (description, amountRaw) => {
    const desc = coerceNullish(description)
    if (!desc) return
    const key = normalizeInvoiceDescriptionKey(desc)
    if (seen.has(key)) return
    seen.add(key)
    const amount = parseAmount(amountRaw)
    results.push({
      description: desc,
      amount: amount != null ? String(amount) : null
    })
  }

  for (const rawLine of String(corpus).split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim()
    if (!line || line.length < 12) continue
    if (/^(description|amount|invoice|total|vat|grand total|subtotal)\b/i.test(line)) continue

    const inlineClaim = line.match(
      /^(\d+(?:st|nd|rd|th)?\s+Claim\s+for\s+.+?)\s+(?:Rp\.?\s*)?([0-9][0-9.,]+)\s*$/i
    )
    if (inlineClaim) {
      pushLine(inlineClaim[1], inlineClaim[2])
      continue
    }

    const spacedColumns = line.match(/^(.{12,}?)\s{2,}(?:Rp\.?\s*)?([0-9][0-9.,]+)\s*$/)
    if (
      spacedColumns &&
      /claim|direct cost|overtime|stationery|ppe|mcu|overhead|office/i.test(spacedColumns[1])
    ) {
      pushLine(spacedColumns[1], spacedColumns[2])
    }
  }

  const claimPatterns = [
    /(\d+(?:st|nd|rd|th)?\s+Claim\s+for\s+[\s\S]{0,160}?(?:Direct Cost Welder|Direct Cost Fitter|Overtime Welder|Overtime Fitter|Stationery, Postage, Transportation|Overhead and Profit|Office|MCU|PPE))(?:[\s.:;(-]|$)(?:[\s\S]{0,40}?)(?:Rp\.?\s*)?([0-9][0-9.,]+)/gi,
    /(Direct Cost Welder|Direct Cost Fitter|Overtime Welder|Overtime Fitter)(?:[\s.:;(-]|$)(?:[\s\S]{0,40}?)(?:Rp\.?\s*)?([0-9][0-9.,]+)/gi
  ]

  for (const pattern of claimPatterns) {
    let match = pattern.exec(corpus)
    while (match) {
      pushLine(match[1], match[2])
      match = pattern.exec(corpus)
    }
  }

  return results
}

const mergeInvoiceLineItems = (existing = [], supplemental = []) => {
  const byKey = new Map()

  const toRow = (item) => {
    const desc = coerceNullish(item?.description)
    if (!desc) return null
    let amount = parseAmount(item?.amount)
    if (amount == null) amount = computeLineItemAmount(item)
    return {
      description: desc,
      amount: amount != null ? String(amount) : null,
      quantity: item?.quantity ?? null,
      unitPrice: item?.unitPrice ?? null
    }
  }

  for (const item of existing) {
    const row = toRow(item)
    if (!row) continue
    byKey.set(normalizeInvoiceDescriptionKey(row.description), row)
  }

  for (const item of supplemental) {
    const row = toRow(item)
    if (!row) continue
    const key = normalizeInvoiceDescriptionKey(row.description)
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, row)
      continue
    }
    if (!prev.amount && row.amount) {
      byKey.set(key, { ...prev, amount: row.amount })
    }
  }

  // Backfill missing amounts when corpus/table rows use shorter claim labels.
  for (const item of supplemental) {
    const category = classifyManpowerInvoiceCategory(item?.description)
    const amount = parseAmount(item?.amount) ?? computeLineItemAmount(item)
    if (!category || amount == null) continue
    for (const [key, row] of byKey.entries()) {
      if (row.amount) continue
      if (classifyManpowerInvoiceCategory(row.description) === category) {
        byKey.set(key, { ...row, amount: String(amount) })
      }
    }
  }

  const merged = []
  const seen = new Set()
  for (const item of existing) {
    const desc = coerceNullish(item?.description)
    if (!desc) continue
    const key = normalizeInvoiceDescriptionKey(desc)
    if (seen.has(key)) continue
    seen.add(key)
    const row = byKey.get(key)
    if (row) merged.push(row)
  }
  for (const [key, item] of byKey.entries()) {
    if (!seen.has(key)) merged.push(item)
  }
  return merged
}

const reconcileInvoiceLineItems = (lineItems = [], tables = [], corpus = '') => {
  const normalizedExisting = (lineItems || [])
    .map((item) => {
      const normalized = normalizeExtractLineItem(item, 'invoice') || item
      const description = coerceNullish(normalized?.description ?? item?.description)
      let amount = parseAmount(normalized?.amount ?? item?.amount)
      if (amount == null) amount = computeLineItemAmount(normalized)
      return {
        description,
        amount: amount != null ? String(amount) : null,
        quantity: normalized?.quantity ?? item?.quantity ?? null,
        unitPrice: normalized?.unitPrice ?? item?.unitPrice ?? null
      }
    })
    .filter((item) => item.description)

  const fromTables = lineItemsFromTables(tables)
    .map((row) => normalizeInvoiceTableRow(row))
    .filter(Boolean)
  const fromCorpus = corpus ? extractInvoiceLinesFromCorpus(corpus) : []

  let merged = mergeInvoiceLineItems(normalizedExisting, fromTables)
  merged = mergeInvoiceLineItems(merged, fromCorpus)
  if (!merged.length && (fromTables.length || fromCorpus.length)) {
    merged = mergeInvoiceLineItems(fromTables, fromCorpus)
  }
  return merged
}

const normalizeExtractLineItem = (item, documentType) => {
  if (!item || typeof item !== 'object') return null

  switch (documentType) {
    case 'invoice':
      return {
        description: normalizeLineItemKey(item, 'description', 'Description'),
        quantity: normalizeLineItemKey(item, 'quantity', 'Quantity', 'Manpower (Orang)', 'Unit'),
        unit: normalizeLineItemKey(item, 'unit', 'Unit'),
        unitPrice: normalizeLineItemKey(item, 'unitPrice', 'unit_price', 'CUC', 'Amount/Hour (Rp)'),
        amount: normalizeLineItemKey(
          item,
          'amount',
          'Amount',
          'Total (IDR)',
          'Total CUC (IDR)',
          'Total Amount (Rp)'
        ),
        role: normalizeLineItemKey(item, 'role', 'Role', 'Position', 'Description'),
        manpowerName: normalizeLineItemKey(item, 'manpowerName', 'manpower_name', 'Name'),
        passengerName: normalizeLineItemKey(item, 'passengerName', 'Passenger Name'),
        ticketNo: normalizeLineItemKey(item, 'ticketNo', 'Ticket No.'),
        confirmNo: normalizeLineItemKey(item, 'confirmNo', 'Confirm No.'),
        ticketClass: normalizeLineItemKey(item, 'ticketClass', 'Ticket Class'),
        departure: normalizeLineItemKey(item, 'departure', 'Departure'),
        routing: normalizeLineItemKey(item, 'routing', 'Routing'),
        airline: normalizeLineItemKey(item, 'airline', 'Airline'),
        flight: normalizeLineItemKey(item, 'flight', 'Flight'),
        flightNo: normalizeLineItemKey(item, 'flightNo', 'flight', 'Flight')
      }
    case 'manhour_summary':
      return {
        role: normalizeLineItemKey(item, 'role', 'position', 'Position', 'Description'),
        manpowerName: normalizeLineItemKey(item, 'manpowerName', 'name', 'Name'),
        username: normalizeLineItemKey(item, 'username', 'ID No.', 'idNo', 'Badge No.'),
        regularManhour: normalizeLineItemKey(
          item,
          'regularManhour',
          'actualMhr',
          'actualMHR',
          'Actual Mhr',
          'Manhour',
          'Man-hour'
        ),
        overtimeMondaySaturday: normalizeLineItemKey(
          item,
          'overtimeMondaySaturday',
          'overtimeMondaySaturdayManhour',
          'Overtime Monday - Saturday'
        ),
        overtimeSundayPublicHoliday: normalizeLineItemKey(
          item,
          'overtimeSundayPublicHoliday',
          'overtimeSundayHolidayManhour',
          'Overtime Sunday & Public Holiday'
        ),
        overtimeManhour: normalizeLineItemKey(
          item,
          'overtimeManhour',
          'Overtime Total',
          'Overtime',
          'Overtime Holiday',
          'Overtime Sat/Sun'
        ),
        totalActualManhour: normalizeLineItemKey(item, 'totalActualManhour', 'totalActualMhr'),
        unitPrice: normalizeLineItemKey(
          item,
          'unitPrice',
          'unit_price',
          'unitPriceHourIDR',
          'unitPricePerHour',
          'Unit Price / Hour (IDR)',
          'Unit Price',
          'Rate',
          'CUC'
        ),
        unitPriceHourIDR: normalizeLineItemKey(
          item,
          'unitPriceHourIDR',
          'unitPricePerHour',
          'unitPrice',
          'unit_price',
          'Unit Price / Hour (IDR)'
        ),
        regularAmount: normalizeLineItemKey(
          item,
          'regularAmount',
          'amountMhr',
          'Amount Mhr (IDR)',
          'Amount Mhr',
          'regularAmountIDR',
          'amountIDR',
          'amount',
          'Amount'
        ),
        description: normalizeLineItemKey(item, 'description', 'Description', 'Position')
      }
    case 'timesheet':
      return {
        date: normalizeLineItemKey(item, 'date', 'Date'),
        username: normalizeLineItemKey(
          item,
          'username',
          'Sign of User',
          'Sign in user',
          'signByUser'
        ),
        role: normalizeLineItemKey(item, 'role', 'Role'),
        manpowerName: normalizeLineItemKey(item, 'manpowerName', 'manpower_name', 'Name'),
        regularManhour: normalizeLineItemKey(
          item,
          'regularManhour',
          'Work Hours',
          'Manhour',
          'Work hours'
        ),
        overtimeManhour: normalizeLineItemKey(
          item,
          'overtimeManhour',
          'OverTime Hours',
          'Over Time Hours',
          'ot_actual'
        ),
        description: normalizeLineItemKey(item, 'description', 'Daily Activity', 'dailyActivity')
      }
    case 'po':
    case 'po_appendix':
      return {
        description: normalizeLineItemKey(item, 'description', 'Description', 'roleOfManpower'),
        quantity: normalizeLineItemKey(item, 'quantity', 'Quantity', 'qty'),
        unit: normalizeLineItemKey(item, 'unit', 'Unit'),
        unitPrice: normalizeLineItemKey(item, 'unitPrice', 'unit_price', 'totalPrice'),
        amount: normalizeLineItemKey(item, 'amount', 'totalAmount', 'totalPrice', 'lineValue'),
        deliveryDate: normalizeLineItemKey(item, 'deliveryDate', 'startDate', 'endDate'),
        manpowerRole: normalizeLineItemKey(
          item,
          'manpowerRole',
          'manpower_role',
          'roleOfManpower',
          'role',
          'Role'
        )
      }
    case 'tax_invoice':
      return {
        description: normalizeLineItemKey(item, 'description', 'Description'),
        quantity: normalizeLineItemKey(item, 'quantity', 'Quantity'),
        unitPrice: normalizeLineItemKey(item, 'unitPrice', 'Unit price'),
        amount: normalizeLineItemKey(item, 'amount', 'Amount')
      }
    default:
      return { ...item }
  }
}

const normalizeExtractLineItems = (lineItems = [], documentType = 'invoice', tables = []) => {
  let rows = Array.isArray(lineItems) ? lineItems : []
  const hasUsableLineItems = rows.some((row) => {
    const desc = normalizeLineItemKey(row, 'description', 'Description')
    const amt = normalizeLineItemKey(row, 'amount', 'Amount', 'Total (IDR)', 'Total Amount (Rp)')
    return Boolean(desc && amt)
  })

  if ((!rows.length || !hasUsableLineItems) && tables?.length) {
    rows = lineItemsFromTables(tables)
  }

  return rows.map((item) => normalizeExtractLineItem(item, documentType)).filter(Boolean)
}

const flattenPoLineItems = (lineItems = []) => {
  const flat = []

  for (const item of lineItems) {
    const subItems = Array.isArray(item?.subItems) ? item.subItems : []
    if (subItems.length) {
      for (const sub of subItems) {
        flat.push(
          normalizeExtractLineItem(
            {
              description: sub.description || item.description,
              quantity: sub.quantity ?? item.quantity,
              unit: sub.unit ?? item.unit,
              unitPrice: sub.unitPrice,
              amount: sub.totalPrice ?? sub.amount,
              deliveryDate: item.startDate || item.endDate
            },
            'po'
          )
        )
      }
      continue
    }
    flat.push(normalizeExtractLineItem(item, 'po'))
  }

  return flat.filter(Boolean)
}

const flattenExtractApiDocument = (raw, fileName, { includeSkipped = false } = {}) => {
  if (!raw || typeof raw !== 'object') return null

  const nested = raw.data && typeof raw.data === 'object' ? raw.data : null
  const source = nested || raw
  const rawType =
    raw.type ||
    raw.schemaId ||
    raw.documentType ||
    source.documentType ||
    source.detectedDocumentType ||
    source.documentTypeLabel
  const documentType = resolveExtractDocumentType(rawType)

  if (!documentType && !includeSkipped) return null

  const resolvedType = documentType || 'receipt'
  const structuredFields = isStructuredExtractFields(raw.fields)
    ? raw.fields
    : isStructuredExtractFields(source.fields)
      ? source.fields
      : null
  const schemaHeader = coerceStructuredFieldsToHeader(structuredFields, resolvedType)
  const nestedHeader = flattenExtractHeaderLabels(source.header || {})
  const mergedHeaderInput = promoteDynamicInvoiceHeaderKeys({
    ...nestedHeader,
    ...schemaHeader,
    description:
      nestedHeader.description ??
      schemaHeader.description ??
      coerceNullish(raw.fields?.description)
  })
  const normalizedFields = [
    ...normalizeExtractFields(raw.fields),
    ...normalizeExtractFields(source.fields)
  ]
  let header = applyFieldsToHeader(
    normalizeExtractHeader(mergedHeaderInput, resolvedType),
    normalizedFields
  )
  header =
    resolvedType === 'tax_invoice' || resolvedType === 'notice'
      ? promoteDynamicTaxInvoiceHeaderKeys(header)
      : promoteDynamicInvoiceHeaderKeys(header)
  if (resolvedType === 'invoice') {
    header = applyBankFieldsToHeader(header, normalizedFields)
  }
  header = applyBankDetailsToHeader(header)
  const tables = source.tables || raw.tables || []
  const structuredEntries = resolveStructuredExtractEntries(
    {
      ...(raw.entries || {}),
      ...(source.entries || {}),
      serviceName: header.serviceName,
      poNumber: header.poNumber
    },
    source,
    resolvedType
  )
  const rawSourceLines = (source.lineItems || raw.lineItems || []).map(flattenExtractLineItemLabels)
  let lineItems
  if (resolvedType === 'invoice') {
    if (structuredEntries.lineItems.length) {
      lineItems = structuredEntries.lineItems
    } else {
      const billingFromSource = rawSourceLines.filter((row) => isInvoiceBillingLine(row))
      lineItems = billingFromSource.length ? billingFromSource : rawSourceLines
    }
  } else {
    lineItems =
      structuredEntries.lineItems.length > 0
        ? structuredEntries.lineItems
        : rawSourceLines
  }

  if (resolvedType === 'po' || resolvedType === 'po_appendix') {
    lineItems = flattenPoLineItems(lineItems)
  } else {
    lineItems = normalizeExtractLineItems(lineItems, resolvedType, tables)
  }

  if (resolvedType === 'timesheet' && lineItems.length) {
    lineItems = lineItems.map((item) => ({
      ...item,
      manpowerName: item.manpowerName || header.manpowerName || null,
      role: item.role || header.role || null,
      username: item.username || header.username || null
    }))
  }

  if (resolvedType === 'po' || resolvedType === 'po_appendix') {
    header = enrichPoHeaderFields(header, {
      fields: normalizedFields,
      lineItems,
      source: {
        ...source,
        fields: structuredFields || source.fields,
        summary: source.summary ?? raw.summary
      }
    })
  }

  if (resolvedType === 'manhour_summary') {
    header = enrichManhourSummaryFields(header, {
      fields: normalizedFields,
      lineItems,
      source: {
        ...source,
        tables,
        manhourSummary: structuredEntries.manhourSummary
      }
    })
  }

  if (resolvedType === 'invoice') {
    header = enrichTravelInvoiceHeader(header, normalizedFields, lineItems)
    if (!lineItems.length) {
      const travelLine = buildTravelLineItemFromFieldRecords(normalizedFields, header)
      if (travelLine) {
        lineItems = normalizeExtractLineItems([travelLine], resolvedType, tables)
        header = enrichTravelInvoiceHeader(header, normalizedFields, lineItems)
      }
    }
    const corpus = buildTextCorpus(header, normalizedFields, lineItems, {
      tables,
      summary: source.summary ?? raw.summary
    })
    lineItems = reconcileInvoiceLineItems(lineItems, tables, corpus).map((item) =>
      normalizeExtractLineItem(item, 'invoice')
    )
    header = reconcileInvoiceFields(header, corpus, lineItems)
  }

  return {
    documentType: resolvedType,
    rawType: String(rawType || resolvedType),
    documentTypeLabel: source.documentTypeLabel || source.detectedDocumentType || null,
    fileName: source.fileName || fileName,
    fileType: source.fileType || null,
    status: source.status || raw.status || 'extracted',
    header,
    lineItems,
    timesheets:
      structuredEntries.timesheets.length > 0
        ? structuredEntries.timesheets
        : source.timesheets || [],
    manhourSummary: structuredEntries.manhourSummary,
    attendanceEntries: structuredEntries.attendanceEntries,
    appendixItems: structuredEntries.appendixItems,
    fields: normalizedFields,
    tables,
    validation: source.validation ?? raw.validation ?? null,
    documentId: source.documentId ?? raw.documentId ?? null,
    pdfUrl: raw.pdfUrl || source.pdfUrl || null,
    pdfPath: raw.pdfPath || source.pdfPath || null,
    summary: source.summary ?? null,
    structuredFields: structuredFields ? { ...structuredFields } : null,
    schemaId: raw.schemaId || source.schemaId || null,
    sectionIndex: raw.sectionIndex ?? source.sectionIndex ?? null
  }
}

/** Collect a PO number from any classified section in an extract batch. */
export const collectPoNumberFromExtractDocuments = (documents = []) => {
  let poNumber = null
  const corpusParts = []
  const ordered = [
    ...documents.filter((doc) => isPurchaseOrderExtractDocument(doc) || doc?.documentType === 'po'),
    ...documents.filter((doc) => !isPurchaseOrderExtractDocument(doc) && doc?.documentType !== 'po')
  ]

  for (const doc of ordered) {
    if (!doc) continue
    const header = doc.header || {}
    const fields = doc.fields || []
    const lineItems = doc.lineItems || []
    corpusParts.push(buildTextCorpus(header, fields, lineItems))

    const structuredPo = coerceEssaPoNumber(
      coerceNullish(doc.structuredFields?.poNumber) ||
        (isStructuredExtractFields(doc.structuredFields)
          ? coerceNullish(coerceStructuredFieldsToHeader(doc.structuredFields, 'po').poNumber)
          : null)
    )
    if (structuredPo && !poNumber) {
      poNumber = structuredPo
      continue
    }

    const direct = coerceEssaPoNumber(
      coerceNullish(header.poNumber) || coerceNullish(header.po_number)
    )
    if (direct && !poNumber) {
      poNumber = direct
      continue
    }

    const fromCorpus = extractPoNumber(buildTextCorpus(header, fields, lineItems))
    if (fromCorpus && !poNumber) poNumber = fromCorpus
  }

  if (!poNumber) {
    poNumber = extractPoNumber(corpusParts.join('\n'))
  }

  return poNumber
}

/** Resolve PO number from any document in a merged invoice batch. */
export const resolveBatchPoNumber = (inv = {}) => {
  const fromPoDoc = resolvePurchaseOrderPoNumber(inv)
  if (fromPoDoc) return fromPoDoc

  const direct = coerceEssaPoNumber(
    coerceNullish(inv?.po_number) || coerceNullish(inv?.ocr?.header?.poNumber)
  )
  if (direct) return direct

  const documents = []
  const ocrByType = inv?.ocr_by_type || {}

  for (const [docType, ocr] of Object.entries(ocrByType)) {
    if (!ocr) continue
    const enriched = enrichOcrPayload({ ...ocr, documentType: docType })
    documents.push({
      header: enriched?.header || ocr.header || {},
      fields: enriched?.fields || ocr.fields || [],
      lineItems: enriched?.lineItems || ocr.lineItems || []
    })
  }

  if (inv?.ocr && !ocrByType[inv.document_type || inv.ocr.documentType]) {
    const docType = inv.document_type || inv.ocr.documentType || 'invoice'
    const enriched = enrichOcrPayload({ ...inv.ocr, documentType: docType })
    documents.push({
      header: enriched?.header || inv.ocr.header || {},
      fields: enriched?.fields || inv.ocr.fields || [],
      lineItems: enriched?.lineItems || inv.ocr.lineItems || []
    })
  }

  const sections = inv?.validation_extraction?.sections || {}
  for (const sectionKey of [
    'A_invoice',
    'D_beritaAcara',
    'H_po',
    'I_poAppendix',
    'E_manhourSummary',
    'F_timesheet'
  ]) {
    const po = coerceNullish(sections[sectionKey]?.poNumber)
    if (po) {
      documents.push({ header: { poNumber: po }, fields: [], lineItems: [] })
    }
  }

  return collectPoNumberFromExtractDocuments(documents)
}

const mergeCanonicalExtractDocuments = (documents = []) => {
  const byType = new Map()

  for (const doc of documents) {
    const canon = doc?.documentType
    if (!canon) continue

    const existing = byType.get(canon)
    if (!existing) {
      byType.set(canon, { ...doc })
      continue
    }

    byType.set(canon, {
      ...existing,
      header: preferNonEmptyHeaderMerge(existing.header, doc.header),
      lineItems: [...(existing.lineItems || []), ...(doc.lineItems || [])],
      timesheets: [...(existing.timesheets || []), ...(doc.timesheets || [])],
      fields: [...(existing.fields || []), ...(doc.fields || [])],
      tables: [...(existing.tables || []), ...(doc.tables || [])],
      attendanceEntries: [
        ...(existing.attendanceEntries || []),
        ...(doc.attendanceEntries || [])
      ],
      appendixItems: [...(existing.appendixItems || []), ...(doc.appendixItems || [])],
      structuredFields: doc.structuredFields || existing.structuredFields || null,
      pdfUrl: existing.pdfUrl || doc.pdfUrl || null
    })
  }

  return [...byType.values()]
}

const isReceiptLikeRawType = (rawType) => {
  const token = normalizeDocTypeToken(rawType)
  return token === 'receipt' || token.includes('kwitansi')
}

const buildSyntheticInvoiceDocument = (documents, supplemental = [], fileName, poNumber) => {
  if (documents.some((doc) => doc.documentType === 'invoice')) return null

  const tax = documents.find((doc) => doc.documentType === 'tax_invoice')
  const receipt = supplemental.find(
    (doc) => isReceiptLikeRawType(doc.rawType) || doc.documentType === 'receipt'
  )
  if (!tax && !receipt) return null

  const header = normalizeExtractHeader(
    {
      ...(tax?.header || {}),
      ...(receipt?.header || {}),
      poNumber: poNumber || tax?.header?.poNumber || receipt?.header?.poNumber || null,
      vendorName: tax?.header?.vendorName || receipt?.header?.receivedFrom || null,
      grandTotal: tax?.header?.grandTotal || receipt?.header?.grandTotal || null,
      bankName: tax?.header?.bankName || receipt?.header?.bankName || null,
      bankAccount: tax?.header?.bankAccount || receipt?.header?.bankAccount || null
    },
    'invoice'
  )

  return {
    documentType: 'invoice',
    fileName,
    status: 'extracted',
    header,
    lineItems: tax?.lineItems?.length ? tax.lineItems : [],
    fields: [],
    validation: null,
    documentId: null
  }
}

/** Normalize nested `{ type, data }` extract API documents for the OCR mapper. */
export const normalizeClassifiedExtractPayload = (payload, fileName = '') => {
  const rawDocs = Array.isArray(payload?.documents) ? payload.documents : []
  if (!rawDocs.length) return []

  const normalized = []
  const supplemental = []

  for (const raw of rawDocs) {
    const skipped = flattenExtractApiDocument(raw, fileName, { includeSkipped: true })
    const mapped = flattenExtractApiDocument(raw, fileName)
    if (skipped && isReceiptLikeRawType(skipped.rawType)) supplemental.push(skipped)
    if (mapped) normalized.push(mapped)

    if (raw.appendix && typeof raw.appendix === 'object') {
      const appendixSource = raw.data && typeof raw.data === 'object' ? raw.data : {}
      const appendixRaw = {
        type: 'purchase_order_appendix',
        schemaId: raw.appendix.schemaId,
        fields: raw.appendix.fields,
        entries: raw.appendix.entries,
        data: {
          ...appendixSource,
          header: raw.appendix.fields,
          appendixItems: raw.appendix.entries?.appendixItems
        },
        pdfUrl: raw.pdfUrl,
        pdfPath: raw.pdfPath,
        status: raw.status
      }
      const appendixMapped = flattenExtractApiDocument(appendixRaw, fileName)
      if (appendixMapped) normalized.push(appendixMapped)
    }
  }

  const poNumber = collectPoNumberFromExtractDocuments([...normalized, ...supplemental])
  const withPo = normalized.map((doc) => {
    if (!poNumber) return doc
    if (doc.documentType === 'po' && !doc.header?.poNumber) {
      return {
        ...doc,
        header: preferNonEmptyHeaderMerge(doc.header, { poNumber })
      }
    }
    if (doc.header?.poNumber) return doc
    return {
      ...doc,
      header: preferNonEmptyHeaderMerge(doc.header, { poNumber })
    }
  })

  let merged = mergeCanonicalExtractDocuments(withPo)
  const poStructuredFields = resolvePurchaseOrderFieldsFromPayload({ documents: rawDocs })
  if (poStructuredFields) {
    const poRawDoc = findPurchaseOrderExtractDocument(rawDocs)
    const poHeader = coerceStructuredFieldsToHeader(poStructuredFields, 'po')
    const poIdx = merged.findIndex((doc) => doc.documentType === 'po')
    if (poIdx >= 0) {
      merged[poIdx] = {
        ...merged[poIdx],
        structuredFields: poStructuredFields,
        header: preferNonEmptyHeaderMerge(merged[poIdx].header, poHeader),
        pdfUrl: merged[poIdx].pdfUrl || poRawDoc?.pdfUrl || null
      }
    }
  }

  const synthetic = buildSyntheticInvoiceDocument(merged, supplemental, fileName, poNumber)
  return synthetic ? [synthetic, ...merged] : merged
}

export const computeLineItemAmount = (item) => {
  const direct = parseAmount(item?.amount)
  if (direct != null) return direct

  const qty = parseAmount(item?.quantity)
  const price = parseAmount(item?.unitPrice) ?? parseAmount(item?.manhourUnitRate)
  if (qty != null && price != null) return qty * price

  return null
}

/** SES line value — prefer extracted line value; legacy fallback qty × unit price. */
export const computeSesLineTotal = (item) => {
  const lineValue = parseAmount(item?.lineValue) ?? parseAmount(item?.amount)
  if (lineValue != null) return lineValue

  const qty = parseAmount(item?.quantity)
  const price = parseAmount(item?.unitPrice)
  if (qty != null && price != null) return qty * price

  return null
}

const reconcileSesLineItem = (item = {}) => {
  const next = { ...item }
  const poQty = next.poQty ?? next.poQuantity ?? next.po_qty
  if (poQty != null && poQty !== '') {
    next.quantity = String(poQty)
  }

  const lineVal = next.lineValue ?? next.line_value ?? next.amount ?? next.unitPrice
  if (lineVal != null && lineVal !== '') {
    next.lineValue = String(lineVal)
  }

  return next
}

export const OCR_MONEY_HEADER_KEYS = new Set([
  'taxAmount',
  'totalAmount',
  'grandTotal',
  'subtotal',
  'poValue',
  'totalSesValue',
  'totalSesValueUsd',
  'remainingPoBalance'
])

export const formatOcrMoneyHeader = (raw, currency = 'IDR') => {
  if (raw == null || raw === '') return null
  const parsed = parseAmount(raw)
  if (parsed == null || !Number.isFinite(parsed)) return String(raw)
  const cur = currency || 'IDR'
  const value = cur === 'IDR' ? Math.round(parsed) : parsed
  const useDecimals = cur === 'USD' || !Number.isInteger(value)
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: useDecimals ? 2 : 0,
    maximumFractionDigits: 2
  })
  return `${formatted} ${cur}`
}

export const getOcrMoneyFieldCurrency = (key, headerCurrency = 'IDR') => {
  if (key === 'totalSesValueUsd') return 'USD'
  return headerCurrency || 'IDR'
}

const liftSesUsdFromFields = (header = {}, fields = []) => {
  const existing = header.totalSesValueUsd
  if (existing != null && existing !== '') return String(existing)
  if (existing === 0) return '0.00'

  for (const field of fields) {
    const name = String(field?.fieldName || '').toLowerCase()
    if (!name.includes('usd')) continue
    if (name.includes('ses') || name.includes('total') || name.includes('value')) {
      const val = field?.fieldValue
      if (val != null && val !== '') return String(val)
      if (val === 0) return '0.00'
    }
  }
  return null
}

/** SES Description is the project name on SAP SES printouts. */
export const reconcileSesFields = (header = {}, fields = [], corpus = '') => {
  const next = { ...header }
  const description = next.sesDescription ?? next.projectName
  if (description) {
    next.projectName = description
  }

  const usdAliases = [
    next.totalSesValueUsd,
    next.totalSESValueUSD,
    next.sesValueUsd,
    next.totalValueUsd,
    next.totalSesValueInUsd
  ]
  for (const candidate of usdAliases) {
    if (candidate != null && candidate !== '') {
      next.totalSesValueUsd = String(candidate)
      break
    }
    if (candidate === 0) {
      next.totalSesValueUsd = '0.00'
      break
    }
  }

  const liftedUsd = liftSesUsdFromFields(next, fields)
  if (liftedUsd != null) {
    next.totalSesValueUsd = liftedUsd
  }

  if (next.totalSesValueUsd == null || next.totalSesValueUsd === '') {
    const fromCorpus = extractSesValueUsd(corpus)
    if (fromCorpus != null) {
      next.totalSesValueUsd = fromCorpus
    }
  }

  return next
}

/** Build validation_extraction.sections from a single OCR document result. */
const pickFirstAmount = (...values) => {
  for (const value of values) {
    if (value == null || value === '') continue
    const parsed = typeof value === 'number' ? value : parseAmount(value)
    if (parsed != null && Number.isFinite(parsed)) return parsed
  }
  return null
}

const resolveVatAmount = (header = {}, totals = {}) =>
  pickFirstAmount(totals.taxAmount, header.taxAmount)

/** Invoice grand total = subtotal + VAT when OCR captured subtotal as the total. */
export const resolveInvoiceGrandTotal = ({
  subtotal,
  taxAmount,
  vatAmount,
  grandTotal,
  totalAmount,
  calculatedGrandTotal
} = {}) => {
  const sub = parseAmount(subtotal)
  const tax = parseAmount(taxAmount) ?? parseAmount(vatAmount) ?? 0
  const grand = parseAmount(grandTotal)
  const inclusive = parseAmount(totalAmount)
  const calculated = parseAmount(calculatedGrandTotal)
  const combined = sub != null ? sub + tax : null

  // OCR `totalAmount` is the document grand total including tax.
  if (inclusive != null && sub != null && inclusive > sub + 0.5) {
    if (tax <= 0 || Math.abs(inclusive - (sub + tax)) <= 1) return inclusive
  }

  if (sub != null && combined != null) {
    if (tax > 0) {
      if (grand == null) return inclusive ?? combined
      if (Math.abs(grand - sub) < 1) return inclusive ?? combined
    }
    if (
      inclusive != null &&
      grand != null &&
      Math.abs(grand - sub) < 1 &&
      inclusive > grand + 0.5
    ) {
      return inclusive
    }
    return grand ?? inclusive ?? calculated ?? combined
  }

  return grand ?? inclusive ?? calculated
}

/** Prefer net total / grand−VAT when VAT and grand total reconcile. */
const resolveInvoiceSubtotal = ({
  subtotal,
  totalAmount,
  taxAmount,
  vatAmount,
  grandTotal,
  lineItemsSubtotal
} = {}) => {
  const tax = pickFirstAmount(taxAmount, vatAmount) ?? 0
  const grand = parseAmount(grandTotal)
  const net = parseAmount(totalAmount)
  const explicit = parseAmount(subtotal)
  const lineSum = parseAmount(lineItemsSubtotal)

  if (net != null && grand != null && tax > 0 && Math.abs(net + tax - grand) <= 1) {
    return net
  }

  if (grand != null && tax > 0) {
    const derived = grand - tax
    if (derived > 0) {
      if (explicit != null && Math.abs(explicit + tax - grand) <= 1) return explicit
      if (net != null && Math.abs(net - derived) <= 1) return net
      if (explicit == null || Math.abs(explicit - derived) > 1) return derived
    }
  }

  return pickFirstAmount(explicit, net, lineSum)
}

/** Resolve invoice subtotal, VAT, and grand total from type=invoice OCR + persisted fields. */
export const resolveInvoiceExtractedTotals = (inv = {}) => {
  const invoiceOcr = inv?.ocr_by_type?.invoice
  const ocr = invoiceOcr || inv?.ocr
  const enriched = ocr
    ? enrichOcrPayload({
        ...ocr,
        documentType: invoiceOcr ? 'invoice' : ocr.documentType || inv?.document_type || 'invoice'
      })
    : null
  const hdr = enriched?.header || ocr?.header || {}
  const ocrTotals = enriched ? getOcrTotalsSummary(enriched) : {}
  const sections = inv?.validation_extraction?.sections || {}
  const sectionA = sections.A_invoice || {}
  const taxSection = resolveTaxInvoiceSectionData(inv)

  const vatAmount = pickFirstAmount(
    ocrTotals.taxAmount,
    sectionA.vatAmount,
    sectionA.totals?.vatAmount,
    inv?.vat_amount,
    hdr.taxAmount,
    taxSection.vatAmount
  )

  const explicitInvoiceGrandTotal = resolveExplicitGrandTotal(inv)
  const grandTotal =
    explicitInvoiceGrandTotal ??
    resolveInvoiceGrandTotal({
      subtotal: ocrTotals.subtotal ?? hdr.subtotal,
      vatAmount,
      grandTotal: hdr.grandTotal ?? sectionA.grandTotal ?? sectionA.totals?.grandTotal,
      totalAmount: hdr.totalAmount,
      calculatedGrandTotal: hdr.calculatedGrandTotal
    })

  const subtotal = resolveInvoiceSubtotal({
    subtotal: pickFirstAmount(
      ocrTotals.subtotal,
      sectionA.totals?.subtotal,
      inv?.subtotal,
      hdr.subtotal
    ),
    totalAmount: pickFirstAmount(hdr.totalAmount, sectionA.totalAmount, ocrTotals.totalAmount),
    taxAmount: vatAmount,
    grandTotal,
    lineItemsSubtotal: ocrTotals.lineItemsSubtotal
  })

  return {
    currency: inv?.currency || ocrTotals.currency || hdr.currency || 'IDR',
    subtotal,
    vatAmount,
    grandTotal
  }
}

/** Resolve bank details from invoice OCR (commercial invoice document preferred). */
export const resolveInvoiceBankDetails = (inv = {}) => {
  const invoiceOcr = inv?.ocr_by_type?.invoice || null
  const receiptOcr = inv?.ocr_by_type?.receipt || null
  const noticeOcr = inv?.ocr_by_type?.notice || null
  const hdr = { ...(inv?.ocr?.header || {}), ...(invoiceOcr?.header || {}) }
  const receiptHdr = receiptOcr?.header || {}
  const noticeHdr = noticeOcr?.header || {}
  const bundle = inv?.validation_extraction?.validationBundle?.invoice || {}
  const sectionA = inv?.validation_extraction?.sections?.A_invoice || {}
  const sectionBank = sectionA.bankDetails || {}

  let bankName =
    hdr.bankName ||
    inv.bank_name ||
    bundle.bank_name ||
    sectionBank.bankName ||
    sectionA.bankName ||
    null
  let bankAccount =
    hdr.bankAccount ||
    hdr.bankAccountNumber ||
    inv.bank_account ||
    bundle.bank_account ||
    sectionBank.bankAccount ||
    sectionA.bankAccount ||
    sectionA.bankAccountNumber ||
    null
  let accountHolder =
    hdr.accountHolder ||
    hdr.bankAccountName ||
    sectionBank.accountHolder ||
    sectionA.accountHolder ||
    null
  let bankBranch = hdr.bankBranch || sectionBank.bankBranch || sectionA.bankBranch || null

  const fromInvoiceFields = applyBankFieldsToHeader(
    coerceStructuredFieldsToHeader(invoiceOcr?.fields, 'invoice'),
    normalizeExtractFields(invoiceOcr?.fields || [])
  )
  bankName = bankName || fromInvoiceFields.bankName
  bankAccount =
    bankAccount || fromInvoiceFields.bankAccount || fromInvoiceFields.bankAccountNumber
  accountHolder = accountHolder || fromInvoiceFields.accountHolder
  bankBranch = bankBranch || fromInvoiceFields.bankBranch

  const receiptBankText =
    receiptHdr.bankDetails ||
    receiptHdr['Mohon Dikirimkan Di'] ||
    noticeHdr.bankDetails ||
    noticeHdr['Mohon Dikirimkan Di'] ||
    null
  const fromReceipt = extractIndonesianBankDetails(receiptBankText)
  if (fromReceipt) {
    bankName = bankName || fromReceipt.bankName
    bankAccount = bankAccount || fromReceipt.bankAccount
    accountHolder = accountHolder || fromReceipt.accountHolder
    bankBranch = bankBranch || fromReceipt.bankBranch
  }

  return {
    bankName,
    bankAccount,
    accountHolder,
    bankBranch
  }
}

/** Account number string for bank validation checklist comparison. */
export const formatBankComparisonLine = ({ bankAccount } = {}) => {
  const account = bankAccount != null ? String(bankAccount).trim() : ''
  return account || null
}

/** Structured bank rows for the validation Bank tab detail list. */
export const buildBankValidationDetails = (bank = {}) => {
  const account = formatBankComparisonLine(bank)
  if (!account) return []

  return [{ label: 'Account number', value: account, status: 'PASS' }]
}

export const normalizeTaxInvoiceOcr = (ocrPayload) => {
  if (!ocrPayload) return null
  return enrichOcrPayload({
    ...ocrPayload,
    documentType: 'tax_invoice'
  })
}

/** Resolve tax-invoice section fields without using invoice (A) VAT data. */
export const resolveTaxInvoiceSectionData = (inv = {}) => {
  const sections = inv?.validation_extraction?.sections || {}
  const section = sections.B_taxInvoice || {}
  const meta = inv?.tax_invoice_meta || {}
  const taxOcr = normalizeTaxInvoiceOcr(inv?.ocr_by_type?.tax_invoice)
  const taxHdr = taxOcr?.header || {}
  const taxFields = taxOcr?.fields || []
  const taxTotals = taxOcr ? getOcrTotalsSummary(taxOcr) : {}
  const bundleVat = inv?.validation_extraction?.validationBundle?.tax_invoice?.vat_amount

  const ppnFromFields = (() => {
    for (const f of taxFields) {
      const name = normalizeLabelKey(f?.fieldName || f?.name || '')
      if ((name.includes('jumlah ppn') || name.includes('ppn')) && !name.includes('ppnbm')) {
        return coerceNullish(f?.fieldValue ?? f?.value)
      }
    }
    return null
  })()

  const vatAmount = pickFirstAmount(
    meta.vatAmount,
    taxTotals.taxAmount,
    taxHdr.taxAmount,
    taxHdr.vatAmount,
    ppnFromFields,
    section.totals?.vatAmount,
    section.vatAmount,
    bundleVat
  )

  const taxInvoiceNumber =
    meta.taxInvoiceNumber ??
    section.taxInvoiceNumber ??
    taxHdr.taxInvoiceNumber ??
    pickFieldValue(taxFields, 'faktur pajak', 'nomor seri') ??
    null

  const date =
    meta.date ??
    section.date ??
    taxHdr.invoiceDate ??
    extractDateFromText(pickFieldValue(taxFields, 'tanggal ditandatangani')) ??
    null

  return {
    taxInvoiceNumber,
    date,
    vatAmount
  }
}

const uniqueOrderedRoles = (roles = []) => [...new Set(roles.filter(Boolean))]

const normalizeRoleToken = (role) => {
  if (role == null || role === '') return null
  if (typeof role === 'string') return role
  if (typeof role === 'object') return role.role ?? role.name ?? null
  return String(role)
}

/** Unique roles from per-manpower timesheet sheets. */
export const collectManpowerRolesFromSheets = (sheets = []) =>
  uniqueOrderedRoles(
    (Array.isArray(sheets) ? sheets : []).map((sheet) => normalizeRoleToken(sheet?.role))
  )

/** Unique roles from flat rows — one role per manpower identity when available. */
export const collectManpowerRolesFromRows = (rows = []) => {
  const roles = []
  const seenPeople = new Set()
  let hasIdentity = false

  for (const row of rows) {
    const name = row?.manpowerName || row?.name
    const user = row?.username
    if (name || user) hasIdentity = true
    const identity = `${name || ''}|${user || ''}`
    if (seenPeople.has(identity)) continue
    seenPeople.add(identity)
    const role = normalizeRoleToken(row?.role)
    if (role) roles.push(role)
  }

  if (!hasIdentity) {
    return uniqueOrderedRoles(rows.map((row) => normalizeRoleToken(row?.role)))
  }

  return uniqueOrderedRoles(roles)
}

/** Unique roles from structured manpower summary rows. */
export const collectManpowerRolesFromManpower = (manpower = []) => {
  const roles = []
  const seenPeople = new Set()

  for (const row of manpower) {
    const name = row?.name || row?.manpowerName
    const user = row?.username
    const identity = `${name || ''}|${user || ''}`
    if (seenPeople.has(identity)) continue
    seenPeople.add(identity)
    const role = normalizeRoleToken(row?.role)
    if (role) roles.push(role)
  }

  return uniqueOrderedRoles(roles)
}

const normalizeManpowerKey = (value) =>
  value == null || value === '' ? '' : String(value).trim().toLowerCase()

/** Map manpower name / ID → Position from type=summary_calculation_manhour (manhour_summary). */
export const buildManhourSummaryRoleLookup = (inv = {}) => {
  const manhourOcr =
    inv?.ocr_by_type?.manhour_summary ||
    (inv?.document_type === 'manhour_summary' ? inv?.ocr : null)
  const lines = manhourOcr?.lineItems || []
  const byName = new Map()
  const byUsername = new Map()
  const roles = []

  for (const row of lines) {
    const role = row?.role ?? row?.Position ?? null
    if (!role) continue
    roles.push(role)
    const name = row?.manpowerName ?? row?.Name
    const username = row?.username ?? row?.['ID No.'] ?? row?.idNo
    if (name) byName.set(normalizeManpowerKey(name), role)
    if (username) byUsername.set(String(username).trim(), role)
  }

  return { byName, byUsername, roles: uniqueOrderedRoles(roles) }
}

export const resolveRoleFromManhourSummary = (lookup, { manpowerName, username } = {}) => {
  if (!lookup) return null
  if (username) {
    const byUser = lookup.byUsername.get(String(username).trim())
    if (byUser) return byUser
  }
  if (manpowerName) {
    const byName = lookup.byName.get(normalizeManpowerKey(manpowerName))
    if (byName) return byName
  }
  return null
}

/** Fill timesheet sheet/entry roles from summary_calculation_manhour Position when missing. */
export const enrichTimesheetSheetsWithManhourSummaryRoles = (sheets = [], inv = {}) => {
  const lookup = buildManhourSummaryRoleLookup(inv)
  if (!lookup.roles.length) return sheets

  return (Array.isArray(sheets) ? sheets : []).map((sheet) => {
    const role =
      sheet?.role ||
      resolveRoleFromManhourSummary(lookup, {
        manpowerName: sheet?.manpowerName,
        username: sheet?.username
      })
    if (!role) return sheet
    return {
      ...sheet,
      role,
      entries: (sheet.entries || []).map((entry) => ({
        ...entry,
        role: entry?.role || role
      }))
    }
  })
}

/** Manpower roles for Timesheet tab — prefer Position from summary_calculation_manhour. */
export const resolveTimesheetManpowerRoles = (inv = {}, sheets = []) => {
  const lookup = buildManhourSummaryRoleLookup(inv)
  if (lookup.roles.length) return lookup.roles

  const enrichedSheets = enrichTimesheetSheetsWithManhourSummaryRoles(sheets, inv)
  if (enrichedSheets.length) return collectManpowerRolesFromSheets(enrichedSheets)

  const timesheetOcr =
    inv?.ocr_by_type?.timesheet || (inv?.document_type === 'timesheet' ? inv?.ocr : null)
  if (timesheetOcr?.lineItems?.length) {
    return collectManpowerRolesFromRows(timesheetOcr.lineItems)
  }

  return []
}

/** Build per-manpower timesheet groups from structured OCR or flat line items. */
const normalizeTimesheetSheet = (sheet, header = {}) =>
  finalizeTimesheetSheetEntries({
    manpowerName: sheet?.manpowerName ?? null,
    username: sheet?.username ?? null,
    role: sheet?.role ?? null,
    periodStart: sheet?.periodStart ?? header?.periodStart ?? null,
    periodEnd: sheet?.periodEnd ?? header?.periodEnd ?? null,
    totalRegularManhour: sheet?.totalRegularManhour ?? null,
    totalOvertimeManhour: sheet?.totalOvertimeManhour ?? null,
    sheetPages: Array.isArray(sheet?.sheetPages) ? sheet.sheetPages : [],
    entries: Array.isArray(sheet?.entries) ? sheet.entries : []
  })

export const resolveTimesheetManpowerSheets = (ocr = {}, lineItems = [], header = {}) => {
  if (Array.isArray(ocr?.timesheets) && ocr.timesheets.length) {
    return ocr.timesheets.map((sheet) => normalizeTimesheetSheet(sheet, header))
  }

  const rows = lineItems.length ? lineItems : ocr?.lineItems || []
  if (!rows.length) return []

  let currentSheet = null
  const groups = []

  for (const row of rows) {
    const entry = reconcileTimesheetEntryHours({
      date: row.date ?? null,
      basicTime: row.basicTime ?? row.basic_time,
      otActual: row.otActual ?? row.ot_actual,
      regularManhour: row.regularManhour ?? null,
      overtimeManhour: row.overtimeManhour ?? null
    })
    if (!entry.date && !entry.regularManhour && !entry.overtimeManhour) continue

    const name = row.manpowerName || null
    const role = row.role || null
    const username = row.username || null

    if (name) {
      const key = `${name}|${role || ''}|${username || ''}`
      let sheet = groups.find(
        (g) => `${g.manpowerName || ''}|${g.role || ''}|${g.username || ''}` === key
      )
      if (!sheet) {
        sheet = normalizeTimesheetSheet({ manpowerName: name, username, role }, header)
        groups.push(sheet)
      }
      currentSheet = sheet
    }

    if (!currentSheet) continue
    currentSheet.entries.push(entry)
  }

  return groups.map((sheet) => finalizeTimesheetSheetEntries(sheet))
}

/** Build A_nonPoTravel section payload from enriched invoice OCR header + line items. */
export const buildNonPoTravelSectionData = (header = {}, lineItems = [], totals = {}) => {
  const line =
    lineItems.find((item) => isTravelTicketLineItem(item, header)) || lineItems[0] || {}
  const routing = header.routing || line.routing || line.route || ''
  const routeParts = routing ? splitTravelRoute(routing) : { from: null, to: null }
  const corpus = [
    header.serviceName,
    line.description,
    line.routing,
    line.remarks,
    header.paymentTerms
  ]
    .filter(Boolean)
    .join('\n')
  const routeCodes = parseTravelRouteCodesFromText(corpus)
  const vatAmount = resolveVatAmount(header, totals)
  const invoiceSubtotal =
    totals.subtotal != null
      ? totals.subtotal
      : parseAmount(header.subtotal) ?? parseAmount(header.totalAmount) ?? parseAmount(line.amount)
  const grandTotal = resolveInvoiceGrandTotal({
    subtotal: invoiceSubtotal,
    vatAmount,
    grandTotal: totals.grandTotal ?? parseAmount(header.grandTotal),
    totalAmount: parseAmount(header.totalAmount),
    calculatedGrandTotal: header.calculatedGrandTotal
  })
  const bankDetails = [header.bankName, header.bankAccount, header.accountHolder]
    .filter(Boolean)
    .join(' · ')

  return {
    invoiceNo: header.invoiceNumber || header.invNo || header.invoiceNo || null,
    invoiceDate: header.invoiceDate || header.date || null,
    invoiceDueDate: header.dueDate || null,
    passengerName: header.passengerName || line.passengerName || line.manpowerName || null,
    ticketClass: header.ticketClass || line.ticketClass || line.ticket_class || null,
    routeFrom: header.routeFrom || line.routeFrom || routeParts.from || null,
    routeTo: header.routeTo || line.routeTo || routeParts.to || null,
    confirmNo: header.confirmNo || line.confirmNo || line.confirm_no || null,
    ticketNo: header.ticketNo || line.ticketNo || line.ticket_no || null,
    airline: header.airline || line.airline || null,
    flightNo: header.flightNo || line.flightNo || line.flight || line.flight_no || null,
    routeCodeFrom: header.routeCodeFrom || line.routeCodeFrom || routeCodes.from || null,
    routeCodeTo: header.routeCodeTo || line.routeCodeTo || routeCodes.to || null,
    amount: invoiceSubtotal != null ? String(invoiceSubtotal) : header.subtotal || null,
    vatAmount,
    totalAmount: grandTotal != null ? String(grandTotal) : null,
    bankDetails: bankDetails || null,
    currency: totals.currency || header.currency || 'IDR'
  }
}

export const buildValidationExtractionFromOcr = (
  documentType,
  header = {},
  totals = {},
  lineItems = [],
  extras = {}
) => {
  if (documentType === 'notice') {
    const vatAmount = resolveVatAmount(header, totals)
    return {
      activeSection: 'C_notice',
      sections: {
        C_notice: {
          taxInvoiceNumber: header.taxInvoiceNumber || null,
          date: header.invoiceDate || header.date || null,
          vatAmount,
          totals: {
            vatAmount,
            currency: totals.currency || header.currency || 'IDR'
          }
        }
      }
    }
  }

  if (documentType === 'tax_invoice') {
    const vatAmount = resolveVatAmount(header, totals)
    return {
      activeSection: 'B_taxInvoice',
      sections: {
        B_taxInvoice: {
          taxInvoiceNumber: header.taxInvoiceNumber || null,
          date: header.invoiceDate || null,
          vatAmount,
          totals: {
            vatAmount,
            currency: totals.currency || header.currency || 'IDR'
          }
        }
      }
    }
  }

  if (documentType === 'berita_acara') {
    const manpowerFromLines = lineItems
      .map((l) => ({ name: l.manpowerName, role: l.role }))
      .filter((row) => row.name)
    const manpower = manpowerFromLines.length ? manpowerFromLines : extras.manpower || null
    const roles = [
      ...new Set([
        ...lineItems.map((l) => l.role).filter(Boolean),
        ...(Array.isArray(header.manpowerRoles)
          ? header.manpowerRoles
          : header.manpowerRoles
            ? String(header.manpowerRoles)
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean)
            : [])
      ])
    ]
    const hasApproval =
      header.preparedBy || header.reviewedBy || header.acknowledgedBy || header.approvedBy
    return {
      activeSection: 'D_beritaAcara',
      sections: {
        D_beritaAcara: {
          poNumber: header.poNumber || null,
          periodStart: header.periodStart || null,
          periodEnd: header.periodEnd || null,
          manhourPercentageCompletion:
            header.manhourCompletionPct ?? header.manhourPercentageCompletion ?? null,
          thisManhours: header.thisManhours ?? null,
          serviceName: header.serviceName || null,
          manpowerRoles: roles.length ? roles : header.manpowerRoles || null,
          manpower: manpower?.length ? manpower : null,
          approvalCheck: hasApproval
            ? {
                prepared: Boolean(header.preparedBy),
                reviewed: Boolean(header.reviewedBy),
                acknowledged: Boolean(header.acknowledgedBy),
                approved: Boolean(header.approvedBy)
              }
            : null
        }
      }
    }
  }

  if (documentType === 'invoice') {
    const workflow =
      header.invoiceWorkflow ||
      (isTravelDomesticInvoice(header) ? 'NON_PO' : detectInvoiceWorkflow(header))
    if (workflow === 'NON_PO') {
      return {
        activeSection: 'A_nonPoTravel',
        sections: {
          A_nonPoTravel: buildNonPoTravelSectionData(header, lineItems, totals)
        }
      }
    }

    const roles = collectManpowerRolesFromRows(lineItems)
    const vatAmount = resolveVatAmount(header, totals)
    const grandTotal = resolveInvoiceGrandTotal({
      subtotal: totals.subtotal ?? parseAmount(header.subtotal),
      vatAmount,
      grandTotal: totals.grandTotal ?? parseAmount(header.grandTotal),
      totalAmount: parseAmount(header.totalAmount),
      calculatedGrandTotal: header.calculatedGrandTotal
    })
    const invoiceSubtotal = resolveInvoiceSubtotal({
      subtotal: totals.subtotal ?? parseAmount(header.subtotal),
      totalAmount: parseAmount(header.totalAmount),
      taxAmount: vatAmount,
      grandTotal,
      lineItemsSubtotal: totals.lineItemsSubtotal
    })
    return {
      activeSection: 'A_invoice',
      sections: {
        A_invoice: {
          invoiceNo: header.invoiceNumber || null,
          poNumber: header.poNumber || null,
          vendorName: header.vendorName || null,
          date: header.invoiceDate || null,
          paymentTerms: header.paymentTerms || null,
          invoiceWorkflow: header.invoiceWorkflow || detectInvoiceWorkflow(header),
          manhourUnitRateCalculation:
            header.manhourUnitRateCalculation || header.manhourUnitRate || null,
          totalAmount: invoiceSubtotal != null ? String(invoiceSubtotal) : header.subtotal || null,
          vatAmount,
          grandTotal: grandTotal != null ? String(grandTotal) : null,
          bankDetails: {
            bankName: header.bankName || null,
            bankAccount: header.bankAccount || null,
            bankBranch: header.bankBranch || null,
            accountHolder: header.accountHolder || null
          },
          serviceName: header.serviceName || null,
          manpowerRoles: roles.length ? roles : header.manpowerRoles || null,
          totals: {
            subtotal: invoiceSubtotal,
            vatAmount,
            grandTotal,
            currency: totals.currency || header.currency || 'IDR'
          }
        }
      }
    }
  }

  if (documentType === 'manhour_summary') {
    const manpower = lineItems
      .map((l) => ({
        name: l.manpowerName,
        role: l.role,
        regularManhour: l.regularManhour,
        overtimeManhour: l.overtimeManhour
      }))
      .filter((row) => row.name || row.role)
    const roles = collectManpowerRolesFromManpower(manpower)
    const manpowerCount =
      header.manpowerCount ?? (manpower.length ? String(manpower.length) : null)
    return {
      activeSection: 'E_manhourSummary',
      sections: {
        E_manhourSummary: {
          poNumber: header.poNumber || null,
          periodStart: header.periodStart || null,
          periodEnd: header.periodEnd || null,
          totalRegularManhour: header.totalRegularManhour || null,
          totalOvertimeManhour: header.totalOvertimeManhour || null,
          manpowerCount,
          manpowerRoles: roles.length ? roles : null,
          manpower
        }
      }
    }
  }

  if (documentType === 'attendance') {
    return {
      activeSection: 'G_attendance',
      sections: {
        G_attendance: {
          site: header.site || null,
          periodStart: header.periodStart || null,
          periodEnd: header.periodEnd || null,
          vendorName: header.vendorName || null,
          lineItems
        }
      }
    }
  }

  if (documentType === 'timesheet') {
    const manpowerSheets = resolveTimesheetManpowerSheets(
      { timesheets: extras.timesheets },
      lineItems,
      header
    )
    const roles = collectManpowerRolesFromSheets(manpowerSheets)
    const names = [...new Set(manpowerSheets.map((s) => s.manpowerName).filter(Boolean))]
    return {
      activeSection: 'F_timesheet',
      sections: {
        F_timesheet: {
          poNumber: header.poNumber || null,
          periodStart: header.periodStart || null,
          periodEnd: header.periodEnd || null,
          manpowerRoles: roles.length ? roles : null,
          manpowerNames: names.length ? names : null,
          manpowerCount: manpowerSheets.length || null,
          manpowerSheets,
          entries: lineItems
        }
      }
    }
  }

  if (documentType === 'po') {
    return {
      activeSection: 'H_po',
      sections: {
        H_po: {
          poHeaderInformation: header.poHeaderInformation || null,
          description: header.description || null,
          deliveryDate: header.deliveryDate || null,
          poNumber: header.poNumber || null,
          poDate: header.poDate || null,
          vendorName: header.vendorName || null,
          vendorCode: header.vendorCode || null,
          buyerName: header.buyerName || null,
          projectName: header.projectName || null,
          requisitionNo: header.requisitionNo || null,
          serviceStartDate: header.serviceStartDate || null,
          serviceEndDate: header.serviceEndDate || null,
          currency: header.currency || null,
          paymentTerms: header.paymentTerms || null,
          incoterms: header.incoterms || null,
          totalAmount: header.totalAmount || null,
          lineItems
        }
      }
    }
  }

  if (documentType === 'po_appendix') {
    return {
      activeSection: 'I_poAppendix',
      sections: {
        I_poAppendix: {
          poHeaderInformation: header.poHeaderInformation || null,
          poNumber: header.poNumber || null,
          poDate: header.poDate || null,
          vendorName: header.vendorName || null,
          currency: header.currency || null,
          lineItems
        }
      }
    }
  }

  if (documentType === 'ses') {
    return {
      activeSection: 'K_ses',
      sections: {
        K_ses: {
          sesHeaderInfo: header.sesHeaderInfo || null,
          qty: header.quantity ?? header.qty ?? null,
          sesNo: header.sesNo || null,
          poNumber: header.poNumber || null,
          transactionDate: header.transactionDate || null,
          vendorName: header.vendorName || null,
          site: header.site || null,
          projectName: header.projectName || header.sesDescription || null,
          totalSesValue: header.totalSesValue || null,
          currency: header.currency || null,
          lineItems
        }
      }
    }
  }

  return null
}

export const VALIDATION_SECTION_LABELS = {
  A_invoice: 'A. Invoice',
  B_taxInvoice: 'B. Tax Invoice (VAT)',
  C_notice: 'C. Notice',
  D_beritaAcara: 'D. Work Progress Certificate (Berita Acara)',
  E_manhourSummary: 'E. Summary Calculation Manhour',
  F_timesheet: 'F. Daily Time Sheet',
  G_attendance: 'G. Daily Attendance (Biometrics)',
  H_po: 'H. PO Header',
  I_poAppendix: 'I. PO Appendix',
  K_ses: 'K. Service Entry Sheet (SES)'
}

/** User-facing labels for document types in validation checklist rows. */
export const VALIDATION_DOC_TYPE_LABELS = {
  invoice: 'Invoice',
  tax_invoice: 'Tax Invoice (Faktur Pajak)',
  berita_acara: 'Berita Acara',
  manhour_summary: 'Summary Calculation Manhour',
  timesheet: 'Daily Timesheet',
  attendance: 'Daily Attendance',
  po: 'PO',
  po_appendix: 'PO Appendix',
  ses: 'Service Entry Sheet (SES)'
}

/** Replace raw document type keys in DOC_COMPLETENESS comma-separated lists. */
export const formatDocCompletenessList = (value) => {
  if (value == null || value === '') return value

  const seen = new Set()
  const labels = []

  for (const segment of String(value).split(',')) {
    const raw = segment.trim()
    if (!raw) continue

    const canon = normalizeValidationDocumentType(raw) || raw
    if (seen.has(canon)) continue
    seen.add(canon)
    labels.push(VALIDATION_DOC_TYPE_LABELS[canon] ?? canon)
  }

  return labels.join(', ')
}

const SES_DEVIATION_HIDDEN_DETAIL =
  /invoice grand total|ses total value|minimum ses|maximum ses|difference \(ses/i

/** Normalize SES checklist detail rows (handles legacy persisted validation). */
export const normalizeSesDeviationDetails = (details = []) => {
  const rows = Array.isArray(details) ? details : []
  const hasCurrentShape = rows.some((d) =>
    /total amount excluding vat|maximum ses amount|ses 2% tolerance/i.test(d?.label || '')
  )
  if (hasCurrentShape) {
    return rows.filter((d) => !SES_DEVIATION_HIDDEN_DETAIL.test(d?.label || ''))
  }

  const invoiceRow =
    rows.find((d) => /invoice subtotal/i.test(d?.label || '')) ||
    rows.find((d) => /invoice grand total/i.test(d?.label || ''))
  const toleranceRow = rows.find((d) => /maximum ses/i.test(d?.label || ''))
  const differenceRow =
    rows.find((d) => /^difference/i.test(d?.label || '')) ||
    rows.find((d) => /difference \(ses/i.test(d?.label || ''))

  const normalized = []
  if (invoiceRow) {
    normalized.push({ ...invoiceRow, label: 'Invoice subtotal', value: invoiceRow.value })
    normalized.push({ label: 'Total amount excluding VAT', value: invoiceRow.value })
  }
  if (toleranceRow) {
    normalized.push({
      ...toleranceRow,
      label: 'Maximum SES amount',
      value: toleranceRow.value
    })
  }
  if (differenceRow) {
    normalized.push({ ...differenceRow, label: 'Difference', value: differenceRow.value })
  }

  return normalized.length
    ? normalized
    : rows.filter((d) => !SES_DEVIATION_HIDDEN_DETAIL.test(d?.label || ''))
}

/** Structured rows for role-based rate validation checklist table. */
export const normalizeRateValidationDetails = (details = []) => {
  const rows = Array.isArray(details) ? details : []
  return rows.map((row) => ({
    category: row.label || row.category || '—',
    invoicedAmount: row.invoicedAmount ?? null,
    contractAmount: row.contractAmount ?? null,
    hours: row.hours ?? null,
    appliedRate: row.appliedRate ?? null,
    poRate: row.poRate ?? null,
    status: row.status || null,
    issue: row.issue ?? row.value ?? null
  }))
}

/** Maps backend validation severities to the ValidateTab status vocabulary. */
const isNotApplicableValidationMessage = (message) =>
  /not applicable/i.test(String(message || ''))

const resolveValidationCheckStatus = (rule) => {
  if (rule.severity === 'SKIP' || isNotApplicableValidationMessage(rule.message)) {
    return 'na'
  }
  return VALIDATION_SEVERITY_TO_STATUS[rule.severity] || 'fail'
}

const VALIDATION_SEVERITY_TO_STATUS = {
  PASS: 'pass',
  WARNING: 'fail',
  FAIL: 'fail',
  BLOCKED: 'fail',
  SKIP: 'na'
}

/** Converts the backend `validation` object into the checks rows the UI renders. */
export const mapValidationChecks = (validation) =>
  (validation?.results || []).map((rule) => {
    const details =
      rule.ruleCode === 'SES_DEVIATION' && rule.details
        ? normalizeSesDeviationDetails(rule.details)
        : rule.ruleCode === 'RATE_VALIDATION' && rule.details
          ? normalizeRateValidationDetails(rule.details)
          : rule.details || null

    return {
      sequence: rule.sequence,
      ruleCode: rule.ruleCode,
      name: rule.ruleName,
      title: rule.ruleName,
      severity: rule.severity,
      status:
        rule.ruleCode === 'RATE_VALIDATION'
          ? resolveRateValidationStatus({
              ruleCode: rule.ruleCode,
              severity: rule.severity,
              message: rule.message,
              details
            })
          : resolveValidationCheckStatus(rule),
      expected:
        rule.ruleCode === 'DOC_COMPLETENESS'
          ? formatDocCompletenessList(rule.expectedValue)
          : rule.expectedValue,
      actual:
        rule.ruleCode === 'DOC_COMPLETENESS'
          ? formatDocCompletenessList(rule.actualValue)
          : rule.actualValue,
      message: rule.message,
      details,
      fields: rule.fields ?? null,
      comparisons: rule.comparisons ?? null,
      variance: rule.variance ?? null,
      sourceTable: rule.sourceTable ?? null,
      sourceRecordId: rule.sourceRecordId ?? null,
      expectedLabel: rule.expectedLabel ?? null,
      actualLabel: rule.actualLabel ?? null
    }
  })

const VALIDATION_STATUS_TO_OVERALL = {
  PASS: 'approved',
  WARNING: 'fail',
  FAIL: 'fail',
  BLOCKED: 'fail'
}

const VALIDATION_STATUS_RANK = {
  PASS: 0,
  WARNING: 1,
  FAIL: 2,
  BLOCKED: 3
}

/** Prefer the worse of backend overallStatus vs checklist-derived status (e.g. SAP mapping FAIL). */
const worseValidationOverallStatus = (left, right) => {
  const a = String(left || '').toUpperCase()
  const b = String(right || '').toUpperCase()
  if (!a) return b || null
  if (!b) return a || null
  const rankA = VALIDATION_STATUS_RANK[a] ?? 0
  const rankB = VALIDATION_STATUS_RANK[b] ?? 0
  return rankA >= rankB ? a : b
}

export const isNonPoTravelUploadFileName = (fileName = '') => {
  const name = String(fileName).toLowerCase()
  return (
    name.includes('ocrold') ||
    name.includes('wisata kawan') ||
    name.includes('wisata_kawan') ||
    name.includes('wisata-kawan') ||
    name.includes('290518 wisata')
  )
}

/** PO demo bundle uploads (pass vs fail validation scenarios). */
export const isPoDemoUploadFileName = (fileName = '') => {
  const name = String(fileName).toLowerCase()
  return name.includes('po_nomatch') || name.includes('po_match')
}

export const resolveDemoScenario = (inv = {}, header = {}) => {
  const fromExtract =
    inv.demo_scenario ?? header.demoScenario ?? inv?.ocr?.header?.demoScenario ?? null
  if (fromExtract === 'po_match' || fromExtract === 'po_nomatch' || fromExtract === 'ocrold') {
    return fromExtract
  }

  const fileName = String(inv.file_name || inv.fileName || '').toLowerCase()
  if (fileName.includes('po_nomatch')) return 'po_nomatch'
  if (fileName.includes('po_match')) return 'po_match'
  if (isNonPoTravelUploadFileName(fileName)) return 'ocrold'
  return fromExtract
}

export const buildValidationMapOptions = (inv = {}, header = {}) => ({
  demoScenario: resolveDemoScenario(inv, header || inv?.ocr?.header || {}),
  batchDocumentTypes: inv.batch_document_types,
  ocrByType: inv.ocr_by_type
})

export const buildValidationState = (
  backendValidation,
  { confidence, documentId, header, demoScenario, batchDocumentTypes, ocrByType, inv } = {}
) => {
  const mapOptions = {
    demoScenario,
    batchDocumentTypes,
    ocrByType
  }
  let checks = mapValidationChecks(backendValidation, mapOptions)
  checks = augmentRateValidationCheck(checks, inv)
  checks = augmentPoValueValidationCheck(checks, inv)
  checks = augmentBankValidationCheck(checks, inv)
  const overallFromBackend = backendValidation?.overallStatus
    ? VALIDATION_STATUS_TO_OVERALL[backendValidation.overallStatus] || 'review'
    : null

  let overall = overallFromBackend || 'review'
  if (!overallFromBackend && confidence != null) {
    if (confidence >= 0.85) overall = 'approved'
    else if (confidence < 0.5) overall = 'fail'
  }

  const derivedOverallStatus = deriveValidationOverallStatus(checks)
  const mergedOverallStatus = worseValidationOverallStatus(
    backendValidation?.overallStatus,
    derivedOverallStatus
  )
  if (mergedOverallStatus && VALIDATION_STATUS_TO_OVERALL[mergedOverallStatus]) {
    overall = VALIDATION_STATUS_TO_OVERALL[mergedOverallStatus]
  }

  return {
    checks,
    mode: backendValidation?.mode ?? null,
    confidence: confidence ?? null,
    overall,
    overallStatus: mergedOverallStatus || derivedOverallStatus,
    summary: backendValidation?.summary || null,
    po_number: coerceEssaPoNumber(backendValidation?.poNumber || header?.poNumber) || null,
    ses_no: backendValidation?.sesNo || null,
    documentId: documentId ?? null,
    ld_pct: backendValidation?.ld_pct ?? 0,
    ld_amount: backendValidation?.ld_amount ?? 0,
    advance_recovery: backendValidation?.advance_recovery ?? 0,
    retention_held: backendValidation?.retention_held ?? 0,
    net_payable: backendValidation?.net_payable ?? null
  }
}

/** True when validation must consider the full upload batch, not a single extract. */
export const needsBundleValidation = (inv) => {
  const batchTypes = inv?.batch_document_types || []
  const ocrTypes = Object.keys(inv?.ocr_by_type || {})
  return batchTypes.length > 1 || ocrTypes.length > 1
}

/** True when POST /ap-invoice-ocr/validate can run from in-memory OCR (no persisted documentId). */
export const canRunBundleValidation = (inv) => {
  if (!inv) return false
  if (inv.invoice_workflow === 'NON_PO') return false

  const header = inv?.ocr?.header || {}
  const hasExtractedData = Boolean(
    inv.invoice_no ||
    header.invoiceNumber ||
    header.poNumber ||
    inv.po_number ||
    inv.ocr?.lineItems?.length ||
    inv.lines?.length ||
    Object.keys(inv?.ocr_by_type || {}).length
  )

  return hasExtractedData && (needsBundleValidation(inv) || inv.invoice_workflow === 'PO')
}

const classifyManpowerInvoiceCategory = (description) => {
  const upper = String(description ?? '').toUpperCase()
  if (!upper) return null
  const isWelder = /\bWELDER\b/.test(upper) && !/\bFITTER\b/.test(upper)
  const isFitter = /\bFITTER\b/.test(upper) || /\bPIPE\s*FITTER\b/.test(upper)
  const isDirect = /DIRECT\s*COST/.test(upper)
  const isOvertime = /\bOVERTIME\b/.test(upper) || /\bOT\b/.test(upper)
  if (isDirect && isWelder) return 'directWelder'
  if (isDirect && isFitter) return 'directFitter'
  if (isOvertime && isWelder) return 'otWelder'
  if (isOvertime && isFitter) return 'otFitter'
  return null
}

const normalizeInvoiceLineAmount = (item = {}) => {
  const amount =
    parseAmount(item.amount) ??
    parseAmount(item.lineValue) ??
    parseAmount(item.totalPrice) ??
    computeLineItemAmount(item)
  return amount != null && amount > 0 ? amount : null
}

// Normalize a raw role string to a canonical display name.
// "Pipe Fitter" → "Fitter"; all others are title-cased (e.g. "chemical washer" → "Chemical Washer").
const normalizeRoleKey = (raw) => {
  if (!raw) return null
  const trimmed = String(raw).trim()
  const upper = trimmed.toUpperCase()
  if (!upper || upper === 'TOTAL') return null
  if (/\bPIPE\s*FITTER\b/.test(upper)) return 'Fitter'
  return trimmed.replace(/\b\w/g, (c) => c.toUpperCase())
}

// Aggregate per-role data from manhour summary line items and (optionally) raw tables.
// Returns Map<normalizedRole, { unitPrice, regularHours, otHours, regularAmount, otAmount }>.
const extractRolesFromManhourLines = (mhLines = [], tables = []) => {
  const roles = new Map()

  for (const line of mhLines) {
    const name = String(line.manpowerName ?? line.Name ?? line.name ?? '').trim()
    if (/^total$/i.test(name)) continue
    const rawRole = String(line.role ?? line.position ?? line.Position ?? '').trim()
    const role = normalizeRoleKey(rawRole)
    if (!role) continue

    if (!roles.has(role)) {
      roles.set(role, { unitPrice: null, regularHours: 0, otHours: 0, regularAmount: null, otAmount: 0 })
    }
    const entry = roles.get(role)

    const unitPrice = parseAmount(
      line.unitPrice ?? line.unitPriceHourIDR ?? line['Unit Price / Hour (IDR)']
    )
    if (unitPrice != null && entry.unitPrice == null) entry.unitPrice = unitPrice

    entry.regularHours += parseAmount(line.regularManhour ?? line.actualMhr ?? line['Actual Mhr']) ?? 0
    entry.otHours += resolveManhourLineOvertimeHours(line)

    const regularAmt = parseAmount(
      line.regularAmount ??
      line.amountMhr ??
      line['Amount Mhr (IDR)'] ??
      line['Amount Mhr'] ??
      line.regularAmountIDR ??
      line.amountIDR ??
      line.amount ??
      line.Amount
    )
    if (regularAmt != null) entry.regularAmount = (entry.regularAmount ?? 0) + regularAmt

    // Treat a null overtimeAmount as 0 — no OT worked is a valid state, not missing data
    const otAmt = parseAmount(line.overtimeAmount) ?? 0
    entry.otAmount += otAmt
  }

  // Fill unit prices from raw tables for any role still missing one
  for (const table of tables) {
    const columns = (table.columns || []).map((col) => String(col || '').trim())
    const rateCol = columns.findIndex((col) => /unit\s*price.*hour|unit\s*price.*\(idr\)/i.test(col))
    if (rateCol < 0) continue
    const roleCol = columns.findIndex((col) => /^position$|^role$/i.test(col))
    if (roleCol < 0) continue
    for (const row of table.rows || []) {
      if (!Array.isArray(row)) continue
      const role = normalizeRoleKey(String(row[roleCol] || '').trim())
      if (!role) continue
      const rate = parseAmount(row[rateCol])
      if (rate == null) continue
      if (roles.has(role) && roles.get(role).unitPrice == null) roles.get(role).unitPrice = rate
    }
  }

  // Post-process: derive OT unit rate (audit trail) and flag lump-sum entries.
  // isLumpSum = true when unitPrice is still null after all sources AND regularAmount was extracted
  // (amounts present but no rate → intentional lump-sum, not just missing data).
  for (const entry of roles.values()) {
    entry.otUnitPrice =
      entry.otHours > 0 && entry.otAmount > 0 ? entry.otAmount / entry.otHours : null
    entry.isLumpSum = entry.unitPrice == null && entry.regularAmount != null
  }

  return roles
}

// Given known role names, classify an invoice line description as direct-cost or overtime for a role.
// Returns { role, isDirect, isOvertime } or null if no match.
const matchInvoiceLineToRole = (description, knownRoles) => {
  const upper = String(description ?? '').toUpperCase()
  if (!upper) return null
  const isDirect = /DIRECT\s*COST/.test(upper)
  const isOvertime = /\bOVERTIME\b/.test(upper) || /(?<!\w)OT(?!\w)/.test(upper)
  if (!isDirect && !isOvertime) return null
  for (const role of knownRoles) {
    if (upper.includes(role.toUpperCase())) return { role, isDirect, isOvertime }
  }
  return null
}

// Extract direct-cost and overtime invoice amounts per role.
// Returns Map<normalizedRole, { direct: number|null, ot: number|null }>.
// Options:
//   roleMap      – the Map returned by extractRolesFromManhourLines, used to guard fallbacks
//                  against hour-rate roles (unitPrice != null → no fallback)
//   invoiceHeader – enriched invoice header, used as last-resort amount source when no line
//                   items were extracted at all
const extractInvoiceAmountsByRole = (lineItems = [], knownRoles = [], { roleMap, invoiceHeader } = {}) => {
  const amounts = new Map()
  for (const role of knownRoles) amounts.set(role, { direct: null, ot: null })

  // Track lines that have a non-zero amount but no role/cost-type keyword match
  const unmatchedAmounts = []

  for (const line of lineItems) {
    const match = matchInvoiceLineToRole(line?.description, knownRoles)
    const amount = normalizeInvoiceLineAmount(line)
    if (!match) {
      if (amount != null) unmatchedAmounts.push(amount)
      continue
    }
    if (amount == null) continue
    if (!amounts.has(match.role)) amounts.set(match.role, { direct: null, ot: null })
    const entry = amounts.get(match.role)
    if (match.isDirect) entry.direct = amount
    else if (match.isOvertime) entry.ot = amount
  }

  const allDirectNull = [...amounts.values()].every((a) => a.direct == null)

  // Fallback 1 — single-role lump-sum with exactly one unmatched line.
  // Handles invoices like "9th Claim for … Manpower 4 persons" that have no Direct Cost keyword.
  // Only triggers when:
  //   • exactly one known role
  //   • that role has no unit price (confirmed lump-sum)
  //   • all direct amounts are still null after the main loop
  //   • there is exactly one invoice line that had an amount but was not matched
  if (allDirectNull && knownRoles.length === 1 && unmatchedAmounts.length === 1) {
    const role = knownRoles[0]
    const roleEntry = roleMap?.get(role)
    const isLumpSum = !roleEntry || roleEntry.unitPrice == null
    if (isLumpSum) {
      amounts.get(role).direct = unmatchedAmounts[0]
    }
  }

  // Fallback 2 — header total for single-role lump-sum when no line items were extracted at all.
  // Uses subtotal (pre-VAT) in preference to totalAmount to avoid including VAT in the comparison.
  if ([...amounts.values()].every((a) => a.direct == null) && knownRoles.length === 1 && invoiceHeader) {
    const role = knownRoles[0]
    const roleEntry = roleMap?.get(role)
    const isLumpSum = !roleEntry || roleEntry.unitPrice == null
    if (isLumpSum) {
      const headerTotal =
        parseAmount(invoiceHeader.subtotal) ??
        parseAmount(invoiceHeader.totalAmount)
      if (headerTotal != null) {
        amounts.get(role).direct = headerTotal
      }
    }
  }

  return amounts
}

const withinRateTolerance = (applied, expected, tolerance = 0.01) => {
  if (applied == null || expected == null) return false
  const diff = Math.abs(applied - expected)
  if (diff <= 1) return true
  const base = Math.max(Math.abs(applied), Math.abs(expected), 1)
  return diff / base <= tolerance
}

/** Invoice OCR used for validation — prefers classified `ocr_by_type.invoice` over merged `ocr`. */
export const resolveInvoiceOcrForValidation = (inv = {}) => {
  const invoiceOcr =
    inv?.ocr_by_type?.invoice ||
    (inv?.ocr?.documentType === 'invoice' ? inv.ocr : null) ||
    inv?.ocr ||
    {}
  return enrichOcrPayload({
    ...invoiceOcr,
    documentType: 'invoice',
    tables: invoiceOcr.tables || inv?.tables || [],
    summary: invoiceOcr.summary || inv?.summary || null
  })
}

/** Manhour summary OCR used for validation hours and contracted unit rates. */
export const resolveManhourSummaryOcrForValidation = (inv = {}) => {
  const mhOcr =
    inv?.ocr_by_type?.manhour_summary ||
    (inv?.ocr?.documentType === 'manhour_summary' ? inv.ocr : null) ||
    {}
  return enrichOcrPayload({
    ...mhOcr,
    documentType: 'manhour_summary',
    tables: mhOcr.tables || [],
    lineItems: mhOcr.lineItems || [],
    manhourSummary: mhOcr.manhourSummary,
    summary: mhOcr.summary
  })
}


const buildRateValidationDetailRow = ({
  category,
  invoicedAmount,
  hours,
  poRate,
  contractAmount,
  isLumpSum = false
}) => {
  const appliedRate =
    invoicedAmount != null && hours != null && hours > 0 ? invoicedAmount / hours : null
  let status = 'FAIL'
  let issue = null

  if (invoicedAmount == null) {
    issue = `Missing invoiced amount — no invoice line matched "${category}".`
  } else if (poRate == null && contractAmount != null) {
    // Lump-sum path: no unit rate but a contract amount is available — compare amounts directly
    const diff = Math.round(invoicedAmount - contractAmount)
    const ok = Math.abs(diff) <= 1
    status = ok ? 'PASS' : 'FAIL'
    if (!ok) {
      const diffLabel = `${diff > 0 ? '+' : ''}${diff.toLocaleString('en-US')}`
      issue = `Invoice ${Math.round(invoicedAmount).toLocaleString('en-US')} vs manhour total ${Math.round(contractAmount).toLocaleString('en-US')} (${diffLabel})`
    }
    return {
      label: category,
      category,
      value: ok ? 'VALID' : issue,
      status,
      invoicedAmount,
      contractAmount,
      hours: hours != null && hours > 0 ? hours : null,
      appliedRate: null,
      poRate: null,
      issue
    }
  } else if (hours == null || hours <= 0) {
    // No hours → fall back to direct amount comparison if available
    if (contractAmount != null) {
      const diff = Math.round(invoicedAmount - contractAmount)
      if (Math.abs(diff) <= 1) {
        status = 'PASS'
      } else {
        status = 'FAIL'
        const diffLabel = `${diff > 0 ? '+' : ''}${diff.toLocaleString('en-US')}`
        issue = `Invoice ${Math.round(invoicedAmount).toLocaleString('en-US')} vs manhour total ${Math.round(contractAmount).toLocaleString('en-US')} (${diffLabel})`
      }
    } else if (isLumpSum) {
      issue = 'Missing contract amount — lump-sum total not found in manhour summary. Ensure the manhour summary includes per-worker or total IDR amounts.'
    } else {
      issue = `Missing hours — sum ${category.includes('OT') ? 'overtime' : 'regular'} manhours for this role on Summary Calculation Manhour.`
    }
  } else if (poRate == null) {
    issue = 'Missing contract rate — unit price not found in Summary Calculation Manhour for this role.'
  } else if (appliedRate != null) {
    // Rate comparison is the primary validation: applied rate must match contract rate
    const ok = withinRateTolerance(appliedRate, poRate)
    status = ok ? 'PASS' : 'FAIL'
    if (!ok) {
      const applied = Math.round(appliedRate)
      const contract = Math.round(poRate)
      const diff = applied - contract
      const diffLabel =
        diff === 0 ? '0' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('en-US')}`
      issue = `${diffLabel}/hr vs contract`
    }
  }

  return {
    label: category,
    category,
    value: issue || (status === 'PASS' ? 'VALID' : 'INVALID'),
    status,
    invoicedAmount,
    contractAmount: contractAmount ?? null,
    hours: hours != null && hours > 0 ? hours : null,
    appliedRate,
    poRate,
    issue
  }
}

/** Recompute rate validation from the same OCR data shown on Extract & Validate tabs.
 *  Roles are derived dynamically from the manhour summary — no hardcoded Welder/Fitter assumption. */
export const computeRateValidationFromBundle = (inv = {}) => {
  const invoiceOcr = resolveInvoiceOcrForValidation(inv)
  const mhOcr = resolveManhourSummaryOcrForValidation(inv)
  const mhLines = mhOcr?.manhourSummary?.length ? mhOcr.manhourSummary : (mhOcr?.lineItems || [])

  const roleMap = extractRolesFromManhourLines(mhLines, mhOcr?.tables || [])
  const knownRoles = [...roleMap.keys()]
  const invoiceAmounts = extractInvoiceAmountsByRole(invoiceOcr?.lineItems || [], knownRoles, {
    roleMap,
    invoiceHeader: invoiceOcr?.header || {}
  })

  // Top-level lump-sum signal from the manhour summary header (set by enrichManhourSummaryFields
  // when "Price Lumpsum" or "Lump Sum" is detected in pricingNote / notes / summary text).
  const mhIsLumpSum = mhOcr?.header?.isLumpSum === true
  const mhLumpSumTotal = mhOcr?.header?.lumpSumTotal ?? null

  // Manhour summary header total — used as last-resort contractAmount for single-role lump-sum
  // when neither per-row regularAmount nor pricingNote total is available.
  const mhHeader = mhOcr?.header || {}
  const mhTotal =
    parseAmount(mhHeader.totalAmount) ??
    parseAmount(mhHeader.totalRegularAmount) ??
    parseAmount(mhHeader.grandTotal) ??
    null

  const details = []
  for (const [role, data] of roleMap) {
    const amounts = invoiceAmounts.get(role) || { direct: null, ot: null }

    // A role is lump-sum if the summary says so, the entry-level flag is set (unitPrice == null AND
    // regularAmount extracted), or there is simply no unit price at all.
    const isRoleLumpSum = mhIsLumpSum || data.isLumpSum || data.unitPrice == null

    // For lump-sum roles, null out hours so buildRateValidationDetailRow takes the amount-comparison
    // path instead of computing a rate (hours ÷ amount would give a meaningless $/hr figure).
    const regularHours = isRoleLumpSum ? null : (data.regularHours > 0 ? data.regularHours : null)

    // contractAmount priority for lump-sum (single-role only for header/note fallbacks):
    //   1. Per-role sum accumulated from line items (most precise)
    //   2. lumpSumTotal parsed from pricingNote text
    //   3. Manhour summary header total (totalAmount / totalRegularAmount / grandTotal)
    let contractAmt = data.regularAmount
    if (isRoleLumpSum && contractAmt == null && roleMap.size === 1) {
      contractAmt = mhLumpSumTotal ?? mhTotal
    }

    details.push(buildRateValidationDetailRow({
      category: `${role} Regular`,
      invoicedAmount: amounts.direct,
      hours: regularHours,
      poRate: data.unitPrice,
      contractAmount: contractAmt,
      isLumpSum: isRoleLumpSum
    }))

    // Lump-sum contracts have no OT concept — skip the OT row entirely.
    if (!isRoleLumpSum && (data.otHours > 0 || amounts.ot != null)) {
      details.push(buildRateValidationDetailRow({
        category: `${role} OT`,
        invoicedAmount: amounts.ot,
        hours: data.otHours > 0 ? data.otHours : null,
        poRate: data.unitPrice,
        contractAmount: data.otAmount
      }))
    }
  }

  const total = details.length
  const passCount = details.filter((row) => row.status === 'PASS').length
  const failed = details.filter((row) => row.status === 'FAIL')
  const hasMh = mhLines.length > 0
  const hasInvoiceLines = (invoiceOcr?.lineItems || []).some((line) => line?.description)

  // Detect whether this is a lump-sum invoice (no unit price on any role) or hour-rate (or mixed)
  const isLumpSum =
    total > 0 && details.every((row) => row.appliedRate == null && row.poRate == null)
  const comparable = details.filter((row) => row.appliedRate != null && row.poRate != null)

  let severity = 'FAIL'
  let message = 'Rate could not be validated (missing invoice amounts, manhour hours, or contract rates).'

  if (!hasMh) {
    message = 'Cannot validate — Summary Calculation Manhour was not provided.'
  } else if (!hasInvoiceLines) {
    message = 'Cannot validate — invoice claim line items were not extracted.'
  } else if (knownRoles.length === 0) {
    message = 'Cannot validate — no manpower roles found in Summary Calculation Manhour.'
  } else if (failed.length) {
    if (isLumpSum) {
      const incomplete = failed.filter((row) => row.invoicedAmount == null)
      if (incomplete.length && !failed.filter((row) => row.invoicedAmount != null).length) {
        message = `${incomplete.length} of ${total} categories could not be validated (invoice amounts not found).`
      } else {
        message = `Invoice amounts differ from manhour summary for ${failed.length} of ${total} categories.`
      }
    } else {
      const mismatch = failed.filter((row) => row.appliedRate != null && row.poRate != null)
      const incomplete = failed.filter((row) => row.appliedRate == null || row.poRate == null)
      if (mismatch.length && !incomplete.length) {
        message = `${mismatch.length} of ${total} categories outside the 1% contract rate tolerance.`
      } else if (incomplete.length && !mismatch.length) {
        message = `${incomplete.length} of ${total} categories could not be calculated (missing amount, hours, or contract rate).`
      } else {
        message = `Rate validation failed for ${failed.length} of ${total} categories.`
      }
    }
  } else if (total > 0 && passCount === total) {
    severity = 'PASS'
    if (isLumpSum) {
      message = `PASS: Invoice amounts match manhour summary totals for all ${total} categories.`
    } else {
      message = `PASS: Applied rates (invoice amount ÷ manhour hours) match contract IDR/hr for all ${total} categories.`
    }
  }

  const status = resolveRateValidationStatus({
    ruleCode: 'RATE_VALIDATION',
    severity,
    message,
    details
  })

  let expectedValue, actualValue
  if (isLumpSum) {
    const contractTotal = details.reduce((sum, row) => sum + (row.contractAmount ?? 0), 0)
    expectedValue = contractTotal > 0
      ? `Manhour summary total IDR ${Math.round(contractTotal).toLocaleString('en-US')}`
      : 'Lump sum per manhour summary'
    const invoiceTotal = details.reduce((sum, row) => sum + (row.invoicedAmount ?? 0), 0)
    actualValue = invoiceTotal > 0
      ? `Invoice total IDR ${Math.round(invoiceTotal).toLocaleString('en-US')}`
      : '—'
  } else {
    const rateEntries = knownRoles
      .map((role) => {
        const unitPrice = roleMap.get(role)?.unitPrice
        return unitPrice != null ? `${role} IDR ${Math.round(unitPrice).toLocaleString('en-US')}/hr` : null
      })
      .filter(Boolean)
    expectedValue = rateEntries.length ? rateEntries.join(' · ') : '—'
    actualValue = comparable.length
      ? details
          .filter((row) => row.appliedRate != null)
          .map((row) => `${row.category}: IDR ${Math.round(row.appliedRate).toLocaleString('en-US')}/hr`)
          .join(' · ')
      : '—'
  }

  return {
    severity: status === 'pass' ? 'PASS' : 'FAIL',
    status,
    message,
    expectedValue,
    actualValue,
    details: normalizeRateValidationDetails(details)
  }
}

/** PO OCR used for total value validation — prefers `ocr_by_type.po`. */
export const resolvePoOcrForValidation = (inv = {}) => {
  const poOcr =
    inv?.ocr_by_type?.po ||
    (inv?.ocr?.documentType === 'po' ? inv.ocr : null) ||
    {}
  return enrichOcrPayload({
    ...poOcr,
    documentType: 'po',
    tables: poOcr.tables || [],
    summary: poOcr.summary
  })
}

export const resolveInvoiceTotalForValidation = (inv = {}) => {
  const invoiceOcr = resolveInvoiceOcrForValidation(inv)
  const header = invoiceOcr?.header || {}
  return (
    parseAmount(header.totalAmount) ??
    parseAmount(header.grandTotal) ??
    (() => {
      const subtotal = parseAmount(header.subtotal)
      const tax = parseAmount(header.taxAmount)
      return subtotal != null && tax != null ? subtotal + tax : subtotal
    })() ??
    parseAmount(inv?.total_amount)
  )
}

/**
 * Parse the numeric PO value out of the backend's expectedValue string.
 * Backend sends e.g. "≤ IDR 1,234,567" or "≤ IDR 1.234.567".
 */
const parsePoValueFromExpected = (expected) => {
  if (expected == null) return null
  const s = String(expected).replace(/[≤<\s]/g, '')
  const noPrefix = s.replace(/^IDR/i, '')
  return parseAmount(noPrefix)
}

export const computePoValueValidationFromBundle = (inv = {}, dbPoTotal = null) => {
  // Always prefer the DB value passed in; never re-extract from the PO OCR JSON
  const poTotal = dbPoTotal
  const invoiceTotal = resolveInvoiceTotalForValidation(inv)

  let severity = 'FAIL'
  let message = 'Invoice total is missing — cannot compare against PO value.'
  let status = 'fail'

  if (poTotal == null) {
    message = 'PO total value is not available for comparison.'
  } else if (invoiceTotal == null) {
    message = 'Invoice total is missing — cannot compare against PO value.'
  } else {
    const ok = invoiceTotal <= poTotal
    severity = ok ? 'PASS' : 'FAIL'
    status = ok ? 'pass' : 'fail'
    message = ok
      ? `Invoice total (IDR ${Math.round(invoiceTotal).toLocaleString('en-US')}) is within PO value (IDR ${Math.round(poTotal).toLocaleString('en-US')}).`
      : `Invoice total (IDR ${Math.round(invoiceTotal).toLocaleString('en-US')}) exceeds PO value (IDR ${Math.round(poTotal).toLocaleString('en-US')}) by IDR ${Math.round(invoiceTotal - poTotal).toLocaleString('en-US')}.`
  }

  return {
    severity,
    status,
    message,
    expectedValue: poTotal != null ? `≤ IDR ${Math.round(poTotal).toLocaleString('en-US')}` : 'PO total value',
    actualValue:
      invoiceTotal != null ? `IDR ${Math.round(invoiceTotal).toLocaleString('en-US')}` : '—',
    variance: poTotal != null && invoiceTotal != null ? invoiceTotal - poTotal : null,
    details: [
      {
        label: 'PO total value (database)',
        value: poTotal != null ? `IDR ${Math.round(poTotal).toLocaleString('en-US')}` : '—',
        status:
          poTotal != null && invoiceTotal != null
            ? invoiceTotal <= poTotal
              ? 'PASS'
              : 'FAIL'
            : undefined
      },
      {
        label: 'Invoice total',
        value:
          invoiceTotal != null ? `IDR ${Math.round(invoiceTotal).toLocaleString('en-US')}` : '—',
        status:
          poTotal != null && invoiceTotal != null
            ? invoiceTotal <= poTotal
              ? 'PASS'
              : 'FAIL'
            : undefined
      }
    ]
  }
}

const INDONESIAN_MONTHS = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11
}

const parseDateForComparison = (raw) => {
  if (!raw) return null
  const s = String(raw).trim()

  // ISO or slash/dash numeric: 2025-02-28 | 28/02/2025 | 28-02-2025 | 02/28/2025
  const numeric = s.match(/^(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (numeric) {
    const [, a, b, c] = numeric
    // If first part is 4 digits → YYYY-MM-DD
    if (a.length === 4) return new Date(Number(a), Number(b) - 1, Number(c))
    // If last part is 4 digits → DD-MM-YYYY
    if (c.length === 4) return new Date(Number(c), Number(b) - 1, Number(a))
    // Ambiguous 2-digit year — treat as YY in last pos, DD-MM-YY
    const year = Number(c) + (Number(c) < 50 ? 2000 : 1900)
    return new Date(year, Number(b) - 1, Number(a))
  }

  // "28 February 2025" or "28 Februari 2025"
  const wordy = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (wordy) {
    const day = Number(wordy[1])
    const monthWord = wordy[2].toLowerCase()
    const year = Number(wordy[3])
    const idxId = INDONESIAN_MONTHS[monthWord]
    if (idxId !== undefined) return new Date(year, idxId, day)
    const parsed = new Date(`${wordy[2]} ${day}, ${year}`)
    if (!isNaN(parsed)) return parsed
  }

  // Last resort — native Date.parse
  const fallback = new Date(s)
  return isNaN(fallback) ? null : fallback
}

export const computeNonPkpValidationFromBundle = (inv = {}) => {
  const invoiceOcr = resolveInvoiceOcrForValidation(inv)
  const poOcr = resolvePoOcrForValidation(inv)
  const invoiceHdr = invoiceOcr?.header || {}
  const poHdr = poOcr?.header || {}

  // PKP = a Faktur Pajak (tax invoice) document is present in the bundle
  const taxInvoiceOcr = inv?.ocr_by_type?.tax_invoice
  const hasTaxInvoiceDoc =
    taxInvoiceOcr &&
    (taxInvoiceOcr.header?.taxInvoiceNumber || taxInvoiceOcr.header?.taxAmount != null)
  const batchTypes = (inv?.batch_document_types || []).map((t) =>
    normalizeValidationDocumentType(t) || t
  )
  const taxInvoiceInBatch = batchTypes.includes('tax_invoice')

  if (hasTaxInvoiceDoc || taxInvoiceInBatch) {
    return {
      status: 'na',
      severity: 'SKIP',
      message: 'Tax invoice (Faktur Pajak) present — vendor is PKP. Non-PKP date check not applicable.',
      expectedValue: null,
      actualValue: null,
      details: [],
      isPkp: true
    }
  }

  const invoiceVendor = String(
    invoiceHdr.vendorName ?? inv?.vendor_name ?? ''
  ).trim()
  const poVendor = String(poHdr.vendorName ?? inv?.po_vendor_name ?? '').trim()

  const rawInvoiceDate = invoiceHdr.invoiceDate ?? invoiceHdr.date ?? inv?.invoice_date
  const rawPoDate = poHdr.poDate ?? poHdr.date ?? inv?.po_date

  const invoiceDateParsed = parseDateForComparison(rawInvoiceDate)
  const poDateParsed = parseDateForComparison(rawPoDate)

  const missingDates = !invoiceDateParsed || !poDateParsed
  if (missingDates) {
    return {
      status: 'fail',
      severity: 'FAIL',
      message: 'PO date or invoice date missing — cannot verify the 365-day limit from PO date.',
      expectedValue: `Within 365 days of PO date (${rawPoDate ?? '—'})`,
      actualValue: rawInvoiceDate ?? '—',
      details: [
        { label: 'PO date', value: rawPoDate ?? '—' },
        { label: 'Invoice date', value: rawInvoiceDate ?? '—' }
      ]
    }
  }

  const diffMs = invoiceDateParsed.getTime() - poDateParsed.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const vendorOk =
    !poVendor ||
    !invoiceVendor ||
    poVendor.toLowerCase() === invoiceVendor.toLowerCase()
  const daysOk = diffDays >= 0 && diffDays <= 365

  const ok = vendorOk && daysOk

  const issues = []
  if (!vendorOk) issues.push(`Vendor mismatch: PO "${poVendor}" vs Invoice "${invoiceVendor}"`)
  if (!daysOk) {
    if (diffDays < 0) issues.push(`Invoice date is before PO date (${Math.abs(diffDays)} days)`)
    else issues.push(`Invoice date is ${diffDays} days after PO date (limit: 365 days)`)
  }

  return {
    status: ok ? 'pass' : 'fail',
    severity: ok ? 'PASS' : 'FAIL',
    message: ok
      ? `Non-PKP check passed: invoice is ${diffDays} day(s) after PO date and vendor matches.`
      : issues.join('; '),
    expectedValue: `Within 365 days of PO date (${rawPoDate})${poVendor ? ` · Vendor: ${poVendor}` : ''}`,
    actualValue: `${rawInvoiceDate} (${diffDays} day(s) after PO)${invoiceVendor ? ` · ${invoiceVendor}` : ''}`,
    details: [
      { label: 'PO date', value: rawPoDate, status: daysOk ? 'PASS' : 'FAIL' },
      { label: 'Invoice date', value: rawInvoiceDate, status: daysOk ? 'PASS' : 'FAIL' },
      { label: 'Days elapsed', value: `${diffDays} day(s)`, status: daysOk ? 'PASS' : 'FAIL' },
      ...(poVendor || invoiceVendor
        ? [
            { label: 'PO vendor', value: poVendor || '—', status: vendorOk ? 'PASS' : 'FAIL' },
            { label: 'Invoice vendor', value: invoiceVendor || '—', status: vendorOk ? 'PASS' : 'FAIL' }
          ]
        : [])
    ]
  }
}

export const augmentPoValueValidationCheck = (checks = [], inv) => {
  if (!inv || inv.invoice_workflow === 'NON_PO') return checks

  return checks.map((check) => {
    if (check.ruleCode !== 'PO_VALUE_ZERO_TOLERANCE') return check

    // Use the PO value from the backend DB result — never from OCR
    const dbPoTotal = parsePoValueFromExpected(check.expectedValue ?? check.expected)
    if (dbPoTotal == null) return check

    const computed = computePoValueValidationFromBundle(inv, dbPoTotal)
    return {
      ...check,
      status: computed.status,
      severity: computed.severity,
      message: computed.message,
      expected: computed.expectedValue,
      actual: computed.actualValue,
      variance: computed.variance,
      details: computed.details,
      sourceTable: 'PO_DB'
    }
  })
}

export const augmentRateValidationCheck = (checks = [], inv) => {
  if (!inv || inv.invoice_workflow === 'NON_PO') return checks
  const computed = computeRateValidationFromBundle(inv)
  if (!computed?.details?.length) return checks

  return checks.map((check) => {
    if (check.ruleCode !== 'RATE_VALIDATION') return check
    return {
      ...check,
      status: computed.status,
      severity: computed.severity,
      message: computed.message,
      expected: computed.expectedValue,
      actual: computed.actualValue,
      details: computed.details
    }
  })
}

const GENERIC_BANK_EXPECTED = /vendor master bank on file|bank on file/i

/** Re-evaluate bank checklist status using digits-only account comparison. */
export const computeBankValidationFromBundle = (inv, check = {}) => {
  const captured = resolveInvoiceBankDetails(inv)
  const invoiceAccount =
    formatBankComparisonLine(captured) || check.actualValue || check.actual || null
  let masterAccount = check.expectedValue ?? check.expected ?? null

  if (masterAccount && GENERIC_BANK_EXPECTED.test(String(masterAccount))) {
    masterAccount = null
  }

  if (!invoiceAccount || !masterAccount) return null

  const match = bankAccountsMatch(invoiceAccount, masterAccount)
  return {
    status: match ? 'pass' : 'fail',
    severity: match ? 'PASS' : 'FAIL',
    message: match
      ? 'Invoice bank account number matches Vendor Master.'
      : check.message ||
        'Invoice bank account number differs from Vendor Master — review for payment diversion risk.',
    expectedValue: masterAccount,
    actualValue: invoiceAccount
  }
}

export const augmentBankValidationCheck = (checks = [], inv) => {
  if (!inv) return checks

  return checks.map((check) => {
    if (check.ruleCode !== 'BANK_VENDOR_MASTER') return check
    const computed = computeBankValidationFromBundle(inv, check)
    if (!computed) return check
    return {
      ...check,
      status: computed.status,
      severity: computed.severity,
      message: computed.message,
      expected: computed.expectedValue,
      actual: computed.actualValue,
      expectedValue: computed.expectedValue,
      actualValue: computed.actualValue
    }
  })
}

/** Builds a full validation request from a merged OCR invoice bundle. */
export const buildValidationRequest = (inv, documentId) => {
  const enrichedInvoice = resolveInvoiceOcrForValidation(inv)
  const ocr = inv?.ocr_by_type?.invoice || inv?.ocr || {}
  const invoiceBank = resolveInvoiceBankDetails(inv)
  const baseHeader = {
    ...(enrichedInvoice?.header || {}),
    ...(ocr.header || {}),
    invoiceNumber: ocr.header?.invoiceNumber ?? inv.invoice_no,
    invoiceDate: ocr.header?.invoiceDate ?? inv.invoice_date,
    vendorName: ocr.header?.vendorName ?? inv.vendor_name,
    poNumber: ocr.header?.poNumber ?? inv.po_number,
    subtotal: ocr.header?.subtotal ?? inv.subtotal,
    taxAmount: ocr.header?.taxAmount ?? inv.vat_amount,
    totalAmount: ocr.header?.totalAmount ?? inv.total_amount,
    bankName: invoiceBank.bankName ?? ocr.header?.bankName ?? inv.bank_name,
    bankAccount: invoiceBank.bankAccount ?? ocr.header?.bankAccount ?? inv.bank_account,
    currency: ocr.header?.currency ?? inv.currency
  }
  const demoScenario = resolveDemoScenario(inv, baseHeader)
  const header = demoScenario ? { ...baseHeader, demoScenario } : baseHeader

  const supportingDocs = {}
  Object.entries(inv?.ocr_by_type || {}).forEach(([type, data]) => {
    if (!data) return
    const canon = normalizeValidationDocumentType(type)
    if (!canon || canon === 'invoice') return

    const enrichedDoc =
      canon === 'manhour_summary'
        ? resolveManhourSummaryOcrForValidation({ ocr_by_type: { manhour_summary: data } })
        : canon === 'po'
          ? resolvePoOcrForValidation({ ocr_by_type: { po: data } })
          : enrichOcrPayload({ ...data, documentType: canon })

    const existing = supportingDocs[canon]
    if (!existing) {
      supportingDocs[canon] = {
        header: enrichedDoc?.header || data.header || {},
        lineItems: enrichedDoc?.lineItems || data.lineItems || []
      }
      return
    }

    supportingDocs[canon] = {
      header: { ...existing.header, ...(enrichedDoc?.header || data.header || {}) },
      lineItems: [...(existing.lineItems || []), ...(enrichedDoc?.lineItems || data.lineItems || [])]
    }
  })

  const rawBatchTypes = inv?.batch_document_types?.length ? inv.batch_document_types : []

  const ocrByTypeCanon = Object.keys(inv?.ocr_by_type || {})
    .map((type) => normalizeValidationDocumentType(type))
    .filter(Boolean)

  let batchDocumentTypes = [
    ...new Set([
      ...rawBatchTypes.map((type) => normalizeValidationDocumentType(type)).filter(Boolean),
      ...ocrByTypeCanon
    ])
  ]

  // Completeness must fail when no invoice file/split exists, even if other
  // documents (tax invoice, PO, BA) carried an invoice number onto the header.
  const extractPdfs = inv?.extract_doc_pdfs
  if (extractPdfs && typeof extractPdfs === 'object' && Object.keys(extractPdfs).length > 0) {
    const hasInvoiceFile = Boolean(extractPdfs.A_invoice || extractPdfs.A_nonPoTravel)
    if (!hasInvoiceFile) {
      batchDocumentTypes = batchDocumentTypes.filter((type) => type !== 'invoice')
      delete supportingDocs.invoice
    }
  }

  return {
    header,
    lineItems: enrichedInvoice?.lineItems?.length
      ? enrichedInvoice.lineItems
      : ocr.lineItems || inv.lines || [],
    tables: enrichedInvoice?.tables || ocr.tables || inv.tables || [],
    supportingDocs,
    batchDocumentTypes,
    documentId: documentId ?? inv.documentId ?? inv.validation?.documentId ?? null,
    demoScenario
  }
}

const resolveBackendValidation = (uploadResult, enriched) => {
  if (uploadResult?.validation?.results?.length) return uploadResult.validation
  if (uploadResult?.validation?.checks?.length) return null
  if (enriched?.validation?.results?.length) return enriched.validation
  return null
}

const resolveInvoiceValidation = (uploadResult, enriched, confidence) => {
  if (uploadResult?.validation?.checks?.length) {
    return {
      ...uploadResult.validation,
      confidence: uploadResult.validation.confidence ?? confidence
    }
  }

  const backendValidation = resolveBackendValidation(uploadResult, enriched)
  return buildValidationState(backendValidation, {
    confidence,
    documentId:
      uploadResult?.documentId ?? enriched?.documentId ?? uploadResult?.validation?.documentId,
    header: enriched?.header,
    inv: uploadResult?.merged || uploadResult
  })
}

export const enrichOcrPayload = (payload) => {
  if (!payload) return payload

  const normalizedFields = normalizeExtractFields(payload.fields)
  const fieldsHeader = coerceStructuredFieldsToHeader(payload.fields, payload.documentType)

  let header = Object.fromEntries(
    Object.entries({ ...fieldsHeader, ...(payload.header || {}) }).map(([key, value]) => [
      key,
      coerceNullish(value)
    ])
  )
  let workingLineItems = payload.lineItems || []
  const tables = payload.tables || []
  if (payload.documentType === 'invoice') {
    header = normalizeExtractHeader(promoteDynamicInvoiceHeaderKeys(header), 'invoice')
    header = applyBankFieldsToHeader(header, normalizedFields)
    workingLineItems = normalizeExtractLineItems(workingLineItems, 'invoice', tables)
    header = enrichTravelInvoiceHeader(header, normalizedFields, workingLineItems)
    if (!workingLineItems.length) {
      const travelLine = buildTravelLineItemFromFieldRecords(normalizedFields, header)
      if (travelLine) {
        workingLineItems = normalizeExtractLineItems([travelLine], 'invoice', tables)
        header = enrichTravelInvoiceHeader(header, normalizedFields, workingLineItems)
      }
    }
  } else if (payload.documentType === 'tax_invoice' || payload.documentType === 'notice') {
    header = normalizeExtractHeader(promoteDynamicTaxInvoiceHeaderKeys(header), payload.documentType)
  } else if (payload.documentType) {
    header = normalizeExtractHeader(header, payload.documentType)
  }
  const corpus = buildTextCorpus(header, normalizedFields, workingLineItems, {
    tables,
    summary: payload.summary
  })
  if (payload.documentType === 'invoice') {
    workingLineItems = reconcileInvoiceLineItems(workingLineItems, tables, corpus)
      .map((item) => normalizeExtractLineItem(item, 'invoice'))
      .filter(Boolean)
    header = reconcileInvoiceFields(header, corpus, workingLineItems)
    header = enrichTravelInvoiceHeader(header, normalizedFields, workingLineItems)
  } else if (payload.documentType === 'tax_invoice') {
    header = reconcileTaxInvoiceFields(header, corpus)
  } else if (payload.documentType === 'berita_acara') {
    header = reconcileBeritaAcaraFields(header, corpus, payload.lineItems, payload.tables)
  } else if (payload.documentType === 'ses') {
    header = reconcileSesFields(header, normalizedFields, corpus)
  } else if (payload.documentType === 'po' || payload.documentType === 'po_appendix') {
    header = enrichPoHeaderFields(header, {
      fields: normalizedFields,
      lineItems: payload.lineItems || [],
      source: {
        summary: payload.summary,
        tables: tables,
        fields: isStructuredExtractFields(payload.fields)
          ? payload.fields
          : fieldsHeader
      }
    })
  }

  let lineItems =
    payload.documentType === 'tax_invoice'
      ? []
      : workingLineItems.map((item) => {
          const computed = computeLineItemAmount(item)
          const next = {
            ...item,
            amount: item.amount || (computed != null ? String(computed) : '')
          }
          if (payload.documentType === 'manhour_summary') {
            next.overtimeManhour = combineManhourSummaryOvertime(next)
          }
          if (payload.documentType === 'ses') {
            return reconcileSesLineItem(next)
          }
          return next
        })

  if (payload.documentType === 'manhour_summary') {
    header = enrichManhourSummaryFields(header, {
      fields: normalizedFields,
      lineItems,
      source: {
        header: payload.header,
        tables: payload.tables || tables,
        summary: payload.summary,
        manhourSummary: payload.manhourSummary,
        fields: isStructuredExtractFields(payload.fields) ? payload.fields : fieldsHeader
      }
    })
  }

  const lineItemsSubtotal = lineItems.reduce(
    (sum, item) => sum + (parseAmount(item.amount) ?? 0),
    0
  )

  if (lineItemsSubtotal > 0) {
    if (!header.lineItemsSubtotal) header.lineItemsSubtotal = String(lineItemsSubtotal)

    const sub = parseAmount(header.subtotal) ?? parseAmount(header.totalAmount)
    const tax = parseAmount(header.taxAmount) ?? 0
    const grand = parseAmount(header.grandTotal)
    const totalsConsistent =
      sub != null && grand != null && Math.abs(sub + tax - grand) <= 1

    if (!header.subtotal && !totalsConsistent) {
      header.subtotal = String(lineItemsSubtotal)
    }
  }

  const subtotal =
    parseAmount(header.subtotal) ?? (lineItemsSubtotal > 0 ? lineItemsSubtotal : null)
  let taxAmount = parseAmount(header.taxAmount) ?? 0

  if (subtotal != null) {
    const parsedTotal = parseAmount(header.totalAmount)
    const parsedGrand = parseAmount(header.grandTotal)

    if (
      taxAmount <= 0 &&
      parsedTotal != null &&
      parsedGrand != null &&
      Math.abs(parsedGrand - subtotal) < 1 &&
      parsedTotal > subtotal + 0.5
    ) {
      taxAmount = parsedTotal - subtotal
      header.taxAmount = String(taxAmount)
      header.grandTotal = String(parsedTotal)
    }

    const calculatedGrandTotal = subtotal + taxAmount

    if (!header.grandTotal && !header.totalAmount) {
      header.grandTotal = String(calculatedGrandTotal)
      header.totalAmount = String(calculatedGrandTotal)
    } else if (!header.grandTotal && header.totalAmount) {
      header.grandTotal = header.totalAmount
    } else if (!header.totalAmount && header.grandTotal) {
      header.totalAmount = header.grandTotal
    } else if (taxAmount > 0) {
      if (parsedGrand != null && Math.abs(parsedGrand - subtotal) < 1) {
        const fixed =
          parsedTotal != null && parsedTotal > subtotal + 0.5 ? parsedTotal : calculatedGrandTotal
        header.grandTotal = String(fixed)
        if (parsedTotal == null || parsedTotal <= subtotal + 0.5) {
          header.totalAmount = String(fixed)
        }
      }
    }

    header.calculatedGrandTotal = String(subtotal + taxAmount)
  }

  const timesheets =
    Array.isArray(payload.timesheets) && payload.timesheets.length
      ? payload.timesheets.map((sheet) => finalizeTimesheetSheetEntries(sheet))
      : payload.timesheets

  const structuredFields = isStructuredExtractFields(payload.fields)
    ? { ...payload.fields }
    : payload.structuredFields || null

  return {
    ...payload,
    documentType: payload.documentType,
    fields: normalizedFields,
    lineItems,
    timesheets,
    manhourSummary: payload.manhourSummary,
    attendanceEntries: payload.attendanceEntries,
    appendixItems: payload.appendixItems,
    tables: payload.tables || [],
    header: { ...header },
    structuredFields
  }
}

export const getOcrTotalsSummary = (ocrPayload) => {
  const enriched = enrichOcrPayload(ocrPayload)
  const header = enriched?.header || {}
  const currency = header.currency || 'IDR'
  const taxAmount = parseAmount(header.taxAmount)
  const grandTotal = resolveInvoiceGrandTotal({
    subtotal: parseAmount(header.subtotal),
    taxAmount,
    grandTotal: parseAmount(header.grandTotal),
    totalAmount: parseAmount(header.totalAmount),
    calculatedGrandTotal: header.calculatedGrandTotal
  })

  return {
    currency,
    lineItemsSubtotal: parseAmount(header.lineItemsSubtotal),
    totalAmount: parseAmount(header.totalAmount),
    subtotal: resolveInvoiceSubtotal({
      subtotal: parseAmount(header.subtotal),
      totalAmount: parseAmount(header.totalAmount),
      taxAmount,
      grandTotal,
      lineItemsSubtotal: parseAmount(header.lineItemsSubtotal)
    }),
    taxAmount,
    grandTotal,
    calculatedGrandTotal: parseAmount(header.calculatedGrandTotal)
  }
}

export const hasAmountLineItems = (docType) =>
  ['invoice', 'tax_invoice', 'berita_acara', 'po', 'po_appendix', 'ses'].includes(docType)

const averageConfidence = (fields = []) => {
  if (!fields.length) return null
  const sum = fields.reduce((acc, field) => acc + (Number(field.confidence) || 0), 0)
  return sum / fields.length
}

const referenceForType = (documentType, header) => {
  switch (documentType) {
    case 'tax_invoice':
    case 'notice':
      return header.taxInvoiceNumber || header.noticeNumber
    case 'po':
    case 'po_appendix':
    case 'berita_acara':
    case 'manhour_summary':
    case 'timesheet':
      return header.poNumber
    case 'ses':
      return header.sesNo
    case 'attendance':
      return header.site
    default: {
      if (header.invoiceNumber && isLikelyInvoiceNumber(header.invoiceNumber)) {
        return header.invoiceNumber
      }
      return extractInvoiceNumber(Object.values(header).filter(Boolean).join('\n'))
    }
  }
}

const totalForType = (documentType, header) => {
  switch (documentType) {
    case 'tax_invoice':
      return header.grandTotal || header.totalAmount
    case 'ses':
      return header.totalSesValue || header.poValue
    default:
      return header.totalAmount || header.grandTotal || header.totalSesValue
  }
}

const dateForType = (documentType, header) =>
  header.invoiceDate ||
  header.noticeDate ||
  header.transactionDate ||
  header.poDate ||
  header.periodStart ||
  null

const normalizeNoticeReferenceNumber = (value) => {
  const raw = coerceNullish(value)
  if (raw == null) return null
  return String(raw)
    .replace(/^no\.?\s*:?\s*/i, '')
    .trim()
}

/** Invoice reference — commercial invoice first, then notice/kwitansi, then receipt. */
export const resolveInvoiceReferenceNumber = (inv = {}) => {
  const sectionA = inv?.validation_extraction?.sections?.A_invoice || {}
  const invoiceOcr = inv?.ocr_by_type?.invoice || null
  const noticeOcr = inv?.ocr_by_type?.notice || null
  const receiptOcr = inv?.ocr_by_type?.receipt || null
  const enrichedInvoiceHdr = invoiceOcr
    ? enrichOcrPayload({ ...invoiceOcr, documentType: 'invoice' })?.header || {}
    : {}
  const invoiceHdr = {
    ...coerceStructuredFieldsToHeader(invoiceOcr?.fields, 'invoice'),
    ...(invoiceOcr?.header || {}),
    ...enrichedInvoiceHdr
  }
  const noticeHdr = noticeOcr
    ? enrichOcrPayload({ ...noticeOcr, documentType: 'notice' })?.header || {}
    : {}
  const receiptHdr = receiptOcr?.header || {}
  const receiptFields = normalizeExtractFields(receiptOcr?.fields || [])
  const invoiceFields = normalizeExtractFields(invoiceOcr?.fields || [])

  const fromInvoice = coerceNullish(
    inv.invoice_no ||
      sectionA.invoiceNo ||
      invoiceHdr.invoiceNumber ||
      invoiceHdr.invoiceNo ||
      pickFieldValue(invoiceFields, 'invoice no', 'inv no')
  )
  const fromNotice = coerceNullish(
    normalizeNoticeReferenceNumber(noticeHdr.taxInvoiceNumber) ||
      normalizeNoticeReferenceNumber(noticeHdr.invoiceNumber)
  )
  const fromReceipt = coerceNullish(
    receiptHdr.invoiceNumber ||
      receiptHdr.invoiceNo ||
      pickHeaderValue(receiptHdr, 'No.') ||
      pickFieldValue(receiptFields, 'No.')
  )

  return fromInvoice || fromNotice || fromReceipt || null
}

/** Grand total from type=invoice only (header/fields), never receipt or line sums. */
export const resolveExplicitGrandTotal = (inv = {}) => {
  const sectionA = inv?.validation_extraction?.sections?.A_invoice || {}
  const invoiceOcr =
    inv?.ocr_by_type?.invoice ||
    (inv?.document_type === 'invoice' ? inv?.ocr : null) ||
    null

  const enrichedHdr = invoiceOcr
    ? enrichOcrPayload({ ...invoiceOcr, documentType: 'invoice' })?.header || {}
    : {}
  const invoiceFields = normalizeExtractFields(invoiceOcr?.fields || [])
  const structuredHdr = coerceStructuredFieldsToHeader(invoiceOcr?.fields, 'invoice')
  const candidates = [
    inv.total_amount,
    parseAmount(sectionA.grandTotal),
    parseAmount(sectionA.totals?.grandTotal),
    pickFieldValue(invoiceFields, 'grand total'),
    structuredHdr.grandTotal,
    enrichedHdr.grandTotal,
    invoiceOcr?.header?.grandTotal,
    invoiceOcr?.header?.totalAmount
  ]

  for (const candidate of candidates) {
    const parsed = parseAmount(candidate)
    if (parsed != null && parsed > 0) return parsed
  }
  return null
}

/** Resolve commercial-invoice header fields from a merged OCR batch. */
export const resolveCommercialInvoiceSummary = (inv = {}) => {
  const sectionA = inv?.validation_extraction?.sections?.A_invoice || {}
  const invoiceOcr =
    inv?.ocr_by_type?.invoice || (inv?.document_type === 'invoice' ? inv?.ocr : null) || null
  const noticeOcr = inv?.ocr_by_type?.notice || null
  const receiptOcr = inv?.ocr_by_type?.receipt || null
  const enrichedInvoice = invoiceOcr
    ? enrichOcrPayload({ ...invoiceOcr, documentType: 'invoice' })
    : null
  const hdr = {
    ...(inv?.ocr?.header || {}),
    ...(invoiceOcr?.header || {}),
    ...(enrichedInvoice?.header || {})
  }
  const noticeHdr = noticeOcr
    ? enrichOcrPayload({ ...noticeOcr, documentType: 'notice' })?.header || {}
    : {}
  const receiptHdr = receiptOcr?.header || {}
  const totals = enrichedInvoice ? getOcrTotalsSummary(enrichedInvoice) : getOcrTotalsSummary(inv?.ocr)
  const explicitGrandTotal = resolveExplicitGrandTotal(inv)

  return {
    invoice_no: resolveInvoiceReferenceNumber(inv),
    vendor_name:
      inv.vendor_name ||
      hdr.vendorName ||
      hdr.supplierName ||
      hdr.company ||
      hdr.accountHolder ||
      hdr.bankAccountName ||
      receiptHdr.receivedFrom ||
      noticeHdr.vendorName ||
      null,
    invoice_date:
      inv.invoice_date ||
      hdr.invoiceDate ||
      hdr.date ||
      sectionA.date ||
      noticeHdr.invoiceDate ||
      noticeHdr.date ||
      receiptHdr.invoiceDate ||
      extractDateFromText(receiptHdr['Tanggal/Tempat']) ||
      null,
    subtotal:
      inv.subtotal ??
      totals.subtotal ??
      parseAmount(sectionA.totalAmount) ??
      parseAmount(hdr.subtotal) ??
      null,
    vat_amount:
      inv.vat_amount ??
      totals.taxAmount ??
      parseAmount(sectionA.vatAmount) ??
      parseAmount(hdr.taxAmount) ??
      null,
    total_amount:
      explicitGrandTotal ??
      inv.total_amount ??
      totals.grandTotal ??
      parseAmount(sectionA.grandTotal) ??
      parseAmount(sectionA.totals?.grandTotal) ??
      null,
    currency: inv?.currency || totals.currency || hdr.currency || 'IDR'
  }
}

export const mapOcrToInvoiceDetail = (uploadResult) => {
  const documentType = uploadResult.documentType || uploadResult?.ocr?.documentType || 'invoice'
  const enriched = enrichOcrPayload({
    ...uploadResult?.ocr,
    documentType
  })
  const header = enriched?.header || {}
  const lineItems = enriched?.lineItems || []
  const totals = getOcrTotalsSummary(enriched)
  const builtValidation = buildValidationExtractionFromOcr(
    documentType,
    header,
    totals,
    lineItems,
    {
      timesheets: enriched?.timesheets
    }
  )
  const validationExtraction = builtValidation
    ? {
        ...(uploadResult?.validation_extraction || enriched?.validationExtraction || {}),
        ...builtValidation,
        sections: {
          ...(uploadResult?.validation_extraction?.sections ||
            enriched?.validationExtraction?.sections ||
            {}),
          ...(builtValidation.sections || {})
        }
      }
    : uploadResult?.validation_extraction || enriched?.validationExtraction
  const invoiceBundle = validationExtraction?.validationBundle?.invoice || {}
  const confidence = uploadResult?.validation?.confidence ?? null
  const isTaxInvoice = documentType === 'tax_invoice'
  const isSupportingDoc = [
    'tax_invoice',
    'berita_acara',
    'manhour_summary',
    'timesheet',
    'po',
    'po_appendix',
    'ses',
    'attendance',
    'notice'
  ].includes(documentType)
  const invoiceWorkflow = header.invoiceWorkflow || detectInvoiceWorkflow(header)
  const isNonPoWorkflow = invoiceWorkflow === 'NON_PO' && !isSupportingDoc
  const demoScenario = resolveDemoScenario(
    { fileName: uploadResult.fileName, demo_scenario: uploadResult.demo_scenario },
    header
  )

  return {
    id: uploadResult.id,
    invoice_no: isSupportingDoc
      ? null
      : referenceForType(documentType, header) ||
        uploadResult.extracted?.invoice_no ||
        header.invoiceNumber,
    invoice_date: isSupportingDoc
      ? null
      : uploadResult.extracted?.invoice_date || header.invoiceDate,
    invoice_due_date: isSupportingDoc ? null : header.dueDate || null,
    booking_ref: isSupportingDoc ? null : header.bookingRef || null,
    vendor_name: uploadResult.extracted?.vendor_name || header.vendorName,
    po_number:
      coerceEssaPoNumber(uploadResult.extracted?.po_number) ||
      coerceEssaPoNumber(header.poNumber) ||
      null,
    invoice_workflow: invoiceWorkflow,
    currency: totals.currency,
    subtotal: isSupportingDoc ? null : totals.subtotal,
    vat_amount: isTaxInvoice ? null : totals.taxAmount,
    total_amount: isSupportingDoc ? null : totals.grandTotal,
    bank_name: header.bankName || invoiceBundle.bank_name || null,
    bank_account: header.bankAccount || invoiceBundle.bank_account || null,
    ocr_confidence: confidence,
    overall: isNonPoWorkflow ? 'pass' : uploadResult.validation?.overall || 'review',
    status: 'extracted',
    source: 'ocr',
    document_type: documentType,
    lines: lineItems.map((item, index) => {
      const lineTotal =
        documentType === 'ses' ? computeSesLineTotal(item) : computeLineItemAmount(item)
      return {
        line_no: index + 1,
        description: item.description || item.serviceName,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.lineValue ?? item.unitPrice,
        total: lineTotal,
        role: item.role || item.manpowerRole,
        manpower_name: item.manpowerName,
        passenger_name: item.manpowerName || item.passengerName,
        airline: item.airline,
        flight: item.flightNo || item.flight,
        routing: item.routing || item.route,
        departure: item.departure,
        confirm_no: item.confirmNo || item.confirm_no,
        ticket_no: item.ticketNo || item.ticket_no,
        date: item.date,
        username: item.username,
        regular_manhour: item.regularManhour,
        overtime_manhour: item.overtimeManhour,
        delivery_date: item.deliveryDate
      }
    }),
    validation: resolveInvoiceValidation(uploadResult, enriched, confidence),
    approvals: [],
    timeline: [
      {
        id: `${uploadResult.id || 'upload'}-ocr`,
        event_type: 'ocr_completed',
        created_at: new Date().toISOString(),
        actor_name: 'Document extraction',
        actor_role: 'system',
        message: `Extracted from ${uploadResult.fileName || 'uploaded document'}`
      }
    ],
    ocr: demoScenario
      ? {
          ...enriched,
          header: { ...header, demoScenario }
        }
      : enriched,
    demo_scenario: demoScenario,
    file_name: uploadResult.fileName || null,
    validation_extraction: validationExtraction,
    ocr_by_type: {
      [documentType]: demoScenario ? { ...enriched, header: { ...header, demoScenario } } : enriched
    },
    ...(documentType === 'tax_invoice'
      ? {
          tax_invoice_meta: {
            taxInvoiceNumber: header.taxInvoiceNumber || null,
            date: header.invoiceDate || null,
            vatAmount: pickFirstAmount(totals.taxAmount, header.taxAmount)
          }
        }
      : {})
  }
}

const documentToUploadResult = (doc) => ({
  id: doc.id,
  documentType: doc.documentType,
  extracted: {
    invoice_no: doc.invoice_no,
    invoice_date: doc.invoice_date,
    vendor_name: doc.vendor_name,
    po_number: doc.po_number,
    total_amount: doc.total_amount,
    currency: doc.currency
  },
  validation: doc.validation || { overall: doc.overall, confidence: doc.confidence },
  documentId: doc.documentId ?? doc.validation?.documentId ?? null,
  ocr: doc.ocr,
  validation_extraction: doc.validation_extraction,
  fileName: doc.file?.name
})

const enrichMergedTaxSection = (mapped, mergedSections) => {
  const taxMapped = mapped.find((item) => item.document_type === 'tax_invoice')
  if (!taxMapped) return mergedSections

  const taxResolved = resolveTaxInvoiceSectionData({
    ocr_by_type: Object.fromEntries(
      mapped
        .filter((item) => item.document_type && item.ocr)
        .map((item) => [item.document_type, item.ocr])
    ),
    validation_extraction: { sections: mergedSections }
  })

  mergedSections.B_taxInvoice = {
    ...(mergedSections.B_taxInvoice || {}),
    taxInvoiceNumber: taxResolved.taxInvoiceNumber,
    date: taxResolved.date,
    vatAmount: taxResolved.vatAmount,
    totals: {
      ...(mergedSections.B_taxInvoice?.totals || {}),
      vatAmount: taxResolved.vatAmount,
      currency: mergedSections.B_taxInvoice?.totals?.currency || 'IDR'
    }
  }

  return mergedSections
}

const buildTaxInvoiceMeta = (mapped) => {
  const taxMapped = mapped.find((item) => item.document_type === 'tax_invoice')
  if (!taxMapped) return null

  const taxResolved = resolveTaxInvoiceSectionData({
    ocr_by_type: Object.fromEntries(
      mapped
        .filter((item) => item.document_type && item.ocr)
        .map((item) => [item.document_type, item.ocr])
    )
  })

  return {
    taxInvoiceNumber: taxResolved.taxInvoiceNumber,
    date: taxResolved.date,
    vatAmount: taxResolved.vatAmount
  }
}

/** Map one classified document from a multi-document extract API response. */
export const mapApiClassifiedDocumentToBatchRow = (apiDoc, { file, fileName, classification } = {}) => {
  const documentType = apiDoc.documentType
  const uploadResult = mapOcrToUploadResult(
    {
      documentType,
      header: apiDoc.header || {},
      lineItems: apiDoc.lineItems || [],
      timesheets: apiDoc.timesheets || [],
      fields: apiDoc.structuredFields || apiDoc.fields || [],
      structuredFields: apiDoc.structuredFields || null,
      manhourSummary: apiDoc.manhourSummary || [],
      attendanceEntries: apiDoc.attendanceEntries || [],
      appendixItems: apiDoc.appendixItems || [],
      tables: apiDoc.tables || [],
      fileName: apiDoc.fileName || fileName,
      configHash: apiDoc.configHash || null
    },
    apiDoc.fileName || fileName,
    documentType,
    {
      validation: apiDoc.validation,
      documentId: apiDoc.documentId
    }
  )

  return {
    file,
    status: 'done',
    documentType: uploadResult.documentType,
    id: uploadResult.id,
    documentId: uploadResult.documentId,
    invoice_no: uploadResult.extracted?.invoice_no,
    vendor_name: uploadResult.extracted?.vendor_name,
    po_number: uploadResult.extracted?.po_number,
    total_amount: uploadResult.extracted?.total_amount,
    currency: uploadResult.extracted?.currency,
    overall: uploadResult.validation?.overall,
    confidence: uploadResult.validation?.confidence,
    validation: uploadResult.validation,
    ocr: uploadResult.ocr,
    validation_extraction: uploadResult.validation_extraction,
    pdfUrl: apiDoc.pdfUrl || null,
    classification: classification ?? null
  }
}

const EXTRACT_TAB_BY_DOCUMENT_TYPE = {
  invoice: 'A_invoice',
  tax_invoice: 'B_taxInvoice',
  notice: 'C_notice',
  receipt: 'C_notice',
  berita_acara: 'D_beritaAcara',
  manhour_summary: 'E_manhourSummary',
  timesheet: 'F_timesheet',
  attendance: 'G_attendance',
  po: 'H_po',
  po_appendix: 'I_poAppendix',
  ses: 'K_ses'
}

const EXTRACT_TAB_BY_TYPE_CODE = {
  A: 'A_invoice',
  B: 'B_taxInvoice',
  C: 'C_notice',
  D: 'D_beritaAcara',
  E: 'E_manhourSummary',
  F: 'F_timesheet',
  G: 'G_attendance',
  H: 'H_po',
  I: 'I_poAppendix',
  K: 'K_ses'
}

/** Build section-key → pdfUrl map from classified extract batch rows and split metadata. */
export const buildExtractDocPdfs = (documents = [], splitSections = []) => {
  const pdfs = {}

  for (let i = 0; i < splitSections.length; i++) {
    const section = splitSections[i]
    const sectionType = section.schemaId || section.documentName || section.type
    const docType = normalizeValidationDocumentType(sectionType)
    const tabKey =
      (section.typeCode && EXTRACT_TAB_BY_TYPE_CODE[section.typeCode]) ||
      (docType && EXTRACT_TAB_BY_DOCUMENT_TYPE[docType])
    const pdfUrl = section.pdfUrl || section.pdfPath
    if (tabKey && pdfUrl) {
      pdfs[tabKey] = pdfUrl
    }
  }

  for (let i = 0; i < splitSections.length; i++) {
    const section = splitSections[i]
    const doc = documents[i]
    if (!doc) continue
    const sectionType = section.schemaId || section.documentName || section.type
    const docType =
      normalizeValidationDocumentType(sectionType) ||
      normalizeValidationDocumentType(doc.documentType) ||
      normalizeValidationDocumentType(doc.document_type)
    const tabKey =
      (section.typeCode && EXTRACT_TAB_BY_TYPE_CODE[section.typeCode]) ||
      (docType && EXTRACT_TAB_BY_DOCUMENT_TYPE[docType])
    const pdfUrl = section.pdfUrl || section.pdfPath || doc.pdfUrl
    if (tabKey && pdfUrl && !pdfs[tabKey]) {
      pdfs[tabKey] = pdfUrl
    }
  }

  for (const doc of documents) {
    const docType =
      normalizeValidationDocumentType(doc.documentType) ||
      normalizeValidationDocumentType(doc.document_type)
    const tabKey = docType && EXTRACT_TAB_BY_DOCUMENT_TYPE[docType]
    if (tabKey && doc.pdfUrl) {
      pdfs[tabKey] = doc.pdfUrl
    }
  }

  if (pdfs.A_invoice) {
    pdfs.A_nonPoTravel = pdfs.A_nonPoTravel || pdfs.A_invoice
  }

  return pdfs
}

/** Coerce a persisted or in-memory invoice into merged batch shape when needed. */
export const normalizeClassifiedInvoice = (inv) => {
  if (!inv || inv.ocr_by_type || !Array.isArray(inv.documents) || !inv.documents.length) {
    return inv
  }

  const normalizedDocuments = normalizeClassifiedExtractPayload(
    { documents: inv.documents },
    inv.fileName || inv.file_name
  )
  const batchDocuments = normalizedDocuments.map((doc) =>
    mapApiClassifiedDocumentToBatchRow(doc, { fileName: inv.fileName || inv.file_name })
  )
  const remapped =
    mapBatchOcrToInvoiceDetail(batchDocuments, {
      splitSections: inv.split?.sections || inv.splitSections || []
    }) || inv
  if (inv.extract_doc_pdfs && !remapped.extract_doc_pdfs) {
    return { ...remapped, extract_doc_pdfs: inv.extract_doc_pdfs }
  }
  return remapped
}

/** Map a classified multi-document extract response into batch rows + merged invoice detail. */
export const mapClassifiedExtractResponse = (raw, fileName, file) => {
  const classification = raw?.classification ?? null
  const apiDocs = normalizeClassifiedExtractPayload(raw, fileName)
  if (!apiDocs.length) return null

  const batchDocuments = apiDocs.map((doc) =>
    mapApiClassifiedDocumentToBatchRow(doc, { file, fileName, classification })
  )
  const demoScenario =
    raw?.demoScenario ??
    apiDocs.find((doc) => doc.documentType === 'invoice')?.header?.demoScenario ??
    null
  const topLevelValidation = raw?.validation ?? null
  const poExtractFields = resolvePurchaseOrderFieldsFromPayload(raw)
  const fieldSchemas = raw?.meta?.fieldSchemas || null
  const batchDocumentsWithValidation = topLevelValidation
    ? batchDocuments.map((doc) => ({ ...doc, topLevelValidation }))
    : batchDocuments
  const batchDocumentsWithMeta = batchDocumentsWithValidation.map((doc) => ({
    ...doc,
    po_extract_fields: poExtractFields || undefined,
    extract_field_schemas: fieldSchemas || undefined
  }))
  const merged = mapBatchOcrToInvoiceDetail(batchDocumentsWithMeta, {
    demoScenario,
    topLevelValidation,
    splitSections: raw?.split?.sections || [],
    classification,
    poExtractFields,
    fieldSchemas,
    preferredInvoiceWorkflow: raw?.meta?.invoiceWorkflow || null,
    preferredInvoiceTypeId: raw?.meta?.invoiceTypeId || null
  })

  const mergedWithSes = raw?.backendSes
    ? mergeBackendSesIntoInvoice(merged, raw.backendSes)
    : merged

  return {
    isClassifiedBatch: true,
    batchDocuments: batchDocumentsWithMeta,
    merged: mergedWithSes,
    topLevelValidation,
    classification,
    splitSections: raw?.split?.sections || []
  }
}

const mergeCanonicalOcrByType = (mapped = []) => {
  const byType = new Map()

  for (const item of mapped) {
    if (!item?.ocr) continue
    const canon = normalizeValidationDocumentType(item.document_type) || item.document_type
    if (!canon) continue

    const payload =
      canon === 'tax_invoice'
        ? normalizeTaxInvoiceOcr(item.ocr)
        : enrichOcrPayload({ ...item.ocr, documentType: canon })

    const existing = byType.get(canon)
    if (!existing) {
      byType.set(canon, payload)
      continue
    }

    byType.set(canon, {
      ...existing,
      header: preferNonEmptyHeaderMerge(existing.header, payload.header),
      lineItems: [...(existing.lineItems || []), ...(payload.lineItems || [])],
      manhourSummary: [...(existing.manhourSummary || []), ...(payload.manhourSummary || [])],
      timesheets: [...(existing.timesheets || []), ...(payload.timesheets || [])],
      tables: [...(existing.tables || []), ...(payload.tables || [])],
      attendanceEntries: [
        ...(existing.attendanceEntries || []),
        ...(payload.attendanceEntries || [])
      ],
      appendixItems: [...(existing.appendixItems || []), ...(payload.appendixItems || [])],
      structuredFields: payload.structuredFields || existing.structuredFields || null
    })
  }

  return Object.fromEntries(byType)
}

const collectCanonicalBatchDocumentTypes = (mapped = []) => [
  ...new Set(
    mapped
      .map((item) => normalizeValidationDocumentType(item.document_type) || item.document_type)
      .filter(Boolean)
  )
]

const NON_PO_BATCH_DOC_TYPES = new Set(['invoice', 'receipt', 'listing_invoice'])

/** Strip PO / SES / appendix extraction data from a non-PO upload batch. */
const pruneNonPoBatchExtract = ({
  mergedSections,
  batchDocumentTypes,
  ocrByType,
  extractDocPdfs
}) => {
  const invoiceOcr = ocrByType?.invoice
  const fallback =
    mergedSections.A_nonPoTravel ||
    mergedSections.A_invoice ||
    {}

  for (const key of Object.keys(mergedSections)) {
    delete mergedSections[key]
  }

  if (invoiceOcr?.header) {
    mergedSections.A_nonPoTravel = buildNonPoTravelSectionData(
      invoiceOcr.header,
      invoiceOcr.lineItems || [],
      getOcrTotalsSummary(invoiceOcr)
    )
  } else if (Object.keys(fallback).length) {
    mergedSections.A_nonPoTravel = buildNonPoTravelSectionData(
      {
        invoiceNumber: fallback.invoiceNo,
        invoiceDate: fallback.invoiceDate || fallback.date,
        dueDate: fallback.invoiceDueDate || fallback.dueDate,
        subtotal: fallback.amount || fallback.subtotal || fallback.totalAmount,
        taxAmount: fallback.vatAmount,
        grandTotal: fallback.totalAmount || fallback.grandTotal,
        ...fallback
      },
      [],
      {
        subtotal: parseAmount(fallback.amount ?? fallback.subtotal),
        taxAmount: parseAmount(fallback.vatAmount),
        grandTotal: parseAmount(fallback.totalAmount ?? fallback.grandTotal),
        currency: fallback.currency || 'IDR'
      }
    )
  }

  if (Array.isArray(batchDocumentTypes)) {
    const kept = batchDocumentTypes.filter((type) => NON_PO_BATCH_DOC_TYPES.has(type))
    batchDocumentTypes.length = 0
    batchDocumentTypes.push(...(kept.length ? kept : ['invoice']))
  }

  for (const type of Object.keys(ocrByType || {})) {
    if (!NON_PO_BATCH_DOC_TYPES.has(type)) {
      delete ocrByType[type]
    }
  }

  const invoicePdf = extractDocPdfs.A_nonPoTravel || extractDocPdfs.A_invoice
  for (const key of Object.keys(extractDocPdfs)) {
    delete extractDocPdfs[key]
  }
  if (invoicePdf) {
    extractDocPdfs.A_nonPoTravel = invoicePdf
  }
}

/** Merge OCR results from a completed upload batch into one invoice detail payload. */
export const mapBatchOcrToInvoiceDetail = (documents = [], options = {}) => {
  const {
    splitSections = [],
    classification = options.classification ?? null,
    poExtractFields = options.poExtractFields ?? null,
    fieldSchemas = options.fieldSchemas ?? null,
    preferredInvoiceWorkflow = options.preferredInvoiceWorkflow ?? null,
    preferredInvoiceTypeId = options.preferredInvoiceTypeId ?? null
  } = options
  const resolvedClassification =
    classification ?? documents.find((doc) => doc.classification)?.classification ?? null
  const done = documents.filter(isBatchDocumentReady)
  if (!done.length) return null

  const extractDocPdfs = buildExtractDocPdfs(done, splitSections)

  const mapped = done.map((doc) => mapOcrToInvoiceDetail(documentToUploadResult(doc)))
  const primaryMapped =
    mapped.find((item) => item.document_type === 'invoice') ||
    mapped.find((item) => isOcrPreviewDocumentType(item.document_type)) ||
    mapped[0]

  const mergedSections = {}
  for (const item of mapped) {
    const sections = item.validation_extraction?.sections || {}
    for (const [key, value] of Object.entries(sections)) {
      if (value && typeof value === 'object') {
        mergedSections[key] =
          key === 'H_po'
            ? preferNonEmptyHeaderMerge(mergedSections[key], value)
            : { ...(mergedSections[key] || {}), ...value }
      }
    }
  }

  enrichMergedTaxSection(mapped, mergedSections)
  const taxInvoiceMeta = buildTaxInvoiceMeta(mapped)

  const confidences = mapped.map((item) => item.ocr_confidence).filter((value) => value != null)
  const avgConfidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : null

  const overallRank = { fail: 0, review: 1, approved: 2 }
  const worstOverall = mapped.reduce((worst, item) => {
    const rank = overallRank[item.overall] ?? 1
    return rank < (overallRank[worst] ?? 1) ? item.overall : worst
  }, 'approved')

  const mergedSummary = mapped
    .map((item) => item.validation?.summary)
    .filter(Boolean)
    .reduce(
      (acc, summary) => ({
        total: acc.total + (summary.total || 0),
        passed: acc.passed + (summary.passed || 0),
        warnings: acc.warnings + (summary.warnings || 0),
        failed: acc.failed + (summary.failed || 0),
        blocked: acc.blocked + (summary.blocked || 0)
      }),
      { total: 0, passed: 0, warnings: 0, failed: 0, blocked: 0 }
    )

  const severityRank = { BLOCKED: 0, FAIL: 1, WARNING: 2, PASS: 3 }
  const worstOverallStatus = mapped.reduce((worst, item) => {
    const status = item.validation?.overallStatus
    if (!status) return worst
    const rank = severityRank[status] ?? 2
    return rank < (severityRank[worst] ?? 3) ? status : worst
  }, 'PASS')

  const primaryDocumentId =
    primaryMapped.validation?.documentId || primaryMapped.ocr?.documentId || null

  const batchFileName =
    documents.find((doc) => doc.documentType === 'invoice')?.file?.name ||
    documents[0]?.file?.name ||
    null

  const demoScenario =
    options.demoScenario ??
    primaryMapped.ocr?.header?.demoScenario ??
    mapped.find((item) => item.ocr?.header?.demoScenario)?.ocr?.header?.demoScenario ??
    resolveDemoScenario({ file_name: batchFileName }, primaryMapped.ocr?.header) ??
    null

  const isPoDemo = demoScenario === 'po_match' || demoScenario === 'po_nomatch'
  const poMapped = mapped.find((item) => item.document_type === 'po')
  const batchPoNumber =
    coerceNullish(poExtractFields?.poNumber) ||
    coerceNullish(poMapped?.ocr?.structuredFields?.poNumber) ||
    coerceNullish(poMapped?.ocr?.header?.poNumber) ||
    collectPoNumberFromExtractDocuments(
      mapped.map((item) => ({
        documentType: item.document_type,
        structuredFields: item.ocr?.structuredFields,
        header: {
          ...(item.ocr?.header || {}),
          poNumber: item.po_number || item.ocr?.header?.poNumber || null
        },
        fields: item.ocr?.fields || [],
        lineItems: item.ocr?.lineItems || item.lines || []
      }))
    ) ||
    primaryMapped.po_number ||
    primaryMapped.ocr?.header?.poNumber ||
    null

  const ocrByType = mergeCanonicalOcrByType(mapped)

  const resolvedPoExtractFields =
    poExtractFields ||
    ocrByType.po?.structuredFields ||
    (poMapped?.ocr?.structuredFields ? { ...poMapped.ocr.structuredFields } : null)

  if (resolvedPoExtractFields) {
    const poHeader = coerceStructuredFieldsToHeader(resolvedPoExtractFields, 'po')
    mergedSections.H_po = preferNonEmptyHeaderMerge(mergedSections.H_po, poHeader, {
      poNumber: coerceNullish(resolvedPoExtractFields.poNumber),
      poHeaderInformation: coerceNullish(resolvedPoExtractFields.poHeaderInformation),
      description: coerceNullish(resolvedPoExtractFields.description),
      deliveryDate: coerceNullish(resolvedPoExtractFields.deliveryDate)
    })
  }
  const batchDocumentTypes = [
    ...new Set([
      ...collectCanonicalBatchDocumentTypes(mapped),
      ...inferBatchTypesFromClassification(resolvedClassification)
    ])
  ]

  const preferred =
    preferredInvoiceWorkflow === 'PO' || preferredInvoiceWorkflow === 'NON_PO'
      ? preferredInvoiceWorkflow
      : null

  let invoiceWorkflow = isPoDemo
    ? 'PO'
    : preferred ||
      resolveBatchInvoiceWorkflow(primaryMapped.ocr?.header || {}, batchPoNumber, {
        fileName: batchFileName,
        batchDocumentTypes,
        ocrByType,
        classification: resolvedClassification
      })

  const commercialPo =
    coerceEssaPoNumber(batchPoNumber) ||
    coerceEssaPoNumber(primaryMapped.po_number) ||
    coerceEssaPoNumber(primaryMapped.ocr?.header?.poNumber)
  const poDocSignals = hasPoWorkflowSignals({
    header: primaryMapped.ocr?.header || {},
    batchDocumentTypes,
    ocrByType,
    classification: resolvedClassification,
    poNumber: commercialPo || batchPoNumber,
    fileName: batchFileName
  })
  // Only treat as Non-PO when there is no ESSA PO number and no PO-pack signals
  // (PO / appendix pages, timesheets, etc.). Do not null a manpower pack just
  // because the commercial invoice header omitted the PO.
  if (
    invoiceWorkflow === 'PO' &&
    !isPoDemo &&
    !isPoDemoUploadFileName(batchFileName) &&
    !commercialPo &&
    !poDocSignals
  ) {
    invoiceWorkflow = 'NON_PO'
  }

  const isNonPoBatch = !isPoDemo && invoiceWorkflow === 'NON_PO'

  const mergedOcrHeader = salvageTicketFromInvalidPo({
    ...(primaryMapped.ocr?.header || {}),
    ...(batchPoNumber ? { poNumber: batchPoNumber } : {}),
    invoiceWorkflow
  })

  const mergedOcr =
    demoScenario && primaryMapped.ocr
      ? {
          ...primaryMapped.ocr,
          header: { ...mergedOcrHeader, demoScenario }
        }
      : primaryMapped.ocr
        ? {
            ...primaryMapped.ocr,
            header: mergedOcrHeader
          }
        : primaryMapped.ocr

  const invoiceBank = resolveInvoiceBankDetails({
    ...primaryMapped,
    ocr_by_type: ocrByType,
    validation_extraction: { sections: mergedSections }
  })
  const mergedOcrWithBank = mergedOcr
    ? {
        ...mergedOcr,
        header: {
          ...(mergedOcr.header || {}),
          ...(invoiceBank.bankName ? { bankName: invoiceBank.bankName } : {}),
          ...(invoiceBank.bankAccount ? { bankAccount: invoiceBank.bankAccount } : {}),
          ...(invoiceBank.accountHolder ? { accountHolder: invoiceBank.accountHolder } : {}),
          ...(invoiceBank.bankBranch ? { bankBranch: invoiceBank.bankBranch } : {})
        }
      }
    : mergedOcr

  const topLevelValidation =
    options.topLevelValidation ??
    documents.find((doc) => doc.topLevelValidation)?.topLevelValidation ??
    null
  const topLevelValidationState = topLevelValidation?.results?.length
    ? buildValidationState(topLevelValidation, {
        confidence: avgConfidence,
        documentId: primaryDocumentId,
        header: mergedOcrHeader,
        demoScenario,
        batchDocumentTypes,
        ocrByType,
        inv: {
          ocr: mergedOcr,
          ocr_by_type: ocrByType,
          invoice_workflow: invoiceWorkflow,
          batch_document_types: batchDocumentTypes,
          classification: resolvedClassification
        }
      })
    : null

  const batchValidationFallback = {
    // Per-document checks are incomplete for batch rules — run bundle validation on detail load.
    checks: [],
    confidence: avgConfidence,
    overallStatus: worstOverallStatus,
    summary: null,
    po_number:
      coerceEssaPoNumber(batchPoNumber) ||
      coerceEssaPoNumber(primaryMapped.validation?.po_number) ||
      coerceEssaPoNumber(primaryMapped.po_number) ||
      null,
    ses_no: primaryMapped.validation?.ses_no || null,
    documentId: primaryDocumentId
  }

  const commercialSummary = resolveCommercialInvoiceSummary({
    ...primaryMapped,
    ocr: mergedOcrWithBank,
    ocr_by_type: ocrByType
  })

  const resolvedBank = resolveInvoiceBankDetails({
    ...primaryMapped,
    ocr: mergedOcrWithBank,
    ocr_by_type: ocrByType,
    validation_extraction: { sections: mergedSections }
  })

  if (!isNonPoBatch && (mergedSections.A_invoice || ocrByType.invoice || ocrByType.receipt)) {
    const invoiceGrandTotal = resolveExplicitGrandTotal({ ocr_by_type: ocrByType })
    mergedSections.A_invoice = {
      ...(mergedSections.A_invoice || {}),
      invoiceNo:
        commercialSummary.invoice_no || mergedSections.A_invoice?.invoiceNo || null,
      vendorName:
        commercialSummary.vendor_name || mergedSections.A_invoice?.vendorName || null,
      date: commercialSummary.invoice_date || mergedSections.A_invoice?.date || null,
      grandTotal:
        invoiceGrandTotal != null
          ? String(invoiceGrandTotal)
          : mergedSections.A_invoice?.grandTotal ?? null,
      bankDetails: {
        ...(mergedSections.A_invoice?.bankDetails || {}),
        bankName: resolvedBank.bankName,
        bankAccount: resolvedBank.bankAccount,
        bankBranch: resolvedBank.bankBranch,
        accountHolder: resolvedBank.accountHolder
      },
      totals: {
        ...(mergedSections.A_invoice?.totals || {}),
        grandTotal:
          invoiceGrandTotal ?? mergedSections.A_invoice?.totals?.grandTotal ?? null,
        currency:
          commercialSummary.currency ||
          mergedSections.A_invoice?.totals?.currency ||
          'IDR'
      }
    }
  }

  if (mergedSections.F_timesheet || ocrByType.timesheet || ocrByType.manhour_summary) {
    const timesheetRoles = resolveTimesheetManpowerRoles(
      { ocr_by_type: ocrByType },
      mergedSections.F_timesheet?.manpowerSheets || []
    )
    const enrichedSheets = enrichTimesheetSheetsWithManhourSummaryRoles(
      mergedSections.F_timesheet?.manpowerSheets || [],
      { ocr_by_type: ocrByType }
    )
    mergedSections.F_timesheet = {
      ...(mergedSections.F_timesheet || {}),
      ...(timesheetRoles.length ? { manpowerRoles: timesheetRoles } : {}),
      ...(enrichedSheets.length ? { manpowerSheets: enrichedSheets } : {})
    }
  }

  const resolvedTax = resolveTaxInvoiceSectionData({
    ocr_by_type: ocrByType,
    tax_invoice_meta: taxInvoiceMeta,
    validation_extraction: { sections: mergedSections }
  })
  if (resolvedTax.taxInvoiceNumber || resolvedTax.date || resolvedTax.vatAmount != null) {
    mergedSections.B_taxInvoice = {
      ...(mergedSections.B_taxInvoice || {}),
      taxInvoiceNumber: resolvedTax.taxInvoiceNumber,
      date: resolvedTax.date,
      vatAmount: resolvedTax.vatAmount,
      totals: {
        ...(mergedSections.B_taxInvoice?.totals || {}),
        vatAmount: resolvedTax.vatAmount,
        currency: mergedSections.B_taxInvoice?.totals?.currency || 'IDR'
      }
    }
  }

  const finalTaxMeta = taxInvoiceMeta || buildTaxInvoiceMeta(mapped)

  if (!isNonPoBatch) {
    delete mergedSections.A_nonPoTravel
    if (mergedSections.A_invoice) {
      mergedSections.A_invoice = {
        ...mergedSections.A_invoice,
        poNumber: batchPoNumber || mergedSections.A_invoice.poNumber || null,
        invoiceWorkflow: 'PO'
      }
    }
  } else {
    pruneNonPoBatchExtract({
      mergedSections,
      batchDocumentTypes,
      ocrByType,
      extractDocPdfs
    })
  }

  const resolvedInvoiceType = isNonPoBatch
    ? 'Non-PO'
    : resolveInvoiceTypeLabel({
        ...primaryMapped,
        invoice_type: primaryMapped.invoice_type,
        invoice_type_code: preferredInvoiceTypeId,
        invoiceTypeId: preferredInvoiceTypeId,
        invoice_workflow: invoiceWorkflow,
        po_number: batchPoNumber || primaryMapped.po_number,
        vendor_name: commercialSummary.vendor_name ?? primaryMapped.vendor_name,
        file_name: batchFileName,
        classification: resolvedClassification,
        batch_document_types: batchDocumentTypes,
        ocr_by_type: ocrByType
      })

  return {
    ...primaryMapped,
    id: primaryMapped.id || (primaryDocumentId ? `ocr-${primaryDocumentId}` : `ocr-batch-${Date.now()}`),
    demo_scenario: demoScenario,
    file_name: batchFileName,
    po_number: isNonPoBatch
      ? null
      : coerceEssaPoNumber(batchPoNumber) || coerceEssaPoNumber(primaryMapped.po_number) || null,
    invoice_workflow: invoiceWorkflow,
    invoice_type: resolvedInvoiceType,
    invoice_type_code: invoiceTypeCodeFromLabel(resolvedInvoiceType),
    po_category: isNonPoBatch ? 'Non-PO' : primaryMapped.po_category || null,
    invoice_no: commercialSummary.invoice_no ?? primaryMapped.invoice_no ?? null,
    vendor_name: commercialSummary.vendor_name ?? primaryMapped.vendor_name ?? null,
    invoice_date: commercialSummary.invoice_date ?? primaryMapped.invoice_date ?? null,
    subtotal: commercialSummary.subtotal ?? primaryMapped.subtotal ?? null,
    vat_amount: commercialSummary.vat_amount ?? primaryMapped.vat_amount ?? null,
    total_amount: commercialSummary.total_amount ?? primaryMapped.total_amount ?? null,
    currency: commercialSummary.currency || primaryMapped.currency || 'IDR',
    bank_name: resolvedBank.bankName || invoiceBank.bankName || primaryMapped.bank_name || null,
    bank_account:
      resolvedBank.bankAccount || invoiceBank.bankAccount || primaryMapped.bank_account || null,
    ocr: mergedOcrWithBank,
    validation_extraction: {
      activeSection: isNonPoBatch ? 'A_nonPoTravel' : 'A_invoice',
      sections: mergedSections
    },
    ocr_confidence: avgConfidence,
    overall: isNonPoBatch ? primaryMapped.overall || 'pass' : worstOverall,
    validation: isNonPoBatch
      ? {
          ...primaryMapped.validation,
          confidence: avgConfidence ?? primaryMapped.validation?.confidence ?? null,
          documentId: primaryDocumentId
        }
      : topLevelValidationState
        ? {
            ...topLevelValidationState,
            po_number:
              topLevelValidationState.po_number || batchPoNumber || primaryMapped.po_number || null,
            ses_no: topLevelValidationState.ses_no || primaryMapped.validation?.ses_no || null,
            documentId: primaryDocumentId
          }
        : batchValidationFallback,
    timeline: mapped.flatMap((item) => item.timeline || []),
    batch_document_types: batchDocumentTypes,
    classification: resolvedClassification,
    tax_invoice_meta: finalTaxMeta || {
      taxInvoiceNumber: resolvedTax.taxInvoiceNumber,
      date: resolvedTax.date,
      vatAmount: resolvedTax.vatAmount
    },
    ocr_by_type: ocrByType,
    extract_doc_pdfs: Object.keys(extractDocPdfs).length ? extractDocPdfs : undefined,
    po_extract_fields: isNonPoBatch ? undefined : resolvedPoExtractFields || undefined,
    extract_field_schemas: fieldSchemas || undefined
  }
}

export const mapOcrToUploadResult = (ocrPayload, fileName, requestedType, apiMeta = {}) => {
  const documentType = requestedType || ocrPayload?.documentType || 'invoice'
  const enriched = enrichOcrPayload({ ...ocrPayload, documentType })
  const header = enriched?.header || {}
  const totals = getOcrTotalsSummary(enriched)
  const confidence = averageConfidence(enriched?.fields)
  const validation = buildValidationState(apiMeta.validation, {
    confidence,
    documentId: apiMeta.documentId,
    header,
    inv: {
      ocr: enriched,
      ocr_by_type: { [documentType]: enriched },
      invoice_workflow: header.invoiceWorkflow || null
    }
  })

  return {
    id: apiMeta.documentId
      ? `ocr-${apiMeta.documentId}`
      : `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    documentType,
    documentId: apiMeta.documentId ?? null,
    extracted: {
      invoice_no: referenceForType(documentType, header),
      vendor_name: header.vendorName,
      po_number: coerceEssaPoNumber(header.poNumber),
      total_amount: totals.grandTotal ?? parseAmount(totalForType(documentType, header)),
      currency: totals.currency,
      invoice_date: dateForType(documentType, header)
    },
    validation,
    ocr: { ...enriched, documentType, documentId: apiMeta.documentId ?? null },
    validation_extraction: buildValidationExtractionFromOcr(
      documentType,
      header,
      totals,
      enriched?.lineItems || [],
      { timesheets: enriched?.timesheets }
    ),
    fileName: fileName || enriched?.fileName
  }
}

export const validateApInvoiceBundle = async (payload) => {
  const response = await axiosInstance.post('/ap-invoice-ocr/validate', payload)
  return response?.data?.data || null
}

export const validateApDocument = async (documentId, inv = null) => {
  if (inv) {
    return validateApInvoiceBundle(buildValidationRequest(inv, documentId))
  }
  const response = await axiosInstance.get(`/ap-invoice-ocr/${documentId}/validate`)
  return response?.data?.data || null
}

const pickInvoiceNumberFromDoc = (doc) => {
  if (!doc) return null

  const hdr = doc.ocr?.header || doc.header || doc.data?.header || {}
  const structured = doc.ocr?.structuredFields || doc.structuredFields
  const fromStructured =
    structured && typeof structured === 'object' && !Array.isArray(structured)
      ? structured.invNo || structured.invoiceNumber || structured.invoice_no
      : null
  const fromHeader =
    hdr.invNo || hdr.invoiceNumber || hdr.invoice_no || hdr['No.'] || hdr.invoiceNo
  const direct = doc.invoice_no || doc.invoiceNumber

  const value = direct || fromHeader || fromStructured
  return value ? String(value).trim() : null
}

/**
 * Extracts the invoice number from an OCR upload result.
 * Handles both single-document (normal file) and classified-batch (multi-doc, e.g. merged PDFs) responses.
 * - For classified batch, tries to find the document with type 'invoice', falling back to the first document.
 * - Attempts various property paths to robustly extract the invoice number, whether nested or top-level.
 * @param {object} uploadResult - The result from OCR extraction/upload.
 * @returns {string|null} - The invoice number string, or null if not found.
 */
export const resolveExtractedInvoiceNumber = (uploadResult) => {
  if (!uploadResult) return null

  if (uploadResult.isClassifiedBatch && uploadResult.batchDocuments?.length) {
    const invoiceDoc =
      uploadResult.batchDocuments.find((d) => d.documentType === 'invoice') ||
      uploadResult.batchDocuments.find(
        (d) => d.documentType === 'receipt' || d.documentType === 'notice'
      ) ||
      uploadResult.batchDocuments[0]
    const fromBatch =
      pickInvoiceNumberFromDoc(invoiceDoc) ||
      uploadResult.merged?.invoice_no ||
      uploadResult.merged?.ocr?.header?.invNo ||
      uploadResult.merged?.ocr?.header?.invoiceNumber
    return fromBatch ? String(fromBatch).trim() : null
  }

  const fromSingle =
    pickInvoiceNumberFromDoc(uploadResult) ||
    uploadResult.extracted?.invoice_no ||
    uploadResult.ocr?.header?.invNo ||
    uploadResult.ocr?.header?.invoiceNumber ||
    uploadResult.invoice_no
  return fromSingle ? String(fromSingle).trim() : null
}

/** True when extract API rejected upload because invoice number already exists. */
export const isDuplicateInvoiceExtractError = (error) =>
  Boolean(parseDuplicateInvoiceExtractError(error))

/** Parse backend DUPLICATE_INVOICE (409) payload from an extract failure. */
export const parseDuplicateInvoiceExtractError = (error) => {
  const payload = error?.response?.data
  if (!payload) return null

  const status = Number(error?.response?.status)
  const code = String(payload.code || '').toUpperCase()
  const isDuplicate =
    status === 409 || code === 'DUPLICATE_INVOICE' || payload?.data?.exists === true
  if (!isDuplicate) return null

  const invoiceNumber =
    payload?.data?.invoiceNumber ||
    payload?.invoiceNumber ||
    payload?.message?.match(/Invoice\s+(.+?)\s+already exists/i)?.[1] ||
    null

  return {
    invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : null,
    message:
      payload.message ||
      (invoiceNumber
        ? `Invoice ${invoiceNumber} already exists and cannot be processed.`
        : 'This invoice already exists and cannot be processed.')
  }
}

/** Parse a pre-extraction hard-stop when required documents were not classified. */
export const parseMissingMandatoryExtractError = (error) => {
  const payload = error?.response?.data
  const data = payload?.data || {}
  const tagged =
    error?.code === 'MISSING_MANDATORY_DOCUMENTS' ||
    data?.status === 'missing_mandatory_documents' ||
    Boolean(payload?.extractionTrace?.missingMandatoryDocuments) ||
    /required documents were not found/i.test(String(error?.message || payload?.message || ''))
  if (!tagged) return null

  const missing = (
    error?.missingDocuments ||
    data?.missingMandatoryDocuments ||
    data?.meta?.missingMandatoryDocuments ||
    []
  )
    .map((doc) => (typeof doc === 'string' ? doc : doc?.categoryLabel || doc?.categoryId))
    .filter(Boolean)

  const message =
    payload?.message ||
    error?.message ||
    (missing.length
      ? `Extraction stopped — required documents were not found: ${missing.join(', ')}.`
      : 'Extraction stopped — required documents were not found.')

  return { missing, message }
}

/**
 * Extracts the DocumentId for the main invoice from an OCR upload result.
 * Handles both batch and single-document responses.
 * - For classified batch, finds the invoice or first document and parses its documentId as a number.
 * - For single-document, reads documentId from top level.
 * @param {object} uploadResult - The OCR upload result object.
 * @returns {number|null} - The document ID if valid, else null.
 */
export const resolveExtractedDocumentId = (uploadResult) => {
  if (!uploadResult) return null // Early return if input is missing

  // Handle batch/multi-document cases
  if (uploadResult.isClassifiedBatch && uploadResult.batchDocuments?.length) {
    // Find invoice doc or use first entry
    const invoiceDoc =
      uploadResult.batchDocuments.find((d) => d.documentType === 'invoice') ||
      uploadResult.batchDocuments[0]
    // Parse the documentId and validate it is a positive integer
    const id = Number(invoiceDoc?.documentId)
    return Number.isInteger(id) && id > 0 ? id : null
  }

  // Handle single-document case
  const id = Number(uploadResult.documentId)
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * Checks if a given invoice number already exists in AP_DOCUMENT_EXTRACTION,
 * optionally excluding a specific document ID (useful for updates, to avoid false positives).
 * Makes an API request to perform the check on the backend.
 * @param {string|number} invoiceNumber - The invoice number to look for.
 * @param {number|null} excludeDocumentId - (Optional) Document ID to exclude from search.
 * @returns {Promise<boolean>} - Resolves to true if invoice number exists, false otherwise.
 */
export const checkInvoiceNumberExists = async (invoiceNumber, excludeDocumentId = null) => {
  // Clean up invoice number (empty or whitespace = skip)
  const trimmed = String(invoiceNumber ?? '').trim()
  if (!trimmed) return false

  // Build query parameters for backend API
  const params = { invoiceNumber: trimmed }
  const excludeId = Number(excludeDocumentId)
  if (Number.isInteger(excludeId) && excludeId > 0) {
    params.excludeDocumentId = excludeId
  }

  // Make API request to check if the invoice number exists
  const response = await axiosInstance.get(AP_INVOICE_NUMBER_EXISTS, { params })
  // Return 'exists' flag as a boolean
  return Boolean(response?.data?.data?.exists)
}

const pickPrimaryExtractDocument = (payload = {}, requestedType = 'invoice') => {
  const documents = Array.isArray(payload.documents) ? payload.documents : null
  if (!documents?.length) return payload

  return (
    documents.find((doc) => doc.documentType === requestedType && doc.status === 'extracted') ||
    documents.find((doc) => doc.documentType === 'invoice' && doc.status === 'extracted') ||
    documents.find((doc) => doc.status === 'extracted') ||
    documents[0]
  )
}

const EXTRACTION_SYNTHETIC_START = 28
const EXTRACTION_SYNTHETIC_CAP = 94
/** Wall-clock duration before synthetic progress reaches the cap (large PO bundles). */
const EXTRACTION_SYNTHETIC_DURATION_MS = 25 * 60 * 1000
const EXTRACTION_SYNTHETIC_TICK_MS = 1_000
/** OCR classify + extract for large PO bundles can take many minutes. */
const EXTRACTION_REQUEST_TIMEOUT_MS = 30 * 60 * 1000

export const extractApDocument = async (
  file,
  documentType = 'invoice',
  { onProgress, invoiceWorkflow } = {}
) => {
  const trace = createExtractionTrace(file?.name)
  logExtractCheckpoint(trace, 'START', {
    documentType,
    sizeBytes: file?.size,
    invoiceWorkflow: invoiceWorkflow || null
  })

  const ocrHealth = await fetchOcrServiceHealth()
  if (!ocrHealth?.ok) {
    const reason =
      ocrHealth?.error ||
      'OCR service is not reachable. Restart vp-be-essa and try again.'
    logExtractCheckpoint(trace, 'OCR_UNREACHABLE', { reason, ocrHealth })
    throw new Error(reason)
  }
  if (ocrHealth.activeExtracts > 0) {
    logExtractCheckpoint(trace, 'OCR_BUSY', {
      activeExtracts: ocrHealth.activeExtracts,
      queuedExtracts: ocrHealth.queuedExtracts
    })
  }

  const formData = new FormData()
  formData.append('document', file)
  formData.append('documentType', documentType)
  // AUTO (default): in-process OCR classifies first, then applies the matching
  // Prompt Builder template from the backend prompt map (Non-PO, Manpower,
  // Civil Contractor, etc.). PO / NON_PO remain explicit overrides for testing.
  const workflow = String(invoiceWorkflow || 'AUTO').toUpperCase()
  formData.append('invoiceWorkflow', workflow)

  const attachPromptCandidate = async (code, formKey, required) => {
    const promptText = await fetchPromptTextByInvoiceTypeCode(code)
    if (!promptText) {
      if (required) {
        throw new Error(
          code === 'MANPOWER_SERVICES'
            ? 'Manpower Services Prompt Builder template is empty. Open Prompt Config → PO → Manpower Services → Generate/Save Template, then retry.'
            : 'Non-PO Prompt Builder template is empty. Open Prompt Config → Non-PO → Generate/Save Template, then retry.'
        )
      }
      logExtractCheckpoint(trace, 'PROMPT_BUILDER_CANDIDATE_MISSING', {
        invoiceWorkflow: workflow,
        promptTypeCode: code,
        formKey
      })
      return
    }
    formData.append(formKey, promptText)
    logExtractCheckpoint(trace, 'PROMPT_BUILDER_CANDIDATE_ATTACHED', {
      invoiceWorkflow: workflow,
      promptTypeCode: code,
      formKey,
      promptChars: promptText.length,
      promptPreview: promptText.slice(0, 240)
    })
  }

  try {
    if (workflow === 'AUTO' || workflow === 'NON_PO') {
      await attachPromptCandidate('NON_PO', 'extractionPrompt', workflow === 'NON_PO')
    }
    if (workflow === 'AUTO' || workflow === 'PO') {
      await attachPromptCandidate(
        'MANPOWER_SERVICES',
        'extractionPromptPo',
        workflow === 'PO'
      )
    }
  } catch (err) {
    logExtractCheckpoint(trace, 'PROMPT_BUILDER_ATTACH_FAILED', {
      message: err?.message || String(err)
    })
    throw err
  }

  const reportProgress = (value, phase = null) => {
    const progress = typeof value === 'number' ? value : value?.progress
    const phaseLabel = phase || (typeof value === 'object' ? value?.phase : null)
    const elapsedMs = Date.now() - trace.startedAt

    if (phaseLabel) {
      logExtractCheckpoint(trace, phaseLabel, { progress })
    }

    if (typeof onProgress !== 'function') return
    onProgress({
      progress: Math.min(100, Math.max(0, Math.round(progress ?? 0))),
      phase: phaseLabel,
      elapsedMs,
      traceId: trace.traceId
    })
  }

  let processingTimer = null
  let ocrWaitTimer = null
  let uploadComplete = false
  let syntheticProgress = EXTRACTION_SYNTHETIC_START
  let processingStartedAt = 0

  const stopProcessingTick = () => {
    if (processingTimer) {
      clearInterval(processingTimer)
      processingTimer = null
    }
    if (ocrWaitTimer) {
      clearInterval(ocrWaitTimer)
      ocrWaitTimer = null
    }
  }

  const startOcrWaitHeartbeat = () => {
    if (ocrWaitTimer) return
    ocrWaitTimer = setInterval(() => {
      logExtractCheckpoint(trace, 'OCR_WAITING', {
        hint: 'Waiting on vp-be-essa OCR engine. Check backend logs for SECTION_START/DONE.',
        progress: Math.round(syntheticProgress)
      })
      reportProgress(syntheticProgress, 'OCR_WAITING')
    }, 15000)
  }

  const tickSyntheticProgress = () => {
    if (!processingStartedAt) return
    const elapsed = Date.now() - processingStartedAt
    const ratio = Math.min(1, elapsed / EXTRACTION_SYNTHETIC_DURATION_MS)
    const eased = 1 - (1 - ratio) ** 2.2
    syntheticProgress =
      EXTRACTION_SYNTHETIC_START +
      eased * (EXTRACTION_SYNTHETIC_CAP - EXTRACTION_SYNTHETIC_START)
    reportProgress(syntheticProgress)
  }

  const startProcessingTick = () => {
    if (processingTimer) return
    processingStartedAt = Date.now()
    syntheticProgress = EXTRACTION_SYNTHETIC_START
    tickSyntheticProgress()
    processingTimer = setInterval(tickSyntheticProgress, EXTRACTION_SYNTHETIC_TICK_MS)
  }

  // PO invoice bundles and commercial invoices may validate inline; supporting docs need the full batch.
  const validateInline =
    documentType === 'invoice' || documentType === 'po_invoice' ? 'true' : 'false'

  const workflowParam = `&invoiceWorkflow=${encodeURIComponent(workflow)}`

  logExtractCheckpoint(trace, 'REQUEST_URL', {
    url: `${AP_INVOICE_OCR_EXTRACT}?validate=${validateInline}${workflowParam}`,
    invoiceWorkflow: workflow,
    expectsPromptBuilderCandidate: workflow === 'AUTO' || workflow === 'NON_PO' || workflow === 'PO'
  })

  try {
    reportProgress(2, 'UPLOAD_START')

    const response = await axiosInstance.post(
      `${AP_INVOICE_OCR_EXTRACT}?validate=${validateInline}${workflowParam}`,
      formData,
      {
        headers: {
          // Let the runtime set multipart boundary. Manual Content-Type breaks text fields.
          'X-Extract-Trace-Id': trace.traceId
        },
        timeout: EXTRACTION_REQUEST_TIMEOUT_MS,
        onUploadProgress: (event) => {
          if (!event.total) {
            if (!uploadComplete) {
              uploadComplete = true
              reportProgress(26, 'UPLOAD_DONE_PROCESSING')
              startProcessingTick()
              startOcrWaitHeartbeat()
            }
            return
          }

          const uploadRatio = event.loaded / event.total
          reportProgress(2 + uploadRatio * 24, 'UPLOADING')

          if (uploadRatio >= 1 && !uploadComplete) {
            uploadComplete = true
            reportProgress(26, 'UPLOAD_DONE_OCR_RUNNING')
            startProcessingTick()
            startOcrWaitHeartbeat()
          }
        },
        transformRequest: [
          (data, headers) => {
            if (typeof FormData !== 'undefined' && data instanceof FormData) {
              if (headers && typeof headers.delete === 'function') {
                headers.delete('Content-Type')
              } else if (headers) {
                delete headers['Content-Type']
              }
            }
            return data
          }
        ]
      }
    )

    stopProcessingTick()
    reportProgress(100, 'RESPONSE_RECEIVED')

    const payload = response?.data?.data || {}
    const extractionTrace = response?.data?.extractionTrace || payload?.extractionTrace

    logExtractCheckpoint(trace, 'OCR_COMPLETE', {
      documentCount: Array.isArray(payload.documents) ? payload.documents.length : 0,
      persistStatus: payload.persistStatus || null,
      serverTrace: extractionTrace || null,
      ocrTiming: payload?.meta?.timing || null
    })

    if (
      payload.status === 'missing_mandatory_documents' ||
      extractionTrace?.missingMandatoryDocuments
    ) {
      const missing = (
        payload.missingMandatoryDocuments ||
        payload.meta?.missingMandatoryDocuments ||
        []
      )
        .map((doc) =>
          typeof doc === 'string' ? doc : doc?.categoryLabel || doc?.categoryId
        )
        .filter(Boolean)
      const message =
        response?.data?.message ||
        (missing.length
          ? `Extraction stopped — required documents were not found: ${missing.join(', ')}.`
          : 'Extraction stopped — required documents were not found.')
      const error = new Error(message)
      error.code = 'MISSING_MANDATORY_DOCUMENTS'
      error.missingDocuments = missing
      throw error
    }

    if (Array.isArray(payload.documents) && payload.documents.length > 0) {
      const classified = mapClassifiedExtractResponse(payload, file.name, file)
      if (!classified) {
        throw new Error('Document extraction returned no classified documents.')
      }
      logExtractCheckpoint(trace, 'MAPPED_BATCH', {
        batchDocuments: classified.batchDocuments?.length || 0
      })
      return { ...classified, extractionTrace: { ...extractionTrace, clientTraceId: trace.traceId } }
    }

    const raw = pickPrimaryExtractDocument(payload, documentType)
    const resolvedType = raw.documentType || documentType
    const ocrPayload = enrichOcrPayload({
      header: raw.header,
      lineItems: raw.lineItems,
      fields: raw.fields,
      timesheets: raw.timesheets,
      documentType: resolvedType
    })
    return mapOcrToUploadResult(ocrPayload, file.name, resolvedType, {
      validation: raw.validation,
      documentId: raw.documentId
    })
  } catch (error) {
    stopProcessingTick()
    logExtractCheckpoint(trace, 'FAILED', {
      message: error?.response?.data?.message || error?.message,
      status: error?.response?.status,
      code: error?.code
    })
    throw error
  }
}

export const fetchOcrServiceHealth = async () => {
  try {
    const response = await axiosInstance.get(AP_INVOICE_OCR_HEALTH)
    return response?.data?.data || { ok: false }
  } catch (error) {
    return {
      ok: false,
      error: error?.response?.data?.message || error?.message || 'Health check failed'
    }
  }
}

/** Parse `ocr-123` upload ids returned by persisted OCR batches. */
export const parsePersistedOcrUploadId = (id) => {
  const match = String(id || '').match(/^ocr-(\d+)$/)
  return match ? Number(match[1]) : null
}

export const isPersistedOcrUploadId = (id) => parsePersistedOcrUploadId(id) != null

export const fetchPersistedUploadListRows = async () => {
  try {
    const response = await axiosInstance.get(AP_INVOICE_OCR_UPLOADS)
    const rows = response?.data?.data
    return Array.isArray(rows)
      ? rows.map((row) => ({
          ...row,
          invoice_date: row.invoice_date || row.invoiceDate || row.date || null,
          source_channel: normalizeSourceChannel(
            row.source_channel || row.sourceChannel || 'UPLOAD'
          ),
          email_from: row.email_from || row.emailFrom || null,
          email_subject: row.email_subject || row.emailSubject || null,
          email_received_at: row.email_received_at || row.emailReceivedAt || null
        }))
      : []
  } catch {
    return []
  }
}

export const fetchPersistedUploadDetail = async (id) => {
  const documentId = parsePersistedOcrUploadId(id)
  if (!documentId) return null

  try {
    const response = await axiosInstance.get(`${AP_INVOICE_OCR_UPLOADS}/${documentId}`)
    const snapshot = response?.data?.data
    if (!snapshot?.documents?.length) return null

    const classified = mapClassifiedExtractResponse(
      snapshot,
      snapshot.fileName || snapshot.file_name || ''
    )
    if (!classified?.merged) return null

    const primaryId = snapshot.primaryDocumentId || documentId
    const merged = classified.merged
    const withSes = snapshot.backendSes
      ? mergeBackendSesIntoInvoice(merged, snapshot.backendSes)
      : await enrichInvoiceWithBackendSes(merged)

    const sourceChannel = normalizeSourceChannel(
      snapshot.sourceChannel || snapshot.source_channel || 'UPLOAD'
    )

    return {
      ...withSes,
      id: `ocr-${primaryId}`,
      documentId: primaryId,
      source: 'persisted',
      persisted: true,
      file_name: snapshot.fileName || classified.merged.file_name || null,
      source_channel: sourceChannel,
      email_from: snapshot.emailFrom || snapshot.email_from || null,
      email_subject: snapshot.emailSubject || snapshot.email_subject || null,
      email_received_at: snapshot.emailReceivedAt || snapshot.email_received_at || null,
      email_message_id: snapshot.emailMessageId || snapshot.email_message_id || null
    }
  } catch {
    return null
  }
}

export const fetchInboundEmails = async ({ status } = {}) => {
  try {
    const response = await axiosInstance.get(AP_INVOICE_OCR_EMAIL_INTAKE_INBOUND, {
      params: status ? { status } : undefined
    })
    const rows = response?.data?.data
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export const ignoreInboundEmail = async (inboundEmailId) => {
  const response = await axiosInstance.post(
    `${AP_INVOICE_OCR_EMAIL_INTAKE_INBOUND}/${encodeURIComponent(inboundEmailId)}/ignore`
  )
  return response?.data?.data || response?.data || null
}

export const simulateEmailIntake = async ({
  file,
  fromAddress,
  subject,
  invoiceWorkflow = 'AUTO'
} = {}) => {
  const form = new FormData()
  form.append('document', file)
  if (fromAddress) form.append('fromAddress', fromAddress)
  if (subject) form.append('subject', subject)
  if (invoiceWorkflow) form.append('invoiceWorkflow', invoiceWorkflow)
  const response = await axiosInstance.post(AP_INVOICE_OCR_EMAIL_INTAKE_SIMULATE, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response?.data?.data || response?.data || null
}

export const pollEmailIntake = async () => {
  // Poll waits for enqueue + sequential OCR; allow long-running requests
  const response = await axiosInstance.post(
    AP_INVOICE_OCR_EMAIL_INTAKE_POLL,
    {},
    { timeout: 30 * 60 * 1000 }
  )
  return response?.data?.data || response?.data || null
}

export const createDocumentRequest = async (payload = {}) => {
  const response = await axiosInstance.post(AP_INVOICE_OCR_DOCUMENT_REQUESTS, payload)
  return response?.data?.data || response?.data || null
}

export const fetchDocumentRequests = async (documentId) => {
  try {
    const response = await axiosInstance.get(AP_INVOICE_OCR_DOCUMENT_REQUESTS, {
      params: { documentId }
    })
    const rows = response?.data?.data
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export const cancelDocumentRequest = async (requestId) => {
  const response = await axiosInstance.post(
    `${AP_INVOICE_OCR_DOCUMENT_REQUESTS}/${encodeURIComponent(requestId)}/cancel`
  )
  return response?.data?.data || response?.data || null
}

export const sendDocumentRequestEmail = async (
  requestId,
  { to, body } = {}
) => {
  const response = await axiosInstance.post(
    `${AP_INVOICE_OCR_DOCUMENT_REQUESTS}/${encodeURIComponent(requestId)}/send`,
    { to, body }
  )
  return response?.data?.data || response?.data || null
}

export const fetchInboundSharePoint = async ({ status } = {}) => {
  try {
    const response = await axiosInstance.get(AP_INVOICE_OCR_SHAREPOINT_INTAKE_INBOUND, {
      params: status ? { status } : undefined
    })
    const rows = response?.data?.data
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export const simulateSharePointIntake = async ({
  file,
  fileName,
  invoiceWorkflow = 'AUTO'
} = {}) => {
  const form = new FormData()
  form.append('document', file)
  if (fileName) form.append('fileName', fileName)
  if (invoiceWorkflow) form.append('invoiceWorkflow', invoiceWorkflow)
  const response = await axiosInstance.post(AP_INVOICE_OCR_SHAREPOINT_INTAKE_SIMULATE, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response?.data?.data || response?.data || null
}

export const pollSharePointIntake = async () => {
  const response = await axiosInstance.post(
    AP_INVOICE_OCR_SHAREPOINT_INTAKE_POLL,
    {},
    { timeout: 30 * 60 * 1000 }
  )
  return response?.data?.data || response?.data || null
}
