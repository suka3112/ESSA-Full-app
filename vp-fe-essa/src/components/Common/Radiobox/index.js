import { FormControlLabel as MuiFormControlLabel, Radio as MuiRadio } from '@mui/material'
import styled from 'styled-components'
import { color } from 'services/colors'
import PropTypes from 'prop-types'

//STYLES
const FormControlLabel = styled(MuiFormControlLabel)`
  margin: 0;
  .MuiFormControlLabel-label {
    font-size: 0.875rem;
    color: ${color.brandColor.primary['400']};
    font-weight: normal;
    margin-left: ${({ theme }) => theme.spacing(1.5)}px;
    ${(props) => props.theme.breakpoints.up('xs')} {
      font-size: 1.125rem;
    }
  }
`
const Radio = styled(MuiRadio)`
  padding: 0px;
`

export const Radiobox = ({
  className,
  formControlLabelProps,
  label,
  labelPlacement = 'end',
  checked = false,
  ...radioboxProps
}) => {
  return (
    <FormControlLabel
      {...formControlLabelProps}
      className={className}
      labelPlacement={labelPlacement}
      control={<Radio checked={checked} disableRipple {...radioboxProps} />}
      label={label}
    />
  )
}
Radiobox.propTypes = {
  className: PropTypes.string,
  formControlLabelProps: PropTypes.string,
  label: PropTypes.string,
  labelPlacement: PropTypes.string,
  checked: PropTypes.bool
}
Radiobox.defaultProps = {
  className: '',
  formControlLabelProps: '',
  label: '',
  labelPlacement: '',
  checked: false
}
