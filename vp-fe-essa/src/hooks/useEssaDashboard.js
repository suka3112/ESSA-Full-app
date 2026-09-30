import { useEffect, useState } from 'react'
import { DUMMY_DASHBOARD_DATA, getEssaDashboardData } from 'api/essaDashboard'

export function useEssaDashboard() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const fetchDashboard = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getEssaDashboardData()
        if (!cancelled) {
          setData(result || DUMMY_DASHBOARD_DATA)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setData(DUMMY_DASHBOARD_DATA)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  return { data, isLoading, error }
}
