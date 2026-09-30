import { Typography as _Typography } from '@mui/material'
import { color } from 'services/colors'
import styled from 'styled-components'
import PropTypes from 'prop-types'

//STYLES
const Typography = styled(_Typography)`
  position: relative;
  top: 5px;
  color: ${color.textColor['800']};
  font-weight: 400;
  font-size: 0.875rem;
`

export const FormError = ({ message, ...props }) => {
  return (
    <Typography variant="caption" {...props}>
      {message}
    </Typography>
  )
}
FormError.propTypes = {
  message: PropTypes.string
}
FormError.defaultProps = {
  message: ''
}
