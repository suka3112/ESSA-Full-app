import React, { useCallback, useEffect, useState } from 'react'
import styles from './AddEditAdvancePayment.module.scss'
import "assets/scss/createInvoice.scss"
import { NormalButton } from 'components/Common/NormalButton'
import { InputBox } from 'components/Common/InputBox'
import { Controller, useForm } from 'react-hook-form'
import { SelectBox } from 'components/Common/SelectBox'
import nextIcon from '../../../../assets/icons/nextIconWhite.svg'
import saveIcon from '../../../../assets/icons/saveIconWhite.svg'
import FileUploadInput from 'components/Common/FileUploadInput'
import { InvoicePreviewAdvancePayment } from '../InvoicePreview'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import SuccessPopup from 'components/Common/SuccessPopup'
import { useTranslation } from 'react-i18next'
import {
  createAdvancePayment,
  getAdvancePaymentById,
  editAdvancePayment
} from '../../../../api/AdvancePayment'
import { ADVANCE_PAYMENT, FAQS } from 'constants/url'
import { fetchCurrencies, fetchVendorNameOrCode } from 'api/UserRegister'
import { getCRPersons } from 'api/MyProfile'
import { getPODropdown } from 'api/PurchaseOrder'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import AppTooltip from 'components/Common/AppTooltip'
import { getEntityId, getVendorId } from 'services/utilities'
import MultiSelectDropdown from 'components/Common/SelectBox/MultiSelectDropdown'
import { deleteFiles, fileUpload } from 'api/FileUpload'
import { deleteIcon, uploadAddIcon } from 'constants/imageConstants'
import { showToast } from 'redux/actions/toastActions'
import { connect, useSelector } from 'react-redux'
import CustomModal from 'components/Common/Modal'
import { ADMIN_USER_TYPE, VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { Validator } from 'services/validation/formValidations'
import { PageLoader } from 'components/Common/PageLoader'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import { setDashboardData } from 'redux/actions/dashboardAction'
import SVGIcon from 'components/Common/SVGIcon';
const AddEditAdvancePaymentcomp = ({ setDashboardData, userInfo: { userType }, showToast }) => {
  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    setError,
    clearErrors
  } = useForm()

  const navigate = useNavigate()
  const { t, i18n } = useTranslation([
    'advance_payment',
    'dashboard',
    'credit_notes',
    'banking_details_comp',
    'logistics_invoice',
    'sidebar',
    'popup',
    'non_po_based_invoices',
    'po_based_invoices',
    'toast',
    'soa',
    'purchase_order'
  ])
  const location = useLocation()
  const isArabic = i18n.language === "ar";
  const isBack = location?.state?.isBack
  const { editMode } = useParams()
  const [nextClick, setNextClick] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [currentAttachment, setCurrentAttachment] = useState({ type: '', file: null })
  const [crPersonsOptions, setCrPersonsOptions] = useState([])
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [poDropdownOptions, setPoDropdownOptions] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)
  const selectedInvoiceType = watch('type_of_invoice')
  const [vendorCodeOptions, setVendorCodeOptions] = useState([])
  const [submissionDdate, setSubmissionDate] = useState(dayjs().format('DD/MM/YYYY'))
const uploadVendorCode = useSelector((state) => state?.dashboard?.dashboardData?.profile?.Vendor_SAP_Code)

  useEffect(() => {
    const formattedDate = dayjs().format('YYYY-MM-DD')
    setValue('submission_date', formattedDate)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchDropdownData()])

      if (isEdit) {
        await fetchAdvancePaymentDetails(editMode)
      }
    }

    fetchData()
  }, [editMode, isEdit])

  useEffect(() => {
    if (userType !== VENDOR_USER_TYPE) {
      fetchVendorCodeData()
    }
  }, [userType])

  useEffect(() => {
    if (selectedInvoiceType == 1) {
      if (userType !== VENDOR_USER_TYPE && watch('vendor_code')) {
        fetchPODropdownData(watch('vendor_code'))
      } else if (userType === VENDOR_USER_TYPE) {
        fetchPODropdownData()
      }
    }
  }, [selectedInvoiceType, userType, watch('vendor_code')])

  // Determine if we're in edit mode
  useEffect(() => {
    const isEditMode = editMode && editMode !== 'new'
    setIsEdit(isEditMode)
    if (isEditMode) {
      fetchAdvancePaymentDetails(editMode)
    } else {
      reset({
        type_of_invoice: '',
        value_of_advance_payment: '',
        currency: '',
        attachmentType: '',
        submission_date: dayjs().format('YYYY-MM-DD'),
        cost_responsible: ''
      })
    }
  }, [editMode, reset])

  //Vendor code dropdown API
  const fetchVendorCodeData = () => {
    let query = {
      entity_id: getEntityId()
    }
    Promise.all([fetchVendorNameOrCode({ entity_id: getEntityId() })])
      .then(([vendorCodeRes]) => {
        const vendorCodeOptions = vendorCodeRes?.data?.data?.map((item) => ({
          label: item?.Vendor_SAP_Code,
          value: item?.ID,
          vendorName: item?.Vendor_Name_EN
        }))
        setVendorCodeOptions(vendorCodeOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }

  const fetchAdvancePaymentDetails = async (id) => {
    setLoading(true)
    try {
      const res = await getAdvancePaymentById(id)
      const data = res.data?.data?.payments

      // Map the API response to your form field names
      reset({
        type_of_invoice: data.Type_of_invoice,
        value_of_advance_payment: data.Value,
        currency: data.Currency,
        submission_date:
          data?.submission_date && dayjs(data.submission_date).isValid()
            ? dayjs(data.submission_date).format('YYYY-MM-DD')
            : dayjs().format('YYYY-MM-DD'),
        cost_responsible: data?.Cost_responsible,
        po_based_No: data?.advance_po_mappings?.map((item) => item.PO_Header_Id) || [],
        Performa_Invoice_Number: data.Performa_Invoice_Number,
        vendor_code: data?.vendorInfo?.ID || '',
        vendor_name: data?.vendorInfo?.Vendor_Name_EN || ''
      })

      // Set the date for the date picker
      setSelectedDate(dayjs(data.submission_date))

      // uploaded files from API response
      if (data.upload_files && data?.upload_files.length > 0) {
        const formattedFiles = data?.upload_files.map((file) => ({
          id: file?.ID, // preserve backend file ID
          attachment_type: file?.Attachment_type,
          document_name: (file?.File_name && file?.File_name?.trim())
            ? file.File_name
            : file?.Upload_files?.split('/').pop(),
          file_url: file?.Upload_files,
          file_type: file?.Attachment_type,
          existing: true
        }))
        setUploadedFiles(formattedFiles)
      }
    } catch (error) {
      console.error('Error fetching advance payment details:', error)
      toast.error(t('advance_payment:failedToLoadPaymentDetails'))
    } finally {
      setLoading(false)
    }
  }

  // Fetch dropdown data for CR Persons
  const fetchDropdownData = useCallback(() => {
    let query = {
      entity_id: getEntityId()
    }
    Promise.all([getCRPersons(query), fetchCurrencies()])
      .then(([crPersonsRes, currenciesRes]) => {
        const crPersonsOptions = crPersonsRes?.data?.data?.map((person) => ({
          label: person.Name,
          value: person.Employee_Id,
          ID: person.ID
        }))

        const currencyList = Array.isArray(currenciesRes.data.data) ? currenciesRes.data.data : []
        const formattedCurrencies = [
          ...currencyList
            .map((item) => ({
              label: `${item?.name} (${item?.code})`,
              value: item.code
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        ]

        setCrPersonsOptions(crPersonsOptions)
        setCurrencyOptions(formattedCurrencies)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }, [])

  // Fetch PO dropdown data
  const fetchPODropdownData = useCallback(async (vendorId = null) => {
    try {
      const query = {
        vendor_id: vendorId || getVendorId(),
        entity_id:getEntityId()
      }
      const [poDropdownRes] = await Promise.all([getPODropdown(query)])
      const poDropdownOptions = poDropdownRes?.data?.data?.map((person) => ({
        label: person.PONo,
        value: person.PONo
      }))
      setPoDropdownOptions(poDropdownOptions)
    } catch (err) {
      console.error('Error fetching dropdown data:', err)
    }
  }, [])

  const handleSave = async (data, status = 'Draft') => {
    try {
      const isUpdate = editMode && editMode !== 'new'
      const query = { entity_id: getEntityId() }
      const selectedCRPerson = crPersonsOptions.find(
        (person) => person.value === data.cost_responsible
      )
      const notificationId = selectedCRPerson?.ID
      // Common invoice mapping
      const invoices = (data.po_based_No || []).map((po) => ({
        header_id: 12,
        inv_number: po
      }))

      const filesToSend = (isUpdate
        ? uploadedFiles.filter((f) => !f.existing) // on edit, only send newly added files
        : uploadedFiles)
      const uploadFilesFormatted = filesToSend.map(({ file_url, attachment_type, document_name }) => ({
        upload_files: file_url,
        attachment_type: attachment_type,
        originalName: document_name
      }))

      // Construct request body
      const body = {
        ...(isUpdate && { ID: editMode }),
        type_of_invoice: data.type_of_invoice,
        value: isUpdate ? data.value_of_advance_payment : data.value_of_advance_payment, // consistent for both
        Performa_Invoice_Number: data.Performa_Invoice_Number,
        currency: data.currency,
        submission_date: data.submission_date,
        cost_responsible: data.cost_responsible,
        invoices,
        upload_files: uploadFilesFormatted,
        Advance_Payment_Status: status === 'Draft' ? 7 : 1,
        notification_id: notificationId,
        ...(userType === ADMIN_USER_TYPE && { Vendor_id: data?.vendor_code }),
        ...(userType === ADMIN_USER_TYPE && { vendor_name: data?.vendor_name })
      }

      // API call: Update or Create
      const res = isUpdate
        ? await editAdvancePayment(body, editMode, query)
        : await createAdvancePayment(query, body)

      if (status === 'Submitted') {
        showToast(t('toast:successTitle'), t('advance_payment:advancePaymentSubmittedSuccessfully'), 'success')
        navigate(`/${userType}${ADVANCE_PAYMENT}`)
      } else {
        setShowSuccessPopup(true)
        if (!isUpdate) {
          const newInvoiceId = res?.data?.data?.ID
          navigate(`/${userType}/advance-payment/edit/${newInvoiceId}`)
        }
      }
    } catch (error) {
      console.error('Error in advance payment:', error)
      const errorMessage =
        error?.response?.data?.data?.message ||
        error?.response?.data?.message ||
        error?.message ||
        `Failed to ${status === 'Draft' ? 'save' : 'submit'} advance payment`
      //toast.error(`Failed to ${status === 'Draft' ? 'save' : 'submit'} advance payment`)
      toast.error(errorMessage)
    }
  }


  const translatedOptions  = [
    { label: t('advance_payment:proforma_invoice'), value: 'Proforma Invoice' },
    { label: t('non_po_based_invoices:delivery_note'), value: 'delivery note' },
    { label: t('non_po_based_invoices:shipping_documents'), value: 'shipping documents' },
    { label: t('non_po_based_invoices:others'), value: 'others' }
  ]
  const handleRemoveFile = async () => {
    try {
      if (fileToDelete?.id && typeof fileToDelete.id === 'number') {
        await deleteFiles({
            id: fileToDelete.id,
            url: fileToDelete.file_url,
          });
      }
      const updated = uploadedFiles.filter((file) => file.id !== fileToDelete?.id)
      setUploadedFiles(updated)
      setFileToDelete(null)
      setIsModalOpen(false)
      showToast(t('toast:successTitle'), t('toast:fileDeleted'), 'success')
    } catch (error) {
      toast.error(t('toast:fileDeleteFailed'))
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    const { file, type } = currentAttachment

    if (!file || !type) {
      toast.error(t('toast:attachTypeAndFileRequired'))
      return
    }

    const filesArray = Array.isArray(file) ? file : [file]
    let typeCount = uploadedFiles.filter((f) => f.attachment_type === type).length

    setUploadLoading(true)
    for (let i = 0; i < filesArray.length; i++) {
      if (typeCount >= 2) {
        toast.error(t('toast:onlyTwoFilesPerType', { type }))
        break
      }

       const vendorCode = uploadVendorCode 
       const selectedVendorId = getValues('vendor_code') 
    const selectedVendor = vendorCodeOptions.find(
      (v) => v.value === selectedVendorId
    )
    const adminVendorCode = selectedVendor?.label || ''

  const vendorCodeUpload =
    userType === VENDOR_USER_TYPE
      ? vendorCode
      : adminVendorCode
    const module = 'ADVANCE PAYMENT'  // static value
    const attachmentType = type         

      const fd = new FormData()
      fd.append('image', filesArray[i])
      fd.append('vendor_code', vendorCodeUpload)
      fd.append('module', module)
      fd.append('attachment_type', attachmentType)

      try {
        const res = await fileUpload(fd)
        const url = res.data?.data?.url

        const newEntry = {
          id: uploadedFiles.length + 1 + i,
          attachment_type: type,
          document_name: filesArray[i].name,
          file_url: url,
          file_type: filesArray[i].type,
          existing: false
        }

        setUploadedFiles((prev) => [...prev, newEntry])
        typeCount++
      } catch (err) {
        console.error(err)
        toast.error(t('advance_payment:failedToUploadFile'))
      }
    }

    setUploadLoading(false)
    setValue('attachments', '')
    setValue('attachment_type', '')
    setCurrentAttachment({ type: '', file: null })
    clearErrors('attachments')
  }

  const handleNext = () => {
    handleSubmit((data) => {
      setNextClick(true)
    })()
  }

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false)
    setSaved(true)
    setNextClick(true)
    //navigate('/vendor/advance-payment')
  }

  const NoSpecialCharValidator = new Validator()
    //.validateAlphanumericNoSymbols()
    .validateNotEmptySpace()
    // .validateNoSymbols()
    .validateMinLength(3)
    .validateMaxLength(16)
    .build()
  return (
    <>
      {loading ? (
        <div className="no-data-container-view">
          <PageLoader />
        </div>
      ) : (
        <>
          <div className="p-6 min-h-screen">
            <div className={styles.poContainer}>
              <div className={styles.homeText}>
                {`${t('sidebar:home')} / ${t('sidebar:advancePayment')} / ${isEdit ? t('myprofile:edit') : t('createAdvancePayment')
                  }`}
              </div>
              <div className={styles.subHeader}>
                <div>
                  <SVGIcon size={25} className='cursor-pointer' name="backArrow" onClick={() => { isBack ? navigate(-1) : navigate(`/${userType}/advance-payment`) }} />
                  <h5>
                    {isEdit ? t('editAdvancePayment') : t('dashboard:requestAdvancePayment')}
                  </h5>
                  {isEdit && saved && (
                    <div className={`px-2 ${styles.savedPill}`}>{t('purchase_order:saved')}</div>
                  )}
                </div>
                <div>
                  {/* {!isEdit ? ( */}
                  <>
                    <NormalButton
                      label={t('next')}
                      isPrimary
                      type={'button'}
                      customClass="px-3"
                      rightIcon={nextIcon}
                      onClick={handleNext}
                      disabled={loading}
                    />
                    {!saved && (
                      <NormalButton
                        label={t('save')}
                        isPrimary
                        customClass="px-3"
                        rightIcon={saveIcon}
                        onClick={handleSubmit((data) => handleSave(data, 'Draft'))}
                        disabled={loading}
                        type="button"
                      />
                    )}
                  </>

                  <div className={styles.faqIconContainer}>
                    <TooltipWrapper tooltipMessage={t('soa:help')}>
                      <SVGIcon size={25} className='cursor-pointer' name="help" onClick={() => navigate(`/${userType}${FAQS}?id=5`)} />
                    </TooltipWrapper>
                  </div>

                </div>
              </div>
            </div>

            <form
              onSubmit={
                isEdit
                  ? handleSubmit(handleSave)
                  : handleSubmit((data) => handleSave(data, 'Draft'))
              }>
              <div className={styles.userInputContainer}>
                <div
                  style={{ borderInlineEnd: "1px solid #929398" }}
                  className="col-6"
                >
                  {userType !== VENDOR_USER_TYPE && (
                    <>
                      <div className='formGroup'>
                        <div className='labelWidth'>
                          <label>
                            {t('vendorCode')}
                            <span className="required">*</span>
                            <AppTooltip
                              message={t('po_based_invoices:POInvoiceVendorCode.tooltip')}
                            />
                          </label>
                        </div>

                        <div style={{ paddingRight: "20px" }}>
                          <Controller
                            name="vendor_code"
                            control={control}
                            rules={{ required: t('po_based_invoices:POInvoiceVendorCode.error') }}
                            defaultValue=""
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <SelectBox
                                className={`formInput custom-select-box mb-0`}
                                error={error}
                                value={value}
                                onChange={(e) => {
                                  onChange(e.target.value)
                                  if (userType !== VENDOR_USER_TYPE) {
                                    fetchPODropdownData(e.target.value)
                                  }

                                  const selectedVendor = vendorCodeOptions.find(
                                    (v) => v.value == e.target.value
                                  )
                                  if (selectedVendor) {
                                    setValue('vendor_name', selectedVendor.vendorName || '')
                                  } else {
                                    setValue('vendor_name', '')
                                  }
                                }}
                                options={vendorCodeOptions}
                                placeholder={t('po_based_invoices:POInvoiceVendorCode.tooltip')}
                                height="30px"
                              />
                            )}
                          />
                        </div>
                      </div>
                      <div className='formGroup'>
                        <div className='labelWidth'>
                          <label>
                            {t('vendorName')}
                            <span className="required">*</span>
                            <AppTooltip
                              message={t('po_based_invoices:POInvoiceVendorName.tooltip')}
                            />
                          </label>
                        </div>
                        <label style={{ width: isArabic ? "250px" : "270px" }}>
                          <p style={{paddingRight: isArabic ? '25px' : ''}}>{watch('vendor_name') || '--'}</p>
                        </label>
                      </div>
                    </>
                  )}
                  <div className='formGroup'>
                    <div className='labelWidth'>
                      <label>
                        {t('typeOfInvoice.text')} <span className="required">*</span>
                        <AppTooltip message={t('typeOfInvoice.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: "20px" }}>
                      <Controller
                        name="type_of_invoice"
                        control={control}
                        rules={{ required: t('typeOfInvoice.error') }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <SelectBox
                            //{...field}
                            className={`formInput custom-select-box mb-0`}
                            error={error}
                            options={[
                              { label: 'PO Based', value: 1 },
                              { label: 'Non PO Based', value: 2 }
                            ]}
                            placeholder={t('SelectTypeOfInvoce')}
                            height="30px"
                            onChange={(e) => onChange(e.target.value)}
                            value={value || ''}
                          />
                        )}
                      />
                    </div>
                  </div>
                  {selectedInvoiceType == 1 && (
                    <div className='formGroup'>
                      <div className='labelWidth'>
                        <label>
                          {t('poBasedInvoiceLineItem.text')} <span className="required">*</span>
                          <AppTooltip message={t('poBasedInvoiceLineItem.tooltip')} />
                        </label>
                      </div>
                      <div style={{ paddingRight: "20px" }}>
                        <Controller
                          name="po_based_No"
                          control={control}
                          rules={{ required: t('typeOfInvoice.error') }}
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                              <MultiSelectDropdown
                                className={`formInput`}
                                placeholder={t('select')}
                                options={poDropdownOptions}
                                selectedValues={value || []}
                                onChange={onChange}
                              />
                              {error && (
                                <p style={{ color: 'red', fontSize: '12px' }}>{error.message}</p>
                              )}
                            </>
                          )}
                        />
                      </div>
                    </div>
                  )}
                  <div className='formGroup'>
                    <div className='labelWidth'>
                      <label>
                        {t('ProformaInvoiceNo')} <span className="required">*</span>
                        <AppTooltip message={t('EnterProformaInvoice')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: "20px" }}>
                      <InputBox
                        placeholder={t('EnterProformaInvoice')}
                        className={`inputBox mb-0 formInput`}
                        name="Performa_Invoice_Number"
                        type="text"
                        register={register}
                        error={errors.Performa_Invoice_Number}
                        rules={{
                          required: t('ProformaInvoiceNoIsRequired'),
                          maxLength: {
                            value: 16,
                            message: t('toast:invoiceNoLessThan17Char')
                          },
                          validate: (value) => NoSpecialCharValidator('Proforma Invoice No', value)
                        }}
                      />
                    </div>
                  </div>
                  <div className='formGroup'>
                    <div className='labelWidth'>
                      <label>
                        {t('valueOfAdvancePayment.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('valueOfAdvancePayment.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: "20px" }}>
                      <Controller
                        name="value_of_advance_payment"
                        control={control}
                        rules={{
                          required: t('valueOfAdvancePayment.error'),
                          pattern: {
                            //value: /^\d+(\.\d{1,2})?$/,
                            value: /^(?!0+(?:\.0{1,2})?$)\d+(\.\d{1,2})?$/,
                            message: t('invalidAmountFormat')
                          }
                        }}
                        render={({ field, fieldState: { error } }) => (
                          <InputBox
                            {...field}
                            placeholder={t('valueOfAdvancePayment.placeholder')}
                            className={`inputBox mb-0 formInput`}
                            type="number"
                            step="0.01"
                            error={error}
                            onKeyDown={(e) => {
                                        if (["-", "+", "e", "E"].includes(e.key)) {
                                          e.preventDefault()
                                        }
                                        if (e.target.value && e.target.value.length >= 18 && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                                          e.preventDefault();
                                        }
                                      }}
                            onInput={(e) => {
                                      if (e.target.value.length > 18) {
                                        e.target.value = e.target.value.slice(0, 18);
                                      }
                                    }}
                          />
                        )}
                      />
                    </div>
                  </div>
                  {/* <div className="d-flex gap-10">
                    <div className={styles.userInputs}>
                      {userType !== VENDOR_USER_TYPE && (
                        <>
                          <label>
                            {t('vendorCode')}
                            <span className="required">*</span>
                            <AppTooltip
                              message={t('po_based_invoices:POInvoiceVendorCode.tooltip')}
                            />
                          </label>
                          <label>
                            {t('vendorName')}
                            <span className="required">*</span>
                            <AppTooltip
                              message={t('po_based_invoices:POInvoiceVendorName.tooltip')}
                            />
                          </label>
                        </>
                      )}
                      <label>
                        {t('typeOfInvoice.text')} <span className="required">*</span>
                        <AppTooltip message={t('typeOfInvoice.tooltip')} />
                      </label>
                      {selectedInvoiceType == 1 && (
                        <label>
                          {t('poBasedInvoiceLineItem.text')} <span className="required">*</span>
                          <AppTooltip message={t('poBasedInvoiceLineItem.tooltip')} />
                        </label>
                      )}
                      <label>
                        {t('ProformaInvoiceNo')} <span className="required">*</span>
                        <AppTooltip message={t('EnterProformaInvoice')} />
                      </label>
                      <label>
                        {t('valueOfAdvancePayment.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('valueOfAdvancePayment.tooltip')} />
                      </label>
                    </div>
                    <div className={styles.userInputs}>
                      {userType !== VENDOR_USER_TYPE && (
                        <>
                          <Controller
                            name="vendor_code"
                            control={control}
                            rules={{ required: t('non_po_based_invoices:vendorCode.error') }}
                            defaultValue=""
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <SelectBox
                                className={`${styles.userInput} custom-select-box mb-0`}
                                error={error}
                                value={value}
                                onChange={(e) => {
                                  onChange(e.target.value)
                                  if (userType !== VENDOR_USER_TYPE) {
                                    fetchPODropdownData(e.target.value)
                                  }

                                  const selectedVendor = vendorCodeOptions.find(
                                    (v) => v.value == e.target.value
                                  )
                                  if (selectedVendor) {
                                    setValue('vendor_name', selectedVendor.vendorName || '')
                                  } else {
                                    setValue('vendor_name', '')
                                  }
                                }}
                                options={vendorCodeOptions}
                                placeholder={t('po_based_invoices:POInvoiceVendorCode.tooltip')}
                                height="30px"
                              />
                            )}
                          />
                          <p>{watch('vendor_name') || '--'}</p>
                        </>
                      )}
                      <Controller
                        name="type_of_invoice"
                        control={control}
                        rules={{ required: t('typeOfInvoice.error') }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <SelectBox
                            //{...field}
                            className={`${styles.userInput} custom-select-box mb-0`}
                            error={error}
                            options={[
                              { label: 'PO Based', value: 1 },
                              { label: 'Non PO Based', value: 2 }
                            ]}
                            placeholder={t('SelectTypeOfInvoce')}
                            height="30px"
                            onChange={(e) => onChange(e.target.value)}
                            value={value || ''}
                          />
                        )}
                      />
                      {selectedInvoiceType == 1 && (
                        <Controller
                          name="po_based_No"
                          control={control}
                          rules={{ required: t('typeOfInvoice.error') }}
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                              <MultiSelectDropdown
                                placeholder={t('select')}
                                options={poDropdownOptions}
                                selectedValues={value || []}
                                onChange={onChange}
                              />
                              {error && (
                                <p style={{ color: 'red', fontSize: '12px' }}>{error.message}</p>
                              )}
                            </>
                          )}
                        />
                      )}
                      <InputBox
                        placeholder={t('EnterProformaInvoice')}
                        className={`inputBox mb-0 ${styles.userInput}`}
                        name="Performa_Invoice_Number"
                        type="text"
                        register={register}
                        error={errors.Performa_Invoice_Number}
                        rules={{
                          required: t('ProformaInvoiceNoIsRequired'),
                          maxLength: {
                            value: 16,
                            message: 'Invoice number must be less than 17 characters.'
                          },
                          validate: (value) => NoSpecialCharValidator('Proforma Invoice No', value)
                        }}
                      />

                      <Controller
                        name="value_of_advance_payment"
                        control={control}
                        rules={{
                          required: t('valueOfAdvancePayment.error'),
                          pattern: {
                            //value: /^\d+(\.\d{1,2})?$/,
                            value: /^(?!0+(?:\.0{1,2})?$)\d+(\.\d{1,2})?$/,
                            message: 'Invalid amount format'
                          }
                        }}
                        render={({ field, fieldState: { error } }) => (
                          <InputBox
                            {...field}
                            placeholder={t('enterValue')}
                            className={`inputBox mb-0 ${styles.userInput}`}
                            type="number"
                            step="0.01"
                            error={error}
                          />
                        )}
                      />
                    </div>
                  </div> */}
                </div>
                <div className="col-6 pl-4" style={{ paddingRight: isArabic ? '20px' : '' }}>
                  <div className='formGroup'>
                    <div className='labelWidth'>
                      <label>
                        {t('credit_notes:currency.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('banking_details_comp:invoiceCurrency.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: "20px" }}>
                      <Controller
                        name="currency"
                        control={control}
                        rules={{ required: t('credit_notes:currency.error') }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <SelectBox
                            //{...field}
                            className={`formInput custom-select-box mb-0`}
                            error={error}
                            options={currencyOptions}
                            placeholder={t('credit_notes:currency.placeholder')}
                            height="30px"
                            tooltipMessage={t('currency.tooltip')}
                            onChange={(e) => onChange(e.target.value)}
                            value={value || ''}
                          />
                        )}
                      />
                    </div>
                  </div>
                  <div className='formGroup'>
                    <div className='labelWidth'>
                      <label>
                        {t('submissionDate')}
                      </label>
                    </div>
                    <p style={{paddingRight: isArabic ? '25px' : ''}}>
                      {watch('submission_date')
                        ? dayjs(watch('submission_date')).isValid()
                          ? dayjs(watch('submission_date')).format('DD/MM/YYYY')
                          : ''
                        : ''}
                    </p>
                  </div>
                  <div className='formGroup'>
                    <div className='labelWidth'>
                      <label>
                        {t('costResponsible.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('costResponsible.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: "20px" }}>
                      <Controller
                        name="cost_responsible"
                        control={control}
                        rules={{ required: t('costResponsible.error') }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <SelectBox
                            // {...field}
                            className={`formInput custom-select-box mb-0`}
                            error={error}
                            placeholder={t('enterCostResponsible')}
                            height="30px"
                            options={crPersonsOptions}
                            onChange={(e) => onChange(e.target.value)}
                            value={value || ''}
                            isRequired
                          />
                        )}
                      />
                    </div>
                  </div>
                  {/* <div className="d-flex gap-10">
                    <div className={`${styles.userInputs} ${styles.verticalDividerLeft}`}>
                      <label>
                        {t('credit_notes:currency.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('banking_details_comp:invoiceCurrency.tooltip')} />
                      </label>
                      <label>
                        {t('submissionDate')} <span className="required">*</span>
                      </label>
                      <label>
                        {t('costResponsible.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('costResponsible.tooltip')} />
                      </label>
                    </div>
                    <div className={styles.userInputs}> */}
                  {/* <DateRangePicker
                    value={selectedDate}
                    setValue={setSelectedDate}
                    minHeight="30px"
                  /> */}
                  {/* <InputBox
                    className={` border-none mb-0 ${styles.userInput}`}
                    name="submissionDate"
                    type="text"
                    register={register}
                  /> */}

                  {/* <Controller
                        name="currency"
                        control={control}
                        rules={{ required: t('credit_notes:currency.error') }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <SelectBox
                            //{...field}
                            className={`${styles.userInput} custom-select-box mb-0`}
                            error={error}
                            options={currencyOptions}
                            placeholder={t('credit_notes:currency.placeholder')}
                            height="30px"
                            tooltipMessage={t('currency.tooltip')}
                            onChange={(e) => onChange(e.target.value)}
                            value={value || ''}
                          />
                        )}
                      />
                      <p>
                        {watch('submission_date')
                          ? dayjs(watch('submission_date')).isValid()
                            ? dayjs(watch('submission_date')).format('DD/MM/YYYY')
                            : ''
                          : ''}
                      </p>

                      <Controller
                        name="cost_responsible"
                        control={control}
                        rules={{ required: t('costResponsible.error') }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <SelectBox
                            // {...field}
                            className={`${styles.userInput} custom-select-box mb-0`}
                            error={error}
                            placeholder={t('enterCostResponsible')}
                            height="30px"
                            options={crPersonsOptions}
                            onChange={(e) => onChange(e.target.value)}
                            value={value || ''}
                            isRequired
                          />
                        )}
                      />
                    </div>
                  </div> */}
                </div>
              </div>

              {/* Attachment Section */}
              <div className={`${styles.attachmentContainer}`}>
                <div className="d-flex align-items-center">
                  <div className="w-[50%]">
                    <div className="d-flex align-items-center">
                      <div className="labelWidth">
                        <label className={styles.inputLabel}>
                          {t('attachmentType.text')} <span className="required">*</span>
                          <AppTooltip message={t('non_po_based_invoices:attachmentType.tooltip')} />
                        </label>
                      </div>
                      <Controller
                        name="attachment_type"
                        control={control}
                        rules={{
                          required: uploadedFiles?.length === 0 ? t('attachmentTypeRequired') : ''
                        }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <div className="select-container">
                            <SelectBox
                              className={`formInput custom-select-box mb-0`}
                              error={error}
                              label="Attachment Type"
                              value={value || ''}
                              onChange={(event) => {
                                const selectedValue = event.target.value
                                if (!selectedValue) return

                                // const selectedOption = attachmentTypeOptions.find(
                                //   (option) => option.value === selectedValue
                                // )

                                setCurrentAttachment((prev) => ({
                                  ...prev,
                                  type: selectedValue
                                }))

                                onChange(selectedValue)
                              }}
                              options={translatedOptions}
                              name="attachment_type"
                              isRequired
                              placeholder={t('select')}
                              height="34px"
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>
                  <div className="w-[50%] pl-4">
                    <div className="d-flex">
                      <div>
                        <div className="d-flex align-items-center gap-4">
                          <div className="d-flex">
                            <label className={styles.inputLabel}>
                              {t('non_po_based_invoices:fileUpload.text')}
                              <span className="required">*</span>
                              <AppTooltip message={t('non_po_based_invoices:fileUpload.tooltip')} />
                            </label>
                          </div>
                          <div>
                            <Controller
                              name="attachments"
                              control={control}
                              rules={{
                                required: uploadedFiles?.length === 0 ? t('fileUploadRequired') : ''
                              }}
                              render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <>
                                  <FileUploadInput
                                    name="attachments"
                                    //error={error}
                                    files={value}
                                    multiple={true}
                                    onChange={(event) => {
                                      //const selectedFile = event.target.files?.[0]
                                      const selectedFile = Array.from(event.target.files || [])
                                      if (!selectedFile) return
                                      if (selectedFile.length > 2) {
                                        setError('attachments', {
                                          type: 'manual',
                                          message: 'Only 2 files are allowed'
                                        })
                                        return
                                      }
                                      // Check if attachment type is credit note and validate PDF files only
                                      const currentAttachmentType = getValues('attachment_type');
                                      if (currentAttachmentType === 'Proforma Invoice') {
                                        const nonPdfFiles = selectedFile.filter(f => f.type !== 'application/pdf')

                                        if (nonPdfFiles.length > 0) {
                                          toast.error('Only PDF files are allowed for Proforma Invoice attachments')
                                          event.target.value = null;
                                          return
                                        }
                                      }
                                      clearErrors('attachments')
                                      setCurrentAttachment((prev) => ({ ...prev, file: selectedFile }))
                                      onChange(selectedFile)
                                    }}
                                    className={'formInput'}
                                  />
                                  {error && (
                                    <p style={{ fontSize: "11px", color: '#d50000' }}>
                                      {error.message}
                                    </p>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={{ paddingRight: isArabic ? "20px" : "" }}>
                        <NormalButton
                          isPrimary
                          label={t('upload')}
                          leftIcon={uploadAddIcon}
                          customClass="px-3 uploadBtnBorder uploadBtnStyle"
                          onClick={handleFileUpload}
                          isLoading={uploadLoading}
                          disabled={uploadLoading}
                          type="button"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Header row */}
                {uploadedFiles?.length > 0 && (
                  <>
                    <hr />
                    <div className={`d-flex ${styles.attachmentRow} text-start`}>
                      <div className={`${styles.colSn} ${styles.headerText}`}><label className="fw-semibold">{t('SNo')}</label></div>
                      <div className={`${styles.colType} ${styles.headerText}`}><label className="fw-semibold">{t('AttachmentType')}</label>
                      </div>
                      <div className={`${styles.colName} ${styles.headerText}`}><label className="fw-semibold">{t('DocumentName')}</label>
                      </div>
                      <div className={`${styles.colAction} ${styles.headerText}`}><label className="fw-semibold">{t('action')}</label>
                      </div>
                    </div>
                  </>
                )}

                {/* Uploaded file rows */}
                {uploadedFiles?.map((file, index) => (
                  <div
                    key={file.id || index}
                    className={`d-flex ${styles.attachmentRow} text-start`}>
                    <div className={`${styles.colSn} ${styles.fileText}`}><label>{index + 1}</label></div>
                    <div className={`${styles.colType} ${styles.fileText}`}>
                      <label>
                        {/* {file.attachment_type?.charAt(0).toUpperCase() +
                          file.attachment_type?.slice(1)} */}
                           {translatedOptions.find(opt => opt.value === file.attachment_type)?.label || file.attachment_type}
                      </label>
                    </div>
                    <div className={`${styles.colName} ${styles.fileText} ${styles.docLink}`}>
                      <label style={{direction: isArabic ? "ltr" : ""}}>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-decoration-none text-primary cursor-pointer">
                          {file.document_name}
                        </a>
                      </label>
                    </div>
                    <div className={`${styles.colAction}`}>
                      <img
                        src={deleteIcon}
                        alt="delete"
                        className="btn btn-link text-danger p-0"
                        //onClick={() => handleRemoveFile(file.id)}
                        onClick={() => {
                          setFileToDelete(file)
                          setIsModalOpen(true)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </form>

            {nextClick && (
              <InvoicePreviewAdvancePayment
                open={nextClick}
                setNextClick={setNextClick}
                title={t('logistics_invoice:invoicePreview')}
                handleSave={(status) => handleSubmit((data) => handleSave(data, status))()}
                saved={saved}
                formData={{
                  ...getValues(),
                  vendor_code: vendorCodeOptions.find(
                    (opt) => opt.value === Number(getValues('vendor_code'))
                  )?.label
                }}
                crPersonsOptions={crPersonsOptions}
                uploadedFiles={uploadedFiles}
              />
            )}

            {showSuccessPopup && (
              <SuccessPopup
                open={showSuccessPopup}
                onClose={handleCloseSuccessPopup}
                successMsg={t('purchase_order:saved')}
                subText={t('popup:paymentSaved')}
                modalStyles={{maxWidth:450}}
              />
            )}
          </div>
          {/* Modal for confirmation */}
          <CustomModal open={isModalOpen}
            modalStyles={{ width: 400 }}
            header={t('popup:confirmSubmission')}
            description={t('po_based_invoices:deleteConfirmation')}
            onClose={() => setIsModalOpen(false)}
            closeIcon>
            {/* <p className="modalTxt">{t('po_based_invoices:deleteConfirmation')}</p> */}

            <div className="d-flex justify-content-between mb-2">
              <NormalButton
                label={t('otp:cancel')}
                outlineBtn
                customClass="confimationBtns me-3"
                onClick={() => {
                  setIsModalOpen(false)
                  setFileToDelete(null)
                }}
              />
              <NormalButton
                label={t('otp:confirm')}
                isPrimaryModal
                customClass="confimationBtns"
                onClick={handleRemoveFile}
              />
            </div>
          </CustomModal>
        </>
      )}
    </>
  )
}
const mapDispatchToProps = { showToast }
const mapStateToProps = (state) => ({
  setDashboardData,
  userInfo: state.userInfo
})

export default connect(mapStateToProps, mapDispatchToProps)(AddEditAdvancePaymentcomp)
