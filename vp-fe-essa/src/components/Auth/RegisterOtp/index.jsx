import React, { useRef, useState } from 'react'
import './style.scss'
import { NormalButton } from '../../Common/NormalButton'
import { useLocation, useNavigate } from 'react-router'
import { REGISTER } from 'constants/url'
import { VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { showToast } from '../../../redux/actions/toastActions'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { verifyTOTP } from 'api/TOTP'
import successGIf from '../../../assets/gif/tickGreen.gif'
import { toast } from 'react-toastify'

const RegisterOtpComp = ({ showToast, title, isProfileReset, password }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues
  } = useForm()
  const navigate = useNavigate()
  const { t } = useTranslation('otp')
  const { search } = useLocation()
  const urlQueryParams = new URLSearchParams(search)
  const queryObject = Object.fromEntries(urlQueryParams.entries())

  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [verified, setVerified] = useState(false)
  const [otpError, setOtpError] = useState('')
  const inputRefs = useRef([])

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return

    const newOtpValues = [...otpValues]
    newOtpValues[index] = value
    setOtpValues(newOtpValues)

    if (value && index < otpValues.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (otpValues[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < otpValues.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const verifyOtpHandler = (e) => {
    e.preventDefault()

    if (otpValues.includes('')) {
      setOtpError(t('otpRequired'))
      return
    }

    const query = {
      user_email: queryObject?.email,
      id_verification: otpValues.join(''),
      isRegister: true
    }

    verifyTOTP(query)
      .then((res) => {
        setOtpError('')
        setVerified(true)
      })
      .catch((err) => {
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(err?.response?.data?.message || t('otpVerificationFailed'))
      })
  }

  const handleContinue = () => {
    navigate(
      `/${VENDOR_USER_TYPE}${REGISTER}?cr_person_id=${queryObject?.cr_person_id}&entity_id=${queryObject?.entity_id}&entityName=${queryObject?.entityName}&contactName=${queryObject?.contactName}`
    )
  }

  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData('Text').replace(/\D/g, ''); // Only digits
    if (pasteData.length === otpValues.length) {
      const newOtpValues = pasteData.split('');
      setOtpValues(newOtpValues);
      // Focus last input
      inputRefs.current[otpValues.length - 1]?.focus();
      e.preventDefault();
    }
  };

  return (
    <form
      onSubmit={verified ? handleSubmit(handleContinue) : verifyOtpHandler}
      className="otp-container register-otp-container">
      {verified ? (
        <>
          <div className="successGif">
            <img src={successGIf} alt="success" height="71px" width="70px" />
          </div>
          <div>
            <p className="otp-title mb-2 text-center">{t('otpVerified')}</p>
          </div>
        </>
      ) : (
        <div>
          <div className="mb-3">
            <p className="otp-title mb-2 text-center">{t('enterTheOtpSentToYourEmail')}</p>
          </div>
          <div className="otp-input-container">
            {otpValues.map((value, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                className="otp-input inputBox mb-2"
                type="text"
                value={value}
                inputMode="numeric"
                maxLength={1}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={(e) => handlePaste(e)}
              />
            ))}
          </div>
        </div>
      )}

      {otpError && <p className="error_msg_text text-center">{otpError}</p>}

      <div>
        <NormalButton
          label={verified ? t('continue') : t('verify')}
          normal
          customClass="otp-submit-btn mt-3"
          isPrimary
          type="submit"
        />
      </div>
    </form>
  )
}

const mapDispatchToProps = {
  showToast
}

export default connect(null, mapDispatchToProps)(RegisterOtpComp)
