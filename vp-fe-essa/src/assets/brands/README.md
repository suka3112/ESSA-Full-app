# Brand Assets

This folder contains brand-specific assets for multi-brand support.

## Folder Structure

Each brand has its own folder with the following assets:

```
brands/
├── daikin/
│   ├── logo.svg              # Main logo (header/navbar)
│   ├── logo2.svg             # Sidebar logo (compact)
│   ├── logo3.svg             # Auth pages logo
│   ├── hero-image.svg        # Hero/banner image
│   ├── thumbnail.png         # Video thumbnail
│   └── sidebar-background.svg # Sidebar background
└── avensys/
    ├── logo.svg              # Main logo (header/navbar)
    ├── logo2.svg             # Sidebar logo (compact)
    ├── logo3.svg             # Auth pages logo
    ├── hero-image.svg        # Hero/banner image
    ├── thumbnail.png         # Video thumbnail
    └── sidebar-background.svg # Sidebar background
```

## Adding a New Brand

1. Create a new folder with the brand name (lowercase)
2. Add all required assets following the naming convention above
3. Update `src/config/brandConfig.js` with the new brand configuration
4. Add brand-specific translations if needed

## Asset Guidelines

- **Logos**: SVG format preferred for scalability
- **Images**: SVG for graphics, PNG/JPG for photos
- **Thumbnails**: PNG format, recommended size: 800x450px
- **Background images**: SVG or high-quality PNG

## Current Brands

- **Daikin**: Default brand, fully configured
- **Avensys**: Placeholder assets - replace with actual Avensys assets
