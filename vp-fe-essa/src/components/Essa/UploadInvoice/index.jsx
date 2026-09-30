import { useRef, useState, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CloudUpload,
  FileText,
  X,
  ArrowRight,
  AlertOctagon,
  Trash2,
  Layers,
  Play,
  CheckCircle2,
} from 'lucide-react'
import { connect } from 'react-redux'
import { showEssaErrorToast, showExtractionSuccessToast } from '../lib/essaToast'
import {
  buildInvoiceDetailPath,
  prepareUploadInvoiceDetail
} from '../lib/uploadInvoiceNavigation'
import { Dialog } from '../ui/Dialog'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useEssaUploadInvoice } from 'hooks/useEssaUpload'
import {
  mapOcrToInvoiceDetail,
  mapBatchOcrToInvoiceDetail,
  enrichInvoiceWithBackendSes,
  isOcrPreviewDocumentType,
  detectInvoiceWorkflow,
  parseDuplicateInvoiceExtractError,
  parseMissingMandatoryExtractError,
  OCR_DOCUMENT_TYPES,
} from 'api/apInvoiceOcr'
import { formatExtractElapsed } from 'api/extractionTrace'
import { INVOICES, UPLOAD_INVOICE } from 'constants/url'
import { getStoredUserType } from 'utils/authStorage'
import '../../../assets/scss/essa/dashboard.scss'

const BRAND = 'var(--brand-primary-color, var(--dx-primary-600))'
const MAX_FILE_SIZE_MB = 25
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ACCEPTED_FILE_PATTERN = /\.(pdf|png|jpe?g|xlsx?|csv)$/i
const ACCEPTED_FILE_TYPES_LABEL = 'PDF, PNG, JPG, XLSX, XLS, CSV'
const FILE_INPUT_ACCEPT =
  'application/pdf,.pdf,image/png,.png,image/jpeg,.jpg,.jpeg,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

const DOCUMENT_TYPES = OCR_DOCUMENT_TYPES

const EXTRACT_PHASE_LABELS = {
  START: 'Starting extraction',
  UPLOAD_START: 'Preparing upload',
  UPLOADING: 'Uploading file',
  UPLOAD_DONE_OCR_RUNNING: 'OCR running (classify + extract)',
  UPLOAD_DONE_PROCESSING: 'Processing uploaded file',
  OCR_WAITING: 'OCR in progress (see console for heartbeat)',
  OCR_PROCESSING: 'OCR in progress',
  RESPONSE_RECEIVED: 'Finishing up',
  OCR_COMPLETE: 'OCR complete',
  MAPPED_BATCH: 'Mapping documents'
}

function updateAt(rows, idx, patch) {
  return rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))
}

function getTypeLabel(documentType) {
  return DOCUMENT_TYPES.find((t) => t.value === documentType)?.label || documentType
}

function getBatchRowSummary(doc, overrideProgress) {
  if (doc.status === 'extracting') {
    const phase =
      EXTRACT_PHASE_LABELS[doc.extractPhase] ||
      (doc.extractPhase ? doc.extractPhase.replace(/_/g, ' ').toLowerCase() : 'Extracting')
    return {
      primary: phase,
      secondary: doc.extractTraceId ? `Trace ${doc.extractTraceId}` : null,
      loading: true,
      progress: overrideProgress ?? doc.extractProgress ?? 0
    }
  }
  if (doc.status === 'failed') {
    return { primary: 'Extraction failed', secondary: doc.error, error: true }
  }
  if (doc.status === 'staged') {
    return null
  }

  const hdr = doc.ocr?.header || {}
  const lineCount = doc.ocr?.lineItems?.length || 0

  switch (doc.documentType) {
    case 'invoice': {
      const workflow =
        hdr.invoiceWorkflow ||
        detectInvoiceWorkflow(hdr, {
          poNumber: doc.po_number,
          batchDocumentTypes: doc.documentType ? [doc.documentType] : [],
          classification: doc.classification
        }) ||
        (doc.po_number ? 'PO' : 'NON_PO')
      const workflowLabel = workflow === 'PO' ? 'PO invoice' : 'Non-PO invoice'
      return {
        primary: doc.invoice_no || hdr.invoiceNumber || 'Invoice extracted',
        secondary: [workflowLabel, hdr.vendorName || doc.vendor_name].filter(Boolean).join(' · ')
      }
    }
    case 'tax_invoice':
      return {
        primary: hdr.taxInvoiceNumber ? `Tax inv ${hdr.taxInvoiceNumber}` : 'Tax invoice extracted',
        secondary: hdr.taxAmount ? `VAT ${hdr.taxAmount}` : null
      }
    case 'berita_acara':
      return {
        primary: hdr.poNumber ? `PO ${hdr.poNumber}` : 'Berita Acara extracted',
        secondary:
          hdr.periodStart && hdr.periodEnd ? `${hdr.periodStart} – ${hdr.periodEnd}` : hdr.serviceName
      }
    case 'manhour_summary':
      return {
        primary: lineCount
          ? `${lineCount} manpower row${lineCount !== 1 ? 's' : ''}`
          : 'Manhour summary extracted',
        secondary:
          hdr.totalRegularManhour || hdr.totalOvertimeManhour
            ? `Regular ${hdr.totalRegularManhour || '—'} · OT ${hdr.totalOvertimeManhour || '—'} hrs`
            : hdr.poNumber
              ? `PO ${hdr.poNumber}`
              : null
      }
    case 'timesheet': {
      const sheetCount = doc.ocr?.timesheets?.length || 0
      return {
        primary: sheetCount
          ? `${sheetCount} manpower timesheet${sheetCount !== 1 ? 's' : ''}`
          : lineCount
            ? `${lineCount} daily entries`
            : 'Timesheet extracted',
        secondary: hdr.periodStart
          ? `Period from ${hdr.periodStart}`
          : hdr.poNumber
            ? `PO ${hdr.poNumber}`
            : null
      }
    }
    case 'attendance':
      return {
        primary: lineCount
          ? `${lineCount} attendance event${lineCount !== 1 ? 's' : ''}`
          : 'Attendance extracted',
        secondary:
          hdr.periodStart && hdr.periodEnd
            ? `${hdr.periodStart} – ${hdr.periodEnd}`
            : hdr.site || null
      }
    case 'po':
      return {
        primary: hdr.poNumber ? `PO ${hdr.poNumber}` : 'Purchase order extracted',
        secondary: hdr.vendorName || (lineCount ? `${lineCount} line item${lineCount !== 1 ? 's' : ''}` : null)
      }
    case 'po_appendix':
      return {
        primary: hdr.poNumber ? `PO ${hdr.poNumber} appendix` : 'PO appendix extracted',
        secondary: lineCount ? `${lineCount} rate line${lineCount !== 1 ? 's' : ''}` : null
      }
    case 'ses':
      return {
        primary: hdr.sesNo ? `SES ${hdr.sesNo}` : 'SES extracted',
        secondary: lineCount
          ? `${lineCount} service line${lineCount !== 1 ? 's' : ''}`
          : hdr.poNumber
            ? `PO ${hdr.poNumber}`
            : null
      }
    default:
      return {
        primary: doc.invoice_no || hdr.poNumber || hdr.sesNo || 'Extracted',
        secondary: doc.vendor_name || hdr.vendorName || null
      }
  }
}

function getValidationIssues(doc) {
  const checks = doc.validation?.checks || []
  return checks.filter((c) => c.status === 'fail' || c.status === 'warn')
}

function getValidationBadge(doc) {
  const issues = getValidationIssues(doc)
  if (issues.length > 0) {
    const hasFail = issues.some((c) => c.status === 'fail')
    return {
      tone: hasFail ? 'fail' : 'warn',
      label: `${issues.length} issue${issues.length !== 1 ? 's' : ''}`
    }
  }
  if (doc.overall) {
    return { tone: doc.overall, label: null }
  }
  return null
}

/** Set true to show Auto / Force PO / Force Non-PO on the upload page. */
const SHOW_INVOICE_WORKFLOW_CARD = false

function EssaUploadInvoice({ userInfo: { userType: userTypeFromStore } }) {
  const inputRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const userType = userTypeFromStore || getStoredUserType() || 'vendor'

  const upload = useEssaUploadInvoice()

  const [documents, setDocuments] = useState([])
  const [lastError, setLastError] = useState(null)
  const [documentType, setDocumentType] = useState('invoice')
  const [invoiceWorkflow, setInvoiceWorkflow] = useState(() => {
    const fromQuery = new URLSearchParams(location.search).get('workflow')
    const normalized = String(fromQuery || '').toUpperCase()
    if (normalized === 'PO' || normalized === 'NON_PO' || normalized === 'AUTO') {
      return normalized
    }
    // Auto-detect from classification (Prompt Builder applies only when Non-PO).
    return 'AUTO'
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractionElapsedMs, setExtractionElapsedMs] = useState(0)
  const extractionStartRef = useRef(null)
  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    invoiceNumber: '',
    fileName: ''
  })
  const [missingDocsDialog, setMissingDocsDialog] = useState({
    open: false,
    missing: [],
    fileName: '',
    message: ''
  })

  const uploadPath = `/${userType}${UPLOAD_INVOICE}`
  const invoicesPath = `/${userType}${INVOICES}`

  const stagedCount = documents.filter((d) => d.status === 'staged').length
  const doneCount = documents.filter((d) => d.status === 'done').length
  const hasStartedOcr = documents.some((d) => d.status !== 'staged')
  const isStagingPhase = !hasStartedOcr && !isProcessing
  const batchOcrComplete =
    documents.length > 0 &&
    documents.every((d) => d.status === 'done' || d.status === 'failed') &&
    !isProcessing &&
    !upload.isPending
  const canViewInvoiceDetail = batchOcrComplete && doneCount > 0

  const usedTypes = useMemo(
    () => new Set(documents.map((d) => d.documentType)),
    [documents]
  )

  const availableTypes = useMemo(
    () => DOCUMENT_TYPES.filter((t) => !usedTypes.has(t.value)),
    [usedTypes]
  )

  // Update elapsed ms every second while any document is extracting so the
  // time-based progress bar keeps moving even when the backend stops sending XHR progress.
  useEffect(() => {
    const isExtracting = documents.some((d) => d.status === 'extracting')
    if (!isExtracting) {
      extractionStartRef.current = null
      setExtractionElapsedMs(0)
      return
    }
    if (!extractionStartRef.current) {
      extractionStartRef.current = Date.now()
    }
    const id = setInterval(
      () => setExtractionElapsedMs(Date.now() - extractionStartRef.current),
      1000
    )
    return () => clearInterval(id)
  }, [documents])

  // Max expected extraction time (4 min). The curve reaches ~86% at this point
  // and asymptotically approaches ~90%, so the bar never visually stalls.
  const MAX_EXTRACTION_MS = 240_000

  const batchExtractionProgress = useMemo(() => {
    if (!documents.length) return { percent: 0, label: '' }

    const terminal = documents.filter((d) => d.status === 'done' || d.status === 'failed').length
    const extracting = documents.find((d) => d.status === 'extracting')

    // Use elapsed time to drive fraction — exponential-decay curve so progress
    // moves quickly at first then gracefully slows, never stalling at a fixed %.
    // f(t) = 1 − e^(−1.5 × t/MAX) gives ~53% at 2 min, ~78% at 4 min, caps at 0.90.
    let currentFraction = 0
    const elapsedMs = extracting ? extractionElapsedMs : 0
    if (extracting) {
      const timeFraction = 1 - Math.exp((-1.5 * elapsedMs) / MAX_EXTRACTION_MS)
      currentFraction = Math.min(timeFraction, 0.90)
    }

    const percent = Math.min(
      100,
      Math.round(((terminal + currentFraction) / documents.length) * 100)
    )
    const currentIndex = terminal + (extracting ? 1 : 0)
    const timePercent = Math.round(currentFraction * 100)

    let label = `Completed ${terminal} of ${documents.length}`
    if (extracting) {
      const phaseLabel =
        EXTRACT_PHASE_LABELS[extracting.extractPhase] || 'Extracting document'
      const elapsed = formatExtractElapsed(elapsedMs)
      label = `${phaseLabel} · ${elapsed} (doc ${currentIndex}/${documents.length})`
    } else if (isProcessing || upload.isPending) {
      label = `Processing ${terminal} of ${documents.length}…`
    }

    return { percent, label, currentIndex, total: documents.length, timePercent, percentLabel: timePercent > 0 ? `${timePercent}%` : null }
  }, [documents, isProcessing, upload.isPending, extractionElapsedMs])

  useEffect(() => {
    if (availableTypes.length && !availableTypes.some((t) => t.value === documentType)) {
      setDocumentType(availableTypes[0].value)
    }
  }, [availableTypes, documentType])

  const goToInvoiceDetail = async (result, file) => {
    if (!isOcrPreviewDocumentType(result.documentType)) return
    const mapped = mapOcrToInvoiceDetail(result)
    const { detail, id } = await prepareUploadInvoiceDetail(mapped, {
      fileName: result.fileName || file?.name
    })
    if (!detail || !id) return
    navigate(buildInvoiceDetailPath(userType, id), {
      state: {
        ocrInvoice: detail,
        uploadedFile: file
      }
    })
  }

  const goToCombinedInvoiceDetail = async (batchDocuments = documents) => {
    const topLevelValidation =
      batchDocuments.find((doc) => doc.topLevelValidation)?.topLevelValidation ?? null
    const classification =
      batchDocuments.find((doc) => doc.classification)?.classification ?? null
    const poExtractFields =
      batchDocuments.find((doc) => doc.po_extract_fields)?.po_extract_fields ?? null
    const fieldSchemas =
      batchDocuments.find((doc) => doc.extract_field_schemas)?.extract_field_schemas ?? null
    const merged = mapBatchOcrToInvoiceDetail(batchDocuments, {
      topLevelValidation,
      classification,
      poExtractFields,
      fieldSchemas,
      splitSections:
        batchDocuments.find((doc) => doc.splitSections)?.splitSections || []
    })
    if (!merged) return false

    const storedPdfs = batchDocuments.find((doc) => doc.extract_doc_pdfs)?.extract_doc_pdfs
    const mergedWithPdfs = storedPdfs
      ? {
          ...merged,
          extract_doc_pdfs: { ...(merged.extract_doc_pdfs || {}), ...storedPdfs }
        }
      : merged

    const withSes = await enrichInvoiceWithBackendSes(mergedWithPdfs)

    const primaryDoc =
      batchDocuments.find((d) => d.status === 'done' && d.documentType === 'invoice') ||
      batchDocuments.find((d) => d.status === 'done')

    const { detail, id } = await prepareUploadInvoiceDetail(withSes, {
      fileName: primaryDoc?.file?.name || withSes.file_name
    })
    if (!detail || !id) return false

    navigate(buildInvoiceDetailPath(userType, id), {
      state: {
        ocrInvoice: detail,
        uploadedFile: primaryDoc?.file
      }
    })
    return true
  }

  useEffect(() => {
    if (userType && !location.pathname.startsWith(`/${userType}/`)) {
      navigate(uploadPath, { replace: true })
    }
  }, [userType, location.pathname, navigate, uploadPath])

  const addFileToStaging = (fileList) => {
    setLastError(null)
    if (!fileList?.length) return

    const files = Array.from(fileList).filter((f) => ACCEPTED_FILE_PATTERN.test(f.name))
    if (!files.length) {
      setLastError(`No supported files found. Upload ${ACCEPTED_FILE_TYPES_LABEL}.`)
      return
    }

    if (files.length > 1) {
      setLastError('Add one file at a time. Select a document type, then upload a single file.')
      return
    }

    const file = files[0]

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLastError(`${file.name} exceeds ${MAX_FILE_SIZE_MB} MB limit.`)
      return
    }

    if (usedTypes.has(documentType)) {
      setLastError(`${getTypeLabel(documentType)} is already in your batch. Remove it first or pick another type.`)
      return
    }

    setDocuments((prev) => [
      ...prev,
      {
        file,
        documentType,
        status: 'staged',
      },
    ])
  }

  const removeDocument = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setDocuments([])
    setLastError(null)
    setDuplicateDialog({ open: false, invoiceNumber: '', fileName: '' })
    setMissingDocsDialog({ open: false, missing: [], fileName: '', message: '' })
  }

  const closeDuplicateDialog = () => {
    setDuplicateDialog({ open: false, invoiceNumber: '', fileName: '' })
  }

  const closeMissingDocsDialog = () => {
    setMissingDocsDialog({ open: false, missing: [], fileName: '', message: '' })
  }

  const handleProcessAll = async () => {
    setLastError(null)
    closeDuplicateDialog()
    closeMissingDocsDialog()
    const pending = documents
      .map((doc, index) => ({ doc, index }))
      .filter(({ doc }) => doc.status === 'staged')

    if (!pending.length) return

    setIsProcessing(true)
    let workingDocs = documents
    let blockedByDuplicate = false

    for (const { doc, index } of pending) {
      const patchProgress = (patch) => {
        setDocuments((prev) => updateAt(prev, index, patch))
      }

      patchProgress({ status: 'extracting', extractProgress: 0 })

      try {
        const res = await upload.mutateAsync({
          file: doc.file,
          documentType: doc.documentType,
          invoiceWorkflow,
          onProgress: (progressInfo) => {
            const progress =
              typeof progressInfo === 'number' ? progressInfo : progressInfo?.progress
            const extractPhase =
              typeof progressInfo === 'object' ? progressInfo?.phase : null
            const extractTraceId =
              typeof progressInfo === 'object' ? progressInfo?.traceId : null
            patchProgress({
              status: 'extracting',
              extractProgress: progress,
              extractPhase,
              extractTraceId
            })
          }
        })

        if (res.isClassifiedBatch && res.batchDocuments?.length) {
          const classifiedDocs = res.batchDocuments.map((batchDoc, batchIndex) => ({
            ...batchDoc,
            file: doc.file,
            topLevelValidation: res.topLevelValidation ?? batchDoc.topLevelValidation ?? null,
            classification: res.classification ?? batchDoc.classification ?? null,
            po_extract_fields: res.merged?.po_extract_fields ?? batchDoc.po_extract_fields ?? null,
            extract_field_schemas:
              res.merged?.extract_field_schemas ?? batchDoc.extract_field_schemas ?? null,
            ...(batchIndex === 0
              ? {
                  extract_doc_pdfs: res.merged?.extract_doc_pdfs || null,
                  splitSections: res.splitSections || []
                }
              : {})
          }))
          workingDocs = [
            ...workingDocs.slice(0, index),
            ...classifiedDocs,
            ...workingDocs.slice(index + 1)
          ]
        } else {
          workingDocs = updateAt(workingDocs, index, {
            status: 'done',
            extractProgress: 100,
            id: res.id,
            documentId: res.documentId,
            documentType: res.documentType,
            invoice_no: res.extracted?.invoice_no,
            vendor_name: res.extracted?.vendor_name,
            po_number: res.extracted?.po_number,
            total_amount: res.extracted?.total_amount,
            currency: res.extracted?.currency,
            overall: res.validation?.overall,
            confidence: res.validation?.confidence,
            validation: res.validation,
            ocr: res.ocr,
            validation_extraction: res.validation_extraction,
          })
        }
        setDocuments(workingDocs)
      } catch (e) {
        const duplicate = parseDuplicateInvoiceExtractError(e)
        if (duplicate) {
          blockedByDuplicate = true
          setDuplicateDialog({
            open: true,
            invoiceNumber: duplicate.invoiceNumber,
            fileName: doc.file.name
          })
          setLastError(`${doc.file.name}: ${duplicate.message}`)
          workingDocs = updateAt(workingDocs, index, {
            status: 'failed',
            error: duplicate.message,
            extractProgress: 0
          })
          setDocuments(workingDocs)
          continue
        }

        const missingRequired = parseMissingMandatoryExtractError(e)
        if (missingRequired) {
          setMissingDocsDialog({
            open: true,
            missing: missingRequired.missing,
            fileName: doc.file.name,
            message: missingRequired.message
          })
          showEssaErrorToast('Required documents missing', missingRequired.message)
          setLastError(`${doc.file.name}: ${missingRequired.message}`)
          workingDocs = updateAt(workingDocs, index, {
            status: 'failed',
            error: missingRequired.message,
            extractProgress: 0
          })
          setDocuments(workingDocs)
          continue
        }

        const rawMessage = e?.response?.data?.message || e.message
        const isTimeout =
          e?.code === 'ECONNABORTED' || /timeout/i.test(String(rawMessage || ''))
        const message = isTimeout
          ? 'Extraction timed out. Ensure vp-be-essa is running and retry — large PO bundles can take several minutes.'
          : rawMessage
        setLastError(`${doc.file.name}: ${message}`)
        workingDocs = updateAt(workingDocs, index, { status: 'failed', error: message, extractProgress: 0 })
        setDocuments(workingDocs)
      }
    }

    setIsProcessing(false)

    const succeeded = workingDocs.filter((d) => d.status === 'done')
    if (succeeded.length > 0 && !blockedByDuplicate) {
      showExtractionSuccessToast(succeeded.length)
      await goToCombinedInvoiceDetail(workingDocs)
    }
  }

  const openResult = async (r) => {
    if (r.status !== 'done') return
    if (canViewInvoiceDetail) {
      await goToCombinedInvoiceDetail()
      return
    }
    if (isOcrPreviewDocumentType(r.documentType) && r.id) {
      await goToInvoiceDetail(
        {
          id: r.id,
          documentType: r.documentType,
          extracted: {
            invoice_no: r.invoice_no,
            vendor_name: r.vendor_name,
            po_number: r.po_number,
            total_amount: r.total_amount,
            currency: r.currency,
          },
          validation: r.validation || { overall: r.overall, confidence: r.confidence },
          documentId: r.documentId ?? r.validation?.documentId,
          ocr: r.ocr,
          validation_extraction: r.validation_extraction,
          fileName: r.file?.name,
        },
        r.file
      )
    }
  }

  return (
    <LeftPageContainer>
      <div className="essa-dashboard">
        <div className="dx-page">
          <div style={{ maxWidth: '100%', margin: '0 auto' }} className="dx-stack">
            <div className="essa-upload-steps-bar">
              <div className="essa-upload-steps">
                <div className={`essa-upload-step ${isStagingPhase ? 'active' : 'done'}`}>
                  <div className="essa-upload-step-num">
                    {isStagingPhase ? '1' : <CheckCircle2 size={14} />}
                  </div>
                  <div>
                    <div className="essa-upload-step-label">Upload documents</div>
                    <div className="essa-upload-step-desc">Pick a type and add each file to your batch</div>
                  </div>
                </div>
                <div className={`essa-upload-step-connector ${hasStartedOcr ? 'done' : ''}`} />
                <div className={`essa-upload-step ${hasStartedOcr ? 'active' : ''} ${doneCount > 0 ? 'done' : ''}`}>
                  <div className="essa-upload-step-num">2</div>
                  <div>
                    <div className="essa-upload-step-label">OCR &amp; validation</div>
                    <div className="essa-upload-step-desc">Run extraction on all staged documents</div>
                  </div>
                </div>
              </div>
              {doneCount > 0 && (
                <Link to={invoicesPath} className="essa-upload-steps-action">
                  <Button variant="ghost" size="sm">
                    View all <ArrowRight size={14} />
                  </Button>
                </Link>
              )}
            </div>

            {SHOW_INVOICE_WORKFLOW_CARD && (
            <Card>
              <CardBody>
                <div
                  className="dx-row"
                  style={{
                    gap: 12,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between'
                  }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--dx-g-800)' }}>
                      Invoice workflow
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--dx-g-500)', marginTop: 2 }}>
                      <strong>Auto</strong> detects PO vs Non-PO after classification.
                      Non-PO uses the Non-PO Prompt Builder; PO always uses{' '}
                      <strong>Manpower Services</strong> Prompt Builder.
                    </div>
                  </div>
                  <div className="dx-row" style={{ gap: 8 }}>
                    <Button
                      variant={invoiceWorkflow === 'AUTO' ? 'primary' : 'ghost'}
                      size="sm"
                      disabled={isProcessing || upload.isPending}
                      onClick={() => setInvoiceWorkflow('AUTO')}>
                      Auto
                    </Button>
                    <Button
                      variant={invoiceWorkflow === 'PO' ? 'primary' : 'ghost'}
                      size="sm"
                      disabled={isProcessing || upload.isPending}
                      onClick={() => setInvoiceWorkflow('PO')}>
                      Force PO
                    </Button>
                    <Button
                      variant={invoiceWorkflow === 'NON_PO' ? 'primary' : 'ghost'}
                      size="sm"
                      disabled={isProcessing || upload.isPending}
                      onClick={() => setInvoiceWorkflow('NON_PO')}>
                      Force Non-PO
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
            )}

            <AnimatePresence>
              {lastError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="dx-row"
                  style={{
                    padding: '12px 16px',
                    border: '1px solid var(--dx-error-100)',
                    background: 'var(--dx-error-50)',
                    color: 'var(--dx-error-700)',
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                >
                  <AlertOctagon size={16} />
                  <span style={{ flex: 1 }}>
                    <strong>Error:</strong> {lastError}
                  </span>
                  <button
                    onClick={() => setLastError(null)}
                    className="dx-icon-btn"
                    style={{ width: 28, height: 28, borderColor: 'var(--dx-error-100)' }}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {isStagingPhase && (
              <Card pad={false}>
                <CardHeader>
                  <Layers size={18} style={{ color: BRAND }} />
                  <CardTitle>Add document</CardTitle>
                </CardHeader>
                <CardBody>

                  <motion.div
                    whileHover={availableTypes.length ? { scale: 1.005 } : undefined}
                    transition={{ duration: 0.18 }}
                    className="dx-dropzone"
                    style={{
                      opacity: availableTypes.length ? 1 : 0.55,
                      cursor: availableTypes.length ? 'pointer' : 'not-allowed',
                    }}
                    onClick={() => availableTypes.length && inputRef.current?.click()}
                    onDragOver={(e) => {
                      if (!availableTypes.length) return
                      e.preventDefault()
                      e.currentTarget.classList.add('drag')
                    }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('drag')
                      if (availableTypes.length) addFileToStaging(e.dataTransfer.files)
                    }}
                  >
                    <CloudUpload size={42} style={{ color: BRAND }} />
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 16,
                        color: 'var(--dx-g-700)',
                        marginTop: 8,
                      }}
                    >
                      {availableTypes.length
                        ? `Upload ${getTypeLabel(documentType)}`
                        : 'All document types have been added'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--dx-g-500)', marginTop: 4 }}>
                      {availableTypes.length ? (
                        <>
                          Drag &amp; drop or{' '}
                          <span style={{ color: BRAND, fontWeight: 500 }}>click to browse</span>
                          &nbsp;· {ACCEPTED_FILE_TYPES_LABEL} · one file per document type
                        </>
                      ) : (
                        'Remove a document from the batch below to add a different type'
                      )}
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept={FILE_INPUT_ACCEPT}
                      hidden
                      onChange={(e) => {
                        addFileToStaging(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </motion.div>
                </CardBody>
              </Card>
            )}

            <Card pad={false} style={{ overflow: 'hidden' }}>
              <CardHeader>
                <FileText size={18} style={{ color: BRAND }} />
                <CardTitle>
                  Document batch
                  {documents.length > 0 && (
                    <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                      · {documents.length} document{documents.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </CardTitle>
                {documents.length > 0 && isStagingPhase && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearAll}
                    style={{ marginLeft: 'auto' }}
                  >
                    <X size={14} /> Clear all
                  </Button>
                )}
              </CardHeader>

              {documents.length === 0 ? (
                <div className="essa-upload-staging-empty">
                  <Layers size={36} />
                  <div style={{ fontWeight: 600, color: 'var(--dx-g-600)', marginBottom: 4 }}>
                    No documents in batch yet
                  </div>
                  <div>
                    Select a document type above and upload a file. Add each unique type you need before
                    running OCR.
                  </div>
                </div>
              ) : (
                <div className="essa-upload-batch-list">
                  <div className="essa-upload-batch-head" aria-hidden>
                    <span>Type</span>
                    <span>File</span>
                    <span>Details</span>
                    <span>Extraction Progress</span>
                    <span>OCR Status</span>
                    <span>Validation</span>
                    <span className="essa-upload-batch-head-actions" />
                  </div>
                  {documents.map((r, i) => {
                    const rowProgress = r.status === 'extracting'
                      ? batchExtractionProgress.timePercent
                      : (r.extractProgress ?? 0)
                    const summary = getBatchRowSummary(r, rowProgress)
                    const validation = getValidationBadge(r)
                    const clickable = r.status === 'done'

                    return (
                      <div key={`${r.documentType}-${r.file.name}`} className="essa-upload-batch-entry">
                        <motion.div
                          className={`essa-upload-batch-item${clickable ? ' essa-upload-batch-item--clickable' : ''}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => openResult(r)}
                          role={clickable ? 'button' : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          onKeyDown={
                            clickable
                              ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') openResult(r)
                              }
                              : undefined
                          }
                        >
                          <span className="essa-upload-type-badge">{getTypeLabel(r.documentType)}</span>
                          <div className="essa-upload-batch-filename" title={r.file.name}>
                            {r.file.name}
                          </div>
                          <div
                            className="essa-upload-batch-filemeta"
                            title={summary?.secondary || undefined}
                          >
                            {(r.file.size / 1024).toFixed(0)} KB
                            {summary?.secondary ? ` · ${summary.secondary}` : ''}
                          </div>
                          <div className="essa-upload-batch-summary">
                            {hasStartedOcr ? (
                              summary?.loading ? (
                                <ExtractionProgressBar
                                  value={batchExtractionProgress.timePercent ?? 0}
                                  label={batchExtractionProgress.percentLabel ?? undefined}
                                />
                              ) : summary?.primary ? (
                                <span
                                  className={
                                    summary.error
                                      ? 'essa-upload-batch-summary-primary essa-upload-batch-summary-primary--error'
                                      : 'essa-upload-batch-summary-primary'
                                  }
                                  title={summary.primary}
                                >
                                  {summary.primary}
                                </span>
                              ) : (
                                <span className="essa-upload-batch-summary-muted">Pending extraction</span>
                              )
                            ) : (
                              <span className="essa-upload-batch-summary-muted">—</span>
                            )}
                          </div>
                          <div className="essa-upload-batch-col essa-upload-batch-col--status">
                            <StageBadge stage={r.status} progress={rowProgress} />
                          </div>
                          <div className="essa-upload-batch-col essa-upload-batch-col--validation">
                            {hasStartedOcr && validation ? (
                              <Badge tone={validation.tone}>{validation.label}</Badge>
                            ) : (
                              <span className="essa-upload-batch-summary-muted">—</span>
                            )}
                          </div>
                          <div className="essa-upload-batch-actions">
                            {isStagingPhase && (
                              <button
                                type="button"
                                className="dx-icon-btn"
                                title="Remove"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeDocument(i)
                                }}
                                style={{ width: 32, height: 32 }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            {clickable && <ArrowRight size={14} className="essa-upload-batch-chevron" />}
                          </div>
                        </motion.div>
                      </div>
                    )
                  })}
                </div>
              )}

              {documents.length > 0 && (
                <div className="essa-upload-footer">
                  <div className="essa-upload-footer-hint">
                    {isStagingPhase ? (
                      <>
                        {stagedCount} document{stagedCount !== 1 ? 's' : ''} ready · add more unique types
                        or click Next to run OCR
                      </>
                    ) : isProcessing || upload.isPending ? (
                      batchExtractionProgress.label || 'Processing documents…'
                    ) : doneCount > 0 ? (
                      <>
                        {doneCount} of {documents.length} processed
                        {documents.some((d) => d.status === 'failed') && ' · some failed'}
                      </>
                    ) : null}
                  </div>
                  <div className="essa-upload-footer-actions">
                    {isStagingPhase ? (
                      <Button
                        onClick={handleProcessAll}
                        disabled={stagedCount === 0}
                      >
                        Next — Run OCR <Play size={14} />
                      </Button>
                    ) : (
                      <>
                        {!isProcessing && !upload.isPending && (
                          <Button variant="ghost" onClick={clearAll}>
                            Start over
                          </Button>
                        )}
                        {stagedCount > 0 && !isProcessing && !upload.isPending && (
                          <Button onClick={handleProcessAll}>
                            Retry failed <Play size={14} />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {canViewInvoiceDetail && (
              <Card className="essa-upload-complete-card">
                <CardBody>
                  <div className="essa-upload-complete-inner">
                    <div className="essa-upload-complete-copy">
                      <CheckCircle2 size={22} style={{ color: 'var(--dx-success-600)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--dx-g-800)' }}>
                          Extraction complete
                        </div>
                        <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                          {doneCount} of {documents.length} document{documents.length !== 1 ? 's' : ''}{' '}
                          processed successfully. Review extracted fields in invoice detail.
                        </div>
                      </div>
                    </div>
                    <Button onClick={goToCombinedInvoiceDetail}>
                      View invoice detail <ArrowRight size={14} />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={duplicateDialog.open}
        onClose={closeDuplicateDialog}
        title="Invoice already exists"
        description="This upload cannot be processed because the invoice number was found in a previous extraction."
        width={480}
        footer={
          <Button variant="primary" onClick={closeDuplicateDialog}>
            OK
          </Button>
        }
      >
        <div className="dx-stack" style={{ gap: 12, fontSize: 14, color: 'var(--dx-g-700)' }}>
          {duplicateDialog.fileName ? (
            <p style={{ margin: 0 }}>
              <strong>File:</strong> {duplicateDialog.fileName}
            </p>
          ) : null}
          <p style={{ margin: 0 }}>
            <strong>Invoice number:</strong> {duplicateDialog.invoiceNumber || '—'}
          </p>
          <p style={{ margin: 0 }}>
            An invoice with this number is already stored in the system. Please verify the document
            or contact AP if you believe this is an error.
          </p>
        </div>
      </Dialog>

      <Dialog
        open={missingDocsDialog.open}
        onClose={closeMissingDocsDialog}
        title="Required documents missing"
        description="Extraction was stopped because one or more required documents were not found in the upload."
        width={520}
        footer={
          <Button variant="primary" onClick={closeMissingDocsDialog}>
            OK
          </Button>
        }
      >
        <div className="dx-stack" style={{ gap: 12, fontSize: 14, color: 'var(--dx-g-700)' }}>
          {missingDocsDialog.fileName ? (
            <p style={{ margin: 0 }}>
              <strong>File:</strong> {missingDocsDialog.fileName}
            </p>
          ) : null}
          {missingDocsDialog.missing?.length ? (
            <div>
              <p style={{ margin: '0 0 8px' }}>
                <strong>Missing required documents:</strong>
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {missingDocsDialog.missing.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p style={{ margin: 0 }}>{missingDocsDialog.message}</p>
          )}
          <p style={{ margin: 0 }}>
            Add the missing document(s) to the bundle and upload again. Extraction will not
            continue until every required document is present.
          </p>
        </div>
      </Dialog>
    </LeftPageContainer>
  )
}

function ExtractionProgressBar({ value = 0, label, size = 'sm' }) {
  const percent = Math.min(100, Math.max(0, Number(value) || 0))
  const displayLabel = label ?? `${percent}%`

  return (
    <div
      className={`essa-extract-progress essa-extract-progress--${size}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={displayLabel}
    >
      <div className="essa-extract-progress__track">
        <div className="essa-extract-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="essa-extract-progress__label">{displayLabel}</div>
    </div>
  )
}

function StageBadge({ stage }) {
  const map = {
    staged: { tone: 'skip', label: 'Staged' },
    extracting: { tone: 'warn', label: 'Extracting…' },
    done: { tone: 'approved', label: 'Done' },
    failed: { tone: 'fail', label: 'Failed' },
  }
  const { tone, label } = map[stage] || map.staged
  return <Badge tone={tone}>{label}</Badge>
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo || {},
})

export default connect(mapStateToProps)(EssaUploadInvoice)
