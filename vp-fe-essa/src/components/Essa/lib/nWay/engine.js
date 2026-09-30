/**
 * N-way validation engine (client side).
 *
 * Status meanings:
 *   pass       – every required comparison matched
 *   fail       – a value differs, or a required vendor document is missing
 *   incomplete – a document is present but the value was not captured (check extraction)
 *   pending    – depends on a source not yet available to the portal (Coretax,
 *                invoice history, vendor-master fields…) or a server-side calculation
 *   na         – not applicable to this invoice
 *
 * Evaluates the configured match rules for one invoice using:
 *   - extracted document sections (Invoice, Faktur Pajak, BAST, SES, …)
 *   - raw OCR payloads by document type (inv.ocr_by_type)
 *   - system values already resolved by the 12-point server validation
 *     (PO master vendor, vendor-master bank account, SES amount, …)
 *
 * Output shape (also the contract for a future server-side evaluator —
 * if `validation.nWay` is returned by the API it is used as-is):
 *   { categoryCode, results: [NWayResult], summary: { pass, fail, incomplete, na, total } }
 *
 * NWayResult:
 *   { rule, status: 'pass'|'fail'|'incomplete'|'pending'|'na', headline, sources: [SourceValue],
 *     comparisons: [Comparison], evaluatedBy, linkedCheck }
 */
import {
  CATEGORY_BY_CODE,
  COMMON,
  DATA_POINTS,
  SOURCE_BY_CODE,
  categoryForInvoiceType,
  sourceLabel
} from './catalog'

/* ── Normalisation ────────────────────────────────────────────────────── */

const LEGAL_SUFFIX = /\b(pt|cv|tbk|persero|ltd|limited|inc|co|corp|llc|sdn|bhd|pte)\b\.?/g

export const normKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

export const parseAmount = (value) => {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  let s = String(value).replace(/[^0-9.,-]/g, '')
  if (!s || !/\d/.test(s)) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    // decimal separator is whichever comes last
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1
    s = decimals === 3 || (s.match(/,/g) || []).length > 1 ? s.replace(/,/g, '') : s.replace(',', '.')
  } else if (lastDot > -1) {
    const decimals = s.length - lastDot - 1
    if (decimals === 3 || (s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, agu: 8, agt: 8, sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12 }

export const parseDate = (value) => {
  if (!value) return null
  const s = String(value).trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  m = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,})[\s-]+(\d{4})/)
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()]
    if (mon) return `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return null
}

export const normName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(LEGAL_SUFFIX, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normId = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

const tokens = (value) =>
  normName(value)
    .split(' ')
    .filter((w) => w.length > 1)

/** Overlap coefficient on word tokens, 0–100. */
export const similarity = (a, b) => {
  const ta = new Set(tokens(a))
  const tb = new Set(tokens(b))
  if (!ta.size || !tb.size) return 0
  let common = 0
  ta.forEach((w) => {
    if (tb.has(w)) common += 1
  })
  return Math.round((common / Math.min(ta.size, tb.size)) * 100)
}

const isBlank = (value) =>
  value == null || (typeof value === 'string' && (!value.trim() || value.trim() === '—'))

const displayValue = (value) => {
  if (isBlank(value)) return null
  if (typeof value === 'object') {
    if (value.value != null) return displayValue(value.value)
    return null
  }
  return String(value)
}

/* ── Value resolution ─────────────────────────────────────────────────── */

const findFieldValue = (fields = [], dataKey) => {
  const dp = DATA_POINTS[dataKey]
  if (!dp) return null
  const keys = new Set(dp.keys)
  const byKey = fields.find((f) => keys.has(normKey(f.fieldKey || f.key)) && !isBlank(displayValue(f.value)))
  if (byKey) return { value: displayValue(byKey.value), fieldLabel: byKey.label || byKey.fieldKey }
  const byPattern = fields.find((f) => {
    const hay = `${String(f.fieldKey || f.key || '').toLowerCase()} ${String(f.label || '').toLowerCase()}`
    return dp.match.test(hay) && !isBlank(displayValue(f.value))
  })
  return byPattern ? { value: displayValue(byPattern.value), fieldLabel: byPattern.label || byPattern.fieldKey } : null
}

const objectToFields = (obj) =>
  Object.entries(obj || {})
    .filter(([, v]) => v == null || typeof v !== 'object' || v.value != null)
    .map(([k, v]) => ({ fieldKey: k, label: k, value: v }))

const lookupOcr = (ocrByType = {}, types = []) => {
  const wanted = new Set(types.map((t) => normKey(t)))
  const hit = Object.entries(ocrByType || {}).find(([k]) => wanted.has(normKey(k)))
  return hit ? hit[1] : null
}

const checkByCode = (checklist = [], code) =>
  code ? checklist.find((c) => c && c.ruleCode === code) || null : null

const firstDigits = (s) => {
  const m = String(s || '').match(/\d{6,}/)
  return m ? m[0] : null
}

/**
 * Resolve { present, connected, value, fieldLabel, origin } for a source/data point.
 * present   – the document/system is available for this invoice
 * connected – false when the source is not integrated yet (Coretax, history, …)
 */
export const resolveSourceValue = (sourceCode, dataKey, ctx) => {
  const src = SOURCE_BY_CODE[sourceCode]
  const { inv = {}, sections = [], checklist = [] } = ctx
  if (!src) return { present: false, connected: false, value: null }

  // 1. Extracted document section
  const section = sections.find(
    (s) =>
      src.sectionKeys.includes(s.key) ||
      (s.ocrDocumentType && src.ocrTypes.map(normKey).includes(normKey(s.ocrDocumentType)))
  )
  let fromDoc = section ? findFieldValue(section.fields || [], dataKey) : null

  // 2. Raw OCR payload for the document type
  const ocr = lookupOcr(inv.ocr_by_type, src.ocrTypes)
  if (!fromDoc && ocr) fromDoc = findFieldValue(objectToFields(ocr.header || ocr.fields || ocr), dataKey)

  const docPresent = Boolean(section || ocr)

  if (sourceCode === 'INVOICE') {
    const header = inv.ocr?.header || {}
    if (!fromDoc) fromDoc = findFieldValue(objectToFields(header), dataKey)
    if (!fromDoc) {
      const direct = {
        vendor_name: inv.vendor_name,
        invoice_number: inv.invoice_no || inv.invoice_number,
        invoice_date: inv.invoice_date,
        po_number: inv.po_number,
        invoice_amount: inv.total_amount ?? inv.amount ?? inv.gross_amount,
        currency: inv.currency,
        bank_account: inv.bank_account || header.bankAccountNumber
      }[dataKey]
      if (!isBlank(direct)) fromDoc = { value: String(direct), fieldLabel: 'Invoice header' }
    }
    return { present: true, connected: true, value: fromDoc?.value ?? null, fieldLabel: fromDoc?.fieldLabel, origin: 'Invoice' }
  }

  if (sourceCode === 'PO') {
    const poCheck = checkByCode(checklist, 'PO_NUMBER_MASTER')
    const vendorCheck = checkByCode(checklist, 'VENDOR_PO_INVOICE')
    const poFound = poCheck
      ? poCheck.status === 'pass' || (/open|found/i.test(String(poCheck.expected || '')) && !/not found/i.test(String(poCheck.actual || '')))
      : false
    let value = fromDoc?.value ?? null
    let fieldLabel = fromDoc?.fieldLabel
    if (value == null) {
      if (dataKey === 'vendor_name' && vendorCheck?.expected) {
        value = String(vendorCheck.expected)
        fieldLabel = 'PO master · vendor'
      } else if (dataKey === 'po_number' && poCheck) {
        value = poFound ? firstDigits(poCheck.actual) || firstDigits(poCheck.expected) : null
        fieldLabel = 'PO master'
      }
    }
    const exposed = docPresent || (dataKey === 'vendor_name' && Boolean(vendorCheck?.expected)) || (dataKey === 'po_number' && Boolean(poCheck))
    return { present: docPresent || poFound || Boolean(vendorCheck?.expected), connected: exposed, value, fieldLabel, origin: 'SAP · PO master' }
  }

  if (sourceCode === 'VENDOR_MASTER') {
    const bank = checkByCode(checklist, 'BANK_VENDOR_MASTER')
    let value = null
    let fieldLabel
    if (dataKey === 'bank_account' && bank?.expected) {
      value = String(bank.expected)
      fieldLabel = 'LFBK · bank account'
    }
    return { present: Boolean(bank), connected: dataKey === 'bank_account' && Boolean(bank), value, fieldLabel, origin: 'SAP · vendor master' }
  }

  if (sourceCode === 'GRN_SES') {
    const ses = checkByCode(checklist, 'SES_DEVIATION')
    let value = fromDoc?.value ?? null
    let fieldLabel = fromDoc?.fieldLabel
    if (value == null && dataKey === 'invoice_amount' && ses?.expected) {
      const amt = parseAmount(ses.expected)
      if (amt != null) {
        value = String(ses.expected)
        fieldLabel = 'SES total'
      }
    }
    return { present: docPresent || Boolean(ses && ses.status !== 'na'), connected: docPresent || value != null, value, fieldLabel, origin: 'SAP · GR/IR' }
  }

  if (['INVOICE_HISTORY', 'CORETAX', 'DOA_APPROVAL', 'HCIS'].includes(sourceCode) && !docPresent) {
    return { present: false, connected: false, value: null, origin: sourceLabel(sourceCode) }
  }

  return { present: docPresent, connected: true, value: fromDoc?.value ?? null, fieldLabel: fromDoc?.fieldLabel, origin: sourceLabel(sourceCode) }
}

/* ── Comparison ───────────────────────────────────────────────────────── */

/**
 * @returns { status: 'match'|'mismatch'|'not_found', detail }
 */
export const compareValues = (a, b, { ruleType, kind, criteria = {}, requirement }) => {
  if (isBlank(a) || isBlank(b)) return { status: 'not_found', detail: 'Value not captured' }

  if (ruleType === 'LOGICAL') {
    const score = similarity(a, b)
    const threshold = Number(criteria.similarity) || 65
    return { status: score >= threshold ? 'match' : 'mismatch', detail: `${score}% similar (needs ${threshold}%)` }
  }

  if (ruleType === 'TOLERANCE' || kind === 'number') {
    const na = parseAmount(a)
    const nb = parseAmount(b)
    if (na == null || nb == null) {
      return normName(a) === normName(b) ? { status: 'match', detail: 'Same value' } : { status: 'mismatch', detail: 'Different value' }
    }
    const diff = Math.abs(na - nb)
    if (ruleType === 'TOLERANCE') {
      const pct = Number(criteria.tolerancePct) || 0
      const amt = Number(criteria.toleranceAmount) || 0
      // % measured on the target (compared) value by default, or on the anchor
      const base = Math.abs(criteria.measuredOn === 'SOURCE' ? na : nb) || Math.max(Math.abs(na), Math.abs(nb)) || 1
      const pctOk = pct > 0 ? (diff / base) * 100 <= pct : diff === 0
      const amtOk = amt > 0 ? diff <= amt : diff === 0
      const combine = { EITHER: 'HIGHER', BOTH: 'LOWER' }[criteria.combine] || criteria.combine || 'HIGHER'
      let ok
      if (combine === 'PCT') ok = pctOk
      else if (combine === 'AMOUNT') ok = amtOk
      else if (combine === 'LOWER') ok = pct > 0 && amt > 0 ? pctOk && amtOk : pctOk || amtOk
      else ok = pctOk || amtOk
      const pctDiff = ((diff / base) * 100).toFixed(2)
      return { status: ok ? 'match' : 'mismatch', detail: diff === 0 ? 'Same value' : `Differs by ${pctDiff}%` }
    }
    return diff < 0.005 ? { status: 'match', detail: 'Same value' } : { status: 'mismatch', detail: `Differs by ${diff.toLocaleString('en-US', { maximumFractionDigits: 2 })}` }
  }

  if (kind === 'date') {
    const da = parseDate(a)
    const db = parseDate(b)
    if (da && db) return da === db ? { status: 'match', detail: 'Same date' } : { status: 'mismatch', detail: 'Different date' }
  }

  let x
  let y
  if (kind === 'id') {
    x = normId(a)
    y = normId(b)
  } else {
    x = normName(a)
    y = normName(b)
  }
  if (x === y) return { status: 'match', detail: 'Same value' }
  if (requirement === 'PARTIAL' && x && y && (x.includes(y) || y.includes(x))) {
    return { status: 'match', detail: 'Partial match' }
  }
  return { status: 'mismatch', detail: 'Different value' }
}

/* ── Rule applicability ───────────────────────────────────────────────── */

export const ruleAppliesToCategory = (rule, categoryCode) => {
  if (!rule || rule.status === 'INACTIVE') return false
  if (categoryCode && (rule.disabledCategories || []).includes(categoryCode)) return false
  if (rule.scope === 'COMMON' || !rule.scope) return true
  return Boolean(categoryCode) && (rule.categories || []).includes(categoryCode)
}

export const rulesForCategory = (rules = [], categoryCode) =>
  rules.filter((r) => ruleAppliesToCategory(r, categoryCode === COMMON ? null : categoryCode))

/* ── Rule evaluation ──────────────────────────────────────────────────── */

const SELF_EVALUATED = new Set(['EXACT', 'LOGICAL', 'TOLERANCE'])

const pairsFor = (rule) => {
  const targets = (rule.targets || []).filter((t) => t.requirement !== 'EXTRACT')
  if (rule.compareMode === 'STEPWISE') {
    const chain = [{ doc: rule.source, requirement: 'REQUIRED' }, ...targets]
    return chain.slice(1).map((to, i) => ({ from: chain[i].doc, to: to.doc, requirement: to.requirement || 'REQUIRED' }))
  }
  return targets.map((to) => ({ from: rule.source, to: to.doc, requirement: to.requirement || 'REQUIRED' }))
}

const worst = (statuses) => {
  if (statuses.includes('fail')) return 'fail'
  if (statuses.includes('incomplete')) return 'incomplete'
  if (statuses.includes('pending')) return 'pending'
  if (statuses.includes('pass')) return 'pass'
  return 'na'
}

export const evaluateRule = (rule, ctx) => {
  const dp = DATA_POINTS[rule.dataKey] || { kind: 'text', label: rule.dataPoint }
  const linked = checkByCode(ctx.checklist, rule.linkedCheck)

  const docs = [rule.source, ...(rule.targets || []).map((t) => t.doc)]
  const valueCache = {}
  const valueOf = (code) => {
    if (!valueCache[code]) valueCache[code] = resolveSourceValue(code, rule.dataKey, ctx)
    return valueCache[code]
  }

  const reqOf = (code) =>
    code === rule.source ? 'SOURCE' : (rule.targets || []).find((t) => t.doc === code)?.requirement || 'REQUIRED'

  const sources = docs.map((code) => {
    const v = valueOf(code)
    return {
      code,
      label: sourceLabel(code),
      role: code === rule.source ? 'SOURCE' : reqOf(code),
      present: v.present,
      connected: v.connected,
      value: v.value,
      fieldLabel: v.fieldLabel || null,
      origin: v.origin || null,
      field: code === rule.source ? rule.sourceField || '' : (rule.targets || []).find((t) => t.doc === code)?.field || ''
    }
  })

  const src = valueOf(rule.source)
  const srcMeta = SOURCE_BY_CODE[rule.source]

  // Availability-only rule: the source document just has to be in the package
  if (rule.ruleType === 'AVAILABILITY') {
    const ok = Boolean(src.present)
    return {
      rule,
      status: ok ? 'pass' : rule.mandatory === false ? 'na' : 'fail',
      headline: ok ? `${sourceLabel(rule.source)} is in the invoice package` : `${sourceLabel(rule.source)} missing from the invoice package`,
      sources,
      comparisons: [],
      evaluatedBy: 'n-way',
      linkedCheck: null
    }
  }

  // Not applicable: conditional on the source document being present
  if (rule.runCondition?.type === 'DOC_PRESENT' && !src.present) {
    return { rule, status: 'na', headline: `${sourceLabel(rule.source)} not in this invoice`, sources, comparisons: [], evaluatedBy: 'n-way', linkedCheck: null }
  }

  // Linked 12-point check marked not applicable → the rule is too
  if (linked && linked.status === 'na') {
    return { rule, status: 'na', headline: linked.message || 'Not applicable for this invoice', sources, comparisons: [], evaluatedBy: 'checklist', linkedCheck: linked }
  }

  const comparisons = []
  const clientSide = SELF_EVALUATED.has(rule.ruleType) && !rule.serverSide
  if (clientSide) {
    pairsFor(rule).forEach(({ from, to, requirement }) => {
      const a = valueOf(from)
      const b = valueOf(to)
      let status
      let detail
      if (!b.connected) {
        status = 'unavailable'
        detail = b.present
          ? `${dp.label || rule.dataPoint} from ${sourceLabel(to)} is not available to the portal yet`
          : `${sourceLabel(to)} is not connected yet`
      } else if (!b.present) {
        if (requirement === 'IF_PRESENT') {
          status = 'skipped'
          detail = 'Not in this invoice — optional'
        } else {
          const vendorDoc = SOURCE_BY_CODE[to]?.channel === 'VENDOR_PDF'
          status = vendorDoc ? 'missing' : 'unavailable'
          detail = vendorDoc ? `${sourceLabel(to)} missing from the bundle` : `${sourceLabel(to)} has no data for this invoice`
        }
      } else if (!a.present && from !== 'INVOICE') {
        status = 'unavailable'
        detail = `${sourceLabel(from)} not in this invoice`
      } else {
        const res = compareValues(a.value, b.value, { ruleType: rule.ruleType, kind: dp.kind, criteria: rule.criteria || {}, requirement })
        status = res.status
        detail = res.detail
      }
      comparisons.push({ from, to, requirement, fromValue: a.value, toValue: b.value, status, detail })
    })
  }

  // Own verdict from comparisons
  let own = 'incomplete'
  let headline = ''
  if (comparisons.length) {
    const hard = comparisons.filter((c) => c.requirement !== 'IF_PRESENT' || c.status === 'mismatch')
    if (comparisons.some((c) => c.status === 'mismatch')) {
      own = 'fail'
      const bad = comparisons.find((c) => c.status === 'mismatch')
      headline = `${sourceLabel(bad.from)} and ${sourceLabel(bad.to)} differ — ${bad.detail}`
    } else if (hard.some((c) => c.status === 'missing')) {
      const gap = hard.find((c) => c.status === 'missing')
      const conditional = rule.runCondition?.type === 'CUSTOM' || rule.runCondition?.type === 'PO_CLAUSE'
      // A conditional rule (e.g. “invoice claims OT hours > 0”) can't be judged in the
      // browser — a missing document only matters when the condition holds.
      own = conditional ? 'pending' : 'fail'
      headline = conditional ? `${gap.detail} — applies only when: ${String(rule.runCondition.text || '').replace(/\.$/, '')}` : gap.detail
    } else if (hard.some((c) => c.status === 'not_found')) {
      own = 'incomplete'
      const gap = hard.find((c) => c.status === 'not_found')
      headline = `${dp.label || rule.dataPoint} not captured on ${sourceLabel(isBlank(gap.fromValue) ? gap.from : gap.to)}`
    } else if (hard.some((c) => c.status === 'unavailable')) {
      const matched = comparisons.filter((c) => c.status === 'match').length
      own = 'pending'
      headline = `${matched ? `${matched} of ${hard.length} compared · ` : ''}${hard.find((c) => c.status === 'unavailable').detail}`
    } else if (comparisons.some((c) => c.status === 'match')) {
      own = 'pass'
      headline = `Matches across ${comparisons.filter((c) => c.status === 'match').length + 1} sources`
    } else {
      own = 'na'
      headline = 'No optional documents to compare'
    }
  } else if (!clientSide) {
    own = 'pending'
    headline = `${{ UNIQUENESS: 'History', AUTHENTICITY: 'Register', CALCULATION: 'Calculation' }[rule.ruleType] || 'Server-side'} check runs on the server`
  } else {
    own = 'pending'
    headline = `${srcMeta?.label || 'Source'}-only rule — evaluated on the server`
  }

  // Linked 12-point result is authoritative when present
  if (linked && (linked.status === 'pass' || linked.status === 'fail')) {
    const status = linked.status
    return {
      rule,
      status,
      headline:
        status === 'pass'
          ? own === 'fail'
            ? `${linked.title || 'Checklist'} passed — values shown differ in format, please review`
            : linked.message || headline || 'Passed'
          : linked.message || headline || 'Failed',
      sources,
      comparisons,
      evaluatedBy: 'checklist',
      linkedCheck: linked
    }
  }

  return { rule, status: own, headline, sources, comparisons, evaluatedBy: 'n-way', linkedCheck: linked }
}

export const summarize = (results = []) => {
  const summary = { pass: 0, fail: 0, incomplete: 0, pending: 0, na: 0, total: results.length }
  results.forEach((r) => {
    summary[r.status] = (summary[r.status] || 0) + 1
  })
  return summary
}

/**
 * Evaluate every rule that applies to the invoice's category.
 * @param {object} args { rules, inv, sections, checklist, invoiceTypeCode }
 */
export const evaluateInvoice = ({ rules = [], inv = {}, sections = [], checklist = [], invoiceTypeCode }) => {
  const categoryCode = categoryForInvoiceType(invoiceTypeCode)
  const ctx = { inv, sections, checklist }
  const applicable = rules
    .filter((r) => r.status !== 'DRAFT')
    .filter((r) => ruleAppliesToCategory(r, categoryCode))
    .slice()
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
  const results = applicable.map((rule) => evaluateRule(rule, ctx))
  const order = { fail: 0, incomplete: 1, pass: 2, pending: 3, na: 4 }
  results.sort((a, b) => order[a.status] - order[b.status] || (a.rule.displayOrder || 0) - (b.rule.displayOrder || 0))
  return {
    categoryCode,
    categoryLabel: categoryCode ? CATEGORY_BY_CODE[categoryCode]?.label : 'Common rules only',
    results,
    summary: summarize(results)
  }
}

export { worst as worstStatus }
