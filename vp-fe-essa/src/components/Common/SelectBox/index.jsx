// SelectBox.js
import React, { useState, useRef, useEffect } from "react";
import {
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText,
} from "@mui/material";
import "./SelectBox.scss";
import Tooltip from "@mui/material/Tooltip";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import tooltip from "../../../assets/icons/tooltip.svg";
import { useTranslation } from "react-i18next";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  OutlinedInput,
  Popper,
  Paper,
  ClickAwayListener,
  Typography,
} from "@mui/material";

export const SelectBox = ({
  value,
  onChange,
  options,
  name,
  isRequired = false,
  fullWidth = true,
  placeholder,
  className,
  error,
  selectPlaceholderText,
  minHeight = "45px",
  minWidth = "100%",
  disabled,
  titleLabel = "",
  labelSize = "1rem",
  tooltipMessage = "",
  tooltipIcon = false,
  fontFamily = "inherit",
  styles = {},
  height,
  disableOptions = false,
  bgColor = "#fff",
  isEntity = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const inputRef = useRef(null);
  const [inputWidth, setInputWidth] = useState(240);
  const [dynamicWidth, setDynamicWidth] = useState(null);
  const { t,i18n } = useTranslation(['vendors', 'enquiries']);
  const isArabic = i18n.language === "ar";
  const [isFocused, setIsFocused] = useState(false);
  const isPopperOpen = Boolean(anchorEl);
  const isActive = isFocused || isPopperOpen;

  useEffect(() => {
    if (inputRef.current) {
      setInputWidth(inputRef.current.offsetWidth);
    }
  }, [anchorEl]);

  // Filter options based on searchTerm
  const filteredOptions = options?.filter((option) =>
    option.label?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpen = (event) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
      setIsFocused(true);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchTerm("");
    setIsFocused(false);
  };

  const handleSelect = (option) => {
    handleClose();
    // mimic MUI Select's event signature
    onChange({
      target: {
        name,
        value: option.value,
      },
    });
  };

  const selectedOption = options?.find((opt) => opt.value == value);
  const displayText = selectedOption ? selectedOption.label : "";

  // Calculate dynamic width based on selected option text
  useEffect(() => {
    if (isEntity) {
      if (selectedOption) {
        // Create a temporary canvas to measure text width using the actual computed font
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Try to read the computed font from the input element for accurate rem scaling
        const inputElement = inputRef.current;
        const computed = inputElement ? window.getComputedStyle(inputElement) : null;
        const computedFont = computed?.font || `${computed?.fontWeight || '400'} ${computed?.fontSize || '16px'} ${computed?.fontFamily || 'inherit'}`;
        context.font = computedFont;

        const textWidth = context.measureText(selectedOption.label).width;

        // Include the input's paddings and a buffer for the dropdown icon area
        const paddingLeft = computed ? parseFloat(computed.paddingLeft) || 14 : 14;
        const paddingRight = computed ? parseFloat(computed.paddingRight) || 14 : 14;
        const iconBuffer = 10; // space reserved for the end adornment icon and breathing room

        const calculatedWidth = Math.max(textWidth + paddingLeft + paddingRight + iconBuffer, 180); // Minimum 180px
        setDynamicWidth(Math.min(calculatedWidth, 450)); // Cap to avoid overflow
      } else {
        // Fallback width when no option is selected
        setDynamicWidth(180);
      }
    }
  }, [selectedOption, isEntity]);

  return (
    <FormControl fullWidth={fullWidth} className="seleectMainContainer">
      {titleLabel !== "" ? (
        <div className="d-flex justify-content-start mb-2 align-items-center h-[22px]">
          <label
            className={`mb-0 ${labelSize} title-label`}
            style={{ fontFamily }}
          >
            {titleLabel}{" "}
          </label>
          {isRequired ? (
            <span className="required h-[18px] translate-y-[-5px]">*</span>
          ) : (
            ""
          )}
          {tooltipIcon && (
            <div
              className="tooltip-container"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <img src={tooltip} alt="info icon" className="ms-1" />
            </div>
          )}
          <div className="relative">
            {showTooltip && (
              <div className="tooltip-text-select !z-50">
                {tooltipMessage || `${t('enquiries:select')} ${titleLabel}`}
              </div>
            )}
          </div>
        </div>
      ) : null}
      <Box sx={{ 
        minWidth: isEntity && dynamicWidth ? `${dynamicWidth}px` : minWidth, 
        position: "relative",
        width: isEntity && dynamicWidth ? `${dynamicWidth}px` : "auto"
      }}>
        <OutlinedInput
          readOnly
          onClick={handleOpen}
          onFocus={() => setIsFocused(true)} // <-- Set focus true
          onBlur={() => setIsFocused(false)}
          ref={inputRef}
          value={displayText}
          placeholder={placeholder}
          name={name}
          sx={{
            cursor: disabled ? "not-allowed" : "pointer",
            minHeight: height ? height : minHeight,
            minWidth: isEntity && dynamicWidth ? `${dynamicWidth}px` : minWidth,
            width: isEntity && dynamicWidth ? `${dynamicWidth}px` : "auto",
            borderRadius: "8px",
            border: isActive ? "1.5px solid #1565c0 !important" : "1px solid #929398", // <-- Blue border on focus
            boxShadow: isActive ? "0px 1px 4px 0px #82d5ff80" : "none",
            fontSize: "1rem",
            fontFamily,
            background: disabled ? "#E5E5E5" : "#FCFCFC",
            ...styles,
            opacity: disabled ? 0.7 : 1,
            '& .MuiInputBase-input::placeholder': {
              color: '#5f5f5f',
              opacity: 1,
              fontSize: '1rem'
            },
          }}
          className={`custom-selectBox ${className} ${
            disabled ? "disabled" : ""
          }`}
          endAdornment={
            <KeyboardArrowDownIcon sx={{ pointerEvents: "none" }} />
          }
          disabled={disabled}
        />
        <Popper
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          placement="bottom-start"
          modifiers={[
            { name: 'flip', enabled: true, options: { fallbackPlacements: ['top-start', 'bottom-start'] } },
            { name: 'preventOverflow', options: { altBoundary: true, tether: true, rootBoundary: 'viewport', padding: 8 } },
            { name: 'offset', options: { offset: [isEntity ? -120 : 0, 4] } },
          ]}
          style={{ zIndex: 1300, width: isEntity ? (dynamicWidth ? `${dynamicWidth + 100}px` : 420) : inputWidth }}
        >
          <ClickAwayListener onClickAway={handleClose}>
            <Paper
              sx={{
                width: isEntity ? (dynamicWidth ? `${dynamicWidth + 100}px` : 420) : inputWidth,
                left: isEntity ? "-120px" : 0,
                bgcolor: bgColor,
                //position: "absolute",
                // left: isEntity ? "-80px !important" : 0,
              }}
            >
              {/* Sticky Search */}
              <Box
                sx={{
                  p: 1,
                  borderBottom: "1px solid #ddd",
                  position: "sticky",
                  top: 0,
                  background: "#fff",
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
                  onClick={(e) => e.stopPropagation()}
                />
              </Box>
              {/* Scrollable Options */}
              <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
                {filteredOptions?.length > 0 ? (
                  filteredOptions.map((option, i) => (
                    <MenuItem
                      key={`${option.value}${i}`}
                      value={option.value}
                      disabled={disableOptions}
                      selected={option.value === value}
                      onClick={() => handleSelect(option)}
                      sx={{
                        fontSize: "1rem",
                        color: "#000",
                        fontWeight: 500,
                        opacity: "0.85",
                        minHeight: "44px",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        lineHeight: "1.3",
                        padding: "10px 16px",
                      }}
                    >
                      {option.label}
                    </MenuItem>
                  ))
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
      {error && (
        <p
          className="error-text bottom-0"
          dir={isArabic ? "rtl" : "ltr"}
          style={{ textAlign: isArabic ? "right" : "left" }}
        >
          {error.message}
        </p>
      )}
    </FormControl>
  );
};
