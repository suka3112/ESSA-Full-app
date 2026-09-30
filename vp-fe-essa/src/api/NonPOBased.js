import axiosInstance from '../services/axiosSetup'
import {
  GET_NON_PO_INVOICE_BY_ID,
  LIST_NON_PO_INVOICES,
  ADD_NON_PO_INVOICE,
  EXPORT_NON_PO_INVOICE_LISTING,
  EMAIL_NON_PO_INVOICE_REPORT,
  UPDATE_NON_PO_INVOICE,
  NATURE_OF_EXPENSES,
  NON_PO_EXPORT_CSV
} from 'constants/api/NonPOBased'

export const getNonPOInvoiceById = async (query) => {
  try {
    return await axiosInstance.get(GET_NON_PO_INVOICE_BY_ID, {
      params: query
    })
  } catch (error) {
    console.error('Error in getNonPOInvoiceById:', error)
    throw error
  }
}

export const listNonPOInvoices = async (query) => {
  try {
    return await axiosInstance.get(LIST_NON_PO_INVOICES, {
      params: query
    })
  } catch (error) {
    console.error('Error in listNonPOInvoices:', error)
    throw error
  }
}

export const addNonPOInvoice = async (payload, query) => {
  try {
    return await axiosInstance.post(ADD_NON_PO_INVOICE, payload, {
      params: query
    })
  } catch (error) {
    console.error('Error in addNonPOInvoice:', error)
    throw error
  }
}

export const exportNonPOInvoiceListing = async (query) => {
  try {
    return await axiosInstance.get(EXPORT_NON_PO_INVOICE_LISTING, {
      params: query
    })
  } catch (error) {
    console.error('Error in exportNonPOInvoiceListing:', error)
    throw error
  }
}

export const emailNonPOInvoiceReport = async (query) => {
  try {
    return await axiosInstance.post(
      EMAIL_NON_PO_INVOICE_REPORT,
      {},
      {
        params: query
      }
    )
  } catch (error) {
    console.error('Error in emailNonPOInvoiceReport:', error)
    throw error
  }
}

export const updateNonPOInvoice = async (payload, query) => {
  try {
    return await axiosInstance.put(UPDATE_NON_PO_INVOICE, payload, {
      params: query
    })
  } catch (error) {
    console.error('Error in updateNonPOInvoice:', error)
    throw error
  }
}

export const fetchNatureOfExpenses = async (query) => {
  try {
    return await axiosInstance.get(NATURE_OF_EXPENSES, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in fetchRegions:', error)
    throw error
  }
}

export const downloadNonPoListCSV = async (query) => {
  try {
    return await axiosInstance.get(NON_PO_EXPORT_CSV, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}

