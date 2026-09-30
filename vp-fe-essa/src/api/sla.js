import axiosInstance from '../services/axiosSetup'
import { essaBackendEnabled } from './essaDashboard'
import {
  getSlaMeta as getMetaLocal,
  getSlaPolicies as getPoliciesLocal,
  createSlaPolicy as createLocal,
  updateSlaPolicy as updateLocal,
  deleteSlaPolicy as deleteLocal,
  retireSlaPolicy as retirePolicyLocal,
  saveBusinessCalendar as saveCalendarLocal,
  createBusinessCalendar as createCalendarLocal,
  publishBusinessCalendar as publishCalendarLocal,
  retireBusinessCalendar as retireCalendarLocal,
  simulateSla as simulateLocal,
  markSlaPolicyTested as testLocal,
  publishSlaPolicy as publishLocal,
  newSlaPolicyVersion as newVersionLocal,
  cloneSlaPolicy as cloneLocal,
  getSlaInstances as getInstancesLocal,
  getSlaInstance as getInstanceLocal,
  summarizeSlaInstances as summarizeLocal,
  pauseSlaInstance as pauseLocal,
  resumeSlaInstance as resumeLocal
} from '../components/Essa/lib/slaStore'

const ESSA_SLA_API = '/essa/sla'
const SLA_READ_TIMEOUT_MS = 2500

const unwrap = (body) =>
  body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body

const emptyPolicies = () => ({ policies: [], calendars: [] })

export function slaError(error) {
  const data = error?.response?.data
  const problems = Array.isArray(data?.problems) ? data.problems : []
  const message =
    problems.length > 0 ? problems.join(' ') : data?.message || error.message || 'Request failed'
  const err = new Error(message)
  err.problems = problems
  err.status = error?.response?.status
  return err
}

function compactParams(query = {}) {
  const params = {}
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (typeof value === 'boolean') params[key] = value ? 'true' : 'false'
    else params[key] = value
  })
  return params
}

async function getOrLocal(path, fallback, isValid) {
  if (!essaBackendEnabled()) return fallback()
  try {
    const response = await axiosInstance.get(`${ESSA_SLA_API}${path}`, {
      timeout: SLA_READ_TIMEOUT_MS
    })
    const payload = unwrap(response.data)
    if (isValid && !isValid(payload)) return fallback()
    return payload
  } catch {
    return fallback()
  }
}

export async function getSlaMeta() {
  return getOrLocal(
    '/meta',
    getMetaLocal,
    (payload) => payload && Array.isArray(payload.triggerEvents)
  )
}

export async function getSlaPolicies() {
  if (!essaBackendEnabled()) return getPoliciesLocal()
  return getOrLocal(
    '/policies',
    emptyPolicies,
    (payload) => payload && Array.isArray(payload.policies) && Array.isArray(payload.calendars)
  )
}

export async function getSlaPolicy(id) {
  if (!essaBackendEnabled()) {
    const { policies } = getPoliciesLocal()
    return policies.find((p) => p.id === id) || null
  }
  const response = await axiosInstance.get(`${ESSA_SLA_API}/policies/${id}`)
  return unwrap(response.data)
}

export async function getSlaInstances(query = {}) {
  if (!essaBackendEnabled()) return getInstancesLocal(query)
  try {
    const response = await axiosInstance.get(`${ESSA_SLA_API}/instances`, {
      timeout: SLA_READ_TIMEOUT_MS,
      params: compactParams(query)
    })
    const payload = unwrap(response.data)
    return Array.isArray(payload) ? payload : []
  } catch {
    return getInstancesLocal(query)
  }
}

export async function getSlaInstancesSummary() {
  if (!essaBackendEnabled()) return summarizeLocal()
  try {
    const response = await axiosInstance.get(`${ESSA_SLA_API}/instances/summary`, {
      timeout: SLA_READ_TIMEOUT_MS
    })
    const payload = unwrap(response.data) || {}
    return {
      open: Number(payload.open) || 0,
      dueToday: Number(payload.dueToday) || 0,
      atRisk: Number(payload.atRisk) || 0,
      breached: Number(payload.breached) || 0,
      paused: Number(payload.paused) || 0
    }
  } catch {
    return summarizeLocal()
  }
}

export async function getSlaInstance(id) {
  if (!essaBackendEnabled()) return getInstanceLocal(id)
  try {
    const response = await axiosInstance.get(`${ESSA_SLA_API}/instances/${encodeURIComponent(id)}`, {
      timeout: SLA_READ_TIMEOUT_MS
    })
    return unwrap(response.data)
  } catch {
    return getInstanceLocal(id)
  }
}

export async function createSlaPolicy(payload, actor) {
  if (!essaBackendEnabled()) return createLocal(payload, actor)
  try {
    const response = await axiosInstance.post(`${ESSA_SLA_API}/policies`, payload)
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function updateSlaPolicy(id, payload, actor) {
  if (!essaBackendEnabled()) return updateLocal(id, payload, actor)
  try {
    const response = await axiosInstance.put(`${ESSA_SLA_API}/policies/${id}`, payload)
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function deleteSlaPolicy(id) {
  if (!essaBackendEnabled()) return deleteLocal(id)
  try {
    const response = await axiosInstance.delete(`${ESSA_SLA_API}/policies/${id}`)
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function retireSlaPolicy(id, payload, actor) {
  if (!essaBackendEnabled()) return retirePolicyLocal(id, payload, actor)
  try {
    const response = await axiosInstance.post(`${ESSA_SLA_API}/policies/${id}/retire`, payload || {})
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function publishSlaPolicy(id, payload, actor) {
  if (!essaBackendEnabled()) return publishLocal(id, payload, actor)
  try {
    const response = await axiosInstance.post(`${ESSA_SLA_API}/policies/${id}/publish`, payload || {})
    const body = unwrap(response.data)
    return body?.policy || body
  } catch (error) {
    throw slaError(error)
  }
}

export async function markSlaPolicyTested(id, payload, actor) {
  if (!essaBackendEnabled()) return testLocal(id, payload, actor)
  try {
    const response = await axiosInstance.post(`${ESSA_SLA_API}/policies/${id}/test`, payload || {})
    const body = unwrap(response.data)
    if (body?.simulation) return body
    const policy = body?.policy || body
    const simulation = await simulateSla({
      policyId: id,
      startAt: payload?.startAt,
      calendarId: policy?.timer?.calendarId,
      pauseFrom: payload?.pauseFrom,
      pauseTo: payload?.pauseTo
    })
    return {
      policy,
      simulation: { rows: simulation.rows, calendarName: simulation.calendarName }
    }
  } catch (error) {
    throw slaError(error)
  }
}

export async function newSlaPolicyVersion(id, actor) {
  if (!essaBackendEnabled()) return newVersionLocal(id, actor)
  try {
    const response = await axiosInstance.post(`${ESSA_SLA_API}/policies/${id}/version`)
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function cloneSlaPolicy(id, payload, actor) {
  if (!essaBackendEnabled()) return cloneLocal(id, payload, actor)
  try {
    const response = await axiosInstance.post(`${ESSA_SLA_API}/policies/${id}/clone`, payload || {})
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function saveBusinessCalendar(calendar, actor) {
  if (!essaBackendEnabled()) return saveCalendarLocal(calendar, actor)
  try {
    const response = await axiosInstance.put(`${ESSA_SLA_API}/calendars/${calendar.id}`, calendar)
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function createBusinessCalendar(payload, actor) {
  if (!essaBackendEnabled()) return createCalendarLocal(payload, actor)
  try {
    const response = await axiosInstance.post(`${ESSA_SLA_API}/calendars`, payload || {})
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function publishBusinessCalendar(id, actor) {
  if (!essaBackendEnabled()) return publishCalendarLocal(id, actor)
  try {
    const response = await axiosInstance.post(`${ESSA_SLA_API}/calendars/${id}/publish`)
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function retireBusinessCalendar(id, actor) {
  if (!essaBackendEnabled()) return retireCalendarLocal(id, actor)
  try {
    const response = await axiosInstance.post(`${ESSA_SLA_API}/calendars/${id}/retire`)
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function simulateSla(payload) {
  if (!essaBackendEnabled()) return simulateLocal(payload)
  try {
    const response = await axiosInstance.post(`${ESSA_SLA_API}/simulate`, payload)
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function pauseSlaInstance(id, payload) {
  if (!essaBackendEnabled()) return pauseLocal(id, payload)
  try {
    const response = await axiosInstance.post(
      `${ESSA_SLA_API}/instances/${encodeURIComponent(id)}/pause`,
      payload || {}
    )
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}

export async function resumeSlaInstance(id, payload) {
  if (!essaBackendEnabled()) return resumeLocal(id, payload)
  try {
    const response = await axiosInstance.post(
      `${ESSA_SLA_API}/instances/${encodeURIComponent(id)}/resume`,
      payload || {}
    )
    return unwrap(response.data)
  } catch (error) {
    throw slaError(error)
  }
}
