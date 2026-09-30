import { useCallback, useEffect, useState } from 'react'
import { extractApDocument } from 'api/apInvoiceOcr'
import { getEssaInvoiceSamples } from 'api/essaDashboard'

export function useEssaUploadInvoice() {
  const [isPending, setIsPending] = useState(false)

  const mutateAsync = useCallback(async ({ file, documentType = 'invoice', onProgress, invoiceWorkflow } = {}) => {
    setIsPending(true)
    try {
      return await extractApDocument(file, documentType, { onProgress, invoiceWorkflow })
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutateAsync, isPending }
}

export function useEssaUploadSample() {
  const [isPending, setIsPending] = useState(false)

  const mutateAsync = useCallback(async () => {
    throw new Error('Sample upload is not available — use Upload Invoice with a PDF from your machine.')
  }, [])

  return { mutateAsync, isPending }
}

export function useEssaSamples() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    getEssaInvoiceSamples()
      .then((samples) => {
        if (!cancelled) {
          setData(Array.isArray(samples) ? samples : samples?.data || [])
        }
      })
      .catch(() => {
        if (!cancelled) setData([])
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
