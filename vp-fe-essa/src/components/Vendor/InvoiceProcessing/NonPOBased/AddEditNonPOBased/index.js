import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import styles from './AddEditNonPOBased.module.scss'
import nextIcon from '../../../../../assets/icons/nextIconWhite.svg'
import saveIcon from '../../../../../assets/icons/saveIconWhite.svg'
import { NormalButton } from 'components/Common/NormalButton'
import { InputBox } from 'components/Common/InputBox'
import { SelectBox } from 'components/Common/SelectBox'
import FileUploadInput from 'components/Common/FileUploadInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { InvoicePreviewNonPO } from '../InvoicePreview'
import SuccessPopup from 'components/Common/SuccessPopup'
import { useTranslation } from 'react-i18next'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import {
  getNonPOInvoiceById,
  addNonPOInvoice,
  updateNonPOInvoice,
  fetchNatureOfExpenses
} from 'api/NonPOBased'
import { fetchCurrencies, fetchVendorNameOrCode } from 'api/UserRegister'
import AppTooltip from 'components/Common/AppTooltip'
import DateRangePicker from 'components/Common/DateRangePicker1'
import { deleteIcon, editInputIcon, uploadAddIcon } from 'constants/imageConstants'
import { getCRPersons } from 'api/MyProfile'
import { taxableOptions, attachmentTypeOptions } from 'services/helpers/constants/common'
import { connect, useSelector } from 'react-redux'
import { showToast } from '../../../../../redux/actions/toastActions'
import { getEntityId } from 'services/utilities'
import { fileUpload, deleteFiles } from 'api/FileUpload'
import { FAQS, INVOICE_NON_PO_BASED } from 'constants/url'
import dayjs from 'dayjs'
import { Validator } from 'services/validation/formValidations'
import { toast } from 'react-toastify'
import { getInvoiceSOA } from 'api/SOA'
import { PageLoader } from 'components/Common/PageLoader'
import { setDashboardData } from 'redux/actions/dashboardAction'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import CustomModal from 'components/Common/Modal'
import SVGIcon from 'components/Common/SVGIcon'
const AddEditNonPOBasedComp = ({
  setDashboardData,
  userInfo: { userType, taxPercentage, paymentTerms },
  showToast
}) => {
  const {
    register,
    handleSubmit,
    control,
    getValues,
    clearErrors,
    setValue,
    setError,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
      taxPercentage: taxPercentage || '',
      paymentTerms: paymentTerms || ''
    }
  })
  const navigate = useNavigate()
  const { t, i18n } = useTranslation([
    'non_po_based_report',
    'purchase_order',
    'non_po_based_invoices',
    'logistics_invoice',
    'banking_details_comp',
    'sidebar',
    'popup',
    'po_based_invoices',
    'advance_payment',
    'general_details_comp',
    'toast',
    'credit_notes',
    'otp',
    'po_based_invoices'
  ])
  const isArabic = i18n.language === 'ar'
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const invoiceNumber = searchParams.get('id')
  const soaId = searchParams.get('soa')

  const [saved, setSaved] = useState(false)
  const [nextClick, setNextClick] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [btnLoader, setBtnLoader] = useState(false)
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [crPersonsOptions, setCrPersonsOptions] = useState([])
  const [vendorCodeOptions, setVendorCodeOptions] = useState([])
  const [natureExpensesOptions, setNatureExpensesOptions] = useState([])
  const [successMessage, setSuccessMessage] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [currentAttachment, setCurrentAttachment] = useState({ type: '', file: null })
  const [editInvAmt, setEditInvAmt] = useState(false)
  const [editTaxAmt, setEditTaxAmt] = useState(false)
  const [invoiceData, setInvoiceData] = useState([])
  const [soaData, setSOAData] = useState()
  const [selectedDate, setSelectedDate] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)

  const dashboardData = useSelector(
    (state) => state?.dashboard?.dashboardData?.profile?.payment_terms_details?.Description_En
  )
  const uploadVendorCode = useSelector(
    (state) => state?.dashboard?.dashboardData?.profile?.Vendor_SAP_Code
  )
  const getAttachmentLabelWithTranslation = (value, t) => {
    switch (value) {
      case 'invoice':
        return t('non_po_based_invoices:invoice')
      case 'delivery note':
        return t('non_po_based_invoices:delivery_note')
      case 'shipping documents':
        return t('non_po_based_invoices:shipping_documents')
      case 'others':
        return t('non_po_based_invoices:others')
      default:
        return value
    }
  }

  const translatedOptions = attachmentTypeOptions?.map((option) => ({
    label: getAttachmentLabelWithTranslation(option?.value, t),
    value: option?.value
  }))

  const fetchDropdownData = () => {
    let query = {
      entity_id: getEntityId()
    }
    Promise.all([
      fetchCurrencies(),
      getCRPersons(query),
      fetchNatureOfExpenses(),
      fetchVendorNameOrCode()
    ])
      .then(([currenciesRes, crPersonsRes, natureExpensesRes, vendorCodeRes]) => {
        const currencyList = Array.isArray(currenciesRes.data.data) ? currenciesRes.data.data : []
        const formattedCurrencies = currencyList
          .map((item) => ({
            label: `${item?.name} (${item?.code})`,
            value: item.code
          }))
          .sort((a, b) => a.label.localeCompare(b.label))

        const crPersonsOptions = crPersonsRes?.data?.data?.map((person) => ({
          label: person.Name,
          value: person.ID
        }))

        const natureOfExpensesOptions = natureExpensesRes?.data?.data?.map((person) => ({
          label: person.Description_En,
          value: person.Code
        }))
        const vendorCodeOptions = vendorCodeRes?.data?.data?.map((item) => ({
          label: item?.Vendor_SAP_Code,
          value: item?.ID,
          vendorName: item?.Vendor_Name_EN,
          adminPaymentTerms: item?.payment_terms_details?.Description_En
        }))
        setCurrencyOptions(formattedCurrencies)
        setCrPersonsOptions(crPersonsOptions)
        setNatureExpensesOptions(natureOfExpensesOptions)
        setVendorCodeOptions(vendorCodeOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }

  useEffect(() => {
    const formattedDate = dayjs().format('DD/MM/YYYY')
    setValue('submittedDate', formattedDate)
  }, [])

  useEffect(() => {
    fetchDropdownData()
  }, [])

  useEffect(() => {
    if (invoiceNumber) {
      fetchInvoiceById()
    }
  }, [invoiceNumber])

  const fetchInvoiceById = async () => {
    setIsLoading(true)
    try {
      const query = {
        id: invoiceNumber
      }
      const response = await getNonPOInvoiceById(query)
      const data = response.data?.data || response.data
      setInvoiceData(data)
    } catch (err) {
      console.error('Error fetching invoice:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userType === VENDOR_USER_TYPE) {
      setValue('paymentTerms', dashboardData)
    }
    if (invoiceNumber) {
      setValue('vendorName', invoiceData.vendorDetails?.Vendor_Name_EN)
      setValue('vendorRefNum', invoiceData.InvNo)
      setValue('remarks', invoiceData?.Remarks)
      if (userType === VENDOR_USER_TYPE) {
        setValue('paymentTerms', dashboardData)
      } else if (userType === ADMIN_USER_TYPE) {
        setValue('paymentTerms', invoiceData?.Payment_Terms)
      }

      setValue('total_invoice_amount', invoiceData?.InvAmt)
      setValue('tax_amount', invoiceData?.Tax_amount)
      setSelectedDate(dayjs(invoiceData?.InvDt))
    }
  }, [invoiceData, userType, vendorCodeOptions, setValue])

  // ✅ FIXED: Improved prefill logic with race condition handling
  // This effect handles prefilling currency, business contact, and nature of expenses
  // when editing an invoice. It waits for both invoiceData and dropdown options to be loaded.
  useEffect(() => {
    if (invoiceNumber && invoiceData && Object.keys(invoiceData).length > 0) {
      // Add a small delay to ensure all options are loaded from API
      const timer = setTimeout(() => {
        // Only prefill if all required options are available
        if (vendorCodeOptions?.length > 0) {
          const vendorCode = vendorCodeOptions?.find(
            (opt) => opt.value === invoiceData?.vendorDetails?.ID
          )
          if (vendorCode) {
            setValue('vendorCode', vendorCode.value)
          }
        }

        if (currencyOptions?.length > 0) {
          const currency = currencyOptions?.find((opt) => opt.value === invoiceData?.InvCurr)
          if (currency) {
            setValue('currency', currency.value)
          }
        }

        if (crPersonsOptions?.length > 0) {
          const businessContact = crPersonsOptions?.find(
            (opt) => opt.value === invoiceData?.Business_contact
          )
          if (businessContact) {
            setValue('businessContact', businessContact.value)
          }
        }

        if (natureExpensesOptions?.length > 0) {
          const natureOfExpenses = natureExpensesOptions?.find(
            (opt) => opt.value === invoiceData?.Nature_Of_Expense
          )
          if (natureOfExpenses) {
            setValue('natureOfExpenses', natureOfExpenses.value)
          }
        }

        const taxPercentage = taxableOptions?.find(
          (opt) => opt.value === invoiceData?.Tax_percentage
        )
        if (taxPercentage) {
          setValue('taxPercentage', taxPercentage.value)
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [
    invoiceNumber,
    invoiceData,
    vendorCodeOptions,
    currencyOptions,
    crPersonsOptions,
    natureExpensesOptions
  ])

  const totalInvAmt = invoiceData?.InvAmt || 0
  const totalTaxAmt = invoiceData?.Tax_amount || 0

  useEffect(() => {
    if (invoiceData?.upload_files?.length > 0) {
      const uploadedFiles = invoiceData.upload_files.map((file) => {
        const documentName = file.Upload_files.split('/').pop()
        return {
          attachment_type: file.Attachment_type,
          document_name: documentName,
          file: null,
          id: file.ID,
          file_url: file.Upload_files,
          file_type: file.Attachment_type
        }
      })

      setUploadedFiles(uploadedFiles)
    }
  }, [invoiceData])

  const handleNext = handleSubmit((data) => {
    if (data.attachments?.length && currentAttachment?.file && uploadedFiles.length === 0) {
      setError('attachments', {
        type: 'manual',
        message: t('credit_notes:pleaseUploadSelectedFile')
      })
      return
    }

    setNextClick(true)
  })

  const handleSave = () => {
    setNextClick(false)
    handleSubmit((data) => onSubmit(data, 'draft'))()
  }

  const handleSubmitInvoice = () => {
    handleSubmit((data) => onSubmit(data, 'submitted'))()
    setNextClick(false)
  }

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false)
    setNextClick(true)
  }

  const onSubmit = async (data, status = 'draft') => {
    setIsLoading(true)
    const invoiceDate = selectedDate ? selectedDate.format('YYYY-MM-DD HH:mm:ss') : ''
    const isAdmin = userType === ADMIN_USER_TYPE

    const body = {
      ID: invoiceNumber ?? null,
      Invoice_Status_Id: status === 'draft' ? 101 : 100,
      ...(isAdmin && { Vendor_id: data?.vendorCode }),
      ...(isAdmin && { vendor_name: data?.vendorName }),
      CoCd: getEntityId(),
      InvNo: data?.vendorRefNum,
      InvDt: invoiceDate,
      InvCurr: data?.currency,
      Payment_Terms: data?.paymentTerms || dashboardData,
      InvAmt: data?.total_invoice_amount || totalInvAmt,
      Tax_amount: data?.tax_amount || totalTaxAmt,
      Tax_percentage: data?.taxPercentage,
      Business_contact: data?.businessContact,
      Remarks: data?.remarks,
      Nature_Of_Expense: data?.natureOfExpenses,
      upload_file: uploadedFiles.map(({ file_url, file_type, document_name }) => ({
        upload_files: file_url,
        attachment_type: file_type,
        originalName: document_name
      }))
    }

    try {
      if (status === 'draft') {
        let response
        if (invoiceNumber) {
          await updateNonPOInvoice(body)
        } else {
          response = await addNonPOInvoice(body)
          const newInvoiceId = response?.data?.data?.ID
          if (newInvoiceId) {
            navigate(`${location.pathname}?id=${newInvoiceId}`, { replace: true })
          }
        }

        setShowSuccessPopup(true)
        setSuccessMessage(t('popup:invoiceSavedSuccessfully'))
        setSaved(true)
      }

      if (status === 'submitted') {
        setShowSuccessPopup(false)

        if (invoiceNumber) {
          await updateNonPOInvoice({ ...body, ID: invoiceNumber })
        } else {
          const response = await addNonPOInvoice(body)
          const newInvoiceId = response?.data?.ID
          if (newInvoiceId) {
            navigate(`${location.pathname}?id=${newInvoiceId}`, { replace: true })
          }
        }

        showToast(t('toast:successTitle'), t('popup:invoiceSubmittedSuccessfully'), 'success')
        navigate(`/${userType}${INVOICE_NON_PO_BASED}`)
      }
    } catch (err) {
      console.error('Error submitting invoice:', err)
      toast.error(err?.response?.data?.message || err.message || t('toast:somethingWentWrong'))
    } finally {
      setIsLoading(false)
    }
  }

  //   const handleRemoveFile = async (id) => {
  //     try {
  //      if (id && typeof id === 'number') {
  //   const fileToDelete = uploadedFiles.find((f) => f.id === id);
  //   await deleteFiles(id, { url: fileToDelete?.file_url });
  // }

  //       const updated = uploadedFiles.filter((file) => file.id !== id)
  //       setUploadedFiles(updated)
  //       showToast && showToast(t('toast:successTitle'), t('toast:fileDeleted'), 'success')
  //     } catch (error) {
  //       console.error('Error deleting file:', error)
  //       toast.error(t('toast:fileDeleteFailed'))
  //     }
  //   }

  const handleRemoveFile = async () => {
    try {
      if (fileToDelete?.id) {
        await deleteFiles({
          id: Number(fileToDelete.id),
          url: fileToDelete.file_url
        })
      }

      const updated = uploadedFiles.filter((file) => Number(file.id) !== Number(fileToDelete?.id))
      setUploadedFiles(updated)
      setFileToDelete(null)
      setIsModalOpen(false)
      showToast(t('toast:successTitle'), t('toast:fileDeleted'), 'success')
    } catch (error) {
      console.error('Error deleting file:', error)
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
    const typeCount = uploadedFiles.filter((f) => f.attachment_type === type).length
    if (typeCount + filesArray.length > 2) {
      const typeLabel = getAttachmentLabelWithTranslation(type, t)
      toast.error(t('toast:onlyTwoFilesPerType', { type: typeLabel }))
      return
    }

    const vendorCode = uploadVendorCode
    const selectedVendorId = getValues('vendorCode')
    const selectedVendor = vendorCodeOptions.find((v) => v.value === selectedVendorId)
    const adminVendorCode = selectedVendor?.label || ''

    const vendorCodeUpload = userType === VENDOR_USER_TYPE ? vendorCode : adminVendorCode
    const module = 'NON PO BASED' // static value
    const attachmentType = type

    let newFiles = []
    setBtnLoader(true)
    try {
      for (let i = 0; i < filesArray.length; i++) {
        const singleFile = filesArray[i]
        const fd = new FormData()
        fd.append('image', singleFile)
        fd.append('vendor_code', vendorCodeUpload)
        fd.append('module', module)
        fd.append('attachment_type', attachmentType)

        const res = await fileUpload(fd)
        const url = res.data?.data?.url
        newFiles.push({
          id: uploadedFiles.length + newFiles.length + 1,
          attachment_type: type,
          document_name: singleFile.name,
          file_url: url,
          file_type: type
        })
      }
      setBtnLoader(false)
      setUploadedFiles([...uploadedFiles, ...newFiles])
      setValue('attachments', '')
      setValue('attachmentType', '')
      setCurrentAttachment({ type: '', file: null })
      clearErrors('attachments')
    } catch (err) {
      console.error(err)
    }
  }

  const alphaNumericValidator = new Validator()
    .validateNotEmptySpace()
    .validateMinLength(3)
    .validateMaxLength(16)
    .build()

  const numericValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoSymbols()
    .validateMaxLength(16)
    .validateOnlyNumbers()
    .build()

  const remarksValidator = new Validator()
    .validateNotEmptySpace()
    .validateMinLength(3)
    .validateMaxLength(364)
    .build()

  const fetchInvoiceFromSOA = async () => {
    setIsLoading(true)
    try {
      const query = {
        id: soaId
      }
      const response = await getInvoiceSOA(query)
      const data = response?.data?.data
      setSOAData(data)
    } catch (err) {
      console.error('Error fetching invoice:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (soaId) {
      fetchInvoiceFromSOA()
    }
  }, [])

  useEffect(() => {
    setValue('vendorRefNum', soaData?.Reference)
    setValue('currency', soaData?.Curr)
    setValue('total_invoice_amount', soaData?.Amount)
    setSelectedDate(dayjs(soaData?.Document_Date))
  }, [soaData])

  return (
    <LeftPageContainer>
      {isLoading ? (
        <div className="no-data-container-view">
          <PageLoader />
        </div>
      ) : (
        <>
          <div className={styles.poContainer}>
            <label className={styles.homeText}>
              {`${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t(
                'sidebar:nonPoBased'
              )} / `}
              {isEdit ? 'Edit Invoice' : t('purchase_order:createInvoice')}
            </label>
            <div className={styles.subHeader}>
              <div>
                <SVGIcon
                  size={25}
                  className="cursor-pointer"
                  name="backArrow"
                  onClick={() => navigate(-1)}
                />
                <h5>{isEdit ? 'Edit Invoice' : t('purchase_order:createInvoice')}</h5>
                {saved && (
                  <div className={`px-2 ${styles.savedPill}`}>{t('purchase_order:saved')}</div>
                )}
              </div>
              <div>
                <>
                  <NormalButton
                    label={t('purchase_order:next')}
                    isPrimary
                    customClass="px-3"
                    rightIconClassName="rtl:rotate-180"
                    rightIcon={nextIcon}
                    onClick={handleNext}
                  />
                  {!saved ? (
                    <NormalButton
                      label={t('purchase_order:save')}
                      isPrimary
                      customClass="px-3"
                      rightIcon={saveIcon}
                      onClick={handleSave}
                    />
                  ) : null}
                </>
                <TooltipWrapper tooltipMessage={t('credit_notes:help')}>
                  <div className={styles.faqIconContainer}>
                    {/* <img src={helpIcon} alt="help" onClick={() => navigate(`/${userType}${FAQS}?id=3`)} className='cursor-pointer' /> */}
                    <SVGIcon
                      size={25}
                      className="cursor-pointer"
                      name="help"
                      onClick={() => navigate(`/${userType}${FAQS}?id=3`)}
                      alt="help"
                    />
                  </div>
                </TooltipWrapper>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitInvoice} type="submit">
            <div className={`${styles.userInputContainer}`}>
              <div className="col-6">
                <div className="d-flex gap-10">
                  <div
                    className={styles.userInputs}
                    style={{ paddingLeft: isArabic ? '20px' : '' }}>
                    {userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE ? (
                      <>
                        <div className="formGroup">
                          <div className="labelWidth">
                            <label>
                              {t('advance_payment:vendorCode')} <span className="required">*</span>
                              <AppTooltip
                                message={t('po_based_invoices:POInvoiceVendorCode.tooltip')}
                              />
                            </label>
                          </div>
                          <div style={{ paddingRight: '20px' }}>
                            <Controller
                              name="vendorCode"
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

                                    const selectedVendor = vendorCodeOptions.find(
                                      (v) => v.value == e.target.value
                                    )
                                    if (selectedVendor) {
                                      setValue('vendorName', selectedVendor.vendorName || '')
                                      setValue(
                                        'paymentTerms',
                                        selectedVendor?.adminPaymentTerms || ''
                                      )
                                    } else {
                                      setValue('vendorName', '')
                                      setValue('paymentTerms', '')
                                    }
                                  }}
                                  options={vendorCodeOptions}
                                  placeholder={t('advance_payment:select')}
                                  height="30px"
                                />
                              )}
                            />
                          </div>
                        </div>

                        <div className="formGroup">
                          <div className="labelWidth">
                            <label>
                              {t('advance_payment:vendorName')} <span className="required">*</span>
                              <AppTooltip
                                message={t('po_based_invoices:POInvoiceVendorName.tooltip')}
                              />
                            </label>
                          </div>
                          <div
                            style={{
                              width: isArabic ? '250px' : '270px',
                              paddingRight: isArabic ? '20px' : ''
                            }}>
                            <p>{watch('vendorName')}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      ''
                    )}

                    <div className="formGroup">
                      <div className="labelWidth">
                        <label>
                          {t('non_po_based_invoices:vendorInvoiceNumber.text')}{' '}
                          <span className="required">*</span>
                          <AppTooltip message={t('vendorInvoiceNumber.tooltip')} />
                        </label>
                      </div>
                      <div style={{ paddingRight: '20px' }}>
                        <InputBox
                          placeholder={t('non_po_based_invoices:vendorInvoiceNumber.placeholder')}
                          className={`inputBox mb-0 formInput`}
                          name="vendorRefNum"
                          type="text"
                          register={register}
                          rules={{
                            required: t('vendorInvoiceNumber.error'),
                            maxLength: {
                              value: 16,
                              message: 'Invoice number must be less than 17 characters.'
                            },
                            validate: (value) =>
                              alphaNumericValidator(t('logistics_invoice:enterReferenceNo'), value)
                          }}
                          error={errors.vendorRefNum}
                        />
                      </div>
                    </div>

                    <div className="formGroup">
                      <div className="labelWidth">
                        <label>
                          {t('submittedDate.text')} <span className="required">*</span>
                          <AppTooltip message={t('submittedDate.tooltip')} />
                        </label>
                      </div>
                      <div style={{ paddingRight: '20px' }}>
                        <InputBox
                          className={` inputBox mb-0 formInput`}
                          name="submittedDate"
                          type="text"
                          register={register}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="formGroup">
                      <div className="labelWidth">
                        <label>
                          {t('invoiceDate.text')} <span className="required">*</span>
                          <AppTooltip message={t('invoiceDate.tooltip')} />
                        </label>
                      </div>
                      <div style={{ paddingRight: '20px' }}>
                        <DateRangePicker
                          className={` border-none mb-0 formInput`}
                          value={selectedDate}
                          invDate
                          maxDate={dayjs()}
                          setValue={setSelectedDate}
                          minHeight="45px"
                        />
                      </div>
                    </div>

                    <div className="formGroup">
                      <div className="labelWidth">
                        <label>
                          {t('currency.text')} <span className="required">*</span>
                          <AppTooltip message={t('currency.tooltip')} />
                        </label>
                      </div>
                      <div style={{ paddingRight: '20px' }}>
                        <Controller
                          name="currency"
                          control={control}
                          rules={{ required: t('credit_notes:currency.error') }}
                          defaultValue=""
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <SelectBox
                              className={`formInput custom-select-box mb-0`}
                              error={error}
                              value={value}
                              onChange={onChange}
                              options={currencyOptions}
                              placeholder={t(
                                'banking_details_comp:bankAccountCurrency.placeholder'
                              )}
                              height="30px"
                            />
                          )}
                        />
                      </div>
                    </div>

                    <div className="formGroup">
                      <div className="labelWidth">
                        <label>
                          {t('businessContact.text')} <span className="required">*</span>
                          <AppTooltip message={t('businessContact.tooltip')} />
                        </label>
                      </div>
                      <div style={{ paddingRight: '20px' }}>
                        <Controller
                          name="businessContact"
                          control={control}
                          rules={{ required: t('businessContact.error') }}
                          defaultValue=""
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <SelectBox
                              className={`formInput custom-select-box mb-0`}
                              error={error}
                              value={value}
                              onChange={onChange}
                              options={crPersonsOptions}
                              placeholder={t('logistics_invoice:selectContact')}
                              height="30px"
                            />
                          )}
                        />
                      </div>
                    </div>

                    <div className="formGroup">
                      <div className="labelWidth">
                        <label>
                          {t('natureOfExpenses.text')} <span className="required">*</span>
                          <AppTooltip message={t('natureOfExpenses.tooltip')} />
                        </label>
                      </div>
                      <div style={{ paddingRight: '20px' }}>
                        <Controller
                          name="natureOfExpenses"
                          control={control}
                          rules={{ required: t('natureOfExpenses.error') }}
                          defaultValue=""
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <SelectBox
                              className={`formInput custom-select-box mb-0`}
                              error={error}
                              value={value}
                              onChange={onChange}
                              options={natureExpensesOptions}
                              placeholder={t('logistics_invoice:selectCategory')}
                              height="30px"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ borderInlineStart: '1px solid #929398' }} className="col-6">
                <div className={`${styles.userInputs} ${styles.verticalDividerLeft}`}>
                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('non_po_based_invoices:taxPercentage.text')}{' '}
                        <span className="required">*</span>
                        <AppTooltip message={t('non_po_based_invoices:taxPercentage.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: '20px' }}>
                      <Controller
                        name="taxPercentage"
                        control={control}
                        rules={{ required: t('taxRate.error') }}
                        defaultValue=""
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <SelectBox
                            className={`formInput custom-select-box mb-0`}
                            error={error}
                            value={value}
                            onChange={onChange}
                            options={[
                              { label: '0%', value: 0 },
                              { label: '5%', value: 5 },
                              { label: '14%', value: 14 },
                              { label: '15%', value: 15 }
                            ]}
                            placeholder={t('logistics_invoice:selectTaxRate')}
                            height="30px"
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('non_po_based_invoices:totalInvoiceAmount.text')}{' '}
                        <span className="required">*</span>
                        <AppTooltip
                          message={t('non_po_based_invoices:totalInvoiceAmount.tooltip')}
                        />
                      </label>
                    </div>
                    <div>
                      {/* {(soaId || editInvAmt) ? ( */}
                      <div style={{ paddingRight: '20px' }}>
                        <InputBox
                          placeholder={t('enterInvoiceValue')}
                          className={`inputBox mb-0 formInput`}
                          name="total_invoice_amount"
                          type="text"
                          register={register}
                          rules={{
                            required: t('non_po_based_invoices:totalInvoiceAmount.error'),
                            validate: (value) => {
                              const num = Number(value)
                              if (isNaN(num) || num <= 0) {
                                return (
                                  t('non_po_based_invoices:totalInvoiceAmount.zeroError') ||
                                  'Total invoice amount must be greater than 0'
                                )
                              }
                              return true
                            }
                          }}
                          error={errors.total_invoice_amount}
                          clearErrors={clearErrors}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E'].includes(e.key)) {
                              e.preventDefault()
                            }
                            if (
                              e.target.value &&
                              e.target.value.length >= 18 &&
                              e.key !== 'Backspace' &&
                              e.key !== 'Delete' &&
                              e.key !== 'ArrowLeft' &&
                              e.key !== 'ArrowRight'
                            ) {
                              e.preventDefault()
                            }
                          }}
                          onInput={(e) => {
                            if (e.target.value.length > 18) {
                              e.target.value = e.target.value.slice(0, 18)
                            }
                          }}
                        />
                      </div>
                      {/* )

                        : (
                          <div className="d-flex align-items-center" style={{ paddingRight: '20px' }}>
                            <label className={styles.currencyTxt}>{Number(totalInvAmt || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</label>
                            <img
                              style={{ width: '16px' }}
                              src={editInputIcon}
                              onClick={() => setEditInvAmt(true)}
                              className="ms-1 cursor-pointer"
                            />
                          </div>
                        )} */}
                    </div>
                  </div>

                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('non_po_based_invoices:totalTaxAmount.text')}
                        <span className="required">*</span>
                        <AppTooltip message={t('non_po_based_invoices:totalTaxAmount.tooltip')} />
                      </label>
                    </div>
                    <div>
                      <Controller
                        name="tax_amount"
                        control={control}
                        rules={{
                          ...(editTaxAmt && { required: 'Tax Amount is required' }),
                          validate: (value) => {
                            const invoiceAmount = Number(watch('total_invoice_amount')) || 0
                            const taxPercentage = Number(watch('taxPercentage')) || 0
                            const taxAmount = Number(value) || 0

                            // allow zero tax
                            if (taxAmount === 0) return true

                            if (isNaN(taxAmount) || isNaN(invoiceAmount) || isNaN(taxPercentage)) {
                              return 'Invalid tax calculation'
                            }

                            const calculatedMaxTax = (invoiceAmount * taxPercentage) / 100

                            return taxAmount <= calculatedMaxTax
                              ? true
                              : `Tax amount should not exceed ${taxPercentage}% of invoice amount (${calculatedMaxTax.toFixed(
                                  2
                                )})`
                          }
                        }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <div style={{ paddingRight: '20px' }}>
                            <InputBox
                              placeholder={t('enterTaxAmount')}
                              className={`inputBox mb-0 formInput`}
                              name="tax_amount"
                              type="text"
                              error={error}
                              value={value || ''}
                              onChange={onChange}
                              onKeyDown={(e) => {
                                if (['-', '+', 'e', 'E'].includes(e.key)) {
                                  e.preventDefault()
                                }
                                if (
                                  e.target.value &&
                                  e.target.value.length >= 18 &&
                                  e.key !== 'Backspace' &&
                                  e.key !== 'Delete' &&
                                  e.key !== 'ArrowLeft' &&
                                  e.key !== 'ArrowRight'
                                ) {
                                  e.preventDefault()
                                }
                              }}
                              onInput={(e) => {
                                if (e.target.value.length > 18) {
                                  e.target.value = e.target.value.slice(0, 18)
                                }
                              }}
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('paymentTerms.text')}
                        <span className="required">*</span>
                      </label>
                    </div>
                    <div style={{ paddingRight: '20px' }}>
                      <InputBox
                        className={`inputBox mb-0 formInput`}
                        name="paymentTerms"
                        type="text"
                        value={getValues('paymentTerms')}
                        register={register}
                        disabled={true}
                        inputStyle={{
                          direction: isArabic ? 'ltr' : '',
                          textAlign: isArabic ? 'end' : ''
                        }}
                      />
                    </div>
                  </div>

                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('remarks.text')}
                        <span className="required">*</span>
                        <AppTooltip message={t('remarks.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: '20px' }}>
                      <Controller
                        name="remarks"
                        control={control}
                        rules={{
                          required: t('remarks.error'),
                          validate: (value) => remarksValidator(t('remarks.text'), value)
                        }}
                        defaultValue=""
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <InputBox
                            placeholder={t('writeRemarks')}
                            className={`inputBox mb-0 formInput`}
                            name="remarks"
                            type="text"
                            register={register}
                            error={error}
                            value={value || ''}
                            maxLength={365}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles.attachmentContainer}`}>
              <div className="d-flex align-items-center">
                <div className="w-[50%]">
                  <div className="d-flex align-items-center">
                    <div className="labelWidth">
                      <label className={styles.inputLabel}>
                        {t('attachmentType.text')} <span className="required">*</span>
                        <AppTooltip message={t('attachmentType.tooltip')} />
                      </label>
                    </div>
                    <Controller
                      name="attachmentType"
                      control={control}
                      rules={{
                        required:
                          uploadedFiles?.length === 0
                            ? t('advance_payment:attachmentTypeRequired')
                            : ''
                      }}
                      render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <div className="select-container">
                          <SelectBox
                            className={`formInput custom-select-box mb-0`}
                            error={error}
                            value={value || ''}
                            onChange={(event) => {
                              const selectedValue = event.target.value

                              if (!selectedValue) return
                              setCurrentAttachment((prev) => ({
                                ...prev,
                                type: selectedValue
                              }))

                              onChange(selectedValue)
                            }}
                            options={translatedOptions}
                            height="34px"
                            placeholder={t('general_details_comp:select')}
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div className="w-[50%]">
                  <div className="d-flex pl-4 justify-content-between">
                    <div>
                      <div className="d-flex align-items-center gap-4">
                        <div className="d-flex">
                          <label className={styles.inputLabel}>
                            {t('fileUpload.text')} <span className="required">*</span>
                            <AppTooltip message={t('non_po_based_invoices:fileUpload.tooltip2')} />
                          </label>
                        </div>
                        <div>
                          <Controller
                            name="attachments"
                            control={control}
                            rules={{
                              required:
                                uploadedFiles?.length === 0
                                  ? t('advance_payment:fileUploadRequired')
                                  : ''
                            }}
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <>
                                <FileUploadInput
                                  name="attachments"
                                  files={value}
                                  multiple={true}
                                  onChange={(event) => {
                                    const selectedFile = Array.from(event.target.files || [])
                                    if (!selectedFile) return

                                    if (selectedFile.length > 2) {
                                      setError('attachments', {
                                        type: 'manual',
                                        message: t('toast:onlyTwoFilesAllowed')
                                      })
                                      return
                                    }
                                    const isDuplicate = selectedFile.some((file) =>
                                      uploadedFiles.some(
                                        (uploaded) =>
                                          uploaded.document_name === file.name &&
                                          uploaded.attachment_type === currentAttachment?.type
                                      )
                                    )

                                    if (isDuplicate) {
                                      event.target.value = null
                                      toast.error(t('toast:duplicateFileExists'))
                                      return
                                    }
                                    const currentAttachmentType = getValues('attachmentType')
                                    if (currentAttachmentType === 'invoice') {
                                      const nonPdfFiles = selectedFile.filter(
                                        (f) => f.type !== 'application/pdf'
                                      )

                                      if (nonPdfFiles.length > 0) {
                                        toast.error(
                                          'Only PDF files are allowed for Invoice attachments'
                                        )
                                        event.target.value = null
                                        return
                                      }
                                    }
                                    clearErrors('attachments')
                                    setCurrentAttachment((prev) => ({
                                      ...prev,
                                      file: selectedFile
                                    }))
                                    onChange(selectedFile)
                                    event.target.value = null
                                  }}
                                  className={'formInput'}
                                />
                                {error && (
                                  <p style={{ fontSize: '11px', color: '#d50000' }}>
                                    {error.message}
                                  </p>
                                )}
                              </>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <NormalButton
                        isPrimary
                        label={t('po_based_invoices:upload')}
                        leftIcon={uploadAddIcon}
                        customClass="px-3 uploadBtnBorder uploadBtnStyle"
                        onClick={handleFileUpload}
                        type="button"
                        isLoading={btnLoader}
                        disabled={btnLoader}
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
                    <div className={`${styles.colSn} ${styles.headerText}`}>
                      <label className="fw-semibold">{t('advance_payment:SNo')}</label>
                    </div>
                    <div className={`${styles.colType} ${styles.headerText}`}>
                      <label className="fw-semibold">{t('advance_payment:AttachmentType')}</label>
                    </div>
                    <div className={`${styles.colName} ${styles.headerText}`}>
                      <label className="fw-semibold">{t('advance_payment:DocumentName')}</label>
                    </div>
                    <div className={`${styles.colAction} ${styles.headerText}`}>
                      <label className="fw-semibold">{t('advance_payment:action')}</label>
                    </div>
                  </div>
                </>
              )}
              {/* Uploaded file rows */}
              {uploadedFiles?.map((file, index) => (
                <div
                  key={file.id || index}
                  className={`d-flex ${styles.attachmentRow} text-start `}>
                  <div className={`${styles.colSn} ${styles.fileText}`}>
                    <label>{index + 1}</label>
                  </div>
                  <div className={`${styles.colType} ${styles.fileText}`}>
                    <label>
                      {translatedOptions.find((opt) => opt.value === file.attachment_type)?.label ||
                        file.attachment_type}
                    </label>
                  </div>
                  <div className={`${styles.colName} ${styles.fileText} ${styles.docLink}`}>
                    <label style={{ direction: isArabic ? 'ltr' : '' }}>
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none cursor-pointer">
                        {file.document_name}
                      </a>
                    </label>
                  </div>
                  <div className={`${styles.colAction}`}>
                    <img
                      src={deleteIcon}
                      alt="delete"
                      className="btn btn-link text-danger p-0"
                      // onClick={() => handleRemoveFile(file.id)}
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
            <InvoicePreviewNonPO
              open={nextClick}
              setNextClick={setNextClick}
              handleSave={handleSave}
              handleSubmit={handleSubmitInvoice}
              saved={saved}
              formData={{
                ...getValues(),
                invoice_date: selectedDate?.format('YYYY-MM-DD HH:mm:ss'),
                contact_name: crPersonsOptions.find(
                  (opt) => opt.value === Number(getValues('businessContact'))
                )?.label,
                nature_of_expenses: natureExpensesOptions.find(
                  (opt) => opt.value === getValues('natureOfExpenses')
                )?.label,
                vendorCode: vendorCodeOptions.find(
                  (opt) => opt.value === Number(getValues('vendorCode'))
                )?.label
              }}
              uploadedFiles={uploadedFiles}
            />
          )}

          {showSuccessPopup && (
            <SuccessPopup
              open={showSuccessPopup}
              onClose={handleCloseSuccessPopup}
              successMsg={successMessage}
            />
          )}
        </>
      )}
      <CustomModal
        open={isModalOpen}
        modalStyles={{ width: 400 }}
        header={t('popup:confirmSubmission')}
        description={t('po_based_invoices:deleteConfirmation')}
        onClose={() => setIsModalOpen(false)}
        closeIcon>
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
    </LeftPageContainer>
  )
}

const mapDispatchToProps = { showToast }
const mapStateToProps = (state) => ({
  setDashboardData,
  userInfo: state.userInfo
})

export default connect(mapStateToProps, mapDispatchToProps)(AddEditNonPOBasedComp)
