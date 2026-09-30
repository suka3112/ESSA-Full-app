/** @typedef {{ traceId: string, startedAt: number, fileName?: string }} ExtractionTrace */

const traces = new Map()

export const createExtractionTrace = (fileName = '') => {
  const traceId = `ext-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const trace = { traceId, startedAt: Date.now(), fileName }
  traces.set(traceId, trace)
  return trace
}

export const getExtractionTrace = (traceId) => traces.get(traceId) || null

export const logExtractCheckpoint = (trace, phase, detail = {}) => {
  if (!trace?.traceId) return

  const elapsedMs = Date.now() - trace.startedAt
  const payload = {
    phase,
    elapsedMs,
    elapsedSec: Number((elapsedMs / 1000).toFixed(1)),
    fileName: trace.fileName || null,
    ...detail
  }

  // eslint-disable-next-line no-console
  console.info(`[ESSA Extract][${trace.traceId}] ${phase}`, payload)

  return payload
}

export const formatExtractElapsed = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min <= 0) return `${sec}s`
  return `${min}m ${sec}s`
}
