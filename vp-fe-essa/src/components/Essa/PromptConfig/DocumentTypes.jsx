import { useState } from 'react'
import { Pencil, X } from 'lucide-react'

import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { defaultCategoryId, defaultSplitBehavior, mockupSlugify } from './documentTypeDefaults'

const SplitHelp = () => (
  <details className="prompt-config__info-pop">
    <summary title="What does this mean?">?</summary>
    <div className="prompt-config__info-panel">
      <b>Contiguous</b> — this document&apos;s pages must be next to each other in the file. Any
      gap starts a new document.
      <br />
      <br />
      <b>Scattered</b> — this document&apos;s pages can appear in separate places throughout the
      file, mixed with other documents, and still count as one document.
    </div>
  </details>
)

export const MandatoryHelp = () => (
  <details className="prompt-config__info-pop">
    <summary title="What does this mean?">?</summary>
    <div className="prompt-config__info-panel">
      <b>Required</b> — after classification, this document must be present in the upload.
      If it is missing, extraction hard-stops and no fields are captured.
      <br />
      <br />
      <b>Optional</b> — extraction continues even if this document is not in the bundle.
    </div>
  </details>
)

export const MandatoryToggleRow = ({ id, checked, disabled, onChange }) => (
  <div className="prompt-config__field-group">
    <div className="prompt-config__label-row">
      <label htmlFor={id}>Required for extraction</label>
      <MandatoryHelp />
    </div>
    <div className="prompt-config__mandatory-toggle">
      <label className="prompt-config-switch">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="prompt-config-switch__track">
          <span className="prompt-config-switch__thumb" />
        </span>
      </label>
      <span>
        {checked
          ? 'Required — extraction hard-stops if this document is missing'
          : 'Optional — extraction continues if this document is absent'}
      </span>
    </div>
    <p className="prompt-config__field-help">
      Applies to this invoice type only. Toggle this on for documents that must be in the
      upload before Fields to Capture can run.
    </p>
  </div>
)

const emptyModal = {
  mode: 'add',
  name: '',
  categoryId: '',
  splitBehavior: 'contiguous',
  classificationHints: '',
  mandatory: false,
  catIdTouched: false,
  error: ''
}

const DocumentTypes = ({
  activeType,
  configs,
  selectedDoc,
  busy,
  onSelectDoc,
  onToggleEnabled,
  onUpdateSettings,
  onAddDocument,
  onRenameDocument,
  onRemoveDocument,
  onGoToFields,
  onToggleMandatory,
  onSaveSettings,
  savingSettings
}) => {
  const [modal, setModal] = useState(null)
  const typeCfg = activeType ? configs[activeType.id] || {} : {}
  const selectedCfg = selectedDoc ? typeCfg[selectedDoc] : null

  const openAdd = () => {
    setModal({ ...emptyModal })
  }

  const openEdit = (docName) => {
    const d = typeCfg[docName]
    if (!d) return
    setModal({
      mode: 'edit',
      originalName: docName,
      name: docName,
      categoryId: d.categoryId || defaultCategoryId(docName),
      splitBehavior: d.splitBehavior || defaultSplitBehavior(docName),
      classificationHints: d.classificationHints || '',
      mandatory: Boolean(d.mandatory),
      catIdTouched: true,
      error: ''
    })
  }

  const closeModal = () => {
    if (busy) return
    setModal(null)
  }

  const updateModal = (patch) => {
    setModal((prev) => (prev ? { ...prev, ...patch, error: '' } : prev))
  }

  const handleNameChange = (value) => {
    setModal((prev) => {
      if (!prev) return prev
      const next = { ...prev, name: value, error: '' }
      if (prev.mode === 'add' && !prev.catIdTouched) {
        next.categoryId = mockupSlugify(value)
      }
      return next
    })
  }

  const saveModal = async () => {
    if (!modal || !activeType || busy) return
    const name = modal.name.trim()
    const categoryId = modal.categoryId.trim() || mockupSlugify(name)
    if (!name) {
      updateModal({ error: 'Document name is required.' })
      return
    }
    const nameTaken = activeType.documents.some(
      (doc) => doc === name && doc !== modal.originalName
    )
    if (nameTaken) {
      updateModal({
        error: 'A document with that name already exists for this invoice type.'
      })
      return
    }

    const settings = {
      categoryId,
      splitBehavior: modal.splitBehavior,
      classificationHints: modal.classificationHints.trim(),
      mandatory: Boolean(modal.mandatory)
    }

    if (modal.mode === 'add') {
      const ok = await onAddDocument({ name, ...settings })
      if (!ok) return
    } else {
      onUpdateSettings(modal.originalName, settings)
      const persistedConfigs = await onToggleMandatory(
        activeType,
        modal.originalName,
        settings.mandatory
      )
      if (!persistedConfigs) return
      if (name !== modal.originalName) {
        const ok = await onRenameDocument(modal.originalName, name, {
          configsOverride: persistedConfigs || undefined
        })
        if (!ok) return
      }
    }
    setModal(null)
  }

  const hintsPreview =
    (selectedCfg?.classificationHints || '').trim() ||
    '(no hints yet — the classifier falls back to the document name alone)'

  return (
    <>
      <section className="prompt-config__table">
        {!activeType ? (
          <div className="prompt-config__empty">
            <p>Select an invoice type from the list to view and configure its documents.</p>
          </div>
        ) : (
          <>
            <div className="prompt-config__table-toolbar">
              <div className="prompt-config__toolbar-title">
                <h2 className="prompt-config__section-title">{activeType.subtype}</h2>
                <p>
                  {activeType.category} · {activeType.documents.length} document types in this
                  invoice type&apos;s catalog
                </p>
              </div>
              <div className="prompt-config__toolbar-actions">
                <button
                  type="button"
                  className="prompt-config__btn-primary"
                  disabled={busy}
                  onClick={openAdd}>
                  + Add document
                </button>
              </div>
            </div>

            <div className="prompt-config__table-scroll">
              <table className="prompt-config__fields">
                <thead>
                  <tr>
                    <th style={{ width: 40 }} />
                    <th>Document</th>
                    <th>Category ID</th>
                    <th>
                      <span className="prompt-config__th-with-help">
                        Split behavior
                        <SplitHelp />
                      </span>
                    </th>
                    <th>
                      <span className="prompt-config__th-with-help">
                        Required
                        <MandatoryHelp />
                      </span>
                    </th>
                    <th style={{ width: 50 }}>Fields</th>
                    <th style={{ width: 72 }} />
                  </tr>
                </thead>
                <tbody>
                  {activeType.documents.length === 0 ? (
                    <tr>
                      <td className="prompt-config__fields-empty" colSpan={7}>
                        No documents in this invoice type yet.
                      </td>
                    </tr>
                  ) : (
                    activeType.documents.map((doc) => {
                      const d = typeCfg[doc]
                      if (!d) return null
                      return (
                        <tr
                          key={d.typeDocumentId ?? doc}
                          className={selectedDoc === doc ? 'is-selected' : ''}
                          onClick={() => onSelectDoc(activeType, doc)}>
                          <td>
                            <label
                              className="prompt-config-switch"
                              onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={Boolean(d.enabled)}
                                disabled={busy}
                                onChange={(e) =>
                                  onToggleEnabled(activeType, doc, e.target.checked, e)
                                }
                              />
                              <span className="prompt-config-switch__track">
                                <span className="prompt-config-switch__thumb" />
                              </span>
                            </label>
                          </td>
                          <td>
                            <span className="prompt-config__fdisplay">{doc}</span>
                          </td>
                          <td>
                            <span className="prompt-config__fname">
                              {d.categoryId || defaultCategoryId(doc)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`prompt-config__meta-chip${
                                d.splitBehavior === 'scattered' ? ' is-scattered' : ''
                              }`}>
                              {d.splitBehavior === 'scattered' ? 'Scattered' : 'Contiguous'}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`prompt-config__meta-chip${
                                d.mandatory ? ' is-required' : ' is-optional'
                              }`}
                              disabled={busy}
                              title={
                                d.mandatory
                                  ? 'Required — click to make optional'
                                  : 'Optional — click to require this document'
                              }
                              onClick={() =>
                                onToggleMandatory(activeType, doc, !d.mandatory)
                              }>
                              {d.mandatory ? 'Required' : 'Optional'}
                            </button>
                          </td>
                          <td className="prompt-config__fields-index">{d.fields.length}</td>
                          <td>
                            <div className="prompt-config__frow-actions">
                              <button
                                type="button"
                                className="prompt-config__icon-btn"
                                title="Edit document"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEdit(doc)
                                }}>
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                className="prompt-config__icon-btn"
                                title="Remove document"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onRemoveDocument(doc)
                                }}>
                                <X size={13} />
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
          </>
        )}
      </section>

      <aside className="prompt-config__inspect">
        {!activeType || !selectedDoc || !selectedCfg ? (
          <>
            <div className="prompt-config__inspect-head">
              <h3>Document settings</h3>
              <p>Select a document to configure</p>
            </div>
            <div className="prompt-config__inspect-empty">
              Click a row in the table to configure its classification and split behavior.
            </div>
          </>
        ) : (
          <>
            <div className="prompt-config__inspect-head">
              <h3>{selectedDoc}</h3>
              <p>
                {activeType.subtype} · classification &amp; split settings
              </p>
            </div>
            <div className="prompt-config__inspect-body">
              <div className="prompt-config__field-group">
                <label htmlFor="pc-doc-catid">Category ID</label>
                <input
                  id="pc-doc-catid"
                  className="is-mono"
                  type="text"
                  placeholder="e.g. daily_timesheet"
                  value={selectedCfg.categoryId || ''}
                  disabled={busy}
                  onChange={(e) => onUpdateSettings(selectedDoc, { categoryId: e.target.value })}
                />
                <p className="prompt-config__field-help">
                  The slug the page classifier assigns to this document type. Must be unique
                  within this invoice type&apos;s catalog.
                </p>
              </div>
              <div className="prompt-config__field-group">
                <div className="prompt-config__label-row">
                  <label htmlFor="pc-doc-split">Split behavior</label>
                  <SplitHelp />
                </div>
                <select
                  id="pc-doc-split"
                  value={selectedCfg.splitBehavior || 'contiguous'}
                  disabled={busy}
                  onChange={(e) =>
                    onUpdateSettings(selectedDoc, { splitBehavior: e.target.value })
                  }>
                  <option value="contiguous">
                    Contiguous — starts a new section on any page gap
                  </option>
                  <option value="scattered">
                    Scattered — pages can merge into one section even with gaps
                  </option>
                </select>
                <p className="prompt-config__field-help">
                  Use Scattered for document types that tend to appear as interleaved pages
                  within a bundle (e.g. daily sheets), and Contiguous for documents that are
                  always one continuous block (e.g. invoice, PO).
                </p>
              </div>
              <MandatoryToggleRow
                id="pc-doc-mandatory"
                checked={Boolean(selectedCfg.mandatory)}
                disabled={busy}
                onChange={(mandatory) =>
                  onUpdateSettings(selectedDoc, {
                    mandatory,
                    enabled: mandatory ? true : selectedCfg.enabled
                  })
                }
              />
              <div className="prompt-config__field-group">
                <label htmlFor="pc-doc-hints">Classification hints</label>
                <textarea
                  id="pc-doc-hints"
                  rows={5}
                  placeholder="What identifies this document on the page — headings, form titles, table columns, stamps."
                  value={selectedCfg.classificationHints || ''}
                  disabled={busy}
                  onChange={(e) =>
                    onUpdateSettings(selectedDoc, { classificationHints: e.target.value })
                  }
                />
                <p className="prompt-config__field-help">
                  Used by the AI page classifier to recognize this document type and tell it
                  apart from similar-looking ones.
                </p>
                <div className="prompt-config__snippet" style={{ marginTop: 10 }}>
                  <div className="prompt-config__snippet-label">
                    Appears in classification catalog as
                  </div>
                  <div className="prompt-config__snippet-line">
                    {`- ${selectedCfg.categoryId || defaultCategoryId(selectedDoc)} → ${selectedDoc}\n  Identify by: ${hintsPreview}`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="prompt-config__btn-primary prompt-config__inspect-save"
                disabled={busy}
                onClick={() => onSaveSettings(selectedDoc)}>
                {savingSettings ? 'Saving…' : 'Save document settings'}
              </button>
              <hr className="prompt-config__divider" />
              <div className="prompt-config__field-group" style={{ marginBottom: 0 }}>
                <label>Fields defined</label>
                <p className="prompt-config__field-help" style={{ marginTop: 0 }}>
                  {selectedCfg.fields.length} field
                  {selectedCfg.fields.length === 1 ? '' : 's'} configured for this document.
                </p>
                <button
                  type="button"
                  className="prompt-config__btn-ghost"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={onGoToFields}>
                  Edit fields to capture →
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      <Dialog
        open={Boolean(modal)}
        onClose={closeModal}
        width={480}
        title={
          modal?.mode === 'edit' ? `Edit document — ${modal.originalName}` : 'Add document'
        }
        footer={
          <div className="prompt-config-doc-modal__footer">
            {modal?.mode === 'edit' ? (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  onRemoveDocument(modal.originalName)
                  setModal(null)
                }}>
                Delete document
              </Button>
            ) : (
              <span />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" onClick={closeModal} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveModal} disabled={busy}>
                Save
              </Button>
            </div>
          </div>
        }>
        {modal ? (
          <div className="prompt-config-doc-modal">
            <div className="prompt-config__field-group">
              <label htmlFor="pc-modal-name">Document name</label>
              <input
                id="pc-modal-name"
                type="text"
                placeholder="e.g. Delivery Note"
                value={modal.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            {modal.error ? <p className="prompt-config-doc-modal__error">{modal.error}</p> : null}
            <div className="prompt-config__field-group">
              <label htmlFor="pc-modal-catid">Category ID</label>
              <input
                id="pc-modal-catid"
                className="is-mono"
                type="text"
                placeholder="e.g. delivery_note"
                value={modal.categoryId}
                onChange={(e) =>
                  updateModal({ categoryId: e.target.value, catIdTouched: true })
                }
              />
              <p className="prompt-config__field-help">
                The slug the page classifier assigns to this document type. Auto-fills from the
                name — edit if you need a specific slug.
              </p>
            </div>
            <div className="prompt-config__field-group">
              <div className="prompt-config__label-row">
                <label htmlFor="pc-modal-split">Split behavior</label>
                <SplitHelp />
              </div>
              <select
                id="pc-modal-split"
                value={modal.splitBehavior}
                onChange={(e) => updateModal({ splitBehavior: e.target.value })}>
                <option value="contiguous">
                  Contiguous — starts a new section on any page gap
                </option>
                <option value="scattered">
                  Scattered — pages can merge into one section even with gaps
                </option>
              </select>
            </div>
            <MandatoryToggleRow
              id="pc-modal-mandatory"
              checked={Boolean(modal.mandatory)}
              disabled={busy}
              onChange={(mandatory) => updateModal({ mandatory })}
            />
            <div className="prompt-config__field-group" style={{ marginBottom: 0 }}>
              <label htmlFor="pc-modal-hints">Classification hints</label>
              <textarea
                id="pc-modal-hints"
                rows={4}
                placeholder="What identifies this document on the page — headings, form titles, table columns, stamps. Mention anything similar-looking document types this could be confused with."
                value={modal.classificationHints}
                onChange={(e) => updateModal({ classificationHints: e.target.value })}
              />
              <p className="prompt-config__field-help">
                Used by the AI page classifier to recognize this document type and tell it
                apart from similar-looking ones — separate from the field-level hints in Fields
                to Capture.
              </p>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  )
}

export default DocumentTypes
