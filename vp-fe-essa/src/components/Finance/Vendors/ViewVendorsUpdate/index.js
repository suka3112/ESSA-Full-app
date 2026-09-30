import React, { Suspense, useEffect, useState } from 'react'
import backArrow from '../../../../assets/icons/backArrow.svg'
import styles from './ViewVendorsUpdate.module.scss'
import emailReport from '../../../../assets/icons/emailReport.svg'
import download from '../../../../assets/icons/downloadIcon2.svg'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import Fieldset from 'components/Common/FieldSet'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'
import { approveRejectVendorViewUpdates, emailVendorsUpdatesDetailsReport, exportVendorsUpdateDetails, getVendorsHistory, getVendorsUpdateDetailPage } from 'api/Vendors'
import { toast } from 'react-toastify'
import { showToast } from 'redux/actions/toastActions'
import { downloadFile, getEntityId } from 'services/utilities'
import { ADMIN_USER_TYPE, BUSINESS_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import { HeaderBar } from 'components/Common/HeaderBar'
import { NormalButton } from 'components/Common'
import ConfirmationPopup from 'components/Common/ConfirmationPopup'
import RejectionPopup from 'components/Common/RejectionPopup'
import { connect } from 'react-redux'
import { UtilIcon } from 'components/Common/UtilIcon'
import dayjs from 'dayjs'
import SuccessPopup from 'components/Common/SuccessPopup'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import EmailReportComp from 'components/Vendor/EmailReport'
import FileIcons from 'components/Common/FileIcons'
import { PageLoader } from 'components/Common/PageLoader'
import { useTranslation } from 'react-i18next'
import DetailItem from 'components/Common/DetailItemCard'

const ViewVendorsUpdateComp = ({ setProfileData, userInfo: { userType }, showToast }) => {
  const { t } = useTranslation(['vendors', 'sidebar', 'extension', 'toast'])
  const { id } = useParams()
  const fileFields = [t('licenseFiles'), t('paymentFiles'), t('nationalIdFiles'), t('vatFiles'), t('ndaFiles')]

  //convert URL arrays to Object for FileIcons
  const convertUrlsToFileObjects = (urlArray) => {
    if (!Array.isArray(urlArray)) return []
    
    return urlArray.map((url, index) => ({
      id: index,
      Upload_files: url,
      document_name: url.split('/').pop() || `${t('file')} ${index + 1}`,
      file_type: url.split('.').pop() || t('unknown')
    }))
  }

  const {
    register,
    formState: { errors },
    control
  } = useForm()
  const location = useLocation()
  const headerParams = new URLSearchParams(location.search)
  const referenceNo = headerParams.get('id')
  const vendorProfileID = location.state?.vendorProfileID; 
  
  const [loading, setLoading] = useState(false)
  const [viewDetails, setViewDetails] = useState([])
  const [viewHistoryDetails, setViewHistoryDetails] = useState([])
  const [isApprove, setIsApprove] = useState(false)
  const [isReject, setIsReject] = useState(false)
  const [finalStatus, setFinalStatus] = useState('')
  const [emailReportState, setEmailReportState] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)
  const [downloadDateRange, setDownloadDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [emailReportDateRange, setEmailReportDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [headerDetails, setHeaderDetails] = useState({})
  const [buttonLogic, setButtonLogic] = useState({})
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const HeaderStatus = viewDetails?.status === 5
  const finalApprove = viewDetails?.status === 4 || viewDetails?.status === 5

const activeChangedFields = finalApprove 
  ? viewHistoryDetails?.[0]?.changedFields 
  : viewDetails?.changedFields;


  useEffect(() => {
    if (userType !== VENDOR_USER_TYPE) {
      fetchVendorViewUpdates()
    }
  }, [userType])

  useEffect(() => {
  if (finalApprove) {
    vendorHistoryDetails()
  }
}, [finalApprove])

  const handleDownload = () => {
    setDownloadReport(true)
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  const fetchVendorViewUpdates = () => {
    setLoading(true)
    let query = {
      //   entity_id: getEntityId(),
      vendor_onboardId: referenceNo
    }
    getVendorsUpdateDetailPage(query)
      .then((res) => {
        setViewDetails(res?.data?.data)
        setHeaderDetails(res?.data?.data?.headers_data || {})
        setButtonLogic(res?.data?.data?.buttons_logic || {})
      })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const vendorHistoryDetails = () => {
    setLoading(true)
    let query = {
      vendorId: vendorProfileID
    }

    getVendorsHistory(query)
      .then((res) => {
        setViewHistoryDetails(res?.data?.data)
        // setHeaderDetails(res?.data?.data?.headers_data || {})
        // setButtonLogic(res?.data?.data?.buttons_logic || {})
      })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const handleConfirm = (data) => {
    setIsLoading(true)
    let body = {
      updatedId: headerDetails?.Vendor_Onboard_Id,
      isApproved: isApprove ? true : false,
      Final_Approval: buttonLogic?.Final_Approval,
      rejectionReason: !isReject ? '' : data?.reasonOfRejection
    }

    approveRejectVendorViewUpdates(body)
      .then((res) => {
        setIsApprove(false)
        setIsReject(false)

        if (isApprove) {
          showToast(t('toast:applicationApproved'), t('vendorUpdatesApprovedSuccessfully'), 'success')
          setFinalStatus('approved')
        } else {
          showToast(t('toast:updatesRejected'), t('vendorUpdatesRejected'), 'success')
          setFinalStatus('rejected')
        }
        fetchVendorViewUpdates()
      })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message)
      }).finally(() => {
        setIsLoading(false)
      })
  }
  const downloadCSV = () => {
    const query = {
      mode: "report",
      vendor_onboardId: referenceNo,
      startDate: downloadDateRange[0]?.format('YYYY-MM-DD'),
      endDate: downloadDateRange[1]?.format('YYYY-MM-DD'),
    }
    exportVendorsUpdateDetails(query)
      .then((res) => {
        downloadFile(res?.data, `vendors.csv`)
        handleCloseDownload()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const handleClosePopup = () => {
    setEmailReportState(false)
  }

  const handleSendEmailReport = () => {
    const query = {
      startDate: emailReportDateRange[0].format('YYYY-MM-DD'),
      endDate: emailReportDateRange[1].format('YYYY-MM-DD'),
      vendor_onboardId: referenceNo,
      category: 1,
    }

    emailVendorsUpdatesDetailsReport(query)
      .then(() => {
        setEmailSuccessPopup(true)
        handleClosePopup()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  return (
    <>
    {loading ? (
        <div className="no-data-container-view">
          <PageLoader />
        </div>
      ) : (
    <LeftPageContainer>
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('emailSentSuccessfully')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      {/* Header */}
      <div className={styles.poContainer}>
        <HeaderBar title={viewDetails?.headers_data?.Vendor_SAP_Code} slug={`${t('sidebar:home')} / ${t('vendors')} / ${t('vendorsUpdates')}`}
                          statusTag={
                  HeaderStatus 
                       ? t('extension:rejected') 
                       : buttonLogic?.Approve_Button === false
                       ? t('extension:approved') 
                       : ''
                }
        >
          <div className="d-flex gap-3">
            {buttonLogic?.Reject_Button &&
              <NormalButton
                label={t('reject')}
                rejectBtn
                customClass="px-3"
                onClick={() => setIsReject(true)}
              />
            }
            {
              buttonLogic?.Approve_Button && <NormalButton
                label={t('approve')}
                isPrimary
                customClass="px-3"
                onClick={() => setIsApprove(true)}
              />
            }
          </div>      
        </HeaderBar>
      </div>
      <div className={styles.userInputContainer} style={{padding: '22px'}}>
        <div className={`col-6`}>
          <div className={styles.userInputContainerInner} style={{gap:'30px'}}>
            {/* <div className={styles.inputQues}>
              <label>{t('vendorName')}</label>
              <label>{t('vendorCode')}</label>
              <label>{t('emailId')}</label>
            </div> */}
            <div className={styles.inputAns}>
              <DetailItem label={t('vendorName')} value={headerDetails?.Vendor_Name_EN || '-'} />
              <DetailItem label={t('vendorCode')} value={headerDetails?.Vendor_SAP_Code || '-'} />
              <DetailItem label={t('emailId')} value={headerDetails?.Email || '-'} />
              {/* <label>{headerDetails?.Vendor_Name_EN || '-'}</label>
              <label>{headerDetails?.Vendor_SAP_Code || '-'}</label>
              <label>{headerDetails?.Email || '-'}</label> */}
            </div>
          </div>
        </div>
        <div className={`col-6`}>
          <div className={styles.userInputContainerInner} style={{gap:'30px'}}>
            {/* <div className={styles.inputQues}>
              <label>{t('country')}</label>
              <label>{t('status')}</label>
            </div> */}
            <div className={styles.inputAns}>
              <DetailItem label={t('country')} value={headerDetails?.Country || '-'} />
              <DetailItem label={t('status')} value={headerDetails?.Is_Active == true ? t('active') : t('inactive')} />
              {/* <label>{headerDetails?.Country || '-'}</label>
              <label>{headerDetails?.Is_Active == true ? t('active') : t('inactive')}</label> */}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.userInputContainer}>
        <div className={styles.fieldsetContainer}>
          <label className={styles.title}>{t('recentUpdate')}</label>
          {activeChangedFields?.map((item, index) => {
            const isFileField = fileFields.includes(item?.field);
            // Map boolean values for "Is VAT Applicable"
              const formatValue = (field, value) => {
              if (field === "Is VAT Applicable") {
                if (value === true) return "Yes";
                if (value === false) return "No";
              }
              return value ?? " ";
            };

          if ((userType === BUSINESS_USER_TYPE || userType === ADMIN_USER_TYPE) &&
              item?.field === t('shortPaymentReason') && 
              viewDetails?.status === 5) {
            return null
          }
            
            return (
              <Fieldset key={index} legend={dayjs(item?.date).format('MMM D, YYYY')}>
                <label className={styles.reqTitle}>{t('requestedForChange')} {item?.field} {t('change')}</label>
                <div className={styles.inputFields}>
                  {isFileField ? (
                    <>
                      <div className={styles.fileFieldContainer}>
                        <label className={styles.fileFieldLabel}>{item?.field}</label>
                        <FileIcons 
                          files={convertUrlsToFileObjects(Array.isArray(item?.new) ? item?.new : [])} 
                        />
                      </div>
                      <div className={styles.fileFieldContainer}>
                        <label className={styles.fileFieldLabel}>{t('previous')} {item?.field}</label>
                        <FileIcons 
                          files={convertUrlsToFileObjects(Array.isArray(item?.old) ? item?.old : [])}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <InputBox
                        titleLabel={item?.field}
                        className="user-input inputBox"
                        type="text"
                        disabled
                        value={formatValue(item?.field, item?.new)}
                      />
                      <InputBox
                        titleLabel={`${t('previous')} ${item?.field}`}
                        className="user-input inputBox"
                        type="text"
                        disabled
                        value={formatValue(item?.field, item?.old)}
                      />
                    </>
                  )}
                </div>
              </Fieldset>
            )
          })}
        </div>
      </div>
      {isApprove && (
        <ConfirmationPopup
          open={isApprove}
          confirmTxt={t('areYouSureWantToApproveThis')}
          onClose={() => setIsApprove(false)}
          onConfirm={handleConfirm}
          isLoading={isLoading}
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

      <EmailReportComp
        open={emailReportState}
        onClose={() => setEmailReportState(false)}
        value={emailReportDateRange}
        setValue={setEmailReportDateRange}
        onSend={handleSendEmailReport} />

      <DownloadReportComp
        open={downloadReport}
        value={downloadDateRange}
        setValue={setDownloadDateRange}
        onClose={() => setDownloadReport(false)}
        title={t('vendorsUpdateDetails')}
        onClickSubmit={downloadCSV}
      />
    </LeftPageContainer>
    )}
    </>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})
const mapDispatchToProps = {
  showToast
}

export default connect(mapStateToProps, mapDispatchToProps)(ViewVendorsUpdateComp)

