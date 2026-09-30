/**
 * Brand Configuration
 *
 * This file contains all brand-specific configurations including:
 * - Brand names and display labels
 * - Logo paths for different contexts
 * - Theme colors
 * - Social media links
 * - External website URLs
 * - Footer copyright text
 */

// Import brand logos
import daikinLogo from '../assets/brands/daikin/logo.svg'
import daikinLogo2 from '../assets/brands/daikin/logo2.svg'
import daikinLogo3 from '../assets/brands/daikin/logo3.svg'
import daikinHeroImage from '../assets/brands/daikin/hero-image.svg'
import daikinThumbnail from '../assets/brands/daikin/thumbnail.png'
import daikinSidebarBg from '../assets/brands/daikin/sidebar-background.svg'

import avensysLogo from '../assets/brands/avensys/logo.svg'
import avensysLogo2 from '../assets/brands/avensys/logo2.svg'
import avensysLogo3 from '../assets/brands/avensys/logo3.svg'
import avensysFavicon from '../assets/brands/avensys/logo.webp'
import avensysHeroImage from '../assets/brands/avensys/hero-image.svg'
import avensysThumbnail from '../assets/brands/avensys/thumbnail.png'
import avensysSidebarBg from '../assets/brands/avensys/sidebar-background.svg'

import essaLogo from '../assets/brands/essa/logo.svg'
import essaLogo2 from '../assets/brands/essa/logo2.svg'
import essaLogo3 from '../assets/brands/essa/logo3.svg'
import essaFavicon from '../assets/brands/essa/favicon.svg'
import essaHeroImage from '../assets/brands/essa/hero-image.svg'
import essaThumbnail from '../assets/brands/essa/thumbnail.png'
import essaSidebarBg from '../assets/brands/essa/sidebar-background.svg'

/**
 * Brand configurations object
 * Each brand has its own configuration with all necessary assets and information
 */
export const BRAND_CONFIGS = {
  daikin: {
    id: 'daikin',
    name: 'Daikin',
    displayName: 'Daikin',

    // Logo assets for different contexts
    logos: {
      main: daikinLogo, // Main logo (used in header/navbar)
      sidebar: daikinLogo2, // Sidebar logo (compact version)
      auth: daikinLogo3 // Authentication pages logo
    },

    // Image assets
    images: {
      heroImage: daikinHeroImage, // Hero/banner image
      thumbnail: daikinThumbnail, // Video thumbnail
      sidebarBackground: daikinSidebarBg // Sidebar background image
    },

    // Theme colors (can be used for dynamic theming)
    theme: {
      primary: '#0F62AC', // Primary brand color
      secondary: '#003B71', // Secondary brand color
      accent: '#00A0E3' // Accent color
    },

    // Social media links
    socialMedia: {
      facebook: 'https://www.facebook.com/daikinmeagroup/',
      twitter: 'https://twitter.com/daikin_mea',
      linkedin: 'https://www.linkedin.com/company/daikin-middle-east-africa',
      youtube: 'https://www.youtube.com/channel/UC46JAqOlymW5jBo6B2ImQGg',
      instagram: 'https://www.instagram.com/daikinmea'
    },

    // Website and legal links
    website: {
      main: 'https://www.daikinmea.com/',
      legalNotice: 'https://www.daikinmea.com/en_us/legal-notice.html',
      cookieNotice: 'https://www.daikinmea.com/en_us/cookie-notice.html',
      dataProtection: 'https://www.daikinmea.com/en_us/data-protection-policy.html',
      corporateEthics: 'https://www.daikinmea.com/en_us/corporate-ethics.html'
    },

    // Footer and copyright information
    footer: {
      copyrightText: '© 2026 Daikin Middle East & Africa FZE. All rights reserved.',
      websiteDisplay: 'www.daikinmea.com'
    },

    // Brand messaging
    brandPitch: 'Daikin is a leading Air conditioning (AC) brand',
    brandStatement:
      'Daikin is the global leader in developing and manufacturing Air Conditioning,\nHeating, Ventilation (HVAC) and Refrigerant solutions for\nResidential, Commercial and Industrial applications.'
  },

  avensys: {
    id: 'avensys',
    name: 'Avensys',
    displayName: 'Avensys',

    // Logo assets for different contexts
    logos: {
      main: avensysLogo, // Main logo (used in header/navbar)
      sidebar: avensysLogo2, // Sidebar logo (compact version)
      auth: avensysLogo3, // Authentication pages logo
      favicon: avensysFavicon // Square favicon (browser tab icon)
    },

    // Image assets
    images: {
      heroImage: avensysHeroImage, // Hero/banner image
      thumbnail: avensysThumbnail, // Video thumbnail
      sidebarBackground: avensysSidebarBg // Sidebar background image
    },

    // Theme colors (can be used for dynamic theming)
    theme: {
      primary: '#6346B8', // Primary brand color (Material UI blue)
      secondary: '#5A4099', // Secondary brand color
      accent: '#EC6934' // Accent color
    },

    // Social media links
    socialMedia: {
      facebook: 'https://www.facebook.com/avensys',
      twitter: 'https://twitter.com/avensys',
      linkedin: 'https://www.linkedin.com/company/avensys',
      youtube: 'https://www.youtube.com/avensys',
      instagram: 'https://www.instagram.com/avensys'
    },

    // Website and legal links
    website: {
      main: 'https://www.avensys.com/',
      legalNotice: 'https://www.avensys.com/legal-notice',
      cookieNotice: 'https://www.avensys.com/cookie-notice',
      dataProtection: 'https://www.avensys.com/data-protection',
      corporateEthics: 'https://www.avensys.com/corporate-ethics'
    },

    // Footer and copyright information
    footer: {
      copyrightText: '© 2026 Avensys. All rights reserved.',
      websiteDisplay: 'www.avensys.com'
    },

    // Brand messaging
    brandPitch: 'Avensys helps enterprises deploy secure, scalable AI solutions.',
    brandStatement:
      'Avensys is among the leaders in providing technology enabled business solutions and services. Our in-depth technical knowledge coupled with industry experience and our unique methodologies enable us to successfully deliver and meet our customers expectations.'
  },

  essa: {
    id: 'essa',
    name: 'ESSA',
    displayName: 'ESSA',

    // Logo assets for different contexts
    logos: {
      main: essaLogo, // Main logo (used in header/navbar)
      sidebar: essaLogo2, // Sidebar logo (compact version)
      auth: essaLogo3, // Authentication pages logo
      favicon: essaFavicon // Square favicon (browser tab icon)
    },

    // Image assets
    images: {
      heroImage: essaHeroImage, // Hero/banner image
      thumbnail: essaThumbnail, // Video thumbnail
      sidebarBackground: essaSidebarBg // Sidebar background image
    },

    // Theme colors (can be used for dynamic theming)
    theme: {
      primary: '#2C9842', // Primary brand color (Material UI blue)
      secondary: '#2C6583', // Secondary brand color
      accent: '#2C9842' // Accent color
    },

    // Social media links
    socialMedia: {
      facebook: 'https://www.facebook.com/essa',
      twitter: 'https://twitter.com/essa',
      linkedin: 'https://www.linkedin.com/company/essa',
      youtube: 'https://www.youtube.com/essa',
      instagram: 'https://www.instagram.com/essa'
    },

    // Website and legal links
    website: {
      main: 'https://www.essa.id/',
      cookieNotice: 'https://www.essa.com/cookie-notice',
      dataProtection: 'https://www.essa.com/data-protection',
      corporateEthics: 'https://www.essa.com/',
      legalNotice: 'https://www.essa.com/corporate-ethics'
    },

    // Footer and copyright information
    footer: {
      copyrightText: '© 2026 ESSA. All rights reserved.',
      websiteDisplay: 'www.essa.id'
    },

    // Brand messaging
    brandPitch: 'ESSA is the largest private LPG Refinery and Ammonia Plant in Indonesia.',
    brandStatement:
      'Since 2007, ESSA has been operating the largest private LPG Refinery and Ammonia Plant in Indonesia. We use the most advanced and most efficient technology in the world in an effort to put Indonesia at the forefront of the LPG and Ammonia industry.'
  }
}

/**
 * Default brand to use if no brand is specified
 */
export const DEFAULT_BRAND = 'essa'

/**
 * Get brand configuration by brand ID
 * @param {string} brandId - Brand identifier
 * @returns {object} Brand configuration object
 */
export const getBrandConfig = (brandId) => {
  const normalizedBrandId = brandId?.toLowerCase()?.trim()
  return BRAND_CONFIGS[normalizedBrandId] || BRAND_CONFIGS[DEFAULT_BRAND]
}

/**
 * Get all available brand IDs
 * @returns {string[]} Array of brand IDs
 */
export const getAvailableBrands = () => {
  return Object.keys(BRAND_CONFIGS)
}

/**
 * Check if a brand ID is valid
 * @param {string} brandId - Brand identifier to check
 * @returns {boolean} True if brand exists
 */
export const isValidBrand = (brandId) => {
  const normalizedBrandId = brandId?.toLowerCase()?.trim()
  return normalizedBrandId && BRAND_CONFIGS.hasOwnProperty(normalizedBrandId)
}

export default BRAND_CONFIGS
