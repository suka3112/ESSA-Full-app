import { useCallback, useEffect, useState } from 'react'
import { getEssaInvoice } from 'api/essaDashboard'

export function useEssaInvoice(id) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!id) {
      setData(null)
      return undefined
    }

    let cancelled = false
    setData(null)
    setIsLoading(true)

    getEssaInvoice(id)
      .then((result) => {
        if (!cancelled) setData(result)
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
  }, [id, refreshKey])

  return { data, isLoading, refetch }
}
