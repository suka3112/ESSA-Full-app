# SVG Dynamic Theming Setup Guide

This guide explains how to add new SVG icons to the dynamic theming system so they automatically change colors based on the current brand theme.

## Overview

The SVG theming system allows icons to automatically adapt their colors when users switch between brands (Daikin, Avensys, etc.). Icons use the brand's primary color from `brandConfig.js`.

## Architecture

- **ThemedSVG**: Wrapper component that applies brand colors to SVG components
- **SVGIcon**: Centralized registry component for all themed icons
- **SVGR**: Converts SVG files to React components (built into Create React App 5+)
- **BrandContext**: Provides current brand's theme colors

## Step-by-Step Guide

### Step 1: Prepare Your SVG File

1. **Place your SVG file** in `src/assets/icons/` directory
2. **Update the SVG to use `currentColor`** instead of hardcoded colors:

   **Before:**
   ```svg
   <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
     <path d="..." fill="#2D2C2C"/>
   </svg>
   ```

   **After:**
   ```svg
   <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
     <path d="..." fill="currentColor"/>
   </svg>
   ```

3. **Common color replacements:**
   - `fill="#2D2C2C"` → `fill="currentColor"`
   - `fill="#202224"` → `fill="currentColor"`
   - `fill="black"` → `fill="currentColor"`
   - `stroke="#2D2C2C"` → `stroke="currentColor"`

   **Note:** If your SVG has multiple colors that should remain fixed (e.g., multi-color logos), only replace the colors that should be themed.

### Step 2: Add Icon to SVGIcon Registry

1. **Open** `src/components/Common/SVGIcon/index.jsx`

2. **Import your SVG as a React component** at the top of the file:
   ```jsx
   import { ReactComponent as YourIconName } from '../../../assets/icons/your-icon.svg';
   ```

3. **Add it to the iconRegistry object:**
   ```jsx
   const iconRegistry = {
     // ... existing icons
     yourIconName: YourIconName,  // Add your icon here
   };
   ```

   **Example:**
   ```jsx
   import { ReactComponent as SettingsIcon } from '../../../assets/icons/settings.svg';
   
   const iconRegistry = {
     dashboard: DashboardIcon,
     myProfile: MyProfileIcon,
     // ... other icons
     settings: SettingsIcon,  // New icon added
   };
   ```

### Step 3: Use the Icon in Your Component

Replace direct SVG imports with the `SVGIcon` component:

**Before:**
```jsx
import myIcon from '../../../assets/icons/my-icon.svg';

function MyComponent() {
  return (
    <div>
      <img src={myIcon} alt="icon" />
    </div>
  );
}
```

**After:**
```jsx
import SVGIcon from '../Common/SVGIcon';

function MyComponent() {
  return (
    <div>
      <SVGIcon name="myIconName" size={22} />
    </div>
  );
}
```

## SVGIcon Component API

### Basic Usage

```jsx
<SVGIcon name="dashboard" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | **required** | Icon name from registry (e.g., "dashboard", "invoice") |
| `size` | `number \| string` | `undefined` | Icon size in pixels (e.g., `22` or `"24px"`) |
| `colorType` | `'primary' \| 'secondary' \| 'accent'` | `'primary'` | Which theme color to use |
| `fill` | `string` | `undefined` | Override fill color (overrides theme color) |
| `stroke` | `string` | `undefined` | Override stroke color (overrides theme color) |
| `useThemeColor` | `boolean` | `true` | Whether to apply theme color |
| `className` | `string` | `''` | Additional CSS classes |
| `style` | `object` | `{}` | Additional inline styles |
| `...props` | `any` | - | Other props passed to the SVG component |

### Examples

#### Basic Icon
```jsx
<SVGIcon name="dashboard" />
```

#### Sized Icon
```jsx
<SVGIcon name="invoice" size={24} />
```

#### Icon with Custom Class
```jsx
<SVGIcon 
  name="settings" 
  size={20} 
  className="menu-icon" 
/>
```

#### Icon Using Secondary Theme Color
```jsx
<SVGIcon 
  name="payment" 
  colorType="secondary" 
  size={22} 
/>
```

#### Icon with Override Color (No Theme)
```jsx
<SVGIcon 
  name="tooltip" 
  fill="#9F9F9F" 
  useThemeColor={false}
  size={12} 
/>
```

#### Icon with Custom Styling
```jsx
<SVGIcon 
  name="chevronDown" 
  size={24}
  className="arrow-icon rotate"
  style={{ transition: 'transform 0.3s ease' }}
/>
```

## Complete Example: Adding a New Settings Icon

### 1. Prepare the SVG File

**File:** `src/assets/icons/settings.svg`

```svg
<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M11 12C11.5523 12 12 11.5523 12 11C12 10.4477 11.5523 10 11 10C10.4477 10 10 10.4477 10 11C10 11.5523 10.4477 12 11 12Z" fill="currentColor"/>
  <path d="M11 8C11.5523 8 12 7.55228 12 7C12 6.44772 11.5523 6 11 6C10.4477 6 10 6.44772 10 7C10 7.55228 10.4477 8 11 8Z" fill="currentColor"/>
  <path d="M11 16C11.5523 16 12 15.5523 12 15C12 14.4477 11.5523 14 11 14C10.4477 14 10 14.4477 10 15C10 15.5523 10.4477 16 11 16Z" fill="currentColor"/>
</svg>
```

### 2. Add to Registry

**File:** `src/components/Common/SVGIcon/index.jsx`

```jsx
// Add import at top
import { ReactComponent as SettingsIcon } from '../../../assets/icons/settings.svg';

// Add to registry
const iconRegistry = {
  dashboard: DashboardIcon,
  myProfile: MyProfileIcon,
  // ... existing icons
  settings: SettingsIcon,  // New icon
};
```

### 3. Use in Component

```jsx
import SVGIcon from '../Common/SVGIcon';

function SettingsPage() {
  return (
    <div>
      <SVGIcon name="settings" size={22} />
      <h1>Settings</h1>
    </div>
  );
}
```

## Best Practices

### 1. Icon Naming Convention
- Use camelCase for icon names in the registry
- Match the icon name to its purpose (e.g., `settings`, `userProfile`, `downloadFile`)
- Keep names descriptive and consistent

### 2. SVG File Preparation
- Always use `currentColor` for themed elements
- Keep `viewBox` attribute for proper scaling
- Remove hardcoded `width` and `height` if you want flexible sizing (or keep them for fixed size)
- Ensure SVG has proper `xmlns` attribute

### 3. Size Management
- Use the `size` prop for consistent sizing
- Match sizes to existing design system (common: 18px, 22px, 24px)
- Use CSS classes for responsive sizing when needed

### 4. Color Usage
- Use `colorType="primary"` for most icons (default)
- Use `colorType="secondary"` for less prominent icons
- Use `colorType="accent"` for highlighted/important icons
- Override with `fill` prop only when necessary

### 5. Performance
- Only add icons you actually use
- Keep SVG files optimized (remove unnecessary metadata)
- Use appropriate sizes (don't use large icons and scale down)

## Troubleshooting

### Icon Not Appearing

1. **Check icon name spelling** - Must match registry key exactly
2. **Verify SVG file exists** - Check path in import statement
3. **Check console for warnings** - SVGIcon will warn if icon not found
4. **Verify SVG uses currentColor** - Hardcoded colors won't theme

### Icon Wrong Size

1. **Check size prop** - Ensure it's a number (e.g., `22` not `"22px"`)
2. **Check CSS overrides** - External CSS might be overriding
3. **Check SVG viewBox** - Ensure viewBox is correct for scaling

### Icon Not Changing Color

1. **Verify SVG uses currentColor** - Check SVG file content
2. **Check useThemeColor prop** - Should be `true` (default)
3. **Verify brandConfig has theme colors** - Check `src/config/brandConfig.js`
4. **Check BrandContext** - Ensure component is within BrandProvider

### Icon Appears Distorted

1. **Check viewBox** - SVG should have proper viewBox attribute
2. **Check aspect ratio** - Ensure width/height maintain aspect ratio
3. **Remove hardcoded dimensions** - Let size prop control dimensions

## Available Icons

Current icons in the registry:

- `dashboard`
- `myProfile`
- `soa`
- `po`
- `invoice`
- `inquires`
- `vendors`
- `payment`
- `faq`
- `chevronDown`
- `userManagement`
- `uploadedImg`
- `pdf`
- `tooltip`
- `upload`
- `uploadWhite`
- `xls`

To see all available icons programmatically:

```jsx
import SVGIcon from '../Common/SVGIcon';

const availableIcons = SVGIcon.getAvailableIcons();

// Check if icon exists
if (SVGIcon.hasIcon('myIcon')) {
  // Icon exists
}
```

## Advanced Usage

### Custom ThemedSVG Component

If you need more control, use `ThemedSVG` directly:

```jsx
import ThemedSVG from '../Common/ThemedSVG';
import { ReactComponent as CustomIcon } from '../../../assets/icons/custom.svg';

function MyComponent() {
  return (
    <ThemedSVG
      src={CustomIcon}
      size={24}
      colorType="secondary"
      className="custom-icon"
    />
  );
}
```

### Dynamic Icon Selection

```jsx
function DynamicIcon({ iconType }) {
  const iconMap = {
    file: 'pdf',
    image: 'uploadedImg',
    document: 'invoice',
  };
  
  return <SVGIcon name={iconMap[iconType] || 'dashboard'} size={22} />;
}
```

## Migration Checklist

When migrating existing SVG usage:

- [ ] Update SVG file to use `currentColor`
- [ ] Add icon to SVGIcon registry
- [ ] Replace `<img src={icon} />` with `<SVGIcon name="iconName" />`
- [ ] Update size to match original (check CSS)
- [ ] Test icon appears correctly
- [ ] Test icon changes color when switching brands
- [ ] Remove old SVG import statement
- [ ] Update any related CSS if needed

## Support

For issues or questions:
1. Check this documentation
2. Review existing icon implementations in `SidebarContainer` or `FileIcons`
3. Check `ThemedSVG` and `SVGIcon` component source code
4. Verify `brandConfig.js` has correct theme colors

## Related Files

- `src/components/Common/ThemedSVG/index.jsx` - Core theming component
- `src/components/Common/SVGIcon/index.jsx` - Icon registry
- `src/utils/svgHelpers.js` - Utility functions
- `src/config/brandConfig.js` - Theme color definitions
- `src/contexts/BrandContext.js` - Brand context provider
