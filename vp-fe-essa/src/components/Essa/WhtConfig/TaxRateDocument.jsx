import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Eye, FileSpreadsheet, History, Loader2, RotateCcw, Search, Trash2, Upload } from 'lucide-react'

import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Drawer } from '../ui/Drawer'
import { Dialog } from '../ui/Dialog'
import { showEssaErrorToast, showEssaSuccessToast } from '../lib/essaToast'
import {
  activateTaxRateVersion,
  deleteTaxRateVersion,
  downloadTaxRateVersion,
  getTaxRateVersion,
  listTaxRateVersions,
  uploadTaxRateDocument
} from 'api/whtConfig'
import { fmtBytes, fmtDateTime } from './options'

const ACCEPT = '.xlsx,.xls,.csv'
const MAX_MB = 10

/**
 * Tax Rate (treaty) document — read-only and version-controlled. The uploaded Excel is
 * the source of truth; the table only displays it. Each upload is a new version.
 */
export default function TaxRateDocument({ onChanged }) {
  const [doc, setDoc] = useState(null) // the version being shown
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [versions, setVersions] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [confirm, setConfirm] = useState(null) // { kind: 'delete'|'activate', version }
  const [busy, setBusy] = useState(false)

  const loadCurrent = useCallback(async () => {
    setLoading(true)
    try {
      setDoc(await getTaxRateVersion('current'))
      setLoadError('')
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadVersions = useCallback(async () => {
    try {
      setVersions(await listTaxRateVersions())
    } catch (err) {
      showEssaErrorToast('Version history', err.message)
    }
  }, [])

  useEffect(() => {
    loadCurrent()
    loadVersions()
  }, [loadCurrent, loadVersions])

  const view = async (version) => {
    setHistoryOpen(false)
    setLoading(true)
    try {
      setDoc(await getTaxRateVersion(version.id))
    } catch (err) {
      showEssaErrorToast('Could not open the version', err.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshAll = async () => {
    await Promise.all([loadCurrent(), loadVersions()])
    onChanged?.()
  }

  const doConfirm = async () => {
    setBusy(true)
    try {
      if (confirm.kind === 'activate') {
        await activateTaxRateVersion(confirm.version.id)
        showEssaSuccessToast('Version switched', `Version ${confirm.version.versionNo} is now the current Tax Rate document.`)
      } else {
        const res = await deleteTaxRateVersion(confirm.version.id)
        showEssaSuccessToast('Version deleted', res?.current ? `Version ${res.current.versionNo} is now current.` : 'No version is current now.')
      }
      setConfirm(null)
      await refreshAll()
    } catch (err) {
      showEssaErrorToast(confirm.kind === 'activate' ? 'Could not switch version' : 'Could not delete', err.message)
    } finally {
      setBusy(false)
    }
  }

  const countryCol = doc ? doc.columns.findIndex((c) => /^country$/i.test(c)) : -1
  const visible = useMemo(() => {
    if (!doc) return []
    const needle = search.trim().toLowerCase()
    return needle ? doc.rows.filter((r) => String(r[countryCol] || '').toLowerCase().includes(needle)) : doc.rows
  }, [doc, search, countryCol])

  const isOld = doc && !doc.isCurrent
  const current = versions.find((v) => v.isCurrent)

  return (
    <div className="wht-doc">
      <div className="wht-doc__head">
        <div className="wht-doc__meta">
          <FileSpreadsheet size={20} aria-hidden />
          {doc ? (
            <div>
              <div className="wht-doc__title">
                {doc.fileName}
                <Badge tone={doc.isCurrent ? 'success' : doc.isDeleted ? 'danger' : 'neutral'}>
                  {doc.isCurrent ? `Current · v${doc.versionNo}` : doc.isDeleted ? `Deleted · v${doc.versionNo}` : `Previous · v${doc.versionNo}`}
                </Badge>
              </div>
              <div className="wht-doc__sub">
                Sheet “{doc.sheetName}” · {doc.rowCount} countries · {fmtBytes(doc.fileSize)} · uploaded {fmtDateTime(doc.uploadedAt)}
                {doc.uploadedBy ? ` by ${doc.uploadedBy}` : ''}
                {doc.notes ? ` · ${doc.notes}` : ''}
              </div>
            </div>
          ) : (
            <div>
              <div className="wht-doc__title">Tax Rate document</div>
              <div className="wht-doc__sub">Read-only. Upload the Tax Treaty Rates Excel; each upload is kept as a version.</div>
            </div>
          )}
        </div>
        <div className="wht-doc__actions">
          {doc ? (
            <Button variant="secondary" onClick={() => downloadTaxRateVersion(doc.id, doc.fileName).catch((e) => showEssaErrorToast('Download', e.message))}>
              <Download size={14} /> Download
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => { loadVersions(); setHistoryOpen(true) }}>
            <History size={14} /> Version history{versions.length ? ` (${versions.length})` : ''}
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload size={14} /> Upload new version
          </Button>
        </div>
      </div>

      {isOld ? (
        <div className="wht-banner wht-banner--info" role="status">
          You are viewing version {doc.versionNo}{doc.isDeleted ? ' (deleted)' : ''}. Version {current?.versionNo ?? '—'} is current and is the one used for WHT determination.
          <span className="wht-banner__actions">
            {!doc.isDeleted ? (
              <Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: 'activate', version: doc })}>
                <RotateCcw size={13} /> Make this version current
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={loadCurrent}>Back to current</Button>
          </span>
        </div>
      ) : null}

      {doc ? (
        <div className="wht-toolbar wht-toolbar--plain">
          <span className="wht-search">
            <Search size={14} />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search country…" aria-label="Search country" />
          </span>
          <span className="wht-toolbar__spacer" />
          <span className="wht-count">{visible.length} of {doc.rows.length} countries · read-only</span>
        </div>
      ) : null}

      <div className="wht-table-wrap">
        {loading ? (
          <div className="wht-state"><Loader2 size={18} className="wht-spin" /> Loading the Tax Rate document…</div>
        ) : loadError ? (
          <div className="wht-state" role="alert">{loadError}</div>
        ) : !doc ? (
          <div className="wht-empty">
            <FileSpreadsheet size={28} aria-hidden />
            <p className="wht-empty__title">No Tax Rate document yet</p>
            <p>Upload the Tax Treaty Rates Excel (columns such as Country, Dividend, Interest, Royalties, Service / FTS Rate). Offshore rules read their treaty rate from it.</p>
            <Button onClick={() => setUploadOpen(true)}><Upload size={14} /> Upload Tax Rate document</Button>
          </div>
        ) : (
          <table className="wht-table wht-table--doc">
            <thead>
              <tr>{doc.columns.map((c, i) => <th key={`${c}-${i}`} className={i === countryCol ? 'is-sticky' : undefined}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {visible.length ? (
                visible.map((r, ri) => (
                  <tr key={`${r[countryCol]}-${ri}`}>
                    {doc.columns.map((c, i) => (
                      <td key={i} className={i === countryCol ? 'is-sticky wht-strong' : /notes|treatment|basis/i.test(c) ? 'is-wide' : 'is-nowrap'}>
                        {/notes|treatment|basis/i.test(c) && r[i] ? <span className="wht-clamp" title={r[i]}>{r[i]}</span> : r[i] || '—'}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={doc.columns.length}><div className="wht-state">No country matches “{search}”.</div></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <UploadDrawer open={uploadOpen} onClose={() => setUploadOpen(false)} nextVersion={(versions[0]?.versionNo || 0) + 1}
        onUploaded={async (v) => {
          setUploadOpen(false)
          showEssaSuccessToast('Uploaded', `Version ${v.versionNo} (${v.rowCount} countries) is now current.`)
          await refreshAll()
        }} />

      <Drawer open={historyOpen} onClose={() => setHistoryOpen(false)} title="Tax Rate document · version history" width="max-w-2xl">
        {versions.length ? (
          <ol className="wht-versions">
            {versions.map((v) => (
              <li key={v.id} className={v.isCurrent ? 'is-current' : v.isDeleted ? 'is-deleted' : undefined}>
                <div className="wht-versions__main">
                  <div className="wht-versions__title">
                    Version {v.versionNo}
                    {v.isCurrent ? <Badge tone="success">Current</Badge> : v.isDeleted ? <Badge tone="danger">Deleted</Badge> : <Badge tone="neutral">Previous</Badge>}
                  </div>
                  <div className="wht-versions__sub">{v.fileName} · {v.rowCount} countries · {fmtBytes(v.fileSize)}</div>
                  <div className="wht-versions__sub">Uploaded {fmtDateTime(v.uploadedAt)}{v.uploadedBy ? ` by ${v.uploadedBy}` : ''}{v.isDeleted ? ` · deleted ${fmtDateTime(v.deletedAt)}` : ''}</div>
                  {v.notes ? <div className="wht-versions__note">{v.notes}</div> : null}
                </div>
                <div className="wht-versions__actions">
                  <Button size="sm" variant="secondary" onClick={() => view(v)} aria-label={`View version ${v.versionNo}`}><Eye size={13} /> View</Button>
                  <Button size="sm" variant="secondary" onClick={() => downloadTaxRateVersion(v.id, v.fileName).catch((e) => showEssaErrorToast('Download', e.message))} aria-label={`Download version ${v.versionNo}`}><Download size={13} /></Button>
                  {!v.isCurrent && !v.isDeleted ? (
                    <Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: 'activate', version: v })}><RotateCcw size={13} /> Make current</Button>
                  ) : null}
                  {!v.isDeleted ? (
                    <Button size="sm" variant="ghost" className="wht-danger" onClick={() => setConfirm({ kind: 'delete', version: v })} aria-label={`Delete version ${v.versionNo}`}><Trash2 size={13} /></Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="wht-state">No versions uploaded yet.</div>
        )}
      </Drawer>

      <Dialog
        open={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        title={confirm?.kind === 'activate' ? `Make version ${confirm?.version.versionNo} current?` : `Delete version ${confirm?.version.versionNo}?`}
        description={
          confirm?.kind === 'activate'
            ? 'WHT determination will use this version’s treaty rates from now on. The other versions stay in the history.'
            : confirm?.version.isCurrent
              ? 'This is the current version. The most recent remaining version becomes current. The deleted version stays in the history and can still be viewed and downloaded.'
              : 'The version stays in the history as deleted and can still be viewed and downloaded.'
        }
        width={460}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button>
            <Button variant={confirm?.kind === 'activate' ? 'primary' : 'danger'} onClick={doConfirm} disabled={busy}>
              {busy ? 'Working…' : confirm?.kind === 'activate' ? 'Make current' : 'Delete'}
            </Button>
          </>
        }
      />
    </div>
  )
}

function UploadDrawer({ open, onClose, onUploaded, nextVersion }) {
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const input = useRef(null)

  useEffect(() => {
    if (open) {
      setFile(null)
      setNotes('')
      setError('')
      setBusy(false)
    }
  }, [open])

  const choose = (f) => {
    setError('')
    if (!f) return
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    if (!ACCEPT.split(',').includes(ext)) {
      setError(`“${f.name}” is not an Excel or CSV file.`)
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`“${f.name}” is larger than ${MAX_MB} MB.`)
      return
    }
    setFile(f)
  }

  const submit = async () => {
    if (!file) {
      setError('Choose a file first.')
      return
    }
    setBusy(true)
    setError('')
    try {
      onUploaded(await uploadTaxRateDocument(file, notes))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Drawer open={open} onClose={() => !busy && onClose()} title={`Upload Tax Rate document · version ${nextVersion}`} width="max-w-xl"
      footer={
        <div className="wht-drawer-footer">
          {error ? <span className="wht-form-error" role="alert">{error}</span> : <span />}
          <div className="wht-drawer-footer__actions">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy || !file}>{busy ? <><Loader2 size={14} className="wht-spin" /> Uploading…</> : 'Upload & set as current'}</Button>
          </div>
        </div>
      }>
      <div className="wht-form">
        <button
          type="button"
          className={`wht-drop${drag ? ' is-drag' : ''}${file ? ' has-file' : ''}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files?.[0]) }}
        >
          <FileSpreadsheet size={26} aria-hidden />
          {file ? (
            <span><b>{file.name}</b><br />{fmtBytes(file.size)} · click to choose another file</span>
          ) : (
            <span><b>Drop the Excel file here or click to browse</b><br />.xlsx, .xls or .csv · up to {MAX_MB} MB</span>
          )}
        </button>
        <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = '' }} />
        <ul className="wht-hints">
          <li>The sheet must have a <b>Country</b> column header (for example the “Tax Treaty Rates” sheet).</li>
          <li>The file is stored as-is and shown read-only; it is not edited in the app.</li>
          <li>The new version becomes current immediately. Earlier versions stay in the history and can be made current again.</li>
        </ul>
        <div className="wht-field is-wide">
          <label className="wht-field__label" htmlFor="wht-upload-notes">What changed (optional)</label>
          <Textarea id="wht-upload-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Updated Singapore royalty rate after treaty amendment" />
        </div>
      </div>
    </Drawer>
  )
}
