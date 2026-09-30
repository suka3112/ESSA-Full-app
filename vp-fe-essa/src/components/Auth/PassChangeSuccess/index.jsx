import '../Login/style.scss'
import '../WelcomeForm/style.scss'
import { NormalButton } from '../../Common/NormalButton'
import successGIf from '../../../assets/gif/tickGreen.gif'
import { useTranslation } from 'react-i18next'

function PassChangeSuccessComp() {
  const { t } = useTranslation(['otp', 'reset-password', 'login', 'toast'])
  return (
    <div className="login-container welcome-form-container">
      <div className="successGif">
        <img src={successGIf} alt="success" height="71px" width="70px" />
      </div>
      <p className="title">{t('welcomeToDaikin')}</p>
      <p className="subtitle">{t('reset-password:passwordChangedSuccessfully')}</p>
      <p className="message">{t('youCanNowSignInNewPasword')}</p>
      <NormalButton
        label={t('login:signin')}
        className="login-button mt-3 welcome-btn"
        isPrimary
        type="submit"
      />
    </div>
  )
}

export default PassChangeSuccessComp
