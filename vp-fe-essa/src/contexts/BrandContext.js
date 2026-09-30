/**
 * Brand Context
 *
 * Provides brand configuration throughout the application using React Context API.
 * This context handles:
 * - Reading brand from URL parameters
 * - Storing brand in localStorage for persistence
 * - Providing brand configuration to all components
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getBrandConfig, DEFAULT_BRAND, isValidBrand } from '../config/brandConfig'

const BrandContext = createContext()

/**
 * Convert hex color to rgba string
 * @param {string} hex - Hex color (e.g., '#017ebd')
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} rgba color string
 */
const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const faviconTypeFromHref = (href) => {
  const path = String(href).split('?')[0].toLowerCase()
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.ico')) return 'image/x-icon'
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  return ''
}

const appendFaviconLink = (href, { rel = 'icon', sizes } = {}) => {
  if (!href) return
  const faviconLink = document.createElement('link')
  faviconLink.rel = rel
  faviconLink.type = faviconTypeFromHref(href) || 'image/png'
  faviconLink.href = href
  if (sizes) faviconLink.setAttribute('sizes', sizes)
  document.head.appendChild(faviconLink)
}

const applyBrandFavicon = (faviconHref) => {
  if (!faviconHref) return
  // Chrome often ignores href updates on an existing <link rel="icon">.
  // Replace the node so the tab icon is forced to reload.
  document.querySelectorAll("link[rel*='icon']").forEach((el) => el.remove())
  const href = String(faviconHref)
  const isSvg = href.split('?')[0].toLowerCase().endsWith('.svg')
  // Chrome often fails to paint complex SVG tab icons; pair Avensys SVG with its PNG.
  if (isSvg && /AvensysFavicon\.svg/i.test(href)) {
    appendFaviconLink('/AvensysFavicon.png?v=avensys', { sizes: '32x32 48x48 64x64' })
    appendFaviconLink(`${href}${href.includes('?') ? '&' : '?'}v=avensys`, { sizes: 'any' })
    return
  }

  appendFaviconLink(href)
}

/**
 * Brand Provider Component
 * Wraps the application and provides brand context to all children
 */
export const BrandProvider = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [brandConfig, setBrandConfig] = useState(null)
  const [brandId, setBrandId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Get brand from environment variable
   */
  const getBrandFromEnv = () => {
    return process.env.REACT_APP_BRAND
  }

  /**
   * Extract brand from URL parameters (for development/testing override)
   */
  const getBrandFromURL = () => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get('brand')
  }

  /**
   * Initialize or update brand based on environment variable and URL parameters
   */
  useEffect(() => {
    const envBrand = getBrandFromEnv()
    const urlBrand = getBrandFromURL()

    let selectedBrand = DEFAULT_BRAND

    // Priority: URL parameter (dev override) > Environment variable > default
    if (urlBrand && isValidBrand(urlBrand)) {
      // URL parameter takes precedence (useful for development/testing)
      selectedBrand = urlBrand.toLowerCase().trim()
    } else if (envBrand && isValidBrand(envBrand)) {
      // Use environment variable (production)
      selectedBrand = envBrand.toLowerCase().trim()
    }

    // Update brand configuration
    const config = getBrandConfig(selectedBrand)
    setBrandId(selectedBrand)
    setBrandConfig(config)
    setIsLoading(false)

    // Optional: Update document title with brand name
    document.title = `${config.displayName} AP Automation`

    applyBrandFavicon(config.logos?.favicon)

    // Optional: Add brand as data attribute to body for CSS styling
    document.body.setAttribute('data-brand', selectedBrand)

    // Set CSS custom properties for theme colors on root element
    if (config.theme) {
      const root = document.documentElement
      root.style.setProperty('--brand-primary-color', config.theme.primary)
      root.style.setProperty('--brand-secondary-color', config.theme.secondary)
      root.style.setProperty('--brand-accent-color', config.theme.accent)

      // Create a lighter version of primary color (20% opacity) for backgrounds
      const primaryColor = config.theme.primary
      const lightPrimary = hexToRgba(primaryColor, 0.2)
      root.style.setProperty('--brand-primary-color-light', lightPrimary)
    }
  }, [location.search])

  /**
   * Manually change the brand (useful for brand switcher component in development)
   * Note: This adds a URL parameter override and works only in development
   */
  const changeBrand = (newBrandId) => {
    if (!isValidBrand(newBrandId)) {
      console.error(`Invalid brand: ${newBrandId}`)
      return
    }

    const normalizedBrandId = newBrandId.toLowerCase().trim()
    const config = getBrandConfig(normalizedBrandId)

    setBrandId(normalizedBrandId)
    setBrandConfig(config)

    applyBrandFavicon(config.logos?.favicon)

    // Update CSS custom properties for theme colors
    if (config.theme) {
      const root = document.documentElement
      root.style.setProperty('--brand-primary-color', config.theme.primary)
      root.style.setProperty('--brand-secondary-color', config.theme.secondary)
      root.style.setProperty('--brand-accent-color', config.theme.accent)

      // Create a lighter version of primary color (20% opacity) for backgrounds
      const primaryColor = config.theme.primary
      const lightPrimary = hexToRgba(primaryColor, 0.2)
      root.style.setProperty('--brand-primary-color-light', lightPrimary)
    }

    // Add URL parameter for development override
    const searchParams = new URLSearchParams(location.search)
    searchParams.set('brand', normalizedBrandId)
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true })
  }

  const contextValue = {
    brandConfig,
    brandId,
    isLoading,
    changeBrand
  }

  // Don't render children until brand is loaded
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw'
        }}>
        <div>Loading...</div>
      </div>
    )
  }

  return <BrandContext.Provider value={contextValue}>{children}</BrandContext.Provider>
}

/**
 * Custom hook to use brand context
 * Usage: const { brandConfig, brandId, changeBrand } = useBrand();
 */
export const useBrand = () => {
  const context = useContext(BrandContext)

  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider')
  }

  return context
}

export default BrandContext
