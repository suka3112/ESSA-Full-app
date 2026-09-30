import { getPOInvoiceDetails, poInvoiceUpdate } from 'api/POBased'

const APPROVED_STATUS_ID = 4
const REJECTED_STATUS_ID = 5

export async function approveRejectPoInvoice(rawId, decision, reason) {
  const res = await getPOInvoiceDetails({ id: rawId })
  const detail = res?.data?.data
  if (!detail) throw new Error('Invoice not found')

  const statusId = decision === 'approved' ? APPROVED_STATUS_ID : REJECTED_STATUS_ID

  const payload = {
    ID: rawId,
    Vendor_id: detail.Vendor_id,
    CoCd: detail.CoCd,
    InvNo: detail.InvNo,
    InvDt: detail.InvDt,
    Payment_Terms: detail.Payment_Terms,
    InvCurr: detail.InvCurr,
    Tax_percentage: detail.Tax_percentage,
    InvAmt: detail.InvAmt,
    Tax_amount: detail.Tax_amount,
    Invoice_Status_Id: statusId
  }

  if (decision === 'rejected' && reason) {
    payload.Rejection_Reason = reason
    payload.rejectionReason = reason
  }

  await poInvoiceUpdate(payload)
}
