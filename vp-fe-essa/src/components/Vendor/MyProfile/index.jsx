import React, { useEffect, useState, startTransition, Suspense } from 'react'
import './style.scss'
import { NormalButton } from '../../Common/NormalButton'
import helpIcon from '../../../assets/icons/helpIcon.svg'
import { Box } from '@mui/material'
import TabPanel from 'components/Common/Tabs'
import GeneralAndCommunicationDetails from './GeneralAndCommunication/GeneralAndcommunicationDetails/index.jsx'
import LegalIdentificationDetails from './LegalIdentificationDetails/LegalIdentificationDetails'
import PaymentTerms from './PaymentTerms/PaymentTermsDetails'
import BankDetails from './BankDetails'
import Contacts from './Contacts'
import Users from './Users'
import Extensions from './Extensions'
import { MPSeparator, MPTab, MPTabs, MPTabsContainer, MPTabWrapper } from './MyProfile.style'
import EditGeneralCommunicationComp from './GeneralAndCommunication/EditGeneralCommunication/EditGeneralCommunication'
import EditLegalIdentificationDetailsComp from './LegalIdentificationDetails/EditLegalIdentificationDetails'
import EditPaymentTermsComp from './PaymentTerms/EditPaymentTerms'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import {
  approveRejectVendorApplication,
  editProfileDetails,
  getProfileDetails,
  getProfileImage,
  getVendorProfileDetails
} from 'api/MyProfile'
import { connect, useDispatch, useSelector } from 'react-redux'
import { setProfileData } from '../../../redux/actions/myProfileAction'
import { FAQS } from 'constants/url'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { showToast } from '../../../redux/actions/toastActions'
import { useForm } from 'react-hook-form'
import { fetchImage } from 'services/helperFunctions'
import { getEntityId } from 'services/utilities'
import { useLocation } from 'react-router-dom'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import ConfirmationPopup from 'components/Common/ConfirmationPopup'
import RejectionPopup from 'components/Common/RejectionPopup'
import { loginAsSupplier } from 'api/Vendors'
import { SET_USER_INFO } from 'redux/constants/userInfoConstant'
import { toast } from 'react-toastify'
import { PageLoader } from 'components/Common/PageLoader'
import { Tune } from '@mui/icons-material'
import { fileUpload } from 'api/FileUpload'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import { UtilIconFaq } from 'components/Common/UtilIcon'
import dayjs from 'dayjs'

const MyProfileComp = ({ setProfileData, userInfo: { userType, isSupplier }, showToast }) => {
  const { reset } = useForm()
  const navigate = useNavigate()
  const { t } = useTranslation(['myprofile', 'sidebar', 'vendors', 'popup', 'purchase_order', 'general_details_comp', 'toast', 'soa'])
  const location = useLocation()
  const headerParams = new URLSearchParams(location.search)
  const referenceNo = headerParams.get('id')
  const vendorCode = headerParams.get('vendorCodeNo')
  const isVendorListPage = headerParams.has('vendorCodeNo')
  const isVendorsApplicationPage = location.pathname.includes('view-vendors-application')
  const isVendorsProfilePage = location.pathname.includes('view-profile')
  const profileData = useSelector((state) => state?.myProfile?.profileData)
  const HeaderStatus = profileData?.Status === 5


  const [activeTab, setActiveTab] = useState(0)
  const [updatedId, setUpdatedId] = useState('')
  const [statusCode, setStatusCode] = useState(null)
  const [isEditable, setIsEditable] = useState(false)
  const [showTUButton, setShowTUButton] = useState(false)
  const [openTUPopup, setOpenTUPopup] = useState(false)
  const [editedData, setEditedData] = useState({})
  const [vendorImg, setVendorImg] = useState('')
  const [isApprove, setIsApprove] = useState(false)
  const [isReject, setIsReject] = useState(false)
  const [finalStatus, setFinalStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [profileLoading, setIsLoadingProfile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [addExtension, setaddExtension] = useState(false)

  const dispatch = useDispatch()
  useEffect(() => {
    if (userType !== VENDOR_USER_TYPE && isVendorsApplicationPage) {
      fetchVendorProfile()
    } else {
      fetchProfileDetails()
    }
    if (activeTab === 0 && !isVendorsApplicationPage) {
      getProfileImg()
    }

  }, [userType, activeTab])

  useEffect(() => {
    if (location.state?.isExtension !== undefined) {
      handleChange(6)
      setTimeout(() => {
        setaddExtension(true)
      }, 500);
    }
  }, [location.state])

  const getProfileImg = () => {
    setIsLoadingProfile(true);
    getProfileImage()
      .then((res) => {
        const imageUrl = res?.data?.data?.Image
        if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
          fetchImage(imageUrl).then((blobUrl) => {
            if (blobUrl) setVendorImg(blobUrl)
          })
        } else {
          setVendorImg(null)
        }
        // showToast('success.', `${res?.data?.message}`, 'success')
      })
      .catch((err) => {
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(err?.response?.data?.message || t('general_details_comp:failedToFetchImage'))
      }).finally(() => {
        setIsLoadingProfile(false);
      })
  }

  const updateEditedData = (section, data) => {
    setEditedData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...data
      }
    }))
  }
  const handleFinalSubmit = async (dataFromCurrentForm) => {
    const combinedPayload = {
      ...editedData.general,
      ...editedData.legal,
      ...editedData.payment,
      ...dataFromCurrentForm,
      Wht_Applicable: editedData?.general?.Wht_Applicable === "Yes" ? true : editedData?.general?.Wht_Applicable === true ? true : false || false,

    }

    // Separate new files (File objects) from existing URLs
    const newFiles = []
    const existingUrls = {
      license_file: [],
      national_file: [],
      vat_file: [],
      payment_file: [],
      NDA_file: []
    }

    const attachmentTypeMap = {
      license_file: "TRADE LICENSE",
      national_file: "NATIONAL ID",
      vat_file: "VAT",
      NDA_file: "NDA",
      payment_file: "PAYMENT TERMS",
      // bank_file: "BANK FILE"
    };

    // Process each file type
    ;['license_file', 'national_file', 'vat_file', 'payment_file', 'NDA_file'].forEach(type => {
      const files = combinedPayload[type] || []
      files.forEach(file => {
        if (file instanceof File) {
          // This is a new file that needs to be uploaded
          newFiles.push({ file, type })
        } else if (typeof file === 'string' || file?.Upload_files) {
          // This is an existing URL, keep it
          const url = typeof file === 'string' ? file : file.Upload_files
          existingUrls[type].push(url)
        }
      })
    })

    // Upload only new files
    const uploadPromises = newFiles.map(({ file, type }) => {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('vendor_code', profileData?.Vendor_SAP_Code || "")
      // fd.append('module', 'PROFILE UPDATE')
      fd.append("attachment_type", attachmentTypeMap[type] || "");

      return fileUpload(fd)
        .then((res) => ({
          success: true,
          type,
          url: res.data?.data?.url
        }))
        .catch((err) => ({
          success: false,
          type,
          error: err
        }))
    })

    // try {
    const results = await Promise.all(uploadPromises)

    // Combine existing URLs with newly uploaded URLs
    results.forEach(({ success, type, url }) => {
      if (success && url) {
        existingUrls[type].push(url)
      }
    })
    if (editedData.legal) {
      // Set the final payload with all URLs (existing + new)
      combinedPayload.license_file = existingUrls.license_file
      combinedPayload.national_file = existingUrls.national_file
      combinedPayload.vat_file = existingUrls.vat_file
      combinedPayload.NDA_file = existingUrls.NDA_file
      combinedPayload.payment_file = existingUrls.payment_file
      combinedPayload.License_Expiry_Date = combinedPayload?.License_Expiry_Date ? dayjs(combinedPayload?.License_Expiry_Date).format("YYYY-MM-DD") : null;
      combinedPayload.National_Id_Expiry_Dt = combinedPayload?.National_Id_Expiry_Dt ? dayjs(combinedPayload?.National_Id_Expiry_Dt).format("YYYY-MM-DD") : null;
    }

    if (editedData.legal) {
      combinedPayload.Payment_Terms = combinedPayload.PaymentTerms === 'Others' ? combinedPayload?.other_payment_terms : combinedPayload?.Payment_Terms;
    }
    editProfileDetails(combinedPayload)
      .then((res) => {
        showToast(
          t('popup:successfullySubmitted'),
          t('general_details_comp:reflectedChanges'),
          t('toast: successTitle')
        )
        setIsEditable(false)
        setShowTUButton(true)
        fetchProfileDetails()
        setEditedData({})
      })
      .catch((err) => {
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(err?.response?.data?.message || t('general_details_comp:failedToUpdateDetails'))
      })
  }
  const fetchProfileDetails = () => {
    setIsLoading(true)
    let query = {
      vendor_id: referenceNo,
      entity_id: getEntityId(),
    }
    getProfileDetails(query)
      .then((res) => {
        setProfileData(res?.data?.data)
        setVendorImg(res?.data?.data?.Image)
        setUpdatedId(res?.data?.data?.ID)
        setStatusCode({
          Approve_Button: res?.data?.data?.Approve_Button,
          Reject_Button: res?.data?.data?.Reject_Button
        })
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const fetchVendorProfile = () => {
    setIsLoading(true)
    let query = {
      entity_id: getEntityId(),
      status: 1,
      ref_no: referenceNo
    }
    getVendorProfileDetails(query)
      .then((res) => {
        setProfileData(res?.data?.data)
        setUpdatedId(res?.data?.data?.ID)
        setStatusCode({
          Approve_Button: res?.data?.data?.Approve_Button,
          Reject_Button: res?.data?.data?.Reject_Button
        })
      })
      .catch((err) => {
        console.error(err)
        // showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(err?.response?.data?.message || t('general_details_comp:failedToFetchProfileDetails'))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const handleChange = (newValue) => {
    const timeOutId = setTimeout(() => {
      setActiveTab(newValue)
      setIsEditable(false)
      setShowTUButton(false)
      setOpenTUPopup(false)
      clearTimeout(timeOutId)
    }, 10)
  }

  const handleEditClick = () => {
    startTransition(() => {
      setIsEditable((prev) => !prev)
    })
  }

  const handleNextClick = () => {
    const timeOutId = setTimeout(() => {
      if (activeTab < 6) {
        setActiveTab((prevTab) => prevTab + 1)
      }
      clearTimeout(timeOutId)
    }, 100)
  }

  const handleBackClick = () => {
    if (activeTab > 0) {
      setActiveTab((prevTab) => prevTab - 1)
    }
  }

  const handleConfirm = (data) => {
    setLoading(true)
    let body = {
      updatedId: referenceNo,
      isApproved: isApprove ? true : false,
      rejectionReason: !isReject ? '' : data?.reasonOfRejection
    }

    approveRejectVendorApplication(body)
      .then((res) => {
        setIsApprove(false)
        setIsReject(false)
        setUpdatedId('')
        if (isApprove) {
          showToast(t('toast:applicationApproved'), t('toast:applicationApprovedSuccess'), 'success')
          setFinalStatus('approved')
        } else {
          showToast(t('toast:applicationRejected'), t('toast:applicationIsRejected'), 'success')
          setFinalStatus('rejected')
        }
        fetchVendorProfile()
      })
      .catch((err) => {
        console.error(err)
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(err?.response?.data?.message || t('general_details_comp: failedToApproveOrReject'))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const handleSupplierLogin = () => {
    loginAsSupplier({ vendor_id: referenceNo }).then((res) => {
      const token = res?.data?.data?.token
      const vendor_id = res?.data?.data?.id
      dispatch({
        type: SET_USER_INFO,
        payload: {
          userType: VENDOR_USER_TYPE,
          // email: data.email,
          id: vendor_id,
          Vendor_Role: res?.data?.data?.Vendor_Role,
          isPoInline: res?.data?.data?.Is_PO_Inline,
          isNonPoAccess: res?.data?.data?.Non_PO_Access
        }
      })
      localStorage.setItem('backupUserType', userType)
      sessionStorage.setItem('secondaryToken', token)
      sessionStorage.setItem('vendorId', vendor_id)
      navigate(`/vendor/dashboard`)
      showToast(t('general_details_comp:loginSuccess'), t('general_details_comp:loggedInAsVendor'), 'success')
      window.location.reload()
    })
  }

  return (
    <LeftPageContainer className="profile-container">
      {/* {isLoading ? (
        <div className="no-data-container-view">
          <PageLoader />
        </div>
      ) : ( */}
      <>
        {userType === VENDOR_USER_TYPE && profileData?.Edit_Button && (
          <HeaderBar title={t('profile')} slug={`${t('sidebar:home')} / ${t('profile')}`}>
            {activeTab >= 0 && activeTab <= 3 && (
              <div className={isEditable ? 'd-none' : 'd-block mx-2'}>
                <NormalButton
                  label={t('edit')}
                  isPrimary
                  //isLoading={isLoading}
                  customClass="edit-btn"
                  onClick={handleEditClick}
                />
              </div>
            )}

            <TooltipWrapper tooltipMessage={t('soa:help')}>
              <UtilIconFaq
                style={{ marginLeft: 0 }}
                name="help"
                onClick={() => navigate(`/${userType}${FAQS}?id=1`)}
              />
            </TooltipWrapper>
          </HeaderBar>
        )}

        {userType !== VENDOR_USER_TYPE && (
          <HeaderBar
            // customClass="sticky-header-bar"
            //title={referenceNo}
            title={isVendorsApplicationPage ? referenceNo : isVendorListPage ? vendorCode : profileData?.Vendor_SAP_Code}
            slug={
              isVendorsApplicationPage
                ? `${t('sidebar:home')} / ${t('vendors:vendors')} / ${t(
                  'purchase_order:referenceNo'
                )} ${referenceNo}`
                : isVendorListPage
                  ? `${t('sidebar:home')} / ${t('vendors:vendors')} / ${vendorCode}`
                  : `${t('sidebar:home')} / ${t('vendors:vendors')} / ${referenceNo}`
            }
            statusTag={
              HeaderStatus
                ? 'Rejected'
                : profileData?.Approve_Button === false
                  ? 'Approved'
                  : ''
            }>
            {!isVendorsApplicationPage &&
              userType !== BUSINESS_USER_TYPE &&
              userType !== ADMIN_USER_TYPE &&
              activeTab >= 0 &&
              activeTab <= 2 && (
                <div className={isEditable ? 'd-none' : 'd-block mx-2'}>
                  <NormalButton
                    label={t('edit')}
                    isPrimary
                    //isLoading={isLoading}
                    customClass="edit-btn"
                    onClick={handleEditClick}
                  />
                </div>
              )}
            {/* {isVendorsApplicationPage && !finalStatus && ( */}
            <div className="d-flex gap-3">
              {statusCode?.Reject_Button && (
                <NormalButton
                  label={t('vendors:reject')}
                  rejectBtn
                  //isLoading={isLoading}
                  customClass="px-3"
                  onClick={() => setIsReject(true)}
                />
              )}

              {statusCode?.Approve_Button && (
                <NormalButton
                  label={t('vendors:approve')}
                  isPrimary
                  //isLoading={isLoading}
                  customClass="px-3"
                  onClick={() => setIsApprove(true)}
                />
              )}
            </div>
            {/* )} */}
            {isSupplier && isVendorsProfilePage && (
              <NormalButton
                label={t('vendors:logInAsSupplier')}
                isPrimary
                // customClass="edit-btn"
                //isLoading={isLoading}
                onClick={handleSupplierLogin}
              />
            )}
          </HeaderBar>
        )}

        <Box sx={{ width: '100%' }}>
          <MPTabsContainer>
            <MPTabs sx={{ width: userType === VENDOR_USER_TYPE ? 'auto' : 'fit-content', border: '1px solid rgb(152, 162, 179)' }} value={activeTab} variant="scrollable">
              <MPTabWrapper>
                <MPTab sx={{ color: '#000 !important', opacity: '1', padding: '12px 14px !important' }}
                  label={t('generalAndCommunicationDetails')}
                  value={0}
                  onClick={() => handleChange(0)}
                  className={activeTab === 0 ? 'first-tab' : 'other-tab'}
                />
                <MPSeparator />
                <MPTab sx={{ color: 'black !important', opacity: '1', padding: '12px 14px !important' }}
                  label={t('legalIdentificationDetails')}
                  value={1}
                  onClick={() => handleChange(1)}
                  className={activeTab === 1 ? 'active-tab' : 'other-tab'}
                />
                <MPSeparator />
                <MPTab sx={{ color: 'black !important', opacity: '1', padding: '12px 14px !important' }}
                  label={t('paymentTerms')}
                  value={2}
                  onClick={() => handleChange(2)}
                  className={activeTab === 2 ? 'active-tab' : 'other-tab'}
                />
                <MPSeparator />
                <MPTab sx={{ color: 'black !important', opacity: '1', padding: '12px 14px !important' }}
                  label={t('bankDetails')}
                  value={3}
                  onClick={() => handleChange(3)}
                  className={activeTab === 3 ? 'active-tab' : 'other-tab'}
                />
                <MPSeparator />
                <MPTab sx={{ color: 'black !important', opacity: '1', padding: '12px 14px !important' }}
                  label={t('contacts')}
                  value={4}
                  onClick={() => handleChange(4)}
                  className={activeTab === 4 ? 'active-tab' : 'other-tab'}
                />
                <MPSeparator />
                <MPTab sx={{ color: 'black !important', opacity: '1', padding: '12px 14px !important' }}
                  label={t('users')}
                  value={5}
                  onClick={() => handleChange(5)}
                  className={activeTab === 5 ? 'active-tab' : 'other-tab'}
                />
                {userType === VENDOR_USER_TYPE && (
                  <>
                    <MPSeparator />
                    <MPTab sx={{ color: 'black !important', opacity: '1', padding: '12px 14px !important' }}
                      label={t('extension')}
                      value={6}
                      onClick={() => handleChange(6)}
                      className={activeTab === 6 ? 'last-tab' : 'other-tab'}
                    />
                  </>
                )}
              </MPTabWrapper>
            </MPTabs>
          </MPTabsContainer>

          {/* { 
              isLoading && (
                <div className="no-data-container-view">
                  <PageLoader />
                </div>
              )
            } */}

          <TabPanel value={activeTab} index={0}>
            {!isEditable ? (
              <GeneralAndCommunicationDetails
                profileImg={vendorImg}
                profileLoading={profileLoading}
                isEditable={isEditable}
                showTUButton={showTUButton}
                openTUPopup={openTUPopup}
                setOpenTUPopup={setOpenTUPopup}
              />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <EditGeneralCommunicationComp
                  profileImg={vendorImg}
                  profileLoading={profileLoading}
                  setShowTUButton={setShowTUButton}
                  onNextClick={handleNextClick}
                  setIsEditable={setIsEditable}
                  isEditable={isEditable}
                  fetchProfileDetails={fetchProfileDetails}
                  handleTabChange={handleChange}
                  updateEditedData={updateEditedData}
                  handleFinalSubmit={handleFinalSubmit}
                  editedData={editedData}
                  isVendorsProfilePage={isVendorsProfilePage}
                />
              </Suspense>
            )}
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            {!isEditable ? (
              <LegalIdentificationDetails
                isEditable={isEditable}
                showTUButton={showTUButton}
                openTUPopup={openTUPopup}
                setOpenTUPopup={setOpenTUPopup}
                editedData={editedData}
              />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <EditLegalIdentificationDetailsComp
                  setShowTUButton={setShowTUButton}
                  isEditable={isEditable}
                  onNextClick={handleNextClick}
                  onBackClick={handleBackClick}
                  setIsEditable={setIsEditable}
                  fetchProfileDetails={fetchProfileDetails}
                  updateEditedData={updateEditedData}
                  handleFinalSubmit={handleFinalSubmit}
                  editedData={editedData}
                  isVendorsProfilePage={isVendorsProfilePage}
                />
              </Suspense>
            )}
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            {!isEditable ? (
              <PaymentTerms
                isEditable={isEditable}
                onBackClick={handleBackClick}
                showTUButton={showTUButton}
                openTUPopup={openTUPopup}
                setOpenTUPopup={setOpenTUPopup}
              />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <EditPaymentTermsComp
                  setShowTUButton={setShowTUButton}
                  setIsEditable={setIsEditable}
                  fetchProfileDetails={fetchProfileDetails}
                  onBackClick={handleBackClick}
                  updateEditedData={updateEditedData}
                  handleFinalSubmit={handleFinalSubmit}
                  editedData={editedData}
                  isVendorsProfilePage={isVendorsProfilePage}
                />
              </Suspense>
            )}
          </TabPanel>
          <TabPanel value={activeTab} index={3}>
            <BankDetails isEditable={isEditable} handleTabChange={handleChange} />
          </TabPanel>
          <TabPanel value={activeTab} index={4}>
            <Contacts />
          </TabPanel>
          <TabPanel value={activeTab} index={5}>
            <Users />
          </TabPanel>
          <TabPanel value={activeTab} index={6}>
            <Extensions addExtension={addExtension} setaddExtension={setaddExtension} />
          </TabPanel>
        </Box>
        {isApprove ?
          <Suspense fallback={<PageLoader />}>
            <ConfirmationPopup
              open={isApprove}
              confirmTxt={t('vendors:areYouSureWantToApproveApplication')}
              onClose={() => setIsApprove(false)}
              onConfirm={handleConfirm}
              isLoading={loading}
            />
          </Suspense> : null}

        {isReject ?
          <Suspense fallback={<PageLoader />}>
            <RejectionPopup
              open={isReject}
              onClose={() => setIsReject(false)}
              onConfirm={handleConfirm}
            />
          </Suspense> : null}
      </>
      {/* )} */}
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo // Getting userInfo from Redux store
})
const mapDispatchToProps = {
  setProfileData,
  showToast
}

export default connect(mapStateToProps, mapDispatchToProps)(MyProfileComp)
