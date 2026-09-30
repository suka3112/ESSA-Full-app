import React, { useState, useRef, useEffect } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import {
  SearchContainer,
  SearchInputTable,
  SearchIconWrapper,
  Dropdown,
  DropdownItem
} from 'components/Common/TableComponent/TableComponent.style'
import { TCCheckBox } from '../TableComponent/TableComponent.mui.style'
import { useTranslation } from 'react-i18next'

const SearchInput = ({ placeholder, showDropdown = false, onChange, searchValue }) => {
  const [selectedOptions, setSelectedOptions] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRef = useRef(null)
  const { i18n } = useTranslation()
const isArabic = i18n.language === 'ar'

  // Sample options (replace with real data if needed, e.g., from an API)
  const options = ['INV001', 'INV002', 'INV003', 'INV004'] // Adjusted to invoice numbers

  const handleInputClick = () => {
    if (showDropdown) {
      setDropdownOpen(true)
    }
  }

  // In SearchInput
  const handleInputChange = (event) => {
    if (!showDropdown) {
      const value = event.target.value
      // setSearchValue(value)
      if (onChange) {
        clearTimeout(window.searchTimeout)
        window.searchTimeout = setTimeout(() => onChange(value), 1000) // 300ms delay
      }
    }
  }

  const handleOptionChange = (option) => {
    const newSelectedOptions = selectedOptions.includes(option)
      ? selectedOptions.filter((item) => item !== option)
      : [...selectedOptions, option]
    setSelectedOptions(newSelectedOptions)
    if (onChange) {
      onChange(newSelectedOptions) // Notify parent of selected options
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <SearchContainer ref={searchRef}>
      <SearchIconWrapper isArabic={isArabic}>
        <SearchIcon sx={{ fontSize: 16 }} />
      </SearchIconWrapper>
      <SearchInputTable
        type="text"
        placeholder={placeholder}
        value={showDropdown ? selectedOptions.join(', ') : searchValue}
        onClick={handleInputClick}
        onChange={handleInputChange}
        readOnly={showDropdown}
        isArabic={isArabic}
      />
      {showDropdown && dropdownOpen && (
        <Dropdown>
          {options.map((option, index) => (
            <DropdownItem key={index}>
              <TCCheckBox
                checked={selectedOptions.includes(option)}
                onChange={() => handleOptionChange(option)}
              />
              <label>{option}</label>
            </DropdownItem>
          ))}
        </Dropdown>
      )}
    </SearchContainer>
  )
}

export default SearchInput
