import { SET_ADVANCE_PAYMENT, SET_ADVANCE_PAYMENT_LIST } from '../constants/advancePaymentConstant'

export const setAdvancePaymentList = (payload) => {
  return {
    type: SET_ADVANCE_PAYMENT_LIST,
    payload: payload
  }
}

export const setAdvancePayment = (payload) => {
  return {
    type: SET_ADVANCE_PAYMENT,
    payload: payload
  }
}
