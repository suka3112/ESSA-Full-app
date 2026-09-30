import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Copy, Plus, X } from 'lucide-react'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import {
  applyInvoiceTypeDetail,
  buildDocumentsPayload,
  createInvoiceTypeDocument,
  deleteInvoiceTypeDocument,
  fetchPromptConfig,
  mapPromptConfigToUiState,
  regenerateInvoiceTypePrompt,
  renameInvoiceTypeDocument,
  saveInvoiceTypeDocuments,
  saveInvoiceTypePrompt
} from '../../../api/extractionPromptConfig'
import { showEssaErrorToast, showEssaSuccessToast } from '../lib/essaToast'
import {
  INVOICE_CONFIG_TABS,
  TAB_INVOICE_CATEGORY,
  TAB_DOCUMENT_TYPES,
  TAB_FIELDS,
  TAB_SAP_MAPPING,
  TAB_VALIDATION_RULES,
  TAB_NWAY_MATCHING,
  INVOICE_CONFIG_TAB_IDS
} from './invoiceConfigTabs'
import DocumentTypes, { MandatoryHelp, MandatoryToggleRow } from './DocumentTypes'
import InvoiceCategory from './InvoiceCategory'
import { defaultCategoryId } from './documentTypeDefaults'
import SapFieldMapping from './SapFieldMapping'
import ValidationRules from './ValidationRules'
import MatchRules from './NWayRules'
import '../../../assets/scss/essa/dashboard.scss'
import '../../../assets/scss/essa/prompt-config.scss'
import '../../../assets/scss/essa/invoice-config-screens.scss'

const countConfigured = (type, configs) => {
  const cfg = configs[type.id] || {}
  let docs = 0
  let fields = 0
  type.documents.forEach((doc) => {
    if (cfg[doc]?.enabled) {
      docs += 1
      fields += cfg[doc].fields.length
    }
  })
  return { docs, fields }
}

const typeFieldCount = (type, configs) => countConfigured(type, configs).fields

const buildPrompt = (type, configs) => {
  if (!type) return ''
  const cfg = configs[type.id] || {}
  const activeDocs = type.documents.filter((doc) => cfg[doc]?.enabled)
  const lines = [
    `You are extracting structured data from documents belonging to a "${type.subtype}" invoice (${type.category}).`,
    '',
    'Scan the ENTIRE page (header, body tables, passenger/ticket detail blocks, bank footer, signature).',
    'Match labels by meaning (English / Bahasa Indonesia). Preserve printed values exactly (including thousand separators).',
    'Never invent values. Use null when a field is not present after a full-page scan.',
    ''
  ]

  if (activeDocs.length === 0) {
    lines.push('No documents selected yet — toggle on the documents you want this prompt to cover.')
    return lines.join('\n')
  }

  const isEntryField = (name) =>
    /^(invoiceLineItems|lineItems|manpower|manhourSummary|timesheetEntries|timesheets|attendanceEntries|poLineItems|appendixItems|transmittalItems|progressLineItems|classifications)$/i.test(
      String(name || '').trim()
    )

  activeDocs.forEach((doc) => {
    const fields = cfg[doc]?.fields || []
    const scalars = fields.filter((f) => !isEntryField(f.name))
    const entries = fields.filter((f) => isEntryField(f.name))

    lines.push(`## ${doc}`)
    lines.push('### header (scalars — put all of these under JSON key "header")')
    if (scalars.length === 0) {
      lines.push('- (no scalar fields defined yet)')
    } else {
      scalars.forEach((f) => {
        const name = f.name.trim() || '{{field}}'
        const hint = f.hint.trim()
        lines.push(`- ${name}${hint ? `  // ${hint}` : ''}`)
      })
    }

    if (entries.length > 0) {
      lines.push('')
      lines.push('### entries (arrays at JSON top level)')
      entries.forEach((f) => {
        const name = f.name.trim() || '{{field}}'
        const hint = f.hint.trim()
        lines.push(`- ${name}${hint ? `  // ${hint}` : ''}`)
      })
    } else {
      lines.push('')
      lines.push('### entries')
      lines.push(
        '- invoiceLineItems  // array of row objects with description, quantity, unitPrice, amount, and any travel keys also present in header'
      )
    }
    lines.push('')
  })

  lines.push(
    'OUTPUT RULES:',
    '1. Return ONE JSON object with top-level keys: "header", "invoiceLineItems", "lineItems".',
    '2. Do NOT wrap fields under the document section title (e.g. do not return { "Invoice": { ... } }).',
    '3. Put every scalar field listed above inside header with the exact key names; null if absent.',
    '4. Mirror invoiceLineItems into lineItems (identical rows/order).',
    '5. Do NOT put summary/tax rows (Subtotal, Total, VAT/PPN, Grand Total) inside invoiceLineItems — map those to header.subtotal / vatAmount / totalAmount / grandTotal.',
    '6. Travel / ticket agency invoices: copy passengerName, ticketClass, routeFrom, routeTo, bookingRef (Confirm No / PNR), ticketNo, airline, flightNo, routeCodeFrom, routeCodeTo into header AND into invoiceLineItems[0] when a passenger/ticket detail block exists.',
    '7. Bank lines like "Bank BCA : 6970747999" → bankName + bankAccountNumber (split carefully).',
    '8. For Non-PO invoices with no printed contract/PO reference, header.poNumber must be null.',
    '',
    'Example shape:',
    '{',
    '  "header": { "invNo": null, "vendorName": null, "bookingRef": null, "vatAmount": null, "grandTotal": null },',
    '  "invoiceLineItems": [{ "description": null, "quantity": null, "unitPrice": null, "amount": null, "passengerName": null, "bookingRef": null }],',
    '  "lineItems": [{ "description": null, "quantity": null, "unitPrice": null, "amount": null, "passengerName": null, "bookingRef": null }]',
    '}'
  )

  return lines.join('\n')
}

const CLASSIFICATION_SYNONYMS = [
  ['tax_invoice', 'faktur_pajak'],
  ['kwitansi', 'notice'],
  ['receipt', 'notice'],
  ['payment_notice', 'notice'],
  ['work_progress_certificate', 'berita_acara'],
  ['summary_calculation', 'summary_calculation_manhour'],
  ['summary_of_claim', 'summary_calculation_manhour'],
  ['daily_time_sheet', 'daily_timesheet'],
  ['timesheet', 'daily_timesheet'],
  ['face_finger', 'daily_attendance'],
  ['fabrication_report', 'daily_attendance'],
  ['attendance_sheet', 'daily_attendance'],
  ['biometrics', 'daily_attendance'],
  ['po', 'purchase_order'],
  ['purchase_order_terms', 'purchase_order_appendix'],
  ['po_appendix', 'purchase_order_appendix'],
  ['ses', 'service_entry_sheet']
]

const buildClassificationPrompt = (type, configs) => {
  if (!type) return ''
  const cfg = configs[type.id] || {}
  const activeDocs = type.documents.filter((doc) => cfg[doc]?.enabled)
  const lines = [
    `You are classifying PDF pages for a "${type.subtype}" invoice (${type.category}).`,
    '',
    'Read the page title/heading first. Assign exactly one categoryId from the catalog below.',
    'Never invent new slugs. Never use extraction field names as categoryIds.',
    ''
  ]

  if (activeDocs.length === 0) {
    lines.push(
      'No documents enabled yet — toggle on the documents you want the classifier to recognize.'
    )
    return lines.join('\n')
  }

  const allowed = activeDocs.map((doc) => cfg[doc]?.categoryId || defaultCategoryId(doc))
  const allowedSet = new Set(allowed)

  lines.push('ALLOWED categoryId values (use exactly one of these; do NOT invent new slugs):')
  lines.push([...allowed, 'unclassified'].join(', '))
  lines.push('')
  lines.push('Document type catalog:')

  activeDocs.forEach((doc) => {
    const docCfg = cfg[doc] || {}
    const categoryId = docCfg.categoryId || defaultCategoryId(doc)
    const hints = String(docCfg.classificationHints || '').trim() || doc
    const split = docCfg.splitBehavior === 'scattered' ? 'scattered' : 'contiguous'
    lines.push(`- ${categoryId} → ${doc}`)
    lines.push(`  Identify by: ${hints}`)
    lines.push(`  Split: ${split}`)
  })

  const synonymLines = CLASSIFICATION_SYNONYMS.filter(([, canonical]) =>
    allowedSet.has(canonical)
  ).map(([alias, canonical]) => `- ${alias} → ${canonical}`)

  if (synonymLines.length) {
    lines.push('')
    lines.push('Synonym mapping — always output the canonical categoryId on the right:')
    lines.push(...synonymLines)
  }

  lines.push('')
  lines.push(
    'Use "unclassified" only when the page has no recognizable document signal for this invoice type.'
  )
  lines.push(
    'This prompt is for page classification and split only. Field extraction uses a separate template on Fields to Capture.'
  )

  return lines.join('\n')
}

const fieldSnippet = (field) => {
  const name = String(field?.name || '').trim() || '{{field}}'
  const hint = String(field?.hint || '').trim()
  return `- ${name}${hint ? `  // ${hint}` : ''}`
}

const PromptConfig = () => {
  const [invoiceTypes, setInvoiceTypes] = useState([])
  const [configs, setConfigs] = useState({})
  const [promptMeta, setPromptMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDocSettings, setSavingDocSettings] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activeType, setActiveType] = useState(null)
  const [activeDoc, setActiveDoc] = useState(null)
  const [selectedFieldIdx, setSelectedFieldIdx] = useState(null)
  const [openTypes, setOpenTypes] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [promptText, setPromptText] = useState('')
  const [edited, setEdited] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [addingDoc, setAddingDoc] = useState(false)
  const [removingDoc, setRemovingDoc] = useState(null)
  const [docPendingDelete, setDocPendingDelete] = useState(null)
  const [docNameDrafts, setDocNameDrafts] = useState({})
  const [renamingDocId, setRenamingDocId] = useState(null)
  const [activeTab, setActiveTab] = useState(() => {
    // Deep link, e.g. …/prompt-config?tab=n-way-matching (used by the invoice N-Way panel)
    const fromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null
    return fromUrl && INVOICE_CONFIG_TAB_IDS.includes(fromUrl) ? fromUrl : TAB_FIELDS
  })

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const tree = await fetchPromptConfig()
      const mapped = mapPromptConfigToUiState(tree)
      setInvoiceTypes(mapped.invoiceTypes)
      setConfigs(mapped.configs)
      setPromptMeta(mapped.promptMeta)
      return mapped
    } catch (err) {
      showEssaErrorToast(
        'Failed to load prompt config',
        err?.response?.data?.message || err?.message || 'Please try again.'
      )
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const applyTypeSelection = useCallback(
    (type, nextConfigs = configs) => {
      setActiveType(type)
      setCopied(false)
      setSaved(false)
      setNewDocName('')
      setDocPendingDelete(null)
      setSelectedFieldIdx(null)
      const meta = promptMeta[type.id]
      if (meta?.isManuallyEdited && meta.promptText) {
        setPromptText(meta.promptText)
        setEdited(true)
      } else if (meta?.promptText) {
        setPromptText(meta.promptText)
        setEdited(false)
      } else {
        setPromptText(buildPrompt(type, nextConfigs))
        setEdited(false)
      }
    },
    [configs, promptMeta]
  )

  useEffect(() => {
    if (loading || activeType || invoiceTypes.length === 0) return
    const first = invoiceTypes[0]
    const cfg = configs[first.id] || {}
    const firstEnabled = first.documents.find((d) => cfg[d]?.enabled)
    const doc = firstEnabled || first.documents[0] || null
    setOpenTypes({ [first.id]: true })
    applyTypeSelection(first)
    setActiveDoc(doc)
    if (doc) {
      const typeDocumentId = cfg[doc]?.typeDocumentId
      if (typeDocumentId != null) {
        setDocNameDrafts({ [typeDocumentId]: doc })
      }
    }
  }, [loading, invoiceTypes, configs, activeType, applyTypeSelection])

  const groupedTypes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const groups = []
    const byCat = new Map()

    invoiceTypes.forEach((type) => {
      if (q) {
        const subtypeHit = type.subtype.toLowerCase().includes(q)
        const docHit = type.documents.some((d) => d.toLowerCase().includes(q))
        if (!subtypeHit && !docHit) return
      }
      const cat = type.category || 'Other'
      if (!byCat.has(cat)) {
        const group = { category: cat, types: [] }
        byCat.set(cat, group)
        groups.push(group)
      }
      byCat.get(cat).types.push(type)
    })

    return groups
  }, [invoiceTypes, searchTerm])

  const activeCfg = activeType ? configs[activeType.id] : null
  const activeDocCfg = activeDoc && activeCfg ? activeCfg[activeDoc] : null
  const selectedField =
    activeDocCfg && selectedFieldIdx != null ? activeDocCfg.fields[selectedFieldIdx] : null
  const busy = Boolean(
    addingDoc || saving || savingDocSettings || generating || removingDoc || renamingDocId
  )
  const classificationPromptText = useMemo(
    () => buildClassificationPrompt(activeType, configs),
    [activeType, configs]
  )

  const selectDocument = (type, docName) => {
    const switchingType = activeType?.id !== type.id
    if (switchingType) {
      applyTypeSelection(type)
    } else {
      setSelectedFieldIdx(null)
    }
    setActiveDoc(docName)
    setOpenTypes((prev) => ({ ...prev, [type.id]: true }))
    const typeDocumentId = configs[type.id]?.[docName]?.typeDocumentId
    if (typeDocumentId != null) {
      setDocNameDrafts((prev) => ({ ...prev, [typeDocumentId]: docName }))
    }
  }

  const handleTypeHeadClick = (type) => {
    const switching = activeType?.id !== type.id
    if (switching) {
      applyTypeSelection(type)
      const cfg = configs[type.id] || {}
      const doc = type.documents.find((d) => cfg[d]?.enabled) || type.documents[0] || null
      setActiveDoc(doc)
      if (doc) {
        const typeDocumentId = cfg[doc]?.typeDocumentId
        if (typeDocumentId != null) {
          setDocNameDrafts((prev) => ({ ...prev, [typeDocumentId]: doc }))
        }
      }
      setOpenTypes((prev) => ({ ...prev, [type.id]: true }))
      return
    }
    setOpenTypes((prev) => ({ ...prev, [type.id]: !prev[type.id] }))
  }

  const updateDocSettings = (docName, patch) => {
    if (!activeType) return
    updateDocConfig(activeType, docName, (current) => ({ ...current, ...patch }))
  }

  const updateDocConfig = (type, docName, updater, { refreshPrompt = false } = {}) => {
    if (!type) return
    setConfigs((prev) => {
      const current = prev[type.id]?.[docName]
      if (!current) return prev
      const nextDoc = updater(current)
      const nextConfigs = {
        ...prev,
        [type.id]: {
          ...prev[type.id],
          [docName]: nextDoc
        }
      }
      if (refreshPrompt && !edited && activeType?.id === type.id) {
        setPromptText(buildPrompt(type, nextConfigs))
      }
      return nextConfigs
    })
  }

  const toggleDoc = (type, docName, enabled, event) => {
    event?.stopPropagation()
    updateDocConfig(type, docName, (current) => ({ ...current, enabled }), {
      refreshPrompt: true
    })
  }

  const updateDocNameDraft = (typeDocumentId, value) => {
    setDocNameDrafts((prev) => ({ ...prev, [typeDocumentId]: value }))
  }

  const commitDocRename = async (docName, nextNameOverride, { configsOverride } = {}) => {
    if (!activeType || renamingDocId || removingDoc || addingDoc || saving || generating) {
      return false
    }
    const sourceConfigs = configsOverride || configs
    const docCfg = sourceConfigs[activeType.id]?.[docName]
    const typeDocumentId = docCfg?.typeDocumentId
    if (!typeDocumentId) return false

    const nextName = String(nextNameOverride ?? docNameDrafts[typeDocumentId] ?? docName).trim()
    if (!nextName) {
      setDocNameDrafts((prev) => ({ ...prev, [typeDocumentId]: docName }))
      showEssaErrorToast('Document name required', 'Enter a non-empty document name.')
      return false
    }
    if (nextName === docName) return true

    setRenamingDocId(typeDocumentId)
    try {
      const persisted = await persistDocuments(activeType, sourceConfigs)
      const detail = await renameInvoiceTypeDocument(persisted.type.invoiceTypeId, typeDocumentId, {
        name: nextName
      })
      const { merged, nextType } = applyInvoiceTypeDetailToUi(
        detail,
        persisted.configs,
        persisted.promptMeta,
        persisted.type
      )
      setActiveDoc(nextName)
      setDocNameDrafts((prev) => ({ ...prev, [typeDocumentId]: nextName }))
      if (!edited) {
        setPromptText(buildPrompt(nextType, merged.configs))
      }
      showEssaSuccessToast('Document renamed', `Renamed to “${nextName}”.`)
      return true
    } catch (err) {
      setDocNameDrafts((prev) => ({ ...prev, [typeDocumentId]: docName }))
      showEssaErrorToast(
        'Could not rename document',
        err?.response?.data?.message || err?.message || 'Please try again.'
      )
      return false
    } finally {
      setRenamingDocId(null)
    }
  }

  const updateField = (docName, index, key, value) => {
    if (!activeType) return
    updateDocConfig(activeType, docName, (current) => ({
      ...current,
      fields: current.fields.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    }))
  }

  const refreshPreviewFromConfigs = () => {
    if (!activeType || edited) return
    setPromptText(buildPrompt(activeType, configs))
  }

  const removeField = (docName, index) => {
    if (!activeType) return
    updateDocConfig(
      activeType,
      docName,
      (current) => ({
        ...current,
        fields: current.fields.filter((_, i) => i !== index)
      }),
      { refreshPrompt: true }
    )
    setSelectedFieldIdx((prev) => {
      if (prev == null) return prev
      if (prev === index) return null
      if (prev > index) return prev - 1
      return prev
    })
  }

  const addField = (docName) => {
    if (!activeType) return
    const currentLen = configs[activeType.id]?.[docName]?.fields.length || 0
    updateDocConfig(activeType, docName, (current) => ({
      ...current,
      fields: [...current.fields, { name: '', displayName: '', hint: '' }]
    }))
    setSelectedFieldIdx(currentLen)
  }

  const persistDocuments = async (type, typeConfigs) => {
    const payload = buildDocumentsPayload(type, typeConfigs[type.id])
    const detail = await saveInvoiceTypeDocuments(type.invoiceTypeId, payload)
    const merged = applyInvoiceTypeDetail(typeConfigs, promptMeta, detail)
    setConfigs(merged.configs)
    setPromptMeta(merged.promptMeta)

    const nextType = {
      ...type,
      typeDocuments: detail.documents || type.typeDocuments,
      documents: (detail.documents || []).map((d) => d.name)
    }

    setInvoiceTypes((prev) => prev.map((t) => (t.id === type.id ? nextType : t)))
    if (activeType?.id === type.id) {
      setActiveType(nextType)
    }

    return {
      detail,
      configs: merged.configs,
      promptMeta: merged.promptMeta,
      type: nextType
    }
  }

  const toggleMandatory = async (type, docName, mandatory, event) => {
    event?.stopPropagation()
    if (!type || addingDoc || saving || generating || removingDoc || renamingDocId) return
    const current = configs[type.id]?.[docName]
    if (!current) return
    const nextMandatory = Boolean(mandatory)
    const nextDoc = {
      ...current,
      mandatory: nextMandatory,
      enabled: nextMandatory ? true : current.enabled
    }
    const nextConfigs = {
      ...configs,
      [type.id]: {
        ...configs[type.id],
        [docName]: nextDoc
      }
    }
    setConfigs(nextConfigs)
    try {
      await persistDocuments(type, nextConfigs)
      return nextConfigs
    } catch (err) {
      setConfigs(configs)
      showEssaErrorToast(
        'Could not save required flag',
        err?.response?.data?.message || err?.message || 'Please try again.'
      )
      return null
    }
  }

  const saveDocumentSettings = async (docName) => {
    if (
      !activeType ||
      addingDoc ||
      saving ||
      savingDocSettings ||
      generating ||
      removingDoc ||
      renamingDocId
    ) {
      return false
    }
    if (!configs[activeType.id]?.[docName]) return false
    setSavingDocSettings(true)
    try {
      await persistDocuments(activeType, configs)
      showEssaSuccessToast(
        'Document settings saved',
        `"${docName}" classification and split settings were saved.`
      )
      return true
    } catch (err) {
      showEssaErrorToast(
        'Could not save document settings',
        err?.response?.data?.message || err?.message || 'Please try again.'
      )
      return false
    } finally {
      setSavingDocSettings(false)
    }
  }

  const applyInvoiceTypeDetailToUi = (detail, typeConfigs, typePromptMeta, baseType) => {
    const merged = applyInvoiceTypeDetail(typeConfigs, typePromptMeta, detail)
    setConfigs(merged.configs)
    setPromptMeta(merged.promptMeta)

    const nextType = {
      ...baseType,
      typeDocuments: detail.documents || baseType.typeDocuments,
      documents: (detail.documents || []).map((d) => d.name)
    }

    setInvoiceTypes((prev) => prev.map((t) => (t.id === baseType.id ? nextType : t)))
    if (activeType?.id === baseType.id) {
      setActiveType(nextType)
    }

    return { merged, nextType }
  }

  const handleAddDocument = async (type = activeType, extras = {}) => {
    if (!type || addingDoc || saving || generating || removingDoc) return false
    const name = String(extras.name ?? newDocName).trim()
    if (!name) {
      showEssaErrorToast('Document name required', 'Enter a name for the new document type.')
      return false
    }

    setAddingDoc(true)
    try {
      const persisted = await persistDocuments(type, configs)
      const detail = await createInvoiceTypeDocument(persisted.type.invoiceTypeId, {
        name,
        isEnabled: true,
        isMandatory: Boolean(extras.mandatory)
      })
      const { merged, nextType } = applyInvoiceTypeDetailToUi(
        detail,
        persisted.configs,
        persisted.promptMeta,
        persisted.type
      )
      const created = merged.configs[nextType.id]?.[name]
      if (
        created &&
        (extras.categoryId ||
          extras.splitBehavior ||
          extras.classificationHints != null ||
          extras.mandatory != null)
      ) {
        const nextConfigs = {
          ...merged.configs,
          [nextType.id]: {
            ...merged.configs[nextType.id],
            [name]: {
              ...created,
              categoryId: extras.categoryId || created.categoryId,
              splitBehavior: extras.splitBehavior || created.splitBehavior,
              classificationHints: extras.classificationHints ?? created.classificationHints,
              mandatory:
                extras.mandatory != null ? Boolean(extras.mandatory) : created.mandatory
            }
          }
        }
        setConfigs(nextConfigs)
      }
      setNewDocName('')
      selectDocument(nextType, name)
      const newDocId = detail?.documents?.find((d) => d.name === name)?.typeDocumentId
      if (newDocId != null) {
        setDocNameDrafts((prev) => ({ ...prev, [newDocId]: name }))
      }
      if (!edited) {
        setPromptText(buildPrompt(nextType, merged.configs))
      }
      showEssaSuccessToast(
        'Document added',
        `"${name}" is available and toggled on. Add fields, then save.`
      )
      return true
    } catch (err) {
      showEssaErrorToast(
        'Could not add document',
        err?.response?.data?.message || err?.message || 'Please try again.'
      )
      return false
    } finally {
      setAddingDoc(false)
    }
  }

  const closeDeleteDocumentDialog = () => {
    if (removingDoc) return
    setDocPendingDelete(null)
  }

  const requestRemoveDocument = (docName) => {
    if (!activeType || addingDoc || saving || generating || removingDoc) return
    setDocPendingDelete(docName)
  }

  const confirmRemoveDocument = async () => {
    const docName = docPendingDelete
    if (!docName || !activeType || addingDoc || saving || generating || removingDoc) return

    setRemovingDoc(docName)
    try {
      const persisted = await persistDocuments(activeType, configs)
      const typeDocumentId = persisted.configs[persisted.type.id]?.[docName]?.typeDocumentId
      if (!typeDocumentId) {
        showEssaErrorToast('Cannot remove document', 'Missing document id. Save and try again.')
        return
      }
      const detail = await deleteInvoiceTypeDocument(persisted.type.invoiceTypeId, typeDocumentId)
      const { merged, nextType } = applyInvoiceTypeDetailToUi(
        detail,
        persisted.configs,
        persisted.promptMeta,
        persisted.type
      )
      if (activeDoc === docName) {
        const remaining = nextType.documents.filter((d) => d !== docName)
        setActiveDoc(remaining[0] || null)
        setSelectedFieldIdx(null)
      }
      if (!edited) {
        setPromptText(buildPrompt(nextType, merged.configs))
      }
      setDocPendingDelete(null)
      showEssaSuccessToast('Document removed', `"${docName}" was removed from this invoice type.`)
    } catch (err) {
      showEssaErrorToast(
        'Could not remove document',
        err?.response?.data?.message || err?.message || 'Please try again.'
      )
    } finally {
      setRemovingDoc(null)
    }
  }

  const handleGenerate = async () => {
    if (!activeType || generating || saving) return

    const isManual = edited || Boolean(promptMeta[activeType.id]?.isManuallyEdited)
    if (isManual) {
      const ok = window.confirm(
        'This prompt was manually edited. Regenerating will overwrite your changes. Continue?'
      )
      if (!ok) return
    }

    setGenerating(true)
    try {
      const persisted = await persistDocuments(activeType, configs)
      const detail = await regenerateInvoiceTypePrompt(activeType.invoiceTypeId, {
        force: isManual
      })
      const merged = applyInvoiceTypeDetail(persisted.configs, persisted.promptMeta, detail)
      setConfigs(merged.configs)
      setPromptMeta(merged.promptMeta)
      setPromptText(detail?.promptTemplate?.promptText || buildPrompt(activeType, merged.configs))
      setEdited(false)
      showEssaSuccessToast('Prompt generated', 'Template regenerated from current document fields.')
    } catch (err) {
      showEssaErrorToast(
        'Generate failed',
        err?.response?.data?.message || err?.message || 'Please try again.'
      )
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async (text = promptText) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* ignore */
    }
  }

  const handleSave = async () => {
    if (!activeType || saving || generating) return
    setSaving(true)
    try {
      const { configs: nextConfigs, promptMeta: nextMeta } = await persistDocuments(
        activeType,
        configs
      )
      const detail = await saveInvoiceTypePrompt(activeType.invoiceTypeId, {
        promptText,
        isManuallyEdited: edited
      })
      const merged = applyInvoiceTypeDetail(nextConfigs, nextMeta, detail)
      setConfigs(merged.configs)
      setPromptMeta(merged.promptMeta)
      setSaved(true)
      setTimeout(() => setSaved(false), 1400)
      showEssaSuccessToast('Template saved', `${activeType.subtype} prompt configuration saved.`)
    } catch (err) {
      showEssaErrorToast(
        'Save failed',
        err?.response?.data?.message || err?.message || 'Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const activeDocNameDraft = (() => {
    if (!activeDocCfg?.typeDocumentId || !activeDoc) return activeDoc || ''
    if (docNameDrafts[activeDocCfg.typeDocumentId] != null) {
      return docNameDrafts[activeDocCfg.typeDocumentId]
    }
    return activeDoc
  })()

  return (
    <LeftPageContainer className="prompt-config-page">
      <div className="prompt-config essa-dashboard">
        <div className="prompt-config__page-head">
          <h1 className="prompt-config__title">Invoice Configuration</h1>
          <div className="prompt-config__tabs" role="tablist">
            {INVOICE_CONFIG_TABS.map((tab) => {
              const active = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`prompt-config__tab${active ? ' is-active' : ''}`}
                  disabled={!tab.enabled}
                  title={tab.enabled ? undefined : 'Coming soon'}
                  onClick={() => {
                    if (tab.enabled) {
                      setCopied(false)
                      setActiveTab(tab.id)
                    }
                  }}>
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="prompt-config__sheet">
          <div className={`ic-tab-panel${activeTab === TAB_INVOICE_CATEGORY ? ' is-visible' : ''}`}>
            {activeTab === TAB_INVOICE_CATEGORY ? (
              <InvoiceCategory
                invoiceTypes={invoiceTypes}
                activeType={activeType}
                onSelectType={(type) => {
                  if (!type) return
                  const cfg = configs[type.id] || {}
                  const doc = type.documents.find((d) => cfg[d]?.enabled) || type.documents[0] || null
                  applyTypeSelection(type)
                  setActiveDoc(doc)
                  setOpenTypes((prev) => ({ ...prev, [type.id]: true }))
                }}
              />
            ) : null}
          </div>
          <div className={`ic-tab-panel${activeTab === TAB_SAP_MAPPING ? ' is-visible' : ''}`}>
            <SapFieldMapping onViewRules={() => setActiveTab(TAB_VALIDATION_RULES)} />
          </div>
          <div className={`ic-tab-panel${activeTab === TAB_VALIDATION_RULES ? ' is-visible' : ''}`}>
            <ValidationRules />
          </div>
          <div className={`ic-tab-panel${activeTab === TAB_NWAY_MATCHING ? ' is-visible' : ''}`}>
            {activeTab === TAB_NWAY_MATCHING ? <MatchRules /> : null}
          </div>
          {activeTab === TAB_FIELDS || activeTab === TAB_DOCUMENT_TYPES ? (
          <>
          <div className="prompt-config__panes">
            <aside className="prompt-config__tree">
              <div className="prompt-config__tree-search">
                <input
                  type="text"
                  value={searchTerm}
                  placeholder="Search category…"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="prompt-config__tree-body">
                {loading ? (
                  <div className="prompt-config__empty prompt-config__empty--compact">
                    <p>Loading invoice types…</p>
                  </div>
                ) : groupedTypes.length === 0 ? (
                  <div className="prompt-config__empty prompt-config__empty--compact">
                    <p>
                      {searchTerm
                        ? 'No invoice types match that search.'
                        : 'No invoice types found. Run the extraction-prompts seed on the backend.'}
                    </p>
                  </div>
                ) : (
                  groupedTypes.map((group) => (
                    <div key={group.category}>
                      <div className="prompt-config__cat-label">{group.category}</div>
                      {group.types.map((type) => {
                        const isOpen = Boolean(searchTerm) || Boolean(openTypes[type.id])
                        const fieldCount = typeFieldCount(type, configs)
                        const typeCfg = configs[type.id] || {}
                        return (
                          <div
                            key={type.id}
                            className={`prompt-config__type${isOpen ? ' is-open' : ''}`}>
                            <button
                              type="button"
                              className={`prompt-config__type-head${
                                activeType?.id === type.id ? ' is-active' : ''
                              }`}
                              onClick={() => handleTypeHeadClick(type)}>
                              <ChevronRight size={14} className="prompt-config__type-chev" />
                              <span className="prompt-config__type-name">{type.subtype}</span>
                              <span className="prompt-config__type-count">{fieldCount}</span>
                            </button>
                            {isOpen ? (
                              <div className="prompt-config__docs">
                                {type.documents.map((doc) => {
                                  const docCfg = typeCfg[doc]
                                  if (!docCfg) return null
                                  const isActive = activeType?.id === type.id && activeDoc === doc
                                  return (
                                    <div
                                      key={docCfg.typeDocumentId ?? doc}
                                      className={`prompt-config__doc${
                                        isActive ? ' is-active' : ''
                                      }`}
                                      onClick={() => selectDocument(type, doc)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault()
                                          selectDocument(type, doc)
                                        }
                                      }}
                                      role="button"
                                      tabIndex={0}>
                                      <label
                                        className="prompt-config-switch"
                                        onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          checked={Boolean(docCfg.enabled)}
                                          disabled={busy}
                                          onChange={(e) =>
                                            toggleDoc(type, doc, e.target.checked, e)
                                          }
                                        />
                                        <span className="prompt-config-switch__track">
                                          <span className="prompt-config-switch__thumb" />
                                        </span>
                                      </label>
                                      <span className="prompt-config__doc-name">{doc}</span>
                                      {docCfg.mandatory ? (
                                        <span className="prompt-config__doc-required">Req</span>
                                      ) : null}
                                      <span className="prompt-config__doc-count">
                                        {docCfg.fields.length || ''}
                                      </span>
                                    </div>
                                  )
                                })}
                                {activeTab === TAB_FIELDS && activeType?.id === type.id ? (
                                  <div className="prompt-config-add-doc">
                                    <input
                                      type="text"
                                      className="prompt-config-add-doc__input"
                                      placeholder="New document type name"
                                      value={newDocName}
                                      disabled={busy}
                                      onChange={(e) => setNewDocName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          handleAddDocument(type)
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="prompt-config-add-doc__btn"
                                      disabled={busy || !newDocName.trim()}
                                      onClick={() => handleAddDocument(type)}>
                                      <Plus size={13} />
                                      {addingDoc ? 'Adding…' : 'Add'}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>
            </aside>

            {activeTab === TAB_DOCUMENT_TYPES ? (
              <DocumentTypes
                activeType={activeType}
                configs={configs}
                selectedDoc={activeDoc}
                busy={busy}
                onSelectDoc={selectDocument}
                onToggleEnabled={toggleDoc}
                onUpdateSettings={updateDocSettings}
                onAddDocument={(settings) => handleAddDocument(activeType, settings)}
                onRenameDocument={commitDocRename}
                onRemoveDocument={requestRemoveDocument}
                onGoToFields={() => setActiveTab(TAB_FIELDS)}
                onToggleMandatory={toggleMandatory}
                onSaveSettings={saveDocumentSettings}
                savingSettings={savingDocSettings}
              />
            ) : (
            <>
            <section className="prompt-config__table">
              {!activeType || !activeDoc || !activeDocCfg ? (
                <div className="prompt-config__empty">
                  <p>Select a document from the list to view and edit its fields.</p>
                </div>
              ) : (
                <>
                  <div className="prompt-config__table-toolbar">
                    <div className="prompt-config__toolbar-title">
                      <input
                        className="prompt-config__doc-title-input"
                        value={activeDocNameDraft}
                        disabled={busy || !activeDocCfg.typeDocumentId}
                        placeholder="Document type name"
                        onChange={(e) =>
                          updateDocNameDraft(activeDocCfg.typeDocumentId, e.target.value)
                        }
                        onBlur={() => commitDocRename(activeDoc)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            e.currentTarget.blur()
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            updateDocNameDraft(activeDocCfg.typeDocumentId, activeDoc)
                            e.currentTarget.blur()
                          }
                        }}
                      />
                      <p>
                        {activeType.subtype} · {activeType.category}
                        {activeDocCfg.enabled ? '' : ' · document not included in extraction'}
                        {activeDocCfg.mandatory ? ' · required for extraction' : ''}
                        {renamingDocId === activeDocCfg.typeDocumentId ? ' · Saving…' : ''}
                      </p>
                    </div>
                    <div className="prompt-config__toolbar-actions">
                      <span className="prompt-config__toolbar-mandatory">
                        <span className="prompt-config__th-with-help">
                          Required for extraction
                          <MandatoryHelp />
                        </span>
                        <label className="prompt-config-switch">
                          <input
                            type="checkbox"
                            checked={Boolean(activeDocCfg.mandatory)}
                            disabled={busy}
                            onChange={(e) =>
                              toggleMandatory(activeType, activeDoc, e.target.checked)
                            }
                          />
                          <span className="prompt-config-switch__track">
                            <span className="prompt-config-switch__thumb" />
                          </span>
                        </label>
                      </span>
                      <button
                        type="button"
                        className="prompt-config__btn-ghost"
                        disabled={busy}
                        onClick={() => toggleDoc(activeType, activeDoc, !activeDocCfg.enabled)}>
                        {activeDocCfg.enabled ? 'Exclude document' : 'Include document'}
                      </button>
                      <button
                        type="button"
                        className="prompt-config__btn-ghost prompt-config__btn-ghost--danger"
                        disabled={busy}
                        onClick={() => requestRemoveDocument(activeDoc)}>
                        Remove
                      </button>
                      <button
                        type="button"
                        className="prompt-config__btn-primary"
                        disabled={busy}
                        onClick={() => addField(activeDoc)}>
                        + Add field
                      </button>
                    </div>
                  </div>

                  <div className="prompt-config__table-scroll">
                    <table className="prompt-config__fields">
                      <thead>
                        <tr>
                          <th style={{ width: 26 }}>#</th>
                          <th>Field name</th>
                          <th>Display name</th>
                          <th>Hint</th>
                          <th style={{ width: 60 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {activeDocCfg.fields.length === 0 ? (
                          <tr>
                            <td className="prompt-config__fields-empty" colSpan={5}>
                              No fields defined yet for this document.
                            </td>
                          </tr>
                        ) : (
                          activeDocCfg.fields.map((field, index) => (
                            <tr
                              key={field.fieldId ?? `${activeDoc}-${index}`}
                              className={selectedFieldIdx === index ? 'is-selected' : ''}
                              onClick={() => setSelectedFieldIdx(index)}>
                              <td className="prompt-config__fields-index">{index + 1}</td>
                              <td>
                                <span className="prompt-config__fname">{field.name || '—'}</span>
                              </td>
                              <td>
                                <span className="prompt-config__fdisplay">
                                  {field.displayName || '—'}
                                </span>
                              </td>
                              <td>
                                <span className="prompt-config__fhint">{field.hint || '—'}</span>
                              </td>
                              <td>
                                <div className="prompt-config__frow-actions">
                                  <button
                                    type="button"
                                    className="prompt-config__icon-btn"
                                    title="Remove"
                                    aria-label={`Remove ${
                                      field.displayName || field.name || 'field'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeField(activeDoc, index)
                                    }}>
                                    <X size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <aside className="prompt-config__inspect">
              {!selectedField ? (
                activeDoc && activeDocCfg ? (
                  <>
                    <div className="prompt-config__inspect-head">
                      <h3>{activeDoc}</h3>
                      <p>{activeType?.subtype}</p>
                    </div>
                    <div className="prompt-config__inspect-body">
                      <MandatoryToggleRow
                        id="pc-fields-doc-mandatory"
                        checked={Boolean(activeDocCfg.mandatory)}
                        disabled={busy}
                        onChange={(mandatory) =>
                          toggleMandatory(activeType, activeDoc, mandatory)
                        }
                      />
                      <p className="prompt-config__field-help" style={{ fontSize: 12.5, marginTop: 0 }}>
                        {activeDocCfg.fields.length} field
                        {activeDocCfg.fields.length === 1 ? '' : 's'} configured for this
                        document. Click a row in the table to edit one.
                      </p>
                      <hr className="prompt-config__divider" />
                      <button
                        type="button"
                        className="prompt-config__btn-ghost"
                        style={{ width: '100%' }}
                        onClick={() => setActiveTab(TAB_DOCUMENT_TYPES)}>
                        Edit classification & split settings →
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="prompt-config__inspect-head">
                      <h3>Field details</h3>
                      <p>Select a field to edit</p>
                    </div>
                    <div className="prompt-config__inspect-empty">
                      Click a row in the table to inspect and edit that field.
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="prompt-config__inspect-head">
                    <h3>{selectedField.displayName || 'Untitled field'}</h3>
                    <p>
                      {activeDoc} · {activeType?.subtype}
                    </p>
                  </div>
                  <div className="prompt-config__inspect-body">
                    <div className="prompt-config__field-group">
                      <label htmlFor="pc-field-display">Display name</label>
                      <input
                        id="pc-field-display"
                        type="text"
                        placeholder="e.g. Invoice Number"
                        value={selectedField.displayName || ''}
                        onChange={(e) =>
                          updateField(activeDoc, selectedFieldIdx, 'displayName', e.target.value)
                        }
                      />
                    </div>
                    <div className="prompt-config__field-group">
                      <label htmlFor="pc-field-name">Field name (key)</label>
                      <input
                        id="pc-field-name"
                        className="is-mono"
                        type="text"
                        placeholder="e.g. invNo"
                        value={selectedField.name}
                        onChange={(e) =>
                          updateField(activeDoc, selectedFieldIdx, 'name', e.target.value)
                        }
                        onBlur={refreshPreviewFromConfigs}
                      />
                    </div>
                    <div className="prompt-config__field-group">
                      <label htmlFor="pc-field-hint">Hint</label>
                      <input
                        id="pc-field-hint"
                        type="text"
                        placeholder="format, location, or aliases"
                        value={selectedField.hint}
                        onChange={(e) =>
                          updateField(activeDoc, selectedFieldIdx, 'hint', e.target.value)
                        }
                        onBlur={refreshPreviewFromConfigs}
                      />
                    </div>
                    <div className="prompt-config__snippet">
                      <div className="prompt-config__snippet-label">
                        Appears in generated prompt as
                      </div>
                      <div className="prompt-config__snippet-line">
                        {fieldSnippet(selectedField)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="prompt-config__remove-field"
                      onClick={() => removeField(activeDoc, selectedFieldIdx)}>
                      Remove this field
                    </button>
                  </div>
                </>
              )}
            </aside>
            </>
            )}
          </div>

          {activeTab === TAB_DOCUMENT_TYPES ? (
            <div className="prompt-config__preview-bar">
              <div className="prompt-config__preview-head">
                <span className="prompt-config__preview-label">
                  Classification prompt preview
                </span>
                <div className="prompt-config__preview-btns">
                  <button
                    type="button"
                    className={`prompt-config__btn-small${copied ? ' is-saved' : ''}`}
                    disabled={!classificationPromptText}
                    onClick={() => handleCopy(classificationPromptText)}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <p className="prompt-config__preview-note">
                Built from enabled documents&apos; category IDs, classification hints, and split
                behavior. This is what the page classifier uses to split the bundle — not the
                field-extraction template.
              </p>
              <textarea
                className="prompt-config__preview"
                value={classificationPromptText}
                readOnly
                spellCheck={false}
                placeholder="Select an invoice type to preview its classification prompt."
              />
            </div>
          ) : (
          <div className="prompt-config__preview-bar">
            <div className="prompt-config__preview-head">
              <span className="prompt-config__preview-label">
                Extraction prompt preview — editable
              </span>
              <div className="prompt-config__preview-btns">
                <button
                  type="button"
                  className="prompt-config__btn-small"
                  disabled={!activeType || generating || saving}
                  onClick={handleGenerate}>
                  {generating ? 'Generating…' : 'Regenerate'}
                </button>
                <button
                  type="button"
                  className={`prompt-config__btn-small${copied ? ' is-saved' : ''}`}
                  disabled={!promptText}
                  onClick={() => handleCopy(promptText)}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  className={`prompt-config__btn-small${saved ? ' is-saved' : ''}`}
                  disabled={!activeType || saving || generating}
                  onClick={handleSave}>
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save template'}
                </button>
              </div>
            </div>
            <p className="prompt-config__preview-note">
              Built from enabled documents and Fields to Capture. Used after classification to
              extract JSON from each split document.
            </p>
            <textarea
              className="prompt-config__preview"
              value={promptText}
              spellCheck={false}
              placeholder="Select an invoice type to preview its extraction prompt."
              onChange={(e) => {
                setPromptText(e.target.value)
                setEdited(true)
              }}
            />
          </div>
          )}
          </>
          ) : null}
        </div>
      </div>
      <Dialog
        open={Boolean(docPendingDelete)}
        onClose={closeDeleteDocumentDialog}
        width={460}
        title="Delete document type?"
        description={
          docPendingDelete
            ? `Remove “${docPendingDelete}” from ${activeType?.subtype || 'this invoice type'}?`
            : undefined
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closeDeleteDocumentDialog}
              disabled={Boolean(removingDoc)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmRemoveDocument}
              disabled={Boolean(removingDoc)}>
              {removingDoc ? 'Deleting…' : 'Delete document'}
            </Button>
          </>
        }>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--dx-text-soft, #4b5563)'
          }}>
          Its fields will be removed from this extraction template. Previously extracted invoice
          data is kept and can still be shown again if you re-add the document later.
        </p>
      </Dialog>
    </LeftPageContainer>
  )
}

export default PromptConfig
