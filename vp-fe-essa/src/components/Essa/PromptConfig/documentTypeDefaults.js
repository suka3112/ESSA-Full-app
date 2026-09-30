/**
 * Document Types tab defaults, matching prompt-builder-mockup.html
 * (slugify, SCATTERED_HINTS) plus canonical slugs for existing ESSA types.
 */

const SCATTERED_HINTS = [
  'daily time sheet',
  'daily attendance',
  'summary calculation manhour',
  'po appendix',
  'sertifikat badan usaha'
]

const DISPLAY_NAME_TO_CANONICAL_SLUG = {
  Invoice: 'invoice',
  'Notice (Kwitansi)': 'notice',
  Kwitansi: 'notice',
  'Tax Invoice (VAT)': 'faktur_pajak',
  'Tax Invoice': 'faktur_pajak',
  'Tax Invoice (Faktur Pajak)': 'faktur_pajak',
  'Work Progress Certificate (Berita Acara)': 'berita_acara',
  'Berita Acara': 'berita_acara',
  'Daily Time Sheet': 'daily_timesheet',
  'Daily Attendance (biometrics)': 'daily_attendance',
  'Summary Calculation Manhour (Monthly Man-days Summary)': 'summary_calculation_manhour',
  PO: 'purchase_order',
  'PO Appendix': 'purchase_order_appendix',
  Transmittal: 'transmittal',
  'Notice Letter': 'notice_letter',
  'Monthly Progress Report': 'monthly_progress_report',
  'Sertifikat Badan Usaha': 'sertifikat_badan_usaha',
  'Izin Usaha Jasa Konstruksi': 'izin_usaha_jasa_konstruksi'
}

export function mockupSlugify(docName) {
  return (
    String(docName || '')
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'unclassified'
  )
}

export function defaultSplitBehavior(docName) {
  const lower = String(docName || '').toLowerCase()
  return SCATTERED_HINTS.some((hint) => lower.includes(hint)) ? 'scattered' : 'contiguous'
}

export function defaultCategoryId(docName) {
  const exact = DISPLAY_NAME_TO_CANONICAL_SLUG[docName]
  if (exact) return exact
  const lower = String(docName || '').trim().toLowerCase()
  const match = Object.entries(DISPLAY_NAME_TO_CANONICAL_SLUG).find(
    ([name]) => name.toLowerCase() === lower
  )
  return match ? match[1] : mockupSlugify(docName)
}

export function resolveDocumentTypeDefaults(docName, existing = {}) {
  return {
    categoryId: existing.categoryId || defaultCategoryId(docName),
    splitBehavior: existing.splitBehavior || defaultSplitBehavior(docName),
    classificationHints: existing.classificationHints || '',
    mandatory: Boolean(existing.mandatory)
  }
}
