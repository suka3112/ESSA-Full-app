import { apiService } from 'constants/api/services'
import axiosInstance from '../services/axiosSetup'
import {
  FORGOT_PASSWORD,
  FORGOT_PASSWORD_VALIDATION,
  USER_LOGIN,
  VERIFY_OTP,
  RESET_PASSWORD,
  RESET_PASSWORD_VALIDATION,
  RESET_LINK_CHECK,
  RESET_PASSWORD_DASHBOARD,
  RESET_PASSWORD_DASHBOARD_VALIDATION,
  SSO_CALLBACK,
  ENTRA_SESSION
} from 'constants/api/Login'

export const userLogin = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(USER_LOGIN, payload, {
      service
    })
  } catch (error) {
    console.error('Error in userLogin:', error)
    throw error
  }
}

export const forgotPassword = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(FORGOT_PASSWORD, payload, {
      service
    })
  } catch (error) {
    console.error('Error in forgotPassword:', error)
    throw error
  }
}

export const forgotpasswordValidation = async (query, payload, service = apiService) => {
  try {
    return await axiosInstance.post(FORGOT_PASSWORD_VALIDATION, payload, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in forgotpasswordValidation:', error)
    throw error
  }
}

export const resetPassword = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(RESET_PASSWORD, payload, {
      service
    })
  } catch (error) {
    console.error('Error in resetPassword:', error)
    throw error
  }
}

//New for reset password
export const resetPasswordDashboard = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(RESET_PASSWORD_DASHBOARD, payload, {
      service
    })
  } catch (error) {
    console.error('Error in resetPassword:', error)
    throw error
  }
}

export const resetPasswordValidation = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(RESET_PASSWORD_VALIDATION, payload, {
      service
    })
  } catch (error) {
    console.error('Error in resetPasswordValidation:', error)
    throw error
  }
}

//New for reset password validation
export const resetPasswordDashboardValidation = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(RESET_PASSWORD_DASHBOARD_VALIDATION, payload, {
      service
    })
  } catch (error) {
    console.error('Error in resetPasswordValidation:', error)
    throw error
  }
}

export const verifyOtp = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(VERIFY_OTP, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in verifyOtp:', error)
    throw error
  }
}

export const resetPasswordLinkCheck = async (query) => {
  return axiosInstance.get(RESET_LINK_CHECK, {
    params: query,
    service: 'soa'
  })
}

export const ssoCallback = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(SSO_CALLBACK, payload, {
      service
    })
  } catch (error) {
    console.error('Error in ssoCallback:', error)
    throw error
  }
}

export const fetchEntraSession = async (service = apiService) => {
  try {
    return await axiosInstance.get(ENTRA_SESSION, {
      service,
      withCredentials: true
    })
  } catch (error) {
    console.error('Error in fetchEntraSession:', error)
    throw error
  }
}
