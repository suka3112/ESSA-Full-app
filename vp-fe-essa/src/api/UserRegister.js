import axiosInstance from 'services/axiosSetup'
import {
  CITIES,
  COUNTRIES,
  CURRENCIES,
  GET_VENDOR_DATA,
  INDUSTRY_KEYS,
  INDUSTRY_TYPE,
  INVOICE_STATUS,
  REGIONS,
  STATUS,
  TAXABILITY_BASIS,
  USER_REGISTER,
  VENDOR_APPLOCATION_DROPDOWN,
  VENDOR_NAME,
  WHT_RATE
} from 'constants/api/UserRegistration'
import { GET_CREDIT_NOTE_PAYMENT_TERMS, GET_INCOTERMS, GET_OTHER_PAYMENT_TERMS, GET_PAYMENT_TERMS } from '../constants/api/MyProfile'

export const userRegister = async (payload) => {
  try {
    return await axiosInstance.post(USER_REGISTER, payload)
  } catch (error) {
    console.error('Error in userRegister:', error)
    throw error
  }
}

export const fetchOnboardVendorData = async (query) => {
  try {
    return await axiosInstance.get(GET_VENDOR_DATA, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in fetchOnboardData:', error)
    throw error
  }
}

export const fetchCities = async (query) => {
  try {
    return await axiosInstance.get(CITIES, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in fetchCities:', error)
    throw error
  }
}

export const fetchCountries = async (payload) => {
  try {
    return await axiosInstance.get(COUNTRIES, payload)
  } catch (error) {
    console.error('Error in fetchCountries:', error)
    throw error
  }
}

export const fetchRegions = async (query) => {
  try {
    return await axiosInstance.get(REGIONS, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in fetchRegions:', error)
    throw error
  }
}

export const fetchCurrencies = async (payload) => {
  try {
    return await axiosInstance.get(CURRENCIES, payload)
  } catch (error) {
    console.error('Error in fetchCurrencies:', error)
    throw error
  }
}

export const fetchStatus = async (payload) => {
  try {
    return await axiosInstance.get(STATUS, payload)
  } catch (error) {
    console.error('Error in fetchStatus:', error)
    throw error
  }
}

export const fetchInvoiceStatus = async (payload) => {
  try {
    return await axiosInstance.get(INVOICE_STATUS, payload)
  } catch (error) {
    console.error('Error in fetchInvoiceStatus:', error)
    throw error
  }
}

export const fetchVendorNameOrCode = async (query) => {
  try {
    return await axiosInstance.get(VENDOR_NAME, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in fetchStatus:', error)
    throw error
  }
}

export const fetchVendorApplicationDropdown = async (payload) => {
  try {
    return await axiosInstance.get(VENDOR_APPLOCATION_DROPDOWN, payload)
  } catch (error) {
    console.error('Error in fetchStatus:', error)
    throw error
  }
}


export const fetchIndustryKeys = async (payload) => {
  try {
    return await axiosInstance.get(INDUSTRY_KEYS, payload)
  } catch (error) {
    console.error('Error in fetch Industry Keys:', error)
    throw error
  }
}
export const fetchWhtRate = async (payload) => {
  try {
    return await axiosInstance.get(WHT_RATE, payload)
  } catch (error) {
    console.error('Error in fetch WHT Rate:', error)
    throw error
  }
}
export const fetchTaxabilityBasis = async (payload) => {
  try {
    return await axiosInstance.get(TAXABILITY_BASIS, payload)
  } catch (error) {
    console.error('Error in fetch Taxability Basis:', error)
    throw error
  }
}

export const fetchIndustryType = async (payload) => {
  try {
    return await axiosInstance.get(INDUSTRY_TYPE, payload)
  } catch (error) {
    console.error('Error in fetchIndustryType:', error)
    throw error
  }
}

export const getIncoterms = async () => {
  try {
    return await axiosInstance.get(GET_INCOTERMS, {
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in getIncoterms:', error)
    throw error
  }
}

export const getPaymentTerms = async (query) => {
  try {
    return await axiosInstance.get(GET_PAYMENT_TERMS, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in getPaymentTerms:', error)
    throw error
  }
}
export const getOtherPaymentTerms = async (query) => {
  try {
    return await axiosInstance.get(GET_OTHER_PAYMENT_TERMS, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in getPaymentTerms:', error)
    throw error
  }
}

export const getCreditNotePaymentTerms = async (query) => {
  try {
    return await axiosInstance.get(GET_CREDIT_NOTE_PAYMENT_TERMS, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in fetchCreditNotePaymentTerms:', error)
    throw error
  }
}