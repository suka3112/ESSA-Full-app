import React, { useState, useEffect, startTransition, Suspense } from 'react'
import styles from './ViewAdvancePayment.module.scss'
import { NormalButton } from 'components/Common/NormalButton'
import { useNavigate, useParams } from 'react-router-dom'
import { HeaderBar } from 'components/Common/HeaderBar'
import { connect } from 'react-redux'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import {
  getAdvancePaymentById,
  downloadAdvancePaymentCSV,
  sendAdvancePaymentCSV,
  getInvoiceTypes,
  approveRejectAdvancePayment
} from '../../../../api/AdvancePayment'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import { downloadHelper, formatUSDNumber, getEntityId } from '../../../../services/utilities'
import SuccessPopup from 'components/Common/SuccessPopup'
import { useTranslation } from 'react-i18next'
import { FAQS } from 'constants/url'
import { attachmentTypeOptions } from 'services/helpers/constants/common'
import { showToast } from 'redux/actions/toastActions'
import ConfirmationPopup from 'components/Common/ConfirmationPopup'
import RejectionPopup from 'components/Common/RejectionPopup'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import { PageLoader } from 'components/Common/PageLoader'
import DetailItem from 'components/Common/DetailItemCard'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'

const ViewAdvancePaymentComp = ({ showInvoice, userInfo: { userType }, showToast }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState(null)
  const [ShowEmailReport, setShowEmailReport] = useState(false)
  const [ShowDownloadReport, setShowDownloadReport] = useState(false)
  const [tableData, setTableData] = useState([])
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [dateRange, setDateRange] = useState([dayjs(), dayjs()])
  const isDraft = paymentDetails?.status?.Status_classification === 'Draft'

  //buttong states
  const [isApprove, setIsApprove] = useState(false)
  const [isReject, setIsReject] = useState(false)
  const [buttonLogic, setButtonLogic] = useState({})

  const { t, i18n } = useTranslation([
    'advance_payment',
    'logistics_invoice',
    'popup',
    'purchase_order',
    'sidebar',
    'vendors',
    'toast',
    'non_po_based_invoices'
  ])
   const isArabic = i18n.language === 'ar'

   const translatedOptions  = [
    { label: t('advance_payment:proforma_invoice'), value: 'Proforma Invoice' },
    { label: t('non_po_based_invoices:delivery_note'), value: 'delivery note' },
    { label: t('non_po_based_invoices:shipping_documents'), value: 'shipping documents' },
    { label: t('non_po_based_invoices:others'), value: 'others' }
  ]

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await getAdvancePaymentById(id, { entity_id: getEntityId() })
      setPaymentDetails(res?.data?.data?.payments)
      setButtonLogic(res?.data?.data?.buttons_logic || {})
    } catch (error) {
      toast.error(t('failedToLoadPaymentDetails'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  //BUtton API call
  const handleConfirm = (data) => {
    let body = {
      updatedId: paymentDetails?.ID,
      isApproved: isApprove ? true : false,
      rejectionReason: !isReject ? '' : data?.reasonOfRejection
    }

    approveRejectAdvancePayment(body)
      .then((res) => {
        setIsApprove(false)
        setIsReject(false)

        if (isApprove) {
          showToast(t('toast:successTitle'), t('advancePaymentApprovedSuccessfully'), 'success')
        } else {
          showToast(t('toast:successTitle'), t('advancePaymentRejected'), 'success')
        }
        fetchData()
      })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message || t('error'))
      })
  }

  const handleEdit = () => {
    navigate(`/${userType}/advance-payment/edit/${id}`, {
      state: { userData: paymentDetails, isEdit: true, isBack: true }
    })
  }

  const renderActionButtons = () => (
    <div className="d-flex gap-2">
      {(userType === VENDOR_USER_TYPE || userType === ADMIN_USER_TYPE) && isDraft && (
        <NormalButton
          label={t('edit')}
          isPrimary
          customClass="px-3"
          onClick={handleEdit}
          disabled={loading}
        />
      )}
      {/* {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) && ( */}
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
            label={t('Awaitingapproval')}
            isPrimary
            customClass="px-3"
            onClick={() => setIsApprove(true)}
          />
        )}
      </div>
      {/* )} */}
    </div>
  )

  const renderDetailsSection = () => (
    <div className={styles.userInputContainer}>
      <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-6`}>
        <div className={styles.userInputContainerInner}>
          <div className={styles.inputAns}>
            {userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE ? (
              <>
                <DetailItem
                  label={`${t('vendorCode')}`}
                  value={paymentDetails?.vendorInfo?.Vendor_SAP_Code || '--'}
                />
                <DetailItem
                  label={`${t('vendorName')}`}
                  value={paymentDetails?.vendorInfo?.Vendor_Name_EN || '--'}
                />
              </>
            ) : (
              ''
            )}
            <DetailItem
              label={`${t('AdvancePaymentNo')}`}
              value={paymentDetails?.Advance_payment_code || '--'}
            />
            {paymentDetails?.Type_of_invoice === 1 && (
              <DetailItem
                label={t('POBasedNo')}
                value={
                  <TooltipWrapper
                    tooltipMessage={
                      paymentDetails?.advance_po_mappings?.length
                        ? paymentDetails.advance_po_mappings.map((po) => po.PO_Header_Id).join(', ')
                        : '-'
                    }>
                    <span>
                      {paymentDetails?.advance_po_mappings?.length
                        ? paymentDetails.advance_po_mappings.map((po) => po.PO_Header_Id).join(', ')
                          .length > 40
                          ? `${paymentDetails.advance_po_mappings
                            .map((po) => po.PO_Header_Id)
                            .join(', ')
                            .slice(0, 40)}...`
                          : paymentDetails.advance_po_mappings
                            .map((po) => po.PO_Header_Id)
                            .join(', ')
                        : '--'}
                    </span>
                  </TooltipWrapper>
                }
              />
            )}

            <DetailItem
              label={`${t('submissionDate')}`}
              value={
                paymentDetails?.Submitted_Date
                  ? dayjs(paymentDetails?.Submitted_Date).format('DD/MM/YYYY')
                  : '--'
              }
            />
            <DetailItem
              label={t('paymentAdvice.text')}
              value={paymentDetails?.Payment_Advice || '--'}
            />
            <DetailItem
              label={t('non_po_based_invoices:remarks.text')}
              value={paymentDetails?.Remarks || '--'}
            />
          </div>
        </div>
      </div>
      <div className='col-6'>
        <div className={styles.userInputContainerInner} style={{paddingRight: isArabic ? '20px' : '0px'}}>
          <div className={styles.inputAns}>
            <DetailItem
              label={t('ProformaInvoiceNo')}
              value={paymentDetails?.Performa_Invoice_Number || '--'}
            />
            <DetailItem
              label={`${t('purchase_order:currency.text')}`}
              value={paymentDetails?.Currency || '--'}
            />
            <DetailItem
              label={`${t('advancePaymentValue')}`}
              value={paymentDetails?.Value != null ? formatUSDNumber(paymentDetails?.Value) : '--'}
            />
            <DetailItem
              label={`${t('paymentStatus.text')}`}
              value={paymentDetails?.Payment_Status || '--'}
            />
            <DetailItem
              label={`${t('costResponsible.text')}`}
              value={paymentDetails?.cr_person_data?.Employee_Name || '--'}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderDocumentsTable = () => (
    <div className={styles.attachmentFinContainer}>
      <div className={`${styles.attachmentFinRow} ${styles.header}`}>
        <label className="fw-semibold">{t('SNo')}</label>
        <label className="fw-semibold">{t('AttachmentType')}</label>
        <label className="fw-semibold">{t('DocumentName')}</label>
      </div>

      {paymentDetails?.upload_files?.length > 0 ? (
        paymentDetails.upload_files.map((file, index) => {
          const splitName = file.Upload_files?.split('/').pop()
          const fileName = file?.File_name?.trim() ? file.File_name : splitName;
          return (
            <div key={index} className={styles.attachmentFinRow}>
              <label>{index + 1}</label>
              <label>
                {/* {file.Attachment_type?.charAt(0).toUpperCase() + file.Attachment_type?.slice(1) ||
                  'N/A'} */}
                   {translatedOptions.find(opt => opt.value === file.Attachment_type)?.label || file.Attachment_type}
              </label>
              <div>
              <label style={{direction: isArabic ? "ltr" : ""}}>
                <a style={{fontSize: '1rem'}}
                  href={file.Upload_files}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.docLink} text-decoration-none cursor-pointer`}>
                  {fileName || '--'}
                </a>
              </label>
              </div>
            </div>
          )
        })
      ) : (
        <div className={styles.attachmentFinRow}>
          <label>1</label>
          <label>N/A</label>
          <label>N/A</label>
        </div>
      )}
    </div>
  )

  return (
    <LeftPageContainer>
      {loading ? (
        <div className="no-data-container-view">
          <PageLoader />
        </div>
      ) : (
        <>
          <div className="">
            {emailSuccessPopup && (
              <SuccessPopup
                open={emailSuccessPopup}
                successMsg={t('popup:emailReportSuccess')}
                onClose={() => setEmailSuccessPopup(false)}
              />
            )}
            {true ? (
              <>
                <HeaderBar
                  title={`${t('sidebar:advancePayment')} - ${paymentDetails?.Advance_payment_code || id
                    }`}
                  slug={`${t('sidebar:home')} / ${t('sidebar:advancePayment')} / ${t(
                    'Details'
                  )} - ${paymentDetails?.Advance_payment_code || id}`}
                  statusTag={paymentDetails?.status?.Status_classification || ' '}>
                  {renderActionButtons()}
                </HeaderBar>
                {renderDetailsSection()}
                {renderDocumentsTable()}
                {isApprove && (
                  <ConfirmationPopup
                    open={isApprove}
                    confirmTxt={t('AreYouSureYouWantToApproveTheAdvancePayment')}
                    onClose={() => setIsApprove(false)}
                    onConfirm={handleConfirm}
                  />
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
              </>
            ) : (
              ''
            )}
          </div>
        </>
      )}
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

const mapDispatchToProps = { showToast }
export default connect(mapStateToProps, mapDispatchToProps)(ViewAdvancePaymentComp)
