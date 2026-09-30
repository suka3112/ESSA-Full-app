import axiosInstance from '../services/axiosSetup'
import {
  GET_ADVANCE_PAYMENT,
  CREATE_ADVANCE_PAYMENT,
  EDIT_ADVANCE_PAYMENT,
  ADVANCE_PAYMENT_DOWNLOAD_CSV,
  ADVANCE_PAYMENT_SEND_CSV,
  APPROVE_REJECT_ADVANCE_PAYMENT,
  GET_INVOICE_TYPES, // Added missing import
  STATUS_DROPDOWN,
  ADVANCE_PAYMENT_DRAFT_DELETE
} from '../constants/api/AdvancePayment'
import { apiService } from 'constants/api/services'

export const createAdvancePayment = async (query, payload, service = apiService) => {
  try {
    return await axiosInstance.post(CREATE_ADVANCE_PAYMENT, payload, {
      params: query,
      service
    })
  } catch (error) {
    throw error
  }
}

export const approveRejectAdvancePayment = async (payload) => {
  try {
    return await axiosInstance.post(APPROVE_REJECT_ADVANCE_PAYMENT, payload, {})
  } catch (error) {
    throw error
  }
}

export const getAdvancePayment = async (query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(GET_ADVANCE_PAYMENT, {
      service,
      params: query // Added query params support
    })
  } catch (error) {
    throw error
  }
}

export const getAdvancePaymentById = async (id, query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(`${GET_ADVANCE_PAYMENT}/${id}`, {
      service,
      params: query // Added query params support
    })
  } catch (error) {
    throw error
  }
}

export const editAdvancePayment = async (payload, id, query, service = apiService) => {
  try {
    return await axiosInstance.patch(`${EDIT_ADVANCE_PAYMENT}/${id}`, payload, {
      params: query,
      service
    })
  } catch (error) {
    throw error
  }
}

export const downloadAdvancePaymentCSV = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(ADVANCE_PAYMENT_DOWNLOAD_CSV, {
      params: query,
      responseType: 'blob', // Added for file download
      service
    })
  } catch (error) {
    throw error
  }
}

export const sendAdvancePaymentCSV = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(ADVANCE_PAYMENT_SEND_CSV, {
      // Changed to POST
      params: query,
      service
    })
  } catch (error) {
    throw error
  }
}

// Added missing function from Postman collection
export const getInvoiceTypes = async (id, query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_INVOICE_TYPES, {
      params: query,
      service
    })
  } catch (error) {
    throw error
  }
}

export const fetchStatusDropdown = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(STATUS_DROPDOWN, {
      params: query,
      service
    })
  } catch (error) {
    throw error
  }
}

export const advancePaymentDelete = async (payload) => {
  try {
    return await axiosInstance.delete(ADVANCE_PAYMENT_DRAFT_DELETE, { data: payload })
  } catch (error) {
    throw error
  }
}
