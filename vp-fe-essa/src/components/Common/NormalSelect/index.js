import PropTypes from 'prop-types'
import Select, { components } from 'react-select'
import React, { useState } from 'react'
import Icon from 'services/icon'
import { Box, Typography } from '@mui/material'
import styled from 'styled-components'
import { connect } from 'react-redux'

const { ValueContainer, Placeholder } = components

const CustomValueContainer = ({ children, ...props }) => {
  return (
    <ValueContainer {...props}>
      <Placeholder {...props} isFocused={props.isFocused}>
        {props.selectProps.placeholder}
      </Placeholder>
      {React.Children.map(children, (child) =>
        child && child.type !== Placeholder ? child : null
      )}
    </ValueContainer>
  )
}

const IconWrapper = styled(Typography).attrs({ variant: 'caption' })`
  position: absolute;
  top: 50%;
  right: 46px;
  transform: translateY(-50%);
  z-index: 9;
  display: flex;
  align-items: center;
`

const NormalSelectComp = ({
  options = [],
  placeholder,
  value,
  handleChange,
  error,
  isLocation,
  isRestrictLocation,
  disabled,
  isCustomStyle,
  handleInputChange,
  isCustomMenuHeight,
  isHeight,
  locationRestrict,
  setMenuOpenState,
  noBackground,
  ...props
}) => {
  const [isDropdownFocused, setIsDropdownFocused] = useState(false)

  return (
    <Box sx={{ position: 'relative' }}>
      {isDropdownFocused ? (
        <IconWrapper>
          <Icon iconName="search" iconColor="#808080" />
        </IconWrapper>
      ) : (
        ''
      )}
      <div style={{ display: 'none' }}>
        <input type="text" name="prevent_autofill" id="prevent_autofill" value="" readOnly />
      </div>
      <Select
        inputProps={{ autoComplete: 'new-password' }}
        onMenuOpen={() => {
          setIsDropdownFocused(true)
          setMenuOpenState(true)
        }}
        onMenuClose={() => {
          setIsDropdownFocused(false)
          setMenuOpenState(false)
        }}
        onInputChange={handleInputChange}
        isDisabled={disabled || (isRestrictLocation && locationRestrict === 0)}
        value={value?.length > 0 ? value : isLocation ? [{ label: 'All', value: 'all' }] : []}
        {...props}
        error={error}
        options={options}
        components={{
          ValueContainer: CustomValueContainer
        }}
        placeholder={placeholder}
        styles={{
          menu: (base) => ({ ...base, zIndex: 99 }),
          control: (provided) => ({
            ...provided,
            height: '45px',
            border: error && '1px solid #eb5757'
          }),
          container: (provided) => ({
            ...provided,
            marginTop: 1
          }),
          valueContainer: (provided) => ({
            ...provided,
            overflow: 'visible'
          }),
          placeholder: (provided, state) => ({
            ...provided,
            position: 'absolute',
            top: state.hasValue || state.selectProps.inputValue ? -17 : '',
            transition: 'top 0.1s, font-size 0.1s',
            fontSize: isCustomStyle ? 15 : (state.hasValue || state.selectProps.inputValue) && 13,
            background: noBackground ? 'transparent' : !disabled && '#fff'
          }),
          menuList: (base) => ({
            ...base,
            height: (isCustomMenuHeight && '120px') || (isHeight && isHeight)
          })
        }}
        onChange={handleChange}
      />
    </Box>
  )
}

let mapStateToProps = (state) => {
  return { locationRestrict: state.commonStore.locationRestrict }
}

CustomValueContainer.propTypes = {
  children: PropTypes.node,
  isFocused: PropTypes.string,
  selectProps: PropTypes.node
}

NormalSelectComp.propTypes = {
  options: PropTypes.array,
  placeholder: PropTypes.string,
  value: PropTypes.array,
  handleChange: PropTypes.func,
  handleInputChange: PropTypes.func,
  error: PropTypes.bool,
  isLocation: PropTypes.bool,
  disabled: PropTypes.bool,
  isCustomStyle: PropTypes.bool,
  isCustomMenuHeight: PropTypes.bool,
  isHeight: PropTypes.string,
  locationRestrict: PropTypes.number,
  isRestrictLocation: PropTypes.bool,
  setMenuOpenState: PropTypes.func,
  noBackground: PropTypes.bool
}
NormalSelectComp.defaultProps = {
  error: false,
  isLocation: false,
  isCustomStyle: false,
  isCustomMenuHeight: false,
  isRestrictLocation: false,
  setMenuOpenState: () => {},
  noBackground: false
}

export const NormalSelect = connect(mapStateToProps, null)(NormalSelectComp)
