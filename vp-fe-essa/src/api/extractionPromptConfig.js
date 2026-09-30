import axiosInstance from '../services/axiosSetup'
import { resolveDocumentTypeDefaults } from '../components/Essa/PromptConfig/documentTypeDefaults'

export const EXTRACTION_PROMPT_CONFIG = '/extraction-prompt-config/prompt-config'
export const EXTRACTION_PROMPT_CATEGORIES = '/extraction-prompt-config/prompt-config/categories'
export const EXTRACTION_PROMPT_CATEGORY = (categoryId) =>
  `/extraction-prompt-config/prompt-config/categories/${categoryId}`
export const EXTRACTION_PROMPT_CATEGORY_INVOICE_TYPES = (categoryId) =>
  `/extraction-prompt-config/prompt-config/categories/${categoryId}/invoice-types`
export const EXTRACTION_PROMPT_INVOICE_TYPE = (invoiceTypeId) =>
  `/extraction-prompt-config/prompt-config/invoice-types/${invoiceTypeId}`
export const EXTRACTION_PROMPT_DOCUMENTS = (invoiceTypeId) =>
  `${EXTRACTION_PROMPT_INVOICE_TYPE(invoiceTypeId)}/documents`
export const EXTRACTION_PROMPT_DOCUMENT = (invoiceTypeId, typeDocumentId) =>
  `${EXTRACTION_PROMPT_DOCUMENTS(invoiceTypeId)}/${typeDocumentId}`
export const EXTRACTION_PROMPT_PROMPT = (invoiceTypeId) =>
  `${EXTRACTION_PROMPT_INVOICE_TYPE(invoiceTypeId)}/prompt`
export const EXTRACTION_PROMPT_REGENERATE = (invoiceTypeId) =>
  `${EXTRACTION_PROMPT_PROMPT(invoiceTypeId)}/regenerate`

export async function createCategory({ name, code } = {}) {
  const response = await axiosInstance.post(EXTRACTION_PROMPT_CATEGORIES, { name, code })
  return response?.data?.data || null
}

export async function deleteCategory(categoryId) {
  const response = await axiosInstance.delete(EXTRACTION_PROMPT_CATEGORY(categoryId))
  return response?.data?.data || null
}

export async function createInvoiceType(categoryId, { name, code } = {}) {
  const response = await axiosInstance.post(
    EXTRACTION_PROMPT_CATEGORY_INVOICE_TYPES(categoryId),
    { name, code }
  )
  return response?.data?.data || null
}

export async function updateInvoiceType(invoiceTypeId, payload = {}) {
  const response = await axiosInstance.patch(EXTRACTION_PROMPT_INVOICE_TYPE(invoiceTypeId), payload)
  return response?.data?.data || null
}

export async function deleteInvoiceType(invoiceTypeId) {
  const response = await axiosInstance.delete(EXTRACTION_PROMPT_INVOICE_TYPE(invoiceTypeId))
  return response?.data?.data || null
}

export async function fetchPromptConfig() {
  const response = await axiosInstance.get(EXTRACTION_PROMPT_CONFIG)
  return response?.data?.data || null
}

/** Resolve saved Prompt Builder text for a category/type code (e.g. NON_PO). */
export async function fetchPromptTextByInvoiceTypeCode(code) {
  const tree = await fetchPromptConfig()
  const wanted = String(code || '').trim().toUpperCase()
  for (const category of tree?.categories || []) {
    for (const type of category.invoiceTypes || []) {
      const typeCode = String(type.code || '').trim().toUpperCase()
      if (typeCode === wanted) {
        const text = String(type.promptTemplate?.promptText || '').trim()
        return text || null
      }
    }
  }
  return null
}

/** Resolve invoice-type detail (enabled docs, fields, configHash) by type code. */
export async function fetchInvoiceTypePromptConfigByCode(code) {
  const tree = await fetchPromptConfig()
  const wanted = String(code || '').trim().toUpperCase()
  for (const category of tree?.categories || []) {
    for (const type of category.invoiceTypes || []) {
      if (String(type.code || '').trim().toUpperCase() === wanted) {
        return type
      }
    }
  }
  return null
}

export async function fetchInvoiceTypePromptConfig(invoiceTypeId) {
  const response = await axiosInstance.get(EXTRACTION_PROMPT_INVOICE_TYPE(invoiceTypeId))
  return response?.data?.data || null
}

export async function saveInvoiceTypeDocuments(invoiceTypeId, documents) {
  const response = await axiosInstance.put(EXTRACTION_PROMPT_DOCUMENTS(invoiceTypeId), {
    documents
  })
  return response?.data?.data || null
}

/** Create a custom document type and link it to the invoice type (enabled by default). */
export async function createInvoiceTypeDocument(invoiceTypeId, { name, isEnabled = true, isMandatory = false }) {
  const response = await axiosInstance.post(EXTRACTION_PROMPT_DOCUMENTS(invoiceTypeId), {
    name,
    isEnabled,
    isMandatory
  })
  return response?.data?.data || null
}

/** Soft-remove a document type from an invoice type (fields soft-deleted; catalog kept). */
export async function deleteInvoiceTypeDocument(invoiceTypeId, typeDocumentId) {
  const response = await axiosInstance.delete(
    EXTRACTION_PROMPT_DOCUMENT(invoiceTypeId, typeDocumentId)
  )
  return response?.data?.data || null
}

/** Rename a document type linked to an invoice type. */
export async function renameInvoiceTypeDocument(invoiceTypeId, typeDocumentId, { name }) {
  const response = await axiosInstance.patch(
    EXTRACTION_PROMPT_DOCUMENT(invoiceTypeId, typeDocumentId),
    { name }
  )
  return response?.data?.data || null
}

export async function saveInvoiceTypePrompt(invoiceTypeId, { promptText, isManuallyEdited }) {
  const response = await axiosInstance.put(EXTRACTION_PROMPT_PROMPT(invoiceTypeId), {
    promptText,
    isManuallyEdited
  })
  return response?.data?.data || null
}

export async function regenerateInvoiceTypePrompt(invoiceTypeId, { force = false } = {}) {
  const response = await axiosInstance.post(EXTRACTION_PROMPT_REGENERATE(invoiceTypeId), {
    force
  })
  return response?.data?.data || null
}

/** Map API tree → PromptConfig UI shapes. */
export function mapPromptConfigToUiState(tree) {
  const invoiceTypes = []
  const configs = {}
  const promptMeta = {}

  for (const category of tree?.categories || []) {
    for (const type of category.invoiceTypes || []) {
      const id = String(type.invoiceTypeId)
      const documents = (type.documents || [])
        .slice()
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

      invoiceTypes.push({
        id,
        invoiceTypeId: type.invoiceTypeId,
        category: category.name,
        categoryCode: category.code,
        subtype: type.name,
        code: type.code,
        documents: documents.map((d) => d.name),
        typeDocuments: documents
      })

      configs[id] = {}
      documents.forEach((doc) => {
        const extras = resolveDocumentTypeDefaults(doc.name, {
          categoryId: doc.categoryId,
          splitBehavior: doc.splitBehavior,
          classificationHints: doc.classificationHints,
          mandatory: doc.isMandatory
        })
        configs[id][doc.name] = {
          typeDocumentId: doc.typeDocumentId,
          enabled: Boolean(doc.isEnabled),
          mandatory: Boolean(doc.isMandatory),
          fields: (doc.fields || [])
            .slice()
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
            .map((f) => ({
              fieldId: f.fieldId,
              name: f.fieldName || '',
              displayName: f.displayName || '',
              hint: f.hint || ''
            })),
          ...extras
        }
      })

      promptMeta[id] = {
        promptText: type.promptTemplate?.promptText || '',
        isManuallyEdited: Boolean(type.promptTemplate?.isManuallyEdited)
      }
    }
  }

  return { invoiceTypes, configs, promptMeta }
}

export function buildDocumentsPayload(type, typeConfig) {
  const docs = type.typeDocuments || []
  return docs.map((docMeta, index) => {
    const docName = docMeta.name
    const cfg = typeConfig?.[docName] || { enabled: false, fields: [] }
    return {
      typeDocumentId: cfg.typeDocumentId ?? docMeta.typeDocumentId,
      isEnabled: Boolean(cfg.enabled),
      isMandatory: Boolean(cfg.mandatory),
      categoryId: cfg.categoryId || '',
      splitBehavior: cfg.splitBehavior || 'contiguous',
      classificationHints: cfg.classificationHints || '',
      displayOrder: docMeta.displayOrder ?? index + 1,
      fields: (cfg.fields || []).map((f, fieldIndex) => ({
        fieldId: f.fieldId ?? null,
        fieldName: f.name || '',
        displayName: f.displayName || '',
        hint: f.hint || '',
        displayOrder: fieldIndex + 1
      }))
    }
  })
}

/** Merge a refreshed invoice-type detail into local UI configs / promptMeta. */
export function applyInvoiceTypeDetail(prevConfigs, prevPromptMeta, detail) {
  if (!detail) return { configs: prevConfigs, promptMeta: prevPromptMeta }

  const id = String(detail.invoiceTypeId)
  const prevTypeConfig = prevConfigs[id] || {}
  const prevById = {}
  Object.values(prevTypeConfig).forEach((docCfg) => {
    if (docCfg?.typeDocumentId != null) prevById[docCfg.typeDocumentId] = docCfg
  })
  const nextTypeConfig = {}
  ;(detail.documents || []).forEach((doc) => {
    const prevDoc = prevTypeConfig[doc.name] || prevById[doc.typeDocumentId] || {}
    const extras = resolveDocumentTypeDefaults(doc.name, {
      categoryId: doc.categoryId || prevDoc.categoryId,
      splitBehavior: doc.splitBehavior || prevDoc.splitBehavior,
      classificationHints: doc.classificationHints ?? prevDoc.classificationHints,
      mandatory: doc.isMandatory ?? prevDoc.mandatory
    })
    nextTypeConfig[doc.name] = {
      typeDocumentId: doc.typeDocumentId,
      enabled: Boolean(doc.isEnabled),
      mandatory: Boolean(doc.isMandatory ?? extras.mandatory ?? prevDoc.mandatory),
      fields: (doc.fields || []).map((f) => ({
        fieldId: f.fieldId,
        name: f.fieldName || '',
        displayName: f.displayName || '',
        hint: f.hint || ''
      })),
      ...extras
    }
  })

  return {
    configs: { ...prevConfigs, [id]: nextTypeConfig },
    promptMeta: {
      ...prevPromptMeta,
      [id]: {
        promptText: detail.promptTemplate?.promptText || '',
        isManuallyEdited: Boolean(detail.promptTemplate?.isManuallyEdited)
      }
    }
  }
}
