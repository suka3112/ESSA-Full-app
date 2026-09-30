import * as React from 'react'
import dayjs from 'dayjs'
import { TextField, Popover, InputAdornment } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { StaticDateRangePicker } from '@mui/x-date-pickers-pro/StaticDateRangePicker'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import styles from './DateRangePicker.module.scss'

const shortcutsItems = [
  { label: 'Today', getValue: () => [dayjs(), dayjs()] },
  { label: 'Yesterday', getValue: () => [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')] },
  {
    label: 'Last Week',
    getValue: () => [
      dayjs().subtract(1, 'week').startOf('week'),
      dayjs().subtract(1, 'week').endOf('week')
    ]
  },
  {
    label: 'Last Month',
    getValue: () => [
      dayjs().subtract(1, 'month').startOf('month'),
      dayjs().subtract(1, 'month').endOf('month')
    ]
  },
  {
    label: 'Last Quarter',
    getValue: () => [
      dayjs().subtract(1, 'quarter').startOf('quarter'),
      dayjs().subtract(1, 'quarter').endOf('quarter')
    ]
  },
  { label: 'Reset', getValue: () => [null, null] }
]

export default function DateRangePicker({
  type = 'single',
  disabled,
  minHeight = '45px',
  pickerHeight = '32px',
  value,
  width = '100%',
  setValue  
}) {
  const [anchorEl, setAnchorEl] = React.useState(null)
  const isRangePicker = type === 'range'


  const formattedValue = isRangePicker
    ? Array.isArray(value) && value[0] && value[1]
      ? [dayjs(value[0]), dayjs(value[1])]
      : [null, null]
    : value
    ? dayjs(value)
    : null

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleChange = (newValue) => {
    setValue(newValue)

    handleClose()
  }

  return (
    <>
      {isRangePicker ? (
        <LocalizationProvider dateAdapter={AdapterDayjs} sx={{ height: '100%' }}>
          <TextField
          value={
            isRangePicker
              ? formattedValue[0] && formattedValue[1]
                ? `${formattedValue[0].format('DD MMM YY')} - ${formattedValue[1].format('DD MMM YY')}`
                : ''
              : formattedValue
              ? formattedValue.format('YYYY-MM-DD')
              : ''
          }
          
            onClick={handleOpen}
            fullWidth
            readOnly
            sx={{
              height: '100%',
              '& .MuiInputBase-root': {
                height: `${pickerHeight} !important`,
                color: '#5F6368 !important',
                fontWeight: 600
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" className={styles.datePickerCalIcon}>
                  <CalendarMonthIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end" className={styles.datePickerArrowIcon}>
                <KeyboardArrowDownIcon sx={{ color: '#293050 !important' }} />
                </InputAdornment>
              )
            }}
          />
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
            <div
              style={{
                padding: '10px',
                maxWidth: '434px',
                maxHeight: '344px',
                overflow: 'hidden'
              }}>
              <StaticDateRangePicker
                value={formattedValue}
                onChange={handleChange}
                slotProps={{
                  shortcuts: { items: shortcutsItems },
                  actionBar: { actions: [] }
                }}
                calendars={1}
              />
            </div>
          </Popover>
        </LocalizationProvider>
      ) : (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            value={formattedValue}
            onChange={handleChange}
            disablePast
            format="DD/MM/YYYY"
            views={['year', 'month', 'day']}
            width={width}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: disabled ? '#BABABA' : '#fdfdfd',
                borderRadius: '6px',
                padding: '8px 10px',
                minHeight: minHeight,
                width: width,
                border: disabled ? 'none' : '1px solid #E5E5E5',
                pointerEvents: disabled ? 'none' : 'visible'
              }
            }}
          />
        </LocalizationProvider>
      )}
    </>
  )
}
