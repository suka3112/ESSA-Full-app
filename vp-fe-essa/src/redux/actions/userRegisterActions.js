import { SET_USER_DATA, CLEAR_USER_DATA, SET_DROPDOWN_DATA } from '../constants/userRegisterConstant'

export const setUserData = (userData) => ({
  type: SET_USER_DATA,
  payload: userData
})

export const clearUserData = () => ({
  type: CLEAR_USER_DATA
})

export const setDropDownData = (dropdownData) => ({
  type: SET_DROPDOWN_DATA,
  payload: dropdownData
})
