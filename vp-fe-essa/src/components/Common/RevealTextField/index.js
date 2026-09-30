import { IconButton as _IconButton, TextField as _TextField } from '@mui/material'
import { color } from 'services/colors'
import styled, { css } from 'styled-components'
import PropTypes from 'prop-types'
import { IMaskInput } from 'react-imask'
import { forwardRef } from 'react'

//STYLES
const TextField = styled(_TextField)`
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button {
    display: none;
  }
  .MuiFilledInput-underline {
    &::after,
    &::before {
      display: none;
    }
    &.Mui-error {
      border: 1px solid #eb5757;
    }
  }
  .MuiFilledInput-root {
    background-color: white;
    border: 1px solid ${color.brandColor.primary['800']};
    border-radius: 8px;
  }
  .MuiFormLabel-root.Mui-error {
    color: #666666;
  }
  .Mui-disabled {
    background: #f2f2f2;
    color: #151515;
  }
  ${({ $active }) =>
    $active &&
    css`
      .MuiIconButton-edgeEnd {
        display: none;
      }
    `}
`

const TextMaskCustom = forwardRef(function TextMaskCustom(props, ref) {
  const { onChange, ...other } = props
  return (
    <IMaskInput
      {...other}
      mask="(#00) 000-0000"
      definitions={{
        '#': /[1-9]/
      }}
      inputRef={ref}
      onAccept={(value) => onChange({ target: { name: props.name, value } })}
      overwrite
    />
  )
})

TextMaskCustom.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
}

export const RevealTextField = ({
  icon,
  size,
  variant,
  isPhoneNumber,
  disabled,
  ...inputProps
}) => {
  const inputStyle = { WebkitBoxShadow: '0 0 0 1000px white inset', margin: 'auto 4px' }
  const disableStyle = {
    WebkitBoxShadow: 'rgb(221 221 221 / 14%) 0px 0px 0px 1000px inset',
    margin: '0px'
  }
  return (
    <>
      {isPhoneNumber ? (
        <TextField
          inputProps={{ style: disabled ? disableStyle : inputStyle }}
          {...inputProps}
          autoComplete="new-password"
          size={size}
          variant={variant}
          $active={icon}
          id="formatted-text-mask-input"
          InputProps={{
            inputComponent: TextMaskCustom
          }}
        />
      ) : (
        <TextField
          inputProps={{ style: disabled ? disableStyle : inputStyle }}
          disabled={disabled}
          {...inputProps}
          autoComplete="new-password"
          size={size}
          variant={variant}
          $active={icon}
        />
      )}
    </>
  )
}

RevealTextField.propTypes = {
  icon: PropTypes.bool,
  size: PropTypes.string,
  variant: PropTypes.string,
  isPhoneNumber: PropTypes.bool,
  disabled: PropTypes.bool
}

RevealTextField.defaultProps = {
  icon: false,
  size: 'small',
  variant: 'filled',
  isPhoneNumber: false,
  disabled: false
}
