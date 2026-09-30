import axiosInstance from '../services/axiosSetup'
import { SEED_MATCH_RULES } from '../components/Essa/lib/nWay/seedRules'

/**
 * N-way match rules ("check A against B").
 * Backend: /invoice-config/match-rules (table AP_MATCH_RULE, migration 030).
 */
export const MATCH_RULES = '/invoice-config/match-rules'
export const MATCH_RULE = (ruleId) => `${MATCH_RULES}/${ruleId}`

const withIds = (rules) =>
  (rules || []).map((r) => ({ ...r, id: r.id ?? r.ruleId ?? `seed-${r.ruleKey}` }))

/** Default rule set shipped with the app (used when the API is not reachable yet). */
export const defaultMatchRules = () => withIds(JSON.parse(JSON.stringify(SEED_MATCH_RULES)))

/**
 * @returns {{ rules: object[], origin: 'server'|'default', error?: string }}
 */
export async function fetchMatchRules() {
  try {
    const response = await axiosInstance.get(MATCH_RULES)
    const rules = response?.data?.data?.rules
    if (!Array.isArray(rules)) throw new Error('Unexpected response')
    return { rules: withIds(rules), origin: 'server' }
  } catch (err) {
    return {
      rules: defaultMatchRules(),
      origin: 'default',
      error: err?.response?.data?.message || err?.message || 'Rules service unavailable'
    }
  }
}

export async function createMatchRule(payload) {
  const response = await axiosInstance.post(MATCH_RULES, payload)
  return response?.data?.data?.rule || null
}

export async function updateMatchRule(ruleId, payload) {
  const response = await axiosInstance.patch(MATCH_RULE(ruleId), payload)
  return response?.data?.data?.rule || null
}

export async function deleteMatchRule(ruleId) {
  const response = await axiosInstance.delete(MATCH_RULE(ruleId))
  return response?.data?.data || null
}

export async function restoreDefaultMatchRules() {
  const response = await axiosInstance.post(`${MATCH_RULES}/restore-defaults`)
  return withIds(response?.data?.data?.rules || [])
}

/* Small shared cache so invoice screens don't refetch rules for every render. */
let cache = null
let inflight = null

export function getMatchRulesCached({ force = false } = {}) {
  if (!force && cache) return Promise.resolve(cache)
  if (!force && inflight) return inflight
  inflight = fetchMatchRules().then((res) => {
    cache = res
    inflight = null
    return res
  })
  return inflight
}

export function invalidateMatchRulesCache() {
  cache = null
}
