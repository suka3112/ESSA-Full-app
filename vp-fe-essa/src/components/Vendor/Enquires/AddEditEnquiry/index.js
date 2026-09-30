import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller, get } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { showToast } from 'redux/actions/toastActions'
// Components
import { NormalButton } from 'components/Common'
import { InputBox } from 'components/Common/InputBox'
import { SelectBox } from 'components/Common/SelectBox'
import FileUploadInput from 'components/Common/FileUploadInput'
import { HeaderBar } from 'components/Common/HeaderBar'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'

// API
import { createEnquiry, getEnquiryById } from '../../../../api/Enquiry'

// Styles
import styles from './AddEditEnquiry.module.scss'
import AppTooltip from 'components/Common/AppTooltip'
import {
  attachmentTypeOptions,
  enquiryAttachmentTypeOptions
} from 'services/helpers/constants/common'
import { getCRPersons, getEntityDropdown } from 'api/MyProfile'
import { getEntityId } from 'services/utilities'
import { deleteIcon, uploadAddIcon } from 'constants/imageConstants'
import { deleteFiles, fileUpload } from 'api/FileUpload'
import { connect, useSelector } from 'react-redux'
import { ADMIN_USER_TYPE, VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { setDashboardData } from 'redux/actions/dashboardAction'
import CustomModal from 'components/Common/Modal'

const AddEditEnquiryComp = ({ setDashboardData, showToast }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const id = searchParams.get('id')
  const isEditMode = searchParams.has('edit')

  const { t } = useTranslation([
    'enquiries',
    'sidebar',
    'toast',
    'credit_notes',
    'advance_payment',
    'dashboard',
    'non_po_based_invoices',
    'otp',
    'popup',
    'po_based_invoices'
  ])

  const userType = useSelector((state) => state?.userInfo?.userType)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [btnLoader, setBtnLoader] = useState(false)
  const [crPersonsOptions, setCrPersonsOptions] = useState([])
  const [selectedEnquiryType, setSelectedEnquiryType] = useState('')
  const [currentAttachment, setCurrentAttachment] = useState({
    type: '',
    file: null
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)

  const [selectedCrPersonId, setSelectedCrPersonId] = useState(null)
  const uploadVendorCode = useSelector(
    (state) => state?.dashboard?.dashboardData?.profile?.Vendor_SAP_Code
  )
  const isAdmin = userType === ADMIN_USER_TYPE
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    control,
    reset,
    setValue,
    clearErrors,
    setError
  } = useForm({
    defaultValues: {
      enquiryType: '',
      assignedContactPerson: '',
      subject: '',
      enquiryDesc: ''
    },
    mode: 'onChange'
  })

  const getAttachmentLabelWithTranslation = (value, t) => {
    switch (value) {
      case 'invoice':
        return t('non_po_based_invoices:invoice')
      case 'bank data':
        return t('bankData')
      case 'email':
        return t('email')
      case 'others':
        return t('non_po_based_invoices:others')
      default:
        return value
    }
  }

  const translatedOptions = enquiryAttachmentTypeOptions.map((option) => ({
    label: getAttachmentLabelWithTranslation(option.value, t),
    value: option.value
  }))

  // Fetch enquiry data in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchEnquiryData = async () => {
        let query = {
          entity_id: getEntityId()
        }
        try {
          const res = await getEnquiryById(id, query)

          const enquiryData = res.data.data
          reset({
            enquiryType: enquiryData.Enquiry_Type,
            assignedContactPerson: enquiryData.user?.Vendor_Name_EN,
            subject: enquiryData.Subject,
            enquiryDesc: enquiryData.Enquiry_Description
          })
        } catch (error) {
          console.error('Error fetching enquiry:', error)
          toast.error(error.response?.data?.message || t('errors.fetchEnquiry'))
        }
      }

      fetchEnquiryData()
    }
  }, [id, isEditMode, reset, navigate, t])

  useEffect(() => {
    // isAdmin ? fetchCRDropdownData() : fetchCRPerson();
    fetchCRDropdownData()
  }, [])

  useEffect(() => {
    fetchCRDropdownData(selectedEnquiryType)
  }, [selectedEnquiryType])

  const fetchCRDropdownData = () => {
    let query = {
      entity_id: getEntityId()
    }
    if (selectedEnquiryType === 'Finance') {
      query.isFinance = true
    }
    Promise.all([getCRPersons(query)])
      .then(([crPersonsRes]) => {
        const crPersonsOptions = crPersonsRes?.data?.data?.map((person) => ({
          label: person.Name,
          value: person.Employee_Id
        }))

        setCrPersonsOptions(crPersonsOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }

  const getCrPerson = (entitiesData) => {
    if (typeof window !== 'undefined') {
      const entityId = localStorage.getItem('entity_id') || sessionStorage.getItem('entity_id')
      const parsedEntityId = entityId ? JSON.parse(entityId) : null

      if (!parsedEntityId || !Array.isArray(entitiesData)) return null

      const matchedEntity = entitiesData.find(
        (entity) => String(entity.CoCd) === String(parsedEntityId)
      )

      return matchedEntity?.CR_details || null
    }
    return null
  }

  const fetchCRPerson = async () => {
    try {
      const res = await getEntityDropdown()
      const entityList = res?.data?.data || []
      const crPerson = getCrPerson(entityList)

      if (crPerson) {
        setValue('assignedContactPerson', crPerson?.Employee_Name)
        setSelectedCrPersonId(crPerson?.ID)
      }
    } catch (err) {
      console.error('Error fetching entity data:', err)
    }
  }

  const onSubmit = async (data) => {
    if (data.attachments?.length && currentAttachment?.file && uploadedFiles.length === 0) {
      setError('attachments', {
        type: 'manual',
        message: t('credit_notes:pleaseUploadSelectedFile')
      })
      return
    }
    setIsLoading(true)
    let query = {
      entity_id: getEntityId()
    }
    const body = {
      Enquiry_type: data?.enquiryType,
      Assigned_contact_person: selectedCrPersonId,
      Subject: data?.subject,
      Enquiry_description: data?.enquiryDesc,
      Enquiry_status: 1,
      entity_id: getEntityId(),
      Upload_files: uploadedFiles.map(({ file_url, file_type, document_name }) => ({
        Upload_files: file_url,
        Attachment_type: file_type,
        originalName: document_name
      }))
    }
    try {
      const response = await createEnquiry(query, body)
      if (response) {
        const enquiryId = response?.data?.data?.ID
        showToast(t('toast:successTitle'), t('submittedSuccessfully'), 'success')
        navigate(`/${userType}/enquires`)
      }
    } catch (err) {
      console.error('Error submitting invoice:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Enquiry type options
  const enquiryTypeOptions = [
    { label: t('dashboard:enquiryType.General'), value: 'General' },
    { label: t('dashboard:enquiryType.Invoice'), value: 'Invoice' },
    { label: t('dashboard:enquiryType.Finance'), value: 'Finance' }
  ]

  const handleFileUpload = async (e) => {
    e.preventDefault()
    const { file, type } = currentAttachment

    if (!file || !type) {
      toast.error(t('toast:attachTypeAndFileRequired'))
      return
    }

    const typeCount = uploadedFiles.filter((f) => f.attachment_type === type).length

    if (typeCount >= 2) {
      toast.error(`${t('toast:onlyTwoFilesPerType')} (${type})`)
      return
    }

    const vendorCode = uploadVendorCode
    const module = 'ENQUIRIES' // static value
    const attachmentType = type

    const fd = new FormData()
    fd.append('image', file)
    fd.append('vendor_code', vendorCode)
    fd.append('module', module)
    fd.append('attachment_type', attachmentType)

    setBtnLoader(true)
    try {
      const res = await fileUpload(fd)
      const url = res.data?.data?.url

      const newEntry = {
        id: uploadedFiles.length + 1,
        attachment_type: type,
        document_name: file.name,
        file_url: url,
        file_type: type
      }

      setBtnLoader(false)
      setUploadedFiles([...uploadedFiles, newEntry])
      setValue('attachments', '')
      setValue('attachmentType', '')
      setCurrentAttachment({ type: '', file: null })
      clearErrors('attachments')
    } catch (err) {
      console.error(err)
    }
  }

  // const handleRemoveFile = async (file) => {
  //   try {
  //     if (file?.id) {
  //     await deleteFiles({
  //       id: file.id,
  //       url: file.file_url,
  //     });
  //   }
  //     const updated = uploadedFiles.filter((file) => file.id !== id);
  //     setUploadedFiles(updated);
  //     showToast(t("toast:successTitle"), t("toast:fileDeleted"), "success");
  //   } catch (error) {
  //     console.error("Error deleting file:", error);
  //     toast.error(t("toast:fileDeleteFailed"));
  //   }
  // };
  const handleRemoveFile = async () => {
    try {
      if (fileToDelete?.id) {
        await deleteFiles({
          id: fileToDelete.id,
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

  return (
    <LeftPageContainer>
      <div className={styles.poContainer}>
        <HeaderBar
          title={isEditMode ? t('editInquiry.text') : t('createInquiry.text')}
          slug={`${t('sidebar:home')} / ${t('sidebar:enquires')} / ${t('createInquiry.text')}`}>
          <div className="flex gap-[10px]">
            <div>
              <NormalButton
                label={t('submit.text')}
                isPrimary
                // {...(isValid ? { isPrimary: true } : { creditNoteBtn: true })}
                customClass="px-5 !h-[45px]"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        </HeaderBar>

        <div className={styles.createEnquiryContainer}>
          <div className={styles.createEnquiryText}>
            {isEditMode ? t('editInquiry.text') : t('createInquiry.text')}
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className={styles.enquiryInforowOne}>
              <div>
                <label className="d-flex mb-3">
                  {t('inquiryType.text')} <span className="required">*</span>
                  <AppTooltip message={t('inquiryType.tooltip')} />
                </label>
                <Controller
                  name="enquiryType"
                  control={control}
                  rules={{ required: t('inquiryType.error') }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <div className="select-container mb-[15px]">
                      <SelectBox
                        className={`${styles.userInput} custom-select-box`}
                        error={error}
                        value={value}
                        onChange={(e) => {
                          onChange(e)
                          setSelectedEnquiryType(e.target.value)
                        }}
                        options={enquiryTypeOptions}
                        name="enquiryType"
                        isRequired
                        placeholder={t('inquiryType.text')}
                      />
                    </div>
                  )}
                />
              </div>
              <div>
                <label className="d-flex mb-3">
                  {t('assignedContactPerson.text')} <span className="required">*</span>
                  <AppTooltip message={t('assignedContactPerson.tooltip')} />
                </label>
                <Controller
                  name="assignedContactPerson"
                  control={control}
                  rules={{ required: t('inquiryType.error') }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <div className="select-container mb-[15px]">
                      <SelectBox
                        className={`${styles.userInput} custom-select-box`}
                        error={error}
                        value={value}
                        onChange={(e) => {
                          onChange(e.target.value)
                          setSelectedCrPersonId(e.target.value)
                        }}
                        options={crPersonsOptions}
                        name="assignedContactPerson"
                        isRequired
                        placeholder={t('assignedContactPerson.text')}
                      />
                    </div>
                  )}
                />
                {/* </>
                }  */}
              </div>
            </div>

            <div className="mt-1">
              <InputBox
                className="user-input inputBox"
                name="subject"
                type="text"
                register={register}
                rules={{
                  required: t('subject.error'),
                  maxLength: {
                    value: 100,
                    message: t('errors.maxLength100')
                  }
                }}
                error={errors.subject}
                placeholder={t('subject.text')}
                titleLabel={t('subject.text')}
                isRequired
                tooltipMessage={t('subject.tooltip')}
                tooltipIcon
              />

              <div className="mt-3">
                <InputBox
                  className="user-input inputBox"
                  name="enquiryDesc"
                  type="textarea"
                  register={register}
                  rules={{
                    required: t('inquiryDescription.error'),
                    maxLength: {
                      value: 2000,
                      message: t('writeLessNoOfCharacters')
                    }
                  }}
                  error={errors.enquiryDesc}
                  titleLabel={t('inquiryDescription.text')}
                  isRequired
                  placeholder={t('writeHere')}
                  rows={4}
                  tooltipMessage={t('inquiryDescription.tooltip')}
                  tooltipIcon
                />
              </div>
            </div>

            <div className={`d-flex mt-3 gap-10`}>
              <div className="col-6">
                <label className="d-flex gap-1 mb-2">
                  {t('attachmentType.text')} <span className="required">*</span>
                  <AppTooltip message={t('attachmentType.tooltip')} />
                </label>
                <Controller
                  name="attachmentType"
                  control={control}
                  rules={{
                    required:
                      uploadedFiles?.length === 0 ? t('advance_payment:attachmentTypeRequired') : ''
                  }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <SelectBox
                      className={` custom-select-box ${styles.fileUploadSelectBox} mb-0`}
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
                      placeholder={t('select')}
                    />
                  )}
                />
              </div>
              <div className="col-6">
                <div>
                  <label className="d-flex gap-1 mb-2">
                    {t('uploadSupportingDoc.text')} <span className="required">*</span>
                    <AppTooltip message={t('uploadSupportingDoc.tooltip')} />
                  </label>
                  <div className="d-flex gap-10 align-items-center">
                    <Controller
                      name="attachments"
                      control={control}
                      rules={{
                        required:
                          uploadedFiles?.length === 0 ? t('advance_payment:fileUploadRequired') : ''
                      }}
                      render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <FileUploadInput
                          name="attachments"
                          error={error}
                          files={value}
                          multiple={false}
                          onChange={(event) => {
                            const selectedFile = event.target.files?.[0]
                            if (!selectedFile) return

                            setCurrentAttachment((prev) => ({
                              ...prev,
                              file: selectedFile
                            }))
                            onChange([selectedFile])
                          }}
                          className={styles.attachmentInput}
                        />
                      )}
                    />
                    <div>
                      <NormalButton
                        isPrimary
                        label={t('advance_payment:upload')}
                        leftIcon={uploadAddIcon}
                        customClass="px-3"
                        onClick={handleFileUpload}
                        isLoading={btnLoader}
                        disabled={btnLoader}
                        type="button"
                      />
                    </div>
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
                    {t('advance_payment:SNo')}
                  </div>
                  <div className={`${styles.colType} ${styles.headerText}`}>
                    {t('advance_payment:AttachmentType')}
                  </div>
                  <div className={`${styles.colName} ${styles.headerText}`}>
                    {t('advance_payment:DocumentName')}
                  </div>
                  <div className={`${styles.colAction} ${styles.headerText}`}>
                    {t('advance_payment:action')}
                  </div>
                </div>
              </>
            )}

            {/* Uploaded file rows */}
            {uploadedFiles?.map((file, index) => (
              <div key={file.id || index} className={`d-flex ${styles.attachmentRow} text-start`}>
                <div className={`${styles.colSn} ${styles.fileText}`}>{index + 1}</div>
                <div className={`${styles.colType} ${styles.fileText}`}>
                  {/* {attachmentTypeOptions.find(
                    (opt) => opt.value === file.attachment_type
                  )?.label || file.attachment_type} */}
                  {translatedOptions.find((opt) => opt.value === file.attachment_type)?.label ||
                    file.attachment_type}
                </div>
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
          </form>
        </div>
      </div>
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
// export default EnqueriesConvertation

const mapStateToProps = (state) => ({
  setDashboardData
})

export default connect(mapStateToProps, mapDispatchToProps)(AddEditEnquiryComp)
// export default AddEditEnquiryComp
