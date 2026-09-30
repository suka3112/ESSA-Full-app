import { useEffect, useMemo, useRef, useState } from 'react'
import { connect } from 'react-redux'
import {
  Bold,
  CirclePlus,
  Copy,
  Eye,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  RotateCcw,
  Send,
  Table as TableIcon,
  Trash2,
  Underline,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import clsx from 'clsx'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'
import { Drawer } from '../ui/Drawer'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Tabs } from '../ui/Tabs'
import { FilterBar, FilterField, FilterSearch, ListWorkbench, SortTh, WorkbenchTable } from '../ui/listPage'
import { ADMIN_USER_TYPE } from 'constants/userType'
import { INVOICE_DASHBOARD, SLA_MANAGEMENT } from 'constants/url'
import { fmtDate } from 'api/essaDashboard'
import { showEssaErrorToast, showEssaSuccessToast } from '../lib/essaToast'
import { isSlaScenario, validateDraft } from '../lib/emailTemplatesStore'
import {
  createEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  getEmailTemplateDetail,
  listEmailTemplates,
  previewEmailTemplate,
  restoreEmailTemplateVersion,
  testEmailTemplate,
  updateEmailTemplate
} from 'api/emailTemplates'
import '../../../assets/scss/essa/dashboard.scss'

const emptyDraft = (scenario = '') => ({
  name: '',
  scenario,
  description: '',
  subject: '',
  bodyHtml: '<p></p>',
  to: '',
  cc: '',
  bcc: '',
  status: 'ACTIVE'
})

const draftOf = (t) => ({
  name: t.name,
  scenario: t.scenario,
  description: t.description || '',
  subject: t.subject,
  bodyHtml: t.bodyHtml,
  to: t.recipients.to,
  cc: t.recipients.cc || '',
  bcc: t.recipients.bcc || '',
  status: t.status
})

function RichTextEditor({ defaultValue, onChange, editorRef }) {
  const exec = (command, value) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }
  const insertLink = () => {
    const url = window.prompt('Link URL (https://…)')
    if (url) exec('createLink', url)
  }
  const insertTable = () => {
    exec(
      'insertHTML',
      '<table style="border-collapse:collapse;width:100%"><tbody>' +
      '<tr><td style="border:1px solid #d1d5db;padding:4px 8px">&nbsp;</td><td style="border:1px solid #d1d5db;padding:4px 8px">&nbsp;</td></tr>' +
      '<tr><td style="border:1px solid #d1d5db;padding:4px 8px">&nbsp;</td><td style="border:1px solid #d1d5db;padding:4px 8px">&nbsp;</td></tr>' +
      '</tbody></table><p></p>'
    )
  }
  const tools = [
    { icon: <Bold size={13} />, label: 'Bold', run: () => exec('bold') },
    { icon: <Italic size={13} />, label: 'Italic', run: () => exec('italic') },
    { icon: <Underline size={13} />, label: 'Underline', run: () => exec('underline') },
    { icon: <List size={13} />, label: 'Bulleted list', run: () => exec('insertUnorderedList') },
    { icon: <ListOrdered size={13} />, label: 'Numbered list', run: () => exec('insertOrderedList') },
    { icon: <Link2 size={13} />, label: 'Insert link', run: insertLink },
    { icon: <TableIcon size={13} />, label: 'Insert table', run: insertTable }
  ]
  return (
    <div className="overflow-hidden rounded-md border border-line focus-within:border-essa-600">
      <div className="flex items-center gap-0.5 border-b border-line-soft bg-canvas px-1.5 py-1">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.label}
            aria-label={t.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.run}
            className="rounded p-1.5 text-ink-secondary hover:bg-line-soft"
          >
            {t.icon}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        className="min-h-[160px] max-h-72 overflow-y-auto px-3 py-2 text-sm text-ink outline-none [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: defaultValue }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-ink-secondary">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-2xs text-ink-muted">{hint}</span> : null}
    </label>
  )
}

function Tooltip({ text, children }) {
  if (!text) return children
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-2xs text-white shadow-pop group-hover/tooltip:block"
      >
        {text}
      </span>
    </span>
  )
}

function NativeSelect({ className, ...props }) {
  return <select className={clsx('dx-select', className)} {...props} />
}

function parsePreviewRef(raw) {
  const v = String(raw || '').trim()
  if (!v) return {}
  if (/^i-\d+$/i.test(v)) return { instanceId: v }
  if (/^\d+$/.test(v)) return { invoiceId: v }
  return { invoiceNumber: v }
}

function EmailLivePreview({
  scenario,
  subject,
  bodyHtml,
  to,
  cc,
  bcc,
  contextValue,
  onContextChange,
  autoFetch
}) {
  const [rendered, setRendered] = useState({ subject: subject || '', html: bodyHtml || '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!autoFetch) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const result = await previewEmailTemplate({
          scenario,
          subject,
          bodyHtml,
          ...parsePreviewRef(contextValue)
        })
        if (!cancelled) {
          setRendered({
            subject: result.subject || subject || '',
            html: result.html || bodyHtml || ''
          })
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Preview could not be rendered.')
          setRendered({ subject: subject || '', html: bodyHtml || '' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [autoFetch, scenario, subject, bodyHtml, contextValue])

  return (
    <div className="space-y-2 text-sm">
      <Field
        label="Invoice or SLA instance"
        hint="Invoice number, invoice id, or SLA instance id (i-123). Unresolved {{tokens}} stay as written."
      >
        <Input
          value={contextValue}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder="e.g. INV-10021 or i-123"
        />
      </Field>
      {loading ? <p className="mb-0 text-2xs text-ink-muted">Rendering from a real invoice / instance…</p> : null}
      {error ? <p className="mb-0 text-2xs text-red-700">{error}</p> : null}
      <p className="text-xs text-ink-muted">
        To: <span className="text-ink-secondary">{to || '—'}</span>
        {cc ? (
          <>
            {' '}
            · CC: <span className="text-ink-secondary">{cc}</span>
          </>
        ) : null}
        {bcc ? (
          <>
            {' '}
            · BCC: <span className="text-ink-secondary">{bcc}</span>
          </>
        ) : null}
      </p>
      <p className="border-b border-line-soft pb-2 font-semibold text-ink">
        {rendered.subject || <span className="font-normal text-ink-faint">Subject preview…</span>}
      </p>
      <div
        className="min-h-[48px] [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: rendered.html || '' }}
      />
    </div>
  )
}

function VersionHistory({ template, canEdit, onRestored }) {
  const [data, setData] = useState({ template: null, versions: [] })
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    getEmailTemplateDetail(template.id).then((result) => {
      if (!cancelled) setData(result)
    })
    return () => {
      cancelled = true
    }
  }, [template.id, template.version])

  const restore = async (versionId) => {
    setPending(true)
    try {
      await restoreEmailTemplateVersion(template.id, versionId)
      setData(await getEmailTemplateDetail(template.id))
      showEssaSuccessToast(
        'Version restored',
        'The template now carries the restored content as a new version.'
      )
      onRestored?.()
    } catch (e) {
      showEssaErrorToast('Could not restore the version', e.message)
    } finally {
      setPending(false)
    }
  }

  const versions = data.versions || []
  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-muted">
        Every save creates a new version. Restoring an older version applies its content as a new
        version — nothing is lost.
      </p>
      <ul className="divide-y divide-line-soft rounded-md border border-line">
        {versions.map((v, i) => (
          <li key={v.id} className="flex items-start gap-3 px-3 py-2.5">
            <Badge tone={v.action === 'CREATED' || v.action === 'DUPLICATED' ? 'validated' : 'success'} dot={false}>
              v{v.version}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink">
                {v.action.charAt(0) + v.action.slice(1).toLowerCase()}
                {v.note ? <span className="font-normal text-ink-muted"> — {v.note}</span> : null}
              </p>
              <p className="mt-0.5 truncate text-2xs text-ink-muted">Subject: {v.snapshot.subject}</p>
              <p className="mt-0.5 text-2xs text-ink-faint">
                {fmtDate(v.changedAt)} · {v.changedBy}
              </p>
            </div>
            {canEdit && i > 0 && (
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => restore(v.id)}>
                <RotateCcw size={12} /> Restore
              </Button>
            )}
          </li>
        ))}
        {versions.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-ink-muted">No versions recorded yet.</li>
        )}
      </ul>
    </div>
  )
}

function EditorDrawer({ open, onClose, editing, scenarios, canEdit, actor, onSaved }) {
  const [tab, setTab] = useState('edit')
  const [draft, setDraft] = useState(emptyDraft())
  const [showProblems, setShowProblems] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewRef, setPreviewRef] = useState('')
  const bodyRef = useRef(null)
  const subjectRef = useRef(null)
  const lastFocus = useRef('body')

  useEffect(() => {
    if (!open) return
    setTab('edit')
    setShowProblems(false)
    setPreviewRef('')
    setDraft(editing ? draftOf(editing) : emptyDraft(scenarios[0]?.key || ''))
  }, [open, editing, scenarios])

  const scenario = scenarios.find((s) => s.key === draft.scenario)
  const slaScenario = isSlaScenario(draft.scenario)
  const problems = validateDraft(draft, scenario)
  const draftKey = `${editing?.id || 'new'}:${open}`

  const insertVariable = (name) => {
    const token = `{{${name}}}`
    if (lastFocus.current === 'subject' && subjectRef.current) {
      const el = subjectRef.current
      const start = el.selectionStart ?? draft.subject.length
      const end = el.selectionEnd ?? start
      const next = draft.subject.slice(0, start) + token + draft.subject.slice(end)
      setDraft((d) => ({ ...d, subject: next }))
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start + token.length, start + token.length)
      })
    } else if (bodyRef.current) {
      bodyRef.current.focus()
      document.execCommand('insertText', false, token)
      setDraft((d) => ({ ...d, bodyHtml: bodyRef.current?.innerHTML || d.bodyHtml }))
    }
  }

  const save = async () => {
    if (problems.length) {
      setShowProblems(true)
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: draft.name,
        scenario: draft.scenario,
        description: draft.description,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        status: draft.status,
        recipients: { to: draft.to, cc: draft.cc || undefined, bcc: draft.bcc || undefined }
      }
      if (editing) await updateEmailTemplate(editing.id, payload, actor)
      else await createEmailTemplate(payload, actor)
      showEssaSuccessToast(editing ? 'Template saved' : 'Template created', draft.name)
      onSaved()
      onClose()
    } catch (e) {
      showEssaErrorToast('Could not save the template', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-4xl"
      title={editing ? (canEdit ? `Edit template — ${editing.name}` : editing.name) : 'New email template'}
      footer={
        canEdit && tab !== 'history' ? (
          <>
            <Button
              variant="ghost"
              onClick={onClose}
              className="!border-transparent !bg-transparent !shadow-none hover:!bg-line-soft">
              Cancel
            </Button>
            <Button disabled={saving} onClick={save} className="!rounded-md !bg-essa-600 hover:!bg-essa-700">
              {editing ? 'Save changes' : 'Create template'}
            </Button>
          </>
        ) : null
      }
    >
      {editing && (
        <div className="-mt-1 mb-3">
          <Tabs
            tabs={[
              { value: 'edit', label: canEdit ? 'Edit' : 'Details' },
              { value: 'history', label: 'Version history' }
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      )}
      {tab === 'history' && editing ? (
        <VersionHistory template={editing} canEdit={canEdit} onRestored={onSaved} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Template name" required>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Approval requested"
                disabled={!canEdit}
              />
            </Field>
            <Field
              label="Scenario / event"
              required
              hint={editing?.system ? 'Built-in templates stay bound to their scenario.' : undefined}
            >
              <NativeSelect
                value={draft.scenario}
                onChange={(e) => setDraft((d) => ({ ...d, scenario: e.target.value }))}
                disabled={!canEdit || Boolean(editing?.system)}
              >
                {scenarios.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          {scenario && <p className="-mt-2 text-2xs text-ink-muted">{scenario.description}</p>}
          <div className="grid gap-3 md:grid-cols-3">
            <Field
              label="To"
              required={!slaScenario}
              hint={
                slaScenario
                  ? 'Resolved at runtime from the SLA rule.'
                  : 'Audience the platform resolves for this scenario.'
              }
            >
              <Input value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="CC">
              <Input value={draft.cc} onChange={(e) => setDraft((d) => ({ ...d, cc: e.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="BCC">
              <Input value={draft.bcc} onChange={(e) => setDraft((d) => ({ ...d, bcc: e.target.value }))} disabled={!canEdit} />
            </Field>
          </div>
          <Field label="Subject" required>
            <input
              ref={subjectRef}
              value={draft.subject}
              onFocus={() => {
                lastFocus.current = 'subject'
              }}
              onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
              placeholder="e.g. Approval requested: {{invoiceNumber}}"
              disabled={!canEdit}
              className="dx-input"
            />
          </Field>
          {scenario && (
            <div className="rounded-md border border-line-soft bg-canvas px-3 py-2">
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                Available variables — click to insert
              </p>
              <div className="flex flex-wrap gap-1.5">
                {scenario.variables.map((v) => (
                  <Tooltip key={v.name} text={v.label}>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => insertVariable(v.name)}
                      className="et-var-chip rounded-full border border-essa-200 bg-essa-50 px-2 py-0.5 text-2xs leading-none text-essa-700 hover:bg-essa-100 disabled:cursor-default"
                    >
                      {'{{'}
                      {v.name}
                      {'}}'}
                      {v.required ? <span className="ml-0.5 text-red-600">*</span> : null}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
          <Field label="Email body" required>
            {canEdit ? (
              <div
                onFocusCapture={() => {
                  lastFocus.current = 'body'
                }}
              >
                <RichTextEditor
                  key={draftKey}
                  defaultValue={draft.bodyHtml}
                  editorRef={bodyRef}
                  onChange={(html) => setDraft((d) => ({ ...d, bodyHtml: html }))}
                />
              </div>
            ) : (
              <div
                className="rounded-md border border-line bg-canvas px-3 py-2 text-sm"
                dangerouslySetInnerHTML={{ __html: draft.bodyHtml }}
              />
            )}
          </Field>
          <div className="grid md:grid-cols-2 gap-3">
            <Field
              label="Status"
              hint={
                draft.status === 'INACTIVE'
                  ? 'Inactive: the scenario falls back to its built-in default content.'
                  : undefined
              }
            >
              <Select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                disabled={!canEdit}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </Field>
          </div>

          <Card title="Live preview — as it will be sent">
            <EmailLivePreview
              autoFetch={open && tab === 'edit'}
              scenario={draft.scenario}
              subject={draft.subject}
              bodyHtml={draft.bodyHtml}
              to={slaScenario ? draft.to || 'Resolved at runtime from the SLA rule' : draft.to}
              cc={draft.cc}
              bcc={draft.bcc}
              contextValue={previewRef}
              onContextChange={setPreviewRef}
            />
          </Card>

          {showProblems && problems.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-red-700">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

function EssaEmailTemplates({ userType, userName }) {
  const canEdit = userType === ADMIN_USER_TYPE
  const actor = userName || 'Admin'
  const [tick, setTick] = useState(0)
  const [data, setData] = useState({ items: [], scenarios: [] })
  const refresh = () => setTick((n) => n + 1)

  useEffect(() => {
    let cancelled = false
    listEmailTemplates().then((result) => {
      if (!cancelled) setData(result || { items: [], scenarios: [] })
    })
    return () => {
      cancelled = true
    }
  }, [tick])

  const [search, setSearch] = useState('')
  const [scenarioFilter, setScenarioFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [drawer, setDrawer] = useState({ open: false, editing: null })
  const [preview, setPreview] = useState(null)
  const [previewRef, setPreviewRef] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmTest, setConfirmTest] = useState(null)

  const templates = data.items
  const scenarios = data.scenarios
  const scenarioLabel = (key) => scenarios.find((s) => s.key === key)?.label || key

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = templates.filter(
      (row) =>
        (!scenarioFilter || row.scenario === scenarioFilter) &&
        (!statusFilter || row.status === statusFilter) &&
        (!q ||
          [row.name, scenarioLabel(row.scenario), row.subject, row.recipients.to, row.updatedBy].some((v) =>
            (v || '').toLowerCase().includes(q)
          ))
    )
    const dir = sortDir === 'asc' ? 1 : -1
    const valueOf = (row) => {
      if (sortKey === 'scenario') return scenarioLabel(row.scenario)
      if (sortKey === 'to') return row.recipients.to
      if (sortKey === 'updatedAt') return row.updatedAt
      return row[sortKey] || ''
    }
    return [...rows].sort((a, b) => String(valueOf(a)).localeCompare(String(valueOf(b))) * dir)
  }, [templates, scenarios, search, scenarioFilter, statusFilter, sortKey, sortDir])

  useEffect(() => {
    setPage(1)
  }, [search, scenarioFilter, statusFilter, pageSize, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const iconBtn =
    'rounded p-0.5 text-ink-muted hover:bg-line-soft hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <LeftPageContainer className="essa-invoices-shell">
      <div className="essa-dashboard essa-invoices-page email-templates-page">
        <div className="dx-page dx-page--invoices-fit">
          <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${ADMIN_USER_TYPE}${INVOICE_DASHBOARD}` },
              { label: 'Administration', to: `/${ADMIN_USER_TYPE}${SLA_MANAGEMENT}` },
              { label: 'Email Templates' }
            ]}
            title="Email Templates"
            description="Every email the platform sends — approvals, exceptions, rejections, reminders, configuration notices — renders from these templates. The active template for a scenario is what the system sends; an inactive one falls back to the built-in default."
            actions={
              canEdit ? (
                <Button onClick={() => setDrawer({ open: true, editing: null })}>
                  <CirclePlus size={14} /> New template
                </Button>
              ) : null
            }
          />

          <ListWorkbench>
            <FilterBar className="dx-invoices-filters border-b border-line-soft gap-x-4 gap-y-2">
              <FilterField label="Search">
                <FilterSearch
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, scenario, subject or recipient"
                  className="dx-et-search-input"
                  aria-label="Search email templates"
                />
              </FilterField>
              <FilterField label="Scenario">
                <NativeSelect
                  value={scenarioFilter}
                  onChange={(e) => setScenarioFilter(e.target.value)}
                  aria-label="Scenario filter"
                  className="w-[200px]"
                >
                  <option value="">All scenarios</option>
                  {scenarios.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
              </FilterField>
              <FilterField label="Status">
                <NativeSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Status filter"
                  className="w-[160px]"
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </NativeSelect>
              </FilterField>
              <span className="mb-1 ml-auto text-[11px] leading-none text-ink-muted">
                {filtered.length} of {templates.length} templates
              </span>
            </FilterBar>

            <WorkbenchTable className="email-templates-table">
              <thead>
                <tr>
                  <SortTh col="name" sortKey={sortKey} onSort={toggleSort}>Template Name</SortTh>
                  <SortTh col="scenario" sortKey={sortKey} onSort={toggleSort}>Scenario / Event</SortTh>
                  <SortTh col="subject" sortKey={sortKey} onSort={toggleSort}>Subject</SortTh>
                  <SortTh col="to" sortKey={sortKey} onSort={toggleSort}>To</SortTh>
                  <SortTh col="status" sortKey={sortKey} onSort={toggleSort}>Status</SortTh>
                  <SortTh col="updatedAt" sortKey={sortKey} onSort={toggleSort}>Last Updated</SortTh>
                  <SortTh col="updatedBy" sortKey={sortKey} onSort={toggleSort}>Updated By</SortTh>
                  <th style={{ fontWeight: 700, letterSpacing: '0.5px', fontSize: '10px', textTransform: 'uppercase' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-ink-muted">
                      No template matches.
                    </td>
                  </tr>
                )}
                {pageRows.map((row, index) => (
                  <tr key={row.id} className={index % 2 === 1 ? 'et-row-alt' : undefined}>
                    <td>
                      <p className="m-0 text-[12px] font-bold leading-tight text-ink">{row.name}</p>
                      <span className="text-[10px] font-normal leading-tight text-ink-faint">
                        {row.system ? 'Built-in scenario template' : 'Custom template'}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex whitespace-nowrap rounded border border-sky-200 bg-sky-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-sky-700">
                        {scenarioLabel(row.scenario)}
                      </span>
                    </td>
                    <td>
                      <span className="line-clamp-2 max-w-[280px] text-[12px] font-normal text-ink">{row.subject}</span>
                    </td>
                    <td>
                      <span className="text-[12px] font-normal text-ink">
                        {isSlaScenario(row.scenario)
                          ? row.recipients.to || 'Resolved at runtime'
                          : row.recipients.to}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          row.status === 'ACTIVE'
                            ? 'inline-flex rounded border border-[#b3e0bd] bg-[#e8f6eb] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#247a35]'
                            : 'inline-flex rounded border border-[#e5e7eb] bg-[#f3f4f6] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#4b5563]'
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <span className="whitespace-nowrap text-[12px] font-normal text-ink">{fmtDate(row.updatedAt)}</span>
                    </td>
                    <td>
                      <span className="text-[12px] font-normal text-ink">{row.updatedBy}</span>
                    </td>
                    <td className="et-actions-cell">
                      <div className="flex items-center gap-0.5 whitespace-nowrap">
                        <button
                          type="button"
                          title={canEdit ? 'Edit' : 'View'}
                          aria-label={`Edit ${row.name}`}
                          className={iconBtn}
                          onClick={() => setDrawer({ open: true, editing: row })}
                        >
                          {canEdit ? <Pencil size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          type="button"
                          title="Preview"
                          aria-label={`Preview ${row.name}`}
                          className={iconBtn}
                          onClick={() => {
                            setPreviewRef('')
                            setPreview(row)
                          }}
                        >
                          <Eye size={13} />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              title="Duplicate"
                              aria-label={`Duplicate ${row.name}`}
                              className={iconBtn}
                              onClick={async () => {
                                try {
                                  const copy = await duplicateEmailTemplate(row.id, actor)
                                  refresh()
                                  showEssaSuccessToast(
                                    'Template duplicated',
                                    `"${copy?.name || `${row.name} (copy)`}" created as Inactive — edit and activate it when ready.`
                                  )
                                } catch (e) {
                                  showEssaErrorToast('Could not duplicate', e.message)
                                }
                              }}
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              type="button"
                              title="Send a test email to yourself"
                              aria-label={`Test ${row.name}`}
                              className={iconBtn}
                              onClick={() => setConfirmTest(row)}
                            >
                              <Send size={13} />
                            </button>
                            <button
                              type="button"
                              title={
                                row.system
                                  ? 'Built-in templates cannot be deleted — deactivate instead'
                                  : 'Delete'
                              }
                              aria-label={`Delete ${row.name}`}
                              className={iconBtn}
                              disabled={row.system}
                              onClick={() => setConfirmDelete(row)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </WorkbenchTable>

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-4 py-2.5">
                <span className="text-2xs text-ink-muted">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <NativeSelect value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n} / page
                      </option>
                    ))}
                  </NativeSelect>
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </ListWorkbench>
        </div>
      </div >

      <EditorDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        editing={drawer.editing}
        scenarios={scenarios}
        canEdit={canEdit}
        actor={actor}
        onSaved={refresh}
      />

      <Dialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={`Preview — ${preview?.name || ''}`}
        width={720}
      >
        {preview && (
          <EmailLivePreview
            autoFetch={Boolean(preview)}
            scenario={preview.scenario}
            subject={preview.subject}
            bodyHtml={preview.bodyHtml}
            to={
              isSlaScenario(preview.scenario)
                ? preview.recipients.to || 'Resolved at runtime from the SLA rule'
                : preview.recipients.to
            }
            cc={preview.recipients.cc}
            bcc={preview.recipients.bcc}
            contextValue={previewRef}
            onContextChange={setPreviewRef}
          />
        )}
      </Dialog>

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete this template?"
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await deleteEmailTemplate(confirmDelete.id)
                  refresh()
                  showEssaSuccessToast('Template deleted')
                  setConfirmDelete(null)
                } catch (e) {
                  showEssaErrorToast('Could not delete', e.message)
                }
              }}
            >
              Delete template
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-secondary">
          “{confirmDelete?.name}” will be removed. Its version history stays in the audit trail. This cannot
          be undone.
        </p>
      </Dialog>

      <Dialog
        open={Boolean(confirmTest)}
        onClose={() => setConfirmTest(null)}
        title="Send a test email?"
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmTest(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const result = await testEmailTemplate(confirmTest.id)
                  if (result?.previewUrl) {
                    window.open(result.previewUrl, '_blank', 'noopener,noreferrer')
                  }
                  showEssaSuccessToast(
                    'Test email sent',
                    result?.previewUrl
                      ? `Opened a local preview (Daikin SMTP is not reachable here). To: ${result?.to || 'you'}`
                      : `Sent to ${result?.to || 'you'} — marked [TEST].`
                  )
                  setConfirmTest(null)
                } catch (e) {
                  showEssaErrorToast('Could not send test email', e.message)
                }
              }}
            >
              Send test
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-secondary">
          “{confirmTest?.name}” will be sent exactly as saved to the template To address and to your login
          email, marked [TEST].
        </p>
      </Dialog>
    </LeftPageContainer >
  )
}

const mapStateToProps = (state) => ({
  userType: state.userInfo?.userType,
  userName: state.userInfo?.name || state.userInfo?.fullName
})

export default connect(mapStateToProps)(EssaEmailTemplates)
