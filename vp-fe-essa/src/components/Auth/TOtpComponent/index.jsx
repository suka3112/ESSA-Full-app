import { resetPasswordDashboardValidation } from 'api/Login'
import { INVOICE_DASHBOARD } from 'constants/url'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { ROLE_ID_TO_USER_TYPE, persistEssaRole } from 'constants/essaRoles'
import { setAuthSession } from 'utils/authStorage'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { connect, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'
import { useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { SET_USER_INFO } from 'redux/constants/userInfoConstant'
import { sendOTPAPI, verifyTOTP } from '../../../api/TOTP'
import { showToast } from '../../../redux/actions/toastActions'
import { NormalButton } from '../../Common/NormalButton'
import './style.scss'

const roleToUserTypeMap = {
  1: VENDOR_USER_TYPE,
  2: FINANCE_USER_TYPE,
  3: BUSINESS_USER_TYPE,
  4: ADMIN_USER_TYPE,
  ...ROLE_ID_TO_USER_TYPE
}

const TOtpComponent = ({ userInfo: { userType }, showToast, title, isProfileReset, password }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { payload, isReset } = location.state || {}
  const rememberMe = location.state?.rememberMe
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [verified, setVerified] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef([])
  const { t, i18n } = useTranslation(['otp', 'popup', 'toast'])
  const dispatch = useDispatch()
  const [timer, setTimer] = useState(120); 
  // const [isResendLoading, setIsResendLoading] = useState(false);
  // const [isSmsLoading, setIsSmsLoading] = useState(false);

  useEffect(() => {
    if (verified) return; 
    if (timer === 0) return; // Stop timer at 0
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, verified]);


  const handleResend = async () => {
    // setIsResendLoading(true);
     const query = {
      user_email: location.state.email,
      type: 'Mail'
    }
    try {
      await sendOTPAPI(query); 
      setTimer(60);
      showToast(t('toast:successTitle'), t('otpResentMsg'), 'success')
    } catch (err) {
      toast.error(t('otpResentErorMsg'), '', 'error');
    } finally {
      // setIsResendLoading(false);
    }
  };

  const handleSendViaSms = async () => {
    // setIsSmsLoading(true);
     const query = {
      user_email: location.state.email,
      type: 'Mobile'
    }
    try {
      await sendOTPAPI(query); 
      setTimer(60);
      showToast(t('toast:successTitle'), t('otpSMSMsg'), '', 'success');
    } catch (err) {
      toast.error(t('otpSMSErrorMsg'), '', 'error');
    } finally {
      // setIsSmsLoading(false);
    }
  };

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return // Allow only single digit

    const newOtpValues = [...otpValues]
    newOtpValues[index] = value
    setOtpValues(newOtpValues)

    if (value && index < otpValues.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleUserDispatch = (
    userType,
    email,
    id,
    isSupplier,
    isPoInline,
    fullName,
    Vendor_Role,
    isNonPOAccess,
    roleId
  ) => {
    dispatch({
      type: SET_USER_INFO,
      payload: {
        userType,
        email,
        id,
        roleId,
        isSupplier,
        isPoInline,
        fullName,
        Vendor_Role,
        isNonPOAccess,
      }
    })
  }

  const submitTOTP = () => {
    setIsLoading(true)
    const query = {
      user_email: location.state.email,
      id_verification: otpValues.join(''),
      is_dailyLogin: true
    }
    verifyTOTP(query)
      .then((res) => {
        const userData = res?.data?.data || {}
        const { token = '', role_id, id } = userData
        const userType = roleToUserTypeMap[role_id] || VENDOR_USER_TYPE
        setAuthSession({
          token: token || '',
          userType,
          vendorId: userData?.vendor_id || '',
          rememberMe: Boolean(rememberMe),
        })
        persistEssaRole(role_id)
        handleUserDispatch(
          userType,
          location.state.email,
          id,
          userData?.Is_Supplier,
          userData?.Is_PO_Inline,
          userData?.name,
          userData?.Vendor_Role,
          userData?.Non_PO_Access,
          role_id
        )
        navigate(`/${userType}${INVOICE_DASHBOARD}`, { replace: true })
      })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message || 'Login failed')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const onSubmit = (e) => {
    e.preventDefault()

    if (otpValues.includes('')) {
      setOtpError(t('otpRequired'))
      return
    }

    setOtpError('') // Clear any previous error
    if (isProfileReset || isReset) {
      if (otpValues.includes('')) {
        setOtpError(t('otpRequired'))
        return
      }
      const enteredOtp = Number(otpValues.join(''))
      const body = {
        password: password || payload?.password,
        id_verification: enteredOtp
      }
      resetPasswordDashboardValidation(body)
        .then((res) => {
          showToast(
            t('popup:passwordResetSuccess'),
            t('popup:passwordResetConfirmation'),
            'success'
          )
          navigate(-1)
        })
        .catch((err) => {
          console.error(err)
          //showToast('Error.', `${err?.response?.data?.message}`, 'error')
          toast.error(err?.response?.data?.message || t('otpVerificationFailed'))
        })
    } else {
      submitTOTP()
    }

    // e.preventDefault()

    // if (verified) {
    //   navigate('/vendor/register')
    // }

    // if (otpValues.includes('')) {
    //   setOtpError('Please enter all OTP digits')
    //   return
    // }

    // const enteredOtp = otpValues.join('')

    // const query = {
    //   user_email: 'subashbalakumar007@gmail.com',
    //   id_verification: enteredOtp
    // }

    // verifyOtp(query)
    //   .then((res) => {
    //     setOtpError('')
    //     setVerified(true)
    //   })
    //   .catch((err) => {
    //     console.error(err)
    //   })
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
    <form onSubmit={onSubmit} className={isProfileReset ? "profile-otp-container" : "otp-container"}>
      {verified ? (
        <div>
          <p className="otp-title mb-2 text-center">{t('otpVerified')}</p>
        </div>
      ) : (
        <div>
          <div className="mb-3">
            <p className="otp-title mb-2">{title}</p>
            <p className="otp-sub-text">
              {t('enterTheOtpSentToYourEmailPhoneNumber')}
              {/* Please confirm your account by entering the code sent to your registered email/mobile number */}
            </p>
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
          {otpError && <p className="error_msg_text text-center">{otpError}</p>}
        </div>
      )}

      {!verified && (
        <div className="text-center mb-2" >
          <span>{String(Math.floor(timer / 60)).padStart(2, '0')}:
      {String(timer % 60).padStart(2, '0')}</span>
        </div>
      )}

     
      <div>
        <NormalButton
          label={verified ? t('continue') : t('verify')}
          normal
          isLoading={isLoading}
          disabled={isLoading || timer == 0}
          customClass="otp-submit-btn mt-3"
          isPrimary
          type="submit"
        />
      </div>

      {!verified && (
  <div className="otp-resend-container text-center mb-3" style={{lineHeight: '0.6', marginTop: '5px'}}>
    <div
      className="d-flex justify-content-center align-items-center"
    >
      <span>{t('notReceiveCode')} -</span>
      <NormalButton
        label={t('resend')}
        customClass="otp-link-btn-style"
        type="button"
         disabled={timer > 0}
        // isLoading={isResendLoading}
          onClick={handleResend}
      />
      {/* <span
        style={{
          color: timer > 0 || isResendLoading ? '#007bff' : '#007bff',
          cursor: timer > 0 || isResendLoading ? 'not-allowed' : 'pointer',
          marginLeft: '6px',
          opacity: timer > 0 || isResendLoading ? 0.5 : 1,
          fontWeight: 500,
          textDecoration: 'underline'
        }}
        onClick={timer > 0 || isResendLoading ? undefined : handleResend}
      >
        {t('resend')}
      </span> */}
    </div>

    <div style={{ fontWeight: 'bold' }}>{t('or')}</div>
    <div style={{display: 'flex', justifyContent: 'center'}}>
      <NormalButton
      label={`( ${t('sendOtpViaSms')} )`}
      customClass="otp-link-btn-style"
      type="button"
      disabled={timer > 0}
            // isLoading={isSmsLoading}
            onClick={handleSendViaSms}
          
    />

    {/* <span
        style={{
          color: timer > 0 || isSmsLoading ? '#007bff' : '#007bff',
          cursor: timer > 0 || isSmsLoading ? 'not-allowed' : 'pointer',
          opacity: timer > 0 || isSmsLoading ? 0.5 : 1,
          fontWeight: 500,
          textDecoration: 'underline'
        }}
        onClick={timer > 0 || isSmsLoading ? undefined : handleSendViaSms}
      >
        ({t('sendOtpViaSms')})
      </span> */}

    </div>
  </div>
)}


    </form>
  )
}

const mapDispatchToProps = {
  showToast
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps, mapDispatchToProps)(TOtpComponent)
