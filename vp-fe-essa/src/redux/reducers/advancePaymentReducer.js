import { SET_ADVANCE_PAYMENT, SET_ADVANCE_PAYMENT_LIST } from '../constants/advancePaymentConstant'

const initialState = {
  advancePaymentList: [],
  advancePayment: {}
}

export const advancePaymentReducer = function(state = initialState, action) {
  switch (action.type) {
    case SET_ADVANCE_PAYMENT_LIST: {
      return {...state, advancePaymentList: action.payload}
    }
    case SET_ADVANCE_PAYMENT: {
      return {...state, advancePayment: action.payload}
    }
    default: {
      return state;
    }
  }
}