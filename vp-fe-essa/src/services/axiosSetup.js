import axios from 'axios'
import { clearAuthSession, getAuthToken, isBffAuth } from 'utils/authStorage'

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_DEFAULT_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

const AUTH_EXEMPT_PATHS = [
  '/users/login',
  '/users/validateTOtp',
  '/users/resendOTP',
  '/users/forgotPassword',
  '/users/forgotPasswordValidation',
  '/users/resetPassword',
  '/users/registerVendor',
  '/users/trackMyApplication',
  '/auth/sso/callback',
  '/auth/sso/login',
  '/auth/entra/login',
  '/auth/entra/callback',
  '/auth/entra/session',
  '/auth/entra/logout',
]

const shouldForceLogout = (error) => {
  const status = error?.response?.status
  if (status !== 401 && status !== 403) {
    return false
  }

  const requestUrl = error?.config?.url || ''
  if (AUTH_EXEMPT_PATHS.some((path) => requestUrl.includes(path))) {
    return false
  }

  return Boolean(getAuthToken()) || isBffAuth()
}

axiosInstance.interceptors.request.use((config) => {
  const { service } = config
  const baseUrls = {
    soa: process.env.REACT_APP_SOA_API_BASE_URL
  }
  config.baseURL = baseUrls[service] || process.env.REACT_APP_DEFAULT_API_BASE_URL

  const token = getAuthToken()
  if (token) {
    config.headers['Authorization'] = token
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (shouldForceLogout(error)) {
      await clearAuthSession()
      window.location.href = '/auth/login'
    }

    const body = error?.response?.data
    const apiMessage =
      (typeof body?.message === 'string' && body.message) ||
      (typeof body?.detail === 'string' && body.detail) ||
      (Array.isArray(body?.detail) && body.detail.filter(Boolean).join(' '))
    if (apiMessage && String(apiMessage).trim()) {
      error.message = String(apiMessage).trim()
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
