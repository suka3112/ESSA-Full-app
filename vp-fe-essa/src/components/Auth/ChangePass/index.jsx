import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { InputBox } from '../../Common/InputBox'
import { NormalButton } from '../../Common/NormalButton'
import styles from './ChangePass.module.scss'
import successGif from '../../../assets/gif/tickGreen.gif'
import { AUTH_SETUP } from 'constants/userType'
import { LOGIN } from 'constants/url'
import { useTranslation } from 'react-i18next'
import {
  forgotPassword,
  forgotpasswordValidation,
  resetPassword,
} from 'api/Login'
import { useLocation } from 'react-router-dom'
import { connect } from 'react-redux'
import { showToast } from '../../../redux/actions/toastActions'
import { Validator } from '../../../services/validation/formValidations'
import { toast } from 'react-toastify'

const ChangePassComp = ({
  formTitle = 'reset_pwd',
  showToast,
  isProfileReset = false,
  userInfo: { userType }
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const email = searchParams.get('email')
  const resetPasswordToken = searchParams.get('token')

  const [status, setStatus] = useState('')
  const [reset, setReset] = useState(false) // Used for profile-based reset to show OTP
  const [newPassword, setNewPassword] = useState(null)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [forgotPassMailSent, setForgotPassMailSent] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    control,
    formState: { errors }
  } = useForm()

  const { t } = useTranslation(['reset-password', 'login', 'otp', 'popup', 'sidebar', 'toast'])

  const passwordValidator = new Validator()
    .validateNotEmptySpace()
    .validateMinLength(5)
    .validateMaxLength(50)
    .validateNotOnlySymbols()
    .validateAtLeastOneSymbol()
    .validateAtLeastOneNumber()
    .validateAtLeastOneCharacter()
    .validateAtLeastOneUppercase()
    .validateAtLeastOneLowercase()
    .build()

  const oldPasswordValidator = new Validator().validateNotEmptySpace().build()

  // useEffect(() => {
  //   let query = {
  //     email:email
  //   }
  //   resetPasswordLinkCheck(query)
  // },[])

  const onSubmit = (data) => {
    let query = {
      is_forgotPassword: true,
      token: resetPasswordToken
    }
    let body = {
      forgotPasswordEmail: email,
      password: data.password
    }
    forgotpasswordValidation(query, body)
      .then((res) => {
        setStatus('success')
        setReset(true)
        showToast(
          t('popup:passwordResetSuccess'),
          t('popup:passwordResetConfirmation'),
          'success'
        )
      })
      .catch((err) => {
        console.error(err)
        setStatus('failure')
        toast.error(err?.response?.data?.message)
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
      })
  }

  const handleResetPassword = async (data) => {
    setNewPassword(data?.newPassword)
    let body = {
      current_pass: data.oldPassword,
      password: data.newPassword
    }
    const isValid = await trigger()

    if (isValid) {
      resetPassword(body)
        .then((res) => {
          setStatus('success')
          setReset(true)
          // localStorage.clear()
          // sessionStorage.clear()
          // navigate(`/${AUTH_SETUP}${LOGIN}`);
        }).catch((err) => {
          console.error(err)
          setStatus('failure')
          //showToast('Error.', `${err?.response?.data?.message}`, 'error')
          toast.error(err?.response?.data?.message)
        })
    } else {
      toast.error(t('fillAllTheFields'))
      //showToast('Error.', 'Please fill all the fields', 'error')
    }
  }

  const handleRedirect = (status) => {
    if (status === 'success') {
      navigate(`/${AUTH_SETUP}${LOGIN}`)
    }
    // } else {
    //   navigate(`/${AUTH_SETUP}${CHANGE_PASSWORD}`)
    // }
  }

  const handleConfirmSubmit = () => {
    let body = {
      email: email
    }
    forgotPassword(body)
      .then((res) => {
        setIsForgotPassword(false)
        setForgotPassMailSent(true)
      })
      .catch((err) => {
        console.error(err?.response?.data?.message, 'errorrr')
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(err?.response?.data?.message)
        setIsForgotPassword(false)
      })
  }

  return (
    <div className="login-container reset-password-container" style={{ marginTop:0 }}>
      {
        status === 'success' ? (
          <div>
            <div className="successGif">
              <img
                src={successGif}
                alt="status"
                height="71px"
                width="70px"
              />
            </div>
            <p className="otp-title mb-2 text-center rpc-msg font-normal text-2xl ">
              {t('popup:yourPasswordHasBeenSuccessfullyReset')}
            </p>
            {status === 'success' && <p className="font-normal text-lg text-center">{t('youCanNowSignInNewPasword')}</p>}
            <NormalButton
              label={t('login:signin')}
              customClass="login-button mt-3"
              isPrimary
              type="button"
              onClick={() => handleRedirect(status)}
            />
          </div>
        ) : (
          //  <div className={styles.resetPasswordContainerOuter}>
          <div >
            <label className={styles.resetTitle}>{t('reset_your_password')}</label>
            {/* <p className={`${styles.emailTxt} my-3`}>
                <b>{t('email')}:</b> {email}
              </p> */}

            <form onSubmit={handleSubmit(handleResetPassword)}>
              <div className="mb-3 mt-3">
                <Controller
                  name="oldPassword"
                  control={control}
                  rules={{
                    required: t('password.error'),
                    validate: (value) => oldPasswordValidator('', value)
                  }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <InputBox
                      titleLabel={t('oldPassword.text')}
                      className="login-input-reset inputBox mb-0"
                      name="oldPassword"
                      type="password"
                      PasswordIcon={true}
                      onChange={onChange}
                      error={errors.oldPassword}
                      isRequired
                      value={value || ''}
                    />
                  )}
                />
              </div>
              <div className="mb-3">
                <InputBox
                  titleLabel={t('newPassword.text')}
                  className="login-input-reset  inputBox mb-0"
                  name="newPassword"
                  type="password"
                  PasswordIcon={true}
                  register={register}
                  rules={{
                    required: t('newPassword.error'),
                    validate: (value) => {
                      const oldPassword = watch('oldPassword')
                      if (value === oldPassword) {
                        return 'New password must be different from old password'
                      }
                      return passwordValidator('', value)
                    }
                  }}
                  error={errors.newPassword}
                  isRequired
                />
              </div>
              <div className="mb-3">
                <InputBox
                  titleLabel={t('re_enter_new_password.text')}
                  className="login-input-reset  inputBox mb-0"
                  name="renterNewPassword"
                  type="password"
                  PasswordIcon={true}
                  register={register}
                  rules={{
                    required: t('re_enter_new_password.error'),
                    validate: (value) =>
                      value === watch('newPassword') || t('passDoNotMatch')
                  }}
                  error={errors.renterNewPassword}
                  isRequired
                />
              </div>
              <NormalButton
                label={t('reset')}
                isPrimary
                customClass={`${styles.resetBtn} my-3`}
                type="submit"
              />
            </form>

          </div>
        )}
    </div>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

const mapDispatchToProps = {
  showToast
}

export default connect(mapStateToProps, mapDispatchToProps)(ChangePassComp)
