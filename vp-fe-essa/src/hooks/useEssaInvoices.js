import { useCallback, useEffect, useState } from 'react'
import { getEssaInvoices } from 'api/essaDashboard'
import { DEMO_INVOICES_CHANGED } from 'api/demoInvoiceEvents'

export function useEssaInvoices(params = {}) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const paramsKey = JSON.stringify(params)
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false

    const fetchInvoices = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getEssaInvoices(params)
        if (!cancelled) {
          const rows = Array.isArray(result) ? result : result?.data || []
          setData(rows)
          setTotal(Array.isArray(result) ? result.length : result?.total ?? rows.length)
          setCounts(Array.isArray(result) ? null : result?.counts || null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setData([])
          setTotal(0)
          setCounts(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchInvoices()

    return () => {
      cancelled = true
    }
  }, [paramsKey, refreshKey])

  useEffect(() => {
    const onDemoInvoicesChanged = () => refetch()
    window.addEventListener(DEMO_INVOICES_CHANGED, onDemoInvoicesChanged)
    return () => window.removeEventListener(DEMO_INVOICES_CHANGED, onDemoInvoicesChanged)
  }, [refetch])

  return { data, total, counts, isLoading, error, refetch }
}
