import axiosInstance from '../services/axiosSetup'

export const INVOICE_CONFIG = '/invoice-config'
export const INVOICE_CONFIG_SAP_MAPPINGS = `${INVOICE_CONFIG}/sap-mappings`
export const INVOICE_CONFIG_SAP_MAPPING = (mappingId) =>
  `${INVOICE_CONFIG_SAP_MAPPINGS}/${mappingId}`
export const INVOICE_CONFIG_VALIDATION_RULES = `${INVOICE_CONFIG}/validation-rules`
export const INVOICE_CONFIG_VALIDATION_RULE = (ruleId) =>
  `${INVOICE_CONFIG_VALIDATION_RULES}/${ruleId}`

export async function fetchInvoiceConfig(invoiceTypeCode, { configVersionId } = {}) {
  const params = { invoiceTypeCode }
  if (configVersionId) params.configVersionId = configVersionId
  const response = await axiosInstance.get(INVOICE_CONFIG, { params })
  return response?.data?.data || null
}

export async function createSapMapping(payload) {
  const response = await axiosInstance.post(INVOICE_CONFIG_SAP_MAPPINGS, payload)
  return response?.data?.data || null
}

export async function updateSapMapping(mappingId, payload) {
  const response = await axiosInstance.patch(INVOICE_CONFIG_SAP_MAPPING(mappingId), payload)
  return response?.data?.data || null
}

export async function createValidationRule(payload) {
  const response = await axiosInstance.post(INVOICE_CONFIG_VALIDATION_RULES, payload)
  return response?.data?.data || null
}

export async function updateValidationRule(ruleId, payload) {
  const response = await axiosInstance.patch(INVOICE_CONFIG_VALIDATION_RULE(ruleId), payload)
  return response?.data?.data || null
}
