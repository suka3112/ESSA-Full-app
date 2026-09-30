// constants/api/CreditNote.js
export const CREATE_CREDIT_NOTE = '/invoice/AddCreditNote' // POST
export const GET_CREDIT_NOTE_BY_ID = '/invoice/getCreditInvoicesByID' // GET (dynamic ID)
export const UPDATE_CREDIT_NOTE = '/invoice/editCreditInvoices/' // PUT (dynamic ID)
export const LIST_CREDIT_NOTES = '/invoice/listCreditNote' // GET (list all)
export const INVOICE_DROPDOWN = '/invoice/listInvoicesDropdown' // GET (for dropdowns)
export const CREDIT_NOTE_EXPORT = '/invoice/nonPoInvoiceListing/export' // GET (export)
export const CREDIT_NOTE_EMAIL_REPORT = '/invoice/nonpoInvoiceListing/emailReport' // POST (email)
export const STATUS_DROPDOWN = '/users/getInvoiceStatus' // POST (email)
export const INVOICE_EXPORT = '/invoice/getInvoiceById/export' // POST (email)
export const REQUEST_CREDIT = '/invoice/reqCreditNote' // POST (email)
