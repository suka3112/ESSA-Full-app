import {
  SET_COMPLETE_LOGISTIC_INVOICE_DETAIL,
  SET_LOGISTIC_INVOICE,
  SET_LOGISTIC_INVOICE_DETAILS_LIST,
  SET_LOGISTIC_INVOICES_LIST
} from '../constants/LogisticInvoice'

const initialState = {
  logisticInvoicesListData: {},
  logisticInvoice: {},
  logisticInvoiceDetails: {},
  completeLogisticDetail: {}
}

export const logisticInvoiceReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_LOGISTIC_INVOICES_LIST:
      return { ...state, logisticInvoicesListData: action.payload };

    case SET_LOGISTIC_INVOICE:
      return { ...state, logisticInvoice: action.payload };

    case SET_LOGISTIC_INVOICE_DETAILS_LIST:
      return { ...state, logisticInvoiceDetails: action.payload };

    case SET_COMPLETE_LOGISTIC_INVOICE_DETAIL:
      return { ...state, completeLogisticDetail: action.payload };

    default:
      return state
  }
}
