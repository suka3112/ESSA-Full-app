import React, { Suspense, useEffect, useState } from 'react'
import helpIcon from '../../../../../assets/icons/helpIcon.svg'
import styles from './AddEditCreditNote.module.scss'
import 'assets/scss/createInvoice.scss'
import { NormalButton } from 'components/Common/NormalButton'
import { InputBox } from 'components/Common/InputBox'
import { Controller, useForm } from 'react-hook-form'
import { SelectBox } from 'components/Common/SelectBox'
import nextIcon from '../../../../../assets/icons/nextIconWhite.svg'
import saveIcon from '../../../../../assets/icons/saveIconWhite.svg'
import FileUploadInput from 'components/Common/FileUploadInput'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import SuccessPopup from 'components/Common/SuccessPopup'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { useTranslation } from 'react-i18next'
import { FAQS, INVOICE_PO_BASED_VIEW } from 'constants/url'
import {
  createCreditNote,
  updateCreditNote,
  getCreditNoteById,
  getInvoiceDropdowns,
  listCreditNotes
} from 'api/CreditNote'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import { connect, useSelector } from 'react-redux'
import InvoicePreviewCreditNote from '../InvoicePreview'
import AppTooltip from 'components/Common/AppTooltip'
import { getEntityId, getVendorId } from 'services/utilities'
import { deleteFiles, fileUpload } from 'api/FileUpload'
import { fetchCurrencies, fetchVendorNameOrCode } from 'api/UserRegister'
import { invoiceDetailsById, poNonPOInvoiceDropdown } from 'api/POBased'
import MultiSelectDropdown from 'components/Common/SelectBox/MultiSelectDropdown'
import { showToast } from '../../../../../redux/actions/toastActions'
import { deleteIcon, uploadAddIcon } from 'constants/imageConstants'
import useTableFeatures from 'hooks/useTableFeatures'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { Validator } from 'services/validation/formValidations'
import { getInvoiceSOA } from 'api/SOA'
import { PageLoader } from 'components/Common/PageLoader'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import { setDashboardData } from 'redux/actions/dashboardAction'
import CustomModal from 'components/Common/Modal'
import SVGIcon from 'components/Common/SVGIcon'

const AddEditCreditNoteComp = ({ setDashboardData, userInfo: { userType }, showToast }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset,
    setValue,
    watch,
    getValues,
    setError,
    clearErrors
  } = useForm({
    defaultValues: {
      creditNoteReference: '',
      invoiceType: '',
      submissionDate: dayjs().format('YYYY-MM-DD'),
      currency: '',
      creditNoteAmount: '',
      attachment_type: '',
      remarks: '',
      file: null
    }
  })
  const {
    page,
    rowsPerPage,
    search,
    order,
    orderBy,
    setPageMeta,
    setLoader,
    handleSearchValue,
    tableProps
  } = useTableFeatures()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation([
    'credit_notes',
    'po_based_invoices',
    'logistics_invoice',
    'non_po_based_invoices',
    'advance_payment',
    'toast',
    'purchase_order',
    'popup',
    'otp'
  ])
  const isArabic = i18n.language === 'ar'
  // const { editMode } = useParams()
  const location = useLocation()
  const userData = location?.state?.userData
  const searchParams = new URLSearchParams(location.search)
  const soaId = searchParams.get('soa')
  const editMode = location?.state?.editMode
  // Edit mode state management
  const [vendorCodeOptions, setVendorCodeOptions] = useState([])
  const [creditNoteId, setCreditNoteId] = useState(null)
  const [nextClick, setNextClick] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [btnLoader, setBtnLoader] = useState(false)
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [shouldNavigate, setShouldNavigate] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [successMsg, setSuccessMsg] = useState('')
  const [selectedDate, setSelectedDate] = useState(dayjs().format('DD/MM/YYYY'))
  const [isInvoiceTypeTouched, setIsInvoiceTypeTouched] = useState(false)
  const [currentAttachment, setCurrentAttachment] = useState({ type: '', file: null })
  const [totalAmount, setTotalAmount] = useState(0)
  const [soaData, setSOAData] = useState()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)

  // Table related states
  const [tableData, setTableData] = useState([])
  const [poData, setPOData] = useState([])

  const alphaNumericValidator = new Validator()
    .validateNotEmptySpace()
    .validateMinLength(3)
    .validateMaxLength(16)
    .build()

  const selectedInvoiceType = getValues('invoiceType')
  const selectedPoBasedInvoice = getValues('poBasedInvoice')
  const selectedNonPoBasedInvoice = getValues('nonPoBasedInvoice')
  const uploadVendorCode = useSelector(
    (state) => state?.dashboard?.dashboardData?.profile?.Vendor_SAP_Code
  )
  useEffect(() => {
    fetchDropdownData()
    setLoader(true)
  }, [])

  useEffect(() => {
    getCreditNoteDetailsTable()
  }, [page, rowsPerPage, order, orderBy])

  useEffect(() => {
    if (userData && editMode) {
      setCreditNoteId(userData?.ID)
      setValue('creditNoteReference', userData?.InvNo)
      setValue('creditNoteAmount', userData?.InvAmt)
      setValue('submissionDate', dayjs().format('YYYY-MM-DD'))
      setValue('invoiceType', userData?.Inv_Type)
      setValue('currency', userData?.InvCurr)
      setIsInvoiceTypeTouched(true)
      if (userData?.Inv_Type === 'po') {
        fetchPONonPODropdown(1)
      } else {
        fetchPONonPODropdown(2)
      }
      const invArray = userData?.Inv_id_List.replace(/[\[\]\s]/g, '') // Remove brackets and whitespace
        .split(',') // Split into array
        .map((item) => item.trim()) // Trim whitespace
        .map((item) => item.toString()) // Ensure all items are strings
      if (userData?.Inv_Type === 'po') {
        setValue('poBasedInvoice', invArray)
      } else {
        setValue('nonPoBasedInvoice', invArray)
      }
      if (userData?.upload_files) {
        const files = userData.upload_files.map((file, index) => ({
          id: file.ID || index + 1,
          attachment_type: file.Attachment_type,
          document_name: file.Upload_files.split('/').pop() || `Document ${index + 1}`,
          file_url: file.Upload_files,
          file_type: file.Attachment_type
        }))
        setUploadedFiles(files)
      }
    }
  }, [userData, setValue, editMode])

  useEffect(() => {
    if (userType !== VENDOR_USER_TYPE) {
      fetchVendorData()
    }
  }, [userType])

  const fetchVendorData = () => {
    let query = {
      entity_id: getEntityId()
    }
    Promise.all([fetchVendorNameOrCode(query)])
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
  useEffect(() => {
    if (selectedInvoiceType) {
      getCreditNoteDetailsTable()
    }
  }, [watch('poBasedInvoice'), watch('nonPoBasedInvoice')])

  const fetchInvoiceFromSOA = async () => {
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
      setLoader(false)
    }
  }

  useEffect(() => {
    if (soaId) {
      fetchInvoiceFromSOA()
    }
  }, [])

  useEffect(() => {
    if (soaData) {
      setValue('creditNoteReference', soaData?.Reference)
      setValue('currency', soaData?.Curr)
      setValue('creditNoteAmount', soaData?.Amount)
    }
  }, [soaData])

  const fetchDropdownData = () => {
    Promise.all([fetchCurrencies()])
      .then(([currenciesRes]) => {
        const currencyList = Array.isArray(currenciesRes.data.data) ? currenciesRes.data.data : []
        const formattedCurrencies = [
          // { label: 'All', value: 'All' },
          ...currencyList
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name
            .map((item) => ({
              label: `${item?.name} (${item?.code})`,
              value: item.code
            }))
        ]

        setCurrencyOptions(formattedCurrencies)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }

  const fetchPONonPODropdown = (categoryId = 2) => {
    const query = {
      category: categoryId,
      vendor_id: getVendorId() || watch('vendor_code')
    }
    poNonPOInvoiceDropdown(query).then((res) => {
      const result = res?.data?.data?.map((x) => ({
        label: x?.InvNo,
        value: x?.ID
      }))
      setPOData(result)
    })
  }

  const getCreditNoteDetailsTable = () => {
    setLoader(true)
    const body = {
      InvNo: selectedInvoiceType === 'po' ? selectedPoBasedInvoice : selectedNonPoBasedInvoice,
      category: selectedInvoiceType === 'po' ? 1 : 2,
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy
    }

    invoiceDetailsById(body)
      .then((res) => {
        setTableData(res?.data?.data?.result?.results || [])
        setPageMeta(res?.data?.data?.result?.pageMeta)
        setTotalAmount(res?.data?.data?.totalAmount || 0)
      })
      .catch((err) => {
        console.log('err', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  // Table headers
  const tableHeaders = [
    { key: 'credit_invoice_reference', label: t('invoiceNum'), sortable: true, sortKey: 'InvNo' },
    { key: 'invoice_date', label: t('logistics_invoice:date'), sortable: true, sortKey: 'InvDt' },
    { key: 'currency', label: t('currency.text'), sortable: true, sortKey: 'InvCurr' },
    {
      key: 'total_amount',
      label: t('logistics_invoice:amount'),
      sortable: true,
      sortKey: 'InvAmt'
    },
    { key: 'status', label: t('status.text'), sortable: true, sortKey: 'Invoice_Status_Id' }
  ]

  // Handle form submission
  const onSubmit = async (data, options = {}) => {
    try {
      setLoading(true)
      const query = {
        entity_id: getEntityId()
      }
      const body = {
        // Inv_id_List: data.invoice,
        Vendor_id: getVendorId() || data.vendor_code,
        CoCd: getEntityId(),
        InvDt: data.submissionDate ? dayjs(data.submissionDate).format('YYYY-MM-DD') : '',
        InvCurr: data.currency,
        Inv_Type: data.invoiceType,
        InvNo: data.creditNoteReference,
        Inv_id_List: `[${(data.invoiceType === 'po' ? data.poBasedInvoice : data.nonPoBasedInvoice).join(', ')}]`,
        Invoice_Status_Id: options.status,
        InvAmt: parseFloat(data.creditNoteAmount).toFixed(2),
        upload_files: []
      }

      body.upload_files = uploadedFiles.map(({ file_url, document_name, attachment_type }) => ({
        upload_files: file_url,
        attachment_type: attachment_type,
        document_name: document_name
      }))
      // If in edit mode, include ID and call update API
      let response
      if (editMode || creditNoteId) {
        body.ID = creditNoteId // or data.id, based on your context
        response = await updateCreditNote(body, query)
        //showToast('Success', t('updatedSuccessfully'), 'success');
        setSuccessMsg(t('updatedSuccessfully'))
        if (options.status === 101) {
          setShouldNavigate(false)
        } else if (options.status === 100) {
          setShouldNavigate(true)
        }
      } else {
        response = await createCreditNote(body, query)
        setCreditNoteId(response.data.data.ID)
        if (options.status === 100) {
          showToast('Success', t('createdSuccessfully'), 'success')
          setSuccessMsg(t('createdSuccessfully'))
          setShouldNavigate(true)
        } else if (options.status === 101) {
          //showToast('Success', t('savedSuccessfully'), 'success');
          setSuccessMsg(t('savedSuccessfully'))
          setSaved(true)
          // handleNext()
        }
      }
      // else if (options.status === 7) {
      //   response = await createCreditNote(body, query);
      //   setCreditNoteId(response.data.data.ID);
      //   showToast('Success', 'Credit note saved successfully', 'success');
      //   setSaved(true);
      //   setSuccessMsg('Credit note saved successfully');
      //   // handleNext()
      // }

      setShowSuccessPopup(true)

      // setShowSuccessPopup(true)
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          t(editMode ? 'failedToUpdateCreditNote' : 'failedToCreateCreditNote')
      )
    } finally {
      setLoading(false)
    }
  }

  // const handleRemoveFile = (id) => {
  //   const updated = uploadedFiles.filter((file) => file.id !== id);
  //   setUploadedFiles(updated);
  // };
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

    // Check if attachment type is credit note and validate PDF files only
    if (type === 'invoice' || type === t('credit_notes:credit_note')) {
      const filesArray = Array.isArray(file) ? file : [file]
      const nonPdfFiles = filesArray.filter((f) => f.type !== 'application/pdf')

      if (nonPdfFiles.length > 0) {
        toast.error(t('toast:onlyPDFFilesAllowedCreditNote'))
        return
      }
    }

    const filesArray = Array.isArray(file) ? file : [file]
    const typeCount = uploadedFiles.filter((f) => f.attachment_type === type).length
    if (typeCount + filesArray.length > 2) {
      toast.error(t('toast:onlyTwoFilesPerType', { type }))
      return
    }

    const vendorCode = uploadVendorCode
    const selectedVendorId = getValues('vendor_code')
    const selectedVendor = vendorCodeOptions.find((v) => v.value === selectedVendorId)
    const adminVendorCode = selectedVendor?.label || ''

    const vendorCodeUpload = userType === VENDOR_USER_TYPE ? vendorCode : adminVendorCode
    const module = 'CREDIT NOTE' // static value
    const attachmentType = type
    setBtnLoader(true)

    try {
      const uploaded = []
      for (let i = 0; i < filesArray.length; i++) {
        const fd = new FormData()
        fd.append('image', filesArray[i])
        fd.append('vendor_code', vendorCodeUpload)
        fd.append('module', module)
        fd.append('attachment_type', attachmentType)

        const res = await fileUpload(fd)
        const url = res.data?.data?.url

        uploaded.push({
          id: uploadedFiles.length + uploaded.length + 1,
          attachment_type: type,
          document_name: filesArray[i].name,
          file_url: url,
          file_type: type
        })
      }

      setBtnLoader(false)
      setUploadedFiles([...uploadedFiles, ...uploaded])
      setValue('attachments', '')
      setValue('attachment_type', '')
      setCurrentAttachment({ type: '', file: null })
      clearErrors('attachments')
    } catch (err) {
      console.error(err)
    }
  }

  const handleNext = handleSubmit((data) => {
    // Case: file selected but not uploaded
    if (data.attachments?.length && currentAttachment?.file && uploadedFiles.length === 0) {
      setError('attachments', {
        type: 'manual',
        message: t('pleaseUploadSelectedFile')
      })
      return
    }

    // Proceed
    setNextClick(true)
  })

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false)
    setSaved(true)

    if (shouldNavigate) {
      navigate(-1)
    } else {
      handleNext()
    }
  }

  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=4`) // your internal route
  }

  const attachmentTypeOptions = [
    { label: t('credit_notes:credit_note'), value: 'invoice' },
    { label: t('non_po_based_invoices:delivery_note'), value: 'delivery note' },
    { label: t('non_po_based_invoices:shipping_documents'), value: 'shipping documents' },
    { label: t('non_po_based_invoices:others'), value: 'others' }
  ]

  const handleSave = () => {
    handleSubmit((data) => onSubmit(data, { status: 101 }))()
  }

  const handleSubmitBtn = () => {
    handleSubmit((data) => onSubmit(data, { status: 100 }))()
  }

  const handleBack = () => {
    navigate(-1)
  }

  // Format table data
  const formattedTableData = tableData?.map((item) => ({
    ...item,
    invoice_date: item?.InvDt ? dayjs(item.InvDt).format('DD/MM/YYYY') : '',
    // total_amount: item.InvAmt ? parseFloat(item.InvAmt).toFixed(2) : "",
    total_amount:
      item?.InvAmt !== undefined && item?.InvAmt !== null && !isNaN(item.InvAmt)
        ? Number(item.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })
        : '0.00',
    status: item?.status?.Status_classification,
    currency: item?.InvCurr,
    credit_invoice_reference: item?.InvNo
  }))

  return (
    <LeftPageContainer>
      {loading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(255,255,255,0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
          <PageLoader /> {/* Use your existing loader component */}
        </div>
      )}
      {/* Header Section */}
      <div className={styles.poContainer}>
        <label className={styles.homeText}>
          {`
          ${t('home')} / ${t('invoiceProcessing')} / ${t('creditNoteText')} / ${editMode ? t('editCreditNoteText') : t('createCreditNoteText')}`}
          {editMode && creditNoteId && ` (ID: ${creditNoteId})`}
        </label>
        <div className={styles.subHeader}>
          <div>
            <SVGIcon size={25} className="cursor-pointer" name="backArrow" onClick={handleBack} />

            <h5>{editMode ? t('editCreditNoteText') : t('createNewCreditNote.text')}</h5>
            {editMode && saved && (
              <div className={`px-2 ${styles.savedPill}`}>{t('purchase_order:saved')}</div>
            )}
          </div>
          <div>
            <>
              <NormalButton
                label={t('logistics_invoice:next')}
                isPrimary
                customClass="px-1"
                rightIcon={nextIcon}
                onClick={handleNext}
                loading={loading}
                disabled={loading}
              />

              {!saved && (
                <NormalButton
                  label={t('logistics_invoice:save')}
                  isPrimary
                  customClass="px-3"
                  rightIcon={saveIcon}
                  onClick={handleSave}
                  type="button"
                  isLoading={loading}
                  disabled={loading}
                />
              )}
            </>
            <TooltipWrapper tooltipMessage={t('help')}>
              <div className={styles.faqIconContainer} onClick={handleRedirectClick}>
                <SVGIcon
                  name="help"
                  size={25}
                  className="cursor-pointer"
                  onClick={handleRedirectClick}
                  alt="help"
                />
              </div>
            </TooltipWrapper>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={`${styles.userInputContainer}`}>
          {/* Left Column */}
          <div style={{ borderInlineEnd: '1px solid #929398' }} className="col-6">
            {userType !== VENDOR_USER_TYPE && (
              <>
                <div className="formGroup">
                  <div className="labelWidth">
                    <label>
                      {t('po_based_invoices:POInvoiceVendorCode.text')}{' '}
                      <span className="required">*</span>{' '}
                      <AppTooltip message={t('po_based_invoices:POInvoiceVendorCode.tooltip')} />
                    </label>
                  </div>

                  <div style={{ paddingRight: '20px' }}>
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
                            const newVendorId = e.target.value
                            onChange(newVendorId)

                            // Clear invoice selections
                            setValue('poBasedInvoice', [])
                            setValue('nonPoBasedInvoice', [])

                            // Call dropdown API with new vendor_id
                            if (isInvoiceTypeTouched && watch('invoiceType') === 'non_po') {
                              fetchPONonPODropdown(2)
                            } else {
                              fetchPONonPODropdown(1)
                            }

                            const selectedVendor = vendorCodeOptions.find(
                              (v) => v.value == newVendorId
                            )
                            if (selectedVendor) {
                              setValue('vendor_name', selectedVendor.vendorName || '')
                            } else {
                              setValue('vendor_name', '')
                            }
                          }}
                          options={vendorCodeOptions}
                          placeholder={t('selectVendorCode')}
                          height="30px"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="formGroup">
                  <div className="labelWidth">
                    <label>
                      {t('po_based_invoices:POInvoiceVendorName.text')}{' '}
                      <span className="required">*</span>{' '}
                      <AppTooltip message={t('po_based_invoices:POInvoiceVendorName.tooltip')} />
                    </label>
                  </div>
                  <label style={{ width: isArabic ? '250px' : '270px' }}>
                    <p>{watch('vendor_name')}</p>
                  </label>
                </div>
              </>
            )}
            <div className="formGroup">
              <div className="labelWidth">
                <label>
                  {t('creditNoteReference.text')}
                  <span className="required">*</span>
                  <AppTooltip message={t('creditNoteReference.tooltip')} />
                </label>
              </div>
              <div style={{ paddingRight: '20px' }}>
                <InputBox
                  placeholder={t('enterCreditNoteRef')}
                  className={`inputBox mb-0 formInput`}
                  name="creditNoteReference"
                  type="text"
                  register={register}
                  error={errors.creditNoteReference}
                  rules={{
                    required: t('creditNoteReference.error'),
                    maxLength: {
                      value: 16,
                      message: t('toast:invoiceNoLessThan17Char')
                    },
                    validate: (value) =>
                      alphaNumericValidator(t('logistics_invoice:enterReferenceNo'), value)
                  }}
                />
              </div>
            </div>
            <div className="formGroup">
              <div className="labelWidth">
                <label>
                  {t('invoiceText')} <span className="required">*</span>
                  <AppTooltip message={t('selectInvoiceType')} />
                </label>
              </div>
              <div style={{ paddingRight: '20px' }}>
                <Controller
                  name="invoiceType"
                  control={control}
                  rules={{ required: t('invoiceSelection.error') }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <SelectBox
                      className={`formInput custom-select-box mb-0`}
                      value={value}
                      onChange={(selectedValue) => {
                        setIsInvoiceTypeTouched(true)
                        onChange(selectedValue)
                        if (selectedValue.target.value === 'non_po') {
                          fetchPONonPODropdown(2)
                        } else {
                          fetchPONonPODropdown(1)
                        }
                      }}
                      options={[
                        { label: t('poBasedInvoiceHeader.text'), value: 'po' },
                        { label: t('nonPoBasedInvoiceHeader.text'), value: 'non_po' }
                      ]}
                      name="invoiceType"
                      placeholder={t('invoiceText')}
                      disabled={
                        userType !== VENDOR_USER_TYPE && !watch('vendor_code') ? true : false
                      }
                      error={error}
                      height="30px"
                    />
                  )}
                />
              </div>
            </div>

            {isInvoiceTypeTouched && watch('invoiceType') === 'po' && (
              <div className="formGroup">
                <div className="labelWidth">
                  <label>
                    {t('poBasedInvoiceHeader.text')} <span className="required">*</span>
                    <AppTooltip message={t('selectInvoiceTooltip')} />
                  </label>
                </div>
                <div style={{ paddingRight: '20px' }}>
                  <Controller
                    name="poBasedInvoice"
                    control={control}
                    rules={{ required: 'Invoice selection is required' }}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <div>
                        <MultiSelectDropdown
                          className="custom-select-box formInput"
                          placeholder={t('advance_payment:select')}
                          options={poData}
                          selectedValues={value || []}
                          onChange={onChange}
                        />
                        {error && <p style={{ color: 'red', fontSize: '12px' }}>{error.message}</p>}
                      </div>
                    )}
                  />
                </div>
              </div>
            )}
            {isInvoiceTypeTouched && watch('invoiceType') === 'non_po' && (
              <div className="formGroup">
                <div className="labelWidth">
                  <label>
                    {t('nonPoBasedInvoiceHeader.text')} <span className="required">*</span>
                    <AppTooltip message={t('selectInvoiceTooltip')} />
                  </label>
                </div>
                <div style={{ paddingRight: '20px' }}>
                  <Controller
                    name="nonPoBasedInvoice"
                    control={control}
                    rules={{ required: 'Invoice selection is required' }}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <div className="select-container">
                        <MultiSelectDropdown
                          className="custom-select-box formInput"
                          placeholder={t('advance_payment:select')}
                          options={poData}
                          selectedValues={value || []}
                          onChange={onChange}
                        />
                        {error && <p style={{ color: 'red', fontSize: '12px' }}>{error.message}</p>}
                      </div>
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="col-6 pl-4" style={{ paddingRight: isArabic ? '20px' : '' }}>
            <div className="formGroup">
              <div className="labelWidth">
                <label>
                  {t('submissionDate.text')} <span className="required"></span>
                </label>
              </div>
              <p style={{ paddingRight: isArabic ? '15px' : '' }}>{selectedDate}</p>
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
                  rules={{ required: t('currency.error') }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <div className="select-container">
                      <SelectBox
                        className={`formInput custom-select-box mb-0`}
                        error={error}
                        value={value}
                        onChange={onChange}
                        options={currencyOptions}
                        name="currency"
                        placeholder={t('currency.placeholder')}
                        disabled={loading}
                        height="30px"
                      />
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="formGroup">
              <div className="labelWidth">
                <label>
                  {t('creditNoteAmount.text')} <span className="required">*</span>
                  <AppTooltip message={t('creditNoteAmount.tooltip')} />
                </label>
              </div>
              <div style={{ paddingRight: '20px' }}>
                <InputBox
                  placeholder={t('enterAmount')}
                  className={`formInput inputBox mb-0`}
                  name="creditNoteAmount"
                  type="number"
                  step="0.01"
                  register={register}
                  error={errors.creditNoteAmount}
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
                  rules={{
                    required: t('creditNoteAmount.error'),
                    validate: (value) => {
                      const num = Number(value)
                      if (isNaN(num) || num <= 0) {
                        return (
                          t('zeroError') || 'Total Amount of the credit note must be greater than 0'
                        )
                      }
                      return true
                    }
                    // min: { value: 0.01, message: 'Amount must be greater than 0' },
                    // validate: value =>
                    //   parseFloat(value) <= parseFloat(totalAmount)
                    //     ? true
                    //     : `Amount should not be more than total invoice amount (${parseFloat(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Attachment Section */}
        <div className={`${styles.attachmentContainer}`}>
          <div className="d-flex align-items-center">
            <div className="w-[50%]">
              {/* <div className="d-flex gap-10"> */}
              <div className="d-flex align-items-center">
                <div className="labelWidth">
                  <label className={styles.inputLabel}>
                    {t('attachmentType.text')} <span className="required">*</span>
                    <AppTooltip message={t('attachmentType.tooltip')} />
                  </label>
                </div>
                {/* </div> */}
                <Controller
                  name="attachment_type"
                  control={control}
                  rules={{
                    required:
                      uploadedFiles?.length === 0 ? t('advance_payment:attachmentTypeRequired') : ''
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

                          const selectedOption = attachmentTypeOptions.find(
                            (option) => option.value === selectedValue
                          )

                          setCurrentAttachment((prev) => ({
                            ...prev,
                            type: selectedOption?.label || selectedValue
                          }))

                          onChange(selectedValue)
                        }}
                        options={attachmentTypeOptions}
                        placeholder={t('advance_payment:select')}
                        height="34px"
                      />
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="w-[50%]">
              <div className="d-flex pl-4">
                <div>
                  <div className="d-flex align-items-center gap-4">
                    <div className="d-flex">
                      <label className={styles.inputLabel}>
                        {t('non_po_based_invoices:fileUpload.text')}{' '}
                        <span className="required">*</span>
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
                              //error={error}
                              files={value}
                              multiple={true}
                              onChange={(event) => {
                                //const selectedFile = event.target.files?.[0];
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
                                const currentAttachmentType = getValues('attachment_type')
                                if (currentAttachmentType === 'invoice') {
                                  const nonPdfFiles = selectedFile.filter(
                                    (f) => f.type !== 'application/pdf'
                                  )

                                  if (nonPdfFiles.length > 0) {
                                    toast.error(
                                      'Only PDF files are allowed for Credit Note attachments'
                                    )
                                    // setError('attachments', {
                                    //   type: 'manual',
                                    //   message: 'Only PDF files are allowed for Credit Note attachments'
                                    // })
                                    event.target.value = null

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
                              <p style={{ fontSize: '11px', color: '#d50000' }}>{error.message}</p>
                            )}
                          </>
                        )}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ paddingRight: isArabic ? '20px' : '' }}>
                  <NormalButton
                    isPrimary
                    label={t('upload')}
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
              <div className={`d-flex align-items-start ${styles.attachmentRow} text-start`}>
                <p className={`${styles.colSn} ${styles.headerText}`}>{t('srNo')}</p>
                <p className={`${styles.colType} ${styles.headerText}`}>
                  {t('po_based_invoices:attachment_type.text')}
                </p>
                <p className={`${styles.colName} ${styles.headerText}`}>
                  {t('po_based_invoices:documentName')}
                </p>
                <p className={`${styles.colAction} ${styles.headerText}`}>
                  {t('advance_payment:action')}
                </p>
              </div>
            </>
          )}

          {/* Uploaded file rows */}
          {uploadedFiles?.map((file, index) => (
            <div key={file.id || index} className={`d-flex ${styles.attachmentRow} text-start`}>
              <div className={`${styles.colSn} ${styles.fileText}`}>{index + 1}</div>
              <div className={`${styles.colType} ${styles.fileText}`}>{file.attachment_type}</div>
              <div className={`${styles.colName} ${styles.fileText} ${styles.docLink}`}>
                {' '}
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.docLink}
                  style={{ cursor: 'pointer', textDecoration: 'none' }}>
                  {file.document_name}
                </a>
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

      {/* Table Section */}
      <div
        className={`bg-white table-border overflow-hidden rounded-lg mt-4 overflow-hidden ${styles.tableContainer}`}>
        <TableLayout tableHeaders={tableHeaders} tableData={formattedTableData} {...tableProps} />
      </div>

      {/* Preview and Success Popups */}
      {nextClick && (
        <Suspense>
          <InvoicePreviewCreditNote
            open={nextClick}
            setNextClick={setNextClick}
            handleSave={handleSave}
            tableProps={tableProps}
            tableHeaders={tableHeaders}
            tableData={formattedTableData}
            handleSubmit={handleSubmitBtn}
            saved={saved}
            formData={{
              ...getValues(),
              status: 'Draft'
            }}
            uploadedFiles={uploadedFiles}
          />
        </Suspense>
      )}

      {showSuccessPopup && (
        <Suspense>
          <SuccessPopup
            open={showSuccessPopup}
            onClose={handleCloseSuccessPopup}
            successMsg={successMsg}
            modalStyles={{ maxWidth: 450 }}
          />
        </Suspense>
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
const mapStateToProps = (state) => ({
  setDashboardData,
  userInfo: state.userInfo // Getting userInfo from Redux store
})

// Map actions to props
const mapDispatchToProps = { showToast }

export default connect(mapStateToProps, mapDispatchToProps)(AddEditCreditNoteComp)
