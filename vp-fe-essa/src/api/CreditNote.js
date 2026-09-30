import { apiService } from 'constants/api/services'
import axiosInstance from '../services/axiosSetup'
import {
  CREATE_CREDIT_NOTE,
  GET_CREDIT_NOTE_BY_ID,
  UPDATE_CREDIT_NOTE,
  LIST_CREDIT_NOTES,
  INVOICE_DROPDOWN,
  CREDIT_NOTE_EXPORT,
  CREDIT_NOTE_EMAIL_REPORT,
  STATUS_DROPDOWN,
  INVOICE_EXPORT,
  REQUEST_CREDIT
} from 'constants/api/CreditNote'

// Create a new credit note
export const createCreditNote = async (payload, query, service = apiService) => {
  try {
    return await axiosInstance.post(CREATE_CREDIT_NOTE, payload, {
      params: query,
      service,
      // headers: {
      //   'Content-Type': 'multipart/form-data'
      // }
    })
  } catch (error) {
    console.error('Failed to create credit note:', error)
    throw error
  }
}

// Get credit note by ID (with optional query params)
export const getCreditNoteById = async (query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(GET_CREDIT_NOTE_BY_ID, { params: query, service })
  } catch (error) {
    console.error(`Failed to fetch credit note ${query}:`, error)
    throw error
  }
}
export const getExportInvById = async (query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(INVOICE_EXPORT, { params: query, service })
  } catch (error) {
    console.error(`Failed to fetch credit note ${query}:`, error)
    throw error
  }
}

// Update credit note by ID
export const updateCreditNote = async (payload, query, service = apiService) => {
  try {
    return await axiosInstance.put(UPDATE_CREDIT_NOTE, payload, {
      params: query,
      service,
      // headers: {
      //   'Content-Type': 'multipart/form-data'
      // }
    })
  } catch (error) {
    console.error(`Failed to update credit note ${query}:`, error)
    throw error
  }
}

// List all credit notes (with optional filters)
export const listCreditNotes = async (query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(LIST_CREDIT_NOTES, { params: query, service })
  } catch (error) {
    console.error('Failed to fetch credit notes:', error)
    throw error
  }
}

// Get invoices for dropdown (e.g., invoice_category_id=1&entity_id=1)
export const getInvoiceDropdowns = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(INVOICE_DROPDOWN, { params: query, service })
  } catch (error) {
    console.error('Failed to fetch invoice dropdowns:', error)
    throw error
  }
}
export const getStatusDropdown = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(STATUS_DROPDOWN, { params: query, service })
  } catch (error) {
    console.error('Failed to fetch invoice dropdowns:', error)
    throw error
  }
}

// Export credit notes (e.g., format=csv, startDate, endDate)
export const exportCreditNotes = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(CREDIT_NOTE_EXPORT, {
      params: query,
      service,
      responseType: 'blob' // For file downloads
    })
  } catch (error) {
    console.error('Failed to export credit notes:', error)
    throw error
  }
}

// Email credit note report
export const emailCreditNoteReport = async (query, service = apiService) => {
  try {
    return await axiosInstance.post(CREDIT_NOTE_EMAIL_REPORT, {}, { params: query, service })
  } catch (error) {
    console.error('Failed to email credit note report:', error)
    throw error
  }
}
export const requestCreditNote = async (payload,query, service = apiService) => {
  try {
    return await axiosInstance.post(REQUEST_CREDIT, payload, { params: query, service })
  } catch (error) {
    console.error('Failed to request credit note report:', error)
    throw error
  }
}
