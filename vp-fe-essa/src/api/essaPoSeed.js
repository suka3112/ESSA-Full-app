/**
 * Client-side PO manpower demo invoices (PT Amanah Lestari Energy scenario).
 * Shown alongside non-PO seeds when REACT_APP_ESSA_USE_BACKEND is not true.
 */
import { mergeBackendSesIntoInvoice } from './apInvoiceOcr'
import { buildPoApprovalChain, getNextPendingRole } from '../components/Essa/lib/poApprovalChain'

const PUTRI = {
  uploaded_by: 'u-ap-team',
  uploaded_by_name: 'Putri Maharani',
  vendor_code: 'V-ALE-001'
}

const DOC_LABELS =
  'Invoice, Tax Invoice (Faktur Pajak), Berita Acara, Summary Calculation Manhour, Daily Timesheet, Daily Attendance, Service Entry Sheet (SES)'

const passCheck = (sequence, ruleCode, message, extras = {}) => ({
  sequence,
  ruleCode,
  status: 'pass',
  severity: 'PASS',
  message,
  ...extras
})

const failCheck = (sequence, ruleCode, message, extras = {}) => ({
  sequence,
  ruleCode,
  status: 'fail',
  severity: 'FAIL',
  message,
  ...extras
})

const naCheck = (sequence, ruleCode, message) => ({
  sequence,
  ruleCode,
  status: 'na',
  severity: 'SKIP',
  message
})

function buildPoPassChecks(profile) {
  const subtotal = profile.subtotal
  const sesTotal = profile.sesTotal ?? subtotal
  return [
    passCheck(1, 'DOC_COMPLETENESS', `All 7 required documents are present.`, {
      expected: DOC_LABELS,
      actual: DOC_LABELS,
      details: [
        { label: 'Invoice', value: 'Present', status: 'PASS' },
        { label: 'Tax Invoice (Faktur Pajak)', value: 'Present', status: 'PASS' },
        { label: 'Berita Acara', value: 'Present', status: 'PASS' },
        { label: 'Summary Calculation Manhour', value: 'Present', status: 'PASS' },
        { label: 'Daily Timesheet', value: 'Present', status: 'PASS' },
        { label: 'Daily Attendance', value: 'Present', status: 'PASS' },
        { label: 'Service Entry Sheet (SES)', value: 'Present', status: 'PASS' }
      ]
    }),
    passCheck(2, 'PO_NUMBER_MASTER', `PO ${profile.poNumber} exists and is Open.`, {
      expected: `${profile.poNumber} (open in PO Master)`,
      actual: `${profile.poNumber} · Open`
    }),
    passCheck(3, 'VENDOR_PO_INVOICE', 'Invoice vendor matches the PO vendor.', {
      expected: profile.vendorName,
      actual: profile.vendorName
    }),
    passCheck(4, 'BANK_VENDOR_MASTER', 'Invoice bank account number matches Vendor Master.', {
      expected: profile.bankAccount,
      actual: profile.bankAccount
    }),
    naCheck(
      5,
      'NON_PKP_VENDOR',
      'Not applicable — VAT is charged (PKP vendor or tax invoice with VAT on invoice).'
    ),
    passCheck(6, 'TAX_INVOICE_MATCH', 'Tax Invoice vendor and VAT amount match the commercial invoice.', {
      expected: `${profile.vendorName} · VAT ${profile.taxAmount.toLocaleString('en-US')}`,
      actual: `${profile.vendorName} · VAT ${profile.taxAmount.toLocaleString('en-US')}`,
      details: [
        { label: 'Vendor', value: 'Match', status: 'PASS' },
        {
          label: 'VAT amount',
          value: `${profile.taxAmount.toLocaleString('en-US')} vs ${profile.taxAmount.toLocaleString('en-US')}`,
          status: 'PASS'
        }
      ]
    }),
    passCheck(
      7,
      'QTY_RECONCILIATION',
      `Manhour Summary aligns with Berita Acara and SES Accepted Qty (regular ${profile.regularMh.toFixed(1)} MH · overtime ${profile.overtimeMh.toFixed(1)} MH).`,
      {
        expected: `Summary: regular ${profile.regularMh.toFixed(1)} MH · OT ${profile.overtimeMh.toFixed(1)} MH`,
        actual: `Berita Acara: ${profile.regularMh.toFixed(1)} MH · SES Regular MH ${profile.regularMh.toFixed(1)} MH · SES OT-HRS ${profile.overtimeMh.toFixed(1)} MH`
      }
    ),
    passCheck(8, 'RATE_VALIDATION', 'Applied rates match contracted manhour summary rates for all roles.', {
      expected: 'Contract unit rate (IDR/hr)',
      actual: 'Applied rate (amount ÷ hours)'
    }),
    naCheck(9, 'LATE_DELIVERY_LD', 'Not applicable — delivery is on time per PO Appendix.'),
    passCheck(10, 'PO_VALUE_ZERO_TOLERANCE', `Invoice total (IDR ${profile.totalAmount.toLocaleString('en-US')}) is within PO value (IDR ${profile.poValue.toLocaleString('en-US')}).`, {
      expected: `≤ IDR ${profile.poValue.toLocaleString('en-US')}`,
      actual: `IDR ${profile.totalAmount.toLocaleString('en-US')}`
    }),
    passCheck(
      11,
      'SES_DEVIATION',
      `Pass — SES total (IDR ${sesTotal.toLocaleString('en-US')}) matches the invoice amount (IDR ${subtotal.toLocaleString('en-US')}).`,
      {
        expected: `SES total must match the invoice amount (IDR ${subtotal.toLocaleString('en-US')}, 0% tolerance).`,
        actual: 'IDR 0',
        details: [
          { label: 'Invoice subtotal', value: `IDR ${subtotal.toLocaleString('en-US')}` },
          { label: 'Total amount excluding VAT', value: `IDR ${subtotal.toLocaleString('en-US')}` },
          { label: 'Maximum SES amount', value: `IDR ${subtotal.toLocaleString('en-US')}` },
          { label: 'Difference', value: 'IDR 0', status: 'PASS' }
        ]
      }
    ),
    naCheck(
      12,
      'ADVANCE_RETENTION',
      'Not applicable — no advance or retention terms configured on this PO.'
    )
  ]
}

function buildPoFailChecks(profile) {
  const checks = buildPoPassChecks(profile)
  return checks.map((check) => {
    if (check.ruleCode === 'SES_DEVIATION') {
      return failCheck(
        11,
        'SES_DEVIATION',
        `Fail — SES total (IDR ${profile.sesTotal.toLocaleString('en-US')}) exceeds the invoice amount (IDR ${profile.subtotal.toLocaleString('en-US')}) by IDR ${(profile.sesTotal - profile.subtotal).toLocaleString('en-US')} (${profile.sesOverPct.toFixed(1)}%).`,
        {
          expected: `SES total must match the invoice amount (IDR ${profile.subtotal.toLocaleString('en-US')}, 0% tolerance).`,
          actual: `+IDR ${(profile.sesTotal - profile.subtotal).toLocaleString('en-US')} (+${profile.sesOverPct.toFixed(1)}%)`,
          details: [
            { label: 'Invoice subtotal', value: `IDR ${profile.subtotal.toLocaleString('en-US')}` },
            { label: 'Total amount excluding VAT', value: `IDR ${profile.subtotal.toLocaleString('en-US')}` },
            { label: 'Maximum SES amount', value: `IDR ${profile.subtotal.toLocaleString('en-US')}` },
            {
              label: 'Difference',
              value: `+IDR ${(profile.sesTotal - profile.subtotal).toLocaleString('en-US')} (+${profile.sesOverPct.toFixed(1)}%)`,
              status: 'FAIL'
            }
          ]
        }
      )
    }
    if (check.ruleCode === 'RATE_VALIDATION') {
      return failCheck(
        8,
        'RATE_VALIDATION',
        'FAIL: Applied welder rate (IDR 59,800/hr) differs from manhour summary contract rate (IDR 60,000/hr).',
        {
          expected: 'IDR 60,000/hr',
          actual: 'IDR 59,800/hr',
          details: [
            {
              category: 'Direct Welder',
              invoicedAmount: profile.welderDirect,
              contractAmount: profile.welderDirect,
              hours: profile.regularMh,
              appliedRate: 59800,
              poRate: 60000,
              status: 'FAIL',
              issue: 'Applied rate below contract rate'
            }
          ]
        }
      )
    }
    return check
  })
}

function buildManpowerLines(profile) {
  return profile.lines.map((line, index) => ({
    line_no: index + 1,
    description: line.description,
    quantity: line.qty ?? null,
    unit: line.unit ?? null,
    unit_price: line.unitPrice ?? null,
    total: line.amount,
    role: line.role ?? null
  }))
}

function buildManpowerBundle(profile) {
  const header = {
    invoiceNumber: profile.invoiceNo,
    invoiceDate: profile.invoiceDate,
    dueDate: profile.invoiceDueDate,
    vendorName: profile.vendorName,
    poNumber: profile.poNumber,
    serviceName: profile.serviceName,
    currency: 'IDR',
    subtotal: String(profile.subtotal),
    taxAmount: String(profile.taxAmount),
    totalAmount: String(profile.totalAmount),
    grandTotal: String(profile.totalAmount),
    paymentTerms: '30 Days From Invoice Date',
    bankName: profile.bankName,
    bankBranch: profile.bankBranch,
    bankAccount: profile.bankAccount,
    accountHolder: profile.accountHolder,
    invoiceWorkflow: 'PO',
    demoScenario: profile.demoScenario,
    totalRegularManhour: String(profile.regularMh),
    totalOvertimeManhour: String(profile.overtimeMh)
  }

  const ocrLineItems = profile.lines.map((line) => ({
    description: line.description,
    quantity: line.qty != null ? String(line.qty) : null,
    unit: line.unit ?? null,
    unitPrice: line.unitPrice != null ? String(line.unitPrice) : null,
    amount: String(line.amount),
    role: line.role ?? null
  }))

  const invoiceSection = {
    invoiceNo: profile.invoiceNo,
    invoiceDate: profile.invoiceDate,
    invoiceDueDate: profile.invoiceDueDate,
    vendorName: profile.vendorName,
    poNumber: profile.poNumber,
    serviceName: profile.serviceName,
    subtotal: String(profile.subtotal),
    taxAmount: String(profile.taxAmount),
    totalAmount: String(profile.totalAmount),
    bankName: profile.bankName,
    bankAccount: profile.bankAccount,
    accountHolder: profile.accountHolder,
    currency: 'IDR'
  }

  return {
    ocr: {
      documentType: 'invoice',
      header,
      lineItems: ocrLineItems,
      fields: []
    },
    validation_extraction: {
      activeSection: 'A_invoice',
      sections: {
        A_invoice: invoiceSection,
        H_po: {
          poNumber: profile.poNumber,
          vendorName: profile.vendorName,
          poValue: String(profile.poValue),
          deliveryDate: profile.deliveryDate,
          description: profile.serviceName
        },
        F_berita_acara: {
          poNumber: profile.poNumber,
          period: profile.periodLabel,
          thisManhours: String(profile.regularMh)
        },
        G_manhour_summary: {
          totalRegularManhour: String(profile.regularMh),
          totalOvertimeManhour: String(profile.overtimeMh),
          period: profile.periodLabel
        },
        K_ses: {
          sesNo: profile.sesNo,
          poNumber: profile.poNumber,
          totalSesValue: String(profile.sesTotal ?? profile.subtotal),
          projectName: profile.sesDescription
        }
      }
    },
    lines: buildManpowerLines(profile),
    batch_document_types: [
      'invoice',
      'tax_invoice',
      'berita_acara',
      'manhour_summary',
      'timesheet',
      'attendance',
      'ses'
    ],
    ocr_by_type: {
      invoice: { header, lineItems: ocrLineItems },
      ses: {
        header: {
          sesNo: profile.sesNo,
          poNumber: profile.poNumber,
          totalSesValue: String(profile.sesTotal ?? profile.subtotal),
          sesDescription: profile.sesDescription
        },
        lineItems: []
      }
    }
  }
}

function isoOffset(base, hours) {
  return new Date(new Date(base).getTime() + hours * 3_600_000).toISOString()
}

export function buildPoTimeline(row) {
  const base = row.uploaded_at || new Date().toISOString()
  const invNo = row.invoice_no || '—'
  const actor = row.uploaded_by_name || 'Putri Maharani'
  const status = row.status || 'extracted'
  const failed = row.validation?.checks?.some((c) => c.status === 'fail')

  const events = [
    {
      id: `${row.id}-upload`,
      event_type: 'uploaded',
      created_at: base,
      actor_name: actor,
      actor_role: 'ap_team',
      message: `PO manpower bundle uploaded for ${invNo}`
    },
    {
      id: `${row.id}-validated`,
      event_type: 'validation_done',
      created_at: isoOffset(base, 0.5),
      actor_name: 'System',
      actor_role: 'system',
      message: failed
        ? 'Validation completed — issues require review'
        : 'Validated — all PO checks passed',
      metadata: failed ? { overall: 'fail' } : { overall: 'pass' }
    }
  ]

  if (['parked', 'posted', 'paid'].includes(status)) {
    events.push({
      id: `${row.id}-parked`,
      event_type: 'parked_to_sap',
      created_at: isoOffset(base, 2),
      actor_name: actor,
      actor_role: 'ap_team',
      message: `Invoice ${invNo} parked to SAP`
    })
  }

  if (['posted', 'paid'].includes(status)) {
    events.push({
      id: `${row.id}-posted`,
      event_type: 'posted',
      created_at: isoOffset(base, 24),
      actor_name: 'SAP Integration',
      actor_role: 'system',
      message: `Invoice ${invNo} posted to SAP`
    })
  }

  if (status === 'paid') {
    events.push({
      id: `${row.id}-paid`,
      event_type: 'paid',
      created_at: isoOffset(base, 48),
      actor_name: 'Treasury',
      actor_role: 'system',
      message: `Invoice ${invNo} paid — payment run complete`
    })
  }

  return events.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

/** Shared extraction profile — Amanah Lestari 10th claim (Mar–Apr 2026). */
const AMANAH_MAR_APR_PROFILE = {
  invoiceNo: '501/PT.ALE-PAU/07/2026',
  invoiceDate: '2026-04-22',
  invoiceDueDate: '2026-05-22',
  vendorName: 'PT AMANAH LESTARI ENERGY',
  poNumber: '4203000546',
  sesNo: '8000003065',
  sesDescription: 'MPS Piping Fabrication March-April 2026',
  serviceName: 'MANPOWER SUPPLY FOR PIPING FABRICATION (Welder, Fitter and Helper)',
  periodLabel: '07 March - 06 April 2026',
  deliveryDate: '01 Jun 2025 - 31 May 2026',
  subtotal: 55_029_500,
  taxAmount: 6_053_245,
  totalAmount: 61_082_745,
  poValue: 795_236_000,
  sesTotal: 55_029_500,
  regularMh: 758.5,
  overtimeMh: 180.5,
  welderDirect: 21_990_000,
  bankName: 'Bank Mandiri',
  bankBranch: 'Cabang Luwuk',
  bankAccount: '1510010173695',
  accountHolder: 'PT Amanah Lestari Energy',
  demoScenario: 'po_match',
  lines: [
    {
      description: '10th Claim Direct Cost Welder',
      amount: 21_990_000,
      role: 'Welder'
    },
    {
      description: '10th Claim Stationery, Postage, Transportation',
      amount: 1_130_000
    },
    {
      description: '10th Claim Overhead and Profit (Welder)',
      amount: 4_456_500
    },
    {
      description: '10th Claim Direct Cost Fitter',
      amount: 15_680_000,
      role: 'Fitter'
    },
    {
      description: '10th Claim Overhead and Profit (Fitter)',
      amount: 2_883_000
    },
    {
      description: '10th Claim Overtime Fitter',
      amount: 3_880_000,
      role: 'Fitter'
    }
  ]
}

const AMANAH_FEB_MAR_PROFILE = {
  ...AMANAH_MAR_APR_PROFILE,
  invoiceNo: '447/PT/ALE-PAU/03/2026',
  invoiceDate: '2026-03-20',
  invoiceDueDate: '2026-04-19',
  periodLabel: '07 February - 06 March 2026',
  subtotal: 28_254_255,
  taxAmount: 3_107_968,
  totalAmount: 31_362_223,
  sesTotal: 28_254_255,
  regularMh: 392.0,
  overtimeMh: 97.0,
  welderDirect: 11_200_000,
  lines: [
    { description: '9th Claim Direct Cost Welder', amount: 11_200_000, role: 'Welder' },
    { description: '9th Claim Direct Cost Fitter', amount: 8_450_000, role: 'Fitter' },
    { description: '9th Claim Overhead and Profit', amount: 4_104_255 },
    { description: '9th Claim Overtime Welder', amount: 2_500_000, role: 'Welder' },
    { description: '9th Claim Transportation', amount: 2_000_000 }
  ]
}

const AMANAH_FAIL_PROFILE = {
  ...AMANAH_MAR_APR_PROFILE,
  demoScenario: 'po_nomatch',
  sesTotal: 56_130_090,
  sesOverPct: 2.0
}

export const ESSA_PO_LIST_SEED = [
  {
    id: 'demo-po-ale-pass',
    scenario: 'po_match',
    invoice_no: AMANAH_MAR_APR_PROFILE.invoiceNo,
    invoice_type: 'Manpower',
    invoice_workflow: 'PO',
    vendor_name: AMANAH_MAR_APR_PROFILE.vendorName,
    po_number: AMANAH_MAR_APR_PROFILE.poNumber,
    invoice_date: AMANAH_MAR_APR_PROFILE.invoiceDate,
    total_amount: AMANAH_MAR_APR_PROFILE.totalAmount,
    currency: 'IDR',
    status: 'parked',
    overall: 'approved',
    uploaded_at: '2026-06-21T08:15:00Z',
    next_pending_role: 'ap_supervisor',
    failed_checks: 0,
    ...PUTRI
  },
  {
    id: 'demo-po-ale-posted',
    scenario: 'po_match',
    invoice_no: AMANAH_FEB_MAR_PROFILE.invoiceNo,
    invoice_type: 'Manpower',
    invoice_workflow: 'PO',
    vendor_name: AMANAH_FEB_MAR_PROFILE.vendorName,
    po_number: AMANAH_FEB_MAR_PROFILE.poNumber,
    invoice_date: AMANAH_FEB_MAR_PROFILE.invoiceDate,
    total_amount: AMANAH_FEB_MAR_PROFILE.totalAmount,
    currency: 'IDR',
    status: 'posted',
    overall: 'approved',
    uploaded_at: '2026-06-17T11:40:00Z',
    next_pending_role: null,
    failed_checks: 0,
    ...PUTRI
  },
  {
    id: 'demo-po-ale-fail',
    scenario: 'po_nomatch',
    invoice_no: '569/PT/ALE-PAU/04/2026',
    invoice_type: 'Manpower',
    invoice_workflow: 'PO',
    vendor_name: AMANAH_MAR_APR_PROFILE.vendorName,
    po_number: AMANAH_MAR_APR_PROFILE.poNumber,
    invoice_date: '2026-04-25',
    total_amount: AMANAH_MAR_APR_PROFILE.totalAmount,
    currency: 'IDR',
    status: 'extracted',
    overall: 'review',
    uploaded_at: '2026-06-22T09:30:00Z',
    next_pending_role: 'ap_team',
    failed_checks: 2,
    ...PUTRI
  }
]

const PROFILE_BY_ID = {
  'demo-po-ale-pass': AMANAH_MAR_APR_PROFILE,
  'demo-po-ale-posted': AMANAH_FEB_MAR_PROFILE,
  'demo-po-ale-fail': { ...AMANAH_FAIL_PROFILE, invoiceNo: '569/PT/ALE-PAU/04/2026', invoiceDate: '2026-04-25' }
}

function buildApprovalsForRow(row) {
  const approved =
    row.status === 'posted' || row.status === 'paid'
      ? [1, 2, 3, 4]
      : row.status === 'parked'
        ? [1]
        : [1]
  return buildPoApprovalChain({ approvedLevels: approved })
}

function buildDemoBackendSes(profile) {
  return {
    sesNo: profile.sesNo,
    poNumber: profile.poNumber,
    source: 'backend',
    header: {
      sesNo: profile.sesNo,
      poNumber: profile.poNumber,
      vendorName: profile.vendorName,
      projectName: profile.sesDescription,
      sesDescription: profile.sesDescription,
      totalSesValue: String(profile.sesTotal ?? profile.subtotal),
      currency: 'IDR'
    },
    lineItems: [],
    section: {
      sesNo: profile.sesNo,
      poNumber: profile.poNumber,
      vendorName: profile.vendorName,
      projectName: profile.sesDescription,
      totalSesValue: String(profile.sesTotal ?? profile.subtotal),
      currency: 'IDR',
      lineItems: []
    }
  }
}

function detailBase(row) {
  const profile = PROFILE_BY_ID[row.id]
  if (!profile) return null

  const bundle = buildManpowerBundle(profile)
  const checks =
    row.scenario === 'po_nomatch'
      ? buildPoFailChecks(profile)
      : buildPoPassChecks(profile)
  const failed = checks.filter((c) => c.status === 'fail').length
  const approvals = buildApprovalsForRow(row)

  return mergeBackendSesIntoInvoice(
    {
      ...row,
      ...bundle,
      invoice_date: profile.invoiceDate,
      invoice_due_date: profile.invoiceDueDate,
      subtotal: profile.subtotal,
      vat_amount: profile.taxAmount,
      bank_name: profile.bankName,
      bank_account: profile.bankAccount,
      account_holder: profile.accountHolder,
      ses_no: profile.sesNo,
      ocr_confidence: 0.93,
      po_category: 'Manpower',
      source: 'essa',
      demo_seed: true,
      file_name: `po_${row.scenario}_${profile.poNumber}.pdf`,
      validation: {
        checks,
        overallStatus: failed ? 'FAIL' : 'PASS',
        overall: failed ? 'review' : 'approved',
        po_number: profile.poNumber,
        ses_no: profile.sesNo,
        mode: 'PO',
        confidence: 0.93,
        summary: {
          total: checks.length,
          passed: checks.filter((c) => c.status === 'pass' || c.status === 'na').length,
          failed,
          warnings: 0,
          blocked: 0
        },
        ld_pct: 0,
        ld_amount: 0,
        advance_recovery: 0,
        retention_held: 0,
        net_payable: profile.totalAmount
      },
      approvals,
      next_pending_role: getNextPendingRole(approvals),
      timeline: buildPoTimeline(row),
      failed_checks: failed
    },
    buildDemoBackendSes(profile)
  )
}

const DETAIL_BY_ID = Object.fromEntries(
  ESSA_PO_LIST_SEED.map((row) => [row.id, detailBase(row)]).filter(([, detail]) => detail)
)

export function buildPoDetailFromRow(row, extras = {}) {
  const mergedRow = { ...row, ...extras }
  const base = detailBase(mergedRow)
  if (!base) return null
  return {
    ...base,
    ...extras,
    timeline: buildPoTimeline(mergedRow)
  }
}

export function getPoSeedInvoice(id) {
  return DETAIL_BY_ID[id] || null
}

export function getPoSeedInvoiceByInvoiceNo(invoiceNo) {
  const needle = String(invoiceNo || '').trim()
  if (!needle) return null
  const row = ESSA_PO_LIST_SEED.find((r) => r.invoice_no === needle)
  return row ? getPoSeedInvoice(row.id) : null
}

export function filterPoSeedList(params = {}) {
  let rows = [...ESSA_PO_LIST_SEED]

  if (params.overall) rows = rows.filter((r) => r.overall === params.overall)
  if (params.status) rows = rows.filter((r) => r.status === params.status)
  if (params.po) rows = rows.filter((r) => r.po_number === params.po)
  if (params.mine === '1' || params.mine === 'true') {
    rows = rows.filter((r) => r.uploaded_by === 'u-ap-team')
  }
  if (params.pending_my_action === '1' || params.pending_my_action === 'true') {
    rows = rows.filter((r) => r.next_pending_role === 'ap_team')
  }
  if (params.q) {
    const needle = String(params.q).toLowerCase()
    rows = rows.filter(
      (r) =>
        (r.invoice_no || '').toLowerCase().includes(needle) ||
        (r.vendor_name || '').toLowerCase().includes(needle) ||
        (r.po_number || '').toLowerCase().includes(needle)
    )
  }

  return rows
}
