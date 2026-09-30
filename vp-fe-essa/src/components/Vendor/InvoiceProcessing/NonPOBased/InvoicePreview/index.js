import React, { useState } from 'react'
import TableComponent from 'components/Common/TableComponent'
import CustomModal from 'components/Common/Modal'
import { NormalButton } from 'components/Common'
import styles from './InvoicePreviewNonPo.module.scss'
import { useTranslation } from 'react-i18next'
import { ADMIN_USER_TYPE, BUSINESS_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import { attachmentTypeOptions } from 'services/helpers/constants/common'
import dayjs from 'dayjs'
import { useSelector } from 'react-redux'


export const InvoicePreviewNonPO = ({
  open,
  setNextClick,
  handleSave,
  handleSubmit,
  formData = {},
  saved,
  uploadedFiles
}) => {
  const { t, i18n } = useTranslation(['non_po_based_report', 'purchase_order', 'logistics_invoice', 'non_po_based_invoices', 'advance_payment'])
  const isArabic = i18n.language === 'ar'
  const userType = useSelector((state) => state?.userInfo?.userType)

  // 🔹 Translate attachment type labels
const getAttachmentLabelWithTranslation = (value, t) => {
  switch (value) {
    case 'invoice':
      return t('non_po_based_invoices:invoice');
    case 'delivery note':
      return t('non_po_based_invoices:delivery_note');
    case 'shipping documents':
      return t('non_po_based_invoices:shipping_documents');
    case 'others':
      return t('non_po_based_invoices:others');
    default:
      return value;
  }
};


const translatedOptions = attachmentTypeOptions?.map(option => ({
  label: getAttachmentLabelWithTranslation(option?.value, t),
  value: option?.value
}));


  const handleSaveClick = () => {
    handleSave({ status: 'draft' })
    setNextClick(false)
  }

  const handleClose = () => {
    setNextClick(false)
  }

  const modalStyles = {
    minWidth: '85%',
    padding: 0,
    borderRadius: 0
  }

  const formatAmount = (value) => {
    return isNaN(value) ? 'N/A' : Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  return (
    <CustomModal open={open} modalStyles={modalStyles}>
      <div className={styles.titleContainer}>
        <div className='d-flex flex-row align-items-center gap-2'>
          <p className={styles.title}>{t('logistics_invoice:invoicePreview')}</p>
          {saved && (
            <div className={`px-2 ${styles.savedPill}`}>{t('purchase_order:saved')}</div>
          )}
        </div>
        <div className={styles.dateContainer}>
          {!saved && <NormalButton
            label={t('purchase_order:save')}
            isPrimary
            // customClass={`px-5 ${styles.previewButtons}`}
            customClass="px-3"
            onClick={handleSaveClick} />}
          <NormalButton
            label={t('purchase_order:submit')}
            isPrimary
            // customClass={`px-3 ${styles.previewButtons}`}
            customClass="px-3"
            onClick={handleSubmit}
          />
          <NormalButton label={t('purchase_order:close')} outlineBtn customClass="px-3" onClick={handleClose} />
        </div>
      </div>

      <div className={`p-3 d-flex flex-column gap-2 ${styles.userInputContainerOuter}`}>
        <div className={`mb-3 ${styles.userInputContainer}`}>
          <div className='d-flex flex-row align-items-top justify-content-start gap-4 w-100 p-3'>
            {/* Left Column */}
            <div className={`w-100 ${styles.columnContainer}`}>
              {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) &&
                <div className='d-flex flex-row align-items-center'>
                  <div className={`col-6 ${styles.creditNoteLabel}`}>{t('advance_payment:vendorCode')}</div>
                  <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.vendorCode || '--'}</div>
                </div>
              }
              {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) &&
                <div className='d-flex flex-row align-items-center'>
                  <div className={`col-6 ${styles.creditNoteLabel}`}>{t('advance_payment:vendorName')}</div>
                  <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.vendorName || '--'}</div>
                </div>
              }
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('vendorInvoiceNumber.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.vendorRefNum || '--'}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('submittedDate.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.submittedDate || '--'}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('invoiceDate.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.invoice_date
                  ? dayjs.utc(formData.invoice_date).format('DD/MM/YYYY')
                  : '--'}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('currency.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.currency || '--'}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('natureOfExpenses.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.nature_of_expenses || '--'}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('businessContact.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.contact_name || formData?.contact_id || '--'}</div>
              </div>
            </div>
            <div style={{ borderLeft: "1px solid #929398", height: "auto" }} />
            {/* Right Column */}
            <div className={`w-100 ${styles.columnContainer}`}>
              {/* <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('invoicePostingDate.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.submittedDate || '--'}</div>
              </div> */}
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('non_po_based_invoices:totalInvoiceAmount.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formatAmount(formData.total_invoice_amount)}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('taxRate.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.taxPercentage ? `${formData.taxPercentage}%` : '--'}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('non_po_based_invoices:totalTaxAmount.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formatAmount(formData.tax_amount)}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('paymentTerms.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`} style={{direction: isArabic ? 'ltr' : '', textAlign: isArabic ? "end" : ""}}>{formData?.paymentTerms || '--'}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('remarks.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.remarks || '--'}</div>
              </div>
            </div>
          </div>
        </div>
        {/* Attachments Section */}
        {(userType === ADMIN_USER_TYPE || userType === VENDOR_USER_TYPE) && (
          <div className={`p-3 ${styles.attachmentContainer}`}>
            <div className={`${styles.attachmentRow} ${styles.header}`}>
              <label>{t('advance_payment:SNo')}</label>
              <label>{t('attachmentType.text')}</label>
              <label>{t('advance_payment:DocumentName')}</label>
            </div>

            {uploadedFiles?.map((file, index) => (
              <div key={file.id || index} className={styles.attachmentRow}>
                <label>{index + 1}</label>
                <label>
                  {/* {
                  attachmentTypeOptions.find(opt => opt.value === file.attachment_type)?.label || file.attachment_type
                } */}
                 {translatedOptions.find(opt => opt.value === file.attachment_type?.toLowerCase())?.label || file.attachment_type}
                </label>
                <div>
                <label style={{direction: isArabic ? "ltr" : ""}}>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.docLink} cursor-pointer`}
                  >
                    {file.document_name || 'N/A'}
                  </a>
                </label>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </CustomModal>
  )
}
