/** Option lists and labels for the WHT Configuration screen. */

export const STEP_LABELS = {
  1: 'Offshore',
  2: 'Individual Vendor',
  3: 'Facility',
  4: 'Rental',
  5: 'Construction',
  6: 'Service',
  7: 'Default'
}

export const CATEGORIES = Object.values(STEP_LABELS)

export const WHT_ARTICLES = ['Art. 4(2)', 'Art. 15', 'Art. 21', 'Art. 23', 'Art. 26']

export const RATE_TYPES = [
  { value: 'FIXED', label: 'Fixed percentage' },
  { value: 'TREATY', label: 'Tax treaty rate' },
  { value: 'PROGRESSIVE', label: 'Progressive (PPh 21)' }
]

export const REFERENCE_MASTERS = [
  { value: '', label: 'None' },
  { value: 'TAX_TREATY', label: 'Tax Treaty Rates', tab: 'treaties' },
  { value: 'SKB', label: 'SKB', tab: 'facilities' },
  { value: 'PP23', label: 'PP23', tab: 'facilities' },
  { value: 'SBUJK', label: 'SBUJK', tab: 'sbujk' },
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

export const SERVICE_TREATMENTS = ['Technical services', 'FTS']

export const BUSINESS_SCOPES = [
  { value: 'EXECUTION', label: 'Execution' },
  { value: 'PLANNING_CONSULTING', label: 'Planning / Consulting' }
]
export const QUALIFICATIONS = [
  { value: 'SMALL', label: 'Small' },
  { value: 'NON_SMALL', label: 'Non-small' }
]
export const optionLabel = (options, value) => options.find((o) => o.value === value)?.label || value || '—'

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

/** "Execution", "SBUJK + Small" -> "EXECUTION", "SBUJK_SMALL" (engine key for new rules). */
export const toCode = (text) =>
  String(text || '')
    .trim()
    .toUpperCase()
    .replace(/\+/g, ' ')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

export const pct = (value) => (value == null || value === '' ? '—' : `${Number(value)}%`)

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
