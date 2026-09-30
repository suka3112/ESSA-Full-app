import React, { Suspense, useEffect, useState } from 'react'
import styles from './ViewExtensionDetails.module.scss'
import { useLocation } from 'react-router-dom'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import Fieldset from 'components/Common/FieldSet'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'
import { approveRejectVendorExtension, emailVendorsUpdatesDetailsReport, exportVendorsUpdateDetails, getVendorsExtensionDetailPage } from 'api/Vendors'
import { toast } from 'react-toastify'
import { showToast } from 'redux/actions/toastActions'
import { downloadFile } from 'services/utilities'
import { VENDOR_USER_TYPE } from 'constants/userType'
import { HeaderBar } from 'components/Common/HeaderBar'
import { NormalButton } from 'components/Common'
import ConfirmationPopup from 'components/Common/ConfirmationPopup'
import RejectionPopup from 'components/Common/RejectionPopup'
import { connect } from 'react-redux'
import dayjs from 'dayjs'
import SuccessPopup from 'components/Common/SuccessPopup'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import EmailReportComp from 'components/Vendor/EmailReport'
import { PageLoader } from 'components/Common/PageLoader'
import { useTranslation } from 'react-i18next'
import DetailItem from 'components/Common/DetailItemCard'
// import AdminVendorsUpdatesDetailPDF from 'components/PDF/AdminVendorUpdatesDetailsPDF'

const ViewVendorsExtensionComp = ({ setProfileData, userInfo: { userType }, showToast }) => {
    const { t } = useTranslation(['vendors', 'sidebar', 'toast'])

    const {
        register,
        formState: { errors },
        control
    } = useForm()
    const location = useLocation()
    //const userData = location.state?.userData
    const headerParams = new URLSearchParams(location.search)
    const referenceNo = headerParams.get('id')
    const [loading, setLoading] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [viewDetails, setViewDetails] = useState([])
    const [fieldDetails, setFieldDetails] = useState(null)
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
    const HeaderStatus = viewDetails?.changedFields?.Status === 5 

    const useQuery = () => {
        return new URLSearchParams(useLocation().search);
    };
    const queryObj = useQuery();


    useEffect(() => {
        if (userType !== VENDOR_USER_TYPE) {
            fetchVendorViewUpdates()
        }
    }, [userType])

    const handleDownload = () => {
        setDownloadReport(true)
    }

    const handleCloseDownload = () => {
        setDownloadReport(false)
    }

    const fetchVendorViewUpdates = () => {
        setLoading(true)
        let query = {
            // entity_id: getEntityId(),
            vendor_id: queryObj.get('vendorId'),
            ID: queryObj.get('id')
        }
        getVendorsExtensionDetailPage(query)
            .then((res) => {
                setViewDetails(res?.data?.data)
                setFieldDetails(res?.data?.data?.changedFields)
                setHeaderDetails(res?.data?.data?.headers_data || {})
                setButtonLogic(res?.data?.data?.buttons_logic || {})
            })
            .catch((err) => {
                console.error(err)
                toast.error(err?.response?.data?.message)
                //showToast('Error.', `${err?.response?.data?.message}`, 'error')
            }).finally(() => {
                setLoading(false)
            })
    }

    const handleConfirm = (data) => {
        setIsLoading(true)
        let body = {
            updatedId: fieldDetails?.ID,
            isApproved: isApprove ? true : false,
            Final_Approval: buttonLogic?.Final_Approval,
            rejectionReason: !isReject ? '' : data?.reasonOfRejection
        }

        approveRejectVendorExtension(body)
            .then((res) => {
                setIsApprove(false)
                setIsReject(false)

                if (isApprove) {
                    showToast(t('toast:applicationApproved'), t('vendorExtensionApprovedSuccessfully'),'success' )
                    setFinalStatus('approved')
                } else {
                    showToast(t('toast:extensionRejected'), t('vendorExtensionRejected'), 'success')
                    setFinalStatus('rejected')
                }
                fetchVendorViewUpdates()
            })
            .catch((err) => {
                console.error(err)
                toast.error(err?.response?.data?.message)
                //showToast('Error.', `${err?.response?.data?.message}`, 'error')
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
                <HeaderBar title={`${headerDetails?.Vendor_SAP_Code}`} slug={t('sidebar:home') + ' / ' + t('vendors') + ' / ' + t('vendors:vendorExtension')}
                statusTag={
                    HeaderStatus 
                    ? 'Rejected' 
                    : buttonLogic?.Approve_Button === false
                    ? 'Approved' 
                    : ''
                }
                >
                    {/* {(userType === ADMIN_USER_TYPE || userType===BUSINESS_USER_TYPE) && !finalStatus && ( */}
                    <div className="d-flex gap-3">
                        {buttonLogic?.Reject_Button &&
                            <NormalButton
                                label={t('reject')}
                                rejectBtn
                                customClass="px-3"
                                onClick={() => setIsReject(true)}
                            />}
                        {
                            buttonLogic?.Approve_Button && <NormalButton
                                label={t('approve')}
                                isPrimary
                                customClass="px-3"
                                onClick={() => setIsApprove(true)}
                                
                            />
                        }

                    </div>
                    {/* )} */}
                    {/* <UtilIcon src={emailReport} onClick={() => setEmailReportState(true)} />
                    <UtilIcon onClick={handleDownload} src={download} /> */}
                </HeaderBar>
            </div>
            <div className={styles.userInputContainer}>
                <div className={`col-4`}>
                    <div className={styles.userInputContainerInner} style={{padding: '0px'}}>
                        <div className={styles.inputAns}>
        <DetailItem label={t('vendorName')} value={headerDetails?.Vendor_Name_EN || '-'} customClass="overflow-visible"/>
        <DetailItem label={t('vendorCode')} value={headerDetails?.Vendor_SAP_Code || '-'} />
        <DetailItem label={t('emailId')} value={headerDetails?.Email || '-'} />
      </div>
                    </div>
                </div>
                {/* <div className={`col-6`}>
                    <div className={styles.userInputContainerInner}>
                        <div className={styles.inputQues}>
                            <label>Country:</label>
                            <label>Status:</label>
                        </div>
                        <div className={styles.inputAns}>
                            <label>{headerDetails?.Country || '-'}</label>
                            <label>{headerDetails?.Is_Active == true ? 'Active' : 'InActive'}</label>
                        </div>
                    </div>
                </div> */}
            </div>

            <div className={styles.userInputContainer}>
                <div className={styles.fieldsetContainer}>
                    <label className={styles.title}>{t('recentUpdate')}</label>
                    {/* {viewDetails?.map((item, index) => {
                        return ( */}
                    <Fieldset legend={dayjs(fieldDetails?.Extension_request_date).format('MMM D, YYYY')}>
                        <label className={styles.reqTitle}>{t('requestedForNewExtensionChange')}</label>
                        <div className={styles.inputFields}>
                            <InputBox
                                titleLabel={t('selectedEntity')}
                                className="user-input inputBox"
                                type="text"
                                disabled
                                value={fieldDetails?.entity_details?.Entity_Name}
                            />
                            <InputBox
                                titleLabel={t('crPerson.text')}
                                className="user-input inputBox"
                                type="text"
                                disabled
                                value={fieldDetails?.CR_details?.Employee_Name}
                            />
                            <InputBox
                                titleLabel={t('reason')}
                                className="user-input inputBox"
                                type="text"
                                disabled
                                value={fieldDetails?.Reason_for_extension}
                            />
                        </div>
                    </Fieldset>
                    {/* )
                    })} */}
                </div>
            </div>
            {isApprove && (
                   <Suspense>
                <ConfirmationPopup
                    open={isApprove}
                    confirmTxt={t('areYouSureWantToApproveThis')}
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
                title={t('vendorExtensionDetails')}
                onClickSubmit={downloadCSV}
            />
        </LeftPageContainer>
        )}
        </>
    )
}

const mapStateToProps = (state) => ({
    userInfo: state.userInfo // Getting userInfo from Redux store
})
const mapDispatchToProps = {
    showToast
}

export default connect(mapStateToProps, mapDispatchToProps)(ViewVendorsExtensionComp)

