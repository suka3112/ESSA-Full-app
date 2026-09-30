import { FormControlLabel as MuiFormControlLabel, Checkbox as MuiCheckbox } from '@mui/material'
import PropTypes from 'prop-types'

export const Checkbox = ({
  bold = true,
  color = 'primary',
  label,
  disabled,
  lableFontSize = '16px',
  ...checkboxProps
}) => {
  return (
    <MuiFormControlLabel
      disabled={disabled}
      control={<MuiCheckbox color={color} {...checkboxProps} />}
      label={label}
      $bold={bold}
      sx={{
        '& .MuiFormControlLab`e`l-label': {
          fontSize: lableFontSize
        }
      }}
      style={{ margin: !label && '0px' }}
    />
  )
}

Checkbox.propTypes = {
  bold: PropTypes.bool,
  color: PropTypes.string,
  label: PropTypes.string,
  disabled: PropTypes.bool,
  lableFontSize: PropTypes.string
}

Checkbox.defaultProps = {
  bold: true,
  color: '',
  label: null,
  disabled: false,
  lableFontSize: '16px'
}
