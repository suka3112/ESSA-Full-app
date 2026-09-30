import { createTheme } from '@mui/material/styles'
import { color } from './colors'

// DEFAULT THEME FOR ENTIRE APPLICATION
const theme = createTheme({
  palette: {
    primary: {
      main: color.brandColor.secondary['main']
    },
    secondary: {
      main: color.brandColor.secondary['main']
    }
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920
    }
  },
  typography: {
  }
})

export default theme
