export const TAB_INVOICE_CATEGORY = 'invoice-category'
export const TAB_DOCUMENT_TYPES = 'document-types'
export const TAB_FIELDS = 'fields'
export const TAB_SAP_MAPPING = 'sap-mapping'
/** Document presence rules (was “Validation Rules”). */
export const TAB_VALIDATION_RULES = 'validation-rules'
/** N-Way Matching — check a data point on an anchor document against other documents / SAP. */
export const TAB_NWAY_MATCHING = 'n-way-matching'
export const TAB_WORKFLOWS = 'workflows'
export const TAB_NOTIFICATIONS = 'notifications'
export const TAB_HISTORY = 'history'

export const INVOICE_CONFIG_TABS = [
  { id: TAB_INVOICE_CATEGORY, label: 'Invoice Category', enabled: true },
  { id: TAB_DOCUMENT_TYPES, label: 'Document Types', enabled: true },
  { id: TAB_FIELDS, label: 'Fields to Capture', enabled: true },
  { id: TAB_SAP_MAPPING, label: 'SAP Field Mapping', enabled: true },
  { id: TAB_VALIDATION_RULES, label: 'Document Rules', enabled: true },
  { id: TAB_NWAY_MATCHING, label: 'N-Way Matching', enabled: true },
  { id: TAB_WORKFLOWS, label: 'Workflows', enabled: false },
  { id: TAB_NOTIFICATIONS, label: 'Notifications', enabled: false },
  { id: TAB_HISTORY, label: 'History', enabled: false }
]

export const INVOICE_CONFIG_TAB_IDS = INVOICE_CONFIG_TABS.filter((t) => t.enabled).map((t) => t.id)

export const INVOICE_CATEGORY_OPTIONS = [
  { value: 'MANPOWER_SERVICES', label: 'Manpower' },
  { value: 'CIVIL_CONTRACTOR', label: 'Civil' },
  { value: 'MATERIAL_IMPORT', label: 'Materials' },
  { value: 'CAMP_SERVICE_AND_CATERING', label: 'Catering' },
  { value: 'NON_PO', label: 'Non-PO' }
]

export const INVOICE_CATEGORY_LABEL = Object.fromEntries(
  INVOICE_CATEGORY_OPTIONS.map((opt) => [opt.value, opt.label])
)

export const VERSION_OPTIONS = [
  { value: 'v1', label: 'v1.0 (01-May-2025 - Active)', shortLabel: 'v1.0 (Active)' },
  { value: 'v09', label: 'v0.9 (15-Apr-2025 - Inactive)', shortLabel: 'v0.9 (Inactive)' }
]

export const cloneConfig = (value) => JSON.parse(JSON.stringify(value))
