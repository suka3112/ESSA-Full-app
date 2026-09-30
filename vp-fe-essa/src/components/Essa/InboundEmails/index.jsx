import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Ban,
  ChevronsUpDown,
  Download,
  Eye,
  FileText,
  Info,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  X
} from 'lucide-react'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Tabs } from '../ui/Tabs'
import { Drawer } from '../ui/Drawer'
import { Skeleton } from '../ui/Skeleton'
import { TablePagination } from '../ui/listPage'
import { fetchInboundEmails, pollEmailIntake, ignoreInboundEmail } from 'api/apInvoiceOcr'
import { INVOICE_DASHBOARD, INVOICE_DETAIL, INVOICES } from 'constants/url'
import '../../../assets/scss/essa/dashboard.scss'

const CAT_META = {
  DOCREQ: { tone: 'info', pipe: 'Document request (merge)' },
  MANPOWER: { tone: 'pending', pipe: 'Manpower services' },
  CIVIL: { tone: 'warning', pipe: 'Civil contractor' },
  NONPO: { tone: 'success', pipe: 'Non-PO' },
  TRAVEL: { tone: 'success', pipe: 'Non-PO' },
  EXPENSE: { tone: 'success', pipe: 'Non-PO' },
  MISC: { tone: 'success', pipe: 'Non-PO' },
  CATERING: { tone: 'pending', pipe: 'Camp / catering' },
  MATERIAL_IMPORT: { tone: 'info', pipe: 'Material import' },
  SECURITY: { tone: 'neutral', pipe: 'Security services' },
  HOUSEKEEPING: { tone: 'neutral', pipe: 'Housekeeping' },
  COMPOSITE: { tone: 'neutral', pipe: 'Composite' },
  NATURAL_GAS: { tone: 'neutral', pipe: 'Natural gas' },
  SERVICE: { tone: 'neutral', pipe: 'Service' },
  '—': { tone: 'neutral', pipe: 'Not classified' }
}

const ST_META = {
  PROCESSED: { label: 'Processed', tone: 'success', sev: '', rank: 1 },
  QUEUED: { label: 'Queued', tone: 'neutral', sev: '', rank: 2 },
  PENDING: { label: 'Pending', tone: 'pending', sev: 'sev-busy', rank: 3 },
  NO_DOCUMENT: { label: 'No PDF', tone: 'warning', sev: 'sev-warn', rank: 4 },
  INVALID_SUBJECT: { label: 'Invalid subject', tone: 'warning', sev: 'sev-warn', rank: 5 },
  UNCORRELATED: { label: 'Uncorrelated', tone: 'neutral', sev: 'sev-warn', rank: 6 },
  FAILED: { label: 'Failed', tone: 'error', sev: 'sev-err', rank: 7 },
  IGNORED: { label: 'Ignored', tone: 'neutral', sev: '', rank: 8 },
  VENDOR_UNMATCHED: { label: 'Vendor unmatched', tone: 'neutral', sev: 'sev-warn', rank: 6 }
}

const ATTN_STATUSES = new Set([
  'FAILED',
  'INVALID_SUBJECT',
  'NO_DOCUMENT',
  'UNCORRELATED',
  'VENDOR_UNMATCHED'
])

const IGNOREABLE_STATUSES = new Set([
  'FAILED',
  'QUEUED',
  'PENDING',
  'INVALID_SUBJECT',
  'UNCORRELATED',
  'NO_DOCUMENT',
  'VENDOR_UNMATCHED'
])

const STATUS_GUIDE = [
  { key: 'QUEUED', text: 'Accepted from the mailbox, OCR not started yet.' },
  { key: 'PENDING', text: 'OCR or save in progress; age shows once it passes 5 minutes.' },
  { key: 'PROCESSED', text: 'Saved after OCR — the invoice exists in the workbench.' },
  { key: 'FAILED', text: 'OCR error, or stalled beyond 15 minutes. Retry, or ignore to stop retries.' },
  { key: 'NO_DOCUMENT', text: 'Subject matched but the mail carried no attachment.' },
  { key: 'INVALID_SUBJECT', text: 'Subject does not follow the [EAPA] format.' },
  { key: 'UNCORRELATED', text: 'DOCREQ reply whose INV/REQ reference matched nothing — no invoice created.' },
  { key: 'VENDOR_UNMATCHED', text: 'Sender is not in the vendor master. Ignore, or add the vendor and retry.' }
]

const PIPELINE_TYPE_LABELS = {
  MANPOWER_SERVICES: 'Manpower services',
  CAMP_SERVICE_AND_CATERING: 'Camp / catering',
  CIVIL_CONTRACTOR: 'Civil contractor',
  MATERIAL_IMPORT: 'Material import',
  NON_PO: 'Non-PO',
  AUTO: 'Auto (OCR classifies)',
  TRAVEL_INVOICE: 'Travel',
  DOCREQ: 'Document request (merge)'
}

function formatStatusAge(ageMs) {
  if (ageMs == null || !Number.isFinite(ageMs) || ageMs < 0) return null
  const sec = Math.floor(ageMs / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 48) return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

function computeStatusAgeMs(row) {
  if (typeof row.statusAgeMs === 'number' && Number.isFinite(row.statusAgeMs)) {
    return row.statusAgeMs
  }
  const stamp = row.updatedAt || row.createdAt || row.receivedAt
  if (!stamp) return null
  const t = new Date(stamp).getTime()
  if (!Number.isFinite(t)) return null
  return Math.max(0, Date.now() - t)
}

function isRowStale(row, displayStatus) {
  if (row.stale) return true
  const status = String(displayStatus || row.status || '').toUpperCase()
  if (status !== 'PENDING') return false
  const age = computeStatusAgeMs(row)
  return age != null && age >= 15 * 60 * 1000
}

function canIgnoreRow(displayStatus) {
  return IGNOREABLE_STATUSES.has(String(displayStatus || '').toUpperCase())
}

function formatPipelineType(row) {
  const parse = row?.subjectParse
  if (String(parse?.type || '').toUpperCase() === 'DOCREQ') {
    return PIPELINE_TYPE_LABELS.DOCREQ
  }
  const id = String(parse?.invoiceTypeId || parse?.invoiceWorkflow || '')
    .trim()
    .toUpperCase()
  if (!id) return null
  return PIPELINE_TYPE_LABELS[id] || id.replace(/_/g, ' ')
}

function formatErrorMessage(raw, status) {
  const text = String(raw || '').trim()
  if (!text) {
    const key = String(status || '').toUpperCase()
    if (key === 'NO_DOCUMENT') return 'No PDF attachment on this email.'
    if (key === 'INVALID_SUBJECT') return 'Subject does not match [EAPA] format.'
    if (key === 'UNCORRELATED') {
      return 'Could not match INV/REQ — invoice was not created.'
    }
    if (key === 'FAILED') return 'Processing failed. Retry poll or check OCR service.'
    return null
  }

  const lower = text.toLowerCase()
  if (lower.includes('empty_subject') || lower.startsWith('subject is empty')) {
    return 'Subject is empty. Use [EAPA][…] Vendor - Invoice.'
  }
  if (lower.includes('malformed_po_subject') || lower.includes('po subject format invalid')) {
    return 'PO subject invalid. Expected [EAPA][CATEGORY][PO:…] Vendor - Invoice.'
  }
  if (lower.includes('malformed_non_po_subject') || lower.includes('non-po subject format invalid')) {
    return 'Non-PO subject invalid. Expected [EAPA][NONPO][CATEGORY] Vendor - Invoice.'
  }
  if (lower.includes('malformed_docreq') || lower.includes('document-request subject')) {
    return 'Document-request subject invalid. Expected [EAPA][DOCREQ][INV:…][REQ:…] ….'
  }
  if (lower.includes('could not match inv/req') || lower.includes('uncorrelated')) {
    return 'Could not match INV/REQ — invoice was not created.'
  }
  if (lower.includes('no_recognized_prefix') || lower.includes('must start with [eapa]')) {
    return 'Subject must start with [EAPA].'
  }
  if (lower.includes('no pdf')) {
    return 'No PDF attachment found.'
  }
  const cleaned = text
    .replace(/^invalid_subject:\s*/i, '')
    .replace(/^[a-z0-9_]+\s*[—–-]\s*/i, '')
    .trim()
  return cleaned || text
}

function formatRowError(row, displayStatus) {
  const status = displayStatus || row.status
  const raw = String(row.errorMessage || '')
  if (isRowStale(row, status)) {
    return 'Stalled — processing was interrupted. Poll mailbox to retry.'
  }
  if (/stuck in Pending/i.test(raw)) {
    return 'Previous run was interrupted before OCR finished. Poll mailbox to retry.'
  }
  const fromParent = formatErrorMessage(row.errorMessage, status)
  const failedAtt = (row.attachments || []).find(
    (a) => String(a.status || '').toUpperCase() === 'FAILED' && a.errorMessage
  )
  if (failedAtt?.errorMessage) {
    const fromAtt = formatErrorMessage(failedAtt.errorMessage, 'FAILED')
    if (
      !fromParent ||
      fromParent.startsWith('Processing failed') ||
      fromParent.includes('failed OCR')
    ) {
      return fromAtt
    }
  }
  return fromParent
}

function resolveDisplayStatus(row) {
  const status = String(row.status || '').toUpperCase()
  if (status === 'IGNORED') return 'IGNORED'
  const attachments = row.attachments || []
  if (!attachments.length) return status || 'QUEUED'

  const statuses = attachments.map((a) => String(a.status || '').toUpperCase())
  const hasProcessed = statuses.some((s) => s === 'PROCESSED')
  const hasFailed = statuses.some((s) => s === 'FAILED')
  const hasPending = statuses.some((s) => s === 'PENDING')
  const hasQueued = statuses.some((s) => s === 'QUEUED')

  if ((status === 'PENDING' || status === 'QUEUED') && hasFailed && !hasProcessed && !hasPending && !hasQueued) {
    return 'FAILED'
  }
  if ((status === 'PENDING' || status === 'QUEUED') && hasProcessed && !hasPending && !hasQueued) {
    return 'PROCESSED'
  }
  if (status === 'QUEUED' && hasPending) return 'PENDING'
  if (status === 'PENDING' && !hasPending && hasQueued && !hasFailed && !hasProcessed) {
    return 'QUEUED'
  }
  return status || 'QUEUED'
}

function categoryKey(row) {
  const parse = row?.subjectParse
  const type = String(parse?.type || '').toUpperCase()
  if (type === 'DOCREQ') return 'DOCREQ'
  if (type === 'NON_PO') return 'NONPO'
  const cat = String(parse?.category || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
  return cat || '—'
}

function isIgnored(row) {
  return String(row.status || '').toUpperCase() === 'IGNORED'
}

function isNeedsAttention(row) {
  if (isIgnored(row)) return false
  const status = resolveDisplayStatus(row)
  if (ATTN_STATUSES.has(status)) return true
  if (status === 'PROCESSED' && formatRowError(row, status)) return true
  return false
}

function rowRefs(row) {
  const parse = row?.subjectParse || {}
  const po = parse.poNumber || null
  const inv =
    parse.eapaInvoiceId ||
    (row.correlatedDocumentId ? `INV-${String(row.correlatedDocumentId).padStart(7, '0')}` : null) ||
    parse.invoiceNumber ||
    null
  const req = parse.requestCode || null
  return { po, inv, req, vendor: parse.vendorName || row.fromAddress || 'Unknown sender' }
}

function fmtWhen(iso) {
  if (!iso) return { time: '—', day: '' }
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return { time: '—', day: '' }
  return {
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    day: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }
}

function fmtKb(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  const kb = n / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`
}

function inReceivedWindow(iso, win) {
  if (!win || win === 'all') return true
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return false
  const now = Date.now()
  if (win === '24h') return now - t <= 24 * 60 * 60 * 1000
  if (win === '7d') return now - t <= 7 * 24 * 60 * 60 * 1000
  if (win === 'month') {
    const d = new Date()
    return new Date(iso).getFullYear() === d.getFullYear() && new Date(iso).getMonth() === d.getMonth()
  }
  return true
}

function invoiceIdFor(row) {
  const fromAtt = (row.attachments || []).find((a) => a.documentId)?.documentId
  return fromAtt || row.correlatedDocumentId || row.subjectParse?.primaryDocumentId || null
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function EssaInboundEmails({ userInfo: { userType } }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [pollNote, setPollNote] = useState('')
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [win, setWin] = useState('all')
  const [sortKey, setSortKey] = useState('when')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [per, setPer] = useState(10)
  const [error, setError] = useState('')
  const [ignoringId, setIgnoringId] = useState(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const guideRef = useRef(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const data = await fetchInboundEmails()
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Failed to load inbound emails')
      if (!silent) setRows([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const hasInFlight = useMemo(
    () =>
      rows.some((row) => {
        const s = resolveDisplayStatus(row)
        return s === 'QUEUED' || s === 'PENDING'
      }),
    [rows]
  )

  useEffect(() => {
    if (!hasInFlight || loading || polling) return undefined
    const id = setInterval(() => {
      load({ silent: true })
    }, 20000)
    return () => clearInterval(id)
  }, [hasInFlight, loading, polling, load])

  useEffect(() => {
    if (!guideOpen) return undefined
    const onDoc = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) setGuideOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setGuideOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [guideOpen])

  const tabDefs = useMemo(
    () => [
      { k: 'all', l: 'All mail', f: () => true },
      { k: 'attn', l: 'Needs attention', f: isNeedsAttention, risk: true },
      { k: 'queued', l: 'Queued', f: (r) => resolveDisplayStatus(r) === 'QUEUED' && !isIgnored(r) },
      { k: 'pending', l: 'Pending', f: (r) => resolveDisplayStatus(r) === 'PENDING' && !isIgnored(r) },
      { k: 'processed', l: 'Processed', f: (r) => resolveDisplayStatus(r) === 'PROCESSED' && !isIgnored(r) },
      { k: 'failed', l: 'Failed', f: (r) => resolveDisplayStatus(r) === 'FAILED' && !isIgnored(r) },
      {
        k: 'invalid',
        l: 'Invalid subject',
        f: (r) => resolveDisplayStatus(r) === 'INVALID_SUBJECT' && !isIgnored(r)
      },
      { k: 'no_pdf', l: 'No PDF', f: (r) => resolveDisplayStatus(r) === 'NO_DOCUMENT' && !isIgnored(r) },
      {
        k: 'uncorr',
        l: 'Uncorrelated',
        f: (r) => resolveDisplayStatus(r) === 'UNCORRELATED' && !isIgnored(r)
      },
      { k: 'ignored', l: 'Ignored', f: isIgnored }
    ],
    []
  )

  const categories = useMemo(() => {
    const set = new Set()
    for (const row of rows) {
      const key = categoryKey(row)
      if (key && key !== '—') set.add(key)
    }
    return [...set].sort()
  }, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const tabFn = tabDefs.find((t) => t.k === tab)?.f || (() => true)
    const dir = sortDir === 'asc' ? 1 : -1
    const list = rows.filter((row) => {
      if (!tabFn(row)) return false
      if (cat && categoryKey(row) !== cat) return false
      if (!inReceivedWindow(row.receivedAt || row.createdAt, win)) return false
      if (!needle) return true
      const refs = rowRefs(row)
      const hay = [
        row.fromAddress,
        row.subject,
        row.status,
        resolveDisplayStatus(row),
        row.errorMessage,
        categoryKey(row),
        formatPipelineType(row),
        refs.vendor,
        refs.po,
        refs.inv,
        refs.req,
        ...(row.attachments || []).map((a) => a.fileName)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
    list.sort((a, b) => {
      let av
      let bv
      if (sortKey === 'cat') {
        av = categoryKey(a)
        bv = categoryKey(b)
      } else if (sortKey === 'vendor') {
        av = rowRefs(a).vendor || ''
        bv = rowRefs(b).vendor || ''
      } else if (sortKey === 'status') {
        av = ST_META[resolveDisplayStatus(a)]?.rank ?? 99
        bv = ST_META[resolveDisplayStatus(b)]?.rank ?? 99
      } else {
        av = new Date(a.receivedAt || a.createdAt || 0).getTime()
        bv = new Date(b.receivedAt || b.createdAt || 0).getTime()
      }
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return cmp * dir
    })
    return list
  }, [rows, tab, q, cat, win, sortKey, sortDir, tabDefs])

  useEffect(() => {
    setPage(1)
  }, [tab, q, cat, win, sortKey, sortDir, per])

  const totalPages = Math.max(1, Math.ceil(filtered.length / per))
  const pageRows = filtered.slice((page - 1) * per, page * per)

  const handlePoll = async () => {
    if (polling) return
    setPolling(true)
    setError('')
    setPollNote('Scanning mailbox and retrying failed/interrupted invoices. OCR runs one by one.')
    try {
      const result = await pollEmailIntake()
      if (result?.enabled === false) {
        setPollNote('')
        setError(
          result?.message ||
            'Email intake is disabled. Set EMAIL_INTAKE_ENABLED=true and restart the backend.'
        )
        return
      }
      const scanned = result?.scanned
      const enqueued = result?.enqueued
      const retried = result?.retried
      const requeuedPending = result?.requeuedPending
      const idle = Boolean(result?.idle)
      const newQueued = result?.newQueued
      const retryQueued = result?.retryQueued
      const ocrRan = result?.ocrRan
      const summaryParts = []
      if (idle) summaryParts.push('no new invoices — OCR did not run')
      if (typeof scanned === 'number') summaryParts.push(`scanned ${scanned}`)
      if (typeof newQueued === 'number' && newQueued > 0) summaryParts.push(`${newQueued} new`)
      if (typeof retryQueued === 'number' && retryQueued > 0) {
        summaryParts.push(`${retryQueued} retried (not new)`)
      } else if (typeof retried === 'number' && retried > 0) {
        summaryParts.push(`retried ${retried} from log`)
      }
      if (typeof ocrRan === 'number' && !idle) summaryParts.push(`OCR ran on ${ocrRan}`)
      if (typeof enqueued === 'number' && newQueued == null) {
        summaryParts.push(`queued/processed ${enqueued}`)
      }
      if (typeof requeuedPending === 'number' && requeuedPending > 0) {
        summaryParts.push(`requeued ${requeuedPending} interrupted`)
      }
      setPollNote(
        summaryParts.length
          ? `Poll finished (${summaryParts.join(', ')}). Refreshing list…`
          : 'Poll finished. Refreshing list…'
      )
      await load({ silent: true })
      setPollNote(
        summaryParts.length ? `Poll completed (${summaryParts.join(', ')}).` : 'Poll completed.'
      )
    } catch (err) {
      setPollNote('')
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Mailbox poll failed (check EMAIL_INTAKE_ENABLED and Graph env)'
      )
    } finally {
      setPolling(false)
      setTimeout(() => {
        setPollNote((prev) => (prev.startsWith('Poll completed') ? '' : prev))
      }, 6000)
    }
  }

  const invoicePath = (documentId) =>
    `/${userType}${INVOICE_DETAIL.replace(':id', `ocr-${documentId}`)}`

  const handleIgnore = async (row) => {
    const id = row?.inboundEmailId
    if (!id || ignoringId) return
    setIgnoringId(id)
    setError('')
    try {
      await ignoreInboundEmail(id)
      await load({ silent: true })
      if (selectedId === id) setSelectedId(null)
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || 'Could not ignore this inbound email'
      )
    } finally {
      setIgnoringId(null)
    }
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'when' ? 'desc' : 'asc')
    }
  }

  const handleExport = () => {
    const headers = [
      'Received',
      'From',
      'Category',
      'Vendor',
      'Subject',
      'PO',
      'INV',
      'REQ',
      'Status',
      'Files',
      'Error'
    ]
    const lines = [headers.join(',')]
    for (const row of filtered) {
      const refs = rowRefs(row)
      const status = resolveDisplayStatus(row)
      lines.push(
        [
          row.receivedAt || row.createdAt || '',
          row.fromAddress || '',
          categoryKey(row),
          refs.vendor,
          row.subject || '',
          refs.po || '',
          refs.inv || '',
          refs.req || '',
          status,
          (row.attachments || []).map((a) => a.fileName).join('; '),
          formatRowError(row, status) || ''
        ]
          .map(csvEscape)
          .join(',')
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inbound-email-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selected = rows.find((r) => r.inboundEmailId === selectedId) || null

  const sortIcon = (key) => {
    if (sortKey !== key) return <ChevronsUpDown size={12} style={{ opacity: 0.75 }} />
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  const renderRefs = (row, status) => {
    const { po, inv, req } = rowRefs(row)
    if (!po && !inv && !req) {
      return <span className="ie-ref none">no reference parsed</span>
    }
    return (
      <>
        {po ? (
          <span className="ie-ref lnk">
            <span className="k">PO</span> {po}
          </span>
        ) : null}
        {inv ? (
          <span className={`ie-ref${status === 'PROCESSED' ? ' lnk' : ''}`}>
            <span className="k">INV</span> {inv}
          </span>
        ) : null}
        {req ? (
          <span className="ie-ref">
            <span className="k">REQ</span> {req}
          </span>
        ) : null}
      </>
    )
  }

  const renderFiles = (row) => {
    const files = row.attachments || []
    if (!files.length) {
      return (
        <span className="ie-file miss">
          <AlertTriangle size={13} />
          No attachment
        </span>
      )
    }
    return (
      <div className="ie-files">
        {files.slice(0, 2).map((f) => (
          <span key={f.inboundAttachmentId || f.fileName} className="ie-file" title={f.fileName || ''}>
            <FileText size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
            <span className="nm">{f.fileName || f.attachmentId}</span>
            {f.fileSizeBytes ? <span className="sz">{fmtKb(f.fileSizeBytes)}</span> : null}
          </span>
        ))}
        {files.length > 2 ? <span className="ie-more">+{files.length - 2} more</span> : null}
      </div>
    )
  }

  const pipelineSteps = (row) => {
    const status = resolveDisplayStatus(row)
    const when = fmtWhen(row.receivedAt || row.createdAt)
    const upd = fmtWhen(row.updatedAt || row.receivedAt)
    const t0 = `${when.day}, ${when.time}`
    const t1 = `${upd.day}, ${upd.time}`
    const cat = categoryKey(row)
    const pipe = CAT_META[cat]?.pipe || CAT_META['—'].pipe
    const files = row.attachments || []
    const li = (cls, title, sub, body) => (
      <li key={title} className={`ie-step ${cls}`}>
        <span className="ie-bul" />
        <div>
          <b>{title}</b>
          <span>{sub}</span>
          {body ? <p>{body}</p> : null}
        </div>
      </li>
    )
    const out = [li('done', 'Received in AP mailbox', t0, row.fromAddress)]
    if (status === 'INVALID_SUBJECT') {
      out.push(
        li('fail', 'Subject parsed', t1, 'No [EAPA] tag — category and PO could not be read.'),
        li('todo', 'Attachments validated', 'Not started'),
        li('todo', 'OCR classification', 'Not started'),
        li('todo', 'Invoice created', 'Not started')
      )
      return out
    }
    out.push(li('done', 'Subject parsed', t0, `${cat} · ${pipe}`))
    if (status === 'NO_DOCUMENT') {
      out.push(
        li('fail', 'Attachments validated', t1, 'The mail carried no attachment.'),
        li('todo', 'OCR classification', 'Not started'),
        li('todo', 'Invoice created', 'Not started')
      )
      return out
    }
    out.push(
      li(
        'done',
        'Attachments validated',
        t0,
        `${files.length || 0} PDF${files.length === 1 ? '' : 's'}`
      )
    )
    if (status === 'QUEUED') {
      out.push(
        li('todo', 'OCR classification', 'Waiting for the OCR worker'),
        li('todo', 'Invoice created', 'Not started')
      )
      return out
    }
    if (status === 'PENDING') {
      const age = formatStatusAge(computeStatusAgeMs(row))
      out.push(
        li('warn', 'OCR classification', 'In progress', age ? `Running for ${age}.` : null),
        li('todo', 'Invoice created', 'Not started')
      )
      return out
    }
    if (status === 'FAILED') {
      out.push(
        li('fail', 'OCR classification', t1, formatRowError(row, status) || 'Engine error.'),
        li('todo', 'Invoice created', 'Not started')
      )
      return out
    }
    if (status === 'UNCORRELATED') {
      out.push(
        li('done', 'OCR classification', t1, 'Documents read successfully.'),
        li('fail', 'Correlated to request', t1, 'No open request matches this INV/REQ pair.'),
        li('todo', 'Invoice created', 'Not started', 'Nothing was written to the workbench.')
      )
      return out
    }
    const warn = Boolean(formatRowError(row, status))
    out.push(
      warn
        ? li('warn', 'OCR classification', t1, 'Completed with missing document types.')
        : li('done', 'OCR classification', t1, 'All expected document types found.')
    )
    const inv = rowRefs(row).inv
    out.push(li('done', 'Invoice created', t1, inv ? `Saved as ${inv}` : 'Attached to the existing invoice.'))
    return out
  }

  return (
    <LeftPageContainer className="essa-invoices-shell">
      <div className="essa-dashboard inbound-email-page">
        <div className="dx-page">
          <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}${INVOICE_DASHBOARD}` },
              { label: 'Invoice Processing', to: `/${userType}${INVOICES}` },
              { label: 'Inbound Email' }
            ]}
            title="Inbound email"
            description={
              <>
                The AP mailbox is polled every 5 minutes. Mail carrying a valid{' '}
                <code className="ie-k">[EAPA]</code> PO or Non-PO subject is processed; everything
                else is left in the Inbox untouched.
              </>
            }
            actions={
              <div className="ie-head-meta">
                <Button
                  variant="ghost"
                  size="sm"
                  className="ie-btn-outline"
                  onClick={() => load()}
                  disabled={loading || polling}
                >
                  <RefreshCw size={14} className={loading && !polling ? 'dx-spin' : undefined} />
                  Refresh
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePoll}
                  disabled={polling}
                  aria-busy={polling}
                  title={
                    polling
                      ? 'Polling and OCR in progress — please wait'
                      : 'Scan the shared mailbox and process matching invoices'
                  }
                >
                  {polling ? <Loader2 size={14} className="dx-spin" /> : <Mail size={14} />}
                  {polling ? 'Polling…' : 'Poll mailbox'}
                </Button>
              </div>
            }
          />

          {polling || pollNote ? (
            <div role="status" className="ie-poll">
              {polling ? <Loader2 size={16} className="dx-spin" /> : null}
              <span>
                {pollNote ||
                  'Polling mailbox… OCR runs one invoice at a time and can take several minutes.'}
              </span>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="ie-error-banner">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError('')}>
                Dismiss
              </Button>
            </div>
          ) : null}

          <Card pad={false} className="ie-card">
            <div className="ie-tabbar">
              <Tabs
                value={tab}
                onChange={(value) => {
                  setTab(value)
                  setPage(1)
                }}
                tabs={tabDefs.map((t) => {
                  const n = rows.filter(t.f).length
                  return {
                    value: t.k,
                    label: t.l,
                    badge: n > 0 ? n : null,
                    tabClassName: t.risk ? 'risk' : undefined
                  }
                })}
              />
              <div className="ie-side-acts" ref={guideRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={guideOpen}
                  onClick={() => setGuideOpen((v) => !v)}
                >
                  <Info size={14} />
                  Status guide
                </Button>
                {guideOpen ? (
                  <div className="ie-guide" id="ie-status-guide">
                    <h3>What each state means</h3>
                    <dl>
                      {STATUS_GUIDE.map((item) => (
                        <Fragment key={item.key}>
                          <dt>
                            <span className={`ie-badge ie-b-${ST_META[item.key].tone}`}>
                              {ST_META[item.key].label}
                            </span>
                          </dt>
                          <dd>{item.text}</dd>
                        </Fragment>
                      ))}
                    </dl>
                    <p className="foot">
                      A red or amber edge on a row means it needs a person. Everything else is
                      moving on its own.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ie-filters">
              <div className={`ie-search${q ? ' has' : ''}`}>
                <Search size={14} />
                <input
                  className="dx-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Subject, vendor, PO, file…"
                  aria-label="Search the intake log"
                  type="search"
                />
                {q ? (
                  <button
                    type="button"
                    className="clr"
                    aria-label="Clear search"
                    onClick={() => setQ('')}
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>
              <div className="ie-fld">
                <label htmlFor="ie-cat">Category</label>
                <select
                  id="ie-cat"
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ie-fld">
                <label htmlFor="ie-win">Received</label>
                <select id="ie-win" value={win} onChange={(e) => setWin(e.target.value)}>
                  <option value="all">All time</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="month">This month</option>
                </select>
              </div>
              <div className="right">
                <span className="ie-chipnote">{cat ? `Filtered to ${cat}` : ''}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ie-btn-warning"
                  onClick={() => {
                    setTab('failed')
                    setPage(1)
                    handlePoll()
                  }}
                  disabled={polling}
                >
                  <RefreshCw size={13} />
                  Retry failed
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ie-btn-outline"
                  onClick={handleExport}
                  title="Downloads what is currently filtered"
                >
                  <Download size={13} />
                  Export
                </Button>
              </div>
            </div>

            <div className="ie-tblwrap">
              <table className="dx-table ie-table">
                <thead>
                  <tr>
                    <th style={{ width: 112 }}>
                      <button type="button" onClick={() => handleSort('when')}>
                        Received {sortIcon('when')}
                      </button>
                    </th>
                    <th style={{ width: 176 }}>
                      <button type="button" onClick={() => handleSort('cat')}>
                        Category {sortIcon('cat')}
                      </button>
                    </th>
                    <th style={{ width: 200 }}>
                      <button type="button" onClick={() => handleSort('vendor')}>
                        Vendor {sortIcon('vendor')}
                      </button>
                    </th>
                    <th>Subject &amp; references</th>
                    <th style={{ width: 212 }}>Attachments</th>
                    <th style={{ width: 170 }}>
                      <button type="button" onClick={() => handleSort('status')}>
                        Status {sortIcon('status')}
                      </button>
                    </th>
                    <th className="sticky" style={{ width: 104 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7}>
                          <Skeleton style={{ height: 14, margin: '8px 0' }} />
                        </td>
                      </tr>
                    ))
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="ie-empty">
                          <Inbox size={28} style={{ color: '#9ca3af' }} />
                          <p>No matching results</p>
                          <small>
                            {q.trim()
                              ? `Nothing matched “${q.trim()}”. Try adjusting the filters or search terms.`
                              : 'Nothing in this view for the selected period. Try All mail, or poll the mailbox again.'}
                          </small>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row, i) => {
                      const status = resolveDisplayStatus(row)
                      const stale = isRowStale(row, status)
                      const meta = ST_META[status] || ST_META.QUEUED
                      const cKey = categoryKey(row)
                      const cMeta = CAT_META[cKey] || CAT_META['—']
                      const refs = rowRefs(row)
                      const err = formatRowError(row, status)
                      const warn = status === 'PROCESSED' && Boolean(err)
                      const sev = warn ? 'sev-warn' : meta.sev
                      const ageLabel = formatStatusAge(computeStatusAgeMs(row))
                      const upd = fmtWhen(row.updatedAt || row.receivedAt)
                      const rec = fmtWhen(row.receivedAt || row.createdAt)
                      const linkedId = invoiceIdFor(row)
                      return (
                        <tr
                          key={row.inboundEmailId}
                          className={`${i % 2 === 1 ? 'zebra' : ''} ${sev} ${
                            selectedId === row.inboundEmailId ? 'sel' : ''
                          }`}
                          tabIndex={0}
                          onClick={() => setSelectedId(row.inboundEmailId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setSelectedId(row.inboundEmailId)
                          }}
                        >
                          <td className="ie-when">
                            <b>{rec.time}</b>
                            <span>{rec.day}</span>
                          </td>
                          <td>
                            <span className={`ie-badge ie-b-${cMeta.tone}`}>{cKey}</span>
                            <span className="ie-pipe">{cMeta.pipe}</span>
                          </td>
                          <td>
                            <span className="ie-vend" title={refs.vendor}>
                              {refs.vendor}
                            </span>
                          </td>
                          <td>
                            <div className="ie-refs">{renderRefs(row, status)}</div>
                            <span className="ie-raw" title={row.subject || ''}>
                              {row.subject || '—'}
                            </span>
                            {err ? (
                              <div
                                className={`ie-note ${
                                  status === 'FAILED' ||
                                  status === 'UNCORRELATED' ||
                                  status === 'INVALID_SUBJECT'
                                    ? 'err'
                                    : 'warn'
                                }`}
                              >
                                <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>{err}</span>
                              </div>
                            ) : null}
                          </td>
                          <td>{renderFiles(row)}</td>
                          <td>
                            <span className={`ie-badge ie-b-${stale ? 'error' : meta.tone}`}>
                              {stale ? 'Stalled' : meta.label}
                            </span>
                            <span className="ie-sub-time">
                              {status === 'PROCESSED' ? 'Saved' : 'Updated'} {upd.day}, {upd.time}
                              {ageLabel && (status === 'PENDING' || status === 'QUEUED')
                                ? ` · ${ageLabel}`
                                : ''}
                            </span>
                            {isIgnored(row) ? (
                              <span className="ie-ignored">
                                <Ban size={12} />
                                Retries stopped
                              </span>
                            ) : null}
                          </td>
                          <td className="sticky">
                            <span className="ie-rowacts" onClick={(e) => e.stopPropagation()}>
                              {ATTN_STATUSES.has(status) && !isIgnored(row) ? (
                                <button
                                  type="button"
                                  className="ie-act"
                                  title="Retry OCR (poll mailbox)"
                                  aria-label="Retry OCR"
                                  disabled={polling}
                                  onClick={handlePoll}
                                >
                                  <RefreshCw size={13} />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="ie-act"
                                title="Open details"
                                aria-label="Open details"
                                onClick={() => setSelectedId(row.inboundEmailId)}
                              >
                                <Eye size={13} />
                              </button>
                              {linkedId && status === 'PROCESSED' ? (
                                <Link
                                  to={invoicePath(linkedId)}
                                  className="ie-act"
                                  title="Open invoice"
                                  aria-label="Open invoice"
                                >
                                  <FileText size={13} />
                                </Link>
                              ) : null}
                              {canIgnoreRow(status) && !isIgnored(row) ? (
                                <button
                                  type="button"
                                  className="ie-act danger"
                                  title="Ignore — stop retries"
                                  aria-label="Ignore message"
                                  disabled={ignoringId === row.inboundEmailId || polling}
                                  onClick={() => handleIgnore(row)}
                                >
                                  {ignoringId === row.inboundEmailId ? (
                                    <Loader2 size={13} className="dx-spin" />
                                  ) : (
                                    <Ban size={13} />
                                  )}
                                </button>
                              ) : null}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="ie-pager">
              <TablePagination
                page={Math.min(page, totalPages)}
                totalPages={totalPages}
                total={filtered.length}
                pageSize={per}
                onPage={setPage}
                onPageSize={setPer}
                noun="messages"
              />
            </div>
          </Card>
        </div>
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected ? rowRefs(selected).vendor : '—'}
        width="max-w-xl"
        className="inbound-email-page"
        footer={
          selected ? (
            <>
              {invoiceIdFor(selected) && resolveDisplayStatus(selected) === 'PROCESSED' ? (
                <Link
                  to={invoicePath(invoiceIdFor(selected))}
                  className="dx-btn dx-btn-primary dx-btn-sm"
                >
                  Open {rowRefs(selected).inv || 'invoice'}
                </Link>
              ) : null}
              {ATTN_STATUSES.has(resolveDisplayStatus(selected)) && !isIgnored(selected) ? (
                <Button variant="ghost" size="sm" className="ie-btn-outline" onClick={handlePoll} disabled={polling}>
                  Retry OCR
                </Button>
              ) : null}
              {canIgnoreRow(resolveDisplayStatus(selected)) && !isIgnored(selected) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={ignoringId === selected.inboundEmailId || polling}
                  onClick={() => handleIgnore(selected)}
                >
                  Ignore message
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="ie-drawer-close"
                onClick={() => setSelectedId(null)}
              >
                Close
              </Button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="essa-dashboard inbound-email-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="ie-drawer-badges">
              <span className={`ie-badge ie-b-${ST_META[resolveDisplayStatus(selected)]?.tone || 'neutral'}`}>
                {ST_META[resolveDisplayStatus(selected)]?.label || resolveDisplayStatus(selected)}
              </span>
              <span className={`ie-badge ie-b-${(CAT_META[categoryKey(selected)] || CAT_META['—']).tone}`}>
                {categoryKey(selected)}
              </span>
              <span className="ie-chipnote mono">EM-{selected.inboundEmailId}</span>
            </div>
            {formatRowError(selected, resolveDisplayStatus(selected)) ? (
              <div
                className={`ie-note ${
                  ['FAILED', 'UNCORRELATED', 'INVALID_SUBJECT'].includes(resolveDisplayStatus(selected))
                    ? 'err'
                    : 'warn'
                }`}
                style={{ maxWidth: 'none' }}
              >
                <Info size={13} style={{ flexShrink: 0 }} />
                <span>{formatRowError(selected, resolveDisplayStatus(selected))}</span>
              </div>
            ) : null}
            <div className="ie-sec">
              <h3>Message</h3>
              <dl className="ie-kv">
                <dt>From</dt>
                <dd>
                  <span className="mono" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                    {selected.fromAddress || '—'}
                  </span>
                </dd>
                <dt>Received</dt>
                <dd>
                  {fmtWhen(selected.receivedAt).day}, {fmtWhen(selected.receivedAt).time}
                </dd>
                <dt>Last update</dt>
                <dd>
                  {fmtWhen(selected.updatedAt || selected.receivedAt).day},{' '}
                  {fmtWhen(selected.updatedAt || selected.receivedAt).time}
                </dd>
                <dt>Pipeline type</dt>
                <dd>{formatPipelineType(selected) || CAT_META[categoryKey(selected)]?.pipe || '—'}</dd>
              </dl>
            </div>
            <div className="ie-sec">
              <h3>Subject as received</h3>
              <div className="ie-rawbox">{selected.subject || '—'}</div>
            </div>
            <div className="ie-sec">
              <h3>References parsed</h3>
              <div className="ie-refs">{renderRefs(selected, resolveDisplayStatus(selected))}</div>
            </div>
            <div className="ie-sec">
              <h3>Attachments ({(selected.attachments || []).length})</h3>
              {(selected.attachments || []).length ? (
                <div className="ie-flist">
                  {(selected.attachments || []).map((f) => (
                    <div key={f.inboundAttachmentId || f.fileName} className="ie-frow">
                      <FileText size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                      <span className="nm">{f.fileName || f.attachmentId}</span>
                      <span className="ie-badge ie-b-neutral">PDF</span>
                      {f.fileSizeBytes ? <span className="sz">{fmtKb(f.fileSizeBytes)}</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: '#4b5563' }}>
                  None. Attachment-only processing — links to cloud storage are rejected.
                </p>
              )}
            </div>
            <div className="ie-sec">
              <h3>Pipeline</h3>
              <ul className="ie-steps">{pipelineSteps(selected)}</ul>
            </div>
          </div>
        ) : null}
      </Drawer>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaInboundEmails)
