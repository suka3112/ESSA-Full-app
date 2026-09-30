import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Mail, Send, ShieldAlert, Upload } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Tabs } from '../ui/Tabs'
import { Textarea } from '../ui/Textarea'
import { formatChecklistVatField, formatIdrDisplay, formatIdrPrefix, formatSesDeviationReference, formatVatComparisonDisplay } from 'api/essaDashboard'
import {
  formatDocCompletenessList,
  normalizeSesDeviationDetails,
  normalizeRateValidationDetails,
  resolveInvoiceBankDetails,
  formatBankComparisonLine,
  buildBankValidationDetails,
  normalizeBankAccountNumber,
  bankAccountsMatch,
  resolveCommercialInvoiceSummary,
  resolveInvoiceExtractedTotals,
  resolveTaxInvoiceSectionData,
  parseAmount,
  resolveDemoScenario,
  augmentRateValidationCheck,
  augmentPoValueValidationCheck,
  augmentBankValidationCheck,
  computeRateValidationFromBundle,
  computeNonPkpValidationFromBundle,
  createDocumentRequest,
  sendDocumentRequestEmail
} from 'api/apInvoiceOcr'
import { showEssaSuccessToast, showEssaErrorToast } from './essaToast'
import { defaultCategoryId } from '../PromptConfig/documentTypeDefaults'
import {
  mergeValidationChecklist,
  mergeNonPoValidationChecklist,
  getChecklistStatusLabel,
  getDefaultChecklistTab,
  getChecklistPassSummaryFromMerged,
  getChecklistOverallStatusFromMerged,
  formatChecklistPassBadgeText,
  resolveRateValidationStatus,
  resolveBankValidationStatus
} from './validationRuleCatalog'

const OVERALL_TONE = {
  PASS: 'pass',
  FAIL: 'fail',
  BLOCKED: 'fail'
}

const ROW_STATUS_CLASS = {
  pass: 'dx-checklist-row--pass',
  fail: 'dx-checklist-row--fail',
  na: 'dx-checklist-row--pass'
}

const TAB_STATUS_CLASS = {
  pass: 'dx-tab--check-pass',
  fail: 'dx-tab--check-fail',
  na: 'dx-tab--check-pass'
}

const CHECKLIST_FIELD_LABELS = {
  SES_DEVIATION: { expected: 'Reference', actual: 'Difference' },
  BANK_VENDOR_MASTER: { expected: 'Vendor Master account', actual: 'Invoice account' },
  TAX_INVOICE_MATCH: { expected: 'Commercial invoice', actual: 'Tax invoice (Faktur Pajak)' },
  RATE_VALIDATION: { expected: 'Contract unit rate (IDR/hr)', actual: 'Applied rate (amount ÷ hours)' },
  default: { expected: 'Reference', actual: 'Captured' }
}

const GENERIC_BANK_EXPECTED = /vendor master bank on file|bank on file/i

function formatBankAccountField(value, invoice) {
  if (value == null || value === '') return null
  const text = String(value).trim()
  if (!text || GENERIC_BANK_EXPECTED.test(text)) {
    return formatBankComparisonLine(resolveInvoiceBankDetails(invoice)) || text
  }
  const invoiceAccount = formatBankComparisonLine(resolveInvoiceBankDetails(invoice))
  if (invoiceAccount && text.replace(/\D/g, '') === normalizeBankAccountNumber(invoiceAccount)) {
    return invoiceAccount
  }
  const digits = normalizeBankAccountNumber(text)
  return digits || text
}

function resolveBankChecklistCompare(invoice, rule = {}) {
  const captured = resolveInvoiceBankDetails(invoice)
  const invoiceAccount = formatBankComparisonLine(captured)
  const expected = formatBankAccountField(rule.expected, invoice)
  const actual =
    invoiceAccount || formatBankAccountField(rule.actual, invoice) || formatBankComparisonLine(captured)

  return { expected, actual, captured, invoiceAccount }
}

function parseTaxChecklistLine(value) {
  const text = String(value || '').trim()
  if (!text) return { vendor: null, vat: null }
  const match = text.match(/^(.+?)\s·\s*VAT\s+(.+)$/i)
  if (!match) return { vendor: text, vat: null }
  return { vendor: match[1].trim(), vat: parseAmount(match[2]) }
}

function buildTaxChecklistLine(vendor, vatAmount) {
  const vendorLabel = vendor?.trim() || '—'
  const vatNum = parseAmount(vatAmount)
  const formatted =
    vatNum != null && vatNum > 0 ? formatIdrDisplay(vatNum) : formatIdrDisplay(vatAmount)
  return `${vendorLabel} · VAT ${formatted ?? '0'}`
}

function resolveResolvedInvoiceVat(invoice) {
  const invoiceTotals = resolveInvoiceExtractedTotals(invoice)
  const taxSection = resolveTaxInvoiceSectionData(invoice)
  const sectionVat = invoice?.validation_extraction?.sections?.A_invoice?.vatAmount
  const candidates = [
    invoiceTotals.vatAmount,
    taxSection.vatAmount,
    sectionVat,
    invoice?.vat_amount,
    invoice?.ocr_by_type?.invoice?.header?.taxAmount,
    invoice?.ocr_by_type?.invoice?.header?.vatAmount,
    invoice?.ocr_by_type?.tax_invoice?.header?.taxAmount,
    invoice?.ocr_by_type?.tax_invoice?.header?.vatAmount
  ]
  for (const candidate of candidates) {
    const parsed = parseAmount(candidate)
    if (parsed != null && parsed > 0) return parsed
  }
  return null
}

function resolveTaxChecklistCompare(invoice, rule = {}) {
  const commercial = resolveCommercialInvoiceSummary(invoice)
  const taxSection = resolveTaxInvoiceSectionData(invoice)
  const taxHdr = invoice?.ocr_by_type?.tax_invoice?.header || {}
  const invoiceVendor = commercial.vendor_name || invoice?.vendor_name
  const taxVendor = taxHdr.vendorName || taxHdr.company || invoiceVendor
  const resolvedVat = resolveResolvedInvoiceVat(invoice)

  const parsedExpected = parseTaxChecklistLine(rule.expected)
  const parsedActual = parseTaxChecklistLine(rule.actual)

  let expectedVendor = parsedExpected.vendor || invoiceVendor
  let actualVendor = parsedActual.vendor || taxVendor || invoiceVendor

  let expectedVat = parsedExpected.vat
  let actualVat = parsedActual.vat

  if (expectedVat == null || expectedVat === 0) {
    expectedVat = resolvedVat ?? null
  }
  if (actualVat == null || actualVat === 0) {
    actualVat =
      parseAmount(taxHdr.taxAmount) ??
      parseAmount(taxHdr.vatAmount) ??
      taxSection.vatAmount ??
      null
  }

  return {
    expected: buildTaxChecklistLine(expectedVendor, expectedVat),
    actual: buildTaxChecklistLine(actualVendor, actualVat),
    invoiceVat: resolvedVat ?? expectedVat ?? actualVat
  }
}

function resolveTaxChecklistDetails(rule, invoice, taxCompare) {
  if (!Array.isArray(rule.details) || !rule.details.length) return rule.details
  return rule.details
}


function resolveRateChecklistCompare(invoice, rule = {}) {
  const rows = normalizeRateValidationDetails(rule.details)
  if (!rows.length) {
    return { expected: rule.expected, actual: rule.actual }
  }

  // Lump-sum: all rows have no rate — use the pre-computed totals from computeRateValidationFromBundle
  const allLumpSum = rows.every((row) => row.appliedRate == null && row.poRate == null)
  if (allLumpSum) {
    return { expected: rule.expected || '—', actual: rule.actual || '—' }
  }

  // Hour-rate: dynamically build expected from all Regular rows with a known PO rate
  const expectedParts = []
  for (const row of rows) {
    if (!/regular/i.test(row.category || '')) continue
    if (row.poRate == null) continue
    const roleName = row.category.replace(/\s*regular\s*/i, '').trim()
    expectedParts.push(`${roleName} ${formatIdrPrefix(row.poRate)}/hr`)
  }

  const actualParts = rows.map((row) => {
    if (row.appliedRate == null) return `${row.category}: —`
    return `${row.category}: ${formatIdrPrefix(row.appliedRate)}/hr`
  })

  return {
    expected: expectedParts.length ? expectedParts.join(' · ') : rule.expected || '—',
    actual: actualParts.length ? actualParts.join(' · ') : rule.actual || '—'
  }
}

function formatRateValidationHours(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const n = Number(value)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function formatRateValidationRate(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return `${formatIdrPrefix(value)}/hr`
}

function formatRateValidationFailureDetail(row) {
  if (
    row.appliedRate != null &&
    row.poRate != null &&
    row.invoicedAmount != null &&
    row.hours != null
  ) {
    const diff = Math.round(row.appliedRate - row.poRate)
    const diffAbs = Math.abs(diff).toLocaleString('en-US')
    const diffLabel = diff === 0 ? '0' : `${diff > 0 ? '+' : '−'}${diffAbs}`

    return (
      <>
        <span className="dx-rate-validation-failure-rates">
          {formatIdrPrefix(row.appliedRate)}/hr applied vs {formatIdrPrefix(row.poRate)}/hr contract
        </span>
        <span className="dx-rate-validation-failure-formula">
          {formatIdrPrefix(row.invoicedAmount)} ÷ {formatRateValidationHours(row.hours)} hrs
        </span>
        <span className="dx-rate-validation-failure-diff">Variance {diffLabel}/hr</span>
      </>
    )
  }

  return <span className="dx-rate-validation-failure-rates">{row.issue || row.value || '—'}</span>
}

function RateValidationMessage({ message, rows = [], status }) {
  if (!message) return null

  if (status === 'pass') {
    return <p className="dx-checklist-message">{message}</p>
  }

  const failed = rows.filter((row) => row.status === 'FAIL')

  if (failed.length && rows.length) {
    return (
      <div className="dx-rate-validation-summary">
        <p className="dx-checklist-message dx-rate-validation-summary-lead">{message}</p>
        <ul className="dx-rate-validation-failures" aria-label="Rate validation failures">
          {failed.map((row) => (
            <li key={row.category} className="dx-rate-validation-failure">
              <span className="dx-rate-validation-failure-category">{row.category}</span>
              <div className="dx-rate-validation-failure-detail">{formatRateValidationFailureDetail(row)}</div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return <p className="dx-checklist-message">{message}</p>
}

function RateValidationTable({ rows = [] }) {
  if (!rows.length) return null

  const hasLumpSumRows = rows.some((row) => row.appliedRate == null && row.poRate == null)
  const hasRateRows = rows.some((row) => row.appliedRate != null || row.poRate != null)
  const isLumpSum = hasLumpSumRows && !hasRateRows

  return (
    <div className="dx-rate-validation-table-wrap">
      <p className="dx-rate-validation-intro">
        {isLumpSum ? (
          <>
            Each row compares the <strong>invoice claim amount</strong> against the{' '}
            <strong>manhour summary contract amount</strong> for that role (lump-sum contract — no
            hourly rate).
          </>
        ) : (
          <>
            Each row compares the <strong>applied rate</strong> — invoice claim amount (Direct Cost or
            Overtime per role) ÷ role hours from Summary Calculation Manhour (Actual Mhr for
            regular, OT Mon–Sat + OT Sun/PH for overtime) — against the{' '}
            <strong>contracted IDR/hr</strong> from the manhour summary unit-price note, PO appendix,
            or PO lines.
          </>
        )}
      </p>
      <table className="dx-rate-validation-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Invoiced amount (invoice)</th>
            {hasLumpSumRows && <th>Contract amount (manhour summary)</th>}
            {hasRateRows && <th>Hours (manhour summary)</th>}
            {hasRateRows && <th>Applied rate (amount ÷ hours)</th>}
            {hasRateRows && <th>SES rate</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isRowLumpSum = row.appliedRate == null && row.poRate == null
            const status =
              row.status === 'PASS' ? 'VALID' : row.status === 'FAIL' ? 'INVALID' : '—'
            const rowClass =
              row.status === 'PASS'
                ? 'dx-rate-validation-row--pass'
                : row.status === 'FAIL'
                  ? 'dx-rate-validation-row--fail'
                  : ''

            return (
              <tr key={`${row.category}-${index}`} className={rowClass}>
                <td>{row.category}</td>
                <td>{row.invoicedAmount != null ? formatIdrPrefix(row.invoicedAmount) : '—'}</td>
                {hasLumpSumRows && (
                  <td>
                    {isRowLumpSum && row.contractAmount != null
                      ? formatIdrPrefix(row.contractAmount)
                      : '—'}
                  </td>
                )}
                {hasRateRows && <td>{isRowLumpSum ? 'Lump sum' : formatRateValidationHours(row.hours)}</td>}
                {hasRateRows && <td>{formatRateValidationRate(row.appliedRate)}</td>}
                {hasRateRows && <td>{formatRateValidationRate(row.poRate)}</td>}
                <td>
                  <span className="dx-rate-validation-status">{status}</span>
                  {row.issue && row.status === 'FAIL' ? (
                    <span className="dx-rate-validation-issue">{row.issue}</span>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function NonPkpValidationTable({ details = [] }) {
  if (!details.length) return null

  const dateRow = (label, row) => {
    if (!row) return null
    const statusClass =
      row.status === 'PASS'
        ? 'dx-nonpkp-cell--pass'
        : row.status === 'FAIL'
          ? 'dx-nonpkp-cell--fail'
          : ''
    return (
      <tr key={label}>
        <td className="dx-nonpkp-label">{row.label}</td>
        <td className={`dx-nonpkp-value ${statusClass}`}>{row.value ?? '—'}</td>
        <td className={`dx-nonpkp-status ${statusClass}`}>
          {row.status === 'PASS' ? 'Valid' : row.status === 'FAIL' ? 'Invalid' : ''}
        </td>
      </tr>
    )
  }

  return (
    <div className="dx-nonpkp-table-wrap">
      <table className="dx-nonpkp-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {details.map((row, index) => dateRow(index, row))}
        </tbody>
      </table>
    </div>
  )
}

function resolveBankChecklistDetails(rule, invoice) {
  const { expected, actual, captured } = resolveBankChecklistCompare(invoice, rule)

  if (rule.details?.length) {
    const rows = rule.details.filter(
      (row) => row.label === 'Account number' || row.label === 'Bank account'
    )
    if (rows.length) return rows
  }

  const capturedAccount = formatBankComparisonLine(captured)
  if (!capturedAccount && !expected && !actual) return null

  const isPass =
    rule.status === 'pass' || rule.status === 'na' || rule.severity === 'PASS'

  if (isPass && expected && actual && normalizeBankAccountNumber(expected) === normalizeBankAccountNumber(actual)) {
    return buildBankValidationDetails(captured)
  }

  const rows = buildBankValidationDetails(captured)
  if (!rows.length && (expected || actual)) {
    return [
      {
        label: 'Account number',
        value: actual || expected,
        status: 'PASS'
      }
    ]
  }
  if (!rows.length) return null

  if (expected && actual && !bankAccountsMatch(expected, actual)) {
    return [
      ...rows,
      {
        label: 'Vendor Master account',
        value: expected,
        status: rule.status === 'fail' ? 'FAIL' : 'PASS'
      }
    ]
  }

  if (expected && actual && bankAccountsMatch(expected, actual)) {
    return rows
  }

  return rows
}

const DOC_COMPLETENESS_UPLOAD_TOOLTIP =
  'Upload or re-upload any missing documents required by this PO on the Upload Invoice page, then return here and re-run validation.'

const RULE_SCAN_SKIP_KEYS = new Set([
  'sequence',
  'ruleCode',
  'ruleName',
  'name',
  'title',
  'tabLabel',
  'description',
  'severity',
  'status',
  'message',
  'expected',
  'actual',
  'expectedValue',
  'actualValue',
  'expectedLabel',
  'actualLabel',
  'details',
  'fields',
  'comparisons',
  'variance',
  'sourceTable',
  'sourceRecordId'
])

function humanizeFieldLabel(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDetailRow(row) {
  if (!row || typeof row !== 'object') return null
  const label = row.label || row.name || row.fieldName || row.field || row.key
  const value =
    row.value ??
    row.fieldValue ??
    row.actual ??
    row.captured ??
    row.expected ??
    row.reference ??
    row.found
  if (!label) return null
  return {
    label: String(label),
    value: value != null && value !== '' ? String(value) : '—',
    status: row.status
  }
}

function collectFieldsFromRule(rule) {
  if (!Array.isArray(rule.fields)) return []
  return rule.fields.map(normalizeDetailRow).filter(Boolean)
}

function collectComparisonsFromRule(rule) {
  if (!Array.isArray(rule.comparisons)) return []

  return rule.comparisons
    .map((comparison) => {
      const label =
        comparison.label || comparison.field || comparison.name || comparison.fieldName || 'Comparison'
      const expected =
        comparison.expected ??
        comparison.reference ??
        comparison.po ??
        comparison.master ??
        comparison.source
      const actual =
        comparison.actual ??
        comparison.captured ??
        comparison.invoice ??
        comparison.found ??
        comparison.target

      if (expected == null && actual == null) return null

      const parts = [expected, actual].filter((value) => value != null && value !== '')
      return {
        label: String(label),
        value: parts.length ? parts.join(' → ') : '—',
        status: comparison.status
      }
    })
    .filter(Boolean)
}

function scanRuleObjectFields(rule) {
  const rows = []

  for (const [key, value] of Object.entries(rule)) {
    if (RULE_SCAN_SKIP_KEYS.has(key)) continue
    if (value == null || value === '') continue

    if (Array.isArray(value)) {
      for (const item of value) {
        const row = normalizeDetailRow(item)
        if (row) rows.push(row)
      }
      continue
    }

    if (typeof value === 'object') {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue == null || subValue === '') continue
        rows.push({
          label: `${humanizeFieldLabel(key)} · ${humanizeFieldLabel(subKey)}`,
          value: String(subValue)
        })
      }
      continue
    }

    rows.push({ label: humanizeFieldLabel(key), value: String(value) })
  }

  return rows
}

function resolveChecklistDetailRows(rule, specializedDetails) {
  if (specializedDetails?.length) return specializedDetails

  const fromFields = collectFieldsFromRule(rule)
  if (fromFields.length) return fromFields

  const fromComparisons = collectComparisonsFromRule(rule)
  if (fromComparisons.length) return fromComparisons

  return scanRuleObjectFields(rule)
}

function formatChecklistDetailValue(detail) {
  if (detail.label === 'VAT amount') return formatVatComparisonDisplay(detail.value)
  return detail.value
}

function ChecklistRow({ rule, panel = false, uploadHref, invoice = null }) {
  const isBankRule = rule.ruleCode === 'BANK_VENDOR_MASTER'
  const isTaxRule = rule.ruleCode === 'TAX_INVOICE_MATCH'
  const isRateRule = rule.ruleCode === 'RATE_VALIDATION'
  const isNonPkpRule = rule.ruleCode === 'NON_PKP_VENDOR'
  const rateBundle = isRateRule && invoice ? computeRateValidationFromBundle(invoice) : null
  const nonPkpBundle = isNonPkpRule && invoice ? computeNonPkpValidationFromBundle(invoice) : null
  const rateRule =
    isRateRule && rateBundle
      ? {
          ...rule,
          status: rateBundle.status,
          severity: rateBundle.severity,
          message: rateBundle.message,
          expected: rateBundle.expectedValue,
          actual: rateBundle.actualValue,
          details: rateBundle.details
        }
      : rule
  const nonPkpRule =
    isNonPkpRule && nonPkpBundle
      ? {
          ...rule,
          status: nonPkpBundle.status,
          severity: nonPkpBundle.severity,
          message: nonPkpBundle.message,
          expected: nonPkpBundle.expectedValue,
          actual: nonPkpBundle.actualValue,
          details: nonPkpBundle.details
        }
      : rule
  const bankCompare = isBankRule ? resolveBankChecklistCompare(invoice, rule) : null
  const taxCompare = isTaxRule ? resolveTaxChecklistCompare(invoice, rule) : null
  const effectiveStatus = isRateRule
    ? resolveRateValidationStatus(rateRule)
    : isNonPkpRule && nonPkpBundle
      ? nonPkpBundle.status
      : isBankRule && bankCompare?.expected && bankCompare?.actual
        ? bankAccountsMatch(bankCompare.expected, bankCompare.actual)
          ? 'pass'
          : rule.status
        : rule.status
  const rowClass = ROW_STATUS_CLASS[effectiveStatus] || ROW_STATUS_CLASS.fail
  const rateCompare = isRateRule ? resolveRateChecklistCompare(invoice, rateRule) : null
  const rateValidationRows = isRateRule ? normalizeRateValidationDetails(rateRule.details) : []
  const specializedDetails = isBankRule
    ? resolveBankChecklistDetails(rule, invoice)
    : isTaxRule
      ? resolveTaxChecklistDetails(rule, invoice, taxCompare)
      : rule.ruleCode === 'SES_DEVIATION'
        ? normalizeSesDeviationDetails(rule.details)
        : isRateRule
          ? null
          : isNonPkpRule && nonPkpBundle
            ? nonPkpBundle.details
            : rule.details
  const activeNonPkpRule = isNonPkpRule && nonPkpBundle ? nonPkpRule : rule
  const detailRows = resolveChecklistDetailRows(activeNonPkpRule, specializedDetails)
  const fieldLabels = {
    ...(CHECKLIST_FIELD_LABELS[rule.ruleCode] || CHECKLIST_FIELD_LABELS.default),
    ...(rule.expectedLabel ? { expected: rule.expectedLabel } : {}),
    ...(rule.actualLabel ? { actual: rule.actualLabel } : {})
  }
  const expectedDisplay = isBankRule
    ? bankCompare?.expected
    : rule.ruleCode === 'DOC_COMPLETENESS'
      ? formatDocCompletenessList(rule.expected)
      : isTaxRule
        ? formatChecklistVatField(taxCompare?.expected)
        : isRateRule
          ? rateCompare?.expected
          : isNonPkpRule && nonPkpBundle
            ? nonPkpBundle.expectedValue
            : rule.ruleCode === 'SES_DEVIATION'
              ? formatSesDeviationReference(rule.expected, specializedDetails)
              : rule.expected
  const actualDisplay = isBankRule
    ? bankCompare?.actual
    : rule.ruleCode === 'DOC_COMPLETENESS'
      ? formatDocCompletenessList(rule.actual)
      : isTaxRule
        ? formatChecklistVatField(taxCompare?.actual)
        : isRateRule
          ? rateCompare?.actual
          : isNonPkpRule && nonPkpBundle
            ? nonPkpBundle.actualValue
            : rule.actual
  const showUploadMissing =
    rule.ruleCode === 'DOC_COMPLETENESS' && rule.status === 'fail' && uploadHref

  return (
    <article
      className={`dx-checklist-row ${rowClass}${panel ? ' dx-checklist-row--panel' : ''}`}
      aria-label={rule.title}
    >
      <div className="dx-checklist-row-head">
        <span className="dx-checklist-seq">{rule.sequence}</span>
        <div className="dx-checklist-row-title-wrap">
          <h5 className="dx-checklist-row-title">{rule.title}</h5>
          <p className="dx-checklist-row-desc">{rule.description}</p>
        </div>
        <div className="dx-checklist-row-head-actions">
          {showUploadMissing && (
            <span
              className="dx-checklist-upload-tooltip"
              data-tooltip={DOC_COMPLETENESS_UPLOAD_TOOLTIP}
            >
              <Link to={uploadHref} className="dx-checklist-upload-link">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Upload missing documents"
                  title={DOC_COMPLETENESS_UPLOAD_TOOLTIP}
                >
                  <Upload size={13} /> Upload
                </Button>
              </Link>
            </span>
          )}
          <span className={`dx-checklist-pill dx-checklist-pill--${effectiveStatus}`}>
            {getChecklistStatusLabel(effectiveStatus)}
          </span>
        </div>
      </div>

      {(isRateRule ? rateRule.message : isNonPkpRule && nonPkpBundle ? nonPkpRule.message : rule.message) && (
        isRateRule ? (
          <RateValidationMessage
            message={rateRule.message}
            rows={rateValidationRows}
            status={effectiveStatus}
          />
        ) : (
          <p className="dx-checklist-message">{isNonPkpRule && nonPkpBundle ? nonPkpRule.message : rule.message}</p>
        )
      )}

      {!isNonPkpRule && (rateRule.expected != null || rateRule.actual != null || isRateRule) && (
        <div className="dx-checklist-compare">
          <div className="dx-checklist-field">
            <span className="dx-checklist-field-label">{fieldLabels.expected}</span>
            <span className="dx-checklist-field-value">{expectedDisplay ?? '—'}</span>
          </div>
          <div className="dx-checklist-field">
            <span className="dx-checklist-field-label">{fieldLabels.actual}</span>
            <span className="dx-checklist-field-value">{actualDisplay ?? '—'}</span>
          </div>
        </div>
      )}

      {rateValidationRows.length > 0 && (
        <RateValidationTable rows={rateValidationRows} />
      )}

      {isNonPkpRule && nonPkpBundle && !nonPkpBundle.isPkp && nonPkpBundle.details?.length > 0 && (
        <NonPkpValidationTable details={nonPkpBundle.details} />
      )}

      {isRateRule && rateValidationRows.length === 0 && rule.details?.length > 0 && (
        <ul className="dx-checklist-details">
          {rule.details.map((detail, index) => (
            <li
              key={`${detail.label || detail.category}-${index}`}
              className={
                detail.status
                  ? `dx-checklist-detail dx-checklist-detail--${String(detail.status).toLowerCase()}`
                  : 'dx-checklist-detail'
              }
            >
              <span className="dx-checklist-detail-label">{detail.label || detail.category}</span>
              <span className="dx-checklist-detail-value">{detail.issue || detail.value}</span>
            </li>
          ))}
        </ul>
      )}

      {!isRateRule && !isNonPkpRule && detailRows?.length > 0 && (
        <ul className="dx-checklist-details">
          {detailRows.map((detail, index) => (
            <li
              key={`${detail.label}-${index}`}
              className={
                detail.status
                  ? `dx-checklist-detail dx-checklist-detail--${detail.status.toLowerCase()}`
                  : 'dx-checklist-detail'
              }
            >
              <span className="dx-checklist-detail-label">{detail.label}</span>
              <span className="dx-checklist-detail-value">{formatChecklistDetailValue(detail)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function formatRuleFieldValue(rule, field) {
  const value = field === 'expected' ? rule.expected : rule.actual
  if (rule.ruleCode === 'DOC_COMPLETENESS') return formatDocCompletenessList(value)
  if (rule.ruleCode === 'TAX_INVOICE_MATCH') return formatChecklistVatField(value)
  if (rule.ruleCode === 'SES_DEVIATION' && field === 'expected') {
    return formatSesDeviationReference(value, rule.details)
  }
  return value
}

const DEMO_VENDOR_EMAIL_FALLBACK = 'ap@vendor.co.id'

const resolveVendorReportEmail = (invoice = {}) => {
  const direct = String(invoice.vendor_email || invoice.vendorEmail || '').trim()
  if (direct) return direct

  const vendorName = String(invoice.vendor_name || invoice.vendorName || '').trim()
  if (!vendorName) return DEMO_VENDOR_EMAIL_FALLBACK

  const slug = vendorName
    .replace(/^PT\s+/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

  return slug ? `ap@${slug}.co.id` : DEMO_VENDOR_EMAIL_FALLBACK
}

function resolvePrimaryDocumentId(invoice = {}) {
  const candidates = [
    invoice.documentId,
    invoice.document_id,
    invoice.primaryDocumentId,
    invoice.ocr?.documentId,
    invoice.validation?.documentId,
    String(invoice.id || '').startsWith('ocr-')
      ? String(invoice.id).replace(/^ocr-/, '')
      : null
  ]
  for (const value of candidates) {
    const n = Number(value)
    if (Number.isInteger(n) && n > 0) return n
  }
  return null
}

function buildDocReqItemsFromChecklist(checklist = []) {
  const completeness = checklist.find(
    (rule) => rule.ruleCode === 'DOC_COMPLETENESS' && rule.status === 'fail'
  )
  const items = []
  if (completeness) {
    const expected = String(completeness.expected || completeness.expectedValue || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const actual = new Set(
      String(completeness.actual || completeness.actualValue || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    )
    for (const label of expected) {
      const typeCode = defaultCategoryId(label)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
      if (!typeCode) continue
      const present = [...actual].some(
        (a) =>
          a === label.toLowerCase() ||
          a.replace(/[^a-z0-9]+/g, '_') === typeCode.toLowerCase()
      )
      if (!present) {
        items.push({ documentType: typeCode, reason: 'MISSING' })
      }
    }
  }

  // If completeness passed but other rules failed, ask for invoice + tax invoice replacement
  if (!items.length) {
    const failed = checklist.filter((rule) => rule.status === 'fail')
    if (failed.some((r) => /VAT|TAX|FAKTUR|NON_PKP/i.test(String(r.ruleCode || '')))) {
      items.push({ documentType: 'FAKTUR_PAJAK', reason: 'REPLACEMENT' })
    }
    if (failed.some((r) => /PO_|VENDOR|BANK|AMOUNT|INVOICE/i.test(String(r.ruleCode || '')))) {
      items.push({ documentType: 'INVOICE', reason: 'REPLACEMENT' })
    }
  }

  if (!items.length) {
    items.push({ documentType: 'INVOICE', reason: 'REPLACEMENT' })
  }

  // Dedupe by document type
  const seen = new Set()
  return items.filter((item) => {
    const key = item.documentType
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildVendorReportExtraBody(invoice = {}, checklist = [], validation = {}) {
  const failed = checklist.filter((rule) => rule.status === 'fail')
  const invoiceNo = invoice.invoice_no || '—'
  const vendorName = invoice.vendor_name || 'Vendor'
  const poNumber = validation.po_number || invoice.po_number

  const issueLines = failed.flatMap((rule, index) => {
    const lines = [
      `${index + 1}. ${rule.title}`,
      `   ${rule.message || rule.description}`
    ]
    if (rule.expected || rule.actual) {
      lines.push(`   Expected: ${formatRuleFieldValue(rule, 'expected') || '—'}`)
      lines.push(`   Found: ${formatRuleFieldValue(rule, 'actual') || '—'}`)
    }
    if (rule.details?.length) {
      rule.details.forEach((detail) => {
        const detailValue =
          detail.label === 'VAT amount'
            ? formatVatComparisonDisplay(detail.value)
            : detail.value
        lines.push(`   - ${detail.label}: ${detailValue}`)
      })
    } else {
      const extraRows = resolveChecklistDetailRows(rule, null) || []
      extraRows.forEach((detail) => {
        lines.push(`   - ${detail.label}: ${formatChecklistDetailValue(detail)}`)
      })
    }
    lines.push('')
    return lines
  })

  return [
    `Additional validation notes for invoice ${invoiceNo}${poNumber ? ` (PO ${poNumber})` : ''}:`,
    '',
    ...issueLines
  ].join('\n')
}

function buildVendorReportEmail(invoice = {}, checklist = [], validation = {}) {
  // Fallback local draft before / while API creates the DOCREQ subject
  const invoiceNo = invoice.invoice_no || '—'
  const vendorName = invoice.vendor_name || 'Vendor'
  const extra = buildVendorReportExtraBody(invoice, checklist, validation)
  return {
    to: resolveVendorReportEmail(invoice),
    subject: `[EAPA][DOCREQ][INV:…][REQ:…] ${vendorName} - ${invoiceNo}`,
    body: [
      `Dear ${vendorName},`,
      '',
      'IMPORTANT — Do not change the subject line of this email.',
      'Please use Reply (not a new message) and keep the subject exactly as it is.',
      'A "RE:" prefix added by your mail system is fine. If the subject is edited, we cannot match this reply to your invoice.',
      '',
      extra,
      '',
      'Regards,',
      'Accounts Payable Team',
      'ESSA'
    ].join('\n'),
    subjectLocked: true
  }
}

function VendorReportDialog({
  open,
  onClose,
  draft,
  onDraftChange,
  loading = false,
  sending = false,
  canSend = false,
  onSend
}) {
  const handleCopy = async () => {
    const text = [`To: ${draft.to || '(add vendor email)'}`, `Subject: ${draft.subject}`, '', draft.body].join(
      '\n'
    )
    try {
      await navigator.clipboard.writeText(text)
      showEssaSuccessToast('Copied to clipboard', 'Email draft is ready to paste into your mail client.')
    } catch {
      showEssaSuccessToast('Copy failed', 'Select the message body and copy manually.')
    }
  }

  const handleSend = async () => {
    if (typeof onSend !== 'function') return
    await onSend()
  }

  const sendDisabled =
    loading || sending || !canSend || !draft.subject || !String(draft.to || '').trim()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Report to vendor"
      description="Subject uses [DOCREQ] correlation tokens and cannot be edited. Ask the vendor to Reply without changing it."
      width={680}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleCopy} disabled={loading || sending}>
            <Copy size={14} /> Copy draft
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={sendDisabled}>
            <Send size={14} /> {sending ? 'Sending…' : 'Send email'}
          </Button>
        </>
      }
    >
      <div className="dx-vendor-email-compose">
        {loading && (
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
            Creating document request and locking [DOCREQ] subject…
          </p>
        )}
        <div className="dx-field">
          <label className="dx-label" htmlFor="vendor-report-to">
            To
          </label>
          <input
            id="vendor-report-to"
            className="dx-input"
            type="email"
            placeholder={DEMO_VENDOR_EMAIL_FALLBACK}
            value={draft.to}
            onChange={(e) => onDraftChange({ ...draft, to: e.target.value })}
            disabled={sending}
          />
        </div>
        <div className="dx-field">
          <label className="dx-label" htmlFor="vendor-report-subject">
            Subject (locked)
          </label>
          <input
            id="vendor-report-subject"
            className="dx-input"
            value={draft.subject}
            readOnly
            aria-readonly="true"
          />
        </div>
        <div className="dx-field">
          <label className="dx-label" htmlFor="vendor-report-body">
            Message
          </label>
          <Textarea
            id="vendor-report-body"
            rows={14}
            className="dx-vendor-email-body"
            value={draft.body}
            onChange={(e) => onDraftChange({ ...draft, body: e.target.value })}
            disabled={sending}
          />
        </div>
      </div>
    </Dialog>
  )
}

function CommercialFooter({ validation }) {
  const ld = validation?.ld_amount ?? 0
  const advance = validation?.advance_recovery ?? 0
  const retention = validation?.retention_held ?? 0
  const net = validation?.net_payable

  if (!ld && !advance && !retention && net == null) return null

  return (
    <div className="dx-checklist-commercial">
      <div className="dx-checklist-commercial-title">Commercial impact</div>
      <div className="dx-checklist-commercial-grid">
        {validation?.ld_pct > 0 && <span>LD: {validation.ld_pct}% (− applicable)</span>}
        {ld > 0 && <span>Late delivery deduction: applied</span>}
        {advance > 0 && <span>Advance recovery: deducted</span>}
        {retention > 0 && <span>Retention held: applied</span>}
        {net != null && (
          <span className="dx-checklist-net">Net payable: {formatIdrPrefix(net)}</span>
        )}
      </div>
    </div>
  )
}

export function PoValidationPanel({
  checks = [],
  validation = {},
  invoice = null,
  onRevalidate,
  revalidating = false,
  uploadHref = null,
  variant = 'po'
}) {
  const mergeChecklist =
    variant === 'nonPo' ? mergeNonPoValidationChecklist : mergeValidationChecklist
  const validationContext = useMemo(
    () => ({
      ...validation,
      demoScenario: resolveDemoScenario(invoice || {}),
      batch_document_types: invoice?.batch_document_types,
      ocr_by_type: invoice?.ocr_by_type
    }),
    [validation, invoice]
  )
  const augmentedChecks = useMemo(() => {
    if (variant === 'nonPo') return checks
    return augmentBankValidationCheck(
      augmentPoValueValidationCheck(augmentRateValidationCheck(checks, invoice), invoice),
      invoice
    )
  }, [checks, invoice, variant])
  const checklist = mergeChecklist(augmentedChecks, validationContext)
  const hasResults = variant === 'nonPo' || checks.length > 0
  const { passed: checklistPassed, total: checklistTotal } =
    getChecklistPassSummaryFromMerged(checklist)
  const failedCount = checklistTotal - checklistPassed
  const overallStatus = getChecklistOverallStatusFromMerged(checklist)
  const overallBadgeLabel =
    formatChecklistPassBadgeText(checklistPassed, checklistTotal) || overallStatus
  const poNumber = validation?.po_number
  const sesNo = validation?.ses_no

  const [activeTab, setActiveTab] = useState(() => getDefaultChecklistTab(checklist))
  const [reportOpen, setReportOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [reportDraft, setReportDraft] = useState({ to: '', subject: '', body: '' })
  const [openRequestInfo, setOpenRequestInfo] = useState(null)

  const defaultReportDraft = useMemo(
    () => buildVendorReportEmail(invoice || {}, checklist, validation),
    [invoice, checklist, validation]
  )

  useEffect(() => {
    if (!checklist.some((rule) => rule.ruleCode === activeTab)) {
      setActiveTab(getDefaultChecklistTab(checklist))
    }
  }, [checklist, activeTab])

  const openVendorReport = async () => {
    const fallback = defaultReportDraft
    setReportDraft(fallback)
    setReportOpen(true)
    setReportLoading(true)
    setOpenRequestInfo(null)

    const primaryDocumentId = resolvePrimaryDocumentId(invoice || {})
    if (!primaryDocumentId) {
      setReportLoading(false)
      showEssaErrorToast(
        'Cannot create document request',
        'This invoice has no EAPA document id yet. Save/extract the invoice first.'
      )
      return
    }

    try {
      const items = buildDocReqItemsFromChecklist(checklist)
      const result = await createDocumentRequest({
        primaryDocumentId,
        items,
        vendorEmail: fallback.to,
        vendorName: invoice?.vendor_name || null,
        invoiceNumber: invoice?.invoice_no || null,
        extraBody: buildVendorReportExtraBody(invoice || {}, checklist, validation)
      })
      setReportDraft({
        to: result?.to || fallback.to,
        subject: result?.subject || fallback.subject,
        body: result?.body || fallback.body,
        subjectLocked: true
      })
      setOpenRequestInfo({
        requestId: result?.requestId,
        requestCode: result?.requestCode,
        status: result?.status,
        items: result?.items || []
      })
    } catch (error) {
      showEssaErrorToast(
        'Document request failed',
        error?.response?.data?.message ||
          error?.message ||
          'Could not create the [DOCREQ] subject. You can still edit the message body.'
      )
    } finally {
      setReportLoading(false)
    }
  }

  const sendVendorReport = async () => {
    const requestId = Number(openRequestInfo?.requestId)
    if (!Number.isInteger(requestId) || requestId <= 0) {
      showEssaErrorToast(
        'Cannot send email',
        'Create the document request first so the [DOCREQ] subject is locked.'
      )
      return
    }
    const to = String(reportDraft.to || '').trim()
    if (!to) {
      showEssaErrorToast('Cannot send email', 'Enter a vendor email address in To.')
      return
    }

    setReportSending(true)
    try {
      const result = await sendDocumentRequestEmail(requestId, {
        to,
        body: reportDraft.body
      })
      showEssaSuccessToast(
        'Email sent',
        result?.previewUrl
          ? `Sent to ${result.to}. Preview: ${result.previewUrl}`
          : `Document request emailed to ${result?.to || to}.`
      )
      setReportOpen(false)
    } catch (error) {
      showEssaErrorToast(
        'Send failed',
        error?.response?.data?.message ||
          error?.message ||
          'Could not send the email to the vendor.'
      )
    } finally {
      setReportSending(false)
    }
  }

  const validationTabs = checklist.map((rule) => {
    const tabStatus =
      rule.ruleCode === 'RATE_VALIDATION'
        ? resolveRateValidationStatus(rule)
        : rule.ruleCode === 'BANK_VENDOR_MASTER'
          ? resolveBankValidationStatus(rule)
          : rule.status
    return {
      value: rule.ruleCode,
      label: `${rule.sequence}. ${rule.tabLabel || rule.title}`,
      title: rule.title,
      tabClassName: TAB_STATUS_CLASS[tabStatus] || TAB_STATUS_CLASS.fail
    }
  })

  const activeRule =
    checklist.find((rule) => rule.ruleCode === activeTab) || checklist[0]

  return (
    <section className="dx-val-section dx-po-validation dx-validation-checklist">
      <div className="dx-po-validation-toolbar">
        <div className="dx-po-validation-meta">
          {overallStatus && (
            <Badge tone={OVERALL_TONE[overallStatus] || 'neutral'} dot={false}>
              {overallBadgeLabel}
            </Badge>
          )}
          {poNumber && <span className="dx-po-meta-chip">PO {poNumber}</span>}
          {sesNo && <span className="dx-po-meta-chip dx-po-meta-chip--ok">SES {sesNo}</span>}
        </div>

        <div className="dx-po-validation-actions">
          {failedCount > 0 && (
            <Button size="sm" variant="ghost" onClick={openVendorReport}>
              <Mail size={13} /> Report to vendor
            </Button>
          )}
        </div>
      </div>

      {openRequestInfo?.requestCode && (
        <div className="dx-po-meta-chip" style={{ marginBottom: 8 }}>
          Open doc request {openRequestInfo.requestCode}
          {openRequestInfo.status ? ` · ${openRequestInfo.status}` : ''}
        </div>
      )}

      <VendorReportDialog
        open={reportOpen}
        onClose={() => !reportSending && setReportOpen(false)}
        draft={reportDraft}
        onDraftChange={setReportDraft}
        loading={reportLoading}
        sending={reportSending}
        canSend={Boolean(openRequestInfo?.requestId)}
        onSend={sendVendorReport}
      />

      {!hasResults ? (
        <div className="dx-po-validation-empty">
          <ShieldAlert size={28} strokeWidth={1.5} />
          <p>No validation has been run for this invoice yet.</p>
          {onRevalidate && (
            <Button size="sm" variant="primary" onClick={onRevalidate} disabled={revalidating}>
              {revalidating ? 'Re-validating…' : 'Re-validate'}
            </Button>
          )}
        </div>
      ) : (
        <div className="dx-po-validation-body dx-checklist-body">
          <div className="dx-validation-tabs-wrap">
            <Tabs
              className="dx-validation-tabs"
              tabs={validationTabs}
              value={activeTab}
              onChange={setActiveTab}
            />
            {activeRule && (
              <ChecklistRow
                key={activeRule.ruleCode}
                rule={activeRule}
                panel
                uploadHref={uploadHref}
                invoice={invoice}
              />
            )}
          </div>
          <CommercialFooter validation={validation} />
        </div>
      )}
    </section>
  )
}
