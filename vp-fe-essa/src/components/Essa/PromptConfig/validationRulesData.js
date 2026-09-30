export const CHECK_SCOPES = ['Availability + Content', 'Availability Only']
export const MISSING_ACTIONS = ['Block', 'Warning']

export const RULE_LOGIC_HELP = [
  {
    title: 'Availability + Content',
    text: 'The system verifies the document is present in the invoice PDF and extracts / validates its content against SAP.'
  },
  {
    title: 'Availability Only',
    text: 'The system only checks that the document is present. Content is not extracted or compared with SAP.'
  }
]

const blockHold = 'Create exception and block workflow until uploaded.'
const blockHoldShort = 'Exception + Hold'
const warningOnly = 'Create exception'
const warningOnlyShort = 'Exception'

const svcRules = [
  ['Invoice', 'Invoice Presence Check', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Tax Invoice (VAT)', 'Tax Invoice Match', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Work Progress Certificate', 'Berita Acara Completeness', 'Availability + Content', 'Yes', 'Warning', 'Yes', warningOnlyShort, warningOnly],
  ['Attendance Sheet', 'Attendance Sheet Availability', 'Availability Only', 'Yes', 'Block', 'No', blockHoldShort, blockHold],
  ['Daily Time Sheet', 'Timesheet Availability', 'Availability Only', 'Yes', 'Warning', 'No', warningOnlyShort, warningOnly],
  ['Summary Calculation Manhour', 'Manhour Summary Check', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Purchase Order', 'PO Document Presence', 'Availability Only', 'Yes', 'Block', 'No', blockHoldShort, blockHold],
  ['PO Appendix', 'PO Appendix Availability', 'Availability Only', 'No', 'Warning', 'No', warningOnlyShort, warningOnly]
]

const poRules = [
  ['Invoice', 'Commercial Invoice Presence', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Tax Invoice (VAT)', 'Faktur Pajak Match', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Purchase Order', 'PO Header Presence', 'Availability Only', 'Yes', 'Block', 'No', blockHoldShort, blockHold],
  ['PO Appendix', 'PO Appendix Completeness', 'Availability Only', 'No', 'Warning', 'No', warningOnlyShort, warningOnly],
  ['Packing List', 'Packing List Availability', 'Availability Only', 'Yes', 'Warning', 'No', warningOnlyShort, warningOnly]
]

const nonPoRules = [
  ['Invoice', 'Non-PO Invoice Presence', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Tax Invoice', 'Tax Invoice Availability', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Underlying Contract', 'Contract Document Check', 'Availability Only', 'Yes', 'Warning', 'No', warningOnlyShort, warningOnly],
  ['Guarantee Letter', 'Guarantee Letter Availability', 'Availability Only', 'No', 'Warning', 'No', warningOnlyShort, warningOnly]
]

const CATEGORY_LABEL = {
  MANPOWER_SERVICES: 'Manpower',
  CIVIL_CONTRACTOR: 'Civil',
  MATERIAL_IMPORT: 'Materials',
  CAMP_SERVICE_AND_CATERING: 'Catering',
  NON_PO: 'Non-PO'
}

let ruleSeq = 0

const toRows = (category, rows) =>
  rows.map((row) => {
    ruleSeq += 1
    const [
      documentTitle,
      ruleName,
      checkScope,
      mandatory,
      missingAction,
      contentValidation,
      workflowImpact,
      workflowImpactDetail
    ] = row
    return {
      id: `rule-${ruleSeq}`,
      category,
      categoryLabel: CATEGORY_LABEL[category],
      documentTitle,
      ruleName,
      checkScope,
      mandatory,
      missingAction,
      contentValidation,
      workflowImpact,
      workflowImpactDetail,
      status: 'Active'
    }
  })

const civilRules = [
  ['Invoice', 'Commercial Invoice Presence', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Tax Invoice', 'Tax Invoice Match', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Work Progress Certificate (Berita Acara)', 'Berita Acara Completeness', 'Availability + Content', 'Yes', 'Warning', 'Yes', warningOnlyShort, warningOnly],
  ['PO', 'PO Header Presence', 'Availability Only', 'Yes', 'Block', 'No', blockHoldShort, blockHold],
  ['PO Appendix', 'PO Appendix Completeness', 'Availability Only', 'No', 'Warning', 'No', warningOnlyShort, warningOnly]
]

const cateringRules = [
  ['Invoice', 'Invoice Presence Check', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Tax Invoice (VAT)', 'Tax Invoice Match', 'Availability + Content', 'Yes', 'Block', 'Yes', blockHoldShort, blockHold],
  ['Monthly Meal Summary (PoB Report)', 'Meal Summary Availability', 'Availability Only', 'Yes', 'Warning', 'No', warningOnlyShort, warningOnly],
  ['Attendance Statistics Table', 'Attendance Stats Availability', 'Availability Only', 'Yes', 'Warning', 'No', warningOnlyShort, warningOnly],
  ['PO', 'PO Document Presence', 'Availability Only', 'Yes', 'Block', 'No', blockHoldShort, blockHold],
  ['PO Appendix', 'PO Appendix Availability', 'Availability Only', 'No', 'Warning', 'No', warningOnlyShort, warningOnly]
]

export const INITIAL_VALIDATION_RULES = [
  ...toRows('MANPOWER_SERVICES', svcRules),
  ...toRows('MATERIAL_IMPORT', poRules),
  ...toRows('CIVIL_CONTRACTOR', civilRules),
  ...toRows('CAMP_SERVICE_AND_CATERING', cateringRules),
  ...toRows('NON_PO', nonPoRules)
]

export const emptyValidationRule = (category) => ({
  id: '',
  category,
  categoryLabel: CATEGORY_LABEL[category] || category,
  documentTitle: '',
  ruleName: '',
  checkScope: 'Availability + Content',
  mandatory: 'Yes',
  missingAction: 'Block',
  contentValidation: 'Yes',
  workflowImpact: blockHoldShort,
  workflowImpactDetail: blockHold,
  status: 'Active'
})
