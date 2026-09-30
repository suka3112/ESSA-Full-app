# Multi-Brand Support Documentation

## Overview

This application now supports multiple brands through a flexible configuration system. You can switch between brands using URL parameters, and the application will dynamically load the appropriate logos, colors, social media links, and other brand-specific content.

## Supported Brands

- **Daikin** (default)
- **Avensys**

## How to Use

### Switching Brands via URL

Add the `brand` parameter to any URL:

```
# For Daikin (default)
http://localhost:3000/vendor/login?brand=daikin

# For Avensys
http://localhost:3000/vendor/login?brand=avensys
```

The brand selection persists across page navigation and is stored in localStorage for future visits.

### Programmatic Brand Switching

You can also switch brands programmatically using the `useBrand` hook:

```javascript
import { useBrand } from 'contexts/BrandContext'

function MyComponent() {
  const { brandConfig, brandId, changeBrand } = useBrand()

  // Change brand programmatically
  const handleBrandChange = () => {
    changeBrand('avensys')
  }

  return (
    <div>
      <h1>{brandConfig.displayName}</h1>
      <img src={brandConfig.logos.main} alt="logo" />
    </div>
  )
}
```

## Architecture

### 1. Brand Configuration (`src/config/brandConfig.js`)

Central configuration file containing all brand-specific settings:

- **Logos**: Different logo variants for various contexts (main, sidebar, auth)
- **Images**: Hero images, thumbnails, backgrounds
- **Theme Colors**: Primary, secondary, and accent colors
- **Social Media Links**: Facebook, Twitter, LinkedIn, YouTube, Instagram
- **Website URLs**: Main website and legal pages
- **Footer Information**: Copyright text and website display

### 2. Brand Context (`src/contexts/BrandContext.js`)

React Context that provides brand configuration throughout the app:

- Reads brand from URL parameters
- Stores brand preference in localStorage
- Provides brand configuration to all components
- Handles brand switching

### 3. Brand Assets (`src/assets/brands/`)

Organized folder structure for brand-specific assets:

```
brands/
├── daikin/
│   ├── logo.svg
│   ├── logo2.svg
│   ├── logo3.svg
│   ├── hero-image.svg
│   ├── thumbnail.png
│   └── sidebar-background.svg
└── avensys/
    ├── logo.svg
    ├── logo2.svg
    ├── logo3.svg
    ├── hero-image.svg
    ├── thumbnail.png
    └── sidebar-background.svg
```

## Adding a New Brand

### Step 1: Add Brand Assets

1. Create a new folder in `src/assets/brands/` with the brand name (lowercase)
2. Add all required assets following the naming convention:
   - `logo.svg` - Main logo (header/navbar)
   - `logo2.svg` - Sidebar logo (compact)
   - `logo3.svg` - Auth pages logo
   - `hero-image.svg` - Hero/banner image
   - `thumbnail.png` - Video thumbnail
   - `sidebar-background.svg` - Sidebar background

### Step 2: Update Brand Configuration

Add the new brand configuration to `src/config/brandConfig.js`:

```javascript
import newBrandLogo from '../assets/brands/newbrand/logo.svg'
// ... import other assets

export const BRAND_CONFIGS = {
  // ... existing brands

  newbrand: {
    id: 'newbrand',
    name: 'NewBrand',
    displayName: 'New Brand',

    logos: {
      main: newBrandLogo,
      sidebar: newBrandLogo2,
      auth: newBrandLogo3
    },

    images: {
      heroImage: newBrandHeroImage,
      thumbnail: newBrandThumbnail,
      sidebarBackground: newBrandSidebarBg
    },

    theme: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#666666'
    },

    socialMedia: {
      facebook: 'https://facebook.com/newbrand',
      twitter: 'https://twitter.com/newbrand',
      linkedin: 'https://linkedin.com/company/newbrand',
      youtube: 'https://youtube.com/newbrand',
      instagram: 'https://instagram.com/newbrand'
    },

    website: {
      main: 'https://www.newbrand.com/',
      legalNotice: 'https://www.newbrand.com/legal',
      cookieNotice: 'https://www.newbrand.com/cookies',
      dataProtection: 'https://www.newbrand.com/privacy',
      corporateEthics: 'https://www.newbrand.com/ethics'
    },

    footer: {
      copyrightText: '© 2026 New Brand. All rights reserved.',
      websiteDisplay: 'www.newbrand.com'
    }
  }
}
```

### Step 3: Update Translations (Optional)

If your brand requires specific translations, update the translation files in `public/languages/locales/`.

### Step 4: Test

Test the new brand by navigating to:

```
http://localhost:3000/vendor/login?brand=newbrand
```

## Components Using Brand Configuration

The following components have been updated to use dynamic branding:

1. **AuthLayout** (`src/layouts/auth/AuthLayout.js`)
   - Logo
   - Hero image/thumbnail
   - Footer links
   - Social media links

2. **AdminLayout** (`src/layouts/admin/AdminLayout.js`)
   - Sidebar logo
   - Sidebar background
   - Social media links

3. **CommonLayout** (`src/layouts/common/CommonLayout.js`)
   - Footer copyright
   - Website link
   - Social media links (with fallback to entity-specific links)

4. **SidebarContainer** (`src/components/Common/SidebarContainer/index.jsx`)
   - Main logo

## Best Practices

### 1. Always Use the useBrand Hook

```javascript
import { useBrand } from 'contexts/BrandContext'

function MyComponent() {
  const { brandConfig } = useBrand()

  return <img src={brandConfig.logos.main} alt="logo" />
}
```

### 2. Provide Fallbacks

When using brand configuration, always provide fallbacks:

```javascript
const logoSrc = brandConfig?.logos?.main || defaultLogo
```

### 3. Use Brand Colors in Styles

You can access brand colors for dynamic theming:

```javascript
const { brandConfig } = useBrand()

const styles = {
  backgroundColor: brandConfig.theme.primary,
  color: brandConfig.theme.secondary
}
```

### 4. Translation Interpolation

Use translation interpolation for brand names:

```javascript
const { t } = useTranslation('login')
const { brandConfig } = useBrand()

// In translation file: "brand_statement": "{{brandName}} is the global leader..."
t('brand_statement', { brandName: brandConfig.displayName })
```

## API Reference

### useBrand Hook

```typescript
const {
  brandConfig, // Current brand configuration object
  brandId, // Current brand ID (string)
  isLoading, // Loading state (boolean)
  changeBrand // Function to change brand: (brandId: string) => void
} = useBrand()
```

### Brand Configuration Object

```typescript
{
  id: string
  name: string
  displayName: string
  logos: {
    main: string
    sidebar: string
    auth: string
  }
  images: {
    heroImage: string
    thumbnail: string
    sidebarBackground: string
  }
  theme: {
    primary: string
    secondary: string
    accent: string
  }
  socialMedia: {
    facebook: string
    twitter: string
    linkedin: string
    youtube: string
    instagram: string
  }
  website: {
    main: string
    legalNotice: string
    cookieNotice: string
    dataProtection: string
    corporateEthics: string
  }
  footer: {
    copyrightText: string
    websiteDisplay: string
  }
}
```

## Troubleshooting

### Brand Not Switching

1. Check if the brand ID is valid (lowercase, no spaces)
2. Clear localStorage: `localStorage.removeItem('selectedBrand')`
3. Check browser console for errors
4. Verify brand configuration exists in `brandConfig.js`

### Assets Not Loading

1. Verify asset paths in `brandConfig.js`
2. Check if assets exist in `src/assets/brands/[brandname]/`
3. Ensure assets are properly imported
4. Check browser network tab for 404 errors

### Translation Not Working

1. Verify translation keys exist in both `en` and `ar` locale files
2. Check if you're using the correct namespace
3. Ensure you're passing the `brandName` parameter for interpolation

## Future Enhancements

Potential improvements for the multi-brand system:

1. **Dynamic Theme Loading**: Load CSS variables based on brand colors
2. **Brand-Specific Routes**: Different routing configurations per brand
3. **Brand Switcher Component**: UI component for easy brand switching
4. **Brand-Specific Features**: Enable/disable features based on brand
5. **Analytics Integration**: Track brand-specific metrics
6. **A/B Testing**: Test different brand configurations

## Support

For questions or issues related to multi-brand support, please contact the development team or refer to the main project documentation.

---

**Last Updated**: March 9, 2026
**Version**: 1.0.0
