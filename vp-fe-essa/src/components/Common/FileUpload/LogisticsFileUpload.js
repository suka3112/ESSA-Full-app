import React, { useState } from 'react'
import { Modal, Box, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import uploadIcon from '../../../assets/icons/uploadIcon.svg'
import xlsIcon from '../../../assets/icons/xlsIcon.svg'
import './style.scss'
import { useTranslation } from 'react-i18next'
import { NormalButton } from '..'

const LogisticsFileUpload = ({
  title,
  description,
  children,
  modalStyles = {},
  contentStyles = {},
  open,
  onClose,
  onChange,
  name,
  multiple = false,
  disabled = false,
  error,
  files = [],
  isArabic = false,
  accept
}) => {
  const { t } = useTranslation(['soa', 'register'])
  const [validationError, setValidationError] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const handleClose = () => {
    if (onClose) onClose(false)
  }

  const handleOpen = (e) => {
    e.preventDefault()
    if (onClose) onClose(true)
  }

  const defaultModalStyles = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 460,
    height: 360,
    bgcolor: 'background.paper',
    border: '1px solid #454545',
    boxShadow: 24,
    p: 3,
    borderRadius: 1,
    ...modalStyles
  }

  const allowedExtensions = ['xlsx']

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const fileExtension = file.name.split('.').pop().toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      setValidationError("The Uploaded Document doesn't match with the Template.")
      setSelectedFileName('')
      return
    }

    setValidationError('')
    setSelectedFileName(file.name)
    if (onChange) onChange(e)
    if (onClose) onClose(false) // Close modal after successful upload
  }

  //drag and drop
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

    const fileExtension = file.name.split('.').pop().toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      setValidationError("The Uploaded Document doesn't match with the Template.")
      setSelectedFileName('')
      return
    }

    setValidationError('')
    setSelectedFileName(file.name)

    // Create a mock event to reuse existing handler
    const mockEvent = { target: { files: [file] } }
    if (onChange) onChange(mockEvent)
    if (onClose) onClose(false)
  }

  return (
    <div>
      <div className="upload-container" onClick={handleOpen}>
        <div
          className="upload-button"
          style={{
            color: '#808080',
            fontSize: '0.875rem',
            pointerEvents: disabled ? 'none' : 'auto'
          }}>
          {t('register:upload_file')}
        </div>
        <span className="file-name">
          {files.length === 0
            ? t('register:no_files_selected')
            : `${files.length} ${t('legal_identification_comp:fileSelected')}`}
        </span>
      </div>

      {error?.message && (
        <p
          className="error-text"
          dir={isArabic ? 'rtl' : 'ltr'}
          style={{ textAlign: isArabic ? 'right' : 'left' }}>
          {error.message}
        </p>
      )}

      {/* Modal */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-title"
        aria-describedby="modal-description">
        <Box sx={defaultModalStyles}>
          <div>
            <h5 id="modal-title" style={{ marginBottom: 15, fontWeight: '600' }}>
              {"Upload Excel File" || t('uploadFile')}
            </h5>
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
          </div>
          {/* <h5>Upload xlsx</h5> */}
         

          <div
            className={`fileUpload ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop} style={{height:'70%',}}>
            <img src={uploadIcon} alt="Upload" width={100} height={100} />
            <p className='uploadText'>{t('dragAndDrop')}</p>
            <p>{t('or')}</p>

            <NormalButton
            isPrimary
              onFileChange={handleFileChange}
              isFileUpload={true}
              label={selectedFileName ? t('Replace') : t('selectFile')}
              // outlineBtn
              customClass="px-2 mt-1 select-file-button"
              disabled={isDragOver}
            />

            
          </div>
          {selectedFileName && (
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  background: '#7EAAFF38',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  margin: '12px auto 0 auto',
                  border: '1px solid #929398',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  width: '90%'
                }}>
                <img
                  src={xlsIcon}
                  alt="XLS"
                  style={{ width: 32, height: 32, marginRight: 10,padding:2, marginLeft: 10, borderRadius: 4 ,border:'1px solid #929398'}}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#222', fontWeight: 500, fontSize: '1em' }}>
                    {selectedFileName}
                  </span>
                  <span style={{ color: '#666', fontSize: '1rem' }}>
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
              <p style={{ color: 'red', textAlign: 'center', marginTop: '5px' }}>
                {validationError}
              </p>
            )}

          <Box sx={{ mt: 2, ...contentStyles }}>{children}</Box>
        </Box>
      </Modal>
    </div>
  )
}

export default LogisticsFileUpload
