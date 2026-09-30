import { useEffect, useRef } from 'react'
import { logout } from 'services/utilities'

const useAutoLogout = (timeoutMs = 60 * 60 * 1000) => {
  const timerRef = useRef(null)
  const sawTokenRef = useRef(Boolean(localStorage.getItem('token') || sessionStorage.getItem('token')))

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'click', 'scroll']

    const startTimer = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        try {
          logout()
        } catch (err) {
          console.error('Auto-logout error:', err)
        }
      }, timeoutMs)
    }

    const resetTimer = () => {
      // only reset when auth token exists
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (token) startTimer()
    }

    // attach event listeners always — they will only start timer when token exists
    events.forEach((ev) => window.addEventListener(ev, resetTimer))

    // If token exists now, start the timer immediately
    if (sawTokenRef.current) startTimer()

    // Poll for token changes in the same page (storage event doesn't fire in same window)
    const pollInterval = setInterval(() => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const hadToken = sawTokenRef.current
      const hasToken = Boolean(token)
      if (!hadToken && hasToken) {
        // logged in without refresh — initialize timer
        sawTokenRef.current = true
        startTimer()
      } else if (hadToken && !hasToken) {
        // logged out — clear timer
        sawTokenRef.current = false
        clearTimeout(timerRef.current)
      }
    }, 500)

    return () => {
      clearTimeout(timerRef.current)
      clearInterval(pollInterval)
      events.forEach((ev) => window.removeEventListener(ev, resetTimer))
    }
  }, [timeoutMs])
}

export default useAutoLogout
