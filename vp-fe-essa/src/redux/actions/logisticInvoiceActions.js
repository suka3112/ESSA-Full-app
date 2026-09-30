import {
  SET_COMPLETE_LOGISTIC_INVOICE_DETAIL,
  SET_LOGISTIC_INVOICE,
  SET_LOGISTIC_INVOICE_DETAILS_LIST,
  SET_LOGISTIC_INVOICES_LIST
} from '../constants/LogisticInvoice'

export const setLogisticInvoice = (payload) => {
  return {
    type: SET_LOGISTIC_INVOICE,
    payload,
  }
}

export const setLogisticInvoicesList = (payload) => {
  return {
    type: SET_LOGISTIC_INVOICES_LIST,
    payload,
  }
}

export const setLogisticInvoiceDetailsList = (payload) => {
  return {
    type: SET_LOGISTIC_INVOICE_DETAILS_LIST,
    payload,
  }
}

export const setCompleteLogisticInvoiceDetail = (payload) => {
  return {
    type: SET_COMPLETE_LOGISTIC_INVOICE_DETAIL,
    payload,
  }
}

