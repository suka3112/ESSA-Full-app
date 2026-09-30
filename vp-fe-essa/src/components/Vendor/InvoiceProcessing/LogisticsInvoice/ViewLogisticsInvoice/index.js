import React, { Suspense, useEffect, useState } from 'react'
import styles from './ViewLogisticsInvoice.module.scss'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { approveRejectLogistics, getLogisticInvoiceById } from 'api/LogisticInvoice'
import moment from 'moment'
import { connect } from 'react-redux'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { NormalButton } from 'components/Common'
import { EDIT_LOGISTICS_INVOICE, LOGISTICS_INVOICE } from 'constants/url'
import RejectionPopup from 'components/Common/RejectionPopup'
import ConfirmationPopup from 'components/Common/ConfirmationPopup'
import { showToast } from 'redux/actions/toastActions'
import DownloadLink from 'components/Common/DownloadLink'
import { toast } from 'react-toastify'
import DetailItem from 'components/Common/DetailItemCard'

const ViewLogisticsInvoiceComp = ({ userInfo: { userType }, showToast }) => {
  const { t, i18n } = useTranslation([
    'logistics_invoice',
    'purchase_order',
    'advance_payment',
    'po_based_report',
    'toast',
    'non_po_based_report',
    'vendors'
  ])
   const isArabic = i18n.language === 'ar'
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const invoiceNumber = searchParams.get('id')

  const [invoiceData, setInvoiceData] = useState(null)
  const [isApprove, setIsApprove] = useState(false)
  const [isReject, setIsReject] = useState(false);
  const [updatedId, setUpdatedId] = useState('')
  const [buttonLogic, setButtonLogic] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (invoiceNumber) fetchInvoiceById()
  }, [invoiceNumber])

  const fetchInvoiceById = () => {
    getLogisticInvoiceById({ id: invoiceNumber })
      .then((res) => {
        setInvoiceData(res.data.data)
        setButtonLogic(res?.data?.data?.buttons_logic || {})
      })
      .catch(console.error)
  }

  // const renderDetails = (data) => (
  //   <div className={styles.userInputContainerInner}>
  //     <div className={styles.inputQues}>
  //       {data.map((item, index) => (
  //         <label key={index}>{item.question}</label>
  //       ))}
  //     </div>
  //     <div className={styles.inputAns}>
  //       {data.map((item, index) => (
  //         <label key={index}>{item.answer}</label>
  //       ))}
  //     </div>
  //   </div>
  // )

  const renderDetails = (data) => (
    <div className={styles.userInputContainerInner}>
      {data.map((item, index) => (
        <DetailItem label={item.question} value={item.answer || "--"} key={index} />
        
      ))}
    </div>
  );


  const handleConfirm = (data) => {
    setIsLoading(true)
    let body = {
      updatedId: invoiceNumber,
      isApproved: isApprove ? true : false,
      rejectionReason: !isReject ? '' : data?.reasonOfRejection
    }

    approveRejectLogistics(body)
      .then((res) => {
        setIsApprove(false)
        setIsReject(false)

        if (isApprove) {
          showToast(
            t('logistics_invoice:approvedSuccessfully'),
            t('logistics_invoice:logisticsInvoiceApprovedSuccessfully'),
            'success'
          )
        } else {
          showToast(
            t('logistics_invoice:invoiceRejected'),
            t('logistics_invoice:logisticsInvoiceRejected'),
            'success'
          )
        }
        fetchInvoiceById()
      })
      .catch((err) => {
        console.error(err)
        setIsApprove(false)
        setIsReject(false)
        toast.error(err?.response?.data?.message || t('toast:errorTitle'),)
        // showToast(t('toast:errorTitle'), `${err?.response?.data?.message}`, 'error')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }
  const getPaymentStatusClass = (status) => {
    if (!status) return ''
    if (status.toLowerCase() === 'pending') return styles.statusPending
    if (status.toLowerCase() === 'paid') return styles.statusPaid
    return ''
  }
  const formatDate = (date) => (date ? moment(date).format('DD/MM/YYYY') : '--')

  const businessAndAdminContent = (
    <div className={styles.userInputContainer}>
      <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-6`}>
        <div className='detailValueContainer'>
        {renderDetails([
          {
            question: `${t('advance_payment:vendorName')}`,
            answer: invoiceData?.vendorDetails?.Vendor_Name_EN || '--'
          },
          {
            question: `${t('advance_payment:vendorCode')}`,
            answer: invoiceData?.vendorDetails?.Vendor_SAP_Code || '--'
          },
          {
            question: `${t('invoiceNo')}.`,
            answer: invoiceData?.InvNo || '--'
          },
          {
            question: `${t('po_based_report:invoiceDate.text')}`,
            answer: formatDate(invoiceData?.InvDt)
          },
          {
            question: `${t('po_based_report:invoiceValue.text')}`,
            answer: invoiceData?.InvAmt !== undefined && invoiceData?.InvAmt !== null ? Number(invoiceData?.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'
          }
        ])}
        </div>
      </div>
      <div className={`col-6`} style={{paddingRight: isArabic ? '20px' : ''}}>
             <div className='detailValueContainer'>
        {renderDetails([
          {
            question: `${t('accDocumentNo')}`,
            answer: invoiceData?.Invoice_acc_doc_number || '--'
          },
          {
            question: `${t('costResponsible.text')}`,
            answer: invoiceData?.cr_person_data?.Employee_Name || '--'
          },
          {
            question: `${t('advance_payment:currency.text')}`,
            answer: invoiceData?.InvCurr || '--'
          },
          {
            question: `${t('non_po_based_report:invoiceDueDate.text')}`,
            answer: formatDate(invoiceData?.Invoice_Due_Date)
          },
          {
            question: `${t('paymentStatus.text')}`,
            answer: (
              <span className={getPaymentStatusClass(invoiceData?.Payment_Status)}>
                {invoiceData?.Payment_Status || '--'}
              </span>
            )
          },
          { question: `${t('paymentAdvice.text')}`, answer: invoiceData?.Payment_Advice || '--' },

        ])}
      </div>
      </div>
    </div>
  )

  const vendorContent = (
    <div className={styles.userInputContainer}>
      <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-6`}>
        <div className='detailValueContainer'>
        {renderDetails([
          {
            question: `${t('invoiceNo')}.`,
            answer: invoiceData?.InvNo 
          },
          {
            question: `${t('po_based_report:invoiceDate.text')}`,
            answer: formatDate(invoiceData?.InvDt)
          },
          {
            question: `${t('po_based_report:invoiceValue.text')}`,
            answer: invoiceData?.InvAmt !== undefined && invoiceData?.InvAmt !== null ? Number(invoiceData?.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'
          },
          {
            question: `${t('accDocumentNo')}`,
            answer: invoiceData?.Invoice_acc_doc_number || '--'
          },
          { question: `${t('purchase_order:remarks')}`, answer: invoiceData?.Remarks || '--' }
        ])}
        </div>
      </div>
      <div className={`col-6`}>
                <div className='detailValueContainer'>
        {renderDetails([
          {
            question: `${t('costResponsible.text')}`,
            answer: invoiceData?.cr_person_data?.Employee_Name || '--'
          },
          {
            question: `${t('advance_payment:currency.text')}`,
            answer: invoiceData?.InvCurr || '--'
          },
          {
            question: `${t('non_po_based_report:invoiceDueDate.text')}`,
            answer: formatDate(invoiceData?.Invoice_Due_Date)
          },
          {
            question: `${t('paymentStatus.text')}`,
            answer: (
              <span className={getPaymentStatusClass(invoiceData?.Payment_Status)}>
                {invoiceData?.Payment_Status || '--'}
              </span>
            )
          },
                    { question: `${t('paymentAdvice.text')}`, answer: invoiceData?.Payment_Advice || '--' },

        ])}
        </div>
      </div>
      {/* <div className={`col-4`} style={isArabic ? {paddingRight: '10px'} : {}}>
        {renderDetails([
          { question: `${t('paymentAdvice.text')}`, answer: invoiceData?.Payment_Advice || '-' },
          
          // { question: 'Due Date:', answer: formatDate(invoiceData?.Invoice_Due_Date) }
        ])}
      </div> */}
    </div>
  )

  const financeContent = (
    <div className={styles.userInputContainer}>
      <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-4`}>

        {renderDetails([
          {
            question: `${t('advance_payment:vendorName')}`,
            answer: invoiceData?.vendorDetails?.Vendor_Name_EN || 'N/A'
          },
          {
            question: `${t('advance_payment:vendorCode')}`,
            answer: invoiceData?.vendorDetails?.Vendor_SAP_Code || 'N/A'
          },
          {
            question: `${t('invoiceNo')}`,
            answer: invoiceData?.InvNo || 'N/A'
          },
          {
            question: `${t('po_based_report:invoiceDate.text')}`,
            answer: formatDate(invoiceData?.InvDt)
          },
          {
            question: `${t('po_based_report:invoiceValue.text')}`,
            answer: invoiceData?.InvAmt || 'N/A'
          },
          {
            question: `${t('purchase_order:uploadedXlsFile')}`,
            answer: invoiceData?.InvAmt || 'N/A'
          },
          {
            question: `${t('purchase_order:uploadedZipFile')}`,
            answer: invoiceData?.InvAmt || 'N/A'
          },
          {
            question: `${t('purchase_order:uploadInvoice')}`,
            answer: invoiceData?.InvAmt || 'N/A'
          }
        ])}
      </div>
      <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-4`}>
        {renderDetails([
          {
            question: `${t('accDocumentNo')}`,
            answer: invoiceData?.Invoice_acc_doc_number || '--'
          },
          {
            question: `${t('costResponsible.text')}`,
            answer: invoiceData?.cr_person_data?.Employee_Name || 'N/A'
          },
          { question: `${t('currency.text')}`, answer: invoiceData?.InvCurr || 'N/A' },
          {
            question: `${t('non_po_based_report:invoiceDueDate.text')}`,
            answer: formatDate(invoiceData?.Invoice_Due_Date)
          },
          {
            question: `${t('paymentStatus.text')}`,
            answer: (
              <span className={getPaymentStatusClass(invoiceData?.Payment_Status)}>
                {invoiceData?.Payment_Status || 'N/A'}
              </span>
            )
          },
          {
            question: `RFI ${t('purchase_order:remarks')}`,
            answer: invoiceData?.rfiRemarks || 'N/A'
          }
        ])}
      </div>
      <div className={`col-4`} style={isArabic ? {paddingRight: '10px'} : {}}>
        {renderDetails([
          { question: `${t('paymentAdvice.text')}`, answer: invoiceData?.Payment_Advice || '-' },
          { question: `RFI ${t('date')}`, answer: formatDate(invoiceData?.Invoice_Rfi_Date) },
          {
            question: `${t('po_based_report:invoiceDate.text')}`,
            answer: formatDate(invoiceData?.InvDt)
          }
          // { question: 'Due Date:', answer: formatDate(invoiceData?.Invoice_Due_Date) }
        ])}
      </div>
    </div>
  )

  const attachmentSection = (
    <div className={styles.attachmentContainer}>
      {/* Column: S.No */}
      <div className={styles.attachmentDetails}>
        <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:SNo')}</label>
        <label>1</label>
        {invoiceData?.upload_files?.map((_, index) => (
          <label key={index}>{index + 2}</label>
        ))}
      </div>

      <div className={styles.attachmentDetails}>
        <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:AttachmentType')}</label>
        <label>{t('uploadedXLSXFile')}</label>
        {invoiceData?.upload_files?.map((_, index) => (
          <label key={index}>{t('uploadedInvoiceFile')}</label>
        ))}
      </div>

      <div className={styles.attachmentDetails}>
        <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:DocumentName')}</label>
        <label>
          <DownloadLink
            url={invoiceData?.Logistics_XLS}
            fileName={invoiceData?.Original_FileName || 'N/A'}
            className={`${styles.docLink} text-decoration-none cursor-pointer`}>
            {invoiceData?.Original_FileName || 'N/A'}
          </DownloadLink>
        </label>

        {invoiceData?.upload_files?.map((item, index) => {
          const splitName = item?.Upload_files?.split('/').pop()
          const fileName = item?.File_name?.trim() ? item.File_name : splitName;
          return (
            // <label>
            //   <DownloadLink
            //     url={item?.Upload_files}
            //     fileName={fileName}
            //     className={`${styles.docLink} text-decoration-none text-primary cursor-pointer`}>
            //     {fileName || 'N/A'}
            //   </DownloadLink>
            // </label>
             <label key={index}>
                  <a
                    href={item?.Upload_files}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.docLink} text-decoration-none cursor-pointer`}
                  >
                    {fileName || 'N/A'}
                  </a>
            </label>
          )
        })}
      </div>
    </div>
  )

  return (
    <LeftPageContainer>
      <div className={styles.poContainer}>
        <HeaderBar
          title={`${t('purchase_order:invoiceDetails')} - ${invoiceData?.InvNo}`}
          slug={`${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t(
            'sidebar:logistics'
          )} / ${t('purchase_order:invoiceDetails')} - ${invoiceData?.InvNo}`}
          statusTag={invoiceData?.status?.Status_classification}
          >
          {invoiceData?.status?.ID === 77 && (
            <NormalButton
              label={t('advance_payment:edit')}
              isPrimary
              customClass="px-5"
              onClick={() =>
                navigate(`/${userType}${LOGISTICS_INVOICE}/new?id=${invoiceData?.ID}&edit=${true}`)
              }
            />
          )}
          {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) && (
            <div className="d-flex gap-3">
              {buttonLogic?.Reject_Button && (
                <NormalButton
                  label={t('vendors:reject')}
                  rejectBtn
                  customClass="px-3"
                  onClick={() => setIsReject(true)}
                />
              )}
              {buttonLogic?.Approve_Button && (
                <NormalButton
                  label={t('vendors:approve')}
                  isPrimary
                  customClass="px-3"
                  onClick={() => setIsApprove(true)}
                />
              )}
            </div>
          )}
        </HeaderBar>
      </div>

      {userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE
        ? businessAndAdminContent
        : userType === VENDOR_USER_TYPE
          ? vendorContent
          : financeContent}

      {userType === VENDOR_USER_TYPE || (userType === FINANCE_USER_TYPE && attachmentSection)}
      {attachmentSection}

      {isApprove && (
        <Suspense>
          <ConfirmationPopup
            open={isApprove}
            confirmTxt={t('areYouSureWantToApproveThisInvoice')}
            onClose={() => setIsApprove(false)}
            onConfirm={handleConfirm}
            isLoading={isLoading}
          />
        </Suspense>
      )}
      {isReject && (
        <Suspense>
          <RejectionPopup
            open={isReject}
            onClose={() => setIsReject(false)}
            onConfirm={handleConfirm}
          />
        </Suspense>
      )}
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})
const mapDispatchToProps = {
  showToast
}
export default connect(mapStateToProps, mapDispatchToProps)(ViewLogisticsInvoiceComp)
