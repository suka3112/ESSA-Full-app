/**
 * Client-side fallback for non-PO demo invoices (ap.team@essa.com / Putri Maharani).
 * Each profile carries full travel/OCR fields for Extract & Validate (incl. Inv Due Date).
 * Seeded demos are synthetic — not the Wisata Kawan sample PDF (use Upload for that OCR path).
 */
import {
  buildNonPoDoaChain,
  buildNonPoDoaChainForStatus,
  chainRolesForAmount
} from '../components/Essa/lib/nonPoDoaApproval'
import { getNextPendingRole } from '../components/Essa/lib/poApprovalChain'
import { buildNonPoValidationState } from '../components/Essa/lib/nonPoInvoiceDetail'

const PUTRI = {
  uploaded_by: 'u-ap-team',
  uploaded_by_name: 'Putri Maharani',
  next_pending_role: 'ap_team'
}

/** Build a travel OCR profile with sensible defaults. */
function travelProfile(p) {
  const subtotal = p.subtotal ?? p.totalAmount
  return {
    ticketClass: 'Economy',
    vatAmount: 0,
    confidence: 0.92,
    airline: 'Citilink',
    flightNo: 'QG 900',
    routeCodeFrom: 'CGK',
    routeCodeTo: 'BPN',
    routeFrom: 'Jakarta',
    routeTo: 'Balikpapan',
    confirmNo: `CNF-${String(p.requestId || '000').slice(-4)}`,
    ticketNo: `TK-${String(p.requestId || '000000').slice(-6)}`,
    bankName: 'Bank Mandiri',
    serviceName: 'Ticket Domestic',
    ...p,
    subtotal,
    totalAmount: p.totalAmount ?? subtotal
  }
}

/** Full travel extraction profiles — keyed by demo invoice id. */
const TRAVEL_PROFILES = {
  'demo-npo-wisata': {
    invoiceNo: 'INV/TD/000577/2026',
    invoiceDate: '2026-06-03',
    invoiceDueDate: '2026-07-03',
    vendorName: 'PT Citilink Corporate Travel',
    vendorCode: 'CCT0000001',
    bankName: 'Bank Mandiri',
    bankAccount: '8801223344',
    accountHolder: 'PT Citilink Corporate Travel',
    requestId: 'TR-2026-00341',
    passengerName: 'Budi Santoso',
    ticketClass: 'Economy',
    routeFrom: 'Jakarta',
    routeTo: 'Balikpapan',
    confirmNo: 'CL8821',
    ticketNo: '5566778899',
    airline: 'Citilink',
    flightNo: 'QG 912',
    routeCodeFrom: 'CGK',
    routeCodeTo: 'BPN',
    subtotal: 4_250_000,
    vatAmount: 0,
    totalAmount: 4_250_000,
    confidence: 0.94
  },
  'demo-npo-citilink': {
    invoiceNo: 'INV/TD/000588/2026',
    invoiceDate: '2026-06-07',
    invoiceDueDate: '2026-07-07',
    vendorName: 'PT Citilink Corporate Travel',
    vendorCode: 'CCT0000001',
    bankName: 'Bank Mandiri',
    bankAccount: '8801223344',
    accountHolder: 'PT Citilink Corporate Travel',
    requestId: 'TR-2026-00358',
    passengerName: 'Diana Putri',
    ticketClass: 'Economy',
    routeFrom: 'Jakarta',
    routeTo: 'Surabaya',
    confirmNo: 'CL9044',
    ticketNo: '6677889900',
    airline: 'Citilink',
    flightNo: 'QG 831',
    routeCodeFrom: 'CGK',
    routeCodeTo: 'SUB',
    subtotal: 3_680_000,
    vatAmount: 0,
    totalAmount: 3_680_000,
    confidence: 0.91
  },
  'demo-npo-hotel': {
    invoiceNo: 'INV/TD/000602/2026',
    invoiceDate: '2026-06-05',
    invoiceDueDate: '2026-07-05',
    vendorName: 'PT Nusantara Express Hotel',
    vendorCode: 'NEH0000001',
    bankName: 'Bank BNI',
    bankAccount: '9902334455',
    accountHolder: 'PT Nusantara Express Hotel',
    requestId: 'TR-2026-00288',
    passengerName: 'Siti Aminah',
    ticketClass: 'Deluxe Room',
    routeFrom: 'Balikpapan',
    routeTo: 'Balikpapan',
    confirmNo: 'NEH-60226',
    ticketNo: 'RS-88421',
    airline: 'On-site accommodation',
    flightNo: 'N/A',
    routeCodeFrom: 'BPN',
    routeCodeTo: 'BPN',
    subtotal: 1_850_000,
    vatAmount: 0,
    totalAmount: 1_850_000,
    confidence: 0.89,
    serviceName: 'Hotel accommodation',
    lineDescription: 'Hotel accommodation · Site visit week 23 · 3 nights',
    lineUnit: 'NIGHT',
    lineQty: 3,
    lineUnitPrice: 616_667
  },
  'demo-npo-shuttle': {
    invoiceNo: 'INV/TD/000615/2026',
    invoiceDate: '2026-05-20',
    invoiceDueDate: '2026-06-19',
    vendorName: 'PT Trans Kaltim Shuttle',
    vendorCode: 'TKS0000001',
    bankName: 'Bank BCA',
    bankAccount: '8813445566',
    accountHolder: 'PT Trans Kaltim Shuttle',
    requestId: 'TR-2026-00195',
    passengerName: 'Ahmad Rizki',
    ticketClass: 'Shuttle Van',
    routeFrom: 'Balikpapan',
    routeTo: 'Sepinggan Airport',
    confirmNo: 'TKS-615',
    ticketNo: 'SH-22051',
    airline: 'Trans Kaltim Shuttle',
    flightNo: 'TK-12',
    routeCodeFrom: 'BPN',
    routeCodeTo: 'SEP',
    subtotal: 780_000,
    vatAmount: 0,
    totalAmount: 780_000,
    confidence: 0.93,
    serviceName: 'Airport shuttle',
    lineDescription: 'Airport shuttle · Balikpapan site transfer',
    lineUnit: 'TRIP',
    lineQty: 2,
    lineUnitPrice: 390_000
  },
  'demo-npo-doa-5m': travelProfile({
    invoiceNo: 'INV/TD/DOA/003141/2026',
    invoiceDate: '2026-06-08',
    invoiceDueDate: '2026-07-08',
    vendorName: 'PT Wisata Kawan Abadi',
    vendorCode: 'WKA0000001',
    bankAccount: '6970747999',
    accountHolder: 'PT Wisata Kawan Abadi',
    requestId: 'TR-2026-00412',
    passengerName: 'Rina Wulandari',
    totalAmount: 3_144_210,
    confirmNo: 'WK-3144'
  }),
  'demo-npo-doa-15m': travelProfile({
    invoiceNo: 'INV/TD/DOA/008500/2026',
    invoiceDate: '2026-06-04',
    invoiceDueDate: '2026-07-04',
    vendorName: 'PT NUSANTARA TEKNIK',
    vendorCode: 'NTK0000001',
    bankName: 'Bank BCA',
    bankAccount: '7700112233',
    accountHolder: 'PT NUSANTARA TEKNIK',
    requestId: 'TR-2026-00395',
    passengerName: 'Eko Prasetyo',
    routeTo: 'Singapore',
    routeCodeTo: 'SIN',
    totalAmount: 8_500_000,
    serviceName: 'Executive travel package',
    airline: 'Garuda Indonesia',
    flightNo: 'GA 824'
  }),
  'demo-npo-doa-50m': travelProfile({
    invoiceNo: 'INV/TD/DOA/028000/2026',
    invoiceDate: '2026-05-28',
    invoiceDueDate: '2026-06-28',
    vendorName: 'PT Garuda Aviation Charter',
    vendorCode: 'GAC0000001',
    bankName: 'Bank Mandiri',
    bankAccount: '5566778899',
    accountHolder: 'PT Garuda Aviation Charter',
    requestId: 'TR-2026-00210',
    passengerName: 'Site leadership team',
    routeTo: 'Balikpapan',
    totalAmount: 28_000_000,
    serviceName: 'Charter flight — site mobilisation',
    airline: 'Garuda Charter',
    flightNo: 'GA 9901',
    ticketClass: 'Charter'
  }),
  'demo-npo-doa-50m-mid': travelProfile({
    invoiceNo: 'INV/TD/DOA/032000/2026',
    invoiceDate: '2026-05-25',
    invoiceDueDate: '2026-06-25',
    vendorName: 'PT Garuda Aviation Charter',
    vendorCode: 'GAC0000001',
    bankName: 'Bank Mandiri',
    bankAccount: '5566778899',
    accountHolder: 'PT Garuda Aviation Charter',
    requestId: 'TR-2026-00218',
    passengerName: 'Operations delegation',
    totalAmount: 32_000_000,
    serviceName: 'Charter flight — emergency mobilisation',
    airline: 'Garuda Charter',
    flightNo: 'GA 9908',
    ticketClass: 'Charter'
  }),
  'demo-npo-doa-100m': travelProfile({
    invoiceNo: 'INV/TD/DOA/072000/2026',
    invoiceDate: '2026-05-15',
    invoiceDueDate: '2026-06-15',
    vendorName: 'PT Indo Pacific Air Services',
    vendorCode: 'IPA0000001',
    bankName: 'Bank BNI',
    bankAccount: '3344556677',
    accountHolder: 'PT Indo Pacific Air Services',
    requestId: 'TR-2026-00144',
    passengerName: 'Executive committee',
    routeTo: 'Jakarta',
    routeCodeTo: 'CGK',
    totalAmount: 72_000_000,
    serviceName: 'VIP charter — board visit',
    airline: 'Indo Pacific Air',
    flightNo: 'IP 7700',
    ticketClass: 'Business Charter'
  }),
  'demo-npo-doa-100m-xl': travelProfile({
    invoiceNo: 'INV/TD/DOA/125000/2026',
    invoiceDate: '2026-05-10',
    invoiceDueDate: '2026-06-10',
    vendorName: 'PT Indo Pacific Air Services',
    vendorCode: 'IPA0000001',
    bankName: 'Bank BNI',
    bankAccount: '3344556677',
    accountHolder: 'PT Indo Pacific Air Services',
    requestId: 'TR-2026-00102',
    passengerName: 'Regional leadership',
    totalAmount: 125_000_000,
    serviceName: 'Multi-leg charter — regional summit',
    airline: 'Indo Pacific Air',
    flightNo: 'IP 8800',
    ticketClass: 'VIP Charter'
  }),
  'demo-nusantara-dec': travelProfile({
    invoiceNo: 'INV/NTK/2025/12/0098',
    invoiceDate: '2025-12-18',
    invoiceDueDate: '2026-01-18',
    vendorName: 'PT NUSANTARA TEKNIK',
    vendorCode: 'NTK0000001',
    bankName: 'Bank BCA',
    bankAccount: '7700112233',
    accountHolder: 'PT NUSANTARA TEKNIK',
    requestId: 'TR-2025-01880',
    passengerName: 'Hendra Wijaya',
    totalAmount: 6_200_000,
    routeTo: 'Surabaya',
    routeCodeTo: 'SUB',
    flightNo: 'QG 712'
  })
}

function buildTravelBundle(profile) {
  const routing = `${profile.routeCodeFrom}-${profile.routeCodeTo}`
  const bankDetails = [profile.bankName, profile.bankAccount, profile.accountHolder]
    .filter(Boolean)
    .join(' · ')
  const serviceName = profile.serviceName || 'Ticket Domestic'
  const lineDescription =
    profile.lineDescription ||
    `${serviceName} ${routing} · ${profile.airline} · ${profile.passengerName}`

  const header = {
    invoiceNumber: profile.invoiceNo,
    invoiceDate: profile.invoiceDate,
    dueDate: profile.invoiceDueDate,
    vendorName: profile.vendorName,
    poNumber: null,
    serviceName,
    currency: 'IDR',
    subtotal: String(profile.subtotal),
    taxAmount: String(profile.vatAmount),
    totalAmount: String(profile.totalAmount),
    grandTotal: String(profile.totalAmount),
    paymentTerms: `Invoice payment due by ${profile.invoiceDueDate}`,
    bankName: profile.bankName,
    bankAccount: profile.bankAccount,
    accountHolder: profile.accountHolder,
    invoiceWorkflow: 'NON_PO',
    requestId: profile.requestId,
    passengerName: profile.passengerName,
    ticketClass: profile.ticketClass,
    routeFrom: profile.routeFrom,
    routeTo: profile.routeTo,
    confirmNo: profile.confirmNo,
    ticketNo: profile.ticketNo,
    airline: profile.airline,
    flightNo: profile.flightNo,
    routeCodeFrom: profile.routeCodeFrom,
    routeCodeTo: profile.routeCodeTo
  }

  const lineQty = profile.lineQty ?? 1
  const lineUnit = profile.lineUnit || 'TKT'
  const lineUnitPrice = profile.lineUnitPrice ?? profile.subtotal

  const lineItem = {
    description: lineDescription,
    quantity: String(lineQty),
    unit: lineUnit,
    unitPrice: String(lineUnitPrice),
    amount: String(profile.subtotal),
    passengerName: profile.passengerName,
    ticketClass: profile.ticketClass,
    departure: profile.routeFrom,
    arrival: profile.routeTo,
    from: profile.routeFrom,
    to: profile.routeTo,
    confirmNo: profile.confirmNo,
    confirm_no: profile.confirmNo,
    ticketNo: profile.ticketNo,
    ticket_no: profile.ticketNo,
    airline: profile.airline,
    flightNo: profile.flightNo,
    flight: profile.flightNo,
    routing,
    route: routing
  }

  const travelSection = {
    invoiceNo: profile.invoiceNo,
    invoiceDate: profile.invoiceDate,
    invoiceDueDate: profile.invoiceDueDate,
    passengerName: profile.passengerName,
    ticketClass: profile.ticketClass,
    routeFrom: profile.routeFrom,
    routeTo: profile.routeTo,
    confirmNo: profile.confirmNo,
    ticketNo: profile.ticketNo,
    airline: profile.airline,
    flightNo: profile.flightNo,
    routeCodeFrom: profile.routeCodeFrom,
    routeCodeTo: profile.routeCodeTo,
    amount: String(profile.subtotal),
    vatAmount: String(profile.vatAmount),
    totalAmount: String(profile.totalAmount),
    bankDetails,
    currency: 'IDR'
  }

  return {
    ocr: {
      documentType: 'invoice',
      header,
      lineItems: [lineItem],
      fields: []
    },
    validation_extraction: {
      activeSection: 'A_nonPoTravel',
      sections: { A_nonPoTravel: travelSection }
    },
    lines: [
      {
        line_no: 1,
        description: lineDescription,
        quantity: lineQty,
        unit: lineUnit,
        unit_price: lineUnitPrice,
        total: profile.totalAmount,
        passengerName: profile.passengerName,
        ticketClass: profile.ticketClass,
        routing,
        airline: profile.airline,
        flightNo: profile.flightNo,
        confirmNo: profile.confirmNo,
        ticketNo: profile.ticketNo
      }
    ]
  }
}

/**
 * Non-PO demo invoices — one row per DoA amount band (see nonPoDoaApproval.js).
 * doa_band labels are for documentation / filtering only.
 */
export const ESSA_NON_PO_LIST_SEED = [
  {
    id: 'demo-npo-shuttle',
    doa_band: '≤ IDR 2M · HOS',
    invoice_no: 'INV/TD/000615/2026',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT Trans Kaltim Shuttle',
    po_number: null,
    invoice_date: '2026-05-20',
    total_amount: 780_000,
    currency: 'IDR',
    status: 'paid',
    overall: 'approved',
    uploaded_at: '2026-06-18T14:00:00Z',
    next_pending_role: null,
    ...PUTRI
  },
  {
    id: 'demo-npo-hotel',
    doa_band: '≤ IDR 2M · HOS',
    invoice_no: 'INV/TD/000602/2026',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT Nusantara Express Hotel',
    po_number: null,
    invoice_date: '2026-06-05',
    total_amount: 1_850_000,
    currency: 'IDR',
    status: 'extracted',
    overall: 'review',
    uploaded_at: '2026-06-19T07:22:00Z',
    next_pending_role: 'ap_team',
    failed_checks: 1,
    ...PUTRI
  },
  {
    id: 'demo-npo-doa-5m',
    doa_band: '> IDR 2M ≤ IDR 5M · HOS → HOD',
    invoice_no: 'INV/TD/DOA/003141/2026',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT Wisata Kawan Abadi',
    po_number: null,
    invoice_date: '2026-06-08',
    total_amount: 3_144_210,
    currency: 'IDR',
    status: 'extracted',
    overall: 'review',
    uploaded_at: '2026-06-20T09:00:00Z',
    next_pending_role: 'ap_team',
    failed_checks: 1,
    ...PUTRI
  },
  {
    id: 'demo-npo-citilink',
    doa_band: '> IDR 2M ≤ IDR 5M · HOS → HOD',
    invoice_no: 'INV/TD/000588/2026',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT Citilink Corporate Travel',
    po_number: null,
    invoice_date: '2026-06-07',
    total_amount: 3_680_000,
    currency: 'IDR',
    status: 'extracted',
    overall: 'review',
    uploaded_at: '2026-06-19T10:15:00Z',
    next_pending_role: 'ap_team',
    failed_checks: 1,
    ...PUTRI
  },
  {
    id: 'demo-npo-wisata',
    doa_band: '> IDR 2M ≤ IDR 5M · HOS → HOD',
    invoice_no: 'INV/TD/000577/2026',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT Citilink Corporate Travel',
    po_number: null,
    invoice_date: '2026-06-03',
    total_amount: 4_250_000,
    currency: 'IDR',
    status: 'extracted',
    overall: 'approved',
    uploaded_at: '2026-06-20T08:30:00Z',
    next_pending_role: 'hos',
    ...PUTRI
  },
  {
    id: 'demo-nusantara-dec',
    doa_band: '> IDR 5M ≤ IDR 15M · HOD → HOF',
    invoice_no: 'INV/NTK/2025/12/0098',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT NUSANTARA TEKNIK',
    po_number: null,
    invoice_date: '2025-12-18',
    total_amount: 6_200_000,
    currency: 'IDR',
    status: 'parked',
    overall: 'approved',
    uploaded_at: '2026-06-17T11:05:00Z',
    next_pending_role: 'hof',
    ...PUTRI
  },
  {
    id: 'demo-npo-doa-15m',
    doa_band: '> IDR 5M ≤ IDR 15M · HOD → HOF',
    invoice_no: 'INV/TD/DOA/008500/2026',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT NUSANTARA TEKNIK',
    po_number: null,
    invoice_date: '2026-06-04',
    total_amount: 8_500_000,
    currency: 'IDR',
    status: 'extracted',
    overall: 'review',
    uploaded_at: '2026-06-18T11:20:00Z',
    next_pending_role: 'ap_team',
    failed_checks: 1,
    ...PUTRI
  },
  {
    id: 'demo-npo-doa-50m',
    doa_band: '> IDR 15M ≤ IDR 50M · HOD → HOF → STH',
    invoice_no: 'INV/TD/DOA/028000/2026',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT Garuda Aviation Charter',
    po_number: null,
    invoice_date: '2026-05-28',
    total_amount: 28_000_000,
    currency: 'IDR',
    status: 'extracted',
    overall: 'approved',
    uploaded_at: '2026-06-17T08:45:00Z',
    next_pending_role: 'hod',
    ...PUTRI
  },
  {
    id: 'demo-npo-doa-50m-mid',
    doa_band: '> IDR 15M ≤ IDR 50M · HOD → HOF → STH',
    invoice_no: 'INV/TD/DOA/032000/2026',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT Garuda Aviation Charter',
    po_number: null,
    invoice_date: '2026-05-25',
    total_amount: 32_000_000,
    currency: 'IDR',
    status: 'parked',
    overall: 'approved',
    uploaded_at: '2026-06-16T14:30:00Z',
    next_pending_role: 'sth',
    doa_approved_levels: [1, 2],
    ...PUTRI
  },
  {
    id: 'demo-npo-doa-100m',
    doa_band: '> IDR 50M ≤ IDR 100M · HOD → HOF → STH → GFD',
    invoice_no: 'INV/TD/DOA/072000/2026',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT Indo Pacific Air Services',
    po_number: null,
    invoice_date: '2026-05-15',
    total_amount: 72_000_000,
    currency: 'IDR',
    status: 'extracted',
    overall: 'approved',
    uploaded_at: '2026-06-15T09:10:00Z',
    next_pending_role: 'hod',
    ...PUTRI
  },
  {
    id: 'demo-npo-doa-100m-xl',
    doa_band: '> IDR 100M · HOD → HOF → STH → GFD',
    invoice_no: 'INV/TD/DOA/125000/2026',
    invoice_type: 'Non-PO',
    invoice_workflow: 'NON_PO',
    vendor_name: 'PT Indo Pacific Air Services',
    po_number: null,
    invoice_date: '2026-05-10',
    total_amount: 125_000_000,
    currency: 'IDR',
    status: 'extracted',
    overall: 'approved',
    uploaded_at: '2026-06-17T16:00:00Z',
    next_pending_role: 'hod',
    ...PUTRI
  }
]

function isoOffset(base, hours) {
  return new Date(new Date(base).getTime() + hours * 3_600_000).toISOString()
}

/** Milestone events aligned with SAP_TIMELINE_STEPS on the Timeline page. */
export function buildNonPoTimeline(row) {
  const base = row.uploaded_at || new Date().toISOString()
  const invNo = row.invoice_no || '—'
  const actor = row.uploaded_by_name || 'Putri Maharani'
  const status = row.status || 'extracted'

  const events = [
    {
      id: `${row.id}-approval`,
      event_type: 'pending_approval',
      created_at: base,
      actor_name: actor,
      actor_role: 'ap_team',
      message: `Approval workflow initiated for ${invNo}`,
      metadata: { levels: chainRolesForAmount(row.total_amount).length }
    },
    {
      id: `${row.id}-validated`,
      event_type: 'validation_done',
      created_at: isoOffset(base, 0.25),
      actor_name: 'System',
      actor_role: 'system',
      message: 'Validated — 4/4 checks passed → pass',
      metadata: { passed: 4, failed: 0, warned: 0, overall: 'pass' }
    }
  ]

  if (['parked', 'posted', 'paid'].includes(status)) {
    events.push({
      id: `${row.id}-parked`,
      event_type: 'parked_to_sap',
      created_at: isoOffset(base, 2),
      actor_name: actor,
      actor_role: 'ap_team',
      message: `Invoice ${invNo} parked to SAP`,
      metadata: { sapDoc: 'parked' }
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

function buildApprovalsForRow(row) {
  const amount = row.total_amount ?? row.subtotal ?? 0
  if (row.doa_approved_levels?.length) {
    return buildNonPoDoaChain({
      amount,
      approvedLevels: row.doa_approved_levels,
      notes: { [row.doa_approved_levels.length]: 'Approved — awaiting next level' }
    })
  }
  return buildNonPoDoaChainForStatus(row)
}

function detailBase(row) {
  const profile = TRAVEL_PROFILES[row.id]
  const bundle = profile ? buildTravelBundle(profile) : null
  const approvals = buildApprovalsForRow(row)

  const base = {
    ...row,
    invoice_date: profile?.invoiceDate || row.invoice_date || '2026-05-29',
    invoice_due_date: profile?.invoiceDueDate || null,
    vendor_code: profile?.vendorCode || '30009999',
    subtotal: profile?.subtotal ?? row.total_amount,
    vat_amount: profile?.vatAmount ?? 0,
    bank_name: profile?.bankName || 'Bank BCA',
    bank_account: profile?.bankAccount || '6970747999',
    account_holder: profile?.accountHolder || row.vendor_name,
    booking_ref: profile?.requestId || null,
    ocr_confidence: profile?.confidence ?? 0.94,
    po_category: 'Non-PO',
    source: 'essa',
    overall: 'pass',
    approvals,
    next_pending_role: getNextPendingRole(approvals),
    timeline: buildNonPoTimeline(row),
    ...(bundle
      ? {
          ocr: bundle.ocr,
          validation_extraction: bundle.validation_extraction,
          lines: bundle.lines
        }
      : {
          lines: [
            {
              line_no: 1,
              description: 'Travel ticket',
              quantity: 1,
              unit: 'TKT',
              unit_price: row.total_amount,
              total: row.total_amount
            }
          ]
        })
  }

  return {
    ...base,
    validation: buildNonPoValidationState(base)
  }
}

const DETAIL_BY_ID = Object.fromEntries(
  ESSA_NON_PO_LIST_SEED.map((row) => [row.id, detailBase(row)])
)

export function buildNonPoDetailFromRow(row, extras = {}) {
  const mergedRow = { ...row, ...extras }
  const base = detailBase(mergedRow)
  const detail = {
    ...base,
    ...extras,
    timeline: buildNonPoTimeline(mergedRow)
  }
  if (extras.lines?.length) detail.lines = extras.lines
  if (extras.ocr) detail.ocr = { ...base.ocr, ...extras.ocr }
  if (extras.validation_extraction) {
    detail.validation_extraction = extras.validation_extraction
  }
  if (extras.validation) {
    detail.validation = { ...base.validation, ...extras.validation }
  }
  return detail
}

export function getNonPoSeedInvoice(id) {
  return DETAIL_BY_ID[id] || null
}

export function getNonPoSeedInvoiceByInvoiceNo(invoiceNo) {
  const needle = String(invoiceNo || '').trim()
  if (!needle) return null
  const row = ESSA_NON_PO_LIST_SEED.find((r) => r.invoice_no === needle)
  return row ? getNonPoSeedInvoice(row.id) : null
}

export function filterNonPoSeedList(params = {}) {
  let rows = [...ESSA_NON_PO_LIST_SEED]

  if (params.overall) rows = rows.filter((r) => r.overall === params.overall)
  if (params.status) rows = rows.filter((r) => r.status === params.status)
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
        (r.vendor_name || '').toLowerCase().includes(needle)
    )
  }

  return rows
}
