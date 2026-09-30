import { GR_DROPDOWN } from 'constants/api/PurchaseOrder'
import axiosInstance from '../services/axiosSetup'
import { apiService } from 'constants/api/services'
import {
  CREATE_PO_INVOICE,
  PO_INVOICE_LISTING,
  PO_INVOICE_DETAILS,
  POPULATE_PO_INVOICE,
  POPULATE_PO_INVOICE_BY_MATERIAL,
  PO_INVOICE_LISTING_EXPORT,
  PO_INVOICE_LISTING_EMAIL_REPORT,
  PO_INVOICE_DETAILS_EXPORT,
  UPDATE_PO_INVOICE,
  PO_INVOICE_DETAILS_EMAIL_REPORT,
  PO_ITEM,
  PO_BASED_INVOICE_DROPDOWN,
  INVOICE_DETAILS,
  PO_INVOICE_UPDAT,
  PENDING_INVOICE,
  PENDING_INVOICE_EXPORT,
  DELETE_DRAFT_INVOICE
} from 'constants/api/POBased'

export const createPOInvoice = async (payload, query) => {
  try {
    return await axiosInstance.post(CREATE_PO_INVOICE, payload, {
      params: query
    })
  } catch (error) {
    console.error('Error in createPOInvoice:', error)
    throw error
  }
}

export const getPOInvoiceListing = async (query) => {
  try {
    return await axiosInstance.post(PO_INVOICE_LISTING, {}, { params: query })
  } catch (error) {
    console.error('Error in getPOInvoiceListing:', error)
    throw error
  }
}

export const getPOInvoiceDetails = async (query) => {
  try {
    return await axiosInstance.get(PO_INVOICE_DETAILS, { params: query })
  } catch (error) {
    console.error('Error in getPOInvoiceDetails:', error)
    throw error
  }
}

export const populatePOInvoice = async (payload, query) => {
  try {
    return await axiosInstance.post(PO_ITEM, payload, { params: query })
  } catch (error) {
    console.error('Error in populatePOInvoice:', error)
    throw error
  }
}

export const populatePOInvoiceByMaterial = async (payload, query) => {
  try {
    return await axiosInstance.post(POPULATE_PO_INVOICE_BY_MATERIAL, payload, { params: query })
  } catch (error) {
    console.error('Error in populatePOInvoiceByMaterial:', error)
    throw error
  }
}

export const exportPOInvoiceListing = async (query) => {
  try {
    return await axiosInstance.get(PO_INVOICE_LISTING_EXPORT, { params: query })
  } catch (error) {
    console.error('Error in exportPOInvoiceListing:', error)
    throw error
  }
}
export const exportPendingInvoice = async (query) => {
  try {
    return await axiosInstance.get(PENDING_INVOICE_EXPORT, { params: query })
  } catch (error) {
    console.error('Error in exportPendingInvoice:', error)
    throw error
  }
}

export const emailPOInvoiceListingReport = async (query) => {
  try {
    return await axiosInstance.post(PO_INVOICE_LISTING_EMAIL_REPORT, {}, { params: query })
  } catch (error) {
    console.error('Error in emailPOInvoiceListingReport:', error)
    throw error
  }
}
export const invoiceDetailsById = async (body, query) => {
  try {
    return await axiosInstance.post(INVOICE_DETAILS, body, { params: query })
  } catch (error) {
    console.error('Error in emailPOInvoiceListingReport:', error)
    throw error
  }
}

export const exportPOInvoiceDetails = async (query) => {
  try {
    return await axiosInstance.get(PO_INVOICE_DETAILS_EXPORT, { params: query })
  } catch (error) {
    console.error('Error in exportPOInvoiceDetails:', error)
    throw error
  }
}
export const pendingInvoiceList = async (query) => {
  try {
    return await axiosInstance.get(PENDING_INVOICE, { params: query })
  } catch (error) {
    console.error('Error in pendingInvoiceList:', error)
    throw error
  }
}

export const updatePOInvoice = async (payload, query, service = apiService) => {
  try {
    return await axiosInstance.put(UPDATE_PO_INVOICE, payload, {
      params: query,
      service
    })
  } catch (error) {
    throw error
  }
}

//testing
export const poInvoiceUpdate = async (payload, query, service = apiService) => {
  try {
    return await axiosInstance.put(PO_INVOICE_UPDAT, payload, {
      params: query,
      service
    })
  } catch (error) {
    throw error
  }
}

export const emailPOInvoiceDetailsReport = async (query) => {
  try {
    return await axiosInstance.get(PO_INVOICE_DETAILS_EMAIL_REPORT, { params: query })
  } catch (error) {
    console.error('Error in emailPOInvoiceDetailsReport:', error)
    throw error
  }
}
export const poNonPOInvoiceDropdown = async (query) => {
  try {
    return await axiosInstance.get(PO_BASED_INVOICE_DROPDOWN, { params: query })
  } catch (error) {
    console.error('Error in PO BASED INVOICE DROPDOWN:', error)
    throw error
  }
}
export const GRDropdown = async (query) => {
  try {
    return await axiosInstance.get(GR_DROPDOWN, { params: query })
  } catch (error) {
    console.error('Error in gr dropdown data:', error)
    throw error
  }
}

export const deleteDraftInvoice = async (payload) => {
  try {
    return await axiosInstance.delete(DELETE_DRAFT_INVOICE, { data: payload })
  } catch (error) {
    console.error('Error deleting draft invoice:', error)
    throw error
  }
}
