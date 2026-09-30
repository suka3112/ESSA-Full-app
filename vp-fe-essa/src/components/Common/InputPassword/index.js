import { IconButton as _IconButton, TextField as _TextField } from '@mui/material'
import { useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { color } from 'services/colors'
import Icon from 'services/icon'

//STYLES
const IconButton = styled(_IconButton)`
  .MuiTypography-caption {
    background: #ddf7ff;
    border-radius: 4px;
    font-size: 0.75rem;
    padding: 3px 6px;
    margin-right: 8px;
    color: ${color.brandColor.primary['200']};
  }
`
const TextField = styled(_TextField)`
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
  ${({ $active }) =>
    $active &&
    css`
      .MuiIconButton-edgeEnd {
        display: none;
      }
    `}
`

export const InputPassword = ({ id, label, error, ...inputProps }) => {
  const inputStyle = { WebkitBoxShadow: '0 0 0 1000px white inset', margin: 'auto 4px' }
  const [showPassword, setShowPassword] = useState(false)

  const handleToggle = useCallback(() => {
    setShowPassword(!showPassword)
  }, [showPassword])

  return (
    <TextField
      inputProps={{ style: inputStyle }}
      {...inputProps}
      type={showPassword ? 'text' : 'password'}
      id={id}
      label={label}
      error={error}
      autoComplete="off"
      size="small"
      fullWidth
      variant="filled"
      InputProps={{
        endAdornment: (
          <IconButton onClick={handleToggle}>
            <Icon iconName={showPassword ? 'visibility' : 'visibility_off'} iconColor="#000" />
          </IconButton>
        )
      }}
    />
  )
}

InputPassword.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  error: PropTypes.bool
}
InputPassword.defaultProps = {
  id: '',
  label: '',
  error: false
}
