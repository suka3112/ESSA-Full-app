import React, { useState, startTransition } from 'react'
import TableComponent from 'components/Common/TableComponent'
import CustomModal from 'components/Common/Modal'
import SuccessPopup from 'components/Common/SuccessPopup'
import styles from './InvoicePreview.module.scss'
import { useNavigate } from 'react-router-dom'
import { NormalButton } from 'components/Common'
import { ADMIN_USER_TYPE, BUSINESS_USER_TYPE } from 'constants/userType'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { attachmentTypeOptions } from 'services/helpers/constants/common'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import { formatUSDNumber } from 'services/utilities'

export const InvoicePreviewAdvancePayment = ({
  open,
  setNextClick,
  handleSave,
  formData = {},
  files = null,
  invoiceData = [],
  crPersonsOptions = [],
  uploadedFiles,
  saved
}) => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['advance_payment', 'logistics_invoice', 'popup', 'purchase_order'])
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  const userType = useSelector((state) => state?.userInfo?.userType)
  const isArabic = i18n.language === "ar";


 const translatedOptions  = [
    { label: t('advance_payment:proforma_invoice'), value: 'Proforma Invoice' },
    { label: t('non_po_based_invoices:delivery_note'), value: 'delivery note' },
    { label: t('non_po_based_invoices:shipping_documents'), value: 'shipping documents' },
    { label: t('non_po_based_invoices:others'), value: 'others' }
  ]

  // Get cost responsible person name
  const getCostResponsibleName = () => {
    if (!formData?.cost_responsible) return 'N/A'
    const person = crPersonsOptions.find(
      (p) => String(p.value) === String(formData.cost_responsible)
    )
    return person ? person.label : 'N/A'
  }
  const handleSaveClick = () => {
    startTransition(() => {
      handleSave('Draft')
      setNextClick(false)
    })
  }

  const handleSubmitClick = () => {
    startTransition(() => {
      handleSave('Submitted')
      setSavedSuccessfully(true)
      setNextClick(false)
      //navigate(-1)
    })
  }

  const handleClose = () => {
    setNextClick(false)
    setSavedSuccessfully(false)
  }

  const modalStyles = {
    minWidth: '85%',
    padding: 0,
    borderRadius: 0
  }

  return (
    <>
      {open && (
        <CustomModal open={open} modalStyles={modalStyles}>
          <div className={styles.titleContainer}>
            <div className='d-flex flex-row align-items-center gap-2'>
              <p className={styles.title}>{t("advancePaymentRequest")}</p>
              {saved && (<div className={`px-2 ${styles.savedPill}`}>{t('purchase_order:saved')}</div>)}
            </div>
            <div className={styles.dateContainer}>
              {!saved && (
                <NormalButton label={t('purchase_order:save')} isPrimary customClass="px-3" onClick={handleSaveClick} />
              )}
              <NormalButton
                label={t('purchase_order:submit')}
                isPrimary
                customClass="px-3"
                onClick={handleSubmitClick}
              />
              <NormalButton label={t('purchase_order:close')} outlineBtn customClass="px-3" onClick={handleClose} />
            </div>
          </div>

          <div className={`p-3 d-flex flex-column gap-2 ${styles.userInputContainerOuter}`}>
            <div className={`mb-3 ${styles.userInputContainer}`}>
              <div className='d-flex flex-row align-items-top justify-content-start gap-4 w-100 p-3'>
                {/* Left Col */}
                <div className='w-100 detailValueContainer'>
                  {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) && (
                    <div className='d-flex flex-row align-items-center'>
                      <div className={`col-6 ${styles.creditNoteLabel}`}>{t('vendorCode')}</div>
                      <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.vendor_code || '--'}</div>
                    </div>
                  )}
                  {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) && (
                    <div className='d-flex flex-row align-items-center'>
                      <div className={`col-6 ${styles.creditNoteLabel}`}>{t('vendorName')}:</div>
                      <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.vendor_name || '--'}</div>
                    </div>
                  )}
                  <div className='d-flex flex-row align-items-center'>
                    <div className={`col-6 ${styles.creditNoteLabel}`}>{t('ProformaInvoiceNo')}</div>
                    <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.Performa_Invoice_Number || '--'}</div>
                  </div>
                  <div className='d-flex flex-row align-items-center'>
                    <div className={`col-6 ${styles.creditNoteLabel}`}>{t('typeOfInvoice.text')}</div>
                    <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>
                      {formData?.type_of_invoice === 1
                          ? 'PO Based No'
                          : formData?.type_of_invoice === 2
                            ? 'Non PO Based'
                            : '--'}
                    </div>
                  </div>
                  {formData?.type_of_invoice === 1 && 
                    <div className='d-flex flex-row align-items-center'>
                      <div className={`col-6 ${styles.creditNoteLabel}`}>{t('poBasedInvoiceLineItem.text')}</div>
                      <TooltipWrapper tooltipMessage={formData.po_based_No?.join(', ') || '--'}>
                            <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>
                              {formData.po_based_No?.join(', ')?.length > 30
                                ? `${formData.po_based_No.join(', ').slice(0, 30)}...`
                                : formData.po_based_No?.join(', ') || '--'}
                            </div>
                      </TooltipWrapper>
                    </div>
                  }
                  <div className='d-flex flex-row align-items-center'>
                    <div className={`col-6 ${styles.creditNoteLabel}`}>{t('popup:advancePaymentValue')}</div>  
                    <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.value_of_advance_payment != null
                          ? formatUSDNumber(formData.value_of_advance_payment)
                          : 'N/A'}
                    </div> 
                  </div>      
                </div>
                {/* Separator */}
                <div style={{ borderLeft: "1px solid #929398", height: "auto" }} />
                {/* Right Col */}
                <div className='w-100 detailValueContainer'>
                  <div className='d-flex flex-row align-items-center'>
                    <div className={`col-6 ${styles.creditNoteLabel}`}>{t('submissionDate')}</div>
                    <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.submission_date
                        ? dayjs(formData?.submission_date).isValid()
                          ? dayjs(formData?.submission_date).format('DD/MM/YYYY')
                          : 'N/A'
                        : 'N/A'}</div>
                  </div>
                  <div className='d-flex flex-row align-items-center'>
                    <div className={`col-6 ${styles.creditNoteLabel}`}>{t('currency.text')}</div>
                    <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.currency}</div>
                  </div>
                  <div className='d-flex flex-row align-items-center'>
                    <div className={`col-6 ${styles.creditNoteLabel}`}>{t('costResponsible.text')}</div>
                    <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{getCostResponsibleName()}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`p-3 ${styles.attachmentContainer}`}>
              <div className={`${styles.attachmentRow} ${styles.header}`}>
                <p>{t('SNo')}</p>
                <p>{t('attachmentType.text')}</p>
                <p>{t('DocumentName')}</p>
              </div>

              {uploadedFiles?.map((file, index) => (
                <div key={file.id || index} className={styles.attachmentRow}>
                  <label>{index + 1}</label>
                  <label>
                    {/* {file.attachment_type?.charAt(0).toUpperCase() + file.attachment_type?.slice(1)} */}
                    {translatedOptions.find(opt => opt.value === file.attachment_type)?.label || file.attachment_type}
                  </label>
                  <div>
                  <label style={{direction: isArabic ? "ltr" : ""}}>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`fileLink cursor-pointer`}>
                      {file.document_name || 'N/A'}
                    </a>
                  </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CustomModal>
      )}

      {savedSuccessfully && (
        <SuccessPopup
          open={savedSuccessfully}
          onClose={() => {
            setSavedSuccessfully(false)
            navigate('/advance-payment')
          }}
          successMsg={t('popup:advancePaymentSubmitted')}
        />
      )}
    </>
  )
}
