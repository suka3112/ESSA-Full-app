import {
  LOGIN,
  TRACK_APPLICATION,
  TRACK_APPLICATION_PROGRESS,
  FORGOT_PASSWORD,
  RESET_PASSWORD,
  OTP,
  REGISTER,
  DASHBOARD,
  INVOICE_DASHBOARD,
  INVOICES,
  INVOICE_DETAIL,
  UPLOAD_INVOICE,
  PO_MATCHING,
  TIMELINE,
  APPROVALS,
  EXCEPTION_WORKBENCH,
  INBOUND_EMAILS,
  INBOUND_SHAREPOINT,
  APPROVAL_MATRIX,
  AUDIT_LOGS,
  MY_PROFILE,
  PROFILE_RESET_PASSWORD,
  PURCHASE_ORDER,
  VIEW_PURCHASE_ORDER,
  GR_DETAILS,
  VENDORS_APPLICATION,
  VIEW_VENDORS_UPDATE,
  VENDOR_PROFILE,
  INVOICE_PO_BASED,
  VIEW_PO_BASED,
  INVOICE_NON_PO_BASED,
  VIEW_NON_PO_BASED,
  LOGISTICS_INVOICE,
  LOGISTICS_INVOICE_EDIT,
  LOGISTICS_INVOICE_LIST,
  VIEW_LOGISTICS_INVOICE,
  EDIT_LOGISTICS_INVOICE,
  CREDIT_NOTE,
  VIEW_CREDIT_NOTE,
  ADVANCE_PAYMENT,
  ADD_EDIT_ADVANCE_PAYMENT,
  VIEW_ADVANCE_PAYMENT,
  SOA,
  SOA_HISTORY,
  ENQUIRIES,
  CREATE_ENQUIRY,
  FAQS,
  PROMPT_CONFIG,
  USER_MANAGEMENT,
  VENDORS_LIST,
  VENDOR_DETAIL,
  INVOICE_PO_BASED_VIEW,
  INVOICE_NON_PO_BASED_VIEW,
  EMAIL_TEMPLATES,
  SLA_MANAGEMENT,
  SLA_CREATE,
  SLA_EDIT,
  SLA_REMINDERS,
  SLA_ESCALATIONS,
  SLA_CALENDAR,
  SLA_SIMULATION,
  SLA_MONITOR,
  VENDORS_UPDATES,
  EDIT_MY_PROFILE,
  ADD_USER,
  EDIT_USER,
  ADD_VENDOR,
  VENDOR_VIEW_PROFILE,
  VENDORS_EXTENSION,
  VIEW_VENDORS_EXTENSION,
  PO_VIEW_INVOICE_DETAILS,
  RECONCILIATION,
  INVOICE_NON_PO_BASED_EDIT,
  PENDING_INVOICE_URL,
  CREDIT_NOTE_EDIT,
  CREATE_CREDIT_NOTE,
  INVOICE_PO_BASED_EDIT,
  VIEW_ENQUIRY,
  PAYABLE_THIS_MONTH,
  RECONCILIATION_URL,
  OUTSTANDINGPAYMENT
} from '../constants/url'
import { ADMIN_USER_TYPE, VENDOR_PORTAL } from '../constants/userType'

export const adminRoutes = [
  {
    path: '/',
    redirect: `/${ADMIN_USER_TYPE}${LOGIN}`
  },
  {
    component: 'AuthLayout',
    path: `/${ADMIN_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'LoginPage',
        path: LOGIN,
        exact: true
      },
      {
        component: 'TrackApplicationPage',
        path: TRACK_APPLICATION,
        exact: true
      },
      {
        component: 'TrackApplicationUIPage',
        path: TRACK_APPLICATION_PROGRESS,
        exact: true
      },
      {
        component: 'ForgotPassPage',
        path: FORGOT_PASSWORD,
        exact: true
      },
      {
        component: 'ResetPassPage',
        path: RESET_PASSWORD,
        exact: true
      }
    ]
  },
  {
    component: 'AuthLayout',
    path: `/${ADMIN_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'TwoFactorAuthenticationPage',
        path: OTP,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${ADMIN_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'VendorDashboard',
        path: DASHBOARD,
        exact: true
      },
      {
        component: 'InvoiceDashboardPage',
        path: INVOICE_DASHBOARD,
        exact: true
      },
      {
        component: 'InvoicesPage',
        path: INVOICES,
        exact: true
      },
      {
        component: 'UploadInvoicePage',
        path: UPLOAD_INVOICE,
        exact: true
      },
      {
        component: 'InvoiceDetailPage',
        path: INVOICE_DETAIL,
        exact: true
      },
      {
        component: 'POMatchingPage',
        path: PO_MATCHING,
        exact: true
      },
      {
        component: 'TimelinePage',
        path: TIMELINE,
        exact: true
      },
      {
        component: 'ApprovalsPage',
        path: APPROVALS,
        exact: true
      },
      {
        component: 'ExceptionWorkbenchPage',
        path: EXCEPTION_WORKBENCH,
        exact: true
      },
      {
        component: 'InboundEmailsPage',
        path: INBOUND_EMAILS,
        exact: true
      },
      {
        component: 'InboundSharePointPage',
        path: INBOUND_SHAREPOINT,
        exact: true
      },
      {
        component: 'ApprovalMatrixPage',
        path: APPROVAL_MATRIX,
        exact: true
      },
      {
        component: 'AuditLogsPage',
        path: AUDIT_LOGS,
        exact: true
      },
      {
        component: 'EmailTemplatesPage',
        path: EMAIL_TEMPLATES,
        exact: true
      },
      {
        component: 'SlaPoliciesPage',
        path: SLA_MANAGEMENT,
        exact: true
      },
      {
        component: 'SlaPolicyEditorPage',
        path: SLA_CREATE,
        exact: true
      },
      {
        component: 'SlaPolicyEditorPage',
        path: SLA_EDIT,
        exact: true
      },
      {
        component: 'SlaRemindersPage',
        path: SLA_REMINDERS,
        exact: true
      },
      {
        component: 'SlaEscalationsPage',
        path: SLA_ESCALATIONS,
        exact: true
      },
      {
        component: 'SlaCalendarPage',
        path: SLA_CALENDAR,
        exact: true
      },
      {
        component: 'SlaSimulationPage',
        path: SLA_SIMULATION,
        exact: true
      },
      {
        component: 'SlaMonitorPage',
        path: SLA_MONITOR,
        exact: true
      },
      {
        component: 'MyProfilePage',
        path: VENDOR_PROFILE,
        exact: true
      },
      {
        component: 'MyProfilePage',
        path: VENDOR_VIEW_PROFILE,
        exact: true
      },
      {
        component: 'FinanceMyProfilePage',
        path: MY_PROFILE,
        exact: true
      },
      {
        component: 'FinaceEditProfilePage',
        path: EDIT_MY_PROFILE,
        exact: true
      },
      {
        component: 'VendorRegisterPage',
        path: ADD_VENDOR,
        exact: true
      },
      {
        component: 'ResetPassWordProfilePage',
        path: PROFILE_RESET_PASSWORD,
        exact: true
      },
      {
        component: 'PurchaseOrderPage',
        path: PURCHASE_ORDER,
        exact: true
      },
      {
        component: 'ViewPurchaseOrderPage',
        path: VIEW_PURCHASE_ORDER,
        exact: true
      },
      {
        component: 'GRDetailsPage',
        path: GR_DETAILS,
        exact: true
      },
      {
        component: 'ViewInvoiceDetailsPage',
        path: PO_VIEW_INVOICE_DETAILS,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${ADMIN_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'VendorsListPage',
        path: VENDORS_LIST,
        exact: true
      },
      {
        component: 'VendorDetailPage',
        path: VENDOR_DETAIL,
        exact: true
      },
      {
        component: 'VendorsAppListPage',
        path: VENDORS_APPLICATION,
        exact: true
      },

      {
        component: 'ViewInvoicePOBasedPage',
        path: INVOICE_PO_BASED_VIEW,
        exact: true
      },
      {
        component: 'InvoicePOBasedPage',
        path: INVOICE_PO_BASED,
        exact: true
      },
      {
        component: 'InvoicePOBasedPage',
        path: INVOICE_PO_BASED,
        exact: true
      },
      {
              component: 'OutstandingPaymentPage',
              path: OUTSTANDINGPAYMENT,
              exact: true
            },
      {
                    component: 'OutstandingPaymentPage',
                    path: RECONCILIATION_URL,
                    exact: true
                  },
                  {
                    component: 'OutstandingPaymentPage',
                    path: PAYABLE_THIS_MONTH,
                    exact: true
                  },
      {
        component: 'AddEditInvoicePOBasedPage',
        path: INVOICE_PO_BASED_EDIT,
        exact: true
      },
      {
        component: 'VendorsApplicationPage',
        path: VENDORS_APPLICATION,
        exact: true
      },
      {
        component: 'VendorsUpdatesPage',
        path: VENDORS_UPDATES,
        exact: true
      },
      {
        component: 'VendorExtensionPage',
        path: VENDORS_EXTENSION,
        exact: true
      },
      {
        component: 'ViewVendorsExtensionPage',
        path: VIEW_VENDORS_EXTENSION,
        exact: true
      },
      {
        component: 'ViewVendorsUpdatePage',
        path: VIEW_VENDORS_UPDATE,
        exact: true
      },
      {
        component: 'VendorsUpdatesDetailPage',
        path: VIEW_VENDORS_UPDATE,
        exact: true
      },
      // {
      //   component: 'VendorProfilePage',
      //   path: VENDOR_PROFILE,
      //   exact: true
      // },
      {
        component: 'InvoiceNonPOBasedPage',
        path: INVOICE_NON_PO_BASED,
        exact: true
      },

      {
        component: 'AddEditInvoiceNonPOBasedPage',
        path: INVOICE_NON_PO_BASED_EDIT,
        exact: true
      },
      {
        component: 'ViewInvoiceNonPOBasedPage',
        path: INVOICE_NON_PO_BASED_VIEW,
        exact: true
      },
      {
        component: 'PendingInvoicePage',
        path: PENDING_INVOICE_URL,
        exact: true
      },
      {
        component: 'LogisticsPage',
        path: LOGISTICS_INVOICE,
        exact: true
      },
      {
        component: 'AddEditLogisticsInvoicePage',
        path: LOGISTICS_INVOICE_EDIT,
        exact: true
      },
      {
        component: 'LogisticsInvoiceListPage',
        path: LOGISTICS_INVOICE_LIST,
        exact: true
      },
      {
        component: 'ViewLogisticsInvoicePage',
        path: VIEW_LOGISTICS_INVOICE,
        exact: true
      },
      {
        component: 'EditLogisticsInvoicePage',
        path: EDIT_LOGISTICS_INVOICE,
        exact: true
      },
      {
        component: 'CreditNotePage',
        path: CREDIT_NOTE,
        exact: true
      },
      {
        component: 'ViewCreditNotePage',
        path: VIEW_CREDIT_NOTE,
        exact: true
      },
      {
        component: 'AddEditCreditNotePage',
        path: CREDIT_NOTE_EDIT,
        exact: true
      },
      {
        component: 'AddEditCreditNotePage',
        path: CREATE_CREDIT_NOTE,
        exact: true
      },
      {
        component: 'AdvancePaymentPage',
        path: ADVANCE_PAYMENT,
        exact: true
      },
      {
        component: 'AddEditAdvancePaymentPage',
        path: ADD_EDIT_ADVANCE_PAYMENT,
        exact: true
      },
      {
        component: 'ViewAdvancePaymentPage',
        path: VIEW_ADVANCE_PAYMENT,
        exact: true
      },
      {
        component: 'SOAPage',
        path: SOA,
        exact: true
      },
      {
        component: 'SOAHistoryPage',
        path: SOA_HISTORY,
        exact: true
      },
      {
        component: 'EnquiresPage',
        path: ENQUIRIES,
        exact: true
      },
      {
        component: 'AddEditEnquiresPage',
        path: CREATE_ENQUIRY,
        exact: true
      },
      {
        component: 'ViewEnquiresPage',
        path: VIEW_ENQUIRY,
        exact: true
      },
      {
        component: 'ReconciliationPage',
        path: RECONCILIATION,
        exact: true
      },
      {
        component: 'FAQPage',
        path: FAQS,
        exact: true
      },
      {
        component: 'PromptConfigPage',
        path: PROMPT_CONFIG,
        exact: true
      },
      {
        component: 'UserManagementListPage',
        path: USER_MANAGEMENT,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/admin`,
    exact: false,
    childrens: [
      {
        component: 'AddEditUserPage',
        path: `/user-management${ADD_USER}`,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/admin`,
    exact: false,
    childrens: [
      {
        component: 'AddEditUserPage',
        path: `/user-management${EDIT_USER}`,
        exact: true
      }
    ]
  }
]
