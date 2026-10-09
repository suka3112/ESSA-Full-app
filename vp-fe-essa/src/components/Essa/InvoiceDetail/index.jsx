import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ShieldCheck,
  FileSpreadsheet,
  Pencil,
  Save,
  X,
  Calendar,
  FileText,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
  GitCompareArrows
} from 'lucide-react'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import PdfViewer from '../PdfViewer'
import ApprovalChain from '../ApprovalChain'
import InvoiceTimeline from '../InvoiceTimeline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { Tabs } from '../ui/Tabs'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { useEssaInvoice } from 'hooks/useEssaInvoice'
import { usePoBasedInvoice } from 'hooks/usePoBasedInvoice'
import { useEssaApproveInvoice } from 'hooks/useEssaInvoiceMutations'
import { useEssaMyWork } from 'hooks/useEssaMyWork'
import {
  fmtMoney,
  fmtDateOnly,
  getEssaInvoiceExportUrl,
  getEssaInvoiceFile,
  formatInvoiceCategoryLabel
} from 'api/essaDashboard'
import { correctEssaInvoiceFields } from 'api/essaAudit'
import { isPersistedOcrUploadId } from 'api/apInvoiceOcr'
import { deleteUploadedInvoice, isDemoUploadId, applyDemoInvoiceApproval, isDemoInvoiceId } from 'api/essaUploadedInvoices'
import { isEssaDemoDeleteEnabled } from 'config/essaDemoConfig'
import {
  showEssaSuccessToast,
  showEssaErrorToast,
  showInvoiceApprovedToast,
  showInvoiceParkedToast,
  showInvoiceRejectedToast,
  showInvoiceReturnedToast
} from '../lib/essaToast'
import SlaInvoiceClocks from '../Sla/SlaInvoiceClocks'
import { INVOICES, UPLOAD_INVOICE, PROMPT_CONFIG } from 'constants/url'
import { ADMIN_USER_TYPE } from 'constants/userType'
import {
  resolvePoApprovals,
  advanceApprovalChain,
  isNonPoInvoiceWorkflow
} from '../lib/poApprovalChain'
import { resolveNextAction, resolveWorkflowStage } from '../lib/invoiceWorkflowStatus'
import { formatNonPoDoaFlow } from '../lib/nonPoDoaApproval'
import {
  resolveDefaultExtractPdfSrc,
  resolveExtractDocPdfUrl
} from '../lib/extractDocPdfs'
import {
  getExtractedCellDisplay,
  countSectionFields,
  sectionHasPresentableContent,
  formatExtractLineCell,
  fieldToEditableString,
  lineItemCellToEditableString,
  extractCellPlaceholder
} from '../lib/extractValidateSections'
import {
  buildConfigDrivenExtractSections,
  resolvePromptConfigTypeCode
} from '../lib/configDrivenExtractSections'
import { fetchInvoiceTypePromptConfigByCode } from 'api/extractionPromptConfig'
import { TimesheetManpowerPanels, hydrateTimesheetRow } from '../lib/TimesheetManpowerPanels'
import { formatDynamicExtractCell } from '../lib/extractTables'
import { PoValidationPanel } from '../lib/poValidationPanel'
import NWayValidationPanel, { NWayViewToggle } from './NWayValidationPanel'
import { formatChecklistPassBadgeText, getChecklistPassSummary } from '../lib/validationRuleCatalog'
import {
  isNonPoInvoice,
  buildNonPoValidationState
} from '../lib/nonPoInvoiceDetail'
import {
  OCR_LINE_ITEM_COLUMNS,
  buildValidationState,
  buildValidationMapOptions,
  validateApDocument,
  canRunBundleValidation,
  augmentRateValidationCheck,
  augmentPoValueValidationCheck,
  normalizeClassifiedInvoice,
  resolveCommercialInvoiceSummary,
  resolveDemoScenario,
  enrichInvoiceWithBackendSes,
  fetchSesDocumentFile,
  fetchOcrSectionFile,
  rewriteOcrSectionPdfUrl
} from 'api/apInvoiceOcr'
import '../../../assets/scss/essa/dashboard.scss'

/** Set false to hide the PDF side panel and "View document" topbar button. */
const INVOICE_DOCUMENT_PREVIEW_ENABLED = true

const idPanelStyle = {
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 2px 0 rgb(16 24 40 / 0.05)'
}

/** Demo invoices that should not show the Approval tab. */
const APPROVAL_TAB_HIDDEN_INVOICE_NOS = new Set(['501/PT.ALE-PAU/07/2026'])

function shouldHideApprovalTab(inv) {
  if (!inv) return false
  const invoiceNo = String(inv?.invoice_no || '').trim()
  if (APPROVAL_TAB_HIDDEN_INVOICE_NOS.has(invoiceNo)) return true

  // PO / manpower invoices — approval not shown; non-PO keeps DoA approval tab.
  return !isNonPoInvoice(inv)
}

const STAGE_LIST_LABEL = {
  draft: 'Draft',
  validated: 'Validated',
  parked: 'Parked',
  posted: 'Posted',
  paid: 'Paid',
  rejected: 'Rejected',
  review: 'In review'
}

const STAGE_PILL_TONE = {
  draft: 'draft',
  validated: 'info',
  parked: 'warning',
  posted: 'success',
  paid: 'success',
  rejected: 'error',
  review: 'pending'
}

function DetailStatusPill({ label, tone = 'neutral' }) {
  return <span className={`dx-id-pill dx-id-pill--${tone}`}>{label}</span>
}

function DetailTopbar({
  backTo,
  backLabel,
  title,
  exportUrl,
  showDoc,
  onToggleDoc,
  actions,
  inv
}) {
  const stage = inv ? resolveWorkflowStage(inv) : null
  const next = inv ? resolveNextAction(inv) : null

  return (
    <header className="dx-topbar">
      <div className="dx-topbar-left">
        <Link to={backTo} className="dx-back-chip">
          <ArrowLeft size={14} />
          <span>{backLabel}</span>
        </Link>
        <h1 className="dx-topbar-title">{title}</h1>
        {stage && next && (
          <span className="dx-id-status">
            <span className="dx-id-status-kicker">Current</span>
            <DetailStatusPill
              label={STAGE_LIST_LABEL[stage.key] || stage.shortLabel || stage.label}
              tone={STAGE_PILL_TONE[stage.key] || 'neutral'}
            />
            <ArrowRight size={12} className="dx-id-status-arrow" aria-hidden />
            <span className="dx-id-status-kicker">Next</span>
            <DetailStatusPill label={next.label} tone="neutral" />
          </span>
        )}
      </div>
      <div className="dx-topbar-right">
        {actions}
        {onToggleDoc && (
          <Button
            variant="secondary"
            size="sm"
            className="dx-id-btn"
            onClick={onToggleDoc}
            title={showDoc ? 'Hide document preview' : 'View document preview'}
          >
            {showDoc ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            {showDoc ? 'Hide document' : 'View document'}
          </Button>
        )}
        {exportUrl && (
          <a href={exportUrl}>
            <Button variant="secondary" size="sm" className="dx-id-btn">
              <FileSpreadsheet size={14} /> Export
            </Button>
          </a>
        )}
      </div>
    </header>
  )
}

function mergeSavedExtractFields(invoice, sectionKey, fields = {}) {
  if (!invoice || !sectionKey) return invoice
  const next = { ...invoice }
  const present = (value) => value != null && String(value).trim() !== ''

  const setSection = (key, patch) => {
    if (!Object.keys(patch).length) return
    const extraction = { ...(next.validation_extraction || {}) }
    const sections = { ...(extraction.sections || {}) }
    sections[key] = { ...(sections[key] || {}), ...patch }
    next.validation_extraction = { ...extraction, sections }
  }

  const setOcrHeader = (docType, patch) => {
    if (!Object.keys(patch).length) return
    const ocrByType = { ...(next.ocr_by_type || {}) }
    const doc = { ...(ocrByType[docType] || {}) }
    doc.header = { ...(doc.header || {}), ...patch }
    ocrByType[docType] = doc
    next.ocr_by_type = ocrByType
  }

  if (sectionKey === 'B_taxInvoice') {
    const meta = { ...(next.tax_invoice_meta || {}) }
    const sectionPatch = {}
    const headerPatch = {}
    if (present(fields.date)) {
      meta.date = fields.date
      sectionPatch.date = fields.date
      headerPatch.invoiceDate = fields.date
      headerPatch.date = fields.date
    }
    if (present(fields.taxInvoiceNumber)) {
      meta.taxInvoiceNumber = fields.taxInvoiceNumber
      sectionPatch.taxInvoiceNumber = fields.taxInvoiceNumber
      headerPatch.taxInvoiceNumber = fields.taxInvoiceNumber
    }
    if (present(fields.taxVatAmount)) {
      meta.vatAmount = fields.taxVatAmount
      sectionPatch.vatAmount = fields.taxVatAmount
      headerPatch.taxAmount = fields.taxVatAmount
    }
    next.tax_invoice_meta = meta
    setSection('B_taxInvoice', sectionPatch)
    setOcrHeader('tax_invoice', headerPatch)
  }

  if (sectionKey === 'A_invoice') {
    const sectionPatch = {}
    const headerPatch = {}
    if (present(fields.date)) {
      sectionPatch.date = fields.date
      headerPatch.invoiceDate = fields.date
      headerPatch.date = fields.date
      next.invoice_date = fields.date
    }
    if (present(fields.invoiceNo)) {
      sectionPatch.invoiceNo = fields.invoiceNo
      headerPatch.invoiceNumber = fields.invoiceNo
      next.invoice_no = fields.invoiceNo
    }
    if (present(fields.vendorName)) {
      sectionPatch.vendorName = fields.vendorName
      headerPatch.vendorName = fields.vendorName
      next.vendor_name = fields.vendorName
    }
    if (present(fields.poNumber)) {
      sectionPatch.poNumber = fields.poNumber
      headerPatch.poNumber = fields.poNumber
      next.po_number = fields.poNumber
    }
    setSection('A_invoice', sectionPatch)
    setOcrHeader('invoice', headerPatch)
  }

  return next
}

function resolvePoDetailId(rawId) {
  const id = String(rawId || '')
  if (!id || id.startsWith('ocr-')) return null
  if (id.startsWith('po-')) return id
  if (/^\d+$/.test(id)) return `po-${id}`
  return null
}

function EssaInvoiceDetail({ userInfo: { userType } }) {
  const { id } = useParams()
  const location = useLocation()
  const poDetailId = resolvePoDetailId(id)
  const isPoInvoice = Boolean(poDetailId)
  const isOcrPreview = String(id || '').startsWith('ocr-')
  const hasOcrNavigationState = Boolean(location.state?.ocrInvoice)
  const uploadedFile = location.state?.uploadedFile
  const ocrPreview = useMemo(() => {
    if (!location.state?.ocrInvoice) return null
    const normalized = normalizeClassifiedInvoice(location.state.ocrInvoice)
    if (isOcrPreview) return normalized
    if (isDemoUploadId(id)) return normalized
    return null
  }, [isOcrPreview, id, location.state?.ocrInvoice])
  const navigate = useNavigate()
  const { data: myWork } = useEssaMyWork()
  const role = myWork?.role || 'admin'
  const shouldFetchEssaInvoice = !isPoInvoice && !(isOcrPreview && hasOcrNavigationState)
  const { data: essaInv, isLoading: essaLoading, refetch } = useEssaInvoice(
    shouldFetchEssaInvoice ? id : null
  )
  const { data: poInv, isLoading: poLoading } = usePoBasedInvoice(poDetailId)
  const [enrichedInv, setEnrichedInv] = useState(null)
  const inv = isPoInvoice ? poInv : (ocrPreview || essaInv)
  const displayInv = enrichedInv || inv
  const isLoading = isPoInvoice
    ? poLoading
    : isOcrPreview && hasOcrNavigationState
      ? false
      : essaLoading
  const approve = useEssaApproveInvoice(isPoInvoice ? null : id, refetch)

  const [tab, setTab] = useState('extract-validate')
  const [pdfSrc, setPdfSrc] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [extractDocTab, setExtractDocTab] = useState('')
  const [extractTabPdfSrc, setExtractTabPdfSrc] = useState(null)
  const [approvalChain, setApprovalChain] = useState([])
  const [validationState, setValidationState] = useState(null)
  const [revalidating, setRevalidating] = useState(false)
  const [extractCorrections, setExtractCorrections] = useState({})
  const [timelineEvents, setTimelineEvents] = useState([])
  const [savingCorrections, setSavingCorrections] = useState(false)
  const [showDoc, setShowDoc] = usePersistentBool('essa.invoiceDetail.showDoc', true)

  useEffect(() => {
    setExtractDocTab('')
    setExtractCorrections({})
  }, [id])

  useEffect(() => {
    setTimelineEvents(Array.isArray(inv?.timeline) ? inv.timeline : [])
  }, [inv?.id, inv?.timeline])

  const invoicesPath = `/${userType}${INVOICES}`
  const isAdmin = userType === ADMIN_USER_TYPE
  const uploadPath = `/${userType}${UPLOAD_INVOICE}`
  const isDemoUpload = isDemoUploadId(id)

  const handleDeleteDemoUpload = () => {
    if (!id || !deleteUploadedInvoice(id)) return
    showEssaSuccessToast(
      'Demo invoice removed',
      inv?.invoice_no
        ? `${inv.invoice_no} was removed. You can upload the same file again.`
        : 'You can upload the same file again.'
    )
    navigate(invoicesPath)
  }

  useEffect(() => {
    let cancelled = false
    if (!inv || isPoInvoice) {
      setEnrichedInv(null)
      return undefined
    }
    if (inv.backend_ses?.sesNo) {
      setEnrichedInv(inv)
      return undefined
    }
    enrichInvoiceWithBackendSes(inv).then((next) => {
      if (!cancelled) setEnrichedInv(next)
    })
    return () => {
      cancelled = true
    }
  }, [inv, isPoInvoice])

  const hideApprovalTab = shouldHideApprovalTab(displayInv)

  useEffect(() => {
    if (hideApprovalTab && tab === 'approve') {
      setTab('extract-validate')
    }
  }, [hideApprovalTab, tab])

  useEffect(() => {
    if (inv) {
      setApprovalChain(resolvePoApprovals(inv))
    } else {
      setApprovalChain([])
    }
  }, [inv?.id, inv?.status, inv?.approvals])

  useEffect(() => {
    setValidationState(null)
  }, [inv?.id])

  const isNonPo = Boolean(displayInv) && isNonPoInvoice(displayInv)
  const nonPoValidation = isNonPo ? buildNonPoValidationState(displayInv) : null
  const validation = validationState ||
    (isNonPo
      ? {
        ...(displayInv?.validation || {}),
        ...nonPoValidation
      }
      : displayInv?.validation || { checks: [] })
  const documentId = validation.documentId || displayInv?.validation?.documentId || displayInv?.ocr?.documentId
  const hasExtractDocTab = tab === 'extract-validate' && Boolean(extractDocTab)
  const viewerPdfSrc = hasExtractDocTab
    ? extractTabPdfSrc ||
      resolveExtractDocPdfUrl(displayInv, extractDocTab) ||
      pdfSrc
    : pdfSrc
  const hasDocument = Boolean(viewerPdfSrc)
  const showPdfPanel = hasDocument || hasExtractDocTab

  useEffect(() => {
    if (!INVOICE_DOCUMENT_PREVIEW_ENABLED) return
    if (hasExtractDocTab) {
      setShowDoc(true)
      return
    }
    if (!hasDocument && !pdfLoading) {
      setShowDoc(false)
    } else if (hasDocument) {
      setShowDoc(true)
    }
  }, [displayInv?.id, hasDocument, hasExtractDocTab, pdfLoading, setShowDoc])

  useEffect(() => {
    if (!hasExtractDocTab || !displayInv) {
      setExtractTabPdfSrc(null)
      return undefined
    }

    const url = resolveExtractDocPdfUrl(displayInv, extractDocTab)
    if (!url) {
      setExtractTabPdfSrc(uploadedFile instanceof Blob ? uploadedFile : null)
      return undefined
    }

    const sesNo = displayInv.backend_ses?.sesNo || displayInv.ses_no
    const isBackendSes =
      extractDocTab === 'K_ses' && url.includes('/ses-documents/') && sesNo

    const proxied = rewriteOcrSectionPdfUrl(url)
    const shouldFetchBlob =
      isBackendSes ||
      (typeof proxied === 'string' && proxied.startsWith('/ap-invoice-ocr/ocr-uploads/'))

    if (!shouldFetchBlob) {
      setExtractTabPdfSrc(url)
      return undefined
    }

    let cancelled = false
    let objectUrl = null
    const fetchBlob = isBackendSes
      ? fetchSesDocumentFile(sesNo)
      : fetchOcrSectionFile(proxied)

    fetchBlob
      .then((blob) => {
        if (cancelled) return
        if (!blob) {
          setExtractTabPdfSrc(uploadedFile instanceof Blob ? uploadedFile : null)
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setExtractTabPdfSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) {
          setExtractTabPdfSrc(uploadedFile instanceof Blob ? uploadedFile : null)
        }
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [
    hasExtractDocTab,
    extractDocTab,
    displayInv?.id,
    displayInv?.backend_ses?.sesNo,
    displayInv?.extract_doc_pdfs,
    uploadedFile
  ])

  useEffect(() => {
    if (!INVOICE_DOCUMENT_PREVIEW_ENABLED) {
      setPdfSrc(null)
      setPdfLoading(false)
      return undefined
    }

    if (!inv) {
      setPdfSrc(null)
      setPdfLoading(false)
      return undefined
    }

    if (isOcrPreview) {
      setPdfSrc(resolveDefaultExtractPdfSrc(inv, { uploadedFile }))
      setPdfLoading(false)
      return undefined
    }

    if (uploadedFile instanceof Blob) {
      setPdfSrc(uploadedFile)
      setPdfLoading(false)
      return undefined
    }

    if (inv.source === 'po') {
      setPdfSrc(inv.invoice_file_url || null)
      setPdfLoading(false)
      return undefined
    }

    if (!id) {
      setPdfLoading(false)
      return undefined
    }

    let cancelled = false
    let objectUrl = null
    setPdfSrc(null)
    setPdfLoading(true)

    getEssaInvoiceFile(id)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPdfSrc(objectUrl)
      })
      .catch(() => {
        if (cancelled) return
        setPdfSrc(null)
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false)
      })

    return () => {
      cancelled = true
      setPdfLoading(false)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [
    id,
    isOcrPreview,
    uploadedFile,
    inv?.id,
    inv?.source,
    inv?.invoice_file_url,
    inv?.file_name,
    inv?.fileName,
    inv?.extract_doc_pdfs
  ])

  if (isLoading) {
    return (
      <LeftPageContainer>
        <div className="essa-dashboard">
          <header className="dx-topbar">
            <div className="dx-topbar-left">
              <Skeleton style={{ width: 100, height: 32, borderRadius: 10 }} />
              <Skeleton style={{ width: 160, height: 24 }} />
            </div>
          </header>
          <div className="dx-page dx-page--after-topbar dx-stack">
            <Skeleton style={{ height: 70, width: '100%' }} />
            <div className="dx-grid-5-7">
              <Skeleton style={{ height: 760, width: '100%' }} />
              <Skeleton style={{ height: 760, width: '100%' }} />
            </div>
          </div>
        </div>
      </LeftPageContainer>
    )
  }

  if (!inv) {
    return (
      <LeftPageContainer>
        <div className="essa-dashboard">
          <div className="dx-page dx-stack">
            <Card style={{ padding: 24 }}>
              <p style={{ margin: 0, color: 'var(--dx-text-soft)' }}>
                This invoice could not be loaded. It may have been removed or you may not have access.
              </p>
              <Button variant="primary" size="sm" style={{ marginTop: 16 }} onClick={() => navigate(invoicesPath)}>
                Back to invoices
              </Button>
            </Card>
          </div>
        </div>
      </LeftPageContainer>
    )
  }

  const derived = {
    po_category: validation.po_category || inv.po_category,
    ld_pct: validation.ld_pct || inv.ld_pct || 0,
    ld_amount: validation.ld_amount || inv.ld_amount || 0,
    advance_recovery: validation.advance_recovery || inv.advance_recovery || 0,
    retention_held: validation.retention_held || inv.retention_held || 0,
    net_payable: validation.net_payable || inv.net_payable || 0
  }

  const issueCount = isNonPo
    ? 0
    : (validation.checks || []).filter((c) => c.status !== 'pass' && c.status !== 'na').length

  const workflowStage = resolveWorkflowStage(inv)
  const rejected = workflowStage.key === 'rejected'

  const tabs = [
    {
      value: 'extract-validate',
      label: 'Extract & Validate',
      badge: issueCount > 0 ? issueCount : null
    },
    { value: 'timeline', label: 'Timeline' },
    ...(!hideApprovalTab ? [{ value: 'approve', label: 'Approval' }] : [])
  ]

  const exportUrl = !isPoInvoice && !isOcrPreview ? getEssaInvoiceExportUrl(id) : null
  const nextStep = approvalChain.find((a) => a.status === 'pending')
  const myTurn = role === 'admin' || nextStep?.role === role
  const canActOnApproval = myTurn

  const handleRevalidate = async () => {
    if (isNonPo) {
      setValidationState(buildNonPoValidationState(displayInv || inv))
      return
    }
    if (!documentId && !canRunBundleValidation(inv)) {
      const checks = augmentPoValueValidationCheck(
        augmentRateValidationCheck(validation.checks || inv?.validation?.checks || [], inv),
        inv
      )
      setValidationState({
        ...(inv?.validation || validation),
        checks,
        confidence: validation.confidence ?? inv?.ocr_confidence,
        documentId: documentId ?? null
      })
      return
    }
    setRevalidating(true)
    try {
      const result = await validateApDocument(documentId, inv)
      if (result) {
        setValidationState(
          buildValidationState(result, {
            confidence: validation.confidence ?? inv?.ocr_confidence,
            documentId: documentId ?? null,
            header: inv?.ocr?.header,
            inv,
            ...buildValidationMapOptions(inv, inv?.ocr?.header)
          })
        )
      }
    } finally {
      setRevalidating(false)
    }
  }

  const handleApprovalAction = async (level, decision, note) => {
    const prevChain = approvalChain
    const actingStep = approvalChain.find((s) => s.level === level)
    const isPreparerStep =
      !isNonPo && actingStep?.level === 1 && actingStep?.role === 'ap_team'
    const isFirstDoaStep = isNonPo && actingStep?.level === 1
    const next = advanceApprovalChain(approvalChain, level, decision, note, inv)
    const invNo = inv?.invoice_no

    const showApprovalToast = () => {
      if (decision === 'rejected') {
        if (isPreparerStep) {
          showInvoiceReturnedToast(invNo)
        } else {
          showInvoiceRejectedToast(invNo)
        }
        return
      }
      if (isPreparerStep || isFirstDoaStep) {
        showInvoiceParkedToast(invNo)
      } else {
        showInvoiceApprovedToast(invNo)
      }
    }

    setApprovalChain(next)

    if (isDemoInvoiceId(id)) {
      applyDemoInvoiceApproval(id, inv, next, { level, decision, note })
      refetch()
      showApprovalToast()
      return
    }

    if (!isPoInvoice && !isOcrPreview && id) {
      try {
        await approve.mutateAsync({ level, decision, note })
        showApprovalToast()
      } catch {
        setApprovalChain(prevChain)
        showEssaErrorToast('Action failed', 'Could not save your decision. Please try again.')
      }
      return
    }

    showApprovalToast()
  }

  const docVisible = INVOICE_DOCUMENT_PREVIEW_ENABLED && showDoc && showPdfPanel

  return (
    <LeftPageContainer>
      <div className="essa-dashboard dx-invoice-page">
        <DetailTopbar
          backTo={invoicesPath}
          backLabel="Invoices"
          title={formatInvoiceCategoryLabel(inv)}
          exportUrl={exportUrl}
          showDoc={docVisible}
          inv={inv}
          onToggleDoc={
            INVOICE_DOCUMENT_PREVIEW_ENABLED && showPdfPanel
              ? () => setShowDoc((v) => !v)
              : undefined
          }
          actions={
            isDemoUpload && isEssaDemoDeleteEnabled() ? (
              <Button variant="danger" size="sm" onClick={handleDeleteDemoUpload}>
                <Trash2 size={14} /> Remove demo
              </Button>
            ) : null
          }
        />

        <div className="dx-page dx-page--after-topbar dx-invoice-page-body">
          <HeroStrip inv={inv} />

          {rejected && (
            <div className="dx-id-reject" role="status">
              <AlertTriangle size={15} className="dx-id-reject-icon" aria-hidden />
              <span>
                <span className="dx-id-reject-title">This invoice was rejected.</span> It stays in
                the system until corrected documents are received. When the vendor sends the
                corrected documents they replace the ones on this invoice and processing continues
                here. If the vendor issues a different invoice number, a new invoice record is
                created and this one is closed — the Timeline tab records both sides of that change.
              </span>
            </div>
          )}

          <SlaInvoiceClocks invoice={inv} />

          {(derived.ld_amount > 0 || derived.advance_recovery > 0) && (
            <PayableSummary inv={inv} derived={derived} />
          )}

          <div className={docVisible ? 'dx-id-body dx-id-body--split' : 'dx-id-body'}>
            {docVisible && (
              <div className="dx-id-doc">
                <Card pad={false} className="dx-id-doc-card" style={idPanelStyle}>
                  <PdfViewer
                    src={viewerPdfSrc}
                    fileName={
                      displayInv?.file_name || displayInv?.fileName || inv?.file_name || 'Invoice.pdf'
                    }
                  />
                </Card>
              </div>
            )}

            <Card className="dx-doc-main dx-id-panel" style={idPanelStyle}>
              <div className="dx-id-tabbar">
                <Tabs
                  tabs={tabs}
                  value={tab}
                  onChange={setTab}
                  actions={
                    <DetailStatusPill
                      label={STAGE_LIST_LABEL[workflowStage.key] || workflowStage.shortLabel}
                      tone={STAGE_PILL_TONE[workflowStage.key] || 'neutral'}
                    />
                  }
                />
              </div>
              <div className="dx-id-tab-body">
                {tab === 'extract-validate' && (
                  <ExtractValidateTab
                    key={displayInv?.id || id}
                    inv={displayInv}
                    isNonPo={isNonPo}
                    checks={validation.checks || []}
                    validation={validation}
                    canEditExtract={!isPoInvoice}
                    extractCorrections={extractCorrections}
                    savingCorrections={savingCorrections}
                    onSaveExtractCorrections={async (sectionKey, payload) => {
                      const reasonRemarks = String(payload?.reasonRemarks || '').trim()
                      if (!reasonRemarks) {
                        showEssaErrorToast(
                          'Reason required',
                          'Enter a reason for this correction before saving.'
                        )
                        throw new Error('reason_remarks required')
                      }

                      setExtractCorrections((prev) => ({ ...prev, [sectionKey]: payload }))

                      if (isPersistedOcrUploadId(id) || isPersistedOcrUploadId(displayInv?.id)) {
                        setSavingCorrections(true)
                        try {
                          const fields = payload.fields || {}
                          const result = await correctEssaInvoiceFields(id || displayInv.id, {
                            reasonRemarks,
                            fields,
                            sectionKey,
                            source: 'PORTAL'
                          })
                          setEnrichedInv(
                            mergeSavedExtractFields(displayInv || inv, sectionKey, fields)
                          )
                          const hint = result?.timeline_hint
                          if (hint) {
                            setTimelineEvents((prev) => [
                              {
                                id: `manual-correction-${Date.now()}`,
                                event_type: hint.event_type || 'manual_correction',
                                created_at: new Date().toISOString(),
                                actor_name: hint.actor_name,
                                actor_role: hint.actor_role,
                                message: hint.message || reasonRemarks
                              },
                              ...(prev || [])
                            ])
                          }
                          showEssaSuccessToast(
                            'Correction saved',
                            'Field changes were recorded in the audit log.'
                          )
                        } catch (err) {
                          showEssaErrorToast(
                            'Correction failed',
                            err?.response?.data?.message || err?.message || 'Could not save corrections.'
                          )
                          throw err
                        } finally {
                          setSavingCorrections(false)
                        }
                      } else {
                        setTimelineEvents((prev) => [
                          {
                            id: `manual-correction-${Date.now()}`,
                            event_type: 'manual_correction',
                            created_at: new Date().toISOString(),
                            actor_name: 'You',
                            actor_role: 'ap_user',
                            message: reasonRemarks
                          },
                          ...(prev || [])
                        ])
                        showEssaSuccessToast(
                          'Correction applied locally',
                          'Demo invoices keep corrections in this session only.'
                        )
                      }
                    }}
                    onRevalidate={inv ? handleRevalidate : null}
                    revalidating={revalidating}
                    uploadHref={isAdmin && !isPoInvoice ? uploadPath : null}
                    onDocTabChange={setExtractDocTab}
                  />
                )}
                {tab === 'approve' && !hideApprovalTab && (
                  <ApprovalTab
                    chain={approvalChain}
                    invoice={inv}
                    canAct={canActOnApproval}
                    onAction={handleApprovalAction}
                  />
                )}
                {tab === 'timeline' && (
                  <InvoiceTimeline events={timelineEvents} uploadedAt={inv.uploaded_at} />
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </LeftPageContainer>
  )
}

function HeroLabeledValue({ label, children, className = '' }) {
  return (
    <span className={`dx-invoice-hero-labeled ${className}`.trim()}>
      <span className="dx-invoice-hero-label">{label}</span>
      {children}
    </span>
  )
}

function HeroStrip({ inv }) {
  const nonPo = isNonPoInvoice(inv)
  const commercial = resolveCommercialInvoiceSummary(inv)
  const sectionA = inv?.validation_extraction?.sections?.A_invoice || {}
  const invoiceNo =
    commercial.invoice_no ?? inv.invoice_no ?? sectionA.invoiceNo ?? null
  const vendorName =
    commercial.vendor_name ?? inv.vendor_name ?? sectionA.vendorName ?? null
  const invoiceDate =
    commercial.invoice_date ?? inv.invoice_date ?? sectionA.date ?? null
  const totalAmount =
    commercial.total_amount ??
    inv.total_amount ??
    sectionA.grandTotal ??
    sectionA.totals?.grandTotal ??
    null
  const currency = commercial.currency || inv.currency || sectionA.totals?.currency || 'IDR'
  const channel = String(inv?.source_channel || '').toUpperCase()
  const isEmail = channel === 'EMAIL'
  const isSharePoint = channel === 'SHAREPOINT'
  const sourceLabel = isEmail ? 'Email' : isSharePoint ? 'SharePoint' : 'Upload'
  const sourceTone = isEmail || isSharePoint ? 'info' : 'neutral'

  const slaDue = inv.sla_due || inv.due_date || inv.invoice_due_date || null
  const slaBreached = Boolean(inv.sla_breached || inv.slaBreached)

  return (
    <div className="dx-invoice-hero">
      <div className="dx-invoice-hero-copy">
        <p className="dx-invoice-hero-line">
          <HeroLabeledValue label="Invoice number">
            <span className="dx-invoice-hero-title">{invoiceNo || '—'}</span>
          </HeroLabeledValue>
          <span className="dx-invoice-hero-dot" aria-hidden>
            ·
          </span>
          <HeroLabeledValue label="Vendor">
            <span className="dx-invoice-hero-vendor">{vendorName || '—'}</span>
          </HeroLabeledValue>
          <span className="dx-invoice-hero-dot" aria-hidden>
            ·
          </span>
          <HeroLabeledValue label="Source">
            <Badge tone={sourceTone} dot={false}>
              {sourceLabel}
            </Badge>
          </HeroLabeledValue>
        </p>
        <p className="dx-invoice-hero-meta">
        <HeroLabeledValue label="PO number">
          <span
            className={`dx-invoice-hero-meta-value${nonPo ? ' dx-invoice-hero-meta-value--muted' : ' dx-invoice-hero-meta-value--mono'}`}
          >
            {nonPo ? 'Non-PO' : inv.po_number || '—'}
          </span>
        </HeroLabeledValue>
        <span className="dx-invoice-hero-dot" aria-hidden>
          ·
        </span>
        <HeroLabeledValue label="Invoice date">
          <span className="dx-invoice-hero-meta-value">
            <Calendar size={12} aria-hidden />
            {fmtDateOnly(invoiceDate) || '—'}
          </span>
        </HeroLabeledValue>
        <span className="dx-invoice-hero-dot" aria-hidden>
          ·
        </span>
        <HeroLabeledValue label="SLA due">
          {slaBreached ? (
            <span className="dx-id-pill dx-id-pill--error">SLA Breached</span>
          ) : (
            <span className="dx-invoice-hero-meta-value">{fmtDateOnly(slaDue)}</span>
          )}
        </HeroLabeledValue>
        {isEmail ? (
          <>
            <span className="dx-invoice-hero-dot" aria-hidden>
              ·
            </span>
            <HeroLabeledValue label="From">
              <span className="dx-invoice-hero-meta-value" title={inv.email_from || ''}>
                {inv.email_from || '—'}
              </span>
            </HeroLabeledValue>
            {inv.email_subject ? (
              <>
                <span className="dx-invoice-hero-dot" aria-hidden>
                  ·
                </span>
                <HeroLabeledValue label="Subject">
                  <span className="dx-invoice-hero-meta-value" title={inv.email_subject}>
                    {inv.email_subject}
                  </span>
                </HeroLabeledValue>
              </>
            ) : null}
          </>
        ) : null}
        </p>
      </div>
      <HeroLabeledValue label="Invoice amount" className="dx-invoice-hero-labeled--total">
        <span className="dx-invoice-hero-total">{fmtMoney(totalAmount, currency)}</span>
      </HeroLabeledValue>
    </div>
  )
}

function PayableSummary({ inv, derived }) {
  const sub = inv.subtotal || inv.total_amount || 0
  return (
    <Card
      style={{
        marginTop: 16,
        padding: 20,
        background: 'linear-gradient(135deg, rgba(40, 152, 64,.05), rgba(40, 152, 64,.02))',
        borderColor: 'var(--dx-primary-100)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: 'var(--dx-primary-700)'
          }}
        >
          Net payable calculation
        </span>
        <span style={{ fontSize: 11, color: 'var(--dx-text-mute)' }}>
          (LD &amp; advance recovery applied)
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))',
          gap: 14
        }}
      >
        <SummaryStat label="Subtotal" value={fmtMoney(sub, inv.currency)} />
        {derived.ld_amount > 0 && (
          <SummaryStat
            label={`LD (${derived.ld_pct.toFixed(1)}%)`}
            value={`− ${fmtMoney(derived.ld_amount, inv.currency)}`}
            tone="danger"
          />
        )}
        {derived.advance_recovery > 0 && (
          <SummaryStat
            label="Advance recovery"
            value={`− ${fmtMoney(derived.advance_recovery, inv.currency)}`}
            tone="warn"
          />
        )}
        <SummaryStat label="+ VAT" value={fmtMoney(inv.vat_amount, inv.currency)} />
        <SummaryStat
          label="Net payable"
          value={fmtMoney(derived.net_payable, inv.currency)}
          tone="primary"
          highlight
        />
      </div>
    </Card>
  )
}

function SummaryStat({ label, value, tone, highlight }) {
  const color =
    tone === 'danger'
      ? 'var(--dx-error-700)'
      : tone === 'warn'
        ? 'var(--dx-warn-700)'
        : tone === 'primary'
          ? 'var(--dx-primary-700)'
          : 'var(--dx-text)'

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--dx-text-mute)',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          fontWeight: 600
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          fontWeight: highlight ? 700 : 600,
          fontSize: highlight ? 20 : 16,
          color,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.2px'
        }}
      >
        {value}
      </div>
    </div>
  )
}

const EXTRACT_DOC_TAB_LABELS = {
  A_nonPoTravel: 'Invoice',
  A_invoice: 'Invoice',
  B_taxInvoice: 'Tax Invoice',
  C_notice: 'Notice',
  D_beritaAcara: 'Berita Acara',
  E_manhourSummary: 'Manhour Summary',
  F_timesheet: 'Timesheet',
  G_attendance: 'Attendance',
  H_po: 'PO Header',
  I_poAppendix: 'PO Appendix',
  K_ses: 'SES'
}

function ExtractValidateSectionHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions = null,
  collapsible = false,
  open = true,
  onToggle
}) {
  const content = (
    <>
      {Icon && <Icon size={15} className="dx-ev-section-icon" aria-hidden />}
      <div className="dx-ev-section-header-text">
        <div className="dx-ev-section-title-row">
          <h4 className="dx-ev-section-title">{title}</h4>
          {badge != null && (
            <span
              className={`dx-ev-section-badge dx-ev-section-badge--${badge.tone || 'neutral'}`}
              aria-label={badge.label}
            >
              {badge.text}
            </span>
          )}
        </div>
        {subtitle && <p className="dx-ev-section-sub">{subtitle}</p>}
      </div>
      {actions ? <div className="dx-ev-section-header-actions">{actions}</div> : null}
      {collapsible && (
        <span className="dx-ev-section-chevron" aria-hidden>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      )}
    </>
  )

  if (collapsible) {
    return (
      <button
        type="button"
        className="dx-ev-section-header dx-ev-section-header--toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        {content}
      </button>
    )
  }

  return <div className="dx-ev-section-header">{content}</div>
}

function ExtractValidateTab({
  inv,
  isNonPo = false,
  checks,
  validation,
  canEditExtract,
  extractCorrections,
  savingCorrections = false,
  onSaveExtractCorrections,
  onRevalidate,
  revalidating,
  uploadHref,
  onDocTabChange
}) {
  const [promptTypeDetail, setPromptTypeDetail] = useState(null)

  useEffect(() => {
    let cancelled = false
    const code = resolvePromptConfigTypeCode(inv)
    fetchInvoiceTypePromptConfigByCode(code)
      .then((detail) => {
        if (!cancelled) setPromptTypeDetail(detail)
      })
      .catch(() => {
        if (!cancelled) setPromptTypeDetail(null)
      })
    return () => {
      cancelled = true
    }
  }, [
    inv?.invoice_workflow,
    inv?.invoice_type,
    inv?.invoice_type_code,
    inv?.po_category,
    inv?.id,
    inv?.file_name,
    inv?.vendor_name,
    inv?.batch_document_types
  ])

  const sections = useMemo(
    () =>
      buildConfigDrivenExtractSections(inv, promptTypeDetail, checks, extractCorrections, {
        isNonPo
      }),
    [inv, promptTypeDetail, checks, extractCorrections, isNonPo]
  )
  const currency = inv.currency || 'IDR'
  const invoiceKey = inv?.id ?? ''
  const firstSectionKey = sections[0]?.key ?? ''
  const [docTab, setDocTab] = useState('')
  const [extractionOpen, setExtractionOpen] = useState(true)
  const [nWayView, setNWayView] = useState('list')
  const [nWaySummary, setNWaySummary] = useState(null)
  const nWayConfigHref =
    typeof window !== 'undefined' && window.location.pathname.startsWith(`/${ADMIN_USER_TYPE}`)
      ? `/${ADMIN_USER_TYPE}${PROMPT_CONFIG}?tab=n-way-matching`
      : null
  const prevInvoiceKeyRef = useRef(invoiceKey)
  const prevFirstSectionKeyRef = useRef('')

  useEffect(() => {
    const invoiceChanged = prevInvoiceKeyRef.current !== invoiceKey
    prevInvoiceKeyRef.current = invoiceKey

    if (!firstSectionKey) {
      prevFirstSectionKeyRef.current = ''
      setDocTab('')
      return
    }

    const firstTabChanged = prevFirstSectionKeyRef.current !== firstSectionKey
    prevFirstSectionKeyRef.current = firstSectionKey

    if (
      invoiceChanged ||
      firstTabChanged ||
      !docTab ||
      !sections.some((section) => section.key === docTab)
    ) {
      setDocTab(firstSectionKey)
    }
  }, [invoiceKey, firstSectionKey, sections, docTab])

  useEffect(() => {
    onDocTabChange?.(docTab)
  }, [docTab, onDocTabChange])

  const docTabs = sections.map((section) => {
    const { missing } = countSectionFields(section.fields)
    return {
      value: section.key,
      label: EXTRACT_DOC_TAB_LABELS[section.key] || section.label,
      badge: section.configStale ? 'stale' : missing > 0 ? missing : null,
      title: section.configStale
        ? 'Config changed — re-extract recommended'
        : section.label
    }
  })

  const activeSection = sections.find((section) => section.key === docTab) || sections[0]
  const validationContext = useMemo(
    () => ({
      ...validation,
      demoScenario: resolveDemoScenario(inv || {}),
      batch_document_types: inv?.batch_document_types,
      ocr_by_type: inv?.ocr_by_type
    }),
    [validation, inv]
  )
  const { passed: validationPassed, total: validationTotal } = getChecklistPassSummary(checks, {
    variant: isNonPo ? 'nonPo' : 'po',
    validation: validationContext
  })
  const validationAllPassed =
    validationTotal > 0 && validationPassed === validationTotal
  const validationPending = revalidating && checks.length === 0
  const validationBadgeTone = isNonPo
    ? validationPending
      ? 'neutral'
      : 'pass'
    : validationPending
      ? 'neutral'
      : validationAllPassed
        ? 'pass'
        : 'fail'

  const navigate = useNavigate()

  const handleReExtract = () => {
    if (uploadHref) {
      navigate(uploadHref)
      return
    }
    showEssaErrorToast(
      'Re-extract unavailable',
      'Open Upload Invoice to re-run extraction for this document.'
    )
  }

  return (
    <div className="dx-extract-validate">
      {sections.length > 0 ? (
        <div className="dx-ev-section dx-ev-section--card">
          <ExtractValidateSectionHeader
            icon={FileText}
            title="Extraction"
            subtitle={
              isNonPo
                ? 'Fields captured from the invoice document'
                : 'Fields captured from each document · one tab per source document'
            }
            collapsible
            open={extractionOpen}
            onToggle={() => setExtractionOpen((prev) => !prev)}
          />
          {extractionOpen && (
            <div className="dx-extract-doc-tabs-wrap">
              {docTabs.length > 1 ? (
                <Tabs
                  className="dx-extract-doc-tabs"
                  tabs={docTabs}
                  value={docTab}
                  onChange={setDocTab}
                />
              ) : null}
              {activeSection && (
                <DocumentExtractSection
                  section={activeSection}
                  currency={currency}
                  canEdit={canEditExtract}
                  saving={savingCorrections}
                  onSaveCorrections={onSaveExtractCorrections}
                  onReExtract={handleReExtract}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="dx-ev-section">
          <div className="dx-extract-empty-state" role="status">
            <FileText size={28} strokeWidth={1.5} aria-hidden />
            <h5>No extraction documents enabled</h5>
            <p>
              Enable documents for this invoice type in Prompt Config to show extraction tabs here.
              Previously extracted values are kept when a document is toggled off.
            </p>
          </div>
        </div>
      )}

      <div className="dx-ev-section dx-ev-section--card">
        <ExtractValidateSectionHeader
          icon={ShieldCheck}
          title="Validation"
          subtitle={
            isNonPo
              ? '4-point checklist — HCIS Clearing Journal, Vendor Master, Non-PKP, and advance/retention'
              : '12-point checklist against PO Master, Vendor Master, and supporting documents'
          }
          badge={{
            text: validationPending
              ? 'Validating…'
              : formatChecklistPassBadgeText(validationPassed, validationTotal),
            label: validationPending
              ? 'Running validation checks'
              : validationAllPassed
                ? `All ${validationTotal} validation checks passed`
                : `${validationPassed} of ${validationTotal} validation checks passed`,
            tone: validationBadgeTone
          }}
          actions={
            onRevalidate ? (
              <Button size="sm" variant="secondary" onClick={onRevalidate} disabled={revalidating}>
                <RefreshCw size={13} className={revalidating ? 'dx-spin' : undefined} />
                {revalidating ? 'Re-validating…' : 'Re-validate'}
              </Button>
            ) : null
          }
        />
        <PoValidationPanel
          checks={checks}
          validation={validation}
          invoice={inv}
          variant={isNonPo ? 'nonPo' : 'po'}
          onRevalidate={onRevalidate}
          revalidating={revalidating}
          uploadHref={uploadHref}
        />
      </div>

      <div className="dx-ev-section dx-ev-section--card">
        <ExtractValidateSectionHeader
          icon={GitCompareArrows}
          title="N-Way validation"
          subtitle="Each data point checked across the invoice package and SAP — anchor (A) against every compare document"
          badge={
            nWaySummary
              ? {
                  text: `${nWaySummary.pass}/${nWaySummary.total - (nWaySummary.na || 0)} MATCHED`,
                  label: `${nWaySummary.pass} matched, ${nWaySummary.fail} mismatched, ${nWaySummary.incomplete} not captured, ${nWaySummary.pending} awaiting source`,
                  tone: nWaySummary.fail ? 'fail' : nWaySummary.incomplete ? 'neutral' : 'pass'
                }
              : undefined
          }
          actions={<NWayViewToggle view={nWayView} onChange={setNWayView} />}
        />
        <NWayValidationPanel
          inv={inv}
          sections={sections}
          checks={checks}
          validation={validationContext}
          isNonPo={isNonPo}
          invoiceTypeCode={resolvePromptConfigTypeCode(inv)}
          configHref={nWayConfigHref}
          view={nWayView}
          onSummary={setNWaySummary}
        />
      </div>
    </div>
  )
}

function ExtractDynamicTables({ tables, currency }) {
  if (!tables?.length) return null

  return (
    <>
      {tables.map((table, tableIndex) => (
        <div
          key={`${table.title || 'table'}-${tableIndex}`}
          className="dx-val-section-table dx-val-section-table--lines dx-val-section-table--dynamic"
        >
          {table.title ? <h5 className="dx-extract-table-title">{table.title}</h5> : null}
          <div className="dx-extract-table-scroll">
          <table className="dx-extract-lines-table">
            <thead>
              <tr>
                <th>#</th>
                {table.columns.map((col) => (
                  <th key={col.key} className={col.align === 'end' ? 'text-end' : undefined}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="dx-line-no">{rowIndex + 1}</td>
                  {table.columns.map((col) => (
                    <td
                      key={col.key}
                      className={
                        col.align === 'end'
                          ? 'text-end dx-line-num'
                          : col.key === 'description'
                            ? 'dx-line-desc'
                            : undefined
                      }
                    >
                      {formatDynamicExtractCell(row[col.key], col, currency)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ))}
    </>
  )
}

function ExtractSectionEmptyState({ section }) {
  const docLabel = String(section.label || 'this document')
    .replace(/^[A-Z]\.\s*/, '')
    .trim()

  return (
    <div className="dx-extract-empty-state" role="status">
      <FileText size={28} strokeWidth={1.5} aria-hidden />
      <h5>No extracted data to show</h5>
      <p>
        Nothing was captured for {docLabel || 'this category'}. This document may not have been
        included in the upload, or OCR did not detect readable content to display here.
      </p>
    </div>
  )
}

function DocumentExtractSection({ section, currency, canEdit, saving = false, onSaveCorrections, onReExtract }) {
  const [editing, setEditing] = useState(false)
  const [fieldsDraft, setFieldsDraft] = useState({})
  const [lineItemsDraft, setLineItemsDraft] = useState([])
  const [manpowerSheetsDraft, setManpowerSheetsDraft] = useState([])
  const [reasonRemarks, setReasonRemarks] = useState('')
  const [reasonError, setReasonError] = useState('')

  const timesheetColumns =
    section.lineColumns ||
    OCR_LINE_ITEM_COLUMNS?.timesheet_display ||
    OCR_LINE_ITEM_COLUMNS?.timesheet ||
    []

  const { filled, missing } = countSectionFields(section.fields)
  const hasPresentableContent = sectionHasPresentableContent(section)
  const hasHeaderTable = section.fields.length > 0 && !section.hideHeaderFields
  const hasExtractTables = section.extractTables?.length > 0
  const hasLineTable =
    !section.manpowerSheets?.length &&
    !hasExtractTables &&
    section.lineItems?.length > 0 &&
    section.lineColumns?.length > 0
  const hasTimesheetTable = section.manpowerSheets?.length > 0
  const hasEditableTable = hasHeaderTable || hasLineTable || hasTimesheetTable

  useEffect(() => {
    setEditing(false)
    setReasonRemarks('')
    setReasonError('')
  }, [section.key])

  const startEditing = () => {
    setFieldsDraft(
      Object.fromEntries(
        section.fields.map((field) => [field.fieldKey, fieldToEditableString(field)])
      )
    )
    setLineItemsDraft(
      (section.lineItems || []).map((item) =>
        Object.fromEntries(
          (section.lineColumns || []).map((col) => [
            col.key,
            lineItemCellToEditableString(item, col.key)
          ])
        )
      )
    )
    setManpowerSheetsDraft(
      (section.manpowerSheets || []).map((sheet) => ({
        ...sheet,
        entries: (sheet.entries || []).map((entry) =>
          Object.fromEntries(
            timesheetColumns.map((col) => {
              const row = hydrateTimesheetRow(sheet, entry)
              return [col.key, lineItemCellToEditableString(row, col.key)]
            })
          )
        )
      }))
    )
    setReasonRemarks('')
    setReasonError('')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setReasonRemarks('')
    setReasonError('')
  }

  const saveEditing = async () => {
    const reason = String(reasonRemarks || '').trim()
    if (!reason) {
      setReasonError('A reason is required for corrections.')
      return
    }
    setReasonError('')
    const payload = { fields: { ...fieldsDraft }, reasonRemarks: reason }
    if (hasTimesheetTable) {
      payload.manpowerSheets = manpowerSheetsDraft
    } else if (hasLineTable) {
      payload.lineItems = lineItemsDraft
    }
    try {
      await onSaveCorrections?.(section.key, payload)
      setEditing(false)
      setReasonRemarks('')
    } catch {
      // Parent shows toast; keep editor open so the user can retry.
    }
  }

  const updateLineItemDraft = (rowIndex, colKey, value) => {
    setLineItemsDraft((prev) =>
      prev.map((row, index) => (index === rowIndex ? { ...row, [colKey]: value } : row))
    )
  }

  const updateTimesheetDraft = (sheetIndex, entryIndex, colKey, value) => {
    setManpowerSheetsDraft((prev) =>
      prev.map((sheet, sIdx) => {
        if (sIdx !== sheetIndex) return sheet
        return {
          ...sheet,
          entries: (sheet.entries || []).map((entry, eIdx) =>
            eIdx === entryIndex ? { ...entry, [colKey]: value } : entry
          )
        }
      })
    )
  }

  return (
    <section
      className={`dx-val-section dx-extract-doc-panel${editing ? ' dx-extract-doc-panel--editing' : ''}`}
      aria-label={section.label}
    >
      {section.configStale ? (
        <div className="dx-extract-stale-banner" role="status">
          <span className="dx-extract-stale-banner__text">
            Config changed — re-extract
          </span>
          <span className="dx-extract-stale-banner__hint">
            Field definitions changed since this document was extracted. Prior values stay visible
            until you re-extract.
          </span>
          {onReExtract ? (
            <Button size="sm" variant="secondary" onClick={onReExtract}>
              <RefreshCw size={13} />
              Re-extract
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="dx-val-section-head">
        <div className="dx-val-section-head-main">
          <h4 className="dx-val-section-title">{section.label}</h4>
          <div className="dx-val-section-counts">
            {!hasPresentableContent ? (
              <span className="dx-val-section-summary dx-val-section-summary--missing">
                No data extracted
              </span>
            ) : (
              <>
                <span className="dx-val-section-summary dx-val-section-summary--ok">
                  {filled} extracted
                </span>
                {missing > 0 && (
                  <span className="dx-val-section-summary dx-val-section-summary--missing">
                    {missing} empty
                  </span>
                )}
                {section.configStale ? (
                  <span className="dx-val-section-summary dx-val-section-summary--stale">
                    Config changed
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>
        {canEdit && hasEditableTable && (
          <div className="dx-val-section-actions">
            {editing ? (
              <>
                <Button size="sm" variant="primary" onClick={saveEditing} disabled={saving}>
                  <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button size="sm" variant="secondary" className="dx-id-btn" onClick={cancelEditing} disabled={saving}>
                  <X size={13} /> Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={startEditing}>
                <Pencil size={13} /> Edit
              </Button>
            )}
          </div>
        )}
      </div>
      {editing && canEdit && (
        <div className={`dx-extract-reason${reasonError ? ' dx-extract-reason--error' : ''}`}>
          <label className="dx-extract-reason-label" htmlFor={`extract-reason-${section.key}`}>
            Reason for correction <span aria-hidden="true">*</span>
          </label>
          <Input
            id={`extract-reason-${section.key}`}
            className="dx-extract-reason-input"
            value={reasonRemarks}
            onChange={(e) => {
              setReasonRemarks(e.target.value)
              if (reasonError) setReasonError('')
            }}
            placeholder="e.g. Corrected based on invoice PDF"
            aria-label="Reason for correction"
            aria-invalid={reasonError ? 'true' : undefined}
            aria-describedby={`extract-reason-hint-${section.key}`}
            disabled={saving}
          />
          <p
            id={`extract-reason-hint-${section.key}`}
            className={`dx-extract-reason-hint${reasonError ? ' dx-extract-reason-hint--error' : ''}`}
          >
            {reasonError ||
              'Required for the audit log. Each changed field is recorded with before and after values.'}
          </p>
        </div>
      )}
      {hasHeaderTable && (
        <div className="dx-val-section-table dx-val-section-table--horizontal">
          <table className="dx-extract-fields-table">
            <thead>
              <tr>
                {section.fields.map((field) => (
                  <th key={field.fieldKey}>
                    <span className="dx-field-label">{field.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {section.fields.map((field) => {
                  if (editing) {
                    return (
                      <td key={field.fieldKey}>
                        <Input
                          className="dx-extract-cell-input"
                          value={fieldsDraft[field.fieldKey] ?? ''}
                          placeholder={extractCellPlaceholder(field.label, {
                            optional: field.optional
                          })}
                          onChange={(e) =>
                            setFieldsDraft((prev) => ({
                              ...prev,
                              [field.fieldKey]: e.target.value
                            }))
                          }
                        />
                      </td>
                    )
                  }
                  const cell = getExtractedCellDisplay(field)
                  return (
                    <td key={field.fieldKey}>
                      <ExtractedCell cell={cell} />
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {hasExtractTables ? (
        <ExtractDynamicTables tables={section.extractTables} currency={currency} />
      ) : hasTimesheetTable ? (
        <TimesheetManpowerPanels
          sheets={section.manpowerSheets}
          currency={currency}
          editing={editing}
          draftSheets={manpowerSheetsDraft}
          onDraftCellChange={updateTimesheetDraft}
        />
      ) : (
        hasLineTable && (
          <div className="dx-val-section-table dx-val-section-table--lines">
            <div className="dx-extract-table-scroll">
            <table className="dx-extract-lines-table">
              <thead>
                <tr>
                  <th>#</th>
                  {section.lineColumns.map((col) => (
                    <th key={col.key} className={col.align === 'end' ? 'text-end' : undefined}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(editing ? lineItemsDraft : section.lineItems).map((item, i) => (
                  <tr key={i}>
                    <td className="dx-line-no">{i + 1}</td>
                    {section.lineColumns.map((col) => (
                      <td
                        key={col.key}
                        className={
                          col.align === 'end'
                            ? 'text-end dx-line-num'
                            : col.key === 'description'
                              ? 'dx-line-desc'
                              : undefined
                        }
                      >
                        {editing ? (
                          <Input
                            className="dx-extract-cell-input"
                            value={item?.[col.key] ?? ''}
                            placeholder={extractCellPlaceholder(col.label)}
                            onChange={(e) => updateLineItemDraft(i, col.key, e.target.value)}
                          />
                        ) : (
                          formatExtractLineCell(col, item, currency)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )
      )}

      {!hasPresentableContent && <ExtractSectionEmptyState section={section} />}
    </section>
  )
}

function ExtractedCell({ cell }) {
  if (cell.variant === 'value') {
    return (
      <div className="dx-field-cell dx-field-cell--ok">
        <span className="dx-field-cell-dot" aria-hidden />
        <span className="dx-field-cell-value">{cell.text}</span>
      </div>
    )
  }
  if (cell.variant === 'optional') {
    return (
      <div className="dx-field-cell dx-field-cell--optional">
        <span className="dx-field-cell-dot" aria-hidden />
        <span className="dx-field-cell-missing">{cell.text}</span>
      </div>
    )
  }
  return (
    <div className="dx-field-cell dx-field-cell--missing">
      <span className="dx-field-cell-dot" aria-hidden />
      <span className="dx-field-cell-missing">{cell.text}</span>
    </div>
  )
}

function ApprovalTab({ chain, invoice, canAct, onAction }) {
  const pendingStep = chain.find((s) => s.status === 'pending')
  const pendingRole = pendingStep?.role || null
  const pendingLabel =
    pendingStep?.role_label?.split(' · ').pop() ||
    (pendingRole ? pendingRole.replace(/_/g, ' ').toUpperCase() : null)
  const completed = chain.filter((s) => s.status === 'approved').length
  const isNonPo = isNonPoInvoiceWorkflow(invoice)

  return (
    <>
      <div className="dx-approval-banner">
        <div className="dx-approval-banner__title">
          {isNonPo ? 'Non-PO invoice' : 'PO invoice'} —{' '}
          {isNonPo ? 'DoA approval workflow' : 'Internal AP posting workflow'}
        </div>
        <div className="dx-approval-banner__flow">
          {isNonPo
            ? formatNonPoDoaFlow(invoice?.total_amount ?? invoice?.subtotal)
            : 'AP Team → AP Supervisor → AP Lead → Finance Manager'}
        </div>
        {invoice?.total_amount != null && (
          <div className="dx-approval-banner__meta">
            Invoice total {fmtMoney(invoice.total_amount, invoice.currency)}
            {invoice.po_number ? ` · PO ${invoice.po_number}` : ''}
          </div>
        )}
        <div className="dx-approval-banner__progress">
          <span className="dx-approval-banner__progress-pill">
            {completed} / {chain.length} complete
          </span>
          {pendingLabel ? (
            <span>
              Awaiting <strong>{pendingLabel}</strong>
            </span>
          ) : (
            <span>All steps complete</span>
          )}
        </div>
      </div>
      <ApprovalChain chain={chain} canAct={canAct} onAction={onAction} />
    </>
  )
}

function usePersistentBool(key, fallback) {
  const [val, setVal] = useState(() => {
    if (typeof window === 'undefined') return fallback
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : raw === '1'
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, val ? '1' : '0')
    } catch (_) {
      /* localStorage may be unavailable */
    }
  }, [key, val])

  return [val, setVal]
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaInvoiceDetail)
