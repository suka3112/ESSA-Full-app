import { SET_ENQUIRY_DATA } from '../constants/enquiryConstant'

const initialState = {
  enquiryData: {}
}

export const enquiryReducer = function(state = initialState, action) {
  switch (action.type) {
    case SET_ENQUIRY_DATA: {
      return {...state, enquiryData: action.payload}
    }
    default: {
      return state;
    }
  }
}