import axiosInstance from '../services/axiosSetup'
import { SEND_TOTP, TOTP_SETUP, VALIDATE_TOTP } from '../constants/api/TOTP'

export const setupTOTPAPI = async (id) => {
  try {
    return await axiosInstance.post(TOTP_SETUP, undefined, {
      params: { id }
    })
  } catch (error) {
    console.error('Error in setupTOTPAPI:', error)
    throw error
  }
}

export const verifyTOTP = async (query) => {
  try {
    return await axiosInstance.get(VALIDATE_TOTP, {
      params: query
    })
  } catch (error) {
    console.error('Error in verifyTOTP:', error)
    throw error
  }
}

export const sendOTPAPI = async (query) => {
  try {
    return await axiosInstance.get(SEND_TOTP, {
      params: query
    })
  } catch (error) {
    console.error('Error in sendOTP:', error)
    throw error
  }
}

