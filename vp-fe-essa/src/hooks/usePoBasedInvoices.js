import { useCallback, useEffect, useState } from 'react'
import { invoiceListing } from 'api/PurchaseOrder'
import { getEntityId } from 'services/utilities'

export function mapPoStatusToOverall(status = '') {
  const s = status.toLowerCase()
  if (s === 'approved' || s === 'paid') return 'approved'
  if (s === 'rejected') return 'rejected'
  if (s === 'draft' || s === 'submitted for review' || s === 'under review') return 'review'
  return 'neutral'
}

export function mapPoStatusToWorkflow(status = '') {
  const s = status.toLowerCase()
  if (s === 'paid') return 'paid'
  if (s === 'approved') return 'posted'
  if (s === 'rejected') return 'rejected'
  if (s === 'draft') return 'draft'
  if (s === 'submitted for review' || s === 'under review') return 'pending'
  return 'neutral'
}

function normalizePoInvoice(item) {
  const statusLabel = item?.status?.Status_classification || ''

  return {
    id: `po-${item.ID}`,
    source: 'po',
    rawId: item.ID,
    invoice_no: item.InvNo,
    vendor_name: item?.vendorDetails?.Vendor_Name_EN,
    po_number: item.Ref_No,
    total_amount: item.InvAmt,
    currency: item.InvCurr,
    uploaded_at: item.Submitted_Date,
    ocr_confidence: null,
    overall: mapPoStatusToOverall(statusLabel),
    status: mapPoStatusToWorkflow(statusLabel),
    status_label: statusLabel,
    failed_checks: 0,
    warned_checks: 0
  }
}

export function usePoBasedInvoices() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    const entityId = getEntityId()

    const fetchPoInvoices = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await invoiceListing({
          entity_id: entityId,
          category: 1,
          page: 1,
          limit: 1000
        })

        const results = res?.data?.data?.results || []
        const normalized = results.map(normalizePoInvoice)

        if (!cancelled) setData(normalized)
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setData([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    if (entityId) {
      fetchPoInvoices()
    } else {
      const timer = setTimeout(() => {
        if (!cancelled && getEntityId()) fetchPoInvoices()
        else if (!cancelled) {
          setIsLoading(false)
          setData([])
        }
      }, 1000)

      return () => {
        cancelled = true
        clearTimeout(timer)
      }
    }

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return { data, isLoading, error, refetch }
}
