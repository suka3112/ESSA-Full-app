import React, { useState, useMemo, useEffect } from 'react'
import {
  TableDropDownLabel,
  TableHeaderDropdown
} from './TableComponent.style'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import OutlinedInput from '@mui/material/OutlinedInput'
import Popper from '@mui/material/Popper'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

export const TableSelectBox = ({
  label,
  options = [],
  width = '100%',
  multiSelect = false,
  onFilterChange,
  isCurrency = false,
  value = '',
  placeholder,
  paramName
}) => {
  const [selectedValues, setSelectedValues] = useState(
    multiSelect ? (Array.isArray(value) ? value : []) : value
  )
  const { t } = useTranslation(['soa'])
  const [searchTerm, setSearchTerm] = useState('')
  const [anchorEl, setAnchorEl] = useState(null)
  const inputRef = React.useRef(null)
  const [inputWidth, setInputWidth] = useState(145)
  const [isFocused, setIsFocused] = useState(false);
  const isPopperOpen = Boolean(anchorEl);
  const isActive = isFocused || isPopperOpen;
  React.useEffect(() => {
    if (inputRef.current) {
      setInputWidth(inputRef.current.offsetWidth)
    }
  }, [anchorEl])

  // Keep internal state in sync with external value prop
  useEffect(() => {
    if (multiSelect) {
      setSelectedValues(Array.isArray(value) ? value : [])
    } else {
      setSelectedValues(value)
    }
  }, [value, multiSelect])

  const labelToQueryKey = (label) => {
    switch (label?.toLowerCase()) {
      case 'currency':
        return 'currency'
      case 'created by':
        return 'created_by'
      case 'Created By':
        return 'created_by'
      case 'Assigned Person':
        return 'assigned_person'
      case 'date':
        return 'invoice_date'
      case 'sort':
        return 'sort_column'
      case 'search':
        return 'search'
      case 'vendor name / code':
        return 'vendor_code'
      default:
        return label?.toLowerCase().replace(' ', '_')
    }
  }

  const filteredOptions = useMemo(() => {
    return options?.filter((option) =>
      option?.label?.toLowerCase().includes(searchTerm?.toLowerCase())
    )
  }, [options, searchTerm])

  const getLabelForValue = (val) => {
    const found = options.find((opt) => opt.value === val)
    return found ? found.label : val
  }

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
    setSearchTerm('')
  }

  const handleSelect = (option) => {
    handleClose()
    setSelectedValues(option.value)
    onFilterChange({ [paramName || labelToQueryKey(label)]: option.value })
  }

  const handleCheckboxChange = (optionValue) => {
    const newValues = selectedValues?.includes(optionValue)
      ? selectedValues?.filter((item) => item !== optionValue)
      : [...selectedValues, optionValue]
    setSelectedValues(newValues)
    onFilterChange({ [paramName || labelToQueryKey(label)]: newValues })
  }

  // Check if all filtered options are selected
  const allSelected = multiSelect && filteredOptions.length > 0 && filteredOptions.every(option =>
    selectedValues?.includes(option.value)
  )

  // Check if some filtered options are selected
  const someSelected = multiSelect && filteredOptions.some(option =>
    selectedValues?.includes(option.value)
  )

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all filtered options
      const newSelectedValues = selectedValues?.filter(value =>
        !filteredOptions.some(option => option.value === value)
      )
      setSelectedValues(newSelectedValues)
      onFilterChange({ [labelToQueryKey(label)]: newSelectedValues })
    } else {
      // Select all filtered options
      const filteredValues = filteredOptions.map(option => option.value)
      const newSelectedValues = [...new Set([...selectedValues, ...filteredValues])]
      setSelectedValues(newSelectedValues)
      onFilterChange({ [labelToQueryKey(label)]: newSelectedValues })
    }
  }

  // For multiSelect, keep old logic. For single, use custom Popper.
  return (
    <TableHeaderDropdown>
      <TableDropDownLabel>{label}</TableDropDownLabel>
      <FormControl sx={{ width: width }}>
        <OutlinedInput
          readOnly
          onClick={handleOpen}
          onFocus={() => setIsFocused(true)}    // <-- Set focus true
          onBlur={() => setIsFocused(false)}     // <-- Set focus false
          ref={inputRef}
          value={multiSelect
            ? (selectedValues.length
              ? selectedValues.map((val) => getLabelForValue(val)).join(', ')
              : (placeholder || label))
            : (selectedValues ? getLabelForValue(selectedValues) : (placeholder || label))}
          placeholder={placeholder}
          sx={{
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            width: '100%',
            minWidth: '100%',
            '@media (min-width:1440px)': {
              minWidth: '145px',
              maxWidth: '145px'
            },
            // padding: '0px !important',
            background: '#FCFCFC',
            cursor: 'pointer',
            border: isActive ? "1.5px solid #1565c0" : "1px solid #929398", // <-- Blue border on focus
            boxShadow: isActive ? '0px 1px 4px 0px #82d5ff80' : 'none',
          }}
          endAdornment={<KeyboardArrowDownIcon sx={{ pointerEvents: 'none' }} />}
        />
        <Popper open={Boolean(anchorEl)} anchorEl={anchorEl} placement="bottom-start" style={{ zIndex: 1300, width: isCurrency ? '200px' : inputWidth }}>
          <ClickAwayListener onClickAway={handleClose}>
            <Paper sx={{ width: isCurrency ? '200px' : inputWidth, bgcolor: '#fff' }}>
              {/* Sticky Search */}
              <Box
                sx={{
                  p: 1,
                  borderBottom: '1px solid rgb(152, 162, 179)',
                  position: 'sticky',
                  top: 0,
                  background: '#fff',
                  zIndex: 1,
                }}
              >
                <TextField
                  placeholder={t('search')}
                  size="small"
                  fullWidth
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '4px',
                      background: '#fafafa',
                      fontSize: '13px',
                      border: '1px solid rgb(152, 162, 179)',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: '#888',
                      opacity: 1,
                    },
                  }}
                  onClick={e => e.stopPropagation()}
                />
              </Box>
              {/* Scrollable Options */}
              <Box sx={{ maxHeight: 180, overflowY: 'auto' }}>
                {filteredOptions.length > 0 ? (
                  <>
                    {/* Select All Option for multiSelect */}
                    {multiSelect && (
                      <MenuItem
                        onClick={handleSelectAll}
                        sx={{
                          borderBottom: '1px solid #eee',
                          backgroundColor: '#f8f9fa',
                          color: '#202224',
                          fontWeight: 500,
                          padding: '5px 16px',
                          minHeight: '40px',

                        }}
                      >
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected && !allSelected}
                          sx={{ padding: '6px' }}
                        />
                        <ListItemText
                          primary="Select All"
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                      </MenuItem>
                    )}
                    {/* Individual Options */}
                    {filteredOptions.map((option, i) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                        selected={option.value === selectedValues}
                        onClick={() => multiSelect
                          ? handleCheckboxChange(option.value)
                          : handleSelect(option)
                        }
                        sx={{
                          color: '#202224',
                          fontSize: '14px',
                          fontWeight: '500',
                          opacity: multiSelect ? 1 : 0.85,
                          minHeight: '40px',
                          whiteSpace: 'normal',
                          wordWrap: 'break-word',
                          padding: '8px 16px',
                        }}
                      >
                        {multiSelect && (
                          // <TCCheckBox checked={selectedValues?.includes(option.value)} />
                          <Checkbox
                            checked={selectedValues?.includes(option.value)}
                            sx={{ padding: '6px' }}
                          />
                        )}
                        {option.label}
                      </MenuItem>
                    ))}
                  </>
                ) : (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      No matching results
                    </Typography>
                  </MenuItem>
                )}
              </Box>
            </Paper>
          </ClickAwayListener>
        </Popper>
      </FormControl>
    </TableHeaderDropdown>
  )
}
