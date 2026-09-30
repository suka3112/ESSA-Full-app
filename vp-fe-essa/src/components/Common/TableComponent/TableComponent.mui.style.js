// StyledCheckbox.js
import { styled } from '@mui/system'
import { Checkbox, Paper } from '@mui/material'
const primaryColor = 'var(--brand-primary-color, #017EBD)'

export const TCCheckBox = styled(Checkbox)(({}) => ({
  color: primaryColor,
  '&.Mui-checked': {
    color: primaryColor
  },
  '&.MuiCheckbox-indeterminate': {
    color: primaryColor
  },
  '&:hover': {
    backgroundColor: 'rgba(1, 126, 189, 0.08)'
  }
}))

export const TCHeadCheckBox = styled(Checkbox)(({}) => ({
  color: '#FFF',
  borderRadius: '10px',
  height: '20px',
  width: '21px',
  '&.Mui-checked': {
    color: '#FFF'
  },
  '&.MuiCheckbox-indeterminate': {
    color: '#FFF'
  }
}))

export const TCPaper = styled(Paper)(({}) => ({
  '& .MuiPaper-root': {
    boxShadow: 'none !important'
  }
}))
