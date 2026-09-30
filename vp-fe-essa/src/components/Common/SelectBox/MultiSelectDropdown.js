import React, { useState, useRef } from 'react';
import {
  Box,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  TextField,
  Popper,
  Paper,
  ClickAwayListener,
  InputAdornment,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';

const MultiSelectDropdown = ({ options = [], selectedValues = [], onChange, placeholder = 'Select', inputHeight = 45,className }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);
  const [inputWidth, setInputWidth] = useState(240);
  const [isFocused, setIsFocused] = useState(false);
  const isPopperOpen = Boolean(anchorEl);
  const isActive = isFocused || isPopperOpen;
  const { t,i18n } = useTranslation(['vendors']);
    const isArabic = i18n.language === "ar";
  // Update inputWidth when input is rendered or resized
  React.useEffect(() => {
    if (inputRef.current) {
      setInputWidth(inputRef.current.offsetWidth);
    }
  }, [anchorEl]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchTerm('');
  };

  const handleSelectChange = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if all filtered options are selected
  const allSelected = filteredOptions.length > 0 && filteredOptions.every(option => 
    selectedValues.includes(option.label)
  );

  // Check if some filtered options are selected
  const someSelected = filteredOptions.some(option => 
    selectedValues.includes(option.label)
  );

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all filtered options
      const newSelectedValues = selectedValues.filter(value => 
        !filteredOptions.some(option => option.label === value)
      );
      onChange(newSelectedValues);
    } else {
      // Select all filtered options
      const filteredLabels = filteredOptions.map(option => option.label);
      const newSelectedValues = [...new Set([...selectedValues, ...filteredLabels])];
      onChange(newSelectedValues);
    }
  };

  const open = Boolean(anchorEl);
  const displayText = selectedValues.length ? selectedValues.join(', ') : '';

  return (
    <Box sx={{ minWidth: "100%", position: 'relative' }}>
      <OutlinedInput
        readOnly
        onClick={handleOpen}
        onFocus={() => setIsFocused(true)}    // <-- Set focus true
                    onBlur={() => setIsFocused(false)}
        ref={inputRef}
        value={displayText}
        placeholder={placeholder}
        sx={{
          cursor: 'pointer',
          height: `${inputHeight}px !important`,
          minHeight: `${inputHeight}px !important`,
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '1rem',
          fontWeight: 400,
           border: isActive ? "1.5px solid #1565c0" : "1px solid #929398", // <-- Blue border on focus
            boxShadow: isActive ? '0 0 0 2px rgba(21,101,192,0.08)' : 'none', // <-- Blue shadow on focus
          color: selectedValues.length ? '#030303;' : 'rgba(0, 0, 0, 0.6)',
          '&& .MuiOutlinedInput-input': {
            height: `${inputHeight - 2}px !important`,
            minHeight: `${inputHeight - 2}px !important`,
     
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ccc',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#888',
          },
          '& input::placeholder': {
  color: 'rgba(0, 0, 0, 0.6)',
  fontSize: '1rem',
  opacity: 1, // prevent default browser dimming
},
        }}
        className={`custom-multi-select-dropdown ${className}`}
        endAdornment={
          <KeyboardArrowDownIcon
            sx={{
              position: 'absolute',
              right: !isArabic ? 10 : '',
              left: isArabic ? 10 : '',
              pointerEvents: 'none',
              backgroundColor: '#fff',
              borderRadius: '50%',
              padding: '2px',
              marginRight: '4px',
            }}
          />
        }
      />

      <Popper open={open} anchorEl={anchorEl} placement="bottom-start" style={{ zIndex: 1300, width: inputWidth }}>
        <ClickAwayListener onClickAway={handleClose}>
          <Paper sx={{ width: inputWidth }}>
            {/* Sticky Search */}
            <Box
              sx={{
                p: 1,
                borderBottom: '1px solid #ddd',
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
                value={searchTerm}
                 sx={{
                    "& .MuiOutlinedInput-root": {
                      border: "1px solid #929398",
                      borderRadius: "4px",
                      background: "#fafafa",
                      fontSize: "1rem",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      color: "#888",
                      opacity: 1,
                      fontSize: '1rem'
                    },
                  }}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Scrollable Options */}
            <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {filteredOptions.length > 0 ? (
                <>
                  {/* Select All Option */}
                  <MenuItem
                    onClick={handleSelectAll}
                    sx={{
                      borderBottom: '1px solid #eee',
                      backgroundColor: '#f8f9fa',
                      fontWeight: 500,
                      padding: '5px 16px',
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
                  {/* Individual Options */}
                  {filteredOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      onClick={() => handleSelectChange(option.label)}
                      sx={{ padding: '5px 16px' }}
                    >
                      <Checkbox 
                        checked={selectedValues.includes(option.label)} 
                        sx={{ padding: '5px' }}
                      />
                      <ListItemText primary={option.label} />
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
    </Box>
  );
};

export default MultiSelectDropdown;
