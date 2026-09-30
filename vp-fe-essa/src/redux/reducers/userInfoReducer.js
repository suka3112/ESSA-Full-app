import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { SET_USER_INFO, CLEAR_USER_INFO, SET_ENTITY_DETAILS } from '../constants/userInfoConstant'

const initialState = {
  // Default: No user logged in
  userType: VENDOR_USER_TYPE,
    entity_details: null,

}

export const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_USER_INFO:
      return { ...state, ...action.payload }

    case CLEAR_USER_INFO:
      return {}
    case SET_ENTITY_DETAILS:
      return {
        ...state,
        entity_details: action.payload,
      };
    default:
      return state
  }
}
