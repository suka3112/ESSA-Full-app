import { useEffect, useState } from 'react'
import { DUMMY_MY_WORK, getEssaMyWork } from 'api/essaDashboard'
import { getStoredEssaRole } from 'constants/essaRoles'

function withPortalRole(result) {
  const portalRole = getStoredEssaRole()
  if (!portalRole) return result
  return { ...result, role: portalRole }
}

export function useEssaMyWork() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getEssaMyWork()
      .then((result) => {
        if (cancelled) return
        const base = result?.tiles?.length ? result : DUMMY_MY_WORK
        setData(withPortalRole(base))
      })
      .catch(() => {
        if (!cancelled) setData(withPortalRole(DUMMY_MY_WORK))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { data, isLoading }
}
