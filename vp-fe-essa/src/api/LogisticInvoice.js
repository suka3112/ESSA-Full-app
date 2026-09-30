import axiosInstance from '../services/axiosSetup'
import {
  GET_LOGISTIC_INVOICES,
  GET_LOGISTIC_INVOICES_BY_ID,
  GET_LOGISTIC_INVOICE_BY_ID,
  DOWNLOAD_MONTHLY_LOGISTIC_INVOICES,
  SEND_INVOICE,
  EDIT_INVOICE,
  CREATE_INVOICE,
  SEND_MONTHLY_INVOICE,
  DOWNLOAD_LOGISTIC_INVOICES,
  LOGISTICS_INVOICE_EXPORT_CSV,
  UPDATE_LOGISTICS_INVOICE,
  APPROVE_REJECT_LOGISTICS,
  BULK_APPROVAL_INVOICE,
  BULK_SUBMIT_INVOICE
} from '../constants/api/LogisticInvoice'

export const getLogisticInvoices = async (query) => {
  try {
    return await axiosInstance.get(GET_LOGISTIC_INVOICES, { params: query })
  } catch (error) {
    console.error('Error in getLogisticInvoices:', error)
    throw error
  }
}

export const getLogisticInvoiceById = async (query) => {
  try {
    return await axiosInstance.get(GET_LOGISTIC_INVOICE_BY_ID, {
      params: query
    })
  } catch (error) {
    console.error('Error in getLogisticInvoiceById:', error)
    throw error
  }
}

export const approveRejectLogistics = async (payload, ) => {
  try {
    return await axiosInstance.post(APPROVE_REJECT_LOGISTICS, payload, {
    })
  } catch (error) {
    console.error('Error in getTrackUpdates:', error)
    throw error
  }
}
export const bulkApproveRejectLogistics = async (payload, ) => {
  try {
    return await axiosInstance.post(BULK_APPROVAL_INVOICE, payload, {
    })
  } catch (error) {
    console.error('Error in getTrackUpdates:', error)
    throw error
  }
}
export const bulkSubmitLogistics = async (payload, ) => {
  try {
    return await axiosInstance.post(BULK_SUBMIT_INVOICE, payload, {
    })
  } catch (error) {
    console.error('Error in getTrackUpdates:', error)
    throw error
  }
}

export const getLogisticInvoicesById = async (query) => {
  try {
    return await axiosInstance.get(GET_LOGISTIC_INVOICES_BY_ID, {
      params: query
    })
  } catch (error) {
    console.error('Error in getLogisticInvoicesById:', error)
    throw error
  }
}

export const downloadMonthlyLogisticInvoices = async (query) => {
  try {
    return await axiosInstance.get(DOWNLOAD_MONTHLY_LOGISTIC_INVOICES, {
      params: query,
      responseType: 'blob'
    })
  } catch (error) {
    console.error('Error in downloadMonthlyLogisticInvoices:', error)
    throw error
  }
}

export const downloadLogisticInvoices = async (query) => {
  try {
    return await axiosInstance.get(DOWNLOAD_LOGISTIC_INVOICES, {
      params: query,
      responseType: 'blob'
    })
  } catch (error) {
    console.error('Error in downloadLogisticInvoices:', error)
    throw error
  }
}

export const sendInvoice = async (payload) => {
  try {
    return await axiosInstance.get(SEND_INVOICE, {
      params: payload
    })
  } catch (error) {
    console.error('Error in sendInvoice:', error)
    throw error
  }
}

export const sendMonthlyInvoice = async (payload) => {
  try {
    return await axiosInstance.get(SEND_MONTHLY_INVOICE, {
      params: payload
    })
  } catch (error) {
    console.error('Error in sendMonthlyInvoice:', error)
    throw error
  }
}

export const editInvoice = async (payload, query) => {
  try {
    return await axiosInstance.put(EDIT_INVOICE, payload, {
      params: query
    })
  } catch (error) {
    console.error('Error in editInvoice:', error)
    throw error
  }
}

export const createLogisticInvoice = async (payload, query) => {
  try {
    return await axiosInstance.post(CREATE_INVOICE, payload, {
      params: query,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  } catch (error) {
    console.error('Error in createLogisticInvoice:', error)
    throw error
  }
}

export const updateLogisticInvoice = async (payload, query) => {
  try {
    return await axiosInstance.put(UPDATE_LOGISTICS_INVOICE, payload, {
      params: query,
    })
  } catch (error) {
    console.error('Error in createLogisticInvoice:', error)
    throw error
  }
}

export const createInvoiceWithProgress = async (payload, query, onUploadProgress) => {
  try {
    return await axiosInstance.post(CREATE_INVOICE, payload, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress,
      params: query
    })
  } catch (error) {
    console.error('Error in createInvoiceWithProgress:', error)
    throw error
  }
}

export const downloadLogisticsListCSV = async (query) => {
  try {
    return await axiosInstance.get(LOGISTICS_INVOICE_EXPORT_CSV, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadLogisticsInvoiceListCSV:', error)
    throw error
  }
}