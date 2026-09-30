import * as React from "react";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import {
  TextField,
  Popover,
  InputAdornment,
  Button,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { StaticDateRangePicker } from "@mui/x-date-pickers-pro/StaticDateRangePicker";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ClearIcon from "@mui/icons-material/Clear";
import { useTranslation } from "react-i18next";

dayjs.extend(quarterOfYear);

const shortcutsItems = [
  { label: "Today", getValue: () => [dayjs(), dayjs()] },
  {
    label: "Yesterday",
    getValue: () => [dayjs().subtract(1, "day"), dayjs().subtract(1, "day")],
  },
  {
    label: "Last Week",
    getValue: () => [
      dayjs().subtract(1, "week").startOf("week"),
      dayjs().subtract(1, "week").endOf("week"),
    ],
  },
  {
    label: "Last Month",
    getValue: () => [
      dayjs().subtract(1, "month").startOf("month"),
      dayjs().subtract(1, "month").endOf("month"),
    ],
  },
  {
    label: "Last Quarter",
    getValue: () => [
      dayjs().subtract(1, "quarter").startOf("quarter"),
      dayjs().subtract(1, "quarter").endOf("quarter"),
    ],
  },
  // { label: 'Reset', getValue: () => [null, null] }
];

export default function DateRangePicker({
  type = "single",
  value,
  setValue,
  disabled,
  minHeight = "45px",
  pickerHeight = "32px",
  error = "",
  maxDate = undefined,
  maxHeight = "",
  className,
  invDate = true, // To determine if it's for invoice date field
  disablePast = false,
  clear = false, // Prop to show clear icon
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const isRangePicker = type === "range";
  const { i18n, t } = useTranslation(["credit_notes"]);
  const isArabic = i18n.language === "ar";
  const [isFocused, setIsFocused] = React.useState(false);
  const [openSingle, setOpenSingle] = React.useState(false);
  const isPopoverOpen = Boolean(anchorEl);
  // include openSingle so single DatePicker stays "active" while its popup is open
const isActive = isFocused || isPopoverOpen || openSingle;


  // Calculate minDate for invDate
  const today = dayjs();
  const minDate = invDate ? today.subtract(60, "day") : undefined;

  const handleOpen = (event) => {
    if (!disabled) {
      // <-- keep blue border when popover opens
      setAnchorEl(event.currentTarget);
      setIsFocused(true);
    }
  };

  const handleReset = () => {
    if (!setValue) return;
    if (isRangePicker) {
      setValue([null, null]);
    } else {
      setValue(null);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setIsFocused(false); // <-- remove blue border when popover closes
  };

  const handleChange = (newValue) => {
    if (setValue) setValue(newValue);
    if (!isRangePicker) handleSingleClose();
  };

  // For single DatePicker: open on input click
  const handleInputClick = (event) => {
    if (!disabled) {
      setOpenSingle(true);
      setIsFocused(true);
    }
  };

  const handleSingleClose = () => {
    setOpenSingle(false);
    setIsFocused(false);
  };

  const handleClearDate = (e) => {
    e.stopPropagation(); // avoid reopening picker on clear
    if (setValue) setValue(null);
  };

  let formattedValue = "";
  // if (isRangePicker) {
  //   const [start, end] = value || [];
  //   if (start && end) {
  //     formattedValue = `${start.format("DD-MMM-YY")} - ${end.format(
  //       "DD-MMM-YY"
  //     )}`;
  //   }
  // } else if (value) {
  //   formattedValue = value?.format("DD-MMM-YY");
  // }

  if (isRangePicker) {
  const [start, end] = value || [];

  if (start && end) {
    formattedValue = `${start.format("DD-MMM-YY")} - ${end.format("DD-MMM-YY")}`;
  } 
  else if (start) {
    formattedValue = `${start.format("DD-MMM-YY")} - `;
  } 
  else {
    formattedValue = "";
  }
} else if (value) {
  formattedValue = value?.format("DD-MMM-YY");
}

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} sx={{ height: "100%" }}>
      {isRangePicker ? (
        <>
          <TextField
            value={formattedValue}
            onClick={handleOpen}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            fullWidth
            readOnly
            disabled={disabled}
            error={error}
            helperText={error}
            minHeight={minHeight}
            placeholder={t("selectDate")}
            autoComplete="off"
            sx={{
              height: "100%",
              "& .MuiInputBase-root": {
                height: "45px !important",
                border: isActive ? "1.5px solid #0066b3" : "1px solid #929398", // Blue border on focus
                boxShadow: isActive ? "0px 1px 4px 0px #82d5ff80" : "none",
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#5f5f5f",
                opacity: 1,
                fontSize: "1rem",
              },
              "& .MuiFormHelperText-root": {
                fontSize: "11px",
                marginLeft: isArabic ? "auto" : "0px",
                marginRight: isArabic ? "0px" : "auto",
                textAlign: isArabic ? "right" : "left",
                direction: isArabic ? "rtl" : "ltr",
              },
              "& .MuiInputBase-root.Mui-focused": {
                border: "1.5px solid #0066b3 !important",
                boxShadow: "0px 1px 4px 0px #82d5ff80",
                background: "#fdfdfd",
              },
    //          "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    //   borderColor: "#0066b3",
    //   boxShadow: "0px 1px 4px 0px #82d5ff80",
    // },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarMonthIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <KeyboardArrowDownIcon fontSize="medium" />
                </InputAdornment>
              ),
            }}
          />
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl }
            onClose={handleClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <div
              style={{
                padding: "10px",
                maxWidth: "434px",
                maxHeight: "344px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <StaticDateRangePicker
                value={value}
                onChange={handleChange}
                slotProps={{
                  shortcuts: { items: shortcutsItems },
                  actionBar: {
                    actions: [],
                  },
                }}
                calendars={1}
                format="YYYY-MM-DD"
              />
              {/* Manually render OK button */}
              <div
                style={{
                  position: "absolute",
                  bottom: "15px",
                  left: "30px",
                  background: "#fff",
                  zIndex: 1,
                  padding: "4px 0",
                }}
              >
                <button
                  onClick={() => {
                    setValue([null, null]);
                  }}
                  style={{
                    padding: "6px 6px",
                    color: "#0066b3",
                    background: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </Popover>
        </>
      ) : (
        <>
          <DatePicker
            className={`w-full ${className}`}
            value={value}
            onChange={handleChange}
            open={openSingle}
            onOpen={() => {
    setOpenSingle(true);
    setIsFocused(true);
  }}
  onClose={() => {
    setOpenSingle(false);
    setIsFocused(false);
  }}
            minDate={minDate}
            maxDate={maxDate}
            views={["year", "month", "day"]}
            
            slotProps={{
              textField: {
                error: !!error,
                readOnly: true,
                helperText: error,
                placeholder: t("selectDate"),
                autoComplete: "off",
                onClick: handleInputClick,
                onFocus: () => setIsFocused(true),
                onBlur: () => setIsFocused(false),
                // InputProps: {
                //   endAdornment: (
                //     <InputAdornment position="end" style={{ display: "flex", alignItems: "center" }}>
                //       {value && (
                //         <ClearIcon
                //           fontSize="small"
                //           style={{ cursor: "pointer", marginRight: 4 }}
                //           onClick={handleClearDate}
                //           aria-label="Clear date"
                //         />
                //       )}
                //       <CalendarMonthIcon fontSize="small" />
                //       <KeyboardArrowDownIcon fontSize="medium" />
                //     </InputAdornment>
                //   ),
                // },
              },
              actionBar: {
                actions: ["clear"], // show clear/reset button inside the date picker popup
              },
              sx:{
        "& .MuiInputBase-root": {
          backgroundColor: disabled ? "#E5E5E5" : "#fdfdfd",
          borderRadius: "6px",
          padding: "8px 10px",
          height: minHeight,
          border: isActive ? "1.5px solid #1565c0" : "1px solid #929398",
          boxShadow: isActive ? "0px 1px 4px 0px #82d5ff80" : "none",
          pointerEvents: disabled ? "none" : "auto",
          maxHeight: maxHeight,
          minHeight: minHeight,
        },
        "& .MuiInputBase-input::placeholder": {
          color: "#5f5f5f",
          opacity: 1,
          fontSize: "1rem",
        },
        "& .MuiFormHelperText-root": {
          fontSize: "11px",
          marginLeft: isArabic ? "auto" : "0px",
          marginRight: isArabic ? "0px" : "auto",
          textAlign: isArabic ? "right" : "left",
          direction: isArabic ? "rtl" : "ltr",
        },
        "& .MuiInputBase-input.Mui-disabled": {
          WebkitTextFillColor: "#030303",
          color: "#030303",
          opacity: 1,
        },
        minHeight: minHeight,
      },
            }}
            disablePast={disablePast}
            sx={{
              "& .MuiInputBase-root": {
                backgroundColor: disabled ? "#E5E5E5" : "#fdfdfd",
                borderRadius: "6px",
                padding: "8px 10px",
                height: minHeight,
                border: isActive ? "1.5px solid #1565c0" : "1px solid #929398", // Blue border on focus
                boxShadow: isActive ? "0px 1px 4px 0px #82d5ff80" : "none",
                pointerEvents: disabled ? "none" : "auto",
                maxHeight: maxHeight,
                minHeight: minHeight,
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#5f5f5f",
                opacity: 1,
                fontSize: "1rem",
              },
              "& .MuiFormHelperText-root": {
                fontSize: "11px",
                marginLeft: isArabic ? "auto" : "0px",
                marginRight: isArabic ? "0px" : "auto",
                textAlign: isArabic ? "right" : "left",
                direction: isArabic ? "rtl" : "ltr",
              },
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "#030303",
                color: "#030303",
                opacity: 1,
              },
              minHeight: minHeight,
            }}
            format="DD/MM/YYYY"
          />
        </>
      )}
    </LocalizationProvider>
  );
}
