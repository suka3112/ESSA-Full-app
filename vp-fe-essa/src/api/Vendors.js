import { LOGIN_AS_SUPPLIER } from "constants/api/Login"
import { apiService } from "constants/api/services"
import { APPROVE_REJECT_VENDOR_EXTENSION, APPROVE_REJECT_VENDOR_UPDATES, GET_VENDOR_EXTENSION_LIST, GET_VENDOR_HISTORY, GET_VENDORS_APP_LIST, GET_VENDORS_EXTENSION_DETAILS_PAGE, GET_VENDORS_LIST, GET_VENDORS_UPDATE_DETAILS_PAGE, GET_VENDORS_UPDATE_LIST, INVITE_VENDOR, VENDOR_EXTENTION_EXPORT, VENDORS_APP_EMAIL_REPORT, VENDORS_APP_LISTING_EXPORT, VENDORS_EMAIL_REPORT, VENDORS_LISTING_EXPORT, VENDORS_UPDATE_DETAILS_EMAIL_REPORT, VENDORS_UPDATE_DETAILS_EXPORT, VENDORS_UPDATE_EMAIL_REPORT, VENDORS_UPDATE_EXPORT } from "constants/Vendors"
import axiosInstance from "services/axiosSetup"


export const getVendorsList = async (query) => {
  try {
    return await axiosInstance.get(GET_VENDORS_LIST, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}
export const getExtentionExport = async (query) => {
  try {
    return await axiosInstance.get(VENDOR_EXTENTION_EXPORT, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}
export const loginAsSupplier = async (query) => {
  try {
    return await axiosInstance.get(LOGIN_AS_SUPPLIER, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in login supplier:', error)
    throw error
  }
}
export const getVendorsAppList = async (query) => {
  try {
    return await axiosInstance.get(GET_VENDORS_APP_LIST, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}
export const getVendorsUpdateList = async (query) => {
  try {
    return await axiosInstance.get(GET_VENDORS_UPDATE_LIST, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}

export const getVendorExtensionList = async (query) => {
  try {
    return await axiosInstance.get(GET_VENDOR_EXTENSION_LIST, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}
export const emailVendorsReport = async (query) => {
  try {
    return await axiosInstance.get(VENDORS_EMAIL_REPORT, { params: query })
  } catch (error) {
    console.error('Error in emailPOInvoiceDetailsReport:', error)
    throw error
  }
}

export const exportVendorsListing = async (query) => {
  try {
    return await axiosInstance.get(VENDORS_LISTING_EXPORT, { params: query })
  } catch (error) {
    console.error('Error in exportPOInvoiceListing:', error)
    throw error
  }
}

export const exportVendorsAppListing = async (query) => {
  try {
    return await axiosInstance.get(VENDORS_APP_EMAIL_REPORT, { params: query })
  } catch (error) {
    console.error('Error in exportPOInvoiceListing:', error)
    throw error
  }
}

export const emailVendorsAppReport = async (query) => {
  try {
    return await axiosInstance.get(VENDORS_APP_LISTING_EXPORT, { params: query })
  } catch (error) {
    console.error('Error in emailPOInvoiceDetailsReport:', error)
    throw error
  }
}

export const inviteVendorApi = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(INVITE_VENDOR, payload, {
      service
    })
  } catch (error) {
    console.error('Error in addSubUser:', error)
    throw error
  }
}

export const getVendorsUpdateDetailPage = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_VENDORS_UPDATE_DETAILS_PAGE, {
      service,
      params: query // Added query params support
    })
  } catch (error) {
    console.error(`Error in  Vendors update detail`, error)
    throw error
  }
}

export const getVendorsHistory = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_VENDOR_HISTORY, {
      service,
      params: query // Added query params support
    })
  } catch (error) {
    console.error(`Error in  Vendors update detail`, error)
    throw error
  }
}


export const getVendorsExtensionDetailPage = async (query, service = apiService) => {
  try {
    return await axiosInstance.get(GET_VENDORS_EXTENSION_DETAILS_PAGE, {
      service,
      params: query // Added query params support
    })
  } catch (error) {
    console.error(`Error in  Vendors update detail`, error)
    throw error
  }
}

export const approveRejectVendorViewUpdates = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(APPROVE_REJECT_VENDOR_UPDATES, payload, {
      service
    })
  } catch (error) {
    console.error('Error in getTrackUpdates:', error)
    throw error
  }
}

export const approveRejectVendorExtension = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(APPROVE_REJECT_VENDOR_EXTENSION, payload, {
      service
    })
  } catch (error) {
    console.error('Error in getTrackUpdates:', error)
    throw error
  }
}

export const exportVendorsUpdate = async (query) => {
  try {
    return await axiosInstance.get(VENDORS_UPDATE_EXPORT, { params: query })
  } catch (error) {
    console.error('Error in exportPOInvoiceListing:', error)
    throw error
  }
}
export const emailVendorsUpdatesReport = async (query) => {
  try {
    return await axiosInstance.get(VENDORS_UPDATE_EMAIL_REPORT, { params: query })
  } catch (error) {
    console.error('Error in emailPOInvoiceDetailsReport:', error)
    throw error
  }
}
export const exportVendorsUpdateDetails = async (query) => {
  try {
    return await axiosInstance.get(VENDORS_UPDATE_DETAILS_EXPORT, { params: query })
  } catch (error) {
    console.error('Error in exportPOInvoiceListing:', error)
    throw error
  }
}
export const emailVendorsUpdatesDetailsReport = async (query) => {
  try {
    return await axiosInstance.get(VENDORS_UPDATE_DETAILS_EMAIL_REPORT, { params: query })
  } catch (error) {
    console.error('Error in emailPOInvoiceDetailsReport:', error)
    throw error
  }
}