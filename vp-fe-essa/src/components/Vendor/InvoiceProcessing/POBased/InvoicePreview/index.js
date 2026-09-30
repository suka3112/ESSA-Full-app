import React, { startTransition, useState } from 'react'
import CustomModal from 'components/Common/Modal'
import { NormalButton } from 'components/Common'
import styles from './InvoicePreview.module.scss'
import "assets/scss/viewInvoice.scss";
import { useTranslation } from 'react-i18next'
import { ADMIN_USER_TYPE, BUSINESS_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import { useNavigate } from 'react-router'
import utc from 'dayjs/plugin/utc'
import dayjs from 'dayjs'
import { useSelector } from 'react-redux'
import DetailItem from 'components/Common/DetailItemCard'
import { attachmentTypeOptions } from 'services/helpers/constants/common';
dayjs.extend(utc)
export const InvoicePreviewPO = ({
  open,
  setNextClick,
  handleSave,
  handleSubmit,
  formData = {},
  saved,
  tableData,
  uploadedFiles,
  title = 'Invoice Preview'
}) => {
  const { t,i18n } = useTranslation(['po_based_invoices', 'purchase_order', 'logistics_invoice', 'advance_payment', 'non_po_based_report', 'non_po_based_invoices'])
   const isArabic = i18n.language === 'ar'
  const userType = useSelector((state) => state?.userInfo?.userType)

  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

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
    startTransition(() => {
      handleSave({ status: 'Draft' })
      setNextClick(false)
    })
  }

  const handleSubmitClick = () => {
    startTransition(() => {
      handleSubmit({ status: 'Submitted' })
      setNextClick(false)
      // navigate(`/vendor/invoice-processing/po-based`)
    })
  }

  const handleClose = () => {
    setNextClick(false)
  }

  const modalStyles = {
    width: '80%',
    padding: 0,
    borderRadius: 0,
    height: '80%'
  }
  return (
    <CustomModal open={open} modalStyles={modalStyles}>
      <div className={styles.titleContainer}>
        <div className='d-flex flex-row align-items-center gap-2'>
          <p className={styles.title}>{t('logistics_invoice:invoicePreview')}</p>
          {saved && (<div className={`px-2 ${styles.savedPill}`}>Saved</div>)}
        </div>
        <div className={styles.dateContainer}>
          {!saved && (
            <NormalButton
              label={t('purchase_order:save')}
              isPrimary
              customClass="px-3"
              onClick={handleSaveClick}
              disabled={isLoading}
            />
          )}
          <NormalButton
            label={t('purchase_order:submit')}
            isPrimary
            customClass="px-3"
            onClick={handleSubmitClick}
            disabled={isLoading}
          />
          <NormalButton
            label={t('purchase_order:close')}
            outlineBtn
            customClass="px-3"
            onClick={handleClose}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className={`p-3 d-flex flex-column gap-2 ${styles.userInputContainerOuter}`}>
        <div className={`${styles.userInputContainer}`}>
          <div className='row p-3'>
          <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-6`}>
            <div className='detailValueContainer'>
            {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) && (
<DetailItem label={t('advance_payment:companyCode')} value={formData?.company_code || '--'} />
            )}
            {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) && (
<DetailItem label={t('advance_payment:companyName')} value={formData?.company_name || '--'} />
            )}
            <DetailItem label={t('vendor_invoice_number.text')} value={formData?.vendor_invoice_number || '--'} />
            <DetailItem label={t('invoice_date.text')} value={formData?.invoice_date
                ? dayjs.utc(formData.invoice_date).format('DD/MM/YYYY')
                : '--'} />
            <DetailItem label={t('selectedPOList.text')} value={formData?.purchaseOrderData?.length > 0
                ? [...new Set(formData.purchaseOrderData.map((item) => item.PONo))].join(', ')
                : '--'} />
                            {/* <DetailItem label={t('non_po_based_report:invoicePostingDate.text')} value={dayjs().format('DD/MM/YYYY')} /> */}
            <DetailItem label={t('currency.text')} value={formData?.InvCurr || 'N/A'} />
          </div>
          </div>
          <div className='col-6'>
              <div className='detailValueContainer'>
            <DetailItem label={t('totalNetValue.text')} value={formData?.InvAmt !== undefined && formData?.InvAmt !== null && !isNaN(formData.InvAmt)
                ? Number(formData.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })
                : '0.00'} />
            <DetailItem label={t('totalTaxAmountCalc.text')} value={formData?.tax_amount !== undefined && formData?.tax_amount !== null && !isNaN(formData.tax_amount)
                ? Number(formData.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
                : '0.00'} />
            <DetailItem label={t('paymentTerms.text')} value={formData?.Payment_Terms || '--'}  valueStyle={{direction: isArabic ? "ltr" : "", textAlign: isArabic ? "end" : ""}}/>
            {/* <DetailItem label={t('paymentAdvice')} value={formData?.payment_advice || '--'} /> */}
            </div>
          </div>
          </div>
          {/* <div className='d-flex flex-row align-items-top justify-content-start gap-4 w-100 p-3'> */}
          {/* Left Column */}
            {/* <div className='w-100'>
              {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) && (
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('advance_payment:vendorCode')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.vendor_code || 'N/A'}</div>
              </div>
              )}
              {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) && (
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('advance_payment:vendorName')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.vendor_name || 'N/A'}</div>
              </div>
              )}
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('vendor_invoice_number.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.vendor_invoice_number || 'N/A'}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('invoice_date.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.invoice_date
                    ? dayjs.utc(formData.invoice_date).format('DD/MM/YYYY')
                    : 'N/A'}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('selectedPOList.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.purchaseOrderData?.length > 0
                    ? [...new Set(formData.purchaseOrderData.map((item) => item.PONo))].join(', ')
                    : 'N/A'}</div>
              </div>
            </div> */}
            {/* <div style={{ borderLeft: "1px solid #dedede", height: "auto" }} /> */}
            {/* Middle Column */}
            {/* <div className='w-100'>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('non_po_based_report:invoicePostingDate.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{dayjs().format('DD/MM/YYYY')}</div>
              </div>
              <div className='d-flex flex-row align-items-center'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('currency.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.InvCurr || 'N/A'}</div>
              </div>
            </div> */}
            {/* <div style={{ borderLeft: "1px solid #dedede", height: "auto" }} /> */}
            {/* Right Column */}
            {/* <div className='w-100'>
              <div className='d-flex flex-row align-items-center gap-2'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('totalNetValue.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.InvAmt !== undefined && formData?.InvAmt !== null && !isNaN(formData.InvAmt)
                    ? Number(formData.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })
                    : '0.00'}</div>
              </div>
              <div className='d-flex flex-row align-items-center gap-2'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('totalTaxAmountCalc.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.tax_amount !== undefined && formData?.tax_amount !== null && !isNaN(formData.tax_amount)
                    ? Number(formData.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
                    : '0.00'}</div>
              </div>
              <div className='d-flex flex-row align-items-start gap-2'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('paymentTerms.text')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.Payment_Terms || 'N/A'}</div>
              </div>
              <div className='d-flex flex-row align-items-center gap-2'>
                <div className={`col-6 ${styles.creditNoteLabel}`}>{t('paymentAdvice')}</div>
                <div className={`col-6 fw-semibold ${styles.creditNoteDetail}`}>{formData?.payment_advice || 'N/A'}</div>
              </div>
            </div> */}
          {/* </div> */}
        </div>

        {/* Attachments Section */}
        {(userType === ADMIN_USER_TYPE || userType === VENDOR_USER_TYPE) && (
          // <div className="mb-5">
          <div className={`p-3 ${styles.attachmentContainer}`}>
            {/* <hr /> */}
            <div className={`d-flex ${styles.attachmentRow}`} style={{gap: isArabic ? "10px" : "", textAlign: isArabic ? "" : "start"}}>
              <div className={`${isArabic ? styles.colSnArabic : styles.colSn} ${styles.headerText}`}>{t('advance_payment:SNo')}</div>
              <div className={`${styles.colType} ${styles.headerText}`}>{t('advance_payment:AttachmentType')}</div>
              <div className={`${styles.colName} ${styles.headerText}`}>{t('advance_payment:DocumentName')}</div>
            </div>
            {uploadedFiles?.map((file, index) => (
              <div key={file.id || index} className={`d-flex ${styles.attachmentRow}`} style={{gap: isArabic ? "10px" : "", textAlign: isArabic ? "" : "start"}}>
                <div className={`${isArabic ? styles.colSnArabic : styles.colSn} ${styles.fileText}`}>{index + 1}</div>
                <div className={`${styles.colType} ${styles.fileText}`}>
                  {/* {file.attachment_type?.charAt(0).toUpperCase() + file.attachment_type?.slice(1)} */}
                    {translatedOptions.find(opt => opt.value === file.attachment_type)?.label || file.attachment_type}
                </div>
                <div className={`${styles.colName} ${styles.fileText} ${styles.docLink}`}>
                  <label style={{direction: isArabic ? "ltr" : ""}}>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-decoration-none cursor-pointer">
                    {file.document_name}
                  </a>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {tableData ? tableData : null}
      </div>
    </CustomModal>
  )
}
