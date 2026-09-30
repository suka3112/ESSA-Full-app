import { apiService } from 'constants/api/services'
import axiosInstance from 'services/axiosSetup'
import {
  GET_ROLE_DROPDOWN,
  GET_DEPARTMENT_DROPDOWN,
  GET_DESIGNATION_DROPDOWN,
  GET_ENTITY_DROPDOWN,
  ADD_USER_MANAGEMENT,
  GET_USER_MANAGEMENT,
  DELETE_USER_MANAGEMENT,
  EDIT_USER_MANAGEMENT,
  EXPORT_USER
} from 'constants/api/UserManagement'

export const getRoleDropdown = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_ROLE_DROPDOWN, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getRoleDropdown:', error)
    throw error
  }
}

export const getDepartmentDropdown = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_DEPARTMENT_DROPDOWN, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getDepartmentDropdown:', error)
    throw error
  }
}

export const getDesignationDropdown = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_DESIGNATION_DROPDOWN, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getDesignationDropdown:', error)
    throw error
  }
}

export const getEntityDropdown = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_ENTITY_DROPDOWN, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getEntityDropdown:', error)
    throw error
  }
}

export const addUserManagement = async (payload, query, service = apiService) => {
  try {
    return await axiosInstance.post(ADD_USER_MANAGEMENT, payload, {
      params: query,
      service
      //   headers: {
      //     'Content-Type': 'multipart/form-data'
      //   }
    })
  } catch (error) {
    console.error('Error in addUserManagement:', error)
    throw error
  }
}

export const getUserManagement = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_USER_MANAGEMENT, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getUserManagement:', error)
    throw error
  }
}
export const getUserById = async (id, query, service = apiService) => {
  try {
    return await axiosInstance.get(`${GET_USER_MANAGEMENT}/${id}`, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getUserManagement:', error)
    throw error
  }
}
export const exportUser = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(`${EXPORT_USER}`, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in getUserManagement:', error)
    throw error
  }
}

export const editUserManagement = async (payload, query, service = apiService) => {
  try {
    return await axiosInstance.patch(EDIT_USER_MANAGEMENT, payload, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in editUserManagement:', error)
    throw error
  }
}

export const deleteUserManagement = async (employeeId, query, service = apiService) => {
  try {
    return await axiosInstance.delete(`${DELETE_USER_MANAGEMENT}/${employeeId}`, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Error in deleteUserManagement:', error)
    throw error
  }
}
