import { apiService } from 'constants/api/services'
import axiosInstance from '../services/axiosSetup'
import {
  CREATE_ENQUIRY,
  GET_ENQUIRY,
  GET_ENQUIRY_BY_ID,
  DOWNLOAD_ENQUIRY,
  SEND_ENQUIRY,
  ADD_RESPONSE,
  GET_RESPONSE,
  ENQUIRY_EXPORT_CSV,
  STATUS_CHANGE
} from 'constants/api/Enquiry'


export const createEnquiry = async (query, payload) => {
  try {
    return await axiosInstance.post(CREATE_ENQUIRY, payload, {
      params: query
    })
  } catch (error) {
    console.error('Error in addNonPOInvoice:', error)
    throw error
  }
}


// Get Enquiries (with pagination/filters)
export const getEnquiries = async (query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(GET_ENQUIRY, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Get enquiries error:', error)
    throw error
  }
}

// Get Enquiry by ID (ID passed as param, not in URL)
export const getEnquiryById = async (id, query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(`${GET_ENQUIRY_BY_ID}/${id}`, {
      params: query,
      service
    })
  } catch (error) {
    console.error(`Get enquiry ${query} error:`, error)
    throw error
  }
}

export const downloadEnquiryListCSV = async (query) => {
  try {
    return await axiosInstance.get(ENQUIRY_EXPORT_CSV, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadEnquiryListCSV:', error)
    throw error
  }
}

// Add Response to Enquiry
export const addResponse = async (enquiry_id,payload, query = {}, service = apiService) => {
  try {
    return await axiosInstance.post(`${ADD_RESPONSE}/${enquiry_id}`, payload, {
      params: query,
      service
    })
  } catch (error) {
    console.error(`Add response to enquiry ${query} error:`, error)
    throw error
  }
}
// Add Response to Enquiry
export const updateStatus = async (enquiry_id,payload, query = {}, service = apiService) => {
  try {
    return await axiosInstance.patch(`${STATUS_CHANGE}/${enquiry_id}`, payload, {
      params: query,
      service
    })
  } catch (error) {
    console.error(`Add response to enquiry ${query} error:`, error)
    throw error
  }
}

// Get Responses for Enquiry
export const getResponses = async (query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(GET_RESPONSE, {
      params: query,
      service
    })
  } catch (error) {
    console.error(`Get responses for enquiry ${query} error:`, error)
    throw error
  }
}
