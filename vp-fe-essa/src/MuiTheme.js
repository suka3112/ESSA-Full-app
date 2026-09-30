import { createTheme } from "@mui/material/styles";

// Create a theme WITHOUT the default palette (only breakpoints)
export const MUITheme = createTheme({
  //direction:'rtl',
  typography: {
    fontFamily:
      "'Segoe UI', 'Segoe UI Variable Text', Inter, -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 760,  // Small Tablets
      md: 920,  // Tablets
      lg: 1024, // Medium Screens
      xl: 1280, // Large Screens
      xxl: 1440 // Extra Large Screens
    },
  },
  palette: {}, // 👈 Removes MUI default colors
});