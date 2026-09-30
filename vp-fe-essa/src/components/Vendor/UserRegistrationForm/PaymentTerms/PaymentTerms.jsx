import React, { useEffect, useState } from 'react'
import './PaymentTerms.scss'
import { InputBox } from '../../../Common/InputBox'
import { Controller, useWatch } from 'react-hook-form'
import { SelectBox } from '../../../Common/SelectBox'
import FileUploadInput from '../../../Common/FileUploadInput'
import { useTranslation } from 'react-i18next'
import FileIcons from '../../../Common/FileIcons'
// import { otherPaymentTermsOptions, } from 'services/helpers/constants/common'
import {
  getCreditNotePaymentTerms,
  getIncoterms,
  getOtherPaymentTerms,
  getPaymentTerms
} from 'api/UserRegister'
import { connect } from 'react-redux'
import { Validator } from 'services/validation/formValidations'
import { titleCase } from 'services/utilities'
import { ADMIN_USER_TYPE } from 'constants/userType'
import { startTransition } from 'react'

function PaymentTermsComp(props) {
  const {
    register,
    errors,
    control,
    watch,
    setValue,
    onboardVendorData,
    mode,
    setError,
    clearErrors,
    userInfo: { userType }
  } = props

  const [dropdownData, setDropDownData] = useState(null)

  const paymentFiles = useWatch({
    control,
    name: 'payment_file'
  })

  const { t, i18n } = useTranslation(['payment_terms_comp', 'toast'])

  const isViewMode = mode === 'view'
  useEffect(() => {
    fetchDropdownValues()
  }, [])

  useEffect(() => {
    const selectedPaymentTerm = watch('payment_terms')
    const selectedOtherPaymentTerm = watch('other_payment_terms')

    if (selectedPaymentTerm === 'Others') {
      setValue('final_payment_term', selectedOtherPaymentTerm)
    } else {
      setValue('final_payment_term', selectedPaymentTerm)
    }
  }, [watch('payment_terms'), watch('other_payment_terms')])

  const fetchDropdownValues = () => {
    Promise.all([
      getIncoterms(),
      getPaymentTerms(),
      getCreditNotePaymentTerms(),
      getOtherPaymentTerms()
    ])
      .then(([incoterms, paymentTerms, creditNotePaymentTerms, otherPaymentTerms]) => {
        const incotermsList = Array.isArray(incoterms.data.data) ? incoterms.data.data : []
        const paymentTermsList = Array.isArray(paymentTerms?.data?.data)
          ? paymentTerms?.data?.data
          : []
        const creditNotePaymentTermsList = Array.isArray(creditNotePaymentTerms?.data?.data)
          ? creditNotePaymentTerms?.data?.data
          : []
        const otherPaymentTermsList = Array.isArray(otherPaymentTerms?.data?.data)
          ? otherPaymentTerms?.data?.data
          : []

        const formattedData = {
          incotermsList: incotermsList.map((item) => ({
            label: item.Description_En,
            value: item.Code
          })),
          paymentTermsList: paymentTermsList.map((item) => ({
            label: item.Description_En,
            value: item.Code
          })),
          creditNotePaymentTermsList: creditNotePaymentTermsList.map((item) => ({
            label: titleCase(item.Description_En),
            value: item.Code
          })),
          otherPaymentTermsList: otherPaymentTermsList.map((item) => ({
            label: item.Description_En,
            value: item.Code
          }))
        }
        setDropDownData(formattedData)
      })
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    if (onboardVendorData) {
      const incoterms = dropdownData?.incotermsList?.find(
        (opt) => opt.value === onboardVendorData?.Incoterms
      )
      const paymentTerms = dropdownData?.paymentTermsList?.find(
        (opt) => opt.value === onboardVendorData?.Payment_Terms
      )
      const creditNotePaymentTerms = dropdownData?.creditNotePaymentTermsList?.find(
        (opt) => opt.value === onboardVendorData?.Creditnote_Payment_Terms
      )

      if (incoterms) setValue('incoterms', incoterms.value)
      if (paymentTerms) setValue('payment_terms', paymentTerms.value)
      if (creditNotePaymentTerms) setValue('creditnote_payment_terms', creditNotePaymentTerms.value)
      setValue('incoterms_location', onboardVendorData?.Incoterms_Location)
      setValue('short_payment_reason', onboardVendorData?.Short_Payment_Reason)
      if (onboardVendorData?.payment_terms_image?.length) {
        const paymentFiles = onboardVendorData.payment_terms_image.map((file) => ({
          preview: file.Upload_files,
          ...file
        }))
        setValue('payment_file', paymentFiles)
      }
    }
  }, [onboardVendorData, dropdownData])

  const incotermLocationValidator = new Validator()
    .validateNotEmptySpace()
    .validateNotOnlySymbols()
    .validateMinLength(3)
    .validateMaxLength(28)
    .build()

  const alphaNumericValidator = new Validator()
    .validateNotEmptySpace()
    .validateNotOnlySymbols()
    .validateMinLength(3)
    .validateMaxLength(255)
    .build()

  return (
    <div className={`form-container ${userType === ADMIN_USER_TYPE ? 'admin-form-container' : ''}`}>
      <div className="form-title">
        <div>{t('payment_terms')}</div>
      </div>
      <hr className="mb-5" />
      <form>
        <div className="form-fields-container">
          {/* Payment Terms SelectBox */}
          <div className="form-field">
            <Controller
              name="payment_terms"
              control={props.control}
              rules={{ required: t('invoicePaymentTerms.error') }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div className="select-container">
                  <SelectBox
                    className="custom-select-box mt-1 mb-0"
                    error={error}
                    titleLabel={t('invoicePaymentTerms.text')}
                    value={value || ''}
                    onChange={(e) =>
                      startTransition(() => {
                        onChange(e.target.value)
                      })
                    }
                    options={
                      dropdownData?.paymentTermsList?.map((item) => ({
                        label: item.label,
                        value: item.value
                      })) || []
                    }
                    name="payment_terms"
                    tooltipIcon
                    tooltipMessage={t('invoicePaymentTerms.tooltip')}
                    placeholder={t('invoicePaymentTerms.text')}
                    disabled={isViewMode}
                    isRequired={!isViewMode}
                  />
                </div>
              )}
            />
          </div>

          {/* Conditionally render "If Other Payment Terms" field */}
          {watch('payment_terms') === 'Others' && (
            <div className="form-field">
              <Controller
                name="other_payment_terms"
                control={props.control}
                rules={{ required: t('otherPaymentTerms.error') }}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container  pt-1">
                    <SelectBox
                      className="custom-select-box mt-1 mb-0"
                      titleLabel={t('otherPaymentTerms.text')}
                      value={value || ''}
                      onChange={(e) => onChange(e.target.value)}
                      options={
                        dropdownData?.otherPaymentTermsList?.map((item) => ({
                          label: item.label,
                          value: item.value
                        })) || []
                      }
                      name="other_payment_terms"
                      tooltipIcon
                      placeholder={t('otherPaymentTerms.placeHolder')}
                      error={error}
                      tooltipMessage={t('otherPaymentTerms.tooltip')}
                      disabled={isViewMode}
                      isRequired={!isViewMode}
                    />
                  </div>
                )}
              />
            </div>
          )}

          {/* Credit Note Payment Terms */}
          <div className="form-field">
            <Controller
              name="creditnote_payment_terms"
              control={props.control}
              rules={{ required: t('creditPaymentTerms.error') }}
              render={({ field: { value } }) => (
                <InputBox
                  titleLabel={t('creditPaymentTerms.text')}
                  className="inputBox mb-0"
                  name="creditnote_payment_terms"
                  type="text"
                  error={null}
                  placeholder={t('creditPaymentTerms.tooltip')}
                  tooltipIcon
                  isRequired={!isViewMode}
                  wrapperClassName={'!mb-0'}
                  value={value || 'ZU00 - Immediate Due'}
                  disabled={true}
                  tooltipMessage={t('creditPaymentTerms.tooltip')}
                  labelSize="headLabelForm"
                />
              )}
            />
          </div>

          {/* Incoterms */}
          <div className="form-field">
            <Controller
              name="incoterms"
              control={props.control}
              rules={{ required: t('incoterms.error') }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div className="select-container ">
                  <SelectBox
                    titleLabel={t('incoterms.text')}
                    value={value || ''}
                    options={
                      dropdownData?.incotermsList?.map((item) => ({
                        label: item.label,
                        value: item.value
                      })) || []
                    }
                    name="incoterms"
                    className="custom-select-box mt-1 mb-0"
                    tooltipIcon
                    tooltipMessage={t('incoterms.tooltip')}
                    placeholder={t('incoterms.tooltip')}
                    error={error}
                    onChange={onChange}
                    disabled={isViewMode}
                    isRequired={!isViewMode}
                  />
                </div>
              )}
            />
          </div>
          {/* Incoterms Location */}
          <div
            style={{ gridColumn: watch('payment_terms') === 'others' ? 'span 2' : 'span 1' }}
            className="form-field">
            <Controller
              name="incoterms_location"
              control={props.control}
              rules={{
                required: t('incotermsLocation.error'),
                validate: (value) => incotermLocationValidator(t('incotermsLocation.text'), value)
              }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <InputBox
                  titleLabel={t('incotermsLocation.text')}
                  className="inputBox mt-1 mb-0"
                  name="incoterms_location"
                  type="text"
                  register={register}
                  error={errors.incoterms_location}
                  placeholder={t('incotermsLocation.text')}
                  tooltipIcon
                  labelClass="mb-[4px]"
                  isRequired
                  wrapperClassName={'!mb-0'}
                  value={value}
                  disabled={isViewMode}
                  tooltipMessage={t('incotermsLocation.text')}
                  labelSize="headLabelForm"
                  maxLength={28}
                />
              )}
            />
          </div>
        </div>

        {/* Conditionally render additional fields based on "others" selection */}
        {watch('payment_terms') === 'Others' && (
          <>
            <div className="flex items-center mt-4 gap-4">
              <div className="w-full md:w-1/2 mt-2">
                <Controller
                  name="payment_file"
                  control={control}
                  defaultValue={undefined}
                  rules={{ required: t('uploadAttachment.error')}}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <FileUploadInput
                      className={error ? 'mt-3' : ''}
                      tooltip
                      required={true}
                      label={t('uploadAttachment.text')}
                      error={error}
                      files={value}
                      multiple={true}
                      name="payment_file"
                      onChange={(event) => {
                        //const selectedFile = event.target.files?.[0]
                        const selectedFile = Array.from(event.target.files || [])
                        if (!selectedFile) return

                        //const updatedFiles = Array.from(value || [])
                        const existingFiles = Array.from(value || [])
                        const updatedFiles = [...existingFiles, ...selectedFile]

                        if (updatedFiles.length > 2) {
                          setError('payment_file', {
                            type: 'manual',
                            message: t('toast:onlyTwoFilesAllowed')
                          })
                          return
                        }

                        //updatedFiles.push(selectedFile)
                        onChange(updatedFiles)
                        clearErrors('payment_file')
                      }}
                      tooltipMessage={t('uploadAttachment.tooltip')}
                    />
                  )}
                />
              </div>
              <div className="w-full md:w-1/2 mt-2 flex items-end gap-2">
                <FileIcons
                  files={paymentFiles}
                  className="mt-4"
                  onRemoveFile={(index) => {
                    const updatedFiles = Array.from(paymentFiles || [])
                    updatedFiles.splice(index, 1)
                    setValue('payment_file', updatedFiles)
                    clearErrors('payment_file')
                  }}
                  disabled={isViewMode}

                />
              </div>
            </div>

            <div style={{ marginTop: '25px' }}>
              <Controller
                name="short_payment_reason"
                control={control}
                rules={{
                  //required: 'Reason for shorter payment is required',
                  //validate: (value) => alphaNumericValidator(t('incotermsLocation.text'), value)
                  validate: (value) => {
                    if (!value) return true // Skip if empty
                    return alphaNumericValidator(t('reasonForShorterPayment.text'), value)
                  }
                }}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <InputBox
                    type="textarea"
                    titleLabel={t('reasonForShorterPayment.text')}
                    tooltipIcon
                    tooltipMessage={t('reasonForShorterPayment.tooltip')}
                    name="short_payment_reason"
                    className="signIn-input inputBox mb-0 "
                    error={errors.short_payment_reason}
                    placeholder={t('reasonForShorterPayment.tooltip')}
                    disabled={isViewMode}
                    isRequired={false}
                    value={value || ''}
                    labelSize="headLabelForm"
                    onChange={(e) => {
                      onChange(e.target.value)
                    }}
                    maxLength={255}
                  />
                )}
              />
            </div>
          </>
        )}
      </form>
    </div>
  )
}
const mapStateToProps = (state) => {
  return {
    userInfo: state.userInfo
  }
}

export default connect(mapStateToProps, null)(PaymentTermsComp)
