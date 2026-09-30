import React, { useCallback, useEffect, useState } from 'react'
import styles from './AddEditUser.module.scss'

import { InputBox } from 'components/Common/InputBox'
import { Controller, set, useForm } from 'react-hook-form'
import { NormalButton } from 'components/Common/NormalButton'
import { useLocation, useNavigate } from 'react-router-dom'
import { SelectBox } from 'components/Common/SelectBox'
import { showToast } from '../../../../redux/actions/toastActions'
import { connect } from 'react-redux'
import { Tooltip } from 'components/Common'
import tooltipIcon from '../../../../assets/icons/tooltip.svg'
import { HeaderBar } from 'components/Common/HeaderBar'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { useTranslation } from 'react-i18next'
import {
  getRoleDropdown,
  getDepartmentDropdown,
  getDesignationDropdown,
  getEntityDropdown,
  addUserManagement,
  editUserManagement
} from 'api/UserManagement'
import { toast } from 'react-toastify'
import { Validator } from 'services/validation/formValidations'
import { countryCodes } from 'services/helpers/constants/common'

const AddEditUserComp = ({ isEditable, onNextClick, showToast }) => {
  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    trigger
  } = useForm({
    defaultValues: {
      country_code: '', // default as empty
      phone_number: ''
    }
  })

  const navigate = useNavigate()

  const [addUser, setAddUser] = useState(false)
  const [employeeId, setEmployeeId] = useState('')

  const [loading, setLoading] = useState(false)
  const [roleOptions, setRoleOptions] = useState([])
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [designationOptions, setDesignationOptions] = useState([])
  const [entityOptions, setEntityOptions] = useState([])
  const [userAction, setUserAction] = useState('Add New User')
  const { t } = useTranslation([
    'user_management',
    'myprofile',
    'dashboard',
    'login',
    'vendors',
    'toast'
  ])
  const location = useLocation()
  const userData = location.state?.userData
  const EmpDetailID = userData?.employee?.ID || null

  useEffect(() => {
    selectRole()
    selectEntity()
    selectDesignation()
    selectDepartment()
  }, [])
  const isLikelyInternational = (number) => number.length >= 10 && /^[1-9][0-9]+$/.test(number) // no leading 0
  const getCountryCodeMatch = (fullNumber, countryCodes) => {
    const sorted = [...countryCodes].sort((a, b) => b.code.length - a.code.length)
    return sorted.find((c) => fullNumber.startsWith(c.code))
  }

  useEffect(() => {
    if (userData && departmentOptions.length && designationOptions.length && entityOptions.length) {
      setUserAction('Update')
      setValue('employeeId', userData?.Employee_Code)
      setValue('name', userData.Name)
      setValue('email', userData.Email)
      setValue('phoneNumber', userData.Phone_Number)
      setValue('department', userData.employee?.Department || '')
      setValue('designation', userData.employee?.Designation || '')
      const raw = userData?.Phone_Number?.replace(/\s+/g, '')
      if (raw && raw.startsWith('0')) {
        // local number — fallback
        setValue('country_code', '971') // or '' if you want user to choose
        setValue('phone_number', raw?.replace(/^0/, ''))
      } else {
        const match = userData.Phone_Number ? getCountryCodeMatch(raw, countryCodes) : false
        if (match) {
          const numberWithoutCode = raw.slice(match.code.length)
          setValue('country_code', match.code)
          setValue('phone_number', numberWithoutCode)
        } else {
          // no match, fallback
          setValue('country_code', '')
          setValue('phone_number', raw)
        }
      }
      setValue('login_supplier', userData.Is_Supplier ? 'yes' : 'no')

      // Role
      const roleId = userData.Role_id
      const roleObj = roleOptions.find((opt) => Number(opt.value) === Number(roleId))
      if (roleObj) setValue('role', roleObj?.value || '')

      // Entity
      const entityId = userData.CoCd

      if (entityId) {
        const entityObj = entityOptions.find((opt) => Number(opt.value) === Number(entityId))
        if (entityObj) setValue('entity', entityObj?.value || null)
      }
    }
  }, [userData, departmentOptions, designationOptions, roleOptions, entityOptions, setValue])

  //validation
  const alphaNumericValidator = new Validator()
    .validateNotEmptySpace()
    //.validateNoSymbols()
    .validateNotOnlyNumbers()
    .validateMinLength(3)
    .validateMaxLength(35)
    .build()

  // Fetch dropdown data for role
  const selectRole = useCallback(() => {
    Promise.all([getRoleDropdown()])
      .then(([roleRes]) => {
        const roleOptions = roleRes?.data?.data?.map((person) => ({
          label: person.Role_Name_EN,
          value: person.ID
        }))
        setRoleOptions(roleOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }, [])

  // Fetch dropdown data for department
  const selectDepartment = useCallback(() => {
    const query = {
      type: 'DEPARTMENT'
    }
    Promise.all([getDepartmentDropdown(query)])
      .then(([departmentRes]) => {
        const departmentOptions = departmentRes?.data?.data?.map((dept) => ({
          label: dept.Description_En,
          value: dept.ID
        }))
        setDepartmentOptions(departmentOptions)
      })
      .catch((err) => console.error('Error fetching department dropdown data:', err))
  }, [])

  // Fetch dropdown data for designation
  const selectDesignation = useCallback(() => {
    const query = {
      type: 'DESIGNATION'
    }
    Promise.all([getDesignationDropdown(query)])
      .then(([designationRes]) => {
        const designationOptions = designationRes?.data?.data?.map((desig) => ({
          label: desig.Description_En,
          value: desig.ID
        }))
        setDesignationOptions(designationOptions)
      })
      .catch((err) => console.error('Error fetching designation dropdown data:', err))
  }, [])

  // Fetch dropdown data for entity
  const selectEntity = useCallback(() => {
    Promise.all([getEntityDropdown()])
      .then(([entityRes]) => {
        const entityOptions = entityRes?.data?.data?.map((entity) => ({
          label: entity.Entity_Name,
          value: entity.CoCd
        }))
        setEntityOptions(entityOptions)
      })
      .catch((err) => console.error('Error fetching entity dropdown data:', err))
  }, [])

  const onsubmit = async (data) => {
    try {
      setLoading(true)
      const fullPhone = `${data.country_code?.replace('+', '')}${data.phone_number}`
      const body = {
        name: data.name,
        email: data.email,
        phone_number: fullPhone,
        department: data.department,
        designation: data.designation,
        roleId: data.role,
        entity_id: data.entity,
        Is_Supplier: data.login_supplier === 'yes' ? true : false
      }

      let response
      if (userAction === 'Update') {
        response = await editUserManagement({
          ...body,
          Employee_Id: data.Employee_Code,
          empCode: data.employeeId,
          Id: EmpDetailID
        })
        showToast(t('toast:successTitle'), t('updatedSuccessfully'), 'success')
        // toast.success(response?.data?.message || 'User updated successfully!')
        navigate(-1)
      } else {
        response = await addUserManagement({
          ...body,
          empCode: data.employeeId
        })

        // const generatedId = response?.data?.data?.Employee_Id

        // if (generatedId) {
        //   setEmployeeId(generatedId)
        // }
        showToast(t('toast:successTitle'), t('userAddedSuccessFully'), 'success')
        // toast.success(response?.data?.message || 'User added successfully!')
        navigate(-1)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }
  const phoneValidator = new Validator()
    .validateNotEmptySpace()
    .validateOnlyNumbers()
    .validateMinLength(7)
    .validateMaxLength(16)
    .build()
  const handleAddUser = () => {
    if (userAction === 'Add New User') {
      handleSubmit(onsubmit)()
    } else if (userAction === 'Update') {
      handleSubmit(onsubmit)()
      //setUserAction('Edit')
    }
  }

  return (
    <LeftPageContainer>
      <div className={styles.poContainer}>
        <HeaderBar
          title={
            userAction === 'Add New User' ? t('myprofile:addNewUser') : t('myprofile:editUser')
          }
          slug={
            `${t('dashboard:home')} / ${t('sidebar:userManagement')} / ` +
            (userAction === 'Add New User' ? t('myprofile:addNewUser') : t('myprofile:editUser'))
          }>
          <div>
            <NormalButton
              label={
                userAction === 'Add New User' ? t('myprofile:addNewUser') : t('myprofile:update')
              }
              isPrimary
              customClass="px-4"
              onClick={handleAddUser}
            />
          </div>
        </HeaderBar>
      </div>
      <div className={styles.gcDetailsContainer}>
        <div className={styles.formHeader}>
          <label className="mb-4">
            {userAction === 'Add New User' ? t('myprofile:addNewUser') : t('myprofile:editUser')}
          </label>
        </div>
        <form onSubmit={handleSubmit(onsubmit)}>
          <div className={styles.gcDetailsInputs}>
            <div>
              <InputBox
                titleLabel={t('employeeId.text')}
                className="signInInput inputBox mb-4"
                placeholder={t('employeeId.text')}
                name="employeeId"
                type="text"
                register={register}
                rules={{
                  required: t('employeeId.error')
                }}
                error={errors.employeeId}
                isRequired
                // tooltipIcon
                value={getValues('employeeId')}
                disabled={true}
              />

              <InputBox
                titleLabel={t('department.text')}
                className="disabled signInInput inputBox mb-4"
                name="department"
                placeholder={t('department.text')}
                type="text"
                register={register}
                rules={{
                  required: t('department.error')
                }}
                error={errors.email}
                isRequired
                // tooltipIcon
                value={getValues('department')}
                disabled={true}
              />

              <Controller
                name="phone_number"
                control={control}
                rules={{
                  required: t('phone_number.error'),
                  validate: (value) => phoneValidator('Phone Number', value)
                }}
                render={({ field }) => (
                  <div>
                    {/* Label and Tooltip */}
                    <div className="mb-2" style={{ height: '24px' }}>
                      <label htmlFor="fileInput" className="headLabelForm d-flex">
                        {t('phone_number.text')}
                        <span className="required h-[18px] translate-y-[-5px] mt-1">*</span>
                        <span className="ms-1 mt-2">
                          <Tooltip tooltipMessage={t('phone_number.tooltip')} />
                        </span>
                      </label>
                    </div>

                    {/* Country Code + Input */}
                    <div className="phone-input-container bg-[#FCFCFC]">
                      {/* Country Code Dropdown */}
                      <Controller
                        name="country_code"
                        control={control}
                        rules={{
                          required: t('countryRequired'),
                          validate: (value) => {
                            if (value === '') {
                              return t('selectCountry')
                            }
                            return true
                          }
                        }}
                        render={({ field }) => (
                          <select {...field} className="country-code-select bg-[#FCFCFC]">
                            {/* Default blank option */}
                            <option value="">Country</option>
                            {countryCodes.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.label}
                              </option>
                            ))}
                          </select>
                        )}
                      />

                      <div className="divider"></div>

                      {/* Phone Number Text Input */}
                      <input
                        type="text"
                        {...field}
                        className="w-full country-code-input bg-[#FCFCFC]"
                        placeholder={t('phone_number.tooltip')}
                      />
                    </div>

                    {/* Error Message */}
                    {(errors.phone_number || errors.country_code) && (
                      <p className="error-phoneText">
                        {errors.country_code?.message}
                        {errors.country_code && errors.phone_number && ' & '}
                        {errors.phone_number?.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
            <div>
              <InputBox
                titleLabel={t('enterName.text')}
                className="disabled signInInput inputBox mb-3"
                name="name"
                type="text"
                register={register}
                rules={{
                  required: t('enterName.error'),
                  validate: (value) => alphaNumericValidator('name', value)
                }}
                error={errors.name}
                isRequired
                // tooltipIcon
                tooltipMessage={t('enterName.text')}
                value={getValues('name')}
                disabled={true}
              />
              <InputBox
                titleLabel={t('login:email.text')}
                className="disabled signInInput inputBox mb-4"
                name="email"
                type="text"
                register={register}
                rules={{
                  required: t('login:email.error')
                }}
                error={errors.email}
                isRequired
                // tooltipIcon
                value={getValues('email')}
                disabled={true}
              />
              <InputBox
                titleLabel={t('designation.text')}
                className="disabled signInInput inputBox mb-4"
                name="designation"
                type="text"
                register={register}
                rules={{
                  required: t('designation.error')
                }}
                error={errors.email}
                isRequired
                // tooltipIcon
                value={getValues('designation')}
                disabled={true}
              />
            </div>
            <div>
              <div className={`${styles.userInputs} mb-4 mt-2`}>
                <label className="d-flex gap-1 mb-2">
                  {t('myprofile:role')} <span className="required">*</span>
                  <img src={tooltipIcon} alt="tooltip" title={'Select Role'} />
                </label>
                <Controller
                  name="role"
                  control={control}
                  rules={{ required: t('roleRequired') }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <div className="select-container">
                      <SelectBox
                        className="custom-select-box user-input"
                        error={error}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        options={roleOptions}
                        name="role"
                        isRequired={true}
                        disabled={userAction === 'Edit'}
                      />
                    </div>
                  )}
                />
              </div>
              <div className={`${styles.userInputs}  mb-4`}>
                <label className="d-flex gap-1 mb-2">
                  {t('myprofile:entity')} <span className="required">*</span>
                </label>
                <Controller
                  name="entity"
                  control={control}
                  rules={{
                    required: t('entityRequired')
                  }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <div className="select-container">
                      <SelectBox
                        className="custom-select-box user-input mt-2"
                        error={error}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        options={entityOptions}
                        name="entity"
                        isRequired
                        disabled={true}
                      />
                    </div>
                  )}
                />
              </div>
              <div className={`${styles.userInputs} `}>
                <label className="d-flex gap-1 mb-2 mt-2">
                  {t('vendors:logInAsSupplier')} <span className="required">*</span>
                  <span>
                    <Tooltip tooltipMessage={t('vendors:logInAsSupplier')} />
                  </span>
                </label>
                <div className="radio-container relative h-[45px] mb-2">
                  <div className="d-flex items-center mt-[8px] mb-[30px] gap-2">
                    <span className="radio-option text-[0.875rem] d-flex me-2 gap-1 items-center whitespace-pre">
                      <input
                        type="radio"
                        value="yes"
                        name="login_supplier"
                        {...register('login_supplier', {
                          required: t('selectOption')
                        })}
                      />
                      Yes
                    </span>
                    <span className="radio-option text-[0.875rem] items-center d-flex gap-1 me-2 ms-2 whitespace-pre">
                      <input
                        type="radio"
                        value="no"
                        name="login_supplier"
                        {...register('login_supplier', {
                          required: t('selectOption')
                        })}
                      />
                      No
                    </span>
                  </div>
                  {errors?.login_supplier && (
                    <p className="error-text bottom-0">{errors?.login_supplier.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </LeftPageContainer>
  )
}
const mapStateToProps = (state) => ({
  myProfile: state.myProfile.profileData,
  userInfo: state.userInfo
})

const mapDispatchToProps = { showToast }

export default connect(mapStateToProps, mapDispatchToProps)(AddEditUserComp)
