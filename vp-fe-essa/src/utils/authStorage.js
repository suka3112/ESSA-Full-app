import { persistor } from 'redux/store'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_USER_TYPE,
} from 'constants/userType'
import { ROLE_ID_TO_USER_TYPE, persistEssaRole } from 'constants/essaRoles'
import { SET_USER_INFO } from 'redux/constants/userInfoConstant'

const roleToUserTypeMap = {
  1: VENDOR_USER_TYPE,
  2: FINANCE_USER_TYPE,
  3: BUSINESS_USER_TYPE,
  4: ADMIN_USER_TYPE,
  ...ROLE_ID_TO_USER_TYPE,
}

export const LOCAL_LOGOUT_KEY = 'essaLocalLogout'
export const SILENT_SSO_STORAGE_KEY = 'essaEntraSilentSso'

export const markLocalLogout = () => {
  localStorage.setItem(LOCAL_LOGOUT_KEY, '1')
  sessionStorage.setItem(SILENT_SSO_STORAGE_KEY, 'attempted')
}

export const clearLocalLogout = () => {
  localStorage.removeItem(LOCAL_LOGOUT_KEY)
}

export const isLocalLogout = () => localStorage.getItem(LOCAL_LOGOUT_KEY) === '1'

export const getAuthToken = () =>
  sessionStorage.getItem('secondaryToken') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('token')

export const getStoredUserType = () =>
  localStorage.getItem('userType') || sessionStorage.getItem('userType')

export const isBffAuth = () =>
  localStorage.getItem('authMode') === 'bff' ||
  sessionStorage.getItem('authMode') === 'bff'

export const isAuthenticated = () => Boolean(getAuthToken()) || isBffAuth()

export const isRememberMe = () => {
  try {
    return JSON.parse(localStorage.getItem('rememberMe') ?? 'false')
  } catch {
    return false
  }
}

export const setAuthSession = ({
  token,
  userType,
  vendorId,
  rememberMe = isRememberMe(),
  authMode,
}) => {
  const persistAcrossTabs = Boolean(rememberMe) || authMode === 'bff'
  localStorage.setItem('rememberMe', JSON.stringify(persistAcrossTabs))
  const storage = persistAcrossTabs ? localStorage : sessionStorage

  if (authMode) {
    storage.setItem('authMode', authMode)
  }
  if (token) {
    storage.setItem('token', token)
  }
  if (userType) {
    storage.setItem('userType', userType)
  }
  if (vendorId !== undefined && vendorId !== null) {
    storage.setItem('vendorId', String(vendorId))
  }
}

export const applyEntraSessionUser = (userData, dispatch) => {
  const role_id = userData.role_id
  const userType = roleToUserTypeMap[role_id] || VENDOR_USER_TYPE
  clearLocalLogout()

  setAuthSession({
    userType,
    vendorId: userData?.vendor_id || '',
    rememberMe: true,
    authMode: 'bff',
  })
  persistEssaRole(role_id)

  dispatch({
    type: SET_USER_INFO,
    payload: {
      userType,
      email: userData?.email || '',
      id: userData?.id,
      roleId: role_id,
      isSupplier: userData?.Is_Supplier,
      isPoInline: userData?.Is_PO_Inline,
      fullName: userData?.name,
      Vendor_Role: userData?.Vendor_Role,
      isNonPoAccess: userData?.Non_PO_Access,
    },
  })

  return userType
}

export const setPreAuthSession = ({ userType, rememberMe }) => {
  localStorage.setItem('rememberMe', JSON.stringify(Boolean(rememberMe)))
  const storage = rememberMe ? localStorage : sessionStorage
  if (userType) {
    storage.setItem('userType', userType)
  }
}

export const clearAuthSession = async () => {
  const appLanguage = localStorage.getItem('appLanguage')
  const localLogout = localStorage.getItem(LOCAL_LOGOUT_KEY)
  localStorage.clear()
  sessionStorage.clear()
  if (appLanguage) {
    localStorage.setItem('appLanguage', appLanguage)
  }
  if (localLogout) {
    localStorage.setItem(LOCAL_LOGOUT_KEY, localLogout)
    sessionStorage.setItem(SILENT_SSO_STORAGE_KEY, 'attempted')
  }
  await persistor.purge()
}

export const isPublicPath = (pathname) =>
  pathname === '/' ||
  pathname.startsWith('/auth/') ||
  pathname.includes('/register') ||
  pathname.includes('/track-application')
