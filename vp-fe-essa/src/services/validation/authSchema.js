import { endPoints } from 'services/helpers/config'
import * as Yup from 'yup'

//ADMIN LOGIN SCHEMA
export const loginSchema = Yup.object().shape(
  {
    email: Yup.string().when(endPoints.auth.IS_VALIDATE, {
      is: (value) => Boolean(value),
      then: Yup.string().email('Must be a valid email id').max(255).required('Email is required'),
      otherwise: Yup.string().nullable()
    }),
    password: Yup.string().when(endPoints.auth.IS_VALIDATE, {
      is: (value) => Boolean(value),
      then: Yup.string()
        .required('Please enter your password')
        .min(8, 'Must be 8 characters or more')
        .matches(/[a-z]+/, 'One lowercase character')
        .matches(/[A-Z]+/, 'One uppercase character')
        .matches(/[@$!%*#?&]+/, 'One special character')
        .matches(/\d+/, 'One number'),
      otherwise: Yup.string().nullable()
    })
  },
  [endPoints.auth.IS_VALIDATE]
)
