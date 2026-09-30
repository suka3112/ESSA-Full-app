import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Modal from '@mui/material/Modal'
import { IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { NormalButton } from '..'
import { minWidth, padding } from '@mui/system'
import { useTranslation } from 'react-i18next'

export default function CustomModal({
  open,
  onClose,
  header,
  title,
  description,
  children,
  modalStyles = {},
  contentStyles = {},
  titleStyles = {},
  closeIcon,
  saveBtn,
  submitBtn,
  closebtn,
  handleSave,
  handleSubmit,
  IsPadding
}) {
  const defaultStyle = {
    padding: '',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    // maxWidth: '456px',
    // maxHeight: '80vh',
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: IsPadding || 3,
    overflowY: 'auto',
    borderRadius: '10px',
  }

  const {i18n} = useTranslation()
  const isArabic = i18n.language === 'ar';

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description">
      <Box sx={{ ...modalStyles, ...defaultStyle}}>

        {closeIcon && (
              <IconButton
                onClick={onClose}
                sx={{ color: 'black',
                      position: 'absolute',
                      top: 20,
                      right: !isArabic ? 10 : '', 
                      left: isArabic ? 10 : ''
                    }}
              >
                <CloseIcon />
              </IconButton>
            )}
        
        {header  && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: header ? 'space-between' : 'flex-end',
              // mb: 2,
            }}
          >
            {/* {header && ( */}
              <Typography variant="h6" component="h2" sx={{ ...titleStyles,fontSize: '20px' }}>
                {header}
              </Typography>
            {/* )} */}
          
          </Box>
        )}
        <div className="d-flex">
          {saveBtn && (
            <NormalButton
              label="Save"
              isPrimary
              customClass="px-3"
              onClick={handleSave}
              style={{ position: 'absolute', top: 10, right: '12rem' }}
            />
          )}
          {submitBtn && (
            <NormalButton
              label="Submit"
              isPrimary
              customClass="px-3"
              onClick={handleSubmit}
              style={{ position: 'absolute', top: 10, right: '6rem' }}
            />
          )}
          {closebtn && (
            <NormalButton
              label="Close"
              outlineBtn
              customClass="px-3"
              onClick={onClose}
              style={{ position: 'absolute', top: 10, right: 10 }}
            />
          )}
        </div>
        {title && (
          <Typography id="modal-modal-title" variant="h6" component="h2" sx={{ ...titleStyles }}>
            {title}
          </Typography>
        )}
        {description && (
          <Typography
            id="modal-modal-description"
            sx={{ mt: 2, fontSize: '18px', fontWeight: 400,mb:3 }}>
            {description}
          </Typography>
        )}
        <Box sx={{ mt: 2, ...contentStyles }}>{children}</Box>
      </Box>
    </Modal>
  )
}
