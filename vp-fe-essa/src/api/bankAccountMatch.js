/**
 * Bank account comparison helpers.
 * Leaf module so validationRuleCatalog can use these without importing apInvoiceOcr.
 */

/** Normalize bank account numbers for comparison (digits only). */
export const normalizeBankAccountNumber = (value) => {
  if (value == null || value === '') return null
  const digits = String(value).replace(/\D/g, '')
  return digits || null
}

/** True when two bank account values match after stripping separators. */
export const bankAccountsMatch = (left, right) => {
  const a = normalizeBankAccountNumber(left)
  const b = normalizeBankAccountNumber(right)
  if (!a || !b) return false
  return a === b
}
