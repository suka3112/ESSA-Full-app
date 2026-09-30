import axiosInstance from '../services/axiosSetup'
import {
  UPLOAD_SOA,
  RECONCILE_SOA,
  LIST_SOA,
  SOA_HISTORY,
  SOA_UPDATE,
  SOA_EMAIL,
  LIST_SOA_BY_MONTH,
  SOA_INVOICE,
  SOA_EMAIL_LIST_PAGE
} from '../constants/api/SOA'
import { apiService } from 'constants/api/services'

export const uploadSOA = async (payload, query = {}, service = apiService) => {
  try {
    return await axiosInstance.post(UPLOAD_SOA, payload, {
      params: query,
      service,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  } catch (error) {
    console.error('Upload SOA error:', error)
    throw error
  }
}

export const reconcileSOA = async (query = {}, service = apiService) => {
  try {
    return await axiosInstance.post(RECONCILE_SOA, null, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Reconcile SOA error:', error)
    throw error
  }
}

export const listSOA = async (query, service = apiService) => {
  try {
    return await axiosInstance.post(
      LIST_SOA,
      {},
      {
        params: query,
        service
        // headers: payload
        //   ? {
        //       'Content-Type': 'multipart/form-data'
        //     }
        //   : {}
      }
    )
  } catch (error) {
    console.error('List SOA error:', error)
    throw error
  }
}

export const listSOAByMonth = async (query, service = apiService) => {
  try {
    return await axiosInstance.post(
      LIST_SOA_BY_MONTH,
      {},
      {
        params: query,
        service
        // headers: payload
        //   ? {
        //       'Content-Type': 'multipart/form-data'
        //     }
        //   : {}
      }
    )
  } catch (error) {
    console.error('List SOA error:', error)
    throw error
  }
}

export const getSOAHistory = async (query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(SOA_HISTORY, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Get SOA history error:', error)
    throw error
  }
}

export const updateSOA = async (payload, query, service = apiService) => {
  try {
    return await axiosInstance.put(SOA_UPDATE, payload, {
      params: query,
      service
    })
  } catch (error) {
    throw error
  }
}

export const emailSOA = async (payload, query, service = apiService) => {
  try {
    return await axiosInstance.post(SOA_EMAIL, payload, {
      params: query,
      service
    })
  } catch (error) {
    throw error
  }
}

export const getInvoiceSOA = async (query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(SOA_INVOICE, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Get SOA Invoice error:', error)
    throw error
  }
}
export const emailSOAListPage = async (query) => {
  try {
    return await axiosInstance.get(SOA_EMAIL_LIST_PAGE, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in SOAListCSV:', error)
    throw error
  }
}
