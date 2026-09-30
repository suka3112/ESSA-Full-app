import { apiService } from 'constants/api/services'
import axiosInstance from '../services/axiosSetup'
import {
  ADD_EXTENSION,
  ADD_USER,
  APPROVE_REJECT_VENDOR_APPLICATION,
  CLEAR_NOTIFICATION,
  DELETE_PROFILE_PICTURE,
  DELETE_USER,
  EDIT_INLINE_STATUS,
  EDIT_PROFILE,
  EDIT_USER_STATUS,
  GET_CR_PERSONS,
  GET_ENTITY,
  GET_ENTITY_EXTENSION,
  GET_EXTENSION_DATA,
  GET_INCOTERMS,
  GET_PAYMENT_TERMS,
  GET_PO_CR_PERSONS,
  GET_PROFILE_DATA,
  GET_USER_DATA,
  GET_VENDOR_PROFILE_DATA,
  NOTIFICATION,
  READ_NOTIFICATION,
  STATUS_TOGGLE,
  TRACK_UPDATES,
  UPDATE_NON_PO_ACCESS,
  UPDATE_PROFILE_IMAGE
} from 'constants/api/MyProfile'

export const getProfileDetails = async (payload, service = apiService) => {
  try {
    return await axiosInstance.get(GET_PROFILE_DATA, {
      params: payload,
      service
    })
  } catch (error) {
    console.error('Error in getProfileDetails:', error)
    throw error
  }
}

export const getVendorProfileDetails = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_VENDOR_PROFILE_DATA, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getProfileDetails:', error)
    throw error
  }
}

export const getVendorViewProfileDetails = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_PROFILE_DATA, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getProfileDetails:', error)
    throw error
  }
}

export const getUserDetails = async (payload, service = apiService) => {
  try {
    return await axiosInstance.get(GET_USER_DATA, {
      params: payload,
      service
    })
  } catch (error) {
    console.error('Error in getUserDetails:', error)
    throw error
  }
}

export const addSubUser = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(ADD_USER, payload, {
      service
    })
  } catch (error) {
    console.error('Error in addSubUser:', error)
    throw error
  }
}

export const getExtensionDetails = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_EXTENSION_DATA, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getExtensionDetails:', error)
    throw error
  }
}

export const getCRPersons = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_CR_PERSONS, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getCRPersons:', error)
    throw error
  }
}
export const getPoCRPersons = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_PO_CR_PERSONS, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getCRPersons:', error)
    throw error
  }
}

export const getEntityDropdown = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_ENTITY, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getEntityDropdown:', error)
    throw error
  }
}
export const getEntityExtentionDropdown = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_ENTITY_EXTENSION, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getEntityDropdown:', error)
    throw error
  }
}

export const addExtensionApi = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(ADD_EXTENSION, payload, {
      service
    })
  } catch (error) {
    console.error('Error in addExtensionApi:', error)
    throw error
  }
}

export const editProfileDetails = async (payload, service = apiService) => {
  try {
    return await axiosInstance.put(EDIT_PROFILE, payload, {
      service
    })
  } catch (error) {
    console.error('Error in editProfileDetails:', error)
    throw error
  }
}

export const editToggleStatus = async (payload, service = apiService) => {
  try {
    return await axiosInstance.patch(STATUS_TOGGLE, payload, {
      service
    })
  } catch (error) {
    console.error('Error in Edit Toggle Status:', error)
    throw error
  }
}


export const editInlineStatus = async (payload, service = apiService) => {
  try {
    return await axiosInstance.patch(EDIT_INLINE_STATUS, payload, {
      service
    })
  } catch (error) {
    console.error('Error in editProfileDetails:', error)
    throw error
  }
}

export const updateNonPOAccess = async (payload, service = apiService) => {
  try {
    return await axiosInstance.patch(UPDATE_NON_PO_ACCESS, payload, {
      service
    })
  } catch (error) {
    console.error('Error in editProfileDetails:', error)
    throw error
  }
}


export const editProfileImage = async (payload, service = apiService) => {
  try {
    return await axiosInstance.patch(UPDATE_PROFILE_IMAGE, payload, {
      service
    })
  } catch (error) {
    console.error('Error in editProfileImage:', error)
    throw error
  }
}

export const getProfileImage = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(UPDATE_PROFILE_IMAGE, {
      // params: query,
      service
    })
  } catch (error) {
    console.error('Error in getEntityDropdown:', error)
    throw error
  }
}

export const getTrackUpdates = async (payload, query = {}, service = apiService) => {
  try {
    return await axiosInstance.post(TRACK_UPDATES, payload, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getTrackUpdates:', error)
    throw error
  }
}

export const getPaymentTerms = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_PAYMENT_TERMS, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getPaymentTerms:', error)
    throw error
  }
}

export const getIncoterms = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_INCOTERMS, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getIncoterms:', error)
    throw error
  }
}
export const getNotifications = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(NOTIFICATION, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getNotifications:', error)
    throw error
  }
}

export const markAsRead = async (payload, service = apiService) => {
  try {
    return await axiosInstance.put(READ_NOTIFICATION, payload, {
      service
    })
  } catch (error) {
    console.error('Error in read notification:', error)
    throw error
  }
}
export const readAllNotification = async (payload, service = apiService) => {
  try {
    return await axiosInstance.put(CLEAR_NOTIFICATION, payload, {
      service
    })
  } catch (error) {
    console.error('Error in read notification:', error)
    throw error
  }
}
export const approveRejectVendorApplication = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(APPROVE_REJECT_VENDOR_APPLICATION, payload, {
      service
    })
  } catch (error) {
    console.error('Error in getTrackUpdates:', error)
    throw error
  }
}
export const deleteUser = async (employeeId, query, service = apiService) => {
  try {
    return await axiosInstance.delete(`${DELETE_USER}/${employeeId}`, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in deleteUserManagement:', error)
    throw error
  }
}
export const deleteProfilePicture = async (service = apiService) => {
  try {
    return await axiosInstance.delete(`${DELETE_PROFILE_PICTURE}`, {
      service
    })
  } catch (error) {
    console.error('Error in deleteUserManagement:', error)
    throw error
  }
}

export const editUserStatus = async (payload, query, service = apiService) => {
  try {
    return await axiosInstance.patch(EDIT_USER_STATUS, payload, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in editUserManagement:', error)
    throw error
  }
}