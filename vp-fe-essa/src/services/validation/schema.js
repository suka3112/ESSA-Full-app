import * as Yup from 'yup'

const stringValidate = Yup.string()

export const loginAdminSchema = () => {
  return Yup.object({
    email: stringValidate.email('Must be a Valid Email Id').max(255).required('Email is Required'),
    password: stringValidate
      .required('Please Enter your password')
      .min(8, 'Must be 8 characters or more')
      .matches(/[a-z]+/, 'One Lowercase Character')
      .matches(/[A-Z]+/, 'One Uppercase Character')
      .matches(/[@$!%*#?&]+/, 'One Special Character')
      .matches(/\d+/, 'One Number')
  })
}
