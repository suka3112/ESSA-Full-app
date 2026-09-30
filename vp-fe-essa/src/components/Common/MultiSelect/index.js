import { Box } from '@mui/material'
import Select, { components } from 'react-select'
import { color } from 'services/colors'
import Icon from 'services/icon'
import PropTypes from 'prop-types'

export const MultiSelect = ({
  options,
  placeholder,
  isClear,
  valueContain,
  handleInputChange,
  ...props
}) => {
  const CustomClearText = () => (
    <Icon iconName="close" iconColor={isClear ? '#fff' : color.textColor['800']} />
  )

  const ClearIndicator = (props) => {
    const {
      children = <CustomClearText />,
      innerProps: { ref, ...restInnerProps }
    } = props
    return (
      <Box {...restInnerProps} ref={ref}>
        <Box style={{ marginTop: '5px', marginRight: '5px' }}>{children}</Box>
      </Box>
    )
  }

  const customStyles = {
    control: (base) => ({
      ...base,
      minHeight: '55px',
      height: 'auto'
    }),
    menu: (base) => ({ ...base, zIndex: 99 })
  }

  const DropdownIndicator = (props) => {
    return (
      components.DropdownIndicator && (
        <components.DropdownIndicator {...props}>
          <Icon iconName={props.selectProps.menuIsOpen ? 'search' : 'arrow_drop_down'} />
        </components.DropdownIndicator>
      )
    )
  }

  return (
    <Select
      onInputChange={handleInputChange}
      // menuIsOpen={false}
      {...props}
      styles={customStyles}
      placeholder={placeholder}
      isMulti
      options={options}
      closeMenuOnSelect={true}
      components={{ DropdownIndicator, ClearIndicator }}
    />
  )
}
MultiSelect.propTypes = {
  options: PropTypes.array,
  placeholder: PropTypes.string,
  children: PropTypes.node.isRequired,
  innerProps: PropTypes.string,
  selectProps: PropTypes.string,
  isClear: PropTypes.bool,
  valueContain: PropTypes.bool,
  handleInputChange: PropTypes.func
}
MultiSelect.defaultProps = {
  options: [],
  placeholder: '',
  innerProps: '',
  selectProps: '',
  isClear: false,
  valueContain: false
}
