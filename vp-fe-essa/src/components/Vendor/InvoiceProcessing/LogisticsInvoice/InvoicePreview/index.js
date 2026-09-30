import React, { useState } from 'react'
import CustomModal from 'components/Common/Modal'
import styles from './InvoicePreviewLogistics.module.scss'
import { NormalButton } from 'components/Common'
import { useTranslation } from 'react-i18next'
import { ADMIN_USER_TYPE, BUSINESS_USER_TYPE } from 'constants/userType'
import { useSelector } from 'react-redux'
import DownloadLink from 'components/Common/DownloadLink'
import DetailItem from 'components/Common/DetailItemCard'

export const InvoicePreviewLogistics = ({
  open,
  setNextClick,
  handleSave,
  handleSubmit,
  saved,
  data,
  invoiceFiles,
  isEdit
}) => {


  const { t, i18n } = useTranslation(['purchase_order', 'logistics_invoice', 'sidebar'])
  const isArabic = i18n.language === 'ar'
  const userType = useSelector((state) => state?.userInfo?.userType)
  const handleClose = () => {
    setNextClick(false)
  }

  const modalStyles = {
    minWidth: '85%',
    padding: 0,
    borderRadius: 0,
    padding: 0,
    margin: 0,

  }

  return (
    <>
      <CustomModal open={open} modalStyles={modalStyles}>
        <div className={styles.titleContainer}>
          <div className='d-flex flex-row align-items-center gap-2'>
            <p className={styles.title}>
              {t('sidebar:logistics')} {t('logistics_invoice:invoicePreview')}
            </p>
            {saved && <div className={`px-2 ${styles.savedPill}`}>{t('purchase_order:saved')}</div>}
          </div>
          <div className={styles.dateContainer}>
            {!saved && (
              <NormalButton
                label={t('save')}
                isPrimary
                // customClass={`px-3 ${styles.previewButtons}`}
                customClass="px-3"
                onClick={handleSave}
              />
            )}
            <NormalButton
              label={t('submit')}
              isPrimary
              // customClass={`px-3 ${styles.previewButtons}`}
              customClass="px-3"
              onClick={handleSubmit}
            />
            <NormalButton label={t('close')} outlineBtn customClass="px-3" onClick={handleClose} />
          </div>
        </div>
        <div className={styles.userInputContainerOuter}>
          <div className={styles.userInputContainer}>
            <div className="row">
              <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-6`}>
                <div className='detailValueContainer'>
                  {
                    isEdit && (
                      <DetailItem label={t('logistics_invoice:invoiceNumber')} value={data?.formValues?.vendorName} />
                    )
                  }
                  {
                    !isEdit && (userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) && (
                      <>
                        <DetailItem label={"Vendor Name"} value={data?.formValues?.vendorName} />
                        <DetailItem label={"Vendor Code"} value={data?.vendorCode} />
                      </>
                    )
                  }
                  <DetailItem label={t('uploadedXlsFile')} value={
                    !isEdit ? (
                      <>
                        <a
                          href={URL.createObjectURL(data?.formValues?.attachments?.[0])}
                          target="_blank"
                          className='fileLink'
                          rel="noopener noreferrer">
                          {data?.formValues?.attachments?.[0]?.name || t('noFileUploaded')}
                        </a>
                      </>
                    ) : (

                      <DownloadLink
                        url={data?.formValues?.uploadedXls}
                        fileName={
                          data?.formValues?.uploadedXls
                            ? data?.formValues?.uploadedXls.split('/').pop()
                            : ''
                        }
                        className={"fileLink"}
                        style={{
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          color: 'var(--brand-primary-color, $primary-color)'
                        }}>
                        {data?.formValues?.uploadedXls
                          ? data?.formValues?.uploadedXls.split('/').pop()
                          : t('noFileUploaded')}
                      </DownloadLink>
                    )} />
                  <DetailItem
                    label={t('logistics_invoice:uploadedInvoiceFiles')}
                    value={
                      // if editing, show invoiceFiles from server; otherwise show uploaded File objects
                      isEdit
                        ? (invoiceFiles?.length > 0 ? (
                          invoiceFiles.map((file, idx) => (
                            <div key={idx} className={styles.inputAnsWithLink}>
                              <DownloadLink
                                url={file?.file_url}
                                fileName={file?.document_name}
                                className={'fileLink'}
                              >
                                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                                  {file?.document_name}
                                </span>
                              </DownloadLink>
                            </div>
                          ))
                        ) : (
                          t('noFileUploaded')
                        ))
                        : (data?.formValues?.invoiceFile?.length > 0 ? (
                          data.formValues.invoiceFile.map((file, idx) => (
                            <div key={idx} className={styles.inputAnsWithLink}>
                              <a
                                href={URL.createObjectURL(file)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <p className='fileLink'>{file?.name}</p>
                              </a>
                            </div>
                          ))
                        ) : (
                          t('noFileUploaded')
                        ))
                    }
                  />
                </div>
              </div>
              <div className="col-6 ps-3">
                <div className='detailValueContainer'>

                  <DetailItem label={t('logistics_invoice:costResponsible.text')} value={data?.formValues?.costResponsible || data?.costResponsible || "-"} />
                  {isEdit && (
                    <>
                      <DetailItem label={t('logistics_invoice:paymentStatus.text')} value={data?.formValues?.paymentStatus} />

                      <DetailItem label={t('logistics_invoice:paymentAdvice.text')} value={data?.formValues?.paymentAdvice || '--'} />
                    </>
                  )}
                </div>
              </div>
            </div>
           
          </div>
        </div>
      </CustomModal>
    </>
  )
}
