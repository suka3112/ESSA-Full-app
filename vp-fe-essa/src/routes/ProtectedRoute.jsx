import { Navigate, useLocation } from 'react-router-dom'
import { AUTH_SETUP } from 'constants/userType'
import { isAuthenticated, isLocalLogout, isPublicPath } from 'utils/authStorage'

const ProtectedRoute = ({ children }) => {
  const location = useLocation()

  if (!isAuthenticated() && !isPublicPath(location.pathname)) {
    const from = location.pathname + location.search
    sessionStorage.setItem('essaReturnUrl', from)
    const loginPath = isLocalLogout()
      ? `/${AUTH_SETUP}/login?sso=logged_out`
      : `/${AUTH_SETUP}/login`
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from }}
      />
    )
  }

  return children
}

export default ProtectedRoute
