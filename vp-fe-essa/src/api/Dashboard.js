import { apiService } from 'constants/api/services'
import axiosInstance from '../services/axiosSetup'
import {
  GET_DASHBOARD_DATA,
  GET_ENQUIRY_DATA,
  GET_OUTSTANDING_DATA,
  GET_PAYABLE_MONTH,
  GET_PENDING_RECONCILATION
} from 'constants/api/Dashboard'

export const getDashboardData = async (payload, service = apiService) => {
  try {
    const response = await axiosInstance.get(GET_DASHBOARD_DATA, { params: payload, service })
    return response
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error // rethrow so caller can handle if needed
  }
}
export const getOutstanding = async (payload, service = apiService) => {
  try {
    const response = await axiosInstance.post(
      GET_OUTSTANDING_DATA,
      {},
      { params: payload, service }
    )
    return response
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error // rethrow so caller can handle if needed
  }
}
export const getPendingEnquiry = async (payload, service = apiService) => {
  try {
    const response = await axiosInstance.get(GET_ENQUIRY_DATA, { params: payload, service })
    return response
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error // rethrow so caller can handle if needed
  }
}
export const getReconciliation = async (payload, service = apiService) => {
  try {
    const response = await axiosInstance.post(
      GET_PENDING_RECONCILATION,
      {},
      { params: payload, service }
    )
    return response
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error // rethrow so caller can handle if needed
  }
}
export const getPaybleThisMonth = async (payload, service = apiService) => {
  try {
    const response = await axiosInstance.post(GET_PAYABLE_MONTH, {}, { params: payload, service })
    return response
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error // rethrow so caller can handle if needed
  }
}
