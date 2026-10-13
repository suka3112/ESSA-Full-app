import axiosInstance from '../services/axiosSetup'

/**
 * WHT configuration — rule matrix, tax treaty rates, vendor SKB / PP23 facilities, SBUJK.
 * Backend: /wht-config (cfg."WHT_*" tables, migration 043).
 * Lists: 'rules' | 'treaties' | 'facilities' | 'sbujk'
 */
export const WHT_CONFIG = '/wht-config'

const errorMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback

export async function fetchWhtConfig() {
  const response = await axiosInstance.get(WHT_CONFIG)
  const data = response?.data?.data || {}
  return {
    rules: data.rules || [],
    treaties: data.treaties || [],
    facilities: data.facilities || [],
    sbujk: data.sbujk || []
  }
}

export async function saveWhtRecord(list, record) {
  try {
    const { id, ...payload } = record
    const response = id
      ? await axiosInstance.patch(`${WHT_CONFIG}/${list}/${id}`, payload)
      : await axiosInstance.post(`${WHT_CONFIG}/${list}`, payload)
    return response?.data?.data || null
  } catch (err) {
    throw new Error(errorMessage(err, 'Could not save'))
  }
}

export async function deleteWhtRecord(list, id) {
  try {
    const response = await axiosInstance.delete(`${WHT_CONFIG}/${list}/${id}`)
    return response?.data?.data || null
  } catch (err) {
    throw new Error(errorMessage(err, 'Could not delete'))
  }
}

export async function evaluateWht(input) {
  try {
    const response = await axiosInstance.post(`${WHT_CONFIG}/evaluate`, input)
    return response?.data?.data || null
  } catch (err) {
    throw new Error(errorMessage(err, 'Could not evaluate'))
  }
}
