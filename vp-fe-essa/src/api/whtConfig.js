import axiosInstance from '../services/axiosSetup'

/**
 * WHT configuration — rule matrix (one row per SAP WH code), vendor SKB / PP23 facilities,
 * and the read-only, versioned Tax Rate document. SBUJK is disabled server-side.
 * Backend: /wht-config (cfg."WHT_*" tables, migrations 043 / 044).
 */
export const WHT_CONFIG = '/wht-config'
const TAX_RATES = `${WHT_CONFIG}/tax-rate-documents`

const errorMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback
const wrap = (fallback) => (err) => {
  throw new Error(errorMessage(err, fallback))
}

/** Rules, facilities, taxonomy (category → condition → sub-condition), SAP codes, rate types. */
export async function fetchWhtConfig() {
  const response = await axiosInstance.get(WHT_CONFIG).catch(wrap('Could not load the WHT configuration'))
  const data = response?.data?.data || {}
  return {
    rules: data.rules || [],
    facilities: data.facilities || [],
    taxonomy: data.taxonomy || [],
    sapCodes: data.sapCodes || [],
    rateTypes: data.rateTypes || [],
    sbujkEnabled: Boolean(data.sbujkEnabled),
    taxRateDocument: data.taxRateDocument || null
  }
}

export async function saveWhtRecord(list, record) {
  const { id, ...payload } = record
  const response = await (id
    ? axiosInstance.patch(`${WHT_CONFIG}/${list}/${id}`, payload)
    : axiosInstance.post(`${WHT_CONFIG}/${list}`, payload)
  ).catch(wrap('Could not save'))
  return response?.data?.data || null
}

export async function deleteWhtRecord(list, id) {
  const response = await axiosInstance.delete(`${WHT_CONFIG}/${list}/${id}`).catch(wrap('Could not delete'))
  return response?.data?.data || null
}

export async function evaluateWht(input) {
  const response = await axiosInstance.post(`${WHT_CONFIG}/evaluate`, input).catch(wrap('Could not evaluate'))
  return response?.data?.data || null
}

// ---- Tax Rate document ----

export async function listTaxRateVersions() {
  const response = await axiosInstance.get(TAX_RATES).catch(wrap('Could not load the version history'))
  return response?.data?.data || []
}

/** id or 'current' → { versionNo, fileName, columns, rows, … } or null when nothing is uploaded. */
export async function getTaxRateVersion(id = 'current') {
  const response = await axiosInstance.get(`${TAX_RATES}/${id}`).catch(wrap('Could not load the Tax Rate document'))
  return response?.data?.data || null
}

export async function uploadTaxRateDocument(file, notes) {
  const form = new FormData()
  form.append('file', file)
  if (notes) form.append('notes', notes)
  const response = await axiosInstance
    .post(TAX_RATES, form, {
      timeout: 120000,
      // let the browser set multipart/form-data with its boundary (the instance defaults to JSON)
      transformRequest: [
        (data, headers) => {
          if (headers && typeof headers.delete === 'function') headers.delete('Content-Type')
          else if (headers) delete headers['Content-Type']
          return data
        }
      ]
    })
    .catch(wrap('Upload failed'))
  return response?.data?.data || null
}

export async function activateTaxRateVersion(id) {
  const response = await axiosInstance.post(`${TAX_RATES}/${id}/activate`).catch(wrap('Could not switch version'))
  return response?.data?.data || null
}

export async function deleteTaxRateVersion(id) {
  const response = await axiosInstance.delete(`${TAX_RATES}/${id}`).catch(wrap('Could not delete the version'))
  return response?.data?.data || null
}

/** Download the original uploaded file of a version. */
export async function downloadTaxRateVersion(id, fileName) {
  const response = await axiosInstance
    .get(`${TAX_RATES}/${id}/file`, { responseType: 'blob' })
    .catch(wrap('Could not download the file'))
  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'tax-rates.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
