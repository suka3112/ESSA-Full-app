import React, { useEffect, useState } from 'react'
import './BankDetails.scss'
import { InputBox } from '../../../Common/InputBox'
import { Controller, useWatch } from 'react-hook-form'
import { SelectBox } from 'components/Common/SelectBox'
import tooltip from '../../../../assets/icons/tooltip.svg'
import { useTranslation } from 'react-i18next'
import { connect, useDispatch } from 'react-redux'
import { fetchCities, fetchCountries, fetchCurrencies } from '../../../../api/UserRegister'
import { setDropDownData } from '../../../../redux/actions/userRegisterActions'
import { Validator } from '../../../../services/validation/formValidations'
import { ADMIN_USER_TYPE } from 'constants/userType'
import FileUploadInput from 'components/Common/FileUploadInput'
import { toast } from 'react-toastify'
import FileIcons from 'components/Common/FileIcons'
import { max } from 'moment'

function BankDetailsComp(props) {
  const {
    register,
    errors,
    dropdownData,
    control,
    watch,
    setValue,
    clearErrors,
    onboardVendorData,
    mode,
    //bankFiles,
    userInfo: { userType }
  } = props

  const dispatch = useDispatch()

  const { t } = useTranslation('banking_details_comp')

  const selectedCountry = useWatch({ control, name: 'bank_country' })
  const nationalFiles = watch('nda_file')
  const bankFiles = watch('bank_file')


  useEffect(() => {
    const data = dropdownData?.bank_countries?.find((x) => x.isoCode === selectedCountry)
    if (data?.isoCode) {
      fetchLocationDataByCountry(data.isoCode)
    }
  }, [selectedCountry])

  useEffect(() => {
    if (
      onboardVendorData?.bankDetails &&
      dropdownData?.bank_countries?.length &&
      dropdownData?.bank_currencies?.length &&
      dropdownData?.currencies?.length
    ) {
      const data = onboardVendorData.bankDetails

      setValue('payment_by', data.Payment_By || '')
      setValue('bank_charge_indicator', data.Bank_Charge_Indicator || '')
      setValue('bank_name', data.Bank_Name || '')
      setValue('bank_account_number', data.Bank_Account_Number || '')
      setValue('bank_postal', data.Bank_Postal || '')
      setValue('swift_code', data.Swift_Code || '')
      setValue('street_and_building_number', data.Street_Building_Number || '')
      setValue('iban_number', data.IBAN_Number || '')
    }
  }, [onboardVendorData, dropdownData, setValue])

  useEffect(() => {
    if (onboardVendorData?.bank_image?.length) {
      const bankFiles = onboardVendorData.bank_image.map((file) => ({
        preview: file.Upload_files,
        ...file
      }))
      setValue('bank_file', bankFiles)
    }
  }, [onboardVendorData])

  useEffect(() => {
    const data = onboardVendorData?.bankDetails
    const bankAccountCurrency = dropdownData?.bank_currencies?.find(
      (opt) => opt.code === data?.Bank_Account_Currency
    )
    const invoiceCurrency = dropdownData?.bank_currencies?.find(
      (opt) => opt.code === data?.Invoice_Currency
    )

    const country = dropdownData?.bank_countries?.find((opt) => opt.name === data?.Bank_Country)

    if (bankAccountCurrency) setValue('bank_account_currency', bankAccountCurrency.code)
    if (invoiceCurrency) setValue('invoice_currency', invoiceCurrency.code)

    if (country) {
      setValue('bank_country', country.isoCode)
    }
  }, [onboardVendorData, dropdownData])

  useEffect(() => {
    const city = dropdownData?.cities?.find(
      (opt) => opt.name === onboardVendorData?.bankDetails?.Bank_City
    )

    if (city) setValue('bank_city', city.name)
  }, [dropdownData])

  useEffect(() => {
    fetchDropdownValues()
  }, [])

  const fetchDropdownValues = () => {
    Promise.all([fetchCountries(), fetchCurrencies()])
      .then(([countriesRes, currenciesRes]) => {
        const countryList = Array.isArray(countriesRes.data.data) ? countriesRes.data.data : []
        const currencyList = Array.isArray(currenciesRes.data.data) ? currenciesRes.data.data : []

        const formattedData = {
          bank_countries: countryList.map((item) => ({
            name: item.name,
            isoCode: item.isoCode
          })),
          bank_currencies: currencyList.map((item) => ({
            name: item.name,
            code: item.code
          }))
        }

        dispatch(setDropDownData({ ...dropdownData, ...formattedData }))
      })
      .catch((err) => console.error(err))
  }

  const fetchLocationDataByCountry = (selectedCountry) => {
    let query = { id: selectedCountry }

    Promise.all([fetchCities(query)])
      .then(([citiesRes]) => {
        const citiesList = Array.isArray(citiesRes.data.data) ? citiesRes.data.data : []
        const formattedData = {
          bank_cities: citiesList.map((item) => ({
            name: item.name,
            countryCode: item.countryCode
          }))
        }

        dispatch(setDropDownData({ ...dropdownData, ...formattedData }))
      })
      .catch((err) => console.error(err))
  }

  const showIban = () => {
    const countries = [
      { country: 'United Arab Emirates', isoCode: 'AE' },
      { country: 'Saudi Arabia', isoCode: 'SA' },
      { country: 'Bahrain', isoCode: 'BH' },
      { country: 'Kuwait', isoCode: 'KW' },
      { country: 'Oman', isoCode: 'OM' },
      { country: 'Qatar', isoCode: 'QA' }
    ]

    return countries.find((x) => x.isoCode.toLowerCase() === watch('bank_country')?.toLowerCase())
  }

  const bankNameValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoSymbols()
    .validateOnlyText()
    .validateMinLength(3)
    .validateMaxLength(60)
    .build()

  const postalCodeValidator = new Validator()
    .validateNotEmptySpace()
    .validateNotOnlySymbols()
    .validatePostalCode()
    .validateMinLength(2)
    .validateMaxLength(50)
    .build()

  const bankAccNumValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoSymbols()
    .validateOnlyNumbers()
    .validateMinLength(3)
    .validateMaxLength(18)
    .build()

  const alphaNumericValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoSymbols()
    .validateMinLength(3)
    .validateMaxLength(15)
    .build()

  const streetHouseNumValidator = new Validator()
    .validateNotEmptySpace()
    .validateMinLength(3)
    .validateMaxLength(70)
    .build()

  const ibanNoValidator = new Validator()
    .validateNotEmptySpace()
    // .validateMinLength(3)
    .validateMaxLength(34)
    .build()

  const isViewMode = mode === 'view'

  const fields = [
    {
      titleLabel: t('paymentBy.text'),
      name: 'payment_by',
      isRequired: false,
      type: 'text',
      disabled: true,
      placeholder: t('normalBankTransfer')
    },
    {
      titleLabel: t('bankChargeIndicator.text'),
      name: 'bank_charge_indicator',
      isRequired: false,
      type: 'text',
      disabled: true,
      placeholder: 'A'
    },
    {
      titleLabel: t('bankName.text'),
      name: 'bank_name',
      placeholder: t('bankName.tooltip'),
      isRequired: true,
      type: 'text',
      tooltip: t('bankName.tooltip'),
      errorName: t('bankName.error'),
      rules: {
        validate: (value) => bankNameValidator(t('bankName.text'), value)
      },
      maxLength: 60,
    },
    {
      titleLabel: t('bankAccount.text'),
      name: 'bank_account_number',
      placeholder: t('bankAccount.tooltip'),
      isRequired: true,
      type: 'text',
      tooltip: t('bankAccount.tooltip'),
      errorName: t('bankAccount.error'),
      rules: {
        validate: (value) => bankAccNumValidator(t('bankAccount.text'), value)
      },
      maxLength: 18,
    },
    {
      titleLabel: t('bankAccountCurrency.text'),
      errorName: t('bankAccountCurrency.error'),
      name: 'bank_account_currency',
      isRequired: true,
      type: 'select',
      options:
        dropdownData?.bank_currencies
          ?.map((item) => ({
            label: `${item.name} (${item.code})`,
            value: item.code
          }))
          ?.sort((a, b) => a.label.localeCompare(b.label)) || [],
      placeholder: t('bankAccountCurrency.placeholder'),
      tooltip: t('bankAccountCurrency.tooltip')
    },
    {
      titleLabel: t('bankCountry.text'),
      errorName: t('bankCountry.error'),
      name: 'bank_country',
      isRequired: true,
      type: 'select',
      options:
        dropdownData?.bank_countries?.map((item) => ({
          label: item.name,
          value: item.isoCode
        })) || [],
      tooltip: t('bankCountry.tooltip'),
      placeholder: t('bankCountry.tooltip')
      // tooltip:t('bankCountry.tooltip'),
      // placeholder: 'Select',
    },
    {
      titleLabel: t('bankCity.text'),
      errorName: t('bankCity.error'),
      name: 'bank_city',
      isRequired: true,
      type: 'select',
      tooltip: t('bankCity.tooltip'),
      placeholder: t('bankCity.placeholder'),
      options:
        dropdownData?.bank_cities?.map((item) => ({
          label: item.name,
          value: item.name
        })) || []
    },
    {
      titleLabel: t('bankPostalCode.text'),
      name: 'bank_postal',
      isRequired: true,
      tooltip: t('bankPostalCode.tooltip'),
      errorName: t('bankPostalCode.error'),
      placeholder: t('bankPostalCode.placeholder'),
      type: 'text',
      rules: {
        validate: (value) => postalCodeValidator(t('bankPostalCode.text'), value)
      },
      maxLength: 50,
    },
    {
      titleLabel: t('swiftCode.text'),
      name: 'swift_code',
      isRequired: true,
      tooltip: t('swiftCode.tooltip'),
      placeholder: t('swiftCode.tooltip'),
      errorName: t('swiftCode.error'),
      type: 'text',
      rules: {
        validate: (value) => alphaNumericValidator(t('swiftCode.text'), value)
      },
      maxLength: 15,
    },
    {
      titleLabel: t('invoiceCurrency.text'),
      errorName: t('invoiceCurrency.error'),
      name: 'invoice_currency',
      isRequired: true,
      type: 'select',
      placeholder: t('invoiceCurrency.tooltip'),
      tooltip: t('invoiceCurrency.tooltip'),
      options:
        dropdownData?.bank_currencies
          ?.map((item) => ({
            label: `${item.name} (${item.code})`,
            value: item.code
          }))
          ?.sort((a, b) => a.label.localeCompare(b.label)) || []
    },
    {
      titleLabel: t('bankStreet.text'),
      name: 'street_and_building_number',
      isRequired: true,
      type: 'text',
      placeholder: t('bankStreet.placeholder'),
      tooltip: t('bankStreet.tooltip'),
      errorName: t('bankStreet.error'),
      rules: {
        validate: (value) => streetHouseNumValidator(t('bankStreet.text'), value)
      },
      maxLength: 70,
    },
    // ...(showIban()
    //   ? [
    {
      titleLabel: t('ibanNumber.text'),
      name: 'iban_number',
      isRequired: showIban(),
      type: 'text',
      placeholder: t('ibanNumber.tooltip'),
      tooltip: t('ibanNumber.tooltip'),
      errorName: t('ibanNumber.error'),
      rules: {
        validate: (value) => {
          if (!showIban() && !value) {
            return true
          }
          if (showIban()) {
            return ibanNoValidator(t('ibanNumber.text'), value)
          }
          return true
        }
      },
      maxLength: 50,
    }
    //   ]
    // : [])
  ]

  return (
    <div className={`form-container ${userType === ADMIN_USER_TYPE ? 'admin-form-container' : ''}`}>
      <div className="form-title">
        <div>{t('bank_details')}</div>
      </div>
      <hr className="mb-5" />
      <form>
        <div className="form-fields-container">
          {/* Render fields before fax */}
          {fields.map((field, index) => (
            <div key={index} className="form-field">
              {field.type === 'text' ? (
                <Controller
                  name={field.name}
                  control={props.control}
                  rules={{
                    required: field.isRequired ? field.errorName : false,
                    ...field.rules
                    // pattern: field.pattern
                  }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <InputBox
                      labelSize="headLabelForm"
                      titleLabel={field.titleLabel}
                      className="inputBox mb-0"
                      name={field.name}
                      type="text"
                      register={register}
                      error={errors[field.name]}
                      placeholder={field?.placeholder}
                      tooltipIcon={
                        ['payment_by', 'bank_charge_indicator'].includes(field.name) ? false : true
                      }
                      isRequired={field.isRequired}
                      wrapperClassName={'!mb-0'}
                      value={value}
                      disabled={
                        isViewMode || ['payment_by', 'bank_charge_indicator'].includes(field.name)
                      }
                      tooltipMessage={field.tooltip ? field.tooltip : ''}
                      maxLength={field.maxLength}
                    />
                  )}
                />
              ) : field.type === 'select' ? (
                <div className="select-container">
                  <Controller
                    name={field.name}
                    control={props.control}
                    rules={{ required: field.errorName }}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <div className="select-container">
                        <SelectBox
                          value={value || ''}
                          onChange={onChange}
                          options={field.options}
                          name={field.name}
                          isRequired={field.isRequired}
                          className="custom-select-box mt-1 mb-0"
                          placeholder={field.placeholder ? field.placeholder : 'Select'}
                          error={error}
                          titleLabel={field.titleLabel}
                          required
                          tooltipIcon
                          tooltipMessage={field.tooltip ? field.tooltip : ''}
                          disabled={isViewMode}
                        />
                      </div>
                    )}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Bank File Upload Section */}
        <div className="rowContainer mt-4 d-flex gap-3">
          <div className="col-md-6 color-#333333 font-size-1.125rem">
            <Controller
              name="bank_file"
              control={control}
              defaultValue={undefined}
              rules={{ required: t('uploadBankFile.error') }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <FileUploadInput
                  className={error ? 'mt-3' : ''}
                  tooltip
                  required={true}
                  label={t('uploadBankFile.text')}
                  error={error}
                  files={value}
                  multiple={true}
                  name="bank_file"
                  onChange={(event) => {
                    const selectedFile = Array.from(event.target.files || [])
                    if (!selectedFile) return

                    const existingFiles = Array.from(value || [])
                    const updatedFiles = [...existingFiles, ...selectedFile]
                    if (updatedFiles.length > 2) {
                      toast.error('Only 2 files are allowed')
                      event.target.value = null;
                      return
                    }

                    onChange(updatedFiles)
                    clearErrors('bank_file')
                    event.target.value = null;
                  }}
                  tooltipMessage={t('uploadBankFile.tooltip')}
                  disabled={isViewMode}
                />
              )}
            />
          </div>
          <div className="d-flex align-items-center col-md-6">
            <FileIcons
              files={bankFiles || []}
              className="mt-4"
              onRemoveFile={(index) => {
                const updatedFiles = Array.from(bankFiles || [])
                updatedFiles.splice(index, 1)
                setValue('bank_file', updatedFiles)
                clearErrors('bank_file')
              }}
              disabled={isViewMode}
            />
          </div>
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

export default connect(mapStateToProps)(BankDetailsComp)
