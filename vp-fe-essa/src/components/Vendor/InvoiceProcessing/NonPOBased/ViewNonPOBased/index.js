import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './ViewNonPOBased.module.scss'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import { connect } from 'react-redux'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { useTranslation } from 'react-i18next'
import { getNonPOInvoiceById } from 'api/NonPOBased'
import moment from 'moment'
import { NormalButton } from 'components/Common'
import { attachmentTypeOptions } from 'services/helpers/constants/common'
import { PageLoader } from 'components/Common/PageLoader'
import DetailItem from 'components/Common/DetailItemCard'

const ViewNonPOBasedComp = ({ userInfo: { userType } }) => {
  const { t, i18n } = useTranslation([
    'non_po_based_invoices',
    'logistics_invoice',
    'purchase_order',
    'sidebar',
    'non_po_based_report',
    'advance_payment',
    'po_based_report'
  ])
  const isArabic = i18n.language === 'ar'
  const [invoiceData, setInvoiceData] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search);
  const [isLoading, setIsLoading] = useState(true)
  const invoiceNumber = searchParams.get('no')
  const isDraft = invoiceData?.status?.Status_classification === 'Draft'

 const getAttachmentLabelWithTranslation = (value, t) => {
    switch (value) {
      case 'invoice':
        return t('invoice');
      case 'delivery note':
        return t('delivery_note');
      case 'shipping documents':
        return t('shipping_documents');
      case 'others':
        return t('others');
      default:
        return value;
    }
  };
  const translatedOptions = attachmentTypeOptions?.map(option => ({
  label: getAttachmentLabelWithTranslation(option?.value, t),
  value: option?.value
}));

  useEffect(() => {
    if (invoiceNumber) {
      fetchInvoiceById()
    }
  }, [invoiceNumber])

  const fetchInvoiceById = () => {
    setIsLoading(true)
    const query = {
      id: invoiceNumber
    }
    getNonPOInvoiceById(query)
      .then((res) => {
        setInvoiceData(res?.data?.data)
      })
      .catch((err) => {
        console.error(err)
      }).finally(() => {
        setIsLoading(false)
      })
  }

  // Additional Finance Section ( Attachment Document Details)
  const financeDocumentSection = (
    <div className={styles.attachmentFinContainer}>
      <div className={`${styles.attachmentFinRow} ${styles.header}`}>
        <label className="fw-semibold">{t('advance_payment:SNo')}</label>
        <label className="fw-semibold">{t('advance_payment:AttachmentType')}</label>
        <label className="fw-semibold">{t('advance_payment:DocumentName')}</label>
      </div>

      {invoiceData?.upload_files?.length > 0 ? (
        invoiceData.upload_files.map((file, index) => {
          const splitName = file.Upload_files?.split('/').pop();
          const fileName = file?.File_name?.trim() ? file.File_name : splitName;
          return (
            <div key={index} className={styles.attachmentFinRow}>
              <label>{index + 1}</label>
              {/* <label>{attachmentTypeOptions.find(opt => opt.value === file.Attachment_type)?.label || file.Attachment_type}</label> */}
            <label>
  {translatedOptions.find(opt => opt.value === file.Attachment_type)?.label || file.Attachment_type}
</label>
<div>
              <label style={{direction: isArabic ? "ltr" : ""}}>
              <a
                href={file.Upload_files}
                target="_blank"
                rel="noopener noreferrer"
                className={` text-decoration-none cursor-pointer`}
              >
                {fileName || 'N/A'}
              </a>
              </label>
              </div>
            </div>
          );
        })
      ) : (
        <div className={styles.attachmentFinRow}>
          <label>1</label>
          <label>N/A</label>
          <label>N/A</label>
        </div>
      )}
    </div>
  );



  const businessContent = (
    <div className={styles.userInputContainer}>
      {/* Column 1 */}
      <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-4`}>
        <div className={styles.userInputContainerInner}>
          <div className={styles.inputAns}>
            <DetailItem label={t('advance_payment:vendorName')} customClass={styles.valueWidth} value={invoiceData?.vendorDetails?.Vendor_Name_EN || '--'} />
            <DetailItem label={t('advance_payment:vendorCode')} value={invoiceData?.vendorDetails?.Vendor_SAP_Code || '--'} />
            <DetailItem label={t('vendorInvoiceNumber.text')} value={invoiceData?.InvNo || '--'} />
            <DetailItem label={t('submittedDate.text')} value={invoiceData?.Submitted_Date ? moment(invoiceData.Submitted_Date).format('DD/MM/YYYY') : '--'} />
            <DetailItem label={t('invoiceDate.text')} value={invoiceData?.InvDt ? moment(invoiceData.InvDt).format('DD/MM/YYYY') : 'N/A'} />
            <DetailItem label={t('currency.text')} value={invoiceData?.InvCurr || '--'} />
            <DetailItem label={t('businessContact.text')} value={invoiceData?.cr_person?.Name || '--'} />
            <DetailItem label={t('natureOfExpenses.text')} value={invoiceData?.natureOfExpenses?.Description_En || '--'} />
          </div>
        </div>
      </div>

      {/* Column 2 */}
      <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-4`} style={{ width: '32.33%' }}>
        <div className={styles.userInputContainerInner}>
          <div className={styles.inputAns}>
            <DetailItem label={t('po_based_report:invoiceAccDocumentNumber.text')} value={invoiceData?.Invoice_acc_doc_number || '--'} />
            <DetailItem label={t('non_po_based_report:invoicePostingDate.text')} value={invoiceData?.Posting_Date ? moment(invoiceData?.Posting_Date).format('DD/MM/YYYY') : '--'} />

            <DetailItem label={t('non_po_based_report:paymentStatus.text')} value={invoiceData?.Payment_Status || '--'} />
            <DetailItem label={t('non_po_based_report:createdBy.text')} value={invoiceData?.created_person?.Name || '--'} />
          </div>
        </div>
      </div>

      {/* Column 3 */}
      <div className={`col-4`} style={{ width: '32.33%' }}>
        <div className={styles.userInputContainerInner}>
          <div className={styles.inputAns}>
            <DetailItem label={t('totalInvoiceAmount.text')} value={
              invoiceData?.total_amount !== undefined && invoiceData?.total_amount !== null && !isNaN(invoiceData?.total_amount)
                ? Number(invoiceData.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
                : invoiceData?.InvAmt !== undefined && invoiceData?.InvAmt !== null && !isNaN(invoiceData?.InvAmt)
                  ? Number(invoiceData.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : '--'
            } />
            <DetailItem label={t('non_po_based_report:taxRate.text')} value={
              invoiceData?.Tax_percentage === 0
                ? '0'
                : invoiceData?.Tax_percentage != null
                  ? `${invoiceData.Tax_percentage}%`
                  : '--'
            } />
            <DetailItem label={t('totalTaxAmount.text')} value={
              invoiceData?.Tax_amount !== undefined && invoiceData?.Tax_amount !== null && !isNaN(invoiceData?.Tax_amount)
                ? Number(invoiceData.Tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '--'
            } />
            <DetailItem label={t('paymentTerms.text')} customClass={styles.valueWidth} value={invoiceData?.Payment_Terms || '--'}  valueStyle={{direction: isArabic ? "ltr" : "", textAlign: isArabic ? "end" : ""}}/>
            <DetailItem label={t('non_po_based_report:invoiceDueDate.text')} value={invoiceData?.Invoice_Due_Date ? moment(invoiceData.Invoice_Due_Date).format('DD/MM/YYYY') : '--'} />
            <DetailItem label={t('purchase_order:referenceNo')} value={invoiceData?.Reference_No || '--'} />
            <DetailItem label={t('remarks.text')} value={invoiceData?.Remarks || '--'} />
          </div>
        </div>
      </div>
    </div>
  )


  const adminContent = (
    <div className={styles.userInputContainer}>
      {/* Column 1 */}
      <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-6`}>
        <div className={styles.userInputContainerInner}>
          <div className={styles.inputAns}>
            <DetailItem label={t('advance_payment:vendorName')} value={invoiceData?.vendorDetails?.Vendor_Name_EN || '--'} />
            <DetailItem label={t('advance_payment:vendorCode')} value={invoiceData?.vendorDetails?.Vendor_SAP_Code || '--'} />
            <DetailItem label={t('vendorInvoiceNumber.text')} value={invoiceData?.InvNo || '--'} />
            <DetailItem label={t('invoiceDate.text')} value={invoiceData?.InvDt ? moment(invoiceData.InvDt).format('DD/MM/YYYY') : '--'} />
            <DetailItem label={t('non_po_based_report:createdBy.text')} value={invoiceData?.created_person?.Name || '--'} />
            {/* <DetailItem label={t('non_po_based_report:createdDate')} value={invoiceData?.CreatedDt ? moment(invoiceData.CreatedDt).format('DD/MM/YYYY') : '--'} /> */}
            <DetailItem label={t('submittedDate.text')} value={invoiceData?.Submitted_Date ? moment(invoiceData.Submitted_Date).format('DD/MM/YYYY') : '--'} />
            <DetailItem label={t('currency.text')} value={invoiceData?.InvCurr || '--'} />
            <DetailItem label={t('totalInvoiceAmount.text')} value={
              invoiceData?.total_amount !== undefined && invoiceData?.total_amount !== null && !isNaN(invoiceData?.total_amount)
                ? Number(invoiceData.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
                : invoiceData?.InvAmt !== undefined && invoiceData?.InvAmt !== null && !isNaN(invoiceData?.InvAmt)
                  ? Number(invoiceData.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : '0.00'
            } />
            <DetailItem label={t('non_po_based_report:taxRate.text')} value={
              invoiceData?.Tax_percentage === 0
                ? '0'
                : invoiceData?.Tax_percentage != null
                  ? `${invoiceData.Tax_percentage}%`
                  : '--'
            } />
            <DetailItem label={t('totalTaxAmount.text')} value={
              invoiceData?.Tax_amount !== undefined && invoiceData?.Tax_amount !== null && !isNaN(invoiceData?.Tax_amount)
                ? Number(invoiceData.Tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '0.00'
            } />

          </div>
        </div>
      </div>

      {/* Column 2 */}
      {/* <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-4`} style={{ width: '32.33%' }}>
        <div className={styles.userInputContainerInner}>
          <div className={styles.inputAns}>

            
          
          </div>
        </div>
      </div> */}

      {/* Column 3 */}
      <div className={`col-6 ml-1`} style={{ width: '49.33%' }}>
        <div className={styles.userInputContainerInner}>
          <div className={styles.inputAns}>
            <DetailItem label={t('businessContact.text')} value={invoiceData?.cr_person?.Name || '--'} />

            <DetailItem label={t('paymentTerms.text')} customClass={styles.valueWidth} value={invoiceData?.Payment_Terms || '--'} />
            <DetailItem label={t('remarks.text')} value={invoiceData?.Remarks || '--'} />
            <DetailItem label={t('po_based_report:invoiceAccDocumentNumber.text')} value={invoiceData?.Invoice_acc_doc_number || '--'} />
            <DetailItem label={t('non_po_based_report:invoicePostingDate.text')} value={invoiceData?.Posting_Date ? moment(invoiceData?.Posting_Date).format('DD/MM/YYYY') : '--'} />
            <DetailItem label={t('non_po_based_report:invoiceDueDate.text')} value={invoiceData?.Invoice_Due_Date ? moment(invoiceData.Invoice_Due_Date).format('DD/MM/YYYY') : '--'} />
            <DetailItem label={t('non_po_based_report:paymentStatus.text')} value={invoiceData?.Payment_Status || '--'} />
            <DetailItem label={t('advance_payment:paymentAdvice.text')} value={invoiceData?.Payment_Advice || '--'} />
            <DetailItem label={t('natureOfExpenses.text')} value={invoiceData?.natureOfExpenses?.Description_En || '--'} />
          </div>
        </div>
      </div>
    </div>
  )
  const vendorContent = (
    <div className={styles.userInputContainer}>
      {/* Column 1 */}
      <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-6`}>
        <div className={styles.userInputContainerInner}>
          <div className={styles.inputAns}>

            <DetailItem label={t('vendorInvoiceNumber.text')} value={invoiceData?.InvNo || '--'} />
            <DetailItem label={t('invoiceDate.text')} value={invoiceData?.InvDt ? moment(invoiceData.InvDt).format('DD/MM/YYYY') : '--'} />
            <DetailItem label={t('non_po_based_report:createdBy.text')} value={invoiceData?.created_person?.Name || '--'} />
            {/* <DetailItem label={t('non_po_based_report:createdDate')} value={invoiceData?.CreatedDt ? moment(invoiceData.CreatedDt).format('DD/MM/YYYY') : '--'} /> */}
            <DetailItem label={t('submittedDate.text')} value={invoiceData?.Submitted_Date ? moment(invoiceData.Submitted_Date).format('DD/MM/YYYY') : '--'} />
            <DetailItem label={t('currency.text')} value={invoiceData?.InvCurr || '--'} />
            <DetailItem label={t('totalInvoiceAmount.text')} value={
              invoiceData?.total_amount !== undefined && invoiceData?.total_amount !== null && !isNaN(invoiceData?.total_amount)
                ? Number(invoiceData.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
                : invoiceData?.InvAmt !== undefined && invoiceData?.InvAmt !== null && !isNaN(invoiceData?.InvAmt)
                  ? Number(invoiceData.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : '0.00'
            } />
            <DetailItem label={t('non_po_based_report:taxRate.text')} value={
              invoiceData?.Tax_percentage === 0
                ? '0'
                : invoiceData?.Tax_percentage != null
                  ? `${invoiceData.Tax_percentage}%`
                  : '--'
            } />
            <DetailItem label={t('totalTaxAmount.text')} value={
              invoiceData?.Tax_amount !== undefined && invoiceData?.Tax_amount !== null && !isNaN(invoiceData?.Tax_amount)
                ? Number(invoiceData.Tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '0.00'
            } />
            <DetailItem label={t('businessContact.text')} value={invoiceData?.cr_person?.Name || '--'} />

          </div>
        </div>
      </div>


      {/* Column 3 */}
      <div className={`col-6 ml-1`} style={{ width: '49.33%' }}>
        <div className={styles.userInputContainerInner}>
          <div className={styles.inputAns}>
            <DetailItem label={t('paymentTerms.text')} value={invoiceData?.Payment_Terms || '--'} />
            <DetailItem label={t('remarks.text')} value={invoiceData?.Remarks || '--'} />
            <DetailItem label={t('po_based_report:invoiceAccDocumentNumber.text')} value={invoiceData?.Invoice_acc_doc_number || '--'} />
            <DetailItem label={t('non_po_based_report:invoicePostingDate.text')} value={invoiceData?.Posting_Date ? moment(invoiceData?.Posting_Date).format('DD/MM/YYYY') : '--'} />
            <DetailItem label={t('non_po_based_report:invoiceDueDate.text')} value={invoiceData?.Invoice_Due_Date ? moment(invoiceData.Invoice_Due_Date).format('DD/MM/YYYY') : '--'} />
            <DetailItem label={t('non_po_based_report:paymentStatus.text')} value={invoiceData?.Payment_Status || '--'} />
            <DetailItem label={t('advance_payment:paymentAdvice.text')} value={invoiceData?.Payment_Advice || '--'} />
            <DetailItem label={t('natureOfExpenses.text')} value={invoiceData?.natureOfExpenses?.Description_En || '--'} />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <LeftPageContainer>
      {
        isLoading ? <div className="no-data-container-view">
          <PageLoader />

        </div> : <>
          {/* Header */}
          <div className={styles.poContainer}>
            <HeaderBar
              title={`${t('purchase_order:invoiceDetails')} - ${invoiceData?.InvNo}`}
              slug={`${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t(
                'sidebar:nonPoBased'
              )} / ${t('purchase_order:invoiceDetails')} - ${invoiceData?.InvNo}`}
              statusTag={invoiceData?.status?.Status_classification}>
              {isDraft && (
                <NormalButton
                  label={t('advance_payment:edit')}
                  isPrimary
                  customClass="px-5"
                  onClick={() =>
                    navigate(
                      `/${userType}/invoice-processing/non-po-based/invoice?id=${invoiceData?.ID}`
                    )
                  }
                />
              )}
            </HeaderBar>
          </div>

          {/* User Input Section */}

          {userType === VENDOR_USER_TYPE && vendorContent}
          {userType === ADMIN_USER_TYPE && adminContent}
          {(userType === FINANCE_USER_TYPE || userType === BUSINESS_USER_TYPE) && adminContent}

          {/* Finance Document Section */}
          {(userType === VENDOR_USER_TYPE ||
            userType === FINANCE_USER_TYPE ||
            userType === BUSINESS_USER_TYPE ||
            userType === ADMIN_USER_TYPE) &&
            financeDocumentSection}
        </>}
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(ViewNonPOBasedComp)
