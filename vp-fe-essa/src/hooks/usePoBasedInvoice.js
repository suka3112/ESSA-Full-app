import { useEffect, useState } from 'react'
import { getPOInvoiceDetails } from 'api/POBased'
import { mapPoStatusToOverall, mapPoStatusToWorkflow } from './usePoBasedInvoices'
import {
  buildPoApprovalChainForStatus,
  getNextPendingRole
} from '../components/Essa/lib/poApprovalChain'

function parsePoId(id) {
  if (!id) return null
  const str = String(id)
  return str.startsWith('po-') ? str.slice(3) : str
}

function isoOffset(base, hours) {
  if (!base) return new Date().toISOString()
  return new Date(new Date(base).getTime() + hours * 3_600_000).toISOString()
}

function buildPoTimeline(data) {
  const statusLabel = data?.status?.Status_classification || ''
  const workflowStatus = mapPoStatusToWorkflow(statusLabel)
  const actor = data?.created_person?.Name || 'Vendor'
  const invNo = data?.InvNo || ''
  const base = data?.Submitted_Date || data?.CreatedDt

  const events = []

  if (base) {
    events.push({
      id: 'po-approval',
      event_type: 'pending_approval',
      created_at: base,
      actor_name: actor,
      actor_role: 'vendor',
      message: `Approval workflow initiated for ${invNo}`,
      metadata: { levels: 1 }
    })
  }

  if (['posted', 'paid'].includes(workflowStatus)) {
    events.push({
      id: 'po-validated',
      event_type: 'validation_done',
      created_at: isoOffset(base, 0.25),
      actor_name: 'System',
      actor_role: 'system',
      message: 'Validated — PO 3-way match passed → pass',
      metadata: { passed: 1, failed: 0, overall: 'pass' }
    })
    events.push({
      id: 'po-parked',
      event_type: 'parked_to_sap',
      created_at: isoOffset(base, 2),
      actor_name: actor,
      actor_role: 'vendor',
      message: `Invoice ${invNo} parked to SAP`,
      metadata: { sapDoc: 'parked' }
    })
    events.push({
      id: 'po-posted',
      event_type: 'posted',
      created_at: data?.Posting_Date || isoOffset(base, 24),
      actor_name: 'SAP Integration',
      actor_role: 'system',
      message: `Invoice ${invNo} posted to SAP`
    })
  }

  if (workflowStatus === 'paid') {
    events.push({
      id: 'po-paid',
      event_type: 'paid',
      created_at: data?.Posting_Date || isoOffset(base, 48),
      actor_name: 'Treasury',
      actor_role: 'system',
      message: `Invoice ${invNo} paid — payment run complete`
    })
  }

  if (workflowStatus === 'rejected') {
    events.push({
      id: 'po-rejected',
      event_type: 'rejected',
      created_at: data?.Submitted_Date || base,
      actor_name: 'Approver',
      message: `Invoice ${invNo} rejected`
    })
  }

  return events
    .filter((e) => e.created_at)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

function transformPoDetail(data) {
  const statusLabel = data?.status?.Status_classification || ''
  const taxAmount = Number(data?.Tax_amount || 0)
  const totalAmount = Number(data?.InvAmt || 0)
  const invoiceFile =
    (data?.upload_files || []).find(
      (f) => String(f?.Attachment_type || '').toLowerCase() === 'invoice'
    ) || data?.upload_files?.[0]

  const workflowStatus = mapPoStatusToWorkflow(statusLabel)
  const approvals = buildPoApprovalChainForStatus(workflowStatus)

  return {
    id: `po-${data.ID}`,
    source: 'po',
    rawId: data.ID,
    invoice_file_url: invoiceFile?.Upload_files || null,
    invoice_no: data.InvNo,
    vendor_name: data?.vendorDetails?.Vendor_Name_EN,
    vendor_code: data?.vendorDetails?.Vendor_SAP_Code,
    po_number: data?.Ref_No || data?.totalPoNo?.join(', '),
    po_category: 'PO',
    invoice_date: data?.InvDt,
    subtotal: totalAmount - taxAmount,
    vat_amount: taxAmount,
    total_amount: totalAmount,
    currency: data?.InvCurr || 'IDR',
    overall: mapPoStatusToOverall(statusLabel),
    status: workflowStatus,
    status_label: statusLabel,
    bank_name: data?.vendorDetails?.Bank_Name,
    bank_account: data?.vendorDetails?.Bank_Account,
    validation: { checks: [], po_category: 'PO' },
    approvals,
    next_pending_role: getNextPendingRole(approvals),
    timeline: buildPoTimeline(data)
  }
}

export function usePoBasedInvoice(id) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const rawId = parsePoId(id)
    if (!rawId) {
      setData(null)
      setIsLoading(false)
      return undefined
    }

    let cancelled = false
    setData(null)
    setIsLoading(true)

    getPOInvoiceDetails({ id: rawId })
      .then((res) => {
        const detail = res?.data?.data
        if (!cancelled && detail) setData(transformPoDetail(detail))
        else if (!cancelled) setData(null)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return { data, isLoading }
}
