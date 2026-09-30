import {
  LOGIN,
  AUTH_CALLBACK,
  ENTRA_COMPLETE,
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
  PO_MATCHING,
  TIMELINE,
  MY_PROFILE,
  PROFILE_RESET_PASSWORD,
  PURCHASE_ORDER,
  INVOICE_PO_BASED,
  INVOICE_PO_BASED_EDIT,
  INVOICE_PO_BASED_VIEW,
  INVOICE_NON_PO_BASED,
  INVOICE_NON_PO_BASED_EDIT,
  INVOICE_NON_PO_BASED_VIEW,
  LOGISTICS_INVOICE,
  LOGISTICS_INVOICE_EDIT,
  CREDIT_NOTE,
  CREDIT_NOTE_EDIT,
  VIEW_CREDIT_NOTE,
  ADVANCE_PAYMENT,
  ADD_EDIT_ADVANCE_PAYMENT,
  VIEW_ADVANCE_PAYMENT,
  SOA,
  SOA_HISTORY,
  ENQUIRIES,
  CREATE_ENQUIRY,
  FAQS,
  GR_DETAILS,
  TOTP,
  VENDOR_REGISTER_OTP,
  LOGISTICS_INVOICE_LIST,
  VIEW_LOGISTICS_INVOICE,
  VIEW_PURCHASE_ORDER,
  CHANGE_PASSWORD,
  INVOICE_PO_BASED_INVOICE_DETAILS,
  RECONCILIATION,
  PENDING_INVOICE_URL,
  EDIT_LOGISTICS_INVOICE,
  CREATE_CREDIT_NOTE,
  VIEW_ENQUIRY,
  OUTSTANDINGPAYMENT,
  RECONCILIATION_URL,
  PAYABLE_THIS_MONTH
} from '../constants/url'
import { VENDOR_USER_TYPE, AUTH_SETUP, VENDOR_PORTAL } from '../constants/userType'

export const vendorRoutes = [
  {
    path: '/',
    redirect: `/${AUTH_SETUP}${LOGIN}`
  },
  {
    component: 'AuthLayout',
    path: `/${AUTH_SETUP}`,
    exact: false,
    childrens: [
      {
        component: 'LoginPage',
        path: LOGIN,
        exact: true
      }
    ]
  },
  {
    component: 'AuthLayout',
    path: `/${AUTH_SETUP}`,
    exact: false,
    childrens: [
      {
        component: 'SsoCallbackPage',
        path: AUTH_CALLBACK,
        exact: true
      },
      {
        component: 'EntraCompletePage',
        path: ENTRA_COMPLETE,
        exact: true
      }
    ]
  },
  {
    component: 'AuthLayout',
    path: `/${AUTH_SETUP}`,
    exact: false,
    childrens: [
      {
        component: 'TOTPPage',
        path: TOTP,
        exact: true
      }
    ]
  },
  {
    component: 'AuthLayout',
    path: `/${AUTH_SETUP}`,
    exact: false,
    childrens: [
      {
        component: 'TrackApplicationPage',
        path: TRACK_APPLICATION,
        exact: true
      }
    ]
  },
  {
    component: 'AuthLayout',
    path: `/${AUTH_SETUP}`,
    exact: false,
    childrens: [
      {
        component: 'TrackApplicationUIPage',
        path: TRACK_APPLICATION_PROGRESS,
        exact: true
      }
    ]
  },
  {
    component: 'AuthLayout',
    path: `/${AUTH_SETUP}`,
    exact: false,
    childrens: [
      {
        component: 'ForgotPassPage',
        path: FORGOT_PASSWORD,
        exact: true
      }
    ]
  },
  {
    component: 'AuthLayout',
    path: `/${AUTH_SETUP}`,
    exact: false,
    childrens: [
      {
        component: 'ResetPassPage',
        path: RESET_PASSWORD,
        exact: true
      }
    ]
  },
  {
    component: 'AuthLayout',
    path: `/${AUTH_SETUP}`,
    exact: false,
    childrens: [
      {
        component: 'ChangePasswordPage',
        path: CHANGE_PASSWORD,
        exact: true
      }
    ]
  },
  {
    component: 'AuthLayout',
    path: `/${AUTH_SETUP}`,
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
    component: 'AuthLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'VendorRegisterOTPPage',
        path: VENDOR_REGISTER_OTP,
        exact: true
      }
    ]
  },
  {
    component: 'AdminLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'VendorRegisterPage',
        path: REGISTER,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
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
        component: 'ReconciliationPage',
        path: RECONCILIATION,
        exact: true
      },
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'MyProfilePage',
        path: MY_PROFILE,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'ResetPassWordProfilePage',
        path: PROFILE_RESET_PASSWORD,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'PurchaseOrderPage',
        path: PURCHASE_ORDER,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'GRDetailsPage',
        path: GR_DETAILS,
        exact: true
      }
    ]
  },

  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'ViewPurchaseOrderPage',
        path: VIEW_PURCHASE_ORDER,
        exact: true
      }
    ]
  },

  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'InvoicePOBasedPage',
        path: INVOICE_PO_BASED,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'AddEditInvoicePOBasedPage',
        path: INVOICE_PO_BASED_EDIT,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'ViewInvoicePOBasedPage',
        path: INVOICE_PO_BASED_VIEW,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'ViewInvoiceDetailsPage',
        path: INVOICE_PO_BASED_INVOICE_DETAILS,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'InvoiceNonPOBasedPage',
        path: INVOICE_NON_PO_BASED,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'PendingInvoicePage',
        path: PENDING_INVOICE_URL,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'AddEditInvoiceNonPOBasedPage',
        path: INVOICE_NON_PO_BASED_EDIT,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'ViewInvoiceNonPOBasedPage',
        path: INVOICE_NON_PO_BASED_VIEW,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'LogisticsPage',
        path: LOGISTICS_INVOICE,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'AddEditLogisticsInvoicePage',
        path: LOGISTICS_INVOICE_EDIT,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'LogisticsInvoiceListPage',
        path: LOGISTICS_INVOICE_LIST,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'ViewLogisticsInvoicePage',
        path: VIEW_LOGISTICS_INVOICE,
        exact: true
      }
    ]
  },
   {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'EditLogisticsInvoicePage',
        path: EDIT_LOGISTICS_INVOICE,
        exact: true
      }
    ]
  },

  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'CreditNotePage',
        path: CREDIT_NOTE,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
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
      
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'ViewCreditNotePage',
        path: VIEW_CREDIT_NOTE,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'AdvancePaymentPage',
        path: ADVANCE_PAYMENT,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'AddEditAdvancePaymentPage',
        path: ADD_EDIT_ADVANCE_PAYMENT,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'ViewAdvancePaymentPage',
        path: VIEW_ADVANCE_PAYMENT,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'SOAPage',
        path: SOA,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'SOAHistoryPage',
        path: SOA_HISTORY,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'EnquiresPage',
        path: ENQUIRIES,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'AddEditEnquiresPage',
        path: CREATE_ENQUIRY,
        exact: true
      }
    ]
  },
   {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'ViewEnquiresPage',
        path: VIEW_ENQUIRY,
        exact: true
      }
    ]
  },
  {
    component: 'CommonLayout',
    path: `/${VENDOR_USER_TYPE}`,
    exact: false,
    childrens: [
      {
        component: 'FAQPage',
        path: FAQS,
        exact: true
      }
    ]
  }
]
