import { SET_ENQUIRY_DATA  } from '../constants/enquiryConstant'

export const setEnquiryData = (payload) => {
  return {
    type: SET_ENQUIRY_DATA,
    payload: payload
  }
}