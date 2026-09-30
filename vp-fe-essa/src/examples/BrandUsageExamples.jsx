/**
 * Brand Usage Examples
 * 
 * This file contains examples of how to use the multi-brand system
 * in different scenarios. Copy and adapt these examples for your needs.
 */

import React from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useTranslation } from 'react-i18next';

/**
 * Example 1: Basic Brand Information Display
 */
export const BrandInfoExample = () => {
  const { brandConfig, brandId } = useBrand();
  
  return (
    <div>
      <h1>{brandConfig.displayName}</h1>
      <p>Current Brand ID: {brandId}</p>
      <img src={brandConfig.logos.main} alt={`${brandConfig.displayName} logo`} />
    </div>
  );
};

/**
 * Example 2: Using Brand Colors for Styling
 */
export const BrandColorExample = () => {
  const { brandConfig } = useBrand();
  
  const styles = {
    container: {
      backgroundColor: brandConfig.theme.primary,
      color: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
    },
    button: {
      backgroundColor: brandConfig.theme.accent,
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
    },
  };
  
  return (
    <div style={styles.container}>
      <h2>Brand Themed Component</h2>
      <button style={styles.button}>
        Action Button
      </button>
    </div>
  );
};

/**
 * Example 3: Conditional Rendering Based on Brand
 */
export const BrandConditionalExample = () => {
  const { brandId, brandConfig } = useBrand();
  
  return (
    <div>
      {brandId === 'daikin' && (
        <div>
          <h2>Daikin Specific Content</h2>
          <p>This content only shows for Daikin brand</p>
        </div>
      )}
      
      {brandId === 'avensys' && (
        <div>
          <h2>Avensys Specific Content</h2>
          <p>This content only shows for Avensys brand</p>
        </div>
      )}
      
      <div>
        <h3>Common Content for All Brands</h3>
        <p>Welcome to {brandConfig.displayName}</p>
      </div>
    </div>
  );
};

/**
 * Example 4: Brand Switcher Component
 */
export const BrandSwitcherExample = () => {
  const { brandId, changeBrand } = useBrand();
  
  const handleBrandChange = (event) => {
    changeBrand(event.target.value);
  };
  
  return (
    <div>
      <label htmlFor="brand-select">Select Brand: </label>
      <select 
        id="brand-select"
        value={brandId} 
        onChange={handleBrandChange}
      >
        <option value="daikin">Daikin</option>
        <option value="avensys">Avensys</option>
      </select>
    </div>
  );
};

/**
 * Example 5: Using Brand Messaging from Config
 */
export const BrandTranslationExample = () => {
  const { brandConfig } = useBrand();
  
  return (
    <div>
      <h1>{brandConfig.brandStatement}</h1>
      <p>{brandConfig.brandPitch}</p>
    </div>
  );
};

/**
 * Example 6: Brand-Specific Social Media Links
 */
export const BrandSocialMediaExample = () => {
  const { brandConfig } = useBrand();
  
  return (
    <div className="social-media-links">
      <h3>Follow {brandConfig.displayName}</h3>
      <div className="social-icons">
        <a 
          href={brandConfig.socialMedia.facebook} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Facebook
        </a>
        <a 
          href={brandConfig.socialMedia.twitter} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Twitter
        </a>
        <a 
          href={brandConfig.socialMedia.linkedin} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <a 
          href={brandConfig.socialMedia.youtube} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          YouTube
        </a>
        <a 
          href={brandConfig.socialMedia.instagram} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Instagram
        </a>
      </div>
    </div>
  );
};

/**
 * Example 7: Brand-Specific Footer
 */
export const BrandFooterExample = () => {
  const { brandConfig } = useBrand();
  const { t } = useTranslation('footer');
  
  return (
    <footer>
      <div className="footer-left">
        <p>{brandConfig.footer.copyrightText}</p>
        <a href={brandConfig.website.legalNotice} target="_blank" rel="noopener noreferrer">
          {t('legalNotice')}
        </a>
        <a href={brandConfig.website.cookieNotice} target="_blank" rel="noopener noreferrer">
          {t('cookieNotice')}
        </a>
        <a href={brandConfig.website.dataProtection} target="_blank" rel="noopener noreferrer">
          {t('dataPrivacy')}
        </a>
      </div>
      <div className="footer-right">
        <a 
          href={brandConfig.website.main} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          {brandConfig.footer.websiteDisplay}
        </a>
      </div>
    </footer>
  );
};

/**
 * Example 8: Multiple Logo Variants
 */
export const BrandLogoVariantsExample = () => {
  const { brandConfig } = useBrand();
  
  return (
    <div>
      <div>
        <h3>Main Logo (Header/Navbar)</h3>
        <img 
          src={brandConfig.logos.main} 
          alt="Main logo" 
          style={{ maxWidth: '200px' }}
        />
      </div>
      
      <div>
        <h3>Sidebar Logo (Compact)</h3>
        <img 
          src={brandConfig.logos.sidebar} 
          alt="Sidebar logo" 
          style={{ maxWidth: '150px' }}
        />
      </div>
      
      <div>
        <h3>Auth Page Logo</h3>
        <img 
          src={brandConfig.logos.auth} 
          alt="Auth logo" 
          style={{ maxWidth: '250px' }}
        />
      </div>
    </div>
  );
};

/**
 * Example 9: Brand-Aware Custom Hook
 */
export const useBrandTheme = () => {
  const { brandConfig } = useBrand();
  
  return {
    primaryColor: brandConfig.theme.primary,
    secondaryColor: brandConfig.theme.secondary,
    accentColor: brandConfig.theme.accent,
    
    // Helper functions
    getPrimaryStyle: () => ({
      backgroundColor: brandConfig.theme.primary,
      color: '#ffffff',
    }),
    
    getSecondaryStyle: () => ({
      backgroundColor: brandConfig.theme.secondary,
      color: '#ffffff',
    }),
    
    getAccentStyle: () => ({
      backgroundColor: brandConfig.theme.accent,
      color: '#ffffff',
    }),
  };
};

/**
 * Example 10: Using Brand Theme Hook
 */
export const BrandThemeHookExample = () => {
  const theme = useBrandTheme();
  
  return (
    <div>
      <div style={theme.getPrimaryStyle()}>
        Primary Themed Box
      </div>
      <div style={theme.getSecondaryStyle()}>
        Secondary Themed Box
      </div>
      <div style={theme.getAccentStyle()}>
        Accent Themed Box
      </div>
    </div>
  );
};

/**
 * Example 11: Loading State Handling
 */
export const BrandLoadingExample = () => {
  const { brandConfig, isLoading } = useBrand();
  
  if (isLoading) {
    return <div>Loading brand configuration...</div>;
  }
  
  return (
    <div>
      <h1>Welcome to {brandConfig.displayName}</h1>
      <img src={brandConfig.logos.main} alt="logo" />
    </div>
  );
};

/**
 * Example 12: Brand-Specific API Endpoints (Advanced)
 */
export const useBrandAPI = () => {
  const { brandId } = useBrand();
  
  const getAPIEndpoint = (path) => {
    // Example: Different API endpoints per brand
    const baseURLs = {
      daikin: 'https://api.daikin.com',
      avensys: 'https://api.avensys.com',
    };
    
    return `${baseURLs[brandId] || baseURLs.daikin}${path}`;
  };
  
  return { getAPIEndpoint };
};

export default {
  BrandInfoExample,
  BrandColorExample,
  BrandConditionalExample,
  BrandSwitcherExample,
  BrandTranslationExample,
  BrandSocialMediaExample,
  BrandFooterExample,
  BrandLogoVariantsExample,
  useBrandTheme,
  BrandThemeHookExample,
  BrandLoadingExample,
  useBrandAPI,
};
