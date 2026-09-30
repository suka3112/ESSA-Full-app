import React, { useEffect, useState, startTransition } from 'react'
import './GeneralDetails.scss'
import { InputBox } from '../../../Common/InputBox'
import { Controller, useWatch } from 'react-hook-form'
import { SelectBox } from 'components/Common/SelectBox'
import tooltip from '../../../../assets/icons/tooltip.svg'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import {
  fetchCities,
  fetchCountries,
  fetchCurrencies,
  fetchIndustryKeys,
  fetchIndustryType,
  fetchRegions,
  fetchTaxabilityBasis,
  fetchWhtRate
} from 'api/UserRegister'
import { setDropDownData } from '../../../../redux/actions/userRegisterActions'
import { Validator } from '../../../../services/validation/formValidations'
import { Tooltip } from 'components/Common'
import {
  countryCodes,
  industryTypeOptions,
  taxableOptions,
  whtApplicableOptions,
  whtRateOptions
} from 'services/helpers/constants/common'
import { useLocation } from 'react-router'
import { ADMIN_USER_TYPE } from 'constants/userType'
import { getCRPersons } from 'api/MyProfile'
import { getEntityId } from 'services/utilities'
import { max } from 'moment'

function GeneralDetailsComp(props) {
  const {
    register,
    errors,
    dropdownData,
    setDropDownData,
    clearErrors,
    control,
    daikinEntityName,
    daikinContactName,
    onboardVendorData,
    setValue,
    mode,
    trigger,
    userInfo: { userType }
  } = props

  const { t, i18n } = useTranslation(['general_details_comp', 'register', 'vendors'])
  const isArabic = i18n.language === 'ar'
  const [emailFields, setEmailFields] = useState([{ id: Date.now() }])
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const { search } = useLocation()
  const urlQueryParams = new URLSearchParams(search)
  const queryObject = Object.fromEntries(urlQueryParams.entries())
  const whtApplicable = useWatch({ control, name: 'wht_applicable' })

  const isViewMode = mode === 'view'

  useEffect(() => {
    fetchDropdownValues()
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      fetchLocationDataByCountry(selectedCountry)
    }
  }, [selectedCountry])

  const handleSetSelectedCountry = (value) => {
    startTransition(() => {
      setSelectedCountry(value)
    })
  }

  const fetchDropdownValues = () => {
    const promises = [
      fetchCountries(),
      fetchCurrencies(),
      fetchIndustryType(),
      fetchIndustryKeys(),
      fetchWhtRate(),
      fetchTaxabilityBasis()
    ]

    if (isAdmin) {
      let query = {
        entity_id: getEntityId()
      }
      promises.push(getCRPersons(query))
    }

    Promise.all(promises)
      .then((responses) => {
        const [
          countriesRes,
          currenciesRes,
          industryTypeRes,
          industryKeysRes,
          whtRes,
          taxabilityBasisRes,
          crPersonsRes
        ] = responses

        const countryList = Array.isArray(countriesRes.data.data) ? countriesRes.data.data : []
        const currencyList = Array.isArray(currenciesRes.data.data) ? currenciesRes.data.data : []
        const industryTypeList = Array.isArray(industryTypeRes.data.data)
          ? industryTypeRes.data.data
          : []
        const industryKeyList = Array.isArray(industryKeysRes.data.data)
          ? industryKeysRes.data.data
          : []
        const whtList = Array.isArray(whtRes.data.data) ? whtRes.data.data : []
        const taxabilityBasisList = Array.isArray(taxabilityBasisRes.data.data)
          ? taxabilityBasisRes.data.data
          : []
        const crPersonList = isAdmin && crPersonsRes?.data?.data ? crPersonsRes.data.data : []

        const formattedData = {
          countries: countryList.map((item) => ({
            name: item.name,
            isoCode: item.isoCode
          })),
          currencies: currencyList.map((item) => ({
            name: item.name,
            countryCode: item.code
          })),
          industryType: industryTypeList.map((item) => ({
            name: item.Description_En,
            key: item.Code
          })),
          industryKeys: industryKeyList.map((item) => ({
            name: item.Description_En,
            key: item.Code
          })),
          daikinContacts: crPersonList.map((item) => ({
            name: item.Name,
            key: item.Employee_Id
          })),
          whtRates: whtList.map((item) => ({
            name: item.Description_En,
            key: item.Code
          })),
          taxabilityBasis: taxabilityBasisList.map((item) => ({
            name: item.Description_En,
            key: item.Code
          }))
        }
        setDropDownData(formattedData)
      })
      .catch((err) => console.error(err))
  }

  const fetchLocationDataByCountry = (selectedCountry) => {
    let query = { id: selectedCountry }

    Promise.all([fetchCities(query), fetchRegions(query)])
      .then(([citiesRes, regionsRes]) => {
        const citiesList = Array.isArray(citiesRes.data.data) ? citiesRes.data.data : []
        const regionsList = Array.isArray(regionsRes.data.data) ? regionsRes.data.data : []

        const formattedData = {
          cities: citiesList.map((item) => ({
            name: item.name,
            countryCode: item.countryCode
          })),
          regions: regionsList.map((item) => ({
            name: item.name,
            isoCode: item.isoCode
          }))
        }
        setDropDownData({ ...dropdownData, ...formattedData })
      })
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    if (onboardVendorData) {
      setValue('vendor_name', onboardVendorData?.Vendor_Name_EN || '')
      setValue('phone_number', onboardVendorData?.Phone)
      setValue('email', onboardVendorData?.Email || '')
      setValue('street_and_house_number', onboardVendorData?.Street_House_No || '')
      setValue('postel_code', onboardVendorData?.Postal_Code)
      setValue('wht_applicable', onboardVendorData?.Wht_Applicable === true ? 'Yes' : 'No' || '')
      setValue('fax', onboardVendorData?.Fax || '')
    }
  }, [onboardVendorData])

  useEffect(() => {
    const industryKey = dropdownData?.industryKeys?.find(
      (opt) => opt.key === onboardVendorData?.Industry_Key_details?.Code
    )
    const industryType = industryTypeOptions.find(
      (opt) => opt.value === onboardVendorData?.Industry_Type
    )
    const whtRate = whtRateOptions.find((opt) => opt.value === onboardVendorData?.Wht_Rate)
    const taxableBasis = taxableOptions.find((opt) => opt.value === onboardVendorData?.Taxble_Basis)
    const country = dropdownData?.countries?.find(
      (opt) => opt.isoCode === onboardVendorData?.Country
    )

    if (industryKey) setValue('industryKey', industryKey.key)
    if (industryType) setValue('industryType', industryType.value)
    if (whtRate) setValue('wht_rate', whtRate.value)
    if (taxableBasis) setValue('taxable_basis', taxableBasis.value)
    if (country) {
      setValue('country', country?.isoCode)
      setSelectedCountry(country?.isoCode)
    }
  }, [onboardVendorData])

  const isAdmin = userType === ADMIN_USER_TYPE

  useEffect(() => {
    if (selectedCountry) {
      fetchLocationDataByCountry(selectedCountry)
    }
  }, [selectedCountry])

  useEffect(() => {
    const city = dropdownData?.cities?.find((opt) => opt.name === onboardVendorData?.City)
    const region = dropdownData?.regions?.find((opt) => opt.isoCode === onboardVendorData?.Region)

    if (city) setValue('city', city.name)
    if (region) setValue('region', region.isoCode)
  }, [dropdownData])

  const alphaNumericValidator = new Validator()
    .validateNotEmptySpace()
    //.validateNoSymbols()
    .validateNotOnlyNumbers()
    .validateMinLength(3)
    .validateMaxLength(70)
    .build()

  const streetValidator = new Validator()
    .validateNotEmptySpace()
    .validateNotOnlySymbols()
    .validateNotOnlyNumbers()
    .validateMinLength(3)
    .validateMaxLength(70)
    .build()

  const postalCodeValidator = new Validator()
    .validateNotEmptySpace()
    .validatePostalCode()
    .validateMinLength(2)
    .validateMaxLength(10)
    .validateNoSymbols()
    .build()

  const faxValidator = new Validator()
    .validateNotEmptySpace()
    .validateFaxNumber()
    .validateMinLength(5)
    .validateMaxLength(30)
    .validateNoSymbols()
    .build()

  const phoneValidator = new Validator()
    .validateNotEmptySpace()
    .validateOnlyNumbers()
    .validateMinLength(7)
    .validateMaxLength(16)
    .build()

  const emailValidator = new Validator()
    .validateNotEmptySpace()
    .validateEmail()
    .validateMaxLength(241)
    .build()

  const fields = [
    {
      titleLabel: t('diakinEntityName.text'),
      name: 'diakinEntityName',
      isRequired: false,
      type: 'text',
      disabled: true,
      defaultValue: queryObject?.entityName || daikinEntityName
    },
    isAdmin
      ? {
          titleLabel: t('diakinContactName.text'),
          name: 'diakinContactName',
          isRequired: true,
          type: 'select',
          options:
            dropdownData?.daikinContacts?.map((item) => ({
              label: item.name,
              value: item.key
            })) || [],
          placeholder: t('diakinContactName.text'),
          defaultValue: queryObject?.contactName || daikinContactName
        }
      : {
          titleLabel: t('diakinContactName.text'),
          name: 'diakinContactName',
          isRequired: false,
          type: 'text',
          disabled: true,
          defaultValue: queryObject?.contactName || daikinContactName
        },
    {
      titleLabel: t('vendor_name.text'),
      name: 'vendor_name',
      isRequired: true,
      type: 'text',
      placeholder: t('vendor_name.text'),
      rules: {
        validate: (value) => alphaNumericValidator(t('vendor_name.text'), value)
      },
      maxLength: 70
    },
    {
      titleLabel: t('vendorNameArabic.text'),
      name: 'vendorNameArabic',
      isRequired: true,
      type: 'text',
      placeholder: t('vendorNameArabic.text'),
      rules: {
        validate: (value) => alphaNumericValidator(t('vendorNameArabic.error'), value)
      },
      maxLength: 70
    },
    {
      titleLabel: t('street_and_house_number.text'),
      name: 'street_and_house_number',
      isRequired: true,
      type: 'text',
      placeholder: t('street_and_house_number.text'),
      rules: {
        validate: (value) => streetValidator(t('street_and_house_number.text'), value)
      },
      maxLength: 70
    },
    {
      titleLabel: t('postel_code.text'),
      name: 'postel_code',
      isRequired: true,
      type: 'text',
      placeholder: t('postel_code.text'),
      rules: {
        validate: (value) => postalCodeValidator(t('postel_code.text'), value, t)
      },
      maxLength: 10
    },
    {
      titleLabel: t('country.text'),
      name: 'country',
      isRequired: true,
      type: 'select',
      options:
        dropdownData?.countries?.map((item) => ({
          label: item.name,
          value: item.isoCode
        })) || [],
      placeholder: t('selectCountry')
    },
    {
      titleLabel: t('city.text'),
      name: 'city',
      isRequired: true,
      type: 'select',
      options:
        dropdownData?.cities?.map((item) => ({
          label: item.name,
          value: item.name
        })) || [],
      placeholder: t('selectCity')
    },
    {
      titleLabel: t('region.text'),
      name: 'region',
      isRequired: true,
      type: 'select',
      options:
        dropdownData?.regions?.map((item) => ({
          label: item.name,
          value: item.isoCode
        })) || [],
      placeholder: t('selectRegion')
    },
    {
      titleLabel: t('phone_number.text'),
      name: 'phone_number',
      isRequired: true,
      type: 'number',
      errorName: t('phone_number.error'),
      placeholder: t('phone_number.text'),
      rules: {
        validate: (value) => phoneValidator(t('phone_number.text'), value)
      },
      maxLength: 16
    },
    {
      titleLabel: t('fax.text'),
      name: 'fax',
      isRequired: false,
      type: 'number',
      placeholder: t('fax.text'),
      pattern: {
        value: /^[0-9-+()\s]{7,15}$/,
        message: 'Fax number is invalid'
      },
      rules: {
        validate: (value) => {
          if (!value) return true
          return faxValidator(t('fax.text'), value)
        }
      },
      maxLength: 30
    },
    {
      titleLabel: t('industryType.text'),
      name: 'industryType',
      isRequired: true,
      type: 'select',
      options:
        dropdownData?.industryType?.map((item) => ({
          label: item.name,
          value: item.key
        })) || []
    },
    {
      titleLabel: t('industryKey.text'),
      name: 'industryKey',
      isRequired: true,
      type: 'select',
      tooltipMessage: 'Select type of industry',
      options:
        dropdownData?.industryKeys?.map((item) => ({
          label: item.name,
          value: item.key
        })) || []
    },
    {
      titleLabel: t('wht_applicable.text'),
      name: 'wht_applicable',
      isRequired: true,
      type: 'radio',
      errorName: t('wht_applicable.error'),
      tooltipMessage: t('wht_applicable.tooltip'),
      options: whtApplicableOptions
    },
    {
      titleLabel: t('wht_rate.text'),
      name: 'wht_rate',
      isRequired: whtApplicable === 'Yes' || whtApplicable === null,
      type: 'select',
      options:
        dropdownData?.whtRates?.map((item) => ({
          label: item.name,
          value: item.key
        })) || [],
      disabled: whtApplicable === 'No' || whtApplicable === undefined
    },
    {
      titleLabel: t('taxable_basis.text'),
      name: 'taxable_basis',
      //isRequired: whtApplicable === 'Yes' || whtApplicable === null,
      isRequired: true,
      type: 'select',
      options:
        dropdownData?.taxabilityBasis?.map((item) => ({
          label: item.name,
          value: item.key
        })) || []
      //disabled: whtApplicable === 'No' || whtApplicable === undefined
    }
  ]

  const addEmailField = (index) => {
    const newField = { id: Date.now() + Math.random() } // unique ID
    setEmailFields([...emailFields, newField])
    const newEmailKey = `email${emailFields.length + 1}` // +1 for next secondary
    setValue(newEmailKey, '')
  }

  const removeEmailField = (idToRemove) => {
    setEmailFields(emailFields.filter((field) => field.id !== idToRemove))
  }

  // Find index of "fax" field in the fields array
  const faxFieldIndex = fields.findIndex((field) => field.name === 'fax')

  // Split fields before the "fax" field, after "fax", and include email fields in between
  const fieldsBeforeFax = fields.slice(0, faxFieldIndex + 1)
  const fieldsAfterFax = fields.slice(faxFieldIndex + 1)

  return (
    <div className={`form-container ${userType === ADMIN_USER_TYPE ? 'admin-form-container' : ''}`}>
      <div className="form-title">
        <div>{t('general_communication_details')}</div>
      </div>
      <hr className="mb-3 border-t-2  border-[#E5E5E5]" />
      <form>
        <div className="form-fields-container">
          {/* Render fields before fax */}
          {fieldsBeforeFax.map((field, index) => (
            <div key={index} className="form-field">
              {field.type === 'text' ||
              (field.type === 'number' && field.name !== 'phone_number') ? (
                <Controller
                  name={field.name}
                  control={props.control}
                  rules={{
                    required: field.isRequired ? t(`${field.name}.error`) : false,
                    ...field.rules
                  }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <InputBox
                      titleLabel={field.titleLabel}
                      className={
                        field?.disabled
                          ? `disabled min-w-[220px] inputBox mb-0`
                          : 'min-w-[220px] inputBox mb-0'
                      }
                      name={field.name}
                      placeholder={field.placeholder}
                      type="text"
                      error={error}
                      tooltipIcon
                      tooltipMessage={t(`${field.name}.tooltip`)}
                      isRequired={field.isRequired}
                      disabled={field.disabled || isViewMode}
                      labelSize="headLabelForm"
                      maxLength={field.maxLength}
                      onChange={(e) => {
                        onChange(e.target.value)
                        //clearErrors(field.name); // Clear error when the user types
                      }}
                      value={value ?? field.defaultValue ?? ''} // Ensure a controlled input with a default empty string
                    />
                  )}
                />
              ) : field.type === 'select' ? (
                <Controller
                  name={field.name}
                  control={props.control}
                  rules={{ required: t(`${field.name}.error`) }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <div className="select-container ">
                      <SelectBox
                        titleLabel={field.titleLabel}
                        value={value || ''}
                        options={field.options}
                        name={field.name}
                        isRequired={field.isRequired}
                        className="custom-select-box mb-0"
                        tooltipIcon
                        tooltipMessage={t(`${field.name}.tooltip`)}
                        placeholder={field.placeholder ? field.placeholder : t('select')}
                        error={error}
                        onChange={(event) => {
                          const selectedValue = event?.target?.value
                          onChange(selectedValue)
                          if (field.name === 'country') {
                            handleSetSelectedCountry(selectedValue)
                          }
                        }}
                        disabled={isViewMode}
                      />
                    </div>
                  )}
                />
              ) : field.type === 'radio' ? (
                <div className="radio-container">
                  <label className="mt-2">{field.titleLabel}</label>
                  <label className="required">{field.isRequired && '*'}</label>
                  <div className="d-flex mt-4">
                    {field.options.map((option, optionIndex) => (
                      <span key={optionIndex} className="radio-option me-2">
                        <input
                          type="radio"
                          name={field.name}
                          value={option.value}
                          {...register(field.name, {
                            required: t(`${field.name}.error`)
                          })}
                        />
                        {option.label}
                      </span>
                    ))}
                  </div>
                  {errors[field.name] && <p className="error-text">{errors[field.name].message}</p>}
                </div>
              ) : field.name === 'phone_number' ? (
                <Controller
                  name="phone_number"
                  control={control}
                  rules={{
                    required: field?.errorName,
                    validate: (value) => phoneValidator(t('phone_number.text'), value)
                  }}
                  render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => (
                    <div>
                      <div className="mb-2" style={{ height: '24px' }}>
                        <label htmlFor="fileInput" className="headLabelForm d-flex font-[500]">
                          {t('phone_number.text')}
                          <span className="required h-[18px] translate-y-[-5px]">*</span>
                          <span className="ms-1">
                            <Tooltip tooltipMessage={t('phone_number.tooltip')} />
                          </span>
                        </label>
                      </div>

                      <div className="phone-input-container bg-[#FCFCFC]">
                        {/* Country Code Dropdown */}
                        <Controller
                          name="country_code"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              disabled={isViewMode}
                              className={`${
                                isViewMode
                                  ? 'disabled country-code-select bg-[#FCFCFC]'
                                  : 'country-code-select bg-[#FCFCFC]'
                              }`}>
                              {countryCodes.map((country) => (
                                <option key={country.code} value={country.code}>
                                  {country.label}
                                </option>
                              ))}
                            </select>
                          )}
                        />

                        <div className="divider"></div>

                        {/* Controlled Input Field */}
                        <input
                          disabled={isViewMode}
                          type="text"
                          onChange={onChange}
                          onBlur={onBlur}
                          value={value ?? ''}
                          ref={ref}
                          className={`w-full ${
                            isViewMode
                              ? 'disabled phone-number-input bg-[#FCFCFC]'
                              : 'country-code-input bg-[#FCFCFC]'
                          }`}
                          maxLength={16}
                        />
                      </div>
                      {/* Display Validation Errors */}
                      {error && <p className="error-phoneText">{error.message}</p>}
                    </div>
                  )}
                />
              ) : null}
            </div>
          ))}

          {/* Render dynamic email fields in between fax and industry type */}
          {emailFields.map((field, emailIndex) => {
            const emailKey = `email${emailIndex === 0 ? '' : emailIndex + 1}`
            const tooltipMessage =
              emailIndex === 0
                ? t('email_primary.tooltip') // For the primary email
                : t('email_Secondary.tooltip', { index: emailIndex })

            return (
              <div key={field.id} className="form-field">
                <Controller
                  //name={`email${emailIndex === 0 ? '' : emailIndex + 1}`}
                  name={emailKey}
                  control={control}
                  rules={{
                    required: emailIndex === 0 ? t(`email_primary.error`) : false,
                    validate: (value) =>
                      //emailValidator(`email${emailIndex === 0 ? '' : emailIndex + 1}`, value)
                      // emailValidator(emailKey, value),
                      emailIndex === 0
                        ? emailValidator(t('email_primary.text'), value)
                        : emailValidator(`${t('email_Secondary.text')} ${emailIndex}`, value)
                  }}
                  render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => (
                    <InputBox
                      titleLabel={
                        emailIndex === 0
                          ? t('email_primary.text')
                          : `${t('email_Secondary.text')} ${emailIndex}`
                      }
                      className="inputBox min-w-[220px] mb-0"
                      //emailIconTop={"-2px"}
                      //name={`email${emailIndex === 0 ? '' : emailIndex + 1}`}
                      name={emailKey}
                      type="text"
                      //register={register}
                      rules={{
                        required: emailIndex === 0 ? t(`email_primary.error`) : false,
                        pattern: {
                          value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                          message: 'Invalid email address'
                        }
                      }}
                      error={error} // Use the error from Controller's fieldState
                      tooltipIcon
                      // tooltipMessage={t('email_primary.tooltip')}
                      tooltipMessage={tooltipMessage}
                      isRequired={true}
                      addEmail={emailIndex === 0 ? '+' : '-'}
                      clearErrors={clearErrors}
                      handleAddEmail={() => addEmailField(emailIndex)}
                      handleRemoveEmail={() => removeEmailField(field.id)}
                      onChange={onChange} // Pass onChange from Controller
                      onBlur={onBlur}
                      value={value ?? ''} // Controlled value from Controller
                      ref={ref} // Pass ref from Controller to manage focus
                      disabled={isViewMode}
                      placeholder={
                        emailIndex === 0
                          ? t('email_primary.text')
                          : `${t('email_Secondary.text')} ${emailIndex}`
                      }
                    />
                  )}
                />
              </div>
            )
          })}

          {/* Render fields after fax */}
          {fieldsAfterFax.map((field, index) => (
            <div key={index} className="form-field">
              {field.type === 'text' ||
              (field.type === 'number' && field.name !== 'phoneNumber') ? (
                <InputBox
                  titleLabel={field.titleLabel}
                  className="inputBox min-w-[220px] mb-0"
                  name={field.name}
                  type="text"
                  register={register}
                  rules={{
                    required: field.isRequired ? t(`${field.name}.error`) : false,
                    pattern: field.pattern
                  }}
                  error={errors[field.name]}
                  tooltipIcon
                  isRequired={field.isRequired}
                  clearErrors={clearErrors}
                />
              ) : field.type === 'select' ? (
                <div className="select-container">
                  <Controller
                    name={field.name}
                    control={props.control}
                    rules={
                      //(field.name === 'wht_rate' || field.name === 'taxable_basis') &&
                      field.name === 'wht_rate' &&
                      //!whtApplicable
                      whtApplicable === 'No'
                        ? { required: false }
                        : { required: t(`${field.name}.error`) }
                    }
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <div className="select-container">
                        <div className="d-flex"></div>
                        <SelectBox
                          titleLabel={field.titleLabel}
                          value={value || ''}
                          onChange={onChange}
                          options={field.options}
                          name={field.name}
                          tooltipIcon
                          tooltipMessage={t(`${field.name}.tooltip`)}
                          isRequired={field.isRequired}
                          className="custom-select-box mt-1 mb-0"
                          placeholder={field.placeholder ? field.placeholder : t('select')}
                          error={error}
                          disabled={field.disabled || isViewMode}
                        />
                      </div>
                    )}
                  />
                </div>
              ) : field.type === 'radio' ? (
                <>
                  <div className="flex items-center gap-2 mt-2 tooltip-wrapper">
                    <label>
                      {field.titleLabel}
                      <span className="required h-[18px] translate-y-[-5px]">
                        {field.isRequired && '*'}
                      </span>
                    </label>
                    {field.tooltipMessage && (
                      <div
                        className="tooltip-radio-container"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}>
                        <img src={tooltip} alt="info icon" className="ms-1" />
                        {showTooltip && (
                          <div className="tooltip-radio-text">{field.tooltipMessage}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="radio-container">
                    <div className="d-flex items-center h-[45px]">
                      {field.options.map((option, optionIndex) => (
                        <span key={optionIndex} className="radio-option d-flex me-2 whitespace-pre">
                          <input
                            type="radio"
                            name={field.name}
                            value={option.value}
                            {...register(field.name, {
                              required: t(`${field.name}.error`)
                            })}
                            onChange={(e) => {
                              // register(field.name).onChange(e)
                              setValue('wht_applicable', e.target.value)
                              clearErrors(field.name)
                            }}
                            disabled={isViewMode}
                          />
                          {` ${option.label === 'Yes' ? t('register:yes') : t('register:no')}`}
                        </span>
                      ))}
                    </div>
                    {errors[field.name] && !isViewMode && (
                      <p className={isArabic ? 'arabic-error-text' : 'error-text'}>
                        {t('wht_applicable.error')}
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </form>
    </div>
  )
}
const mapStateToProps = (state) => {
  return {
    dropdownData: state.userReg.dropdownData,
    userInfo: state.userInfo
  }
}

const mapDispatchToProps = { setDropDownData }
export default connect(mapStateToProps, mapDispatchToProps)(GeneralDetailsComp)
