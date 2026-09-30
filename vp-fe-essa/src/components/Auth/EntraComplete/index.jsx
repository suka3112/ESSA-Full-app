import React, { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { fetchEntraSession } from 'api/Login'
import { AUTH_SETUP } from 'constants/userType'
import { INVOICE_DASHBOARD } from 'constants/url'
import { applyEntraSessionUser, isLocalLogout } from 'utils/authStorage'
import LoginComp from 'components/Auth/Login'

const SILENT_SSO_ERRORS = new Set([
  'login_required',
  'interaction_required',
  'consent_required',
])

const isSafeReturnUrl = (value, userType) => {
  if (!value || typeof value !== 'string') return false
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return false
  }
  const pathname = value.split('?')[0]
  return pathname.split('/').filter(Boolean)[0] === userType
}

function EntraComplete() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    if (isLocalLogout()) {
      navigate(`/${AUTH_SETUP}/login?sso=logged_out`, { replace: true })
      return
    }

    const error = searchParams.get('error')
    if (error) {
      const needsInteraction = SILENT_SSO_ERRORS.has(error)
      if (!needsInteraction) {
        toast.error('Microsoft sign-in failed.')
      }
      const sso = needsInteraction ? 'login_required' : 'error'
      navigate(`/${AUTH_SETUP}/login?sso=${sso}`, { replace: true })
      return
    }

    const completeSso = async () => {
      try {
        const res = await fetchEntraSession()
        const userData = res?.data?.data || res?.data || {}

        if (!userData?.id) {
          throw new Error(res?.data?.message || 'Microsoft sign-in failed: no session.')
        }

        const userType = applyEntraSessionUser(userData, dispatch)
        const storedReturnUrl = sessionStorage.getItem('essaReturnUrl')
        sessionStorage.removeItem('essaReturnUrl')
        const nextPath =
          [searchParams.get('returnUrl'), storedReturnUrl].find((url) =>
            isSafeReturnUrl(url, userType)
          ) || `/${userType}${INVOICE_DASHBOARD}`
        navigate(nextPath, { replace: true })
      } catch (err) {
        console.error(err)
        const message =
          err?.response?.data?.message || err?.message || 'Microsoft sign-in failed.'
        toast.error(message)
        navigate(`/${AUTH_SETUP}/login?sso=error`, { replace: true })
      }
    }

    completeSso()
  }, [searchParams, navigate, dispatch])

  return <LoginComp completing />
}

export default EntraComplete
