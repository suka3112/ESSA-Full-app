import { useCallback, useState } from 'react'
import { approveEssaInvoice, patchEssaInvoice } from 'api/essaDashboard'

export function useEssaApproveInvoice(id, refetch) {
  const [isPending, setIsPending] = useState(false)

  const mutateAsync = useCallback(
    async (body) => {
      setIsPending(true)
      try {
        const result = await approveEssaInvoice(id, body)
        refetch?.()
        return result
      } finally {
        setIsPending(false)
      }
    },
    [id, refetch]
  )

  return { mutateAsync, isPending }
}

export function useEssaEditInvoice(id, refetch) {
  const [isPending, setIsPending] = useState(false)

  const mutateAsync = useCallback(
    async (body) => {
      setIsPending(true)
      try {
        const result = await patchEssaInvoice(id, body)
        refetch?.()
        return result
      } finally {
        setIsPending(false)
      }
    },
    [id, refetch]
  )

  return { mutateAsync, isPending }
}
