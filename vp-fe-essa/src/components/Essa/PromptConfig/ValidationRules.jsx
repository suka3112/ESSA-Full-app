import { useEffect, useMemo, useState } from 'react'
import { Info, Pencil, Plus, Search, Trash2 } from 'lucide-react'

import {
  createValidationRule,
  fetchInvoiceConfig,
  updateValidationRule
} from '../../../api/invoiceConfig'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { showEssaErrorToast, showEssaSuccessToast } from '../lib/essaToast'
import { INVOICE_CATEGORY_LABEL, INVOICE_CATEGORY_OPTIONS } from './invoiceConfigTabs'
import {
  CHECK_SCOPES,
  MISSING_ACTIONS,
  RULE_LOGIC_HELP,
  emptyValidationRule
} from './validationRulesData'

const apiErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Please try again.'

const toRuleRow = (rule, category) => ({
  id: rule.ruleId,
  ruleId: rule.ruleId,
  category,
  categoryLabel: INVOICE_CATEGORY_LABEL[category] || rule.categoryLabel || category,
  documentTitle: rule.documentTitle,
  ruleName: rule.ruleName,
  ruleCode: rule.ruleCode,
  checkScope: rule.checkScope,
  mandatory: rule.mandatory,
  missingAction: rule.missingAction,
  contentValidation: rule.contentValidation,
  workflowImpact: rule.workflowImpact,
  workflowImpactDetail: rule.workflowImpactDetail,
  status: rule.status
})

const ValidationRules = () => {
  const [category, setCategory] = useState('MANPOWER_SERVICES')
  const [versions, setVersions] = useState([])
  const [configVersionId, setConfigVersionId] = useState('')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [selectedId, setSelectedId] = useState(null)
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
      const nextRows = (selected?.documentRules || []).map((row) => toRuleRow(row, typeCode))
      setVersions(nextVersions)
      setConfigVersionId(selected ? String(selected.configVersionId) : '')
      setRows(nextRows)
      setSelectedId((prev) =>
        nextRows.some((row) => row.id === prev) ? prev : nextRows[0]?.id || null
      )
    } catch (err) {
      setVersions([])
      setConfigVersionId('')
      setRows([])
      setSelectedId(null)
      showEssaErrorToast('Could not load validation rules', apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig(category)
  }, [category])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (!q) return true
      return (
        row.ruleName.toLowerCase().includes(q) || row.documentTitle.toLowerCase().includes(q)
      )
    })
  }, [rows, query])

  const selected = filtered.find((row) => row.id === selectedId) || filtered[0] || null

  const openCreate = () => setEditor(emptyValidationRule(category))
  const openEdit = (row) => setEditor({ ...row })

  const commitEditor = async () => {
    if (!editor || saving) return
    const ruleName = editor.ruleName.trim()
    const documentTitle = editor.documentTitle.trim()
    if (!ruleName || !documentTitle) return

    setSaving(true)
    try {
      const payload = {
        invoiceTypeCode: editor.category || category,
        configVersionId: configVersionId || undefined,
        documentTitle,
        ruleName,
        checkScope: editor.checkScope,
        mandatory: editor.mandatory,
        missingAction: editor.missingAction,
        contentValidation: editor.contentValidation,
        workflowImpact: editor.workflowImpact,
        workflowImpactDetail:
          editor.missingAction === 'Block'
            ? 'Create exception and block workflow until uploaded.'
            : editor.workflowImpactDetail || 'Create exception',
        status: editor.status
      }
      let nextVersionId = configVersionId
      if (editor.ruleId || editor.id) {
        await updateValidationRule(editor.ruleId || editor.id, payload)
        showEssaSuccessToast('Rule updated', `${ruleName} was saved.`)
      } else {
        const created = await createValidationRule(payload)
        if (created?.configVersion?.configVersionId) {
          nextVersionId = String(created.configVersion.configVersionId)
          setConfigVersionId(nextVersionId)
        }
        showEssaSuccessToast('Rule created', `${ruleName} was saved.`)
      }
      setEditor(null)
      await loadConfig(payload.invoiceTypeCode, nextVersionId)
      if (payload.invoiceTypeCode !== category) {
        setCategory(payload.invoiceTypeCode)
      }
    } catch (err) {
      showEssaErrorToast('Could not save rule', apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (row) => {
    if (saving) return
    const nextStatus = row.status === 'Active' ? 'Inactive' : 'Active'
    setSaving(true)
    try {
      await updateValidationRule(row.ruleId || row.id, { status: nextStatus })
      await loadConfig(category, configVersionId)
    } catch (err) {
      showEssaErrorToast('Could not update status', apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete || saving) return
    setSaving(true)
    try {
      await updateValidationRule(pendingDelete.ruleId || pendingDelete.id, { isDeleted: true })
      showEssaSuccessToast('Rule deleted', `${pendingDelete.ruleName} was removed.`)
      setPendingDelete(null)
      await loadConfig(category, configVersionId)
    } catch (err) {
      showEssaErrorToast('Could not delete rule', apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ic-screen">
      <div className="ic-screen__body">
        <div className="ic-toolbar ic-toolbar--rules">
          <label className="ic-field">
            <span>Invoice Category</span>
            <select
              className="dx-select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setSelectedId(null)
              }}>
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
          <label className="ic-search">
            <Search size={14} />
            <input
              type="search"
              value={query}
              placeholder="Search by Rule Name or Document Title"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="ic-toolbar__actions">
            <Button variant="outline" onClick={openCreate} disabled={loading || saving}>
              <Plus size={14} />
              Add Rule
            </Button>
          </div>
        </div>

        <div className="ic-table-wrap dx-table-wrap">
          <table className="dx-table ic-table ic-table--rules">
            <thead>
              <tr>
                <th style={{ width: 56 }}>Sr No.</th>
                <th>Invoice Category</th>
                <th>Document Title</th>
                <th>Rule Name</th>
                <th>Check Scope</th>
                <th>Mandatory</th>
                <th>Missing Document Action</th>
                <th>Content Validation</th>
                <th>Workflow Impact</th>
                <th>Status</th>
                <th style={{ width: 88 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="ic-table__empty">
                    Loading validation rules…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="ic-table__empty">
                    No validation rules for this category yet. Add a rule to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((row, index) => {
                  const isSelected = selected?.id === row.id
                  return (
                    <tr
                      key={row.id}
                      className={isSelected ? 'is-selected' : ''}
                      onClick={() => setSelectedId(row.id)}>
                      <td>{index + 1}</td>
                      <td>{row.categoryLabel}</td>
                      <td>{row.documentTitle}</td>
                      <td>{row.ruleName}</td>
                      <td>
                        <span
                          className={`ic-scope${
                            row.checkScope === 'Availability Only' ? ' is-avail' : ''
                          }`}>
                          {row.checkScope}
                        </span>
                      </td>
                      <td>
                        <span className={row.mandatory === 'Yes' ? 'ic-yes' : 'ic-no'}>
                          {row.mandatory}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`ic-action${
                            row.missingAction === 'Block' ? ' is-block' : ' is-warning'
                          }`}>
                          {row.missingAction}
                        </span>
                      </td>
                      <td>
                        <span className={row.contentValidation === 'Yes' ? 'ic-yes' : 'ic-no'}>
                          {row.contentValidation}
                        </span>
                      </td>
                      <td>{row.workflowImpact}</td>
                      <td>
                        <label
                          className="ic-switch"
                          onClick={(e) => e.stopPropagation()}
                          title={row.status}>
                          <input
                            type="checkbox"
                            checked={row.status === 'Active'}
                            disabled={saving}
                            onChange={() => toggleStatus(row)}
                          />
                          <span className="ic-switch__track">
                            <span className="ic-switch__thumb" />
                          </span>
                          <span className="ic-switch__label">
                            {row.status === 'Active' ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      </td>
                      <td>
                        <div className="ic-row-actions">
                          <button
                            type="button"
                            className="ic-icon-btn"
                            title="Edit"
                            aria-label={`Edit ${row.ruleName}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              openEdit(row)
                            }}>
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className="ic-icon-btn is-danger"
                            title="Delete"
                            aria-label={`Delete ${row.ruleName}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPendingDelete(row)
                            }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="ic-legend-grid">
          <section className="ic-legend">
            <h3>Rule Logic</h3>
            {RULE_LOGIC_HELP.map((item) => (
              <p key={item.title} className="ic-legend__block">
                <b>{item.title}</b>
                <span>{item.text}</span>
              </p>
            ))}
          </section>
          <section className="ic-legend">
            <div className="ic-legend__head">
              <h3>Selected Rule Details</h3>
              {selected ? (
                <span className="ic-selected-pill">Selected: {selected.ruleName}</span>
              ) : null}
            </div>
            {selected ? (
              <dl className="ic-detail-grid">
                <div>
                  <dt>Rule Name</dt>
                  <dd>{selected.ruleName}</dd>
                </div>
                <div>
                  <dt>Document Title</dt>
                  <dd>{selected.documentTitle}</dd>
                </div>
                <div>
                  <dt>Check Scope</dt>
                  <dd>{selected.checkScope}</dd>
                </div>
                <div>
                  <dt>Content Validation</dt>
                  <dd>{selected.contentValidation}</dd>
                </div>
                <div>
                  <dt>Mandatory</dt>
                  <dd>{selected.mandatory}</dd>
                </div>
                <div>
                  <dt>Missing Document Action</dt>
                  <dd>{selected.workflowImpactDetail || selected.missingAction}</dd>
                </div>
              </dl>
            ) : (
              <p className="ic-legend__empty">Select a rule row to inspect its details.</p>
            )}
          </section>
        </div>
      </div>

      <div className="ic-screen__footer ic-screen__footer--info">
        <p className="ic-footnote">
          <Info size={14} />
          Add, edit, status, and delete save immediately. Completeness uses Active mandatory rules
          on the Active config version.
        </p>
      </div>

      <Dialog
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        width={560}
        title={editor?.id ? 'Edit rule' : 'Add rule'}
        description="Define how a supporting document is checked during invoice validation."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditor(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={commitEditor}
              disabled={saving || !editor?.ruleName?.trim() || !editor?.documentTitle?.trim()}>
              {editor?.id ? 'Save rule' : 'Add rule'}
            </Button>
          </>
        }>
        {editor ? (
          <div className="ic-form">
            <label className="ic-field">
              <span>Invoice category</span>
              <select
                className="dx-select"
                value={editor.category}
                onChange={(e) =>
                  setEditor((prev) => ({
                    ...prev,
                    category: e.target.value,
                    categoryLabel: INVOICE_CATEGORY_LABEL[e.target.value]
                  }))
                }>
                {INVOICE_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ic-field">
              <span>Document title</span>
              <input
                className="dx-input"
                value={editor.documentTitle}
                placeholder="e.g. Attendance Sheet"
                onChange={(e) =>
                  setEditor((prev) => ({ ...prev, documentTitle: e.target.value }))
                }
              />
            </label>
            <label className="ic-field">
              <span>Rule name</span>
              <input
                className="dx-input"
                value={editor.ruleName}
                placeholder="e.g. Attendance Sheet Availability"
                onChange={(e) => setEditor((prev) => ({ ...prev, ruleName: e.target.value }))}
              />
            </label>
            <label className="ic-field">
              <span>Check scope</span>
              <select
                className="dx-select"
                value={editor.checkScope}
                onChange={(e) => {
                  const checkScope = e.target.value
                  setEditor((prev) => ({
                    ...prev,
                    checkScope,
                    contentValidation: checkScope === 'Availability Only' ? 'No' : prev.contentValidation
                  }))
                }}>
                {CHECK_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
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
                <span>Missing document action</span>
                <select
                  className="dx-select"
                  value={editor.missingAction}
                  onChange={(e) =>
                    setEditor((prev) => ({ ...prev, missingAction: e.target.value }))
                  }>
                  {MISSING_ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="ic-form__row">
              <label className="ic-field">
                <span>Content validation</span>
                <select
                  className="dx-select"
                  value={editor.contentValidation}
                  onChange={(e) =>
                    setEditor((prev) => ({ ...prev, contentValidation: e.target.value }))
                  }>
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
            <label className="ic-field">
              <span>Workflow impact</span>
              <input
                className="dx-input"
                value={editor.workflowImpact}
                onChange={(e) =>
                  setEditor((prev) => ({ ...prev, workflowImpact: e.target.value }))
                }
              />
            </label>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => !saving && setPendingDelete(null)}
        width={440}
        title="Delete rule?"
        description={
          pendingDelete ? `Remove “${pendingDelete.ruleName}” from this category?` : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={saving}>
              Delete rule
            </Button>
          </>
        }>
        <p className="ic-dialog-copy">This removes the rule from this config version.</p>
      </Dialog>
    </div>
  )
}

export default ValidationRules
