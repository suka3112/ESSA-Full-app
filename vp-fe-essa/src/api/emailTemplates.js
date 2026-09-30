import axiosInstance from '../services/axiosSetup'
import {
  createEmailTemplate as createLocal,
  deleteEmailTemplate as deleteLocal,
  duplicateEmailTemplate as duplicateLocal,
  getEmailTemplateDetail as getLocalDetail,
  listEmailTemplates as listLocal,
  previewEmailTemplate as previewLocal,
  restoreEmailTemplateVersion as restoreLocal,
  updateEmailTemplate as updateLocal
} from '../components/Essa/lib/emailTemplatesStore'

const ESSA_TEMPLATES_API = '/essa/email-templates'

export const essaBackendEnabled = () => process.env.REACT_APP_ESSA_USE_BACKEND === 'true'

const unwrap = (body) => (body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body)

const apiError = (error) => {
  const problems = error?.response?.data?.problems
  if (Array.isArray(problems) && problems.length) {
    return new Error(problems.join(' '))
  }
  return new Error(error?.response?.data?.message || error.message || 'Request failed')
}

const mapScenario = (s = {}) => {
  const variables = (s.variables || []).map((v) => ({
    name: v.name,
    label: v.label,
    sample: v.sample || v.sampleValue || '',
    required: !!v.required
  }))
  return {
    key: s.key,
    label: s.label,
    description: s.description || '',
    category: s.category,
    recipients: {
      to: s.defaultTo || s.recipients?.to || '',
      cc: s.defaultCc || s.recipients?.cc || '',
      bcc: s.defaultBcc || s.recipients?.bcc || ''
    },
    variables,
    required: s.required || variables.filter((v) => v.required).map((v) => v.name)
  }
}

const mapTemplate = (t = {}) => ({
  ...t,
  system: !!(t.system ?? t.isSystem),
  recipients: {
    to: t.recipients?.to || '',
    cc: t.recipients?.cc || '',
    bcc: t.recipients?.bcc || ''
  }
})

const mapDetail = (payload) => ({
  template: payload?.template ? mapTemplate(payload.template) : null,
  versions: (payload?.versions || []).map((v) => ({
    ...v,
    id: v.id ?? v.versionId,
    snapshot: v.snapshot || {}
  }))
})

export async function listEmailTemplates() {
  if (!essaBackendEnabled()) return listLocal()
  try {
    const response = await axiosInstance.get(ESSA_TEMPLATES_API, {
      params: { page: 1, pageSize: 50, sort: 'updatedAt', dir: 'desc' }
    })
    const payload = unwrap(response.data) || {}
    return {
      items: (payload.items || []).map(mapTemplate),
      scenarios: (payload.scenarios || []).map(mapScenario)
    }
  } catch {
    return listLocal()
  }
}

export async function getEmailTemplateDetail(id) {
  if (!essaBackendEnabled()) return getLocalDetail(id)
  try {
    const response = await axiosInstance.get(`${ESSA_TEMPLATES_API}/${encodeURIComponent(id)}`)
    return mapDetail(unwrap(response.data))
  } catch {
    return getLocalDetail(id)
  }
}

export async function createEmailTemplate(payload, actor) {
  if (!essaBackendEnabled()) return createLocal(payload, actor)
  try {
    const response = await axiosInstance.post(ESSA_TEMPLATES_API, payload)
    return mapTemplate(unwrap(response.data)?.template || unwrap(response.data))
  } catch (error) {
    throw apiError(error)
  }
}

export async function updateEmailTemplate(id, payload, actor) {
  if (!essaBackendEnabled()) return updateLocal(id, payload, actor)
  try {
    const response = await axiosInstance.put(`${ESSA_TEMPLATES_API}/${encodeURIComponent(id)}`, payload)
    return mapTemplate(unwrap(response.data)?.template || unwrap(response.data))
  } catch (error) {
    throw apiError(error)
  }
}

export async function duplicateEmailTemplate(id, actor) {
  if (!essaBackendEnabled()) return duplicateLocal(id, actor)
  try {
    const response = await axiosInstance.post(`${ESSA_TEMPLATES_API}/${encodeURIComponent(id)}/duplicate`)
    return mapTemplate(unwrap(response.data)?.template || unwrap(response.data))
  } catch (error) {
    throw apiError(error)
  }
}

export async function deleteEmailTemplate(id) {
  if (!essaBackendEnabled()) return deleteLocal(id)
  try {
    await axiosInstance.delete(`${ESSA_TEMPLATES_API}/${encodeURIComponent(id)}`)
  } catch (error) {
    throw apiError(error)
  }
}

export async function restoreEmailTemplateVersion(templateId, versionId, actor) {
  if (!essaBackendEnabled()) return restoreLocal(templateId, versionId, actor)
  try {
    const response = await axiosInstance.post(
      `${ESSA_TEMPLATES_API}/${encodeURIComponent(templateId)}/restore`,
      { versionId }
    )
    return mapTemplate(unwrap(response.data)?.template || unwrap(response.data))
  } catch (error) {
    throw apiError(error)
  }
}

export async function testEmailTemplate(id) {
  if (!essaBackendEnabled()) return { sent: false, local: true }
  try {
    const response = await axiosInstance.post(`${ESSA_TEMPLATES_API}/${encodeURIComponent(id)}/test`)
    return unwrap(response.data)
  } catch (error) {
    throw apiError(error)
  }
}

export async function previewEmailTemplate(payload) {
  if (!essaBackendEnabled()) return previewLocal(payload)
  try {
    const response = await axiosInstance.post(`${ESSA_TEMPLATES_API}/preview`, payload)
    const result = unwrap(response.data) || {}
    return {
      subject: result.subject ?? payload?.subject ?? '',
      html: result.html ?? payload?.bodyHtml ?? '',
      text: result.text ?? '',
      values: result.values || {}
    }
  } catch (error) {
    throw apiError(error)
  }
}
