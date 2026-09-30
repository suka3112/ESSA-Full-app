import React, { useState } from 'react'
import './style.scss'
import AppTooltip from '../AppTooltip'
import { useTranslation } from 'react-i18next'

const FileUploadInput = ({
  name = '',
  label,
  required = false,
  tooltip,
  files = [],
  multiple = false,
  tooltipMessage,
  onChange = (e) => { },
  className,
  error,
  disabled,
  accept
}) => {
  const { t, i18n } = useTranslation(['register','legal_identification_comp'])
  const [fileName, setFileName] = useState('No File Selected')
  const isArabic = i18n.language === 'ar'
  const handleFileChange = (event) => {
    const file = event.target.files[0]
    setFileName(file ? file.name : t('no_files_selected'))
  }

  const renderFiles = () => {
    const result = []

    for (let i = 0; i < files.length; i++) {
      result.push(<div key={i}>{files[i].name}</div>)
    }
    return result
  }

  return (
    <div className={`file-upload ${className}`}>
      {label && (
        <div className="mb-0 h-[24px]">
          <label className="file-label">
            {label} {required && <span className="required">*</span>}
            {tooltip && <AppTooltip message={tooltipMessage} />}
          </label>
        </div>
      )}

      <div className="upload-container" >
        <label className="upload-button" style={{ color: '#808080', fontSize: '0.875rem',  pointerEvents: disabled ? 'none' : 'auto' }}>
          <input
            name={name}
            type="file"
            multiple={multiple}
            onChange={onChange}
            hidden
            accept={accept || "application/pdf,image/*"}
            disabled={disabled}
          />
          {t('upload_file')}
        </label>
        <span className="file-name">
          {files.length === 0 ? t('no_files_selected') : `${files.length}  ${t('legal_identification_comp:fileSelected')}`}
        </span>
      </div>
      {error?.message && (
        <p
          className={`error-text`}
          dir={isArabic ? 'rtl' : 'ltr'}
          style={{ textAlign: isArabic ? 'right ' : 'left' }}>
          {error.message}
        </p>
      )}
    </div>
  )
}

export default FileUploadInput
