import { SET_USER_INFO, CLEAR_USER_INFO } from '../constants/userInfoConstant'
import { SET_ENTITY_DETAILS } from '../constants/userInfoConstant';

// Action to set user information
export const setUserInfo = (userData) => ({
  type: SET_USER_INFO,
  payload: userData
})

// Action to clear user information (e.g., on logout)
export const clearUserInfo = () => ({
  type: CLEAR_USER_INFO
})

export const setEntityDetails = (entityDetails) => ({
  type: SET_ENTITY_DETAILS,
  payload: entityDetails,
});
