import axiosInstance from '../services/axiosSetup'
import {
  LIST_PO,
  PO_DETAILS,
  PO_MATERIAL_LISTING,
  PO_MATERIAL_QUANTITY_LISTING,
  PO_GOODS_RECEIPT_LISTING,
  EXPORT_GOODS_RECEIPT_LISTING,
  SEND_GOODS_RECEIPT_EMAIL_REPORT,
  PO_EXPORT,
  PO_LINE_ITEM_EXPORT,
  PO_GR_DETAILS,
  PO_INVOICE_LISTING,
  PO_INVOICE_DETAIL_LISTING,
  PO_GR_DETAILS_EXPORT,
  PO_INV_DETAILS_EXPORT,
  GET_PO_DROPDOWN,
  PO_LINE_ITEM_DETAILS
} from 'constants/api/PurchaseOrder'

export const getPOList = async (query) => {
  try {
    return await axiosInstance.get(LIST_PO, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in getPOList:', error)
    throw error
  }
}

export const getPODropdown = async (query) => {
  try {
    return await axiosInstance.get( GET_PO_DROPDOWN, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in getPOList:', error)
    throw error
  }
}

export const getPODetails = async (query) => {
  try {
    return await axiosInstance.get(PO_DETAILS, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in getPODetails:', error)
    throw error
  }
}

export const getOrderMaterialListing = async (query) => {
  try {
    return await axiosInstance.get(PO_MATERIAL_LISTING, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in getOrderMaterialListing:', error)
    throw error
  }
}

export const getOrderMaterialQuantityListing = async (query) => {
  try {
    return await axiosInstance.get(PO_MATERIAL_QUANTITY_LISTING, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in getOrderMaterialQuantityListing:', error)
    throw error
  }
}

export const getPOGoodsReceiptListing = async (query) => {
  try {
    return await axiosInstance.get(PO_GOODS_RECEIPT_LISTING, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in getPOGoodsReceiptListing:', error)
    throw error
  }
}
export const getPOLineItemDetails = async (query) => {
  try {
    return await axiosInstance.get(PO_LINE_ITEM_DETAILS, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in getPOGoodsReceiptListing:', error)
    throw error
  }
}

export const downloadPOGoodsReceiptListCSV = async (query) => {
  try {
    return await axiosInstance.get(PO_EXPORT, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}
export const ExportPOGRDetails = async (query) => {
  try {
    return await axiosInstance.get(PO_GR_DETAILS_EXPORT, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}
export const ExportPOInvoiceDetails = async (query) => {
  try {
    return await axiosInstance.get(PO_INV_DETAILS_EXPORT, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}
export const sendPOLineItemEmail = async (query) => {
  try {
    return await axiosInstance.get(PO_LINE_ITEM_EXPORT, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}
export const pOGRDetails = async (query) => {
  try {
    return await axiosInstance.get(PO_GR_DETAILS, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}
export const invoiceListing = async (query) => {
  try {
    return await axiosInstance.get(PO_INVOICE_LISTING, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}
export const invoiceDetailPOListing = async (query) => {
  try {
    return await axiosInstance.post(PO_INVOICE_DETAIL_LISTING,{}, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in downloadPOGoodsReceiptListCSV:', error)
    throw error
  }
}

export const sendEmailReport = async (query) => {
  try {
    return await axiosInstance.post(SEND_GOODS_RECEIPT_EMAIL_REPORT, query)
  } catch (error) {
    console.error('Error in sendEmailReport:', error)
    throw error
  }
}
