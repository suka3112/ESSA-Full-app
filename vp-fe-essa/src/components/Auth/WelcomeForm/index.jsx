import React, { useState } from 'react'
import '../Login/style.scss'
import './style.scss'
import { InputBox } from '../../Common/InputBox'
import { NormalButton } from '../../Common/NormalButton'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

function WelcomeForm() {
  const { t } = useTranslation(['otp', 'reset-password', 'login', 'toast'])
  return (
    <div className="login-container welcome-form-container">
      <p className="title">{t('welcomeToDaikin')}</p>
      <p className="subtitle">{t('twoFactorSuccess')}</p>
      <p className="message">{t('youCanNowSignInNewPasword')}</p>
      <NormalButton label={t('login:signin')} className="login-button mt-3 welcome-btn" isPrimary type="submit" />
    </div>
  )
}

export default WelcomeForm
