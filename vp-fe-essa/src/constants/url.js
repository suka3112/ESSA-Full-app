// Common Routes
export const LOGIN = `/login`
export const AUTH_CALLBACK = `/callback`
export const ENTRA_COMPLETE = `/entra/complete`
export const TOTP = `/totp`
export const FORGOT_PASSWORD = `/forgot-password`
export const RESET_PASSWORD = `/reset-password`
export const CHANGE_PASSWORD = `/change-password`
export const DASHBOARD = `/dashboard`
export const INVOICE_DASHBOARD = `/invoice-dashboard`
export const OUTSTANDINGPAYMENT = `/outstanding-payment`
export const RECONCILIATION_URL = `/dashboard/reconciliation`
export const PAYABLE_THIS_MONTH = `/payable-this-month`
export const MY_PROFILE = `/my-profile`
export const EDIT_MY_PROFILE = `/edit-profile`
export const PROFILE_RESET_PASSWORD = `/my-profile/reset-password`
export const REGISTER = `/register`
export const TRACK_APPLICATION = `/track-application`
export const TRACK_APPLICATION_PROGRESS = `/track-application/progress`
export const OTP = `/login/totp`
export const VENDOR_REGISTER_OTP = `/register-otp`
export const PURCHASE_ORDER = `/purchase-order`
export const VIEW_PURCHASE_ORDER = `/purchase-order/:id`
export const GR_DETAILS = `/purchase-order/gr-details/:id`
export const EMAIL_TEMPLATES = `/email-templates`
export const SLA_MANAGEMENT = `/sla`
export const INVOICE_CONFIGURATION = `/invoice-configuration`
export const EXCEPTION_CODES = `/exception-codes`
export const SLA_CREATE = `/sla/create`
export const SLA_EDIT = `/sla/edit/:id`
export const slaEditPath = (id) => `/sla/edit/${encodeURIComponent(id)}`
export const SLA_REMINDERS = `/sla/reminders`
export const SLA_ESCALATIONS = `/sla/escalations`
export const SLA_CALENDAR = `/sla/calendar`
export const SLA_SIMULATION = `/sla/simulation`
export const SLA_MONITOR = `/sla/monitor`
export const SOA = `/soa`
export const SOA_HISTORY = `/soa-history`
export const ENQUIRIES = `/enquires`
export const RECONCILIATION = `/reconciliation`
export const CREATE_ENQUIRY = `/enquires/create-enquiry`
export const VIEW_ENQUIRY = `/enquires/view-enquiry`
export const FAQS = `/faqs`
export const PROMPT_CONFIG = `/settings/prompt-config`

// Invoice Processing Routes
export const INVOICES = `/invoice-processing/invoices`
export const INVOICE_DETAIL = `/invoice-processing/invoices/:id`
export const UPLOAD_INVOICE = `/invoice-processing/upload`
export const PO_MATCHING = `/invoice-processing/po-matching`
export const TIMELINE = `/invoice-processing/timeline`
export const APPROVALS = `/invoice-processing/approvals`
export const EXCEPTION_WORKBENCH = `/invoice-processing/exception-workbench`
export const INBOUND_EMAILS = `/invoice-processing/inbound-emails`
export const INBOUND_SHAREPOINT = `/invoice-processing/inbound-sharepoint`
export const INVOICE_PO_BASED = `/invoice-processing/po-based`
export const PO_BASED_INVOICE = `/invoice-processing/po-based/invoice`
export const INVOICE_PO_BASED_EDIT = `/invoice-processing/po-based/:editMode?`
export const INVOICE_PO_BASED_VIEW = `/invoice-processing/po-based-invoice/view/:id?`
export const INVOICE_PO_BASED_INVOICE_DETAILS = `/invoice-processing/po-based-invoice/invoice-details`
export const INVOICE_NON_PO_BASED = `/invoice-processing/non-po-based`
export const PENDING_INVOICE_URL = `/invoice-processing/pending`
export const INVOICE_NON_PO_BASED_EDIT = `/invoice-processing/non-po-based/:editMode?`
export const INVOICE_NON_PO_BASED_VIEW = `/invoice-processing/non-po-based-invoice/view`
export const LOGISTICS_INVOICE = `/invoice-processing/logistics`
export const LOGISTICS_INVOICE_EDIT = `/invoice-processing/logistics/:editModeId?`
export const LOGISTICS_INVOICE_LIST = `/invoice-processing/logistics-invoice/list`
export const VIEW_LOGISTICS_INVOICE = `/invoice-processing/logistics/view`
export const EDIT_LOGISTICS_INVOICE = `/invoice-processing/logistics/edit`
export const CREDIT_NOTE = `/invoice-processing/credit-note`
export const CREATE_CREDIT_NOTE = `/invoice-processing/credit-note/add`
export const CREDIT_NOTE_EDIT = `/invoice-processing/credit-note/edit/:editMode?`
export const VIEW_CREDIT_NOTE = `/invoice-processing/credit-note/:id/`
// Advance Payment Routes
export const ADVANCE_PAYMENT = `/advance-payment`
export const ADD_EDIT_ADVANCE_PAYMENT = `/advance-payment/edit/:editMode?`
export const VIEW_ADVANCE_PAYMENT = `/advance-payment/:id/`

// Vendor Management Routes
export const VENDORS_LIST = `/vendors`
export const VENDOR_DETAIL = `/vendors/:code`
export const VENDORS_APPLICATION = `/vendors-application`
export const VIEW_VENDORS_UPDATE = `/vendors/view-vendors-update`
export const VIEW_VENDORS_EXTENSION = `/vendors/view-vendors-extension`
// export const VENDOR_PROFILE = `/view-vendors-application`
export const VENDOR_PROFILE = `/vendors/view-vendors-application`
export const VENDOR_VIEW_PROFILE = `/vendors/view-profile`

// Admin-Specific Routes
export const USER_MANAGEMENT = `/user-management`
export const APPROVAL_MATRIX = `/approval-matrix`
export const AUDIT_LOGS = `/audit-logs`
export const ADD_USER = `/add-user`
export const EDIT_USER = `/edit-user`
export const ADD_VENDOR = `/add-vendor`
export const VENDORS_APPLICATION_LIST = `/vendors-application-list`
export const VENDORS_UPDATES = `/vendors/vendors-updates`
export const VENDORS_EXTENSION = `/vendors/vendor-extension`

//Admin, Finance, Business - PO - View Invoice Route
export const PO_VIEW_INVOICE_DETAILS = `/purchase-order/invoice-details`
