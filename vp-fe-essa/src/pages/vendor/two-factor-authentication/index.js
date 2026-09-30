import RegisterOtpComp from "components/Auth/RegisterOtp"
import TOtpComponent from "components/Auth/TOtpComponent"
import { useTranslation } from "react-i18next"

export const TwoFactorAuthenticationPage = () => {
  const { t, i18n } = useTranslation('otp')

  return <TOtpComponent title={t('verificationOtp')} />
}

export const VendorRegisterOTPPage = () => {
  return <RegisterOtpComp />
}