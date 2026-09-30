import React, { useState } from 'react'
import CustomModal from 'components/Common/Modal'
import { NormalButton } from 'components/Common'
import styles from './InvoiceCreditNote.module.scss'
import { useTranslation } from 'react-i18next'
import { ADMIN_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import dayjs from 'dayjs'
import { connect } from 'react-redux'
import { useTransition } from 'react'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { PageLoader } from 'components/Common/PageLoader'
import DetailItem from 'components/Common/DetailItemCard'

const InvoicePreviewCreditNote = ({
  userInfo: { userType },
  open,
  setNextClick,
  handleSave,
  handleSubmit,
  formData,
  saved, tableData, tableHeaders,
  uploadedFiles,
  tableProps,
  title = 'Credit Note Preview',
}) => {
  const { t ,i18n} = useTranslation('credit_notes', 'purchase_order', 'advance_payment')
     const isArabic = i18n.language === 'ar'
  const [isLoading, setIsLoading] = useState(false)
  const [, startTransition] = useTransition()

  const handleSaveClick = async () => {
    setIsLoading(true)
    try {
      await handleSave({ status: 'Draft' })
      startTransition(() => {
        setNextClick(false)
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitClick = async () => {
    setIsLoading(true)
    try {
      await handleSubmit({ status: 'Submitted' })
      startTransition(() => {
        setNextClick(false)
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    startTransition(() => {
      setNextClick(false)
    })
  }

  const modalStyles = {
    width: '80%',
    height: '80%',
    padding: 0,
    borderRadius: 0
  }


  return (
    <CustomModal open={open} modalStyles={modalStyles}>
      {isLoading && (
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
          }}
        >
          <PageLoader /> {/* Use your existing loader component */}
        </div>
      )}
      <div className={styles.titleContainer}>
        <div className='d-flex flex-row align-items-center gap-2'>
          <p className={styles.title}>{t('creditNotePreview')}</p>
          {saved && (<div className={`px-2 ${styles.savedPill}`}>{t('purchase_order:saved')}</div>)}
        </div>
        <div className={styles.dateContainer}>
          {!saved &&  (
            <NormalButton
              label={t('saveProgress.text')}
              isPrimary
              // customClass="px-3 min-w-[166px]"
               customClass="px-3"
              onClick={handleSaveClick}
              disabled={isLoading}
              loading={isLoading}
            />)}
          <NormalButton
            label={t('submit.text')}
            isPrimary
            // customClass="min-w-[166px]"
             customClass="px-3"
            onClick={handleSubmitClick}
            disabled={isLoading}
            loading={isLoading}
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

      <div className={`p-3 rounded ${styles.userInputContainerOuter}`} style={{ backgroundColor: "#f6f2f2" }}>
        {/* Credit Note Details Section */}
        <div className={`${styles.userInputContainer} mb-3`}>
        <div className={`row p-3`}>
          <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-6 `}>
            <div className='detailValueContainer'>
            {userType !== VENDOR_USER_TYPE && (
            <DetailItem label={t('advance_payment:vendorCode')} value={formData?.VendorCode} />
            )}
            {userType !== VENDOR_USER_TYPE && (
            <DetailItem label={t('advance_payment:vendorName')} value={formData.vendorName} />
            )}
            <DetailItem label={t('creditNoteReference.text')} value={formData?.creditNoteReference || '--'} />
            <DetailItem label={t("invoiceText")} value={formData?.invoiceType === "po" ? "PO Based Invoice" : formData?.invoiceType === "non_po" ? "Non PO Based Invoice" : '--'} />
            {formData?.invoiceType === "non_po" && (
              <DetailItem label={t('nonPoBasedInvoiceHeader.text')} value={Array.isArray(formData?.nonPoBasedInvoice) ? formData.nonPoBasedInvoice.join(', ') : '--'} />
            )}
            {formData?.invoiceType === "po" && (
              <DetailItem label={t('poBasedInvoiceHeader.text')} value={Array.isArray(formData?.poBasedInvoice) ? formData.poBasedInvoice.join(', ') : '--'} />
            )}
            </div>
          </div>
          <div className='col-6'>
          <div className='detailValueContainer'>
            <DetailItem label={t('submissionDate.text')} value={formData?.submissionDate ? dayjs(formData?.submissionDate).format("DD/MM/YYYY") : "--"} />
            <DetailItem label={t('currency.text')} value={formData?.currency || '--'} />
            <DetailItem label={t('creditNoteAmount.text')} value={formData?.creditNoteAmount !== undefined && formData?.creditNoteAmount !== null && !isNaN(formData.creditNoteAmount)
              ? parseFloat(formData.creditNoteAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '0.00'} />
          </div>
         </div>
        </div>
 </div>
        {/* Attachments Section */}
        {(userType === ADMIN_USER_TYPE || userType === VENDOR_USER_TYPE) && (
          <div className={styles.attachmentContainer}>
            <div style={{ display: 'flex', fontWeight: 600, padding: '3px 0' }}>
              <div style={{ width: 100, minWidth: 100, textAlign: 'left',fontWeight:600 }}><p className={styles.title}>{t('srNo')}</p></div>
              <div style={{ flex: 1, minWidth: 100, textAlign: 'left',fontWeight:600  }}><p className={styles.title}>{t('attachmentType.text')}</p></div>
              <div style={{ flex: 2, minWidth: 200, textAlign: isArabic ? 'center' : 'left' , fontWeight:600  }}><p className={styles.title}>{t("po_based_invoices:documentName")}</p></div>
            </div>
            {uploadedFiles?.map((file, index) => (
              <div key={file.id || index} style={{ display: 'flex', alignItems: 'center', padding: '3px 0' }}>
                <div style={{ width: 100, minWidth: 100, textAlign: 'left'}}><label className={styles.detail}>{index + 1}</label></div>
                <div style={{ flex: 1, minWidth: 100, textAlign: 'left'}}><label className={styles.detail}>{file.attachment_type}</label></div>
                <div style={{ flex: 2, minWidth: 200, textAlign: isArabic ? 'center' : 'left', direction : isArabic ? "ltr" : "" }}>
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer" className={'fileLink'} style={{ cursor: 'pointer', textDecoration: 'none', marginRight: isArabic ? "4rem" : ""}}>
                    {file.document_name}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Credit Note Line Items Table */}
        <div className='table-border bg-white overflow-hidden rounded-lg'>
          <TableLayout
            tableHeaders={tableHeaders}
            tableData={tableData}
            {...tableProps}
            emptyMessage={t('noItemsToBeAdded')}
          />
        </div>

      </div>
    </CustomModal>
  )
}
const mapStateToProps = (state) => ({
  userInfo: state.userInfo // Getting userInfo from Redux store
})

export default connect(mapStateToProps)(InvoicePreviewCreditNote)
