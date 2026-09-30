import {
  CATEGORY_BY_CODE,
  COMPARE_MODES,
  FAIL_ACTIONS,
  REQUIREMENTS,
  RULE_TYPES,
  SERVICE_CATEGORY_CODES,
  sourceLabel
} from './catalog'

const joinList = (items) => {
  if (!items.length) return ''
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export const scopeLabel = (rule) => {
  if (!rule || rule.scope !== 'CATEGORY') return 'Common · all categories'
  const cats = rule.categories || []
  const isServices =
    cats.length === SERVICE_CATEGORY_CODES.length && SERVICE_CATEGORY_CODES.every((c) => cats.includes(c))
  if (isServices) return 'All service categories'
  if (cats.length <= 2) return cats.map((c) => CATEGORY_BY_CODE[c]?.label || c).join(', ')
  return `${cats.length} categories`
}

export const criteriaSummary = (rule) => {
  const c = rule?.criteria || {}
  switch (rule?.ruleType) {
    case 'LOGICAL':
      return c.similarity || c.aiConfidence ? `AI match ≥ ${c.similarity || c.aiConfidence}%` : 'Same meaning (AI)'
    case 'TOLERANCE': {
      const combine = { EITHER: 'HIGHER', BOTH: 'LOWER' }[c.combine] || c.combine || 'HIGHER'
      const pct = c.tolerancePct ? `${c.tolerancePct}%` : null
      const amt = c.toleranceAmount ? `IDR ${Number(c.toleranceAmount).toLocaleString('en-US')}` : null
      if (combine === 'PCT') return pct ? `Within ${pct}` : 'No tolerance set'
      if (combine === 'AMOUNT') return amt ? `Within ${amt}` : 'No tolerance set'
      if (pct && amt) return `Within ${pct} or ${amt}, whichever is ${combine === 'LOWER' ? 'lower' : 'higher'}`
      return pct || amt ? `Within ${pct || amt}` : 'No tolerance set'
    }
    case 'AVAILABILITY':
      return 'Document is present in the invoice package'
    case 'UNIQUENESS':
      return c.uniqueKey?.length ? `Unique key: ${c.uniqueKey.join(' + ')}` : 'Must be new'
    case 'AUTHENTICITY':
      return 'Verified against the register'
    case 'CALCULATION':
      return 'Calculated value must agree'
    default:
      return 'Identical after normalising'
  }
}

/** Plain-English sentence: “Read Vendor NPWP from Faktur Pajak and compare with …”. */
export const describeRule = (rule) => {
  if (!rule) return ''
  if (rule.ruleType === 'AVAILABILITY') {
    return `Check that the ${sourceLabel(rule.source)} is present in the invoice package. If it is missing: ${(FAIL_ACTIONS[rule.onFail]?.label || 'raise exception').toLowerCase()}.`
  }
  const targets = (rule.targets || []).filter((t) => t.requirement !== 'EXTRACT')
  const req = targets.filter((t) => t.requirement !== 'IF_PRESENT').map((t) => sourceLabel(t.doc))
  const opt = targets.filter((t) => t.requirement === 'IF_PRESENT').map((t) => sourceLabel(t.doc))
  const when = rule.runCondition?.type && rule.runCondition.type !== 'ALWAYS' && rule.runCondition.text
    ? `${rule.runCondition.text.replace(/\.$/, '')}: `
    : ''
  let body
  if (rule.compareMode === 'STEPWISE' && targets.length) {
    const chain = [rule.source, ...targets.map((t) => t.doc)].map(sourceLabel)
    body = `check ${rule.dataPoint.toLowerCase()} step by step — ${chain.join(' → ')}`
  } else if (!targets.length) {
    body = `check ${rule.dataPoint.toLowerCase()} on ${sourceLabel(rule.source)}`
  } else {
    body = `take ${rule.dataPoint.toLowerCase()} from ${sourceLabel(rule.source)} (anchor) and compare with ${joinList(req) || joinList(opt)}`
    if (req.length && opt.length) body += ` (and ${joinList(opt)} when attached)`
  }
  const pass = criteriaSummary(rule)
  const fail = (FAIL_ACTIONS[rule.onFail]?.label || 'Send to review').toLowerCase()
  const sentence = `${when}${body}. Passes when: ${pass.charAt(0).toLowerCase()}${pass.slice(1)}. If it fails: ${fail}.`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

export const typeLabel = (code) => RULE_TYPES[code]?.label || code
export const failLabel = (code) => FAIL_ACTIONS[code]?.label || code
export const requirementLabel = (code) => REQUIREMENTS[code]?.label || code
export const compareModeLabel = (code) => COMPARE_MODES[code]?.label || code

/** CSV of the rule set in the matrix shape the business reviews in Excel. */
export const rulesToCsv = (rules, sourceCodes) => {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ['Rule', 'Data point', 'Matrix refs', 'Type', ...sourceCodes.map(sourceLabel), 'Level', 'Mode', 'Scope', 'Passes when', 'Applies when', 'On fail', 'Requirement', 'Status', 'Business note']
  const mark = (rule, code) => {
    if (rule.source === code) return 'A'
    const t = (rule.targets || []).find((x) => x.doc === code)
    if (!t) return ''
    return t.requirement === 'IF_PRESENT' ? 'o' : t.requirement === 'PARTIAL' ? 'P' : t.requirement === 'EXTRACT' ? 'E' : 'X'
  }
  const rows = rules.map((r) => [
    r.ruleKey,
    r.dataPoint,
    r.refs || '',
    typeLabel(r.ruleType),
    ...sourceCodes.map((code) => mark(r, code)),
    r.matchLevel || 'HEADER',
    compareModeLabel(r.compareMode),
    scopeLabel(r),
    r.criteriaText || criteriaSummary(r),
    r.runCondition?.text || 'Always',
    failLabel(r.onFail),
    r.mandatory === false ? 'Optional' : 'Mandatory',
    r.status,
    r.businessNote
  ])
  return [header, ...rows].map((row) => row.map(esc).join(',')).join('\n')
}
