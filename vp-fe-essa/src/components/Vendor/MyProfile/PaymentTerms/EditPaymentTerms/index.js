import React, { useEffect, useState } from 'react'
import styles from './EditPaymentTerms.module.scss'
import { InputBox } from 'components/Common/InputBox'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { NormalButton } from 'components/Common/NormalButton'
import backArrow from '../../../../../assets/icons/backIconWhite.svg'
import { SelectBox } from 'components/Common/SelectBox'
import tooltipIcon from '../../../../../assets/icons/tooltip.svg'
import ToastMessage from 'components/Common/ToastMessage'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { showToast } from '../../../../../redux/actions/toastActions'
import { editProfileDetails, getIncoterms, getPaymentTerms } from 'api/MyProfile'
import { otherPaymentTermsOptions, paymentTermsOptions } from 'services/helpers/constants/common'
import { getCreditNotePaymentTerms, getOtherPaymentTerms } from 'api/UserRegister'
import FileUploadInput from 'components/Common/FileUploadInput'
import FileIcons from 'components/Common/FileIcons'
import { fileUpload } from 'api/FileUpload'
import { Validator } from 'services/validation/formValidations'
import { startTransition } from 'react'
import { titleCase } from 'services/utilities'
import { toast } from 'react-toastify'

const EditPaymentTermsComp = ({
  setShowTUButton,
  onBackClick,
  myProfile,
  setIsEditable,
  showToast,
  fetchProfileDetails,
  updateEditedData,
  handleFinalSubmit,
  editedData,
  isVendorsProfilePage
}) => {
  const {
    register,
    formState: { errors },
    control,
    setValue, clearErrors,
    handleSubmit,
    watch,
    getValues,
    trigger,
    reset
  } = useForm({
    defaultValues: {
      Incoterms: '',
      Incoterms_Location: '',
      Payment_Terms: '',
      Creditnote_Payment_Terms: 'ZU00 - Immediate Due',
      payment_file: [],
    }
  })
  const paymentFiles = useWatch({
    control,
    name: 'payment_file'
  })
  const vendorDetails = myProfile
  const { t, i18n } = useTranslation(['payment_terms_comp', 'myprofile', 'otp'])
  const [paymentTermsOptions, setPaymentTermsOptions] = useState([])
  const [incotermsOptions, setIncotermsOptions] = useState([])
  const [creditNotePaymentTermsOtpions, setCreditNotePaymentTermsOptions] = useState([])
  const [otherPaymentTermsOptions, setOtherPaymentTermsOptions] = useState([])

  useEffect(() => {
    if (Object.keys(editedData.payment || {}).length > 0) {
      reset(editedData.payment)
    }
  }, [editedData.payment])


  const fetchDropdownData = (fetchFunction, setState, labelKey, valueKey, query) => {
    fetchFunction(query)
      .then((response) => {
        const dataList = Array.isArray(response.data.data) ? response.data.data : []
        const formattedData = dataList?.map((item) => ({
          label: item[labelKey],
          value: item[valueKey]
        }))
        setState(formattedData)
      })
      .catch((err) => console.error('API Fetch Error:', err))
  }

  useEffect(() => {
    fetchDropdownData(getPaymentTerms, setPaymentTermsOptions, 'Description_En', 'Code')
    fetchDropdownData(getOtherPaymentTerms, setOtherPaymentTermsOptions, 'Description_En', 'Code')
    fetchDropdownData(getIncoterms, setIncotermsOptions, 'Description_En', 'Code')
    fetchDropdownData(getCreditNotePaymentTerms, setCreditNotePaymentTermsOptions, 'Description_En', 'Code')
  }, [])


  // useEffect(() => {
  //   if (
  //     vendorDetails && !editedData?.payment
  //   ) {
  //     const paymentTerms = paymentTermsOptions.find(
  //       (opt) => opt.value === vendorDetails?.Payment_Terms
  //     )
  //     const creditNote = creditNotePaymentTermsOtpions.find(
  //       (opt) => opt.value === vendorDetails?.Creditnote_Payment_Terms
  //     )
  //     const incoterms = incotermsOptions.find(
  //       (opt) => opt.value === vendorDetails?.Incoterms
  //     )
  //     if (paymentTerms) setValue('payment_terms', paymentTerms?.value)
  //     // if (creditNote) setValue('creditnote_payment_terms', creditNote?.value)
  //     if (incoterms) setValue('incoterms', incoterms?.value)
  //     setValue('incoterms_location', vendorDetails?.Incoterms_Location || '')
  //     setValue('short_payment_reason', vendorDetails?.Short_Payment_Reason)
  //   }
  // }, [vendorDetails, paymentTermsOptions, incotermsOptions, creditNotePaymentTermsOtpions])



  useEffect(() => {
    if (vendorDetails && !editedData?.payment) {
      const isStandardPaymentTerm = paymentTermsOptions.some(
        (opt) => opt.value === vendorDetails?.Payment_Terms
      )

      if (isStandardPaymentTerm) {
        // Standard payment term
        setValue('Payment_Terms', vendorDetails?.Payment_Terms)
      } else {
        setValue('Payment_Terms', 'Others')
        setValue('other_payment_terms', vendorDetails?.Payment_Terms)
      }

      const incoterms = incotermsOptions.find(
        (opt) => opt.value === vendorDetails?.Incoterms
      )
      if (incoterms) setValue('Incoterms', incoterms?.value)

      setValue('Incoterms_Location', vendorDetails?.Incoterms_Location || null)
      setValue('Short_Payment_Reason', vendorDetails?.Short_Payment_Reason || null)
      setValue('payment_file', vendorDetails?.payment_image || null)

      // Optional: set credit note (if needed)
      // const creditNote = creditNotePaymentTermsOtpions.find(
      //   (opt) => opt.value === vendorDetails?.Creditnote_Payment_Terms
      // )
      // if (creditNote) {
      //   setValue('creditnote_payment_terms', creditNote?.value)
      // }
    }
  }, [vendorDetails, paymentTermsOptions, incotermsOptions, creditNotePaymentTermsOtpions])


  // useEffect(() => {
  //   if (creditNotePaymentTermsOtpions?.length > 0) {
  //     let data = creditNotePaymentTermsOtpions.map(x => ({
  //       label: titleCase(x?.label || ''),
  //       value: x?.value
  //     }));
  //     setCreditNotePaymentTermsOptions(data);
  //   }
  // }, [creditNotePaymentTermsOtpions]);


  const handleBackClick = async () => {
    const currentFormValues = getValues();
    updateEditedData('payment', currentFormValues);
    onBackClick();
  };

  const onSubmit =  async(data) => {
    const actualPaymentTerm = data.Payment_Terms === 'Others'
      ? data.other_payment_terms
      : data.Payment_Terms;
    let body = {
      Incoterms: data?.Incoterms === "" ? null : data?.Incoterms,
      Incoterms_Location: data?.Incoterms_Location === "" ? null : data?.Incoterms_Location,
      Payment_Terms: actualPaymentTerm === "" ? null : actualPaymentTerm,
      Creditnote_Payment_Terms: data?.Creditnote_Payment_Terms === "" ? null : data?.Creditnote_Payment_Terms,
      Short_Payment_Reason: data?.Short_Payment_Reason === "" ? null : data?.Short_Payment_Reason,
      payment_file: []
    }
const attachmentTypeMap = {
   payment_file: "PAYMENT TERMS"
  };

const newFiles = [];
  const existingUrls = {
    payment_file: []
  };

  const files = data?.payment_file || [];

   files.forEach((file) => {
    if (file instanceof File) {
      // New file selected by user
      newFiles.push({ file, type: "payment_file" });
    } else if (typeof file === "string") {
      // Already uploaded file URL
      existingUrls.payment_file.push(file);
    }
  });

  // If vendor has existing uploaded payment image(s) (from profile)
  if (vendorDetails?.payment_image && existingUrls.payment_file.length === 0) {
    if (Array.isArray(vendorDetails.payment_image)) {
      existingUrls.payment_file = vendorDetails.payment_image;
    } else if (typeof vendorDetails.payment_image === "string") {
      existingUrls.payment_file = [vendorDetails.payment_image];
    }
  }

    // const allTypedFiles = [
    //   ...(data?.payment_file || []).map((file) => ({ file, type: 'payment_file' }))
    // ]
    const uploadPromises = newFiles.map(({ file, type }) => {
      const fd = new FormData()
      fd.append('image', file)
      fd.append("vendor_code", vendorDetails.Vendor_SAP_Code || "");
  // fd.append("module", "PROFILE UPDATE");
  fd.append("attachment_type", attachmentTypeMap[type] || "");

      return fileUpload(fd)
        .then((res) => ({
          success: true,
          type,
          url: res.data?.data?.url
        }))
        .catch((err) => ({
          success: false,
          type,
          error: err
        }))
    })

    // Promise.all(uploadPromises)
    //   .then((results) => {
    //     results.forEach(({ success, type, url }) => {
    //       if (success && url) {
    //         body.payment_file.push(url)
    //       }
    //     })
    //     updateEditedData('payment', body);
    //     handleFinalSubmit(body)
    //   }
    //   )

try {
    const results = await Promise.all(uploadPromises);

    // Merge newly uploaded URLs with existing ones
    results.forEach(({ success, type, url }) => {
      if (success && url) {
        existingUrls[type].push(url);
      }
    });

    // Final payload with all URLs
    body.payment_file = existingUrls.payment_file;

    updateEditedData("payment", body);
    handleFinalSubmit(body);
  } catch (err) {
    console.error("Payment Terms file upload failed:", err);
    toast.error(t("toast:fileUploadFailed"));
  }
  }

  const incotermLocationValidator = new Validator()
    .validateNotEmptySpace()
    .validateNotOnlySymbols()
    .validateMinLength(3)
    .validateMaxLength(28)
    .build()

  return (
    <div className={styles.ptContainer}>
      <div className='d-flex justify-content-between align-items-center'>
      <div className="my-3 fs-5">{t('payment_terms')}</div>
      <div className="mb-2">
        <NormalButton style={{ width: '110px', height: '40px' }}
          leftIconClassName={'rtl:rotate-180'}
          label={t('myprofile:back')}
          isPrimary
          customClass="back-btn"
          onClick={handleBackClick}
          leftIcon={backArrow}
        />
      </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.ptInputs}>
          <div>
            <div className={`${styles.userInputs} mb-4`}>
              <Controller
                name="Payment_Terms"
                control={control}
                rules={{
                  required: t('invoicePaymentTerms.error')
                }}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      titleLabel={t('invoicePaymentTerms.text')}
                      className="custom-select-box mt-3"
                      tooltipIcon={true}
                      tooltipMessage={t('invoicePaymentTerms.tooltip')}
                      error={error}
                      label="Payment Terms"
                      value={value || ''}
                      onChange={onChange}
                      options={paymentTermsOptions}
                      name="Payment_Terms"
                      isRequired
                      styles={{ marginTop: '4px !important' }}
                      placeholder='Payment Terms'
                    />
                  </div>
                )}
              />
            </div>


            <Controller
              className=" inputBox"
              name="Incoterms"
              control={control}
              rules={{
                required: t('incoterms.error')
              }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div className="select-container">
                  <SelectBox
                    className="custom-select-box mt-2"
                    error={error}
                    value={value}
                    onChange={onChange}
                    options={incotermsOptions}
                    name="Incoterms"
                    isRequired
                    tooltipIcon
                    titleLabel={t('incoterms.text')}
                    tooltipMessage={t('incoterms.tooltip')}
                    styles={{ marginTop: '4px !important' }}
                    placeholder='Incoterms here'
                  />
                </div>
              )}
            />
          </div>

          <div className={`${styles.userInputs} mb-4`}>
            {/* Conditionally render "If Other Payment Terms" field */}
            {watch('Payment_Terms') === 'Others' && (
              <div className="form-field mb-4">
                <Controller
                  name="other_payment_terms"
                  control={control}
                  defaultValue=""
                  rules={{ required: t('otherPaymentTerms.error') }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <div className="select-container">
                      <SelectBox
                        className="custom-select-box mt-2 mb-0"
                        titleLabel={t('otherPaymentTerms.text')}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        options={otherPaymentTermsOptions}
                        name="other_payment_terms"
                        isRequired
                        tooltipIcon
                        placeholder="Select"
                        error={error}
                        tooltipMessage={t('otherPaymentTerms.tooltip')}
                      />
                    </div>
                  )}
                />
              </div>
            )}
            <div className={`${styles.userInputs} mb-4`}>
              <InputBox
                titleLabel={t('incotermsLocation.text')}
                className="inputBox"
                name="Incoterms_Location"
                type="text"
                register={register}
                rules={{
                  required: t('incotermsLocation.error'),
                  validate: (value) => incotermLocationValidator(t('incotermsLocation.text'), value)
                }}
                error={errors.Incoterms_Location}
                isRequired
                tooltipIcon
                tooltipMessage={t('incotermsLocation.tooltip')}
                maxLength={28}
              />
            </div>
          </div>

          <div className={`${styles.userInputs} mb-4`}>
            <Controller
              name="Creditnote_Payment_Terms"
              control={control}
              rules={{
                required: t('creditPaymentTerms.error')
              }}
              render={({ field: { onChange, value }, fieldState: { error } }) => {
                const formattedOptions = creditNotePaymentTermsOtpions.map(option => ({
                  ...option,
                  label: option.label.charAt(0).toUpperCase() + option.label.slice(1)
                }));
                return (
                  <div className="select-container">
                    <InputBox
                      titleLabel={t('creditPaymentTerms.text')}
                      className="inputBox mb-0"
                      name="Creditnote_Payment_Terms"
                      type="text"
                      error={null}
                      placeholder={t('creditPaymentTerms.tooltip')}
                      tooltipIcon
                      // isRequired={!isViewMode}
                      wrapperClassName={'!mb-0'}
                      value={value || 'ZU00 - Immediate Due'}
                      disabled={true}
                      tooltipMessage={t('creditPaymentTerms.tooltip')}
                    />
                  </div>
                )
              }
              }
            />
          </div>
        </div>
        {/* Conditionally render additional fields based on "others" selection */}
        {watch('Payment_Terms') === 'Others' && (
          <>
            <div className="row">
              <div className="col-6 mt-2">
                <Controller
                  name="payment_file"
                  control={control}
                  defaultValue={undefined}
                  rules={{ required: 'Payment files are required' }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <FileUploadInput
                      tooltip
                      required={true}
                      label={'Upload Attachment'}
                      error={error}
                      files={value}
                      multiple={true}
                      name="payment_file"
                      onChange={(event) => {
                        const selectedFiles = Array.from(event.target.files || [])
                        onChange(selectedFiles) // Store File objects
                      }}
                      tooltipMessage={t('uploadAttachment.tooltip')}
                    />
                  )}
                />
              </div>
              <div className="col-6 d-flex gap-1 items-center pt-[8px] mt-4">
                <FileIcons
                  files={paymentFiles}
                  onRemoveFile={(index) => {
                    const updatedFiles = Array.from(paymentFiles || [])
                    updatedFiles.splice(index, 1)
                    setValue('payment_file', updatedFiles)
                    clearErrors('payment_file')
                  }}
                />
              </div>
            </div>

            <div className="mt-5 mb-3">
              <InputBox
                type="textarea"
                titleLabel={t('reasonForShorterPayment.text')}
                tooltipIcon
                register={register}
                name="Short_Payment_Reason"
                className="signIn-input inputBox mb-4 "
                error={errors.Short_Payment_Reason}
                placeholder="Reason for the shorter payments."
                maxLength={250}
              />
            </div>
          </>
        )}
        <div className={'d-flex justify-content-end'}>
          <NormalButton
            label={t('otp:cancel')}
            outlineBtn
            customClass={`${styles.submitBtn} me-3`}
            type="button"
            onClick={() => setIsEditable(false)}
          />
          <NormalButton
            label={isVendorsProfilePage ? 'Update' : t('myprofile:submitForReview')}
            isPrimary
            customClass={styles.submitBtn}
            type="submit"
          />
        </div>
      </form>
    </div>
  )
}

const mapStateToProps = (state) => ({
  myProfile: state.myProfile.profileData
})

const mapDispatchToProps = { showToast }

export default connect(mapStateToProps, mapDispatchToProps)(EditPaymentTermsComp)

