export const VALIDATION_TYPES = [
  'Exact Match',
  'Date Match',
  'Amount Match',
  'Code Match',
  'List Match'
]

export const TOLERANCE_PRESETS = [
  'Exact',
  'Allow +/- 3 days',
  'Difference <= 2%',
  'From - To Range'
]

export const VALIDATION_TYPE_HELP = [
  { title: 'Exact Match', text: 'The value must be exactly the same as in SAP.' },
  { title: 'Amount Match', text: 'Numeric compare with an allowed difference or percentage.' },
  { title: 'Date Match', text: 'Dates may differ within the configured day tolerance.' },
  { title: 'Code Match', text: 'Master-data codes (vendor, tax, G/L) must match exactly.' },
  { title: 'List Match', text: 'Value must fall within an allowed list or from–to range.' }
]

export const TOLERANCE_HELP = [
  { title: 'Difference <= 2%', text: 'Pass when the invoice amount is within 2% of the SAP amount.' },
  { title: 'Allow +/- 3 days', text: 'Pass when the invoice date is within 3 days of the SAP date.' },
  { title: 'Exact', text: 'No tolerance — values must be identical.' },
  { title: 'From - To Range', text: 'Pass when the value sits between the configured bounds.' }
]

const poInvMappings = [
  ['INV_NO', 'Invoice Number', 'BKPF-XBLNR', 'Reference Document', 'Exact Match', 'Exact', 'Yes'],
  ['INV_DATE', 'Invoice Date', 'BSEG-BLDAT', 'Document Date', 'Date Match', 'Allow +/- 3 days', 'Yes'],
  ['VENDOR_CODE', 'Vendor Code', 'LFA1-LIFNR', 'Vendor Code', 'Exact Match', 'Exact', 'Yes'],
  ['VENDOR_NAME', 'Vendor Name', 'LFA1-NAME1', 'Vendor Name', 'Exact Match', 'Exact', 'Yes'],
  ['PO_NUMBER', 'PO Number', 'EKKO-EBELN', 'Purchasing Document', 'Exact Match', 'Exact', 'Yes'],
  ['CURRENCY', 'Currency', 'BKPF-WAERS', 'Currency Key', 'Exact Match', 'Exact', 'Yes'],
  ['GROSS_AMT', 'Gross Amount', 'BSEG-WRBTR', 'Amount in Document Currency', 'Amount Match', 'Difference <= 2%', 'Yes'],
  ['TAX_AMT', 'Tax Amount', 'BSEG-WMWST', 'Tax Amount', 'Amount Match', 'Difference <= 2%', 'Yes'],
  ['NET_AMT', 'Net Amount', 'BSEG-DMBTR', 'Amount in Local Currency', 'Amount Match', 'Difference <= 2%', 'Yes'],
  ['DUE_DATE', 'Due Date', 'BSEG-ZFBDT', 'Baseline Date for Due Date Calculation', 'Date Match', 'Allow +/- 3 days', 'No'],
  ['TAX_CODE', 'Tax Code', 'BSEG-MWSKZ', 'Tax Code', 'Code Match', 'Exact', 'Yes'],
  ['COMPANY_CODE', 'Company Code', 'BKPF-BUKRS', 'Company Code', 'Exact Match', 'Exact', 'Yes'],
  ['COST_CENTER', 'Cost Center', 'BSEG-KOSTL', 'Cost Center', 'Code Match', 'Exact', 'No'],
  ['GL_ACCOUNT', 'G/L Account', 'BSEG-HKONT', 'G/L Account', 'Code Match', 'Exact', 'Yes'],
  ['PAYMENT_TERM', 'Payment Term', 'BSEG-ZTERM', 'Payment Terms', 'List Match', 'From - To Range', 'No'],
  ['BANK_ACCOUNT', 'Bank Account', 'LFBK-BANKN', 'Bank Account Number', 'Exact Match', 'Exact', 'Yes'],
  ['BANK_KEY', 'Bank Key', 'LFBK-BANKL', 'Bank Key', 'Exact Match', 'Exact', 'Yes'],
  ['WHT_AMT', 'Withholding Tax', 'WITH_ITEM-WT_QSSHB', 'Withholding Tax Amount', 'Amount Match', 'Difference <= 2%', 'No']
]

const nonPoMappings = [
  ['INV_NO', 'Invoice Number', 'BKPF-XBLNR', 'Reference Document', 'Exact Match', 'Exact', 'Yes'],
  ['INV_DATE', 'Invoice Date', 'BSEG-BLDAT', 'Document Date', 'Date Match', 'Allow +/- 3 days', 'Yes'],
  ['VENDOR_CODE', 'Vendor Code', 'LFA1-LIFNR', 'Vendor Code', 'Exact Match', 'Exact', 'Yes'],
  ['VENDOR_NAME', 'Vendor Name', 'LFA1-NAME1', 'Vendor Name', 'Exact Match', 'Exact', 'Yes'],
  ['CURRENCY', 'Currency', 'BKPF-WAERS', 'Currency Key', 'Exact Match', 'Exact', 'Yes'],
  ['GROSS_AMT', 'Gross Amount', 'BSEG-WRBTR', 'Amount in Document Currency', 'Amount Match', 'Difference <= 2%', 'Yes'],
  ['TAX_AMT', 'Tax Amount', 'BSEG-WMWST', 'Tax Amount', 'Amount Match', 'Difference <= 2%', 'Yes'],
  ['BANK_ACCOUNT', 'Bank Account', 'LFBK-BANKN', 'Bank Account Number', 'Exact Match', 'Exact', 'Yes']
]

const svcMappings = [
  ['INV_NO', 'Invoice Number', 'BKPF-XBLNR', 'Reference Document', 'Exact Match', 'Exact', 'Yes'],
  ['INV_DATE', 'Invoice Date', 'BSEG-BLDAT', 'Document Date', 'Date Match', 'Allow +/- 3 days', 'Yes'],
  ['VENDOR_CODE', 'Vendor Code', 'LFA1-LIFNR', 'Vendor Code', 'Exact Match', 'Exact', 'Yes'],
  ['PO_NUMBER', 'PO Number', 'EKKO-EBELN', 'Purchasing Document', 'Exact Match', 'Exact', 'Yes'],
  ['SES_NO', 'SES Number', 'ESSR-LBLNI', 'Entry Sheet Number', 'Exact Match', 'Exact', 'Yes'],
  ['GROSS_AMT', 'Gross Amount', 'BSEG-WRBTR', 'Amount in Document Currency', 'Amount Match', 'Difference <= 2%', 'Yes'],
  ['TAX_AMT', 'Tax Amount', 'BSEG-WMWST', 'Tax Amount', 'Amount Match', 'Difference <= 2%', 'Yes']
]

let mappingSeq = 0

const toRows = (category, rows) =>
  rows.map((row) => {
    mappingSeq += 1
    const [capturedField, description, sapField, sapFieldDescription, validationType, tolerance, mandatory] = row
    return {
      id: `map-${mappingSeq}`,
      category,
      capturedField,
      description,
      sapField,
      sapFieldDescription,
      validationType,
      tolerance,
      mandatory,
      status: 'Active'
    }
  })

export const INITIAL_SAP_MAPPINGS = [
  ...toRows('MANPOWER_SERVICES', poInvMappings.concat(svcMappings.filter((r) => r[0] === 'SES_NO'))),
  ...toRows('CIVIL_CONTRACTOR', poInvMappings),
  ...toRows('MATERIAL_IMPORT', poInvMappings),
  ...toRows('CAMP_SERVICE_AND_CATERING', poInvMappings),
  ...toRows('NON_PO', nonPoMappings)
]

export const emptySapMapping = (category) => ({
  id: '',
  category,
  capturedField: '',
  description: '',
  sapField: '',
  sapFieldDescription: '',
  validationType: 'Exact Match',
  tolerance: 'Exact',
  mandatory: 'Yes',
  status: 'Active'
})
