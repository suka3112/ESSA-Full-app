import React, { useEffect, useState } from 'react'
import { Modal, Box, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { NormalButton } from '../NormalButton'
import uploadIcon from '../../../assets/icons/uploadIcon.svg'
import uploadIconWhite from '../../../assets/icons/uploadIconWhite.svg'
import xlsIcon from '../../../assets/icons/xlsIcon.svg'

import './style.scss'
import { useTranslation } from 'react-i18next'
import { CircularProgress } from '../CircularProgress'

const SOAFileUpload = ({
  title,
  description,
  children,
  modalStyles = {},
  contentStyles = {},
  openOnRender = false,
  onClose,
  onFileChange,
  labelName,
  leftIcon,
  fileUploadError = '',
  fileUploadSuccess,
  isLoading = false
}) => {
  const [validationError, setValidationError] = useState('')
  const [fileName, setFileName] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const { t } = useTranslation('soa')

  const handleClose = () => {
    if (onClose) {
      onClose(false)
      setValidationError('')
      setFileName('')
    }
  }

  const handleOpen = () => {
    if (onClose) {
      onClose(true)
      setValidationError('')
      setFileName('')
    }
  }

  useEffect(() => {
    setFileName('')
    if (fileUploadError) {
      setValidationError(fileUploadError)
      setFileName('')
      return
    }
  }, [fileUploadError])

  const defaultModalStyles = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 460,
    height: "auto",
    bgcolor: 'background.paper',
    border: '1px dotted #454545',
    boxShadow: 24,
    p: 3,
    borderRadius: 1,
    ...modalStyles
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validExtensions = ['xlsx', 'xls', 'csv']
    const fileExtension = file.name.split('.').pop().toLowerCase()
    setFileName('')
    setValidationError('')
    if (!validExtensions.includes(fileExtension)) {
      setValidationError("The Uploaded Document doesn't match with the Template")
      setFileName('')
      return
    }

    if (onFileChange) {
      onFileChange(e)
      setFileName(file.name)
      // if (fileUploadSuccess === 'success') {
      //   setFileName(file.name)
      // }
    }
  }

  // Drag-and-drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return

    const validExtensions = ['xlsx', 'xls', 'csv']
    const fileExtension = file.name.split('.').pop().toLowerCase()
    setValidationError('')
    setFileName('')

    if (!validExtensions.includes(fileExtension)) {
      setValidationError("The Uploaded Document doesn't match with the Template")
      setFileName('')
      return
    }

    // Reuse the same logic with mock event
    const mockEvent = { target: { files: [file] } }
    if (onFileChange) onFileChange(mockEvent)
    setFileName(file.name)
  }

  return (
    <div>
      <NormalButton
        label={labelName ? labelName : t('uploadNew')}
        isPrimary
        onClick={handleOpen}
        leftIcon={leftIcon ? undefined : uploadIconWhite}
        customClass="uploadNewBtn"
      />

      <Modal
        open={openOnRender}
        onClose={handleClose}
        aria-labelledby="modal-title"
        aria-describedby="modal-description">
        <Box sx={defaultModalStyles}>
          <IconButton
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              color: 'black'
            }}
            onClick={handleClose}>
            <CloseIcon />
          </IconButton>
          <div
            className={`fileUpload ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}>
            <img src={uploadIcon} alt="Upload" />
            <p>{t('dragAndDrop')}</p>
            <p>{t('or')}</p>
            <NormalButton
              onFileChange={handleFileChange}
              isFileUpload={true}
              label={fileName ? t('Replace') : t('selectFile')}
              outlineBtn
              customClass="px-2 select-file-button"
              isLoading ={isLoading}
            />

            {fileName && !validationError && (
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  background: '#7EAAFF38',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  margin: '12px 0 0 0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  width: '100%'
                }}>
                <img
                  src={xlsIcon}
                  alt="XLS"
                  style={{ width: 32, height: 32, marginRight: 10, marginLeft: 15 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#222', fontWeight: 500, fontSize: '1em' }}>
                    {fileName}
                  </span>
                  <span style={{ color: '#666', fontSize: '0.9em' }}>
                    {(() => {
                      // To get the size
                      const input = document.querySelector('input[type="file"]')
                      if (input && input.files && input.files[0]) {
                        const size = input.files[0].size
                        return `(${(size / 1024).toFixed(1)}kb)`
                      }
                      return ''
                    })()}
                  </span>
                </div>
              </div>
            )}

            {validationError && (
              <p style={{ color: 'red', textAlign: 'center', marginTop: '5px', fontSize: '1rem' }}>
                {validationError || fileUploadError}
              </p>
            )}
            {/* {validationError ? (
                <p style={{ color: 'red', textAlign: 'center', marginTop: '5px' }}>
                  {validationError}
                </p>
              ) : fileName ? (
                <p style={{ color: 'green', textAlign: 'center', marginTop: '5px' }}>
                  {fileName}
                </p>
              ) : null} */}
          </div>
          <Box sx={{ mt: 2, ...contentStyles }}>{children}</Box>
        </Box>
      </Modal>
    </div>
  )
}
export default SOAFileUpload
