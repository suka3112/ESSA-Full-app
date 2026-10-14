/**
 * Option lists and helpers for the WHT Configuration screen.
 * The rule taxonomy (category → condition → sub-condition), SAP WH codes and rate types
 * come from the server (GET /wht-config), so the form and the validation share one source.
 */

export const REFERENCE_MASTERS = [
  { value: 'TAX_TREATY', label: 'Tax Rate document', tab: 'taxRates' },
  { value: 'SKB', label: 'SKB', tab: 'facilities' },
  { value: 'PP23', label: 'PP23', tab: 'facilities' },
  { value: 'SBUJK', label: 'SBUJK' },
  { value: 'PPH21_TARIFF', label: 'Tarif PPh Orang Pribadi' }
]
export const referenceLabel = (value) => REFERENCE_MASTERS.find((r) => r.value === value)?.label || ''

export const RULE_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INACTIVE', label: 'Inactive' }
]
export const MASTER_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' }
]

export const rateTypeLabel = (rateTypes, value) => rateTypes.find((r) => r.value === value)?.label || value || '—'

/** Inputs for "Test WHT Rule" */
export const VENDOR_TYPES = [
  { value: 'DOMESTIC_COMPANY', label: 'Domestic company' },
  { value: 'OFFSHORE', label: 'Offshore' },
  { value: 'INDIVIDUAL', label: 'Individual' }
]
export const OFFSHORE_INCOME = [
  { value: 'DIVIDEND_INTEREST', label: 'Dividend / Interest' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'ROYALTY', label: 'Royalty' },
  { value: 'TECHNICAL_SERVICE', label: 'Technical service' }
]
export const RENTAL_TYPES = [
  { value: 'LAND_BUILDING', label: 'Land / Building' },
  { value: 'MOVABLE_ASSET', label: 'Movable asset' }
]
export const BUSINESS_SCOPES = [
  { value: 'EXECUTION', label: 'Execution' },
  { value: 'PLANNING_CONSULTING', label: 'Planning / Consulting' }
]
export const SBUJK_OPTIONS = [
  { value: 'NONE', label: 'No SBUJK' },
  { value: 'SMALL', label: 'SBUJK - Small' },
  { value: 'NON_SMALL', label: 'SBUJK - Non-small' }
]
export const SERVICE_TYPES = [
  { value: 'OTHER_SERVICES', label: 'Other services' },
  { value: 'NOT_VAT', label: 'Not subject to VAT' },
  { value: 'FREIGHT_TRAVEL', label: 'Freight / Travel' },
  { value: 'ROYALTY_LICENSE', label: 'Royalty / License' },
  { value: 'INTEREST', label: 'Interest' },
  { value: 'DOMESTIC_SHIPPING', label: 'Domestic shipping' },
  { value: 'DOMESTIC_AIRLINE', label: 'Domestic airline' },
  { value: 'FOREIGN_SHIPPING', label: 'Foreign shipping' }
]

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const fmtDateTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const fmtBytes = (n) => (n == null ? '—' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`)

/** Do two [from, to] ranges overlap? (to = null means open-ended) */
export const rangesOverlap = (aFrom, aTo, bFrom, bTo) =>
  (aFrom || '0000') <= (bTo || '9999-12-31') && (bFrom || '0000') <= (aTo || '9999-12-31')
