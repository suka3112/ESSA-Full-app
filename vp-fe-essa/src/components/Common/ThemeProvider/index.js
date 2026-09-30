import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'
import PropTypes from 'prop-types'

export const ThemeProvider = ({ children, theme }) => {
  return (
    <MuiThemeProvider theme={theme}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </MuiThemeProvider>
  )
}
ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
  theme: PropTypes.object
}
ThemeProvider.defaultProps = {
  theme: {}
}
