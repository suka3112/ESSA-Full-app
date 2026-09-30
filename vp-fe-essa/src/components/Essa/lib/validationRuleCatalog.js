import { bankAccountsMatch } from 'api/bankAccountMatch'

/** Non-PO travel invoice validation checklist (4 rules — always pass in POC). */
export const NON_PO_VALIDATION_RULE_CATALOG = [
  {
    sequence: 1,
    ruleCode: 'HCIS_REQUEST_MATCH',
    tabLabel: 'Request ID',
    title: 'Request ID — HCIS Clearing Journal',
    description:
      "Determine 'Request ID' through by matching 'Name', 'Travel Date', 'Airline', 'Route Code From', 'Route Code To', 'Amount', 'VAT', and 'Total Amount' in 'HCIS Clearing Journal (e)', against 'Invoice (a)' and 'Listing Invoice (b)'."
  },
  {
    sequence: 2,
    ruleCode: 'BANK_VENDOR_MASTER',
    tabLabel: 'Bank',
    title: 'Bank details — Vendor Master',
    description: "Validate 'Bank Details' on 'Invoice (a)' to 'Vendor Master (i)'."
  },
  {
    sequence: 3,
    ruleCode: 'NON_PKP_VENDOR',
    tabLabel: 'Non-PKP',
    title: 'Non-PKP vendor check',
    description:
      'If non-PKP (non-VAT charged entity) vendor, validate the Vendor name and date of issuance (should not be more than 1 year).'
  },
  {
    sequence: 4,
    ruleCode: 'ADVANCE_RETENTION',
    tabLabel: 'Advance',
    title: 'Advance & retention',
    description:
      "Validate advance payment to be recovered, retention to be hold as per the 'PO (g)' terms."
  }
]

/** Fixed 12-rule ESSA invoice validation checklist (display order). */
export const VALIDATION_RULE_CATALOG = [
  {
    sequence: 1,
    ruleCode: 'DOC_COMPLETENESS',
    tabLabel: 'Docs',
    title: 'Document completeness',
    description: 'All documents required by the PO must be submitted before validation proceeds.'
  },
  {
    sequence: 2,
    ruleCode: 'PO_NUMBER_MASTER',
    tabLabel: 'PO #',
    title: 'PO number → PO Master',
    description: 'Invoice PO number must exist and be valid in PO Master.'
  },
  {
    sequence: 3,
    ruleCode: 'VENDOR_PO_INVOICE',
    tabLabel: 'Vendor',
    title: 'Vendor name: PO → Invoice',
    description: 'Vendor on the PO must match the vendor on the invoice.'
  },
  {
    sequence: 4,
    ruleCode: 'BANK_VENDOR_MASTER',
    tabLabel: 'Bank',
    title: 'Bank account → Vendor Master',
    description: 'Invoice bank account number must match the account on file for the vendor.'
  },
  {
    sequence: 5,
    ruleCode: 'NON_PKP_VENDOR',
    tabLabel: 'Non-PKP',
    title: 'Non-PKP vendor check',
    description:
      'For non-VAT (non-PKP) vendors only: invoice vendor must match PO vendor and invoice date must be within 365 days of PO date. N/A when VAT is charged (PKP or tax invoice with VAT).'
  },
  {
    sequence: 6,
    ruleCode: 'TAX_INVOICE_MATCH',
    tabLabel: 'Tax inv.',
    title: 'Vendor + VAT vs Tax Invoice',
    description: 'Commercial invoice vendor and VAT must match the Faktur Pajak.'
  },
  {
    sequence: 7,
    ruleCode: 'QTY_RECONCILIATION',
    tabLabel: 'Qty',
    title: 'Quantity reconciliation',
    description: 'Regular MH must match Berita Acara "This Man Hours", Manhour Summary totals, and SES Accepted Qty (all regular MH lines); overtime MH must match SES overtime MH lines.'
  },
  {
    sequence: 8,
    ruleCode: 'RATE_VALIDATION',
    tabLabel: 'Rate',
    title: 'Rate validation',
    description:
      'Applied rate = invoice Direct Cost / Overtime amount ÷ manhour summary hours by role; must match the contracted IDR/hr rate from the manhour summary for each role.'
  },
  {
    sequence: 9,
    ruleCode: 'LATE_DELIVERY_LD',
    tabLabel: 'LD',
    title: 'Late delivery / LD',
    description: 'If late, liquidated damages per PO Appendix terms.'
  },
  {
    sequence: 10,
    ruleCode: 'PO_VALUE_ZERO_TOLERANCE',
    tabLabel: 'PO value',
    title: 'Total PO value (0% tolerance)',
    description: 'Invoice total amount must not exceed the PO total value.'
  },
  {
    sequence: 11,
    ruleCode: 'SES_DEVIATION',
    tabLabel: 'SES',
    title: 'SES vs invoice deviation',
    description:
      'Pass when SES total exactly matches the invoice amount (0% tolerance). Fail if SES is lower or higher than the invoice.'
  },
  {
    sequence: 12,
    ruleCode: 'ADVANCE_RETENTION',
    tabLabel: 'Advance',
    title: 'Advance recovery & retention',
    description: 'Recover advance payment and withhold retention per PO terms.'
  }
]

/** Prefer the first failing rule, otherwise rule 1. */
export const getDefaultChecklistTab = (checklist = []) => {
  const firstIssue = checklist.find((rule) => rule.status === 'fail')
  return (
    firstIssue?.ruleCode ||
    checklist[0]?.ruleCode ||
    'DOC_COMPLETENESS'
  )
}

const SEVERITY_TO_UI = {
  PASS: 'pass',
  WARNING: 'fail',
  FAIL: 'fail',
  BLOCKED: 'fail',
  SKIP: 'na'
}

const STATUS_LABELS = {
  pass: 'Pass',
  fail: 'Fail',
  na: 'N/A'
}

/** Rate rule must fail when validation cannot run or any category is invalid. */
export const resolveRateValidationStatus = (rule = {}) => {
  if (rule.ruleCode !== 'RATE_VALIDATION') return rule.status || 'fail'
  if (/cannot validate|validation incomplete|^FAIL:/i.test(String(rule.message || ''))) {
    return 'fail'
  }

  const rows = Array.isArray(rule.details) ? rule.details : []
  if (!rows.length) {
    return rule.severity === 'PASS' ? 'fail' : rule.status || 'fail'
  }
  if (rows.some((row) => row.status === 'FAIL')) return 'fail'

  // Hour-rate rows: appliedRate and poRate both present
  const comparable = rows.filter((row) => row.appliedRate != null && row.poRate != null)
  // Lump-sum rows: no rate columns, but invoicedAmount is present and was compared against contractAmount
  const lumpSum = rows.filter((row) => row.appliedRate == null && row.poRate == null && row.invoicedAmount != null)

  if (!comparable.length && !lumpSum.length) return 'fail'
  if (comparable.some((row) => row.status !== 'PASS')) return 'fail'
  if (lumpSum.some((row) => row.status !== 'PASS')) return 'fail'
  return 'pass'
}

/** Bank rule passes when account numbers match after stripping dashes/spaces. */
export const resolveBankValidationStatus = (rule = {}) => {
  if (rule.ruleCode !== 'BANK_VENDOR_MASTER') return rule.status || 'fail'
  const expected = rule.expectedValue ?? rule.expected
  const actual = rule.actualValue ?? rule.actual
  if (expected && actual && bankAccountsMatch(expected, actual)) return 'pass'
  return rule.status || 'fail'
}

/** True when a PO validation rule is not applicable but should count as passed. */
export const isNotApplicableValidationRule = (rule = {}) => {
  const message = String(rule.message || '')
  return (
    rule.status === 'na' ||
    rule.severity === 'SKIP' ||
    (rule.severity === 'PASS' && /not applicable/i.test(message))
  )
}

/** True when a checklist rule counts toward the passed total. */
export const isChecklistPassedRule = (rule = {}) => {
  if (rule.ruleCode === 'RATE_VALIDATION') {
    return resolveRateValidationStatus(rule) === 'pass'
  }
  if (rule.ruleCode === 'BANK_VENDOR_MASTER') {
    return resolveBankValidationStatus(rule) === 'pass'
  }
  return rule.status === 'pass' || rule.status === 'na' || isNotApplicableValidationRule(rule)
}

export const getChecklistStatusLabel = (status) => STATUS_LABELS[status] || status

const resolveChecklistDisplayStatus = (check, severity, status) => {
  if (isNotApplicableValidationRule({ ...check, severity, status })) {
    return 'na'
  }
  return status
}

const catalogHasRuleCode = (catalog, ruleCode) =>
  Boolean(ruleCode && catalog.some((rule) => rule.ruleCode === ruleCode))

/** True when API rules should render as-is (generic OCR validation, not the 12-rule PO catalog). */
export const isGenericValidation = (checks = [], validation = {}) => {
  if (validation?.mode === 'generic') return true
  const codes = checks.map((check) => check.ruleCode).filter(Boolean)
  if (!codes.length) return false
  return codes.every(
    (code) =>
      !catalogHasRuleCode(VALIDATION_RULE_CATALOG, code) &&
      !catalogHasRuleCode(NON_PO_VALIDATION_RULE_CATALOG, code)
  )
}

const mapApiCheckToRule = (check, index, catalog, { defaultStatus = 'fail', defaultMessage } = {}) => {
  const catalogRule =
    catalog.find((rule) => rule.ruleCode === check.ruleCode) ||
    catalog.find((rule) => rule.sequence === check.sequence) ||
    null

  const severity = check.severity || null
  const rawStatus =
    check.status || (severity ? SEVERITY_TO_UI[severity] || defaultStatus : defaultStatus)
  const status =
    check.ruleCode === 'RATE_VALIDATION'
      ? resolveRateValidationStatus({
          ruleCode: check.ruleCode,
          severity,
          status: rawStatus,
          message: check.message,
          details: check.details
        })
      : check.ruleCode === 'BANK_VENDOR_MASTER'
        ? resolveBankValidationStatus({
            ruleCode: check.ruleCode,
            severity,
            status: rawStatus,
            expected: check.expected ?? check.expectedValue,
            actual: check.actual ?? check.actualValue,
            expectedValue: check.expectedValue,
            actualValue: check.actualValue
          })
        : resolveChecklistDisplayStatus(check, severity, rawStatus)

  return {
    ...(catalogRule || {
      sequence: check.sequence ?? index + 1,
      ruleCode: check.ruleCode || `RULE_${index + 1}`,
      tabLabel: check.tabLabel || check.name || check.ruleName || `Rule ${index + 1}`,
      title: check.title || check.name || check.ruleName || check.ruleCode || `Validation ${index + 1}`,
      description: check.description || check.message || ''
    }),
    status,
    severity:
      status === 'na' ? 'SKIP' : status === 'pass' ? 'PASS' : 'FAIL',
    expected: check.expected ?? check.expectedValue ?? null,
    actual: check.actual ?? check.actualValue ?? null,
    message: check.message ?? defaultMessage ?? null,
    details: check.details ?? null,
    fields: check.fields ?? null,
    comparisons: check.comparisons ?? null,
    variance: check.variance ?? null,
    sourceTable: check.sourceTable ?? null,
    sourceRecordId: check.sourceRecordId ?? null,
    expectedLabel: check.expectedLabel ?? null,
    actualLabel: check.actualLabel ?? null
  }
}

/** Map API checks directly when rule codes are not from the fixed catalog. */
export const mergeDynamicValidationChecklist = (checks = [], catalog = VALIDATION_RULE_CATALOG) =>
  checks.map((check, index) => mapApiCheckToRule(check, index, catalog))

const mergeOntoCatalog = (catalog, checks = [], { defaultStatus = 'fail', defaultMessage } = {}) => {
  const byCode = new Map()
  const bySequence = new Map()

  checks.forEach((check) => {
    if (check.ruleCode) byCode.set(check.ruleCode, check)
    if (check.sequence) bySequence.set(check.sequence, check)
  })

  const merged = catalog.map((rule) => {
    const api =
      byCode.get(rule.ruleCode) ||
      bySequence.get(rule.sequence) ||
      null

    if (!api) {
      const status = defaultStatus
      return {
        ...rule,
        status,
        severity: status === 'pass' ? 'PASS' : status === 'na' ? 'SKIP' : 'FAIL',
        expected: null,
        actual: null,
        message: defaultMessage ?? 'Validation did not evaluate this rule.',
        details: null,
        variance: null
      }
    }

    return mapApiCheckToRule(api, rule.sequence - 1, catalog, { defaultStatus, defaultMessage })
  })

  const catalogCodes = new Set(catalog.map((rule) => rule.ruleCode))
  const extras = checks
    .filter((check) => check.ruleCode && !catalogCodes.has(check.ruleCode))
    .map((check, index) => mapApiCheckToRule(check, catalog.length + index, catalog, { defaultStatus, defaultMessage }))

  return extras.length ? [...merged, ...extras] : merged
}

/** Merge API results onto the fixed catalog so all 12 rows always render. */
export const mergeValidationChecklist = (checks = [], validation = {}) => {
  if (isGenericValidation(checks, validation)) {
    return mergeDynamicValidationChecklist(checks)
  }
  return mergeOntoCatalog(VALIDATION_RULE_CATALOG, checks)
}

/** Merge non-PO validation results onto the 4-rule catalog (POC defaults to pass). */
export const mergeNonPoValidationChecklist = (checks = [], validation = {}) => {
  if (isGenericValidation(checks, validation)) {
    return mergeDynamicValidationChecklist(checks, NON_PO_VALIDATION_RULE_CATALOG)
  }
  return mergeOntoCatalog(NON_PO_VALIDATION_RULE_CATALOG, checks, {
    defaultStatus: 'pass',
    defaultMessage: 'Passed.'
  })
}

/** Count passed rules from an already-merged checklist. */
export const getChecklistPassSummaryFromMerged = (checklist = []) => {
  const passed = checklist.filter(isChecklistPassedRule).length
  return { passed, total: checklist.length }
}

/** PASS only when every merged checklist rule counts as passed (e.g. 12/12). */
export const getChecklistOverallStatusFromMerged = (checklist = []) => {
  const { passed, total } = getChecklistPassSummaryFromMerged(checklist)
  if (!total) return null
  return passed === total ? 'PASS' : 'FAIL'
}

/** Badge text: "12/12 PASS" when complete, "11/12 PASSED" when partial (count = passed checks). */
export const formatChecklistPassBadgeText = (passed, total) => {
  if (!total) return null
  const allPassed = passed === total
  return `${passed}/${total} ${allPassed ? 'PASS' : 'PASSED'}`
}

/** Count checklist rules with pass status (e.g. 8/12). */
export const getChecklistPassSummary = (checks = [], { variant = 'po', validation = {} } = {}) => {
  const merge =
    variant === 'nonPo' ? mergeNonPoValidationChecklist : mergeValidationChecklist
  const checklist = merge(checks, validation)
  const passed = checklist.filter(isChecklistPassedRule).length
  return { passed, total: checklist.length }
}

/** Align toolbar overall badge with the section pass summary (e.g. 12/12). */
export const deriveValidationOverallStatus = (
  checks = [],
  { variant = 'po', validation = {} } = {}
) => {
  const { passed, total } = getChecklistPassSummary(checks, { variant, validation })
  if (!total) return null
  return passed === total ? 'PASS' : 'FAIL'
}
