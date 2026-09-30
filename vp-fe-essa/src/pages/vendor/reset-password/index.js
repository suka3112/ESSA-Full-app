import ResetPasswordComp from 'components/Auth/ResetPassword'
import ChangePassComp from 'components/Auth/ChangePass'

export const ResetPassPage = () => {
  return <ResetPasswordComp />
}

export const ResetPassWordProfilePage = () => {
  return <ResetPasswordComp isProfileReset={true} />
}

export const ChangePassword = () => {
  return <ResetPasswordComp formTitle="change_pwd" />
}
export const ChangePasswordPage = () => {
  return <ChangePassComp />
}
