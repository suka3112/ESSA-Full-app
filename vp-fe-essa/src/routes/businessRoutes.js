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
  PO_MATCHING,
  TIMELINE,
  APPROVALS,
  EXCEPTION_WORKBENCH,
  INBOUND_EMAILS,
  INBOUND_SHAREPOINT,
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
  LOGISTICS_INVOICE_LIST,
  VIEW_LOGISTICS_INVOICE,
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
  VENDORS_LIST,
  VENDOR_DETAIL,
  INVOICE_PO_BASED_VIEW,
  INVOICE_NON_PO_BASED_VIEW,
  VENDORS_UPDATES,
  VENDOR_VIEW_PROFILE,
  VENDORS_EXTENSION,
  VIEW_VENDORS_EXTENSION,
  PO_VIEW_INVOICE_DETAILS,
  RECONCILIATION,
  PENDING_INVOICE_URL,
  CREDIT_NOTE_EDIT,
  CREATE_CREDIT_NOTE,
  VIEW_ENQUIRY,
  RECONCILIATION_URL,
  PAYABLE_THIS_MONTH,
  OUTSTANDINGPAYMENT
} from '../constants/url'
import { BUSINESS_USER_TYPE, VENDOR_PORTAL } from '../constants/userType'

export const businessRoutes = [
  {
    path: '/',
    redirect: `/${BUSINESS_USER_TYPE}${LOGIN}`
  },
  {
    component: 'AuthLayout',
    path: `/${BUSINESS_USER_TYPE}`,
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
      },
      {
        component: 'TwoFactorAuthenticationPage',
        path: OTP,
        exact: true
      }
    ]
  },
  {
    component: 'AdminLayout',
    path: `/${BUSINESS_USER_TYPE}`,
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
    path: `/${BUSINESS_USER_TYPE}`,
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
        component: 'FinanceMyProfilePage',
        path: MY_PROFILE,
        exact: true
      },
      {
        component: 'MyProfilePage',
        path: VENDOR_VIEW_PROFILE,
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
        component: 'VendorsAppListPage',
        path: VENDORS_APPLICATION,
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
        component: 'VendorsListPage',
        path: VENDORS_LIST,
        exact: true
      },
      {
        component: 'VendorDetailPage',
        path: VENDOR_DETAIL,
        exact: true
      },
      // {
      //   component: 'VendorsApplicationPage',
      //   path: VENDORS_APPLICATION,
      //   exact: true
      // },
      {
        component: 'VendorsUpdatePage',
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
        component: 'MyProfilePage',
        path: VENDOR_PROFILE,
        exact: true
      },
      {
        component: 'POBasedListPage',
        path: INVOICE_PO_BASED,
        exact: true
      },
      {
        component: 'ViewPOBasedPage',
        path: INVOICE_PO_BASED_VIEW,
        exact: true
      },
      {
        component: 'NonPOBasedListPage',
        path: INVOICE_NON_PO_BASED,
        exact: true
      },
      {
        component: 'ViewNonPOBasedPage',
        path: INVOICE_NON_PO_BASED_VIEW,
        exact: true
      },
      {
        component: 'LogisticsPage',
        path: LOGISTICS_INVOICE,
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
        component: 'CreditNoteListPage',
        path: CREDIT_NOTE,
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
        component: 'PendingInvoicePage',
        path: PENDING_INVOICE_URL,
        exact: true
      },
      {
        component: 'ViewCreditNotePage',
        path: VIEW_CREDIT_NOTE,
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
        component: 'ViewInvoiceDetailsPage',
        path: PO_VIEW_INVOICE_DETAILS,
        exact: true
      },
    ]
  }
]
