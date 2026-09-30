import OtpComponent from 'components/Auth/TOtpComponent'
import { NormalButton } from 'components/Common'
import { HeaderBar } from 'components/Common/HeaderBar'
import { InputBox } from 'components/Common/InputBox'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Box, Typography } from '@mui/material'
import FinanceOtpComp from './FinanceOtpComp'
import CustomModal from 'components/Common/Modal'
import sucessTickIcon from 'assets/icons/sucessTickIcon.svg'
import { theme } from 'theme'
import { useTranslation } from 'react-i18next'


export const FinanceResetPassword = () => {
  const [reset, setReset] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSecondModalOpen, setIsSecondModalOpen] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const { t } = useTranslation(['reset-password', 'otp', 'popup'])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm()

  const handleResetPassword = () => {
    setReset(true)
  }

  const handleSubmitForm = async () => {
    setModalMessage(t('popup:passwordResetLinkNotice'))
    setIsModalOpen(true)
  }

  const handleConfirmSubmit = () => {
    setIsModalOpen(false)
    setModalMessage(t('popup:emailSentWithResetLink'))
    setIsSecondModalOpen(true)
  }

  const handleCancelSubmit = () => {
    setIsModalOpen(false)
  }

  const handleCloseSecondModal = () => {
    setIsSecondModalOpen(false)
  }

  return (
    <>
      <LeftPageContainer>
        <HeaderBar title="Password Reset" slug="Home / Password Reset" />
        {!reset ? (
          <Box>
            <Box
              sx={{
                backgroundColor: 'white',
                width: 400,
                paddingX: 5,
                paddingY: 4,
                borderRadius: 5,
                margin: 'auto',
                boxShadow: '0px 4px 4px rgba(66, 133, 244, 0.25)'
              }}>
              <Typography sx={{ fontSize: '24px', fontWeight: '600', color: theme.colors.primary }}>
                Reset Your Password
              </Typography>

              <label className="d-flex my-3">
                <Typography sx={{ fontSize: '20px', fontWeight: '600', marginRight: 1 }}>
                  {t('email')}:
                </Typography>
                <Typography sx={{ fontSize: '20px', fontWeight: '400' }}>test@gmail.com</Typography>
              </label>
              <InputBox
                titleLabel={t('oldPassword.text')}
                className="login-input inputBox mb-3  "
                name="oldPassword"
                type="password"
                placeholder={t('oldPassword.text')}
                register={register}
                error={errors.oldPassword}
                isRequired
                tooltipIcon
              />
              <InputBox
                titleLabel={t('newPassword.text')}
                className="login-input inputBox mb-3"
                name="newPassword"
                type="password"
                placeholder={t('newPassword.text')}
                register={register}
                error={errors.newPassword}
                isRequired
                tooltipIcon
                rules={{
                  required: 'Password is required'
                }}
              />
              <InputBox
                titleLabel={t('re_enter_new_password.text')}
                className="login-input inputBox mb-3"
                name="renterNewPassword"
                type="password"
                placeholder={t('re_enter_new_password.text')}
                register={register}
                error={errors.renterNewPassword}
                rules={{
                  required: 'Password is required'
                }}
                isRequired
                tooltipIcon
              />
              <NormalButton
                label={t('reset')}
                isPrimary
                customClass="my-3 customButtonWidth"
                onClick={() => handleResetPassword()}
              />

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'end',
                  color: theme.colors.primary,
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                <label onClick={handleSubmitForm}>Forgot Password?</label>
              </Box>
            </Box>
          </Box>
        ) : (
          <FinanceOtpComp title="Two Factor Authentication" customClass="" />
        )}
        <CustomModal
          open={isModalOpen}
          onClose={handleCancelSubmit}
          modalStyles={{ width: 600 }}
          closeIcon>
          <p className="modalTxt">{modalMessage}</p>
          <div className="d-flex justify-content-between my-3">
            <NormalButton
              label={t('otp:cancel')}
              outlineBtn
              customClass="navigation-buttons"
              onClick={handleCancelSubmit}
            />
            <NormalButton
              label={t('otp:confirm')}
              isPrimaryModal
              customClass="navigation-buttons"
              onClick={handleConfirmSubmit}
            />
          </div>
        </CustomModal>

        <CustomModal
          open={isSecondModalOpen}
          onClose={handleCloseSecondModal}
          modalStyles={{ width: 400 }}
          closeIcon>
          <img src={sucessTickIcon} className="m-auto" />
          <p className="modalTxt mt-3">{modalMessage}</p>
          <NormalButton
            label="Close"
            outlineBtn
            customClass="customButtonWidth"
            onClick={handleCloseSecondModal}
          />
        </CustomModal>
      </LeftPageContainer>
    </>
  )
}
