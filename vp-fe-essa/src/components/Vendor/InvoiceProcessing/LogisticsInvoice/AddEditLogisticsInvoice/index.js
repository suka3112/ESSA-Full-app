import React, { useEffect, useState } from 'react'
import styles from './AddEditLogisticsInvoice.module.scss'
import { NormalButton } from 'components/Common/NormalButton'
import { Controller, useForm } from 'react-hook-form'
import { SelectBox } from 'components/Common/SelectBox'
import nextIcon from '../../../../../assets/icons/nextIconWhite.svg'
import saveIcon from '../../../../../assets/icons/saveIconWhite.svg'
import FileUploadInput from 'components/Common/FileUploadInput'
import { InvoicePreviewLogistics } from '../InvoicePreview'
import SuccessPopup from 'components/Common/SuccessPopup'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { useTranslation } from 'react-i18next'
import {
  createLogisticInvoice,
  getLogisticInvoiceById,
  updateLogisticInvoice
} from '../../../../../api/LogisticInvoice'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { FAQS, LOGISTICS_INVOICE } from 'constants/url'
import { connect, useSelector } from 'react-redux'
import { Tooltip } from 'components/Common'
import AppTooltip from 'components/Common/AppTooltip'
import { getCRPersons } from 'api/MyProfile'
import { deleteFiles, fileUpload } from 'api/FileUpload'
import { showToast } from '../../../../../redux/actions/toastActions'
import { getEntityId } from 'services/utilities'
import { PageLoader } from 'components/Common/PageLoader'
import { InputBox } from 'components/Common/InputBox'
import DateRangePicker from 'components/Common/DateRangePicker1'
import { fetchCurrencies, fetchVendorNameOrCode } from 'api/UserRegister'
import moment from 'moment'
import { Validator } from 'services/validation/formValidations'
import { deleteIcon } from 'constants/imageConstants'
import { toast } from 'react-toastify'
import { ADMIN_USER_TYPE, VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import DownloadLink from 'components/Common/DownloadLink'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import 'assets/scss/createInvoice.scss'
import { setDashboardData } from 'redux/actions/dashboardAction'
import CustomModal from 'components/Common/Modal'
import SVGIcon from 'components/Common/SVGIcon'

const AddEditLogisticsInvoiceComp = ({ setDashboardData, userInfo: { userType }, showToast }) => {
  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError,
    watch,
    clearErrors
  } = useForm({
    defaultValues: {
      cost_responsible: '',
      vendorCode: '',
      currency: '',
      invoiceValue: '',
      invoiceDate: null,
      invoiceNo: '',
      remarks: '',
      paymentStatus: '',
      costResponsible: '',
      vendorName: '',
      dueDate: '',
      uploadedXls: '',
      attachments: [],
      invoiceFile: []
    }
  })

  const navigate = useNavigate()

  const { t, i18n } = useTranslation([
    'logistics_invoice',
    'po_based_invoices',
    'popup',
    'purchase_order',
    'sidebar',
    'advance_payment',
    'toast',
    'soa',
    'otp'
  ])
  const isArabic = i18n.language === 'ar'
  const { editModeId } = useParams()
  const [costResponsible, setCostResponsible] = useState('')
  const [nextClick, setNextClick] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [crPersonsOptions, setCrPersonsOptions] = useState([])
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [invoiceData, setInvoiceData] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [newInvoiceFiles, setNewInvoiceFiles] = useState([])
  const [vendorCodeOptions, setVendorCodeOptions] = useState([])
  const uploadVendorCode = useSelector(
    (state) => state?.dashboard?.dashboardData?.profile?.Vendor_SAP_Code
  )
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)

  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const invoiceId = searchParams.get('id')
  const isEdit = searchParams.get('edit') === 'true'

  useEffect(() => {
    fetchDropdownData()
  }, [])

  useEffect(() => {
    fetchDropdownData()
  }, [])

  useEffect(() => {
    if (isEdit) fetchInvoiceById()
  }, [isEdit])

  useEffect(() => {
    if (invoiceData && Object.keys(invoiceData).length > 0) {
      const fileNames = invoiceData?.Logistics_XLS || ''

      const formData = {
        invoiceNo: invoiceData.InvNo || '',
        remarks: invoiceData?.Remarks || '',
        dueDate: invoiceData?.Invoice_Due_Date
          ? moment(invoiceData?.Invoice_Due_Date)?.format('DD/MM/YYYY')
          : '',
        paymentStatus: invoiceData?.Payment_Status || '',
        costResponsible: invoiceData?.cr_person_data?.Employee_Name || '',
        invoiceValue:
          invoiceData?.InvAmt !== undefined && invoiceData?.InvAmt !== null
            ? String(invoiceData?.InvAmt)
            : '',
        invoiceDate: dayjs(invoiceData?.InvDt),
        uploadedXls: fileNames,
        vendorName: invoiceData.vendorDetails?.Vendor_Name_EN || '',
        cost_responsible: invoiceData?.cr_person_data?.ID || '',
        vendorCode: invoiceData?.vendorDetails?.ID || ''
      }

      reset(formData)
    }
  }, [invoiceData, reset, getValues])

  useEffect(() => {
    if (invoiceData?.upload_files?.length > 0) {
      const uploadedFiles = invoiceData.upload_files.map((file) => {
        const documentName = file.Upload_files.split('/').pop()
        return {
          attachment_type: 'Invoice File',
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

  useEffect(() => {
    if (isEdit && invoiceData?.InvCurr && currencyOptions?.length > 0) {
      const currency = currencyOptions?.find((opt) => opt.value === invoiceData?.InvCurr)
      if (currency) {
        setValue('currency', currency.value)
      }
    }
  }, [currencyOptions, invoiceData, setValue])

  const fetchDropdownData = async () => {
    setIsLoading(true)
    try {
      const query = { entity_id: getEntityId() }

      const [crPersonsRes, currenciesRes, vendorCodeRes] = await Promise.all([
        getCRPersons(query),
        fetchCurrencies(),
        fetchVendorNameOrCode(query)
      ])

      const crPersonsOptions = [
        ...(crPersonsRes?.data?.data?.map((person) => ({
          label: person.Name,
          value: person.Employee_Id,
          ID: person.ID
        })) || [])
      ]

      const currencyOptions = [
        ...(currenciesRes?.data?.data?.map((item) => ({
          label: item.name,
          value: item.code
        })) || [])
      ]
      const vendorCodeOptions = vendorCodeRes?.data?.data?.map((item) => ({
        label: item?.Vendor_SAP_Code,
        value: item?.ID,
        vendorName: item?.Vendor_Name_EN
      }))

      setCrPersonsOptions(crPersonsOptions)
      setCurrencyOptions(currencyOptions)
      setVendorCodeOptions(vendorCodeOptions)
    } catch (err) {
      console.error('Error fetching dropdown data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInvoiceById = () => {
    getLogisticInvoiceById({ id: invoiceId })
      .then((res) => {
        setInvoiceData(res?.data?.data)
      })
      .catch(console.error)
  }

  const handleNext = handleSubmit((data) => {
    if (data) {
      setNextClick(true)
    }
  })

  const handleSave = () => {
    setNextClick(false)
    handleSubmit((data) => onSubmit(data, 'draft'))()
  }

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false)
    setNextClick(true)
  }

  const handleSubmitInvoice = () => {
    handleSubmit((data) => onSubmit(data, 'submitted'))()
    setNextClick(false)
  }

  const onSubmit = async (data, status = 'draft') => {
    setIsLoading(true)
    const isEditMode = !!invoiceId
    const isAdmin = userType === ADMIN_USER_TYPE

    try {
      const attachmentFile = data?.attachments?.[0]

      let invoiceFilesToProcess = []

      if (isEdit) {
        invoiceFilesToProcess = newInvoiceFiles || []
      } else {
        const formFiles = data?.invoiceFile || []
        invoiceFilesToProcess = formFiles.map((file, index) => ({
          id: `create_${Date.now()}_${index}`,
          document_name: file.name,
          file: file,
          attachment_type: 'Invoice File',
          isNew: true
        }))
      }

      const uploadPromises = []

      const vendorCode = uploadVendorCode
      const selectedVendorId = getValues('vendorCode')
      const selectedVendor = vendorCodeOptions.find((v) => v.value === selectedVendorId)
      const adminVendorCode = selectedVendor?.label || ''

      const vendorCodeUpload = userType === VENDOR_USER_TYPE ? vendorCode : adminVendorCode
      const module = 'LOGISTICS INVOICE'

      // Handle attachment file upload
      let attachmentUrl = null
      if (attachmentFile && attachmentFile instanceof File) {
        const fd1 = new FormData()
        fd1.append('image', attachmentFile)
        fd1.append('vendor_code', vendorCodeUpload)
        fd1.append('module', module)

        uploadPromises.push(
          fileUpload(fd1).then((res) => {
            attachmentUrl = res?.data?.data?.url
            return { key: 'attachment', file: attachmentFile, success: true }
          })
        )
      }

      const invoiceFileUrls = []

      // Add existing uploaded files URLs (from edit mode only)
      if (isEdit && uploadedFiles?.length > 0) {
        uploadedFiles.forEach((file) => {
          invoiceFileUrls.push(file.file_url)
        })
      }

      // Upload invoice files (both create and edit mode)
      for (let fileObj of invoiceFilesToProcess) {
        if (fileObj.file instanceof File) {
          const fd2 = new FormData()
          fd2.append('image', fileObj.file)
          fd2.append('vendor_code', vendorCodeUpload)
          fd2.append('module', module)
          uploadPromises.push(
            fileUpload(fd2).then((res) => {
              invoiceFileUrls.push(res.data?.data?.url)
              return { key: 'invoice_files', url: res.data?.data?.url, success: true }
            })
          )
        }
      }

      const results = await Promise.all(uploadPromises)

      const allSuccess = results.every((result) => result.success)
      if (!allSuccess) {
        console.error('Some uploads failed:', results)
        toast.error(t('toast:uploadFailed'))
        return
      }
      const selectedCRPerson = crPersonsOptions.find(
        (person) => String(person.value) === String(data.cost_responsible)
      )
      const notificationId = selectedCRPerson?.ID

      const body = new FormData()
      body.append('cost_responsible', String(data?.cost_responsible || ''))
      body.append('notificationId', String(notificationId || ''))
      body.append('CoCd', getEntityId())
      body.append('Invoice_Status_Id', status === 'draft' ? 101 : 100)
      if (isAdmin) {
        body.append('Vendor_id', String(data?.vendorCode || ''))
        body.append('vendor_name', String(data?.vendorName || ''))
      }

      if (!data?.cost_responsible || data?.cost_responsible === '') {
        console.error('cost_responsible is missing or empty:', data?.cost_responsible)
        toast.error(t('costResponsibleRequired'))
        return
      }
      if (isAdmin && (!data?.vendorCode || data?.vendorCode === '')) {
        console.error('vendorCode is missing for admin user:', data?.vendorCode)
        toast.error(t('po_based_invoices:POInvoiceVendorCode.error'))
        return
      }

      if (isEditMode) {
        const formattedDate = data?.invoiceDate
          ? dayjs.isDayjs(data?.invoiceDate)
            ? data?.invoiceDate.format('YYYY-MM-DD HH:mm:ss')
            : moment(data?.invoiceDate).format('YYYY-MM-DD HH:mm:ss')
          : moment().format('YYYY-MM-DD HH:mm:ss')
        body.append('ID', invoiceId ?? '')
        body.append('InvDt', formattedDate)
        body.append('InvCurr', String(data?.currency || ''))
        body.append('InvAmt', String(data?.invoiceValue || ''))
      }

      if (!isEditMode && attachmentUrl) {
        body.append('file', attachmentFile)
      }
      if (attachmentUrl) {
        body.append('excel_file', attachmentUrl)
      }

      if (invoiceFileUrls.length > 0) {
        body.append('invoice_files', JSON.stringify(invoiceFileUrls))
      }

      if (status === 'draft') {
        if (isEditMode) {
          await updateLogisticInvoice(body)
        } else {
          const res = await createLogisticInvoice(body)

          const newInvoiceId = res?.data?.data[0]?.ID
          if (newInvoiceId) {
            navigate(`${location.pathname}?id=${newInvoiceId}`, { replace: true })
          }
        }

        setShowSuccessPopup(true)
        setSuccessMessage(t('popup:invoiceSavedSuccessfully'))
        setSaved(true)

        // Clear new files after successful save
        if (isEdit) {
          setNewInvoiceFiles([])
        }
      }

      if (status === 'submitted') {
        setShowSuccessPopup(false)

        if (isEditMode) {
          await updateLogisticInvoice(body)
        } else {
          const res = await createLogisticInvoice(body)
          const newInvoiceId = res?.data?.data?.ID
          if (newInvoiceId) {
            navigate(`${location.pathname}?id=${newInvoiceId}`, { replace: true })
          }
        }

        showToast(t('toast:successTitle'), t('popup:invoiceSubmittedSuccessfully'), 'success')
        navigate(`/${userType}${LOGISTICS_INVOICE}`)
      }
    } catch (err) {
      console.error('Error submitting invoice:', err)
      toast.error(err?.response?.data?.message || err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFile = async () => {
    try {
      const { id, isNew, file_url } = fileToDelete || {}

      if (isNew) {
        const updatedNewFiles = newInvoiceFiles.filter((file) => file.id !== id)
        setNewInvoiceFiles(updatedNewFiles)

        const currentFormFiles = getValues('invoiceFile') || []
        const fileToRemove = newInvoiceFiles.find((f) => f.id === id)
        if (fileToRemove) {
          const updatedFormFiles = currentFormFiles.filter((f) => f.name !== fileToRemove.file.name)
          setValue('invoiceFile', updatedFormFiles)
        }

        showToast?.(t('toast:successTitle'), t('toast:fileDeleted'), 'success')
      } else {
        if (id && typeof id === 'number') {
          await deleteFiles({ id, url: file_url })
        }

        const updated = uploadedFiles.filter((file) => file.id !== id)
        setUploadedFiles(updated)
        showToast?.(t('toast:successTitle'), t('toast:fileDeleted'), 'success')
      }

      const remainingExisting = uploadedFiles.filter((f) => f.id !== id).length
      const remainingNew = newInvoiceFiles.filter((f) => f.id !== id).length

      if (remainingExisting + remainingNew === 0) {
        setError('invoiceFile', {
          type: 'manual',
          message: t('fileUploadRequired')
        })
      } else {
        clearErrors('invoiceFile')
      }

      setIsModalOpen(false)
      setFileToDelete(null)
    } catch (error) {
      console.error('Error removing file:', error)
      toast.error(t('toast:fileDeleteFailed'))
    }
  }

  // const handleRemoveFile = async (id, isNew = false) => {
  //   try {
  //     if (isNew) {
  //       const updatedNewFiles = newInvoiceFiles.filter((file) => file.id !== id);
  //       setNewInvoiceFiles(updatedNewFiles);

  //       const currentFormFiles = getValues('invoiceFile') || [];
  //       const fileToRemove = newInvoiceFiles.find(f => f.id === id);
  //       if (fileToRemove) {
  //         const updatedFormFiles = currentFormFiles.filter(f => f.name !== fileToRemove.file.name);
  //         setValue('invoiceFile', updatedFormFiles);
  //       }

  //       showToast && showToast(t('toast:successTitle'), t('toast:fileDeleted'), 'success');
  //     } else {
  //       if (id && typeof id === 'number') {
  //         await deleteFiles(id);
  //       }

  //       const updated = uploadedFiles.filter((file) => file.id !== id);
  //       setUploadedFiles(updated);
  //       showToast && showToast(t('toast:successTitle'), t('toast:fileDeleted'), 'success');
  //     }

  //     const remainingExisting = isNew ? uploadedFiles.length : uploadedFiles.filter(f => f.id !== id).length;
  //     const remainingNew = isNew ? newInvoiceFiles.filter(f => f.id !== id).length : newInvoiceFiles.length;

  //     if (remainingExisting + remainingNew === 0) {
  //       setError('invoiceFile', {
  //         type: 'manual',
  //         message: t('fileUploadRequired')
  //       });
  //     } else {
  //       clearErrors('invoiceFile');
  //     }
  //      setIsModalOpen(false);
  //   setFileToDelete(null);

  //   } catch (error) {
  //     console.error('Error removing file:', error);
  //     toast.error(t('toast:fileDeleteFailed'));
  //   }
  // };

  const getCombinedFileList = () => {
    const existingFiles = uploadedFiles.map((file, index) => ({
      ...file,
      serialNo: index + 1,
      isNew: false
    }))

    const newFiles = newInvoiceFiles.map((file, index) => ({
      ...file,
      serialNo: existingFiles.length + index + 1,
      isNew: true
    }))

    return [...existingFiles, ...newFiles]
  }
  const combinedFiles = getCombinedFileList()

  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=3`) // Append ?id=3 to the URL
  }

  const numericValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoSymbols()
    .validateMaxLength(16)
    .validateOnlyNumbers()
    .build()

  return (
    <LeftPageContainer>
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('popup:emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      <div className={styles.poContainer}>
        <label className={styles.homeText}>
          {!isEdit
            ? `${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t(
                'sidebar:logistics'
              )} ${t('invoiceList')} / ${t('purchase_order:createInvoice')}`
            : `${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t(
                'purchase_order:invoiceDetails'
              )} -  ${invoiceData?.InvNo}`}
        </label>
        <div className={styles.subHeader}>
          <div>
            <SVGIcon
              size={25}
              className="cursor-pointer"
              name="backArrow"
              onClick={() => navigate(`/${userType}${LOGISTICS_INVOICE}`)}
            />

            <h5>
              {!isEdit
                ? t('purchase_order:createInvoice')
                : `${t('purchase_order:invoiceDetails')} - ${invoiceData?.InvNo}`}
            </h5>
          </div>
          <div>
            <>
              <NormalButton
                label={t('next')}
                isPrimary
                customClass="px-3"
                rightIcon={nextIcon}
                onClick={handleNext}
                disabled={isLoading}
              />
              {!saved ? (
                <NormalButton
                  label={t('save')}
                  isPrimary
                  customClass="px-3"
                  rightIcon={saveIcon}
                  onClick={handleSave}
                  disabled={isLoading}
                />
              ) : (
                <NormalButton label={t('purchase_order:saved')} savedBtn customClass="h-[20px]" />
              )}
            </>
            {userType === VENDOR_USER_TYPE && (
              <TooltipWrapper tooltipMessage={t('soa:help')}>
                <div
                  className={styles.faqIconContainer}
                  onClick={handleRedirectClick}
                  style={{ cursor: 'pointer' }}>
                  <SVGIcon
                    name="help"
                    size={25}
                    className="cursor-pointer"
                    onClick={handleRedirectClick}
                    alt="help"
                  />
                </div>
              </TooltipWrapper>
            )}
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {!isEdit ? (
          <div className={`${styles.userInputContainer} `}>
            <div className="col-6">
              {/* <div className="d-flex gap-10"> */}
              {/* <div className={styles.userInputs}> */}
              {userType === ADMIN_USER_TYPE ? (
                <>
                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('advance_payment:vendorCode')} <span className="required">*</span>
                        <AppTooltip message={t('advance_payment:vendorCode')} />
                      </label>
                    </div>
                    <div>
                      <Controller
                        name="vendorCode"
                        control={control}
                        rules={{ required: t('po_based_invoices:POInvoiceVendorCode.error') }}
                        defaultValue=""
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <SelectBox
                            className={` formInput custom-select-box mb-0`}
                            error={error}
                            value={value}
                            onChange={(e) => {
                              onChange(e.target.value)

                              const selectedVendor = vendorCodeOptions.find(
                                (v) => String(v.value) === String(e.target.value)
                              )
                              if (selectedVendor) {
                                setValue('vendorName', selectedVendor.vendorName || '')
                              } else {
                                setValue('vendorName', '')
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
                        <AppTooltip message={t('advance_payment:vendorName')} />
                      </label>
                    </div>
                    <div style={{ width: isArabic ? '250px' : '270px' }}>
                      <p>{watch('vendorName') || '--'}</p>
                    </div>
                  </div>
                </>
              ) : (
                ''
              )}

              <div className="formGroup" style={{ marginBottom: '15px' }}>
                <div className="labelWidth">
                  <label>
                    <div className="d-flex gap-2">
                      <div>
                        {t('importFile.text')}
                        <span className="required">*</span>
                      </div>
                      <div>
                        <Tooltip tooltipMessage={t('importFile.tooltip')} />
                      </div>
                    </div>
                  </label>
                </div>
                <div>
                  <Controller
                    name="attachments"
                    control={control}
                    rules={{ required: t('fileUploadRequired') }}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      // <LogisticsFileUpload
                      //   className={styles.attachmentInput}
                      //   name="attachments"
                      //   error={error}
                      //   files={value}
                      //   multiple={false}
                      //   accept=".xlsx"
                      //   required
                      //   open={isUploadModalOpen}
                      //   onClose={setIsUploadModalOpen}
                      //   onChange={(event) => {
                      //     const selectedFiles = Array.from(event.target.files || []);

                      //     if (selectedFiles.length > 1) {
                      //       setError("attachments", {
                      //         type: "manual",
                      //         message: "Only one file can be uploaded",
                      //       });
                      //       return;
                      //     }

                      //     const selectedFile = selectedFiles[0];
                      //     if (!selectedFile) return;

                      //     const isXLSX =
                      //       selectedFile.type ===
                      //       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                      //       selectedFile.name.endsWith(".xlsx");

                      //     if (!isXLSX) {
                      //       setError("attachments", {
                      //         type: "manual",
                      //         message: "Only .xlsx files are allowed",
                      //       });
                      //       return;
                      //     }

                      //     clearErrors("attachments");

                      //     // Only one file allowed, so override existing
                      //     onChange([selectedFile]);
                      //   }}
                      // />
                      <>
                        <FileUploadInput
                          className={'formInput'}
                          name="attachments"
                          // error={error}
                          files={value}
                          multiple={false}
                          accept=".xlsx"
                          required
                          onChange={(event) => {
                            const selectedFile = event.target.files?.[0]
                            if (!selectedFile) return

                            // Only allow .xlsx files
                            const isXLSX =
                              selectedFile.type ===
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                              selectedFile.name.endsWith('.xlsx')

                            if (!isXLSX) {
                              setError('attachments', {
                                type: 'manual',
                                message: 'Only .xlsx files are allowed'
                              })
                              return
                            }

                            onChange([selectedFile])
                            clearErrors('attachments')
                          }}
                        />
                        {error && (
                          <p style={{ fontSize: '11px', color: '#d50000' }}>{error.message}</p>
                        )}
                        {value && value.length > 0 && (
                          <div
                            className="uploadedFileName"
                            title={value[0].name}
                            style={{ marginTop: '5px' }}>
                            <DownloadLink
                              title={value[0].name}
                              url={URL.createObjectURL(value[0])}
                              fileName={value[0].name}
                              className={'fileLink'}>
                              {value[0].name}
                            </DownloadLink>
                          </div>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="formGroup" style={{ marginBottom: '15px' }}>
                <div className="labelWidth">
                  <label>
                    <div className="d-flex gap-2">
                      <div>
                        {t('importZipFile')}
                        <span className="required">*</span>
                      </div>
                      <div>
                        <Tooltip tooltipMessage={t('zipFileAllInvoices.tooltip')} />
                      </div>
                    </div>
                  </label>
                </div>
                <div>
                  <Controller
                    name="invoiceFile"
                    control={control}
                    rules={{ required: t('fileUploadRequired') }}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <>
                        <FileUploadInput
                          className={'formInput'}
                          name="invoiceFile"
                          // error={error}
                          files={value}
                          multiple={false}
                          accept=".zip"
                          required
                          onChange={(event) => {
                            const selectedFile = event.target.files?.[0]
                            if (!selectedFile) return

                            // Only allow .zip files
                            const isZip =
                              selectedFile.type === 'application/zip' ||
                              selectedFile.name.endsWith('.zip')
                            if (!isZip) {
                              setError('invoiceFile', {
                                type: 'manual',
                                message: 'Only .zip files are allowed'
                              })
                              return
                            }

                            // const updatedFiles = Array.from(value || []);
                            // if (updatedFiles.length >= 2) {
                            //   setError("invoiceFile", {
                            //     type: "manual",
                            //     message: "Only 2 files are allowed",
                            //   });
                            //   return;
                            // }

                            // updatedFiles.push(selectedFile);
                            // onChange(updatedFiles);
                            onChange([selectedFile])
                            clearErrors('invoiceFile')

                            if (!isEdit) {
                              const newFileObj = {
                                id: `create_${Date.now()}`,
                                document_name: selectedFile.name,
                                file: selectedFile,
                                attachment_type: 'Invoice File',
                                isNew: true
                              }
                              setNewInvoiceFiles((prev) => [...prev, newFileObj])
                            }
                          }}
                        />
                        {error && (
                          <p style={{ fontSize: '11px', color: '#d50000' }}>{error.message}</p>
                        )}
                        {value && value.length > 0 && (
                          <div
                            className="uploadedFileName"
                            title={value[0].name}
                            style={{ marginTop: '5px' }}>
                            <DownloadLink
                              title={value[0].name}
                              url={URL.createObjectURL(value[0])}
                              fileName={value[0].name}
                              className={'fileLink'}>
                              {value[0].name}
                            </DownloadLink>
                          </div>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>

              {/* </div> */}

              {/* </div> */}
            </div>
            <div
              className={`${styles.verticalDividerLeft} col-6  ${
                isArabic ? styles.borderRight : styles.borderLeft
              }`}>
              {/* <div className="d-flex gap-10"> */}
              <div className={`${styles.userInputs} `}>
                <div className="formGroup">
                  <div className="labelWidth">
                    <label>
                      <div className="d-flex gap-2">
                        <div>
                          {t('costResponsible.text')}
                          <span className="required">*</span>
                        </div>
                        <div>
                          <Tooltip tooltipMessage={t('costResponsible.tooltip')} />
                        </div>
                      </div>
                    </label>
                  </div>
                  <div>
                    <Controller
                      name="cost_responsible"
                      control={control}
                      rules={{ required: t('costResponsible.error') }}
                      render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <div className="select-container">
                          <SelectBox
                            className={`formInput custom-select-box mb-0`}
                            error={error}
                            value={value}
                            onChange={(e) => {
                              onChange(e)
                              setCostResponsible(e.target.value)
                            }}
                            options={crPersonsOptions}
                            name="cost_responsible"
                            isRequired
                            placeholder={t('costResponsible.text')}
                            height="34px"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* </div> */}
            </div>
          </div>
        ) : (
          <>
            <div className={`${styles.userInputContainer}`}>
              {/* Left Column */}
              <div className="col-6">
                <div className="formGroup">
                  <div className="labelWidth">
                    <label>
                      {t('po_based_invoices:invoice_date.text')} <span className="required">*</span>
                    </label>
                  </div>
                  <div>
                    <Controller
                      name="invoiceDate"
                      control={control}
                      rules={{ required: t('invoiceDateRequired') }}
                      render={({ field: { onChange, value } }) => (
                        <DateRangePicker
                          className={'formInput'}
                          error={errors?.invoiceDate?.message}
                          value={value}
                          setValue={(newDate) => onChange(newDate)}
                          // minHeight="45px"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="formGroup">
                  <div className="labelWidth">
                    <label>
                      {t('invoiceNumber')} <span className="required">*</span>
                    </label>
                  </div>
                  <div>
                    <InputBox
                      className={`formInput mb-0 border-none`}
                      name="invoiceNo"
                      type="text"
                      register={register}
                      readOnly
                    />
                  </div>
                </div>

                <div className="formGroup">
                  <div className="labelWidth">
                    <label>
                      {t('po_based_invoices:invoiceValue')} <span className="required">*</span>
                    </label>
                  </div>
                  <div>
                    <InputBox
                      className={`formInput mb-0 border-none`}
                      name="invoiceValue"
                      type="text"
                      register={register}
                      rules={{
                        required: t('invoiceValueRequired'),
                        validate: (value) => numericValidator(t('Invoice Value'), value)
                      }}
                      error={errors.invoiceValue}
                    />
                  </div>
                </div>

                <div className="formGroup">
                  <div className="labelWidth">
                    <label>
                      {t('uploadedXlsFile')} <span className="required">*</span>
                    </label>
                  </div>
                  <div>
                    <DownloadLink
                      url={invoiceData?.Logistics_XLS}
                      fileName={invoiceData?.Original_FileName}
                      className={'fileLink'}>
                      {invoiceData?.Original_FileName || 'N/A'}
                    </DownloadLink>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div
                className={`${styles.verticalDividerLeft} col-6 ${
                  isArabic ? styles.borderRight : styles.borderLeft
                }`}>
                <div className="formGroup">
                  <div className="labelWidth">
                    <label>
                      {t('costResponsible.text')} <span className="required">*</span>
                      <AppTooltip message={t('costResponsible.tooltip')} />
                    </label>
                  </div>
                  <div>
                    <Controller
                      name="cost_responsible"
                      control={control}
                      rules={{ required: t('costResponsible.error') }}
                      render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <SelectBox
                          className={`formInput custom-select-box mb-0`}
                          error={error}
                          value={value}
                          onChange={(e) => {
                            onChange(e)
                            setCostResponsible(e.target.value)
                          }}
                          options={crPersonsOptions}
                          name="cost_responsible"
                          isRequired
                          placeholder={t('costResponsible.text')}
                          // height="34px"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="formGroup">
                  <div className="labelWidth">
                    <label>
                      {t('po_based_invoices:currency.text')} <span className="required">*</span>
                    </label>
                  </div>
                  <div>
                    <Controller
                      name="currency"
                      control={control}
                      rules={{ required: 'Currency is required' }}
                      render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <SelectBox
                          className={`formInput custom-select-box mb-0`}
                          error={error}
                          value={value}
                          onChange={onChange}
                          options={currencyOptions}
                          placeholder={t('Currency')}
                          // height="30px"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="formGroup">
                  <div className="labelWidth">
                    <label>{t('paymentStatus.text')}</label>
                  </div>
                  <div>
                    <InputBox
                      className={`formInput mb-0 border-none`}
                      name="paymentStatus"
                      type="text"
                      register={register}
                      readOnly
                    />
                  </div>
                </div>

                <div className="formGroup">
                  <div className="labelWidth">
                    <label>{t('po_based_invoices:remarks')}</label>
                  </div>
                  <div>
                    <InputBox
                      className={`formInput mb-0 border-none`}
                      name="remarks"
                      type="text"
                      register={register}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.attachmentContainer}`}>
              <div className="d-flex">
                <div className="col-6">
                  <div
                    className="d-flex gap-10 align-items-center"
                    style={{ paddingRight: isArabic ? '15px' : '' }}>
                    <div className="d-flex">
                      <label className={styles.inputLabel}>
                        {t('advance_payment:invoiceFileUpload')} <span className="required">*</span>
                      </label>
                      <AppTooltip message={t('zipFileAllInvoices.tooltip')} />
                    </div>
                    <div className="min-w-[280px]">
                      <Controller
                        name="invoiceFile"
                        control={control}
                        rules={{
                          required:
                            uploadedFiles?.length === 0 && newInvoiceFiles?.length === 0
                              ? t('fileUploadRequired')
                              : ''
                        }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <FileUploadInput
                            name="invoiceFile"
                            error={error}
                            files={value}
                            multiple={false}
                            accept=".zip"
                            onChange={(event) => {
                              const selectedFile = event.target.files?.[0]
                              if (!selectedFile) return
                              const totalFilesCount = uploadedFiles.length + newInvoiceFiles.length

                              // Only allow .zip files
                              const isZip =
                                selectedFile.type === 'application/zip' ||
                                selectedFile.name.endsWith('.zip')
                              if (!isZip) {
                                setError('invoiceFile', {
                                  type: 'manual',
                                  message: 'Only .zip files are allowed'
                                })
                                return
                              }

                              if (totalFilesCount >= 2) {
                                setError('invoiceFile', {
                                  type: 'manual',
                                  message:
                                    'Maximum 2 files allowed. Please remove existing files first.'
                                })
                                return
                              }

                              const newFileObj = {
                                id: `new_${Date.now()}`,
                                document_name: selectedFile.name,
                                file: selectedFile,
                                attachment_type: 'Invoice File',
                                isNew: true
                              }

                              setNewInvoiceFiles((prev) => [...prev, newFileObj])

                              // Update form value
                              const currentFiles = Array.from(value || [])
                              currentFiles.push(selectedFile)
                              onChange(currentFiles)
                              clearErrors('invoiceFile')
                            }}
                            className={styles.attachmentInput}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Header row */}
              {combinedFiles?.length > 0 && (
                <>
                  <hr />
                  <div
                    className={`d-flex ${styles.attachmentRow} text-start`}
                    style={{ paddingRight: isArabic ? '15px' : '' }}>
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
              {/* Combined file rows */}
              {combinedFiles?.map((file) => (
                <div
                  key={file.id}
                  className={`d-flex ${styles.attachmentRow} text-start`}
                  style={{ paddingRight: isArabic ? '15px' : '' }}>
                  <div className={`${styles.colSn} ${styles.fileText}`}>
                    <label>{file.serialNo}</label>
                  </div>
                  <div className={`${styles.colType} ${styles.fileText}`}>
                    <label>{t('logistics_invoice:invoiceFile')}</label>
                  </div>
                  <div className={`${styles.colName} ${styles.fileText} ${styles.docLink}`}>
                    <label>
                      {file.isNew ? (
                        <span className="fileLink">{file.document_name}</span>
                      ) : (
                        <DownloadLink url={file.file_url} fileName={file.document_name}>
                          {file.document_name}
                        </DownloadLink>
                      )}
                    </label>
                  </div>
                  <div className={`${styles.colAction}`}>
                    <img
                      src={deleteIcon}
                      alt="delete"
                      className="btn btn-link text-danger p-0"
                      // onClick={() => handleRemoveFile(file.id, file.isNew)}
                      onClick={() => {
                        setFileToDelete(file)
                        setIsModalOpen(true)
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </form>

      {isLoading && <PageLoader />}
      {/* Modals */}
      {nextClick && (
        <InvoicePreviewLogistics
          open={nextClick}
          setNextClick={setNextClick}
          title={t('invoicePreview')}
          handleSave={handleSave}
          handleSubmit={handleSubmitInvoice}
          saved={saved}
          data={{
            costResponsible:
              crPersonsOptions.find((opt) => opt.value == costResponsible)?.label ||
              t('purchase_order:notSpecified'),
            formValues: getValues(),
            vendorCode: vendorCodeOptions.find(
              (opt) => opt.value === Number(getValues('vendorCode'))
            )?.label
          }}
          invoiceFiles={combinedFiles}
          isEdit={isEdit}
        />
      )}
      {showSuccessPopup && (
        <SuccessPopup
          open={showSuccessPopup}
          onClose={handleCloseSuccessPopup}
          successMsg={successMessage}
        />
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
  userInfo: state.userInfo,
  setDashboardData
})

const mapDispatchToProps = { showToast }

export default connect(mapStateToProps, mapDispatchToProps)(AddEditLogisticsInvoiceComp)
