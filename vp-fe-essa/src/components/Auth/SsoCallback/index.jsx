import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { ssoCallback } from 'api/Login'
import {
  ADMIN_USER_TYPE,
  AUTH_SETUP,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_USER_TYPE,
} from 'constants/userType'
import {
  ROLE_ID_TO_USER_TYPE,
  persistEssaRole,
} from 'constants/essaRoles'
import { INVOICE_DASHBOARD } from 'constants/url'
import { SET_USER_INFO } from 'redux/constants/userInfoConstant'
import { setAuthSession } from 'utils/authStorage'
import { PageLoader } from 'components/Common/PageLoader'

const roleToUserTypeMap = {
  1: VENDOR_USER_TYPE,
  2: FINANCE_USER_TYPE,
  3: BUSINESS_USER_TYPE,
  4: ADMIN_USER_TYPE,
  ...ROLE_ID_TO_USER_TYPE,
}

function SsoCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [statusMessage, setStatusMessage] = useState('Completing SSO sign-in…')
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      toast.error('SSO login failed: missing authorization code or state.')
      navigate(`/${AUTH_SETUP}/login`, { replace: true })
      return
    }

    const completeSso = async () => {
      try {
        const res = await ssoCallback({ code, state })
        const userData = res?.data?.data || res?.data || {}
        const token = userData.token || ''

        if (!token) {
          throw new Error(res?.data?.message || 'SSO login failed: no token returned.')
        }

        const role_id = userData.role_id
        const userType = roleToUserTypeMap[role_id] || VENDOR_USER_TYPE

        setAuthSession({
          token,
          userType,
          vendorId: userData?.vendor_id || '',
          rememberMe: false,
        })
        persistEssaRole(role_id)

        dispatch({
          type: SET_USER_INFO,
          payload: {
            userType,
            email: userData?.email || '',
            id: userData?.id,
            roleId: role_id,
            isSupplier: userData?.Is_Supplier,
            isPoInline: userData?.Is_PO_Inline,
            fullName: userData?.name,
            Vendor_Role: userData?.Vendor_Role,
            isNonPoAccess: userData?.Non_PO_Access,
          },
        })

        navigate(`/${userType}${INVOICE_DASHBOARD}`, { replace: true })
      } catch (err) {
        console.error(err)
        const message =
          err?.response?.data?.message || err?.message || 'SSO login failed.'
        setStatusMessage(message)
        toast.error(message)
        navigate(`/${AUTH_SETUP}/login`, { replace: true })
      }
    }

    completeSso()
  }, [searchParams, navigate, dispatch])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        gap: '16px',
      }}
    >
      <PageLoader />
      <p style={{ margin: 0, color: '#4d4d4d' }}>
        {statusMessage}
      </p>
    </div>
  )
}

export default SsoCallback
