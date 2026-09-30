import React, { useEffect, useState } from 'react'
import '../Login/style.scss'
import { InputBox } from '../../Common/InputBox'
import { NormalButton } from '../../Common/NormalButton'
import { useForm } from 'react-hook-form'
import './style.scss'
import { setupTOTPAPI, verifyTOTP } from '../../../api/TOTP'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import CustomModal from 'components/Common/Modal'
import { useTranslation } from 'react-i18next'
import { VENDOR_PORTAL } from 'constants/userType'

function TOTPSetup() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues
  } = useForm()

  const navigate = useNavigate()

  const location = useLocation()
  const userInfo = useSelector((state) => state.userInfo)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [otpVerifiedSuccess, setOtpVerifiedSuccess] = useState(false)
  const { t, i18n } = useTranslation(['otp', 'login'])
  const isArabic = i18n.language === 'ar'

  const [qrData, setQrData] = useState({
    qr: '',
    secret: ''
  })

  useEffect(() => {
    // if (location.state.id) {
    //   getQRCode(location.state.id)
    // }
  }, [])

  const getQRCode = (id) => {
    // TOTP: get from token
    setupTOTPAPI(id)
      .then((res) => {
        const qr = res.data?.data?.QR
        const secret = res.data?.data?.SETUP_KEY
        setQrData({
          qr: qr,
          secret: secret
        })
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const submitTOTP = () => {
    const query = {
      user_email: location.state.email,
      id_verification: getValues('sixDigitNumber'),
      is_login: true
    }
    verifyTOTP(query)
      .then((res) => {
        setOtpVerifiedSuccess(true)
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const splitString = (str, n = 5) => {
    let result = []
    for (let i = 0; i < str.length; i += n) {
      result.push(str.slice(i, i + n))
    }
    return result.join('-')
  }

  const modalStyles = {
    width: '673px',
    textAlign: 'center'
  }

  const handleRedirect = () => {
    navigate(`/auth/login`)
    // switch (userInfo.userType) {
    //   case VENDOR_USER_TYPE: {
    //     navigate('/vendor/login')
    //     break
    //   }
    //   case FINANCE_USER_TYPE: {
    //     navigate('/finance/login')
    //     break
    //   }
    //   case BUSINESS_USER_TYPE: {
    //     navigate('/business/login')
    //     break
    //   }
    //   case ADMIN_USER_TYPE: {
    //     navigate('/admin/login')
    //     break
    //   }
    // }
  }
  return (
    <div className="login-container totp-form">
      {otpVerifiedSuccess ? (
        <>
          <p className="title">{t('setTwoFactorAuthentication')}</p>
          <ol className={`${isArabic ? 'rtl' : 'ltr'}`}>
            <li>{t('downloadAndInstallApp')}</li>
            <li>{t('scanQrCode')}</li>
            <li>{t('enterVerificationCode')}</li>
          </ol>
          <p className="subtitle">{t('qrCode')}</p>

          {qrData.qr && <img alt="qr" className="text-center" src={qrData.qr} />}
          <p className="message">{t('cantScanQrCode')}</p>
          <div className="QR-Code-Message my-2 mb-4">
            {qrData.secret && splitString(qrData.secret, 4)}
          </div>
          <form onSubmit={handleSubmit(submitTOTP)}>
            {/* 6-Digit Number Input Field */}
            <InputBox
              titleLabel={t('verificationOtp')}
              className="login-input inputBox mb-0"
              name="sixDigitNumber"
              type="number"
              register={register}
              rules={{
                required: 'OTP is required',
                validate: (value) => value.toString().length === 6 || 'Must be exactly 6 digits'
              }}
              error={errors.sixDigitNumber}
              isRequired
              tooltipIcon
            />
            <NormalButton
              label={t('verify')}
              customClass="login-button mt-3 welcome-btn mb-3"
              isPrimary
              type="submit"
            />

            <NormalButton
              type="button"
              label={t('cancel')}
              customClass="login-button"
              outlineBtn
              onClick={() => setIsModalOpen(true)}
            />
          </form>
        </>
      ) : (
        <div>
          <div className="">
            <p className='welcomeToDiakinTxt'>{t('welcomeToDaikin')}</p>
          </div>
          <p className="mb-2 text-center font-normal text-2xl">
            {t('twoFactorSuccess')}
          </p>
          <hr className='my-4' />
          <p className='text-center text-lg font-normal text-[#2A2A2A]'>{t('youCanNowSignInNewPasword')}</p>
          <NormalButton
            label={t('login:signin')}
            customClass="login-button mt-3"
            isPrimary
            type="button"
            onClick={() => handleRedirect()}
          />
        </div>
      )}

      <CustomModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('confirmCancelProcess')}
        modalStyles={modalStyles}
        description={t('twoFactorRequiredToLogin')}
        titleStyles={{ textAlign: 'center', fontSize: '24px', fontWeight: 600 }}
        closeIcon>
        <p className="modalTxt"></p>
        <div className="d-flex justify-content-between my-3">
          <NormalButton
            label={t('cancel')}
            outlineBtn
            customClass="navigation-buttons"
            onClick={() => setIsModalOpen(false)}
          />
          <NormalButton
            label={t('confirm')}
            isPrimaryModal
            customClass="navigation-buttons"
            onClick={() => {
              navigate(-1)
            }}
          />
        </div>
      </CustomModal>
    </div>
  )
}

export default TOTPSetup
