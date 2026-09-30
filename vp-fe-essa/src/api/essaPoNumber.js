/**
 * ESSA commercial PO numbers are 10 digits starting with 4203.
 * Kept as a leaf module to avoid circular imports with apInvoiceOcr.
 */

const ESSA_PO_RE = /^4203\d{6}$/

export const coerceEssaPoNumber = (value) => {
  if (value == null) return null
  const digits = String(value).replace(/\D/g, '')
  return ESSA_PO_RE.test(digits) ? digits : null
}

export const isEssaPoNumber = (value) => Boolean(coerceEssaPoNumber(value))
