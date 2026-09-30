/**
 * ESSA Vendor Master Data Service
 * Connects directly to the PostgreSQL database via backend /vendor-portal/essa/vendors API.
 */
import axiosInstance from 'services/axiosSetup'

/**
 * Fetch vendors list from database with search, facets, sorting & pagination
 */
export async function getEssaVendors({
  search = '',
  taxStatus,
  controlState,
  sapStatus,
  sortBy,
  sortDir = 'asc',
  page = 1,
  pageSize = 25
} = {}) {
  try {
    const res = await axiosInstance.get('/essa/vendors', {
      params: {
        search: search || undefined,
        taxStatus: taxStatus || undefined,
        controlState: controlState || undefined,
        sapStatus: sapStatus || undefined,
        sortBy: sortBy || undefined,
        sortDir,
        page,
        pageSize
      }
    })
    if (res?.data?.data) {
      return res.data.data
    }
  } catch (err) {
    console.error('Failed to fetch vendors from backend:', err)
  }

  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    facets: {
      sapStatuses: ['ACTIVE', 'INACTIVE'],
      controlStates: ['Enabled', 'Negative', 'Disabled'],
      taxStatuses: ['PKP', 'Non-PKP']
    }
  }
}

/**
 * Fetch real vendor detail by code/id from database (includes real bank, POs, invoices)
 */
export async function getEssaVendorDetail(code) {
  try {
    const res = await axiosInstance.get(`/essa/vendors/${code}`)
    if (res?.data?.data) {
      return res.data.data
    }
  } catch (err) {
    console.error(`Failed to fetch vendor detail for ${code}:`, err)
  }
  return null
}

/**
 * Update vendor AP control overlay (negativeFlag, apEnabled, reason)
 */
export async function updateEssaVendorControl(code, payload) {
  try {
    const res = await axiosInstance.post(`/essa/vendors/${code}/control`, payload)
    if (res?.data?.data) {
      return res.data.data
    }
  } catch (err) {
    console.error(`Failed to update vendor control for ${code}:`, err)
  }
  return payload
}
