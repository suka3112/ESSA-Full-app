import React, { useState, useRef } from 'react'
import './InputBox.scss'
import eyeClose from '../../../assets/icons/eyeclose.svg'
import eye from '../../../assets/icons/eye.svg'
import addEmailIcon from '../../../assets/images/email-add-icon.svg'
import deleteEmailIcon from '../../../assets/images/email-delete-icon.svg'
import tooltip from '../../../assets/icons/tooltip.svg'
import SVGIcon from 'components/Common/SVGIcon'
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

const CustomTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} arrow classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    fontSize: '10px', // Adjust font size
    backgroundColor: '#fcfcfc !important',
    borderRadius: '6px',
    border: '1px solid #e5e5e5',
    padding: '4px 6px',
    color: '#333333'
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: '#fcfcfc' // Outer arrow (border effect)
  },
  [`& .${tooltipClasses.arrow}::before`]: {
    color: '#fcfcfc', // Inner arrow (actual tooltip background)
    border: '1px solid #e5e5e5' // Arrow border
  }
}))

export const InputBox = ({
  labelClass = 'mb-2',
  className = '',
  placeholder = '',
  titleLabel = '',
  onChange,
  onKeyDown,
  onKeyUp,
  value = '',
  name,
  disabled = false,
  tooltipMessage = '',
  type = 'text',
  icon,
  labelSize = '1rem',
  isSearchBox = false,
  PasswordIcon,
  isRequired = false,
  tooltipIcon = false,
  tooltipText = '',
  register,
  rules,
  addEmail,
  handleAddEmail,
  handleRemoveEmail,
  error,
  id = null,
  fontFamily = 'inherit',
  clearErrors,
  rows = 3,
  emailIconTop = '-0.5px',
  readOnly,
  inputStyle = {},
  inputWidth = '',
  maxLength
}) => {
  const inputRef = useRef(null)
  const [isPassword, setIspassword] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const { t, i18n } = useTranslation(['general_details_comp', 'register'])
  const isArabic = i18n.language === 'ar'
  const bidiStyle = { unicodeBidi: 'isolate' }
  return (
    <div
      style={{ width: inputWidth }}
      className={`normal-input inputBox relative ${isSearchBox ? 'searchbox' : ''} ${
        error ? 'errorStateInput' : ''
      }`}>
      {titleLabel !== '' ? (
        <div
          className={`tooltip-wrapper d-flex justify-content-start ${labelClass} align-items-center h-[24px]`}>
          <label className={`mb-0 ${labelSize} title-label`} style={{ fontFamily }}>
            {titleLabel}{' '}
          </label>
          {isRequired ? <span className="required h-[18px] translate-y-[-5px]">*</span> : ''}
          {tooltipIcon && (
            <div
              className="tooltip-container"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}>
              <img src={tooltip} alt="info icon" className="ms-1" />
              {showTooltip && (
                <div className="tooltip-text">
                  {tooltipMessage || `${t('enter')} ${titleLabel}`}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {type === 'textarea' ? (
        <div className="w-100 h-fit relative">
          <textarea
            {...(id && { id })}
            ref={inputRef}
            onWheel={(event) => event.currentTarget.blur()}
            className={`${className} ${
              disabled ? 'disabled' : ''
            } rtl:!pr-[20px] !h-auto text-area-box`}
            name={name}
            disabled={disabled}
            placeholder={placeholder}
            onChange={onChange}
            maxLength={maxLength || rules?.maxLength?.value}
            defaultValue={value || ''}
            rows={rows}
            {...(register &&
              register(name, {
                ...rules,
                onChange: (e) => {
                  if (clearErrors) {
                    clearErrors(name)
                  }
                  if (onChange) {
                    register.onChange(e)
                    onChange(e)
                  }
                }
              }))}
          />

          {addEmail && addEmail === '+' && (
            <CustomTooltip title={t('addMoreEmail')} arrow placement="bottom">
              {/* <img
                style={{ position: "absolute", top: isArabic ? emailIconTop : '-2px', insetInlineEnd: "1px" }}
                onClick={handleAddEmail}
                // className="right-0 top-[-2px] z-10 cursor-pointer"
                 className="z-10 cursor-pointer"
                src={addEmailIcon}
                alt="Add Email"
              /> */}
              <SVGIcon
                name="add"
                onClick={handleAddEmail}
                width={45}
                height={45}
                colorType="primary"
                className="z-10 cursor-pointer"
                style={{
                  position: 'absolute',
                  top: isArabic ? emailIconTop : '-2px',
                  insetInlineEnd: '1px'
                }}
              />
            </CustomTooltip>
          )}
          {addEmail && addEmail === '-' && (
            <CustomTooltip title="Remove Email" arrow placement="bottom">
              <img
                style={{
                  position: 'absolute',
                  top: isArabic ? emailIconTop : '-2px',
                  insetInlineEnd: '1px'
                }}
                onClick={handleRemoveEmail}
                // className="right-0 top-[-2px] z-10 cursor-pointer"
                className="z-10 cursor-pointer"
                src={deleteEmailIcon}
                alt="Remove Email"
              />
            </CustomTooltip>
          )}
        </div>
      ) : (
        <div className="w-100 h-fit relative" style={{ ...inputStyle }}>
          <input
            {...(id && { id })}
            ref={inputRef}
            readOnly={readOnly}
            onWheel={(event) => event.currentTarget.blur()}
            className={`${disabled ? 'disabled' : ''} rtl:!pr-[20px] ${className}`}
            name={name}
            // style={bidiStyle}
            style={{ ...bidiStyle, ...inputStyle }}
            type={isPassword ? 'text' : type}
            disabled={disabled}
            min={0}
            placeholder={placeholder}
            onChange={onChange}
            onKeyDown={onKeyDown}
            maxLength={maxLength || rules?.maxLength?.value}
            defaultValue={value || ''}
            {...(register &&
              !disabled &&
              register(name, {
                ...rules,
                onChange: (e) => {
                  if (clearErrors) {
                    clearErrors(name)
                  }
                  if (onChange) {
                    register.onChange(e)
                    onChange(e)
                  }
                }
              }))}
          />

          {PasswordIcon && (
            <img
              alt="password"
              onClick={() => setIspassword(!isPassword)}
              // className="passwordIcon cursor-pointer"
              className={
                isArabic ? 'passwordIcon-ar cursor-pointer' : 'passwordIcon cursor-pointer'
              }
              src={isPassword ? eye : eyeClose}
            />
          )}

          {addEmail && addEmail === '+' && (
            <CustomTooltip title={t('addMoreEmail')} arrow placement="bottom">
              <SVGIcon
                name="add"
                onClick={handleAddEmail}
                width={45}
                height={45}
                colorType="primary"
                className="z-10 cursor-pointer"
                style={{
                  position: 'absolute',
                  top: isArabic ? emailIconTop : '-2px',
                  insetInlineEnd: '1px'
                }}
              />
            </CustomTooltip>
          )}
          {addEmail && addEmail === '-' && (
            <CustomTooltip title={t('removeEmail')} arrow placement="bottom">
              <img
                style={{
                  position: 'absolute',
                  top: isArabic ? emailIconTop : '-2px',
                  insetInlineEnd: '1px'
                }}
                onClick={handleRemoveEmail}
                // className="right-0 top-[-2px] z-10 cursor-pointer"
                className="z-10 cursor-pointer"
                src={deleteEmailIcon}
                alt="Remove Email"
              />
            </CustomTooltip>
          )}
        </div>
      )}

      {/*{addEmail && (
        <div
          className={`input-box-icon ${error ? 'input-box-icon-error' : ''}`}
          style={{
            color: addEmail === '+' ? '#005d8b' : '#D50000',
            border: addEmail === '+' ? '1px solid #005d8b' : '1px solid #D50000'
          }}>
          <div
            className="input-box-icon-inner"
            style={{
              border: addEmail === '+' ? '1.5px solid #017EBD' : '1px solid #D50000'
            }}>
            <button type="button" onClick={addEmail === '+' ? handleAddEmail : handleRemoveEmail}>
              {addEmail}
            </button>
          </div>
        </div>
      )}*/}

      {error?.message && (
        <p className={error.className || 'error-text bottom-0'}>{error.message}</p>
      )}
      <span className="icon">{icon}</span>
    </div>
  )
}
