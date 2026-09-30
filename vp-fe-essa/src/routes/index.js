import React, { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'
import { ToastContainer as _ToastContainer } from 'react-toastify'
import { color } from 'services/colors'
import styled, { createGlobalStyle } from 'styled-components'
import Routers from './routes'
import * as VendorPages from '../pages/vendorPages'
import * as FinancePages from '../pages/financePages'
import * as BusinessPages from '../pages/businessPage'
import * as AdminPages from '../pages/adminPages'
import * as Layout from '../layouts'
import NotFoundPage from 'pages/NotFoundPage'
import ProtectedRoute from './ProtectedRoute'
import { connect, useDispatch } from 'react-redux'
import { AUTH_SETUP, VENDOR_USER_TYPE } from 'constants/userType'
import { INVOICE_DASHBOARD } from 'constants/url'
import { PageLoader } from 'components/Common/PageLoader'
import { fetchEntraSession } from 'api/Login'
import {
  applyEntraSessionUser,
  getAuthToken,
  getStoredUserType,
  isAuthenticated,
  isLocalLogout,
  isPublicPath,
} from 'utils/authStorage'

const AllPages = {
  ...VendorPages,
  ...FinancePages,
  ...BusinessPages,
  ...AdminPages
}

const ToastContainer = styled(_ToastContainer)`
  .Toastify__toast--success:not(.essa-toast-wrap) {
    background: ${color.textColor['500']};
  }
  .Toastify__toast.essa-toast-wrap {
    background: transparent;
    box-shadow: none;
    padding: 0;
    min-height: unset;
    font-weight: 400;
  }
  .Toastify__toast:not(.essa-toast-wrap) {
    box-shadow: none;
    font-weight: 700;
    font-size: 0.875rem;
    min-width: 380px;
    padding: 12px 22px;
    border-radius: 8px;
    div:last-child {
      padding-left: 10px;
    }
  }
`

const GlobalStyle = createGlobalStyle`
  * {
    scrollbar-width: thin; 
    scrollbar-color: #bebebe #E5E5E5; 
  }
  *::-webkit-scrollbar {
    width: 8px;
    height: 14px;
  }
`

const buildFullPath = (path, childPath) =>
  `${path}${childPath.startsWith('/') ? childPath : `/${childPath}`}`

const RoutesComponent = ({ userInfo: { userType } }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(
    () => !window.location.pathname.includes('/entra/complete')
  )
  const sessionReady = useRef(false)

  const getDashboardPath = () => {
    const user = getStoredUserType() || userType || VENDOR_USER_TYPE
    return `/${user}${INVOICE_DASHBOARD}`
  }

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      const currentPath = location.pathname
      const isEntraComplete = currentPath.includes('/entra/complete')

      if (
        !sessionReady.current &&
        !getAuthToken() &&
        !isEntraComplete &&
        !isLocalLogout()
      ) {
        try {
          const res = await fetchEntraSession()
          const userData = res?.data?.data || res?.data || {}
          if (userData?.id && !cancelled) {
            applyEntraSessionUser(userData, dispatch)
          }
        } catch {
          // No Entra session cookie — stay on the current unauthenticated flow.
        }
      }
      sessionReady.current = true

      if (cancelled) return

      const signedIn = isAuthenticated()

      if (currentPath === `/${AUTH_SETUP}/login` && signedIn && !isLocalLogout()) {
        navigate(getDashboardPath(), { replace: true })
      } else if (currentPath === '/') {
        navigate(signedIn ? getDashboardPath() : `/${AUTH_SETUP}/login`, { replace: true })
      } else if (!signedIn && !isPublicPath(currentPath)) {
        const from = currentPath + location.search
        sessionStorage.setItem('essaReturnUrl', from)
        const loginPath = isLocalLogout()
          ? `/${AUTH_SETUP}/login?sso=logged_out`
          : `/${AUTH_SETUP}/login`
        navigate(loginPath, { replace: true, state: { from } })
      }

      setLoading(false)
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [navigate, location.pathname, userType, dispatch])

  if (loading) {
    return (
      <>
        <GlobalStyle />
        <div
          style={{
            display: 'flex',
            height: '100vh',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
          <PageLoader />
        </div>
      </>
    )
  }

  const routeElements = []

  Routers.forEach(({ component, path, childrens = [], redirect }, key) => {
    if (redirect) {
      routeElements.push(
        <Route key={`redirect-${key}`} path={path} element={<Navigate to={redirect} replace />} />
      )
      return
    }

    if (!childrens.length) {
      return
    }

    const LayoutComponent = Layout[component]

    childrens.forEach(({ component: ChildComponent, path: childPath }, index) => {
      const fullPath = buildFullPath(path, childPath)
      const PageComponent = AllPages[ChildComponent]
      const needsAuth = !isPublicPath(fullPath)

      const pageElement =
        LayoutComponent && PageComponent ? (
          <LayoutComponent>
            <PageComponent />
          </LayoutComponent>
        ) : (
          <NotFoundPage />
        )

      routeElements.push(
        <Route
          key={`${key}-${index}-${fullPath}`}
          path={fullPath}
          element={needsAuth ? <ProtectedRoute>{pageElement}</ProtectedRoute> : pageElement}
        />
      )
    })
  })

  return (
    <>
      <GlobalStyle />
      <ToastContainer autoClose={4500} position="top-right" newestOnTop limit={4} />
      <Routes>
        <Route path="/" element={<Navigate to={`/${AUTH_SETUP}/login`} replace />} />
        {routeElements}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

RoutesComponent.propTypes = {
  permission: PropTypes.array,
  userInfo: PropTypes.object
}

RoutesComponent.defaultProps = {
  permission: null
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo || {}
})

const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(RoutesComponent)
