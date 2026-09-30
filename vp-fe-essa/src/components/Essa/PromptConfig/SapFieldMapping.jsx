import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Info, Pencil, Plus, Trash2 } from 'lucide-react'

import {
  createSapMapping,
  fetchInvoiceConfig,
  updateSapMapping
} from '../../../api/invoiceConfig'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { showEssaErrorToast, showEssaSuccessToast } from '../lib/essaToast'
import { INVOICE_CATEGORY_OPTIONS } from './invoiceConfigTabs'
import {
  TOLERANCE_HELP,
  TOLERANCE_PRESETS,
  VALIDATION_TYPE_HELP,
  VALIDATION_TYPES,
  emptySapMapping
} from './sapMappingData'

const PAGE_SIZE = 10

const apiErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Please try again.'

const toMappingRow = (mapping, category) => ({
  id: mapping.mappingId,
  mappingId: mapping.mappingId,
  category,
  capturedField: mapping.capturedField,
  description: mapping.description || '',
  sapField: mapping.sapField,
  sapFieldDescription: mapping.sapFieldDescription || '',
  validationType: mapping.validationType,
  tolerance: mapping.tolerance,
  mandatory: mapping.mandatory,
  status: mapping.status
})

const SapFieldMapping = ({ onViewRules }) => {
  const [category, setCategory] = useState('MANPOWER_SERVICES')
  const [versions, setVersions] = useState([])
  const [configVersionId, setConfigVersionId] = useState('')
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadConfig = async (typeCode, versionId) => {
    setLoading(true)
    try {
      const data = await fetchInvoiceConfig(typeCode, {
        configVersionId: versionId || undefined
      })
      const nextVersions = data?.versions || []
      const selected = data?.selectedVersion || null
      setVersions(nextVersions)
      setConfigVersionId(selected ? String(selected.configVersionId) : '')
      setRows((selected?.sapMappings || []).map((row) => toMappingRow(row, typeCode)))
      setPage(1)
    } catch (err) {
      setVersions([])
      setConfigVersionId('')
      setRows([])
      showEssaErrorToast('Could not load SAP mappings', apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig(category)
  }, [category])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const from = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const to = Math.min(safePage * PAGE_SIZE, rows.length)

  const openCreate = () => setEditor(emptySapMapping(category))
  const openEdit = (row) => setEditor({ ...row })

  const commitEditor = async () => {
    if (!editor || saving) return
    const capturedField = editor.capturedField.trim()
    const sapField = editor.sapField.trim()
    if (!capturedField || !sapField) return

    setSaving(true)
    try {
      const payload = {
        invoiceTypeCode: category,
        configVersionId: configVersionId || undefined,
        capturedField,
        description: editor.description.trim(),
        sapField,
        sapFieldDescription: editor.sapFieldDescription.trim(),
        validationType: editor.validationType,
        tolerance: editor.tolerance,
        mandatory: editor.mandatory,
        status: editor.status
      }
      let nextVersionId = configVersionId
      if (editor.mappingId || editor.id) {
        await updateSapMapping(editor.mappingId || editor.id, payload)
        showEssaSuccessToast('Mapping updated', `${capturedField} was saved.`)
      } else {
        const created = await createSapMapping(payload)
        if (created?.configVersion?.configVersionId) {
          nextVersionId = String(created.configVersion.configVersionId)
          setConfigVersionId(nextVersionId)
        }
        showEssaSuccessToast('Mapping created', `${capturedField} was saved.`)
      }
      setEditor(null)
      await loadConfig(category, nextVersionId)
    } catch (err) {
      showEssaErrorToast('Could not save mapping', apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete || saving) return
    setSaving(true)
    try {
      await updateSapMapping(pendingDelete.mappingId || pendingDelete.id, { isDeleted: true })
      showEssaSuccessToast('Mapping deleted', `${pendingDelete.capturedField} was removed.`)
      setPendingDelete(null)
      await loadConfig(category, configVersionId)
    } catch (err) {
      showEssaErrorToast('Could not delete mapping', apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleReload = () => loadConfig(category, configVersionId)

  return (
    <div className="ic-screen">
      <div className="ic-screen__body">
        <div className="ic-screen__head">
          <div>
            <h2>SAP Fields Mapping &amp; Validation</h2>
            <p>Map captured fields from invoice to SAP fields and define validation logic.</p>
          </div>
        </div>

        <div className="ic-toolbar">
          <label className="ic-field">
            <span>Invoice Category</span>
            <select
              className="dx-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}>
              {INVOICE_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="ic-field">
            <span>Version</span>
            <select
              className="dx-select"
              value={configVersionId}
              disabled={!versions.length}
              onChange={(e) => loadConfig(category, e.target.value)}>
              {versions.length === 0 ? (
                <option value="">No version yet</option>
              ) : (
                versions.map((ver) => (
                  <option key={ver.configVersionId} value={String(ver.configVersionId)}>
                    {ver.versionCode}
                    {ver.status === 'Active' ? ' (Active)' : ' (Inactive)'}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="ic-toolbar__actions">
            <Button variant="primary" onClick={openCreate} disabled={loading || saving}>
              <Plus size={14} />
              Add Mapping
            </Button>
            <Button variant="outline" onClick={onViewRules}>
              View Rules
            </Button>
          </div>
        </div>

        <div className="ic-table-wrap dx-table-wrap">
          <table className="dx-table ic-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Captured Field (From Invoice)</th>
                <th>Description</th>
                <th>Validation Type</th>
                <th>Validation Rules / Tolerance</th>
                <th>Mandatory</th>
                <th>Status</th>
                <th style={{ width: 88 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="ic-table__empty">
                    Loading mappings…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="ic-table__empty">
                    No mappings for this category yet. Add a mapping to get started.
                  </td>
                </tr>
              ) : (
                paged.map((row, index) => (
                  <tr key={row.id}>
                    <td>{(safePage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="ic-mono">{row.capturedField}</td>
                    <td>{row.description}</td>
                    <td>{row.validationType}</td>
                    <td>{row.tolerance}</td>
                    <td>
                      <span className={row.mandatory === 'Yes' ? 'ic-yes' : 'ic-no'}>
                        {row.mandatory}
                      </span>
                    </td>
                    <td>
                      <span className={`ic-status${row.status === 'Active' ? ' is-active' : ''}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div className="ic-row-actions">
                        <button
                          type="button"
                          className="ic-icon-btn"
                          title="Edit"
                          aria-label={`Edit ${row.capturedField}`}
                          onClick={() => openEdit(row)}>
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="ic-icon-btn is-danger"
                          title="Delete"
                          aria-label={`Delete ${row.capturedField}`}
                          onClick={() => setPendingDelete(row)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ic-pagination">
          <span>
            Showing {from} to {to} of {rows.length} entries
          </span>
          <div className="ic-pagination__controls">
            <button
              type="button"
              className="ic-page-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={14} />
              Previous
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`ic-page-btn${n === safePage ? ' is-active' : ''}`}
                onClick={() => setPage(n)}>
                {n}
              </button>
            ))}
            <button
              type="button"
              className="ic-page-btn"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
              Next
              <ChevronRight size={14} />
            </button>
            <span className="ic-page-size">{PAGE_SIZE} / page</span>
          </div>
        </div>

        <div className="ic-legend-grid">
          <section className="ic-legend">
            <h3>Validation Type</h3>
            <ol>
              {VALIDATION_TYPE_HELP.map((item) => (
                <li key={item.title}>
                  <b>{item.title}</b> — {item.text}
                </li>
              ))}
            </ol>
          </section>
          <section className="ic-legend">
            <h3>Validation Rules / Tolerance Examples</h3>
            <ol>
              {TOLERANCE_HELP.map((item) => (
                <li key={item.title}>
                  <b>{item.title}</b> — {item.text}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <div className="ic-screen__footer">
        <p className="ic-footnote">
          <Info size={14} />
          Add, edit, and delete save immediately to this config version and apply to new invoices.
        </p>
        <div className="ic-screen__footer-actions">
          <Button variant="ghost" onClick={handleReload} disabled={loading || saving}>
            Refresh
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        width={560}
        title={editor?.id ? 'Edit mapping' : 'Add mapping'}
        description="Map a captured invoice field to the corresponding SAP field."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditor(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={commitEditor}
              disabled={saving || !editor?.capturedField?.trim() || !editor?.sapField?.trim()}>
              {editor?.id ? 'Save mapping' : 'Add mapping'}
            </Button>
          </>
        }>
        {editor ? (
          <div className="ic-form">
            <label className="ic-field">
              <span>Captured field</span>
              <input
                className="dx-input ic-mono-input"
                value={editor.capturedField}
                placeholder="e.g. INV_NO"
                onChange={(e) => setEditor((prev) => ({ ...prev, capturedField: e.target.value }))}
              />
            </label>
            <label className="ic-field">
              <span>Description</span>
              <input
                className="dx-input"
                value={editor.description}
                placeholder="e.g. Invoice Number"
                onChange={(e) => setEditor((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <label className="ic-field">
              <span>SAP field</span>
              <input
                className="dx-input ic-mono-input"
                value={editor.sapField}
                placeholder="e.g. BKPF-XBLNR"
                onChange={(e) => setEditor((prev) => ({ ...prev, sapField: e.target.value }))}
              />
            </label>
            <label className="ic-field">
              <span>SAP field description</span>
              <input
                className="dx-input"
                value={editor.sapFieldDescription}
                placeholder="e.g. Reference Document"
                onChange={(e) =>
                  setEditor((prev) => ({ ...prev, sapFieldDescription: e.target.value }))
                }
              />
            </label>
            <label className="ic-field">
              <span>Validation type</span>
              <select
                className="dx-select"
                value={editor.validationType}
                onChange={(e) =>
                  setEditor((prev) => ({ ...prev, validationType: e.target.value }))
                }>
                {VALIDATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="ic-field">
              <span>Validation rules / tolerance</span>
              <select
                className="dx-select"
                value={editor.tolerance}
                onChange={(e) => setEditor((prev) => ({ ...prev, tolerance: e.target.value }))}>
                {TOLERANCE_PRESETS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="ic-form__row">
              <label className="ic-field">
                <span>Mandatory</span>
                <select
                  className="dx-select"
                  value={editor.mandatory}
                  onChange={(e) => setEditor((prev) => ({ ...prev, mandatory: e.target.value }))}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>
              <label className="ic-field">
                <span>Status</span>
                <select
                  className="dx-select"
                  value={editor.status}
                  onChange={(e) => setEditor((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => !saving && setPendingDelete(null)}
        width={440}
        title="Delete mapping?"
        description={
          pendingDelete
            ? `Remove “${pendingDelete.capturedField}” from this category version?`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={saving}>
              Delete mapping
            </Button>
          </>
        }>
        <p className="ic-dialog-copy">This permanently removes the mapping from this config version.</p>
      </Dialog>
    </div>
  )
}

export default SapFieldMapping
