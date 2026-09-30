import React, { useEffect, useState } from 'react'
import { Modal, Box, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { NormalButton } from '../NormalButton'
import uploadIcon from '../../../assets/icons/uploadIcon.svg'
import uploadIconWhite from '../../../assets/icons/uploadIconWhite.svg'

import './style.scss'
import { useTranslation } from 'react-i18next'

const FileUpload = ({
  title,
  description,
  children,
  modalStyles = {},
  contentStyles = {},
  openOnRender = false,
  onClose,
  onFileChange
}) => {
  const [open, setOpen] = useState(openOnRender)
  const {t} = useTranslation('soa')

  useEffect(() => {
    setOpen(openOnRender)
  }, [openOnRender])

  const handleClose = () => {
    setOpen(false)
    if (onClose) onClose()
  }

  const handleOpen = () => {
    setOpen(true)
  }

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const defaultModalStyles = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 460,
    height: 300,
    bgcolor: 'background.paper',
    border: '1px dotted #454545',
    boxShadow: 24,
    p: 3,
    borderRadius: 1,
    ...modalStyles
  }

  return (
    <div>
      {!openOnRender && (
        <NormalButton
          label={t('uploadNew')}
          isPrimary
          onClick={handleOpen}
          leftIcon={uploadIconWhite}
          customClass="uploadNewBtn"
        />
      )}

      <Modal
        open={open}
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
          <div className="fileUpload"  onDrop={handleDrop}
  onDragOver={handleDragOver}>
            <img src={uploadIcon} width={100} height={100} alt="Upload" />
            <p>{t('dragAndDrop')}</p>
            <p>{t('or')}</p>
            <NormalButton
              onFileChange={onFileChange}
              isFileUpload={true}
              label={t('selectFile')}
              outlineBtn
              customClass="px-2 select-file-button"
            />
          </div>
          <Box sx={{ mt: 2, ...contentStyles }}>{children}</Box>
        </Box>
      </Modal>
    </div>
  )
}
export default FileUpload