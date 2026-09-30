import React, { startTransition, useEffect, useState } from 'react'
import styles from './GeneralAndCommunication.module.scss'
import profileLogo from '../../../../../assets/icons/profileLogo.svg'
import editIcon from '../../../../../assets/icons/editPencilIcon.svg'
import DeleteIcon from '../../../../../assets/icons/deleteIcon.svg'
import Avatar from 'assets/images/user-avatar-white.png'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'
import { Box } from '@mui/material'
import FileUpload from 'components/Common/FileUpload'
import { useTranslation } from 'react-i18next'
import { connect, useSelector } from 'react-redux'
import { NormalButton } from 'components/Common'
import CustomModal from '../../../../Common/Modal'
import TrackYourUpdatesPopup from '../../TrackYourUpdatesPopup'
import {
  deleteProfilePicture,
  editInlineStatus,
  editProfileDetails,
  editProfileImage,
  getTrackUpdates,
  updateNonPOAccess
} from 'api/MyProfile'
import { showToast } from 'redux/actions/toastActions'
import { fileUpload } from 'api/FileUpload'
import { BUSINESS_USER_TYPE, FINANCE_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import { ADMIN_USER_TYPE } from 'constants/userType'
import ToggleSwitch from 'components/Common/ToggleSwitch'
import { getVendorsList } from 'api/Vendors'
import { toast } from 'react-toastify'
import useTableFeatures from 'hooks/useTableFeatures'
import { vendorSampleImg } from 'constants/imageConstants'
import { useLocation } from 'react-router'
import DetailItem from 'components/Common/DetailItemCard'

const GeneralAndCommunicationDetailsComp = ({
  myProfile,
  showTUButton,
  openTUPopup,
  setOpenTUPopup,
  profileImg,
  showToast,
  profileLoading,
  userInfo: { userType }
}) => {
  const {
    register,
    formState: { errors },
    setValue
  } = useForm()
  const { setLoader } = useTableFeatures()
  const location = useLocation()
  const isVendorsApplicationPage = location.pathname.includes('view-vendors-application')
  const uploadVendorCode = useSelector(
    (state) => state?.dashboard?.dashboardData?.profile?.Vendor_SAP_Code
  )
  const [showFileInput, setShowFileInput] = useState(false)
  const [confirmProfileDelete, setConfirmProfileDelete] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [trackUpdatesData, setTrackUpdatesData] = useState(null)
  const { t, i18n } = useTranslation([
    'profile_general_details_comp',
    'myprofile',
    'vendors',
    'toast'
  ])
  const isArabic = i18n.language === 'ar'
  const modalStyles = {
    width: '456px'
  }
  const [preview, setPreview] = useState(profileImg || Avatar)

  useEffect(() => {
    if (profileImg) {
      setPreview(profileImg)
    }
  }, [profileImg])

  const EditImgIcon = styled.img`
    position: absolute;
    top: 0;
    ${(props) => (props.langDirection ? 'left: 0;' : 'right: 0;')}
    transform: translate(0, 0);
    cursor: pointer;
    opacity: 1;
    // transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
    cursor: pointer;
    padding: 5px;
    filter: brightness(0) invert(1);
  `
  const DeleteImgIcon = styled.img`
    position: absolute;
    top: 0;
    display: none;
    ${(props) => (props.langDirection ? 'left: 0;' : 'right: 0;')}
    transform: translate(0, 0);
    cursor: pointer;
    opacity: 1;
    transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
    cursor: pointer;
    padding: 5px;
    filter: brightness(0) invert(1);
  `

  const ProfileContainer = styled(Box)`
    padding: 10px;
    position: relative;
    transition: all 0.5s ease;
    cursor: pointer;
    height: 105px;
    width: 100px;
    border-radius: 10px;
    background-color: $primary-color;
    display: flex;

    &:hover::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4); /* White overlay with 20% opacity */
      border-radius: 10px;
      pointer-events: none; /* Prevent overlay from blocking interactions */
    }

    &:hover ${EditImgIcon} {
      height: 50px;
      width: 50px;
      opacity: 1;
      transform: translate(-50%, -50%);
      top: 50%;
        ${(props) =>
          props.langDirection
            ? 'right: 20%;' // ARABIC → right side
            : 'left: 30%;'}   // ENGLISH → left side

      // left: 30%;
      // transition: transform 0.5s ease-out, opacity 1s ease-out, height 0.5s ease, width 0.5s ease;
      cursor: pointer;
      // filter: brightness(0) invert(0);
    }
    &:hover ${DeleteImgIcon} {
      height: 50px;
      width: 50px;
      display:inline;
      opacity: 1;
      transform: translate(-50%, -50%);
      top: 50%;
      // left: 70%;
      transition: transform 0.5s ease-out, opacity 1s ease-out, height 0.5s ease, width 0.5s ease;
      cursor: pointer;
      ${(props) =>
        props.langDirection
          ? 'right: -25%;' // ARABIC → right side
          : 'left: 70%;'}   // ENGLISH → left side
}
    }
  `
  const ProfileImage = styled.img`
    object-fit: contain;
    width: 100%;
    height: 100%;
    border-radius: 12px;
    over-flow: hidden;
  `

  const handleEditClick = () => {
    startTransition(() => {
      setShowFileInput(true)
    })
  }

  const handleClose = () => {
    startTransition(() => {
      setShowFileInput(false)
    })
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]

    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file)
      setPreview(imageUrl)
      setShowFileInput(false)

      const fd = new FormData()
      fd.append('image', file)
      const vendorCodeUpload = uploadVendorCode || null
      const moduleName = 'PROFILE PICTURE'
      fd.append('vendor_code', vendorCodeUpload)
      fd.append('module', moduleName)

      try {
        // Step 1: Upload file and get URL
        const uploadRes = await fileUpload(fd)
        const uploadedUrl = uploadRes?.data?.data?.url

        // Step 2: Send uploaded URL to update profile image
        const payload = { imageUrl: uploadedUrl }
        const updateRes = await editProfileImage(payload)
        showToast(t('toast:successTitle'), `${updateRes?.data?.message}`, 'success')
      } catch (err) {
        //showToast('Error.', `${err?.response?.data?.message || err.message}`, 'error')
        toast.error(err?.response?.data?.message || err.message || 'Failed to update profile image')
      }
    }
  }

  const vendorDetails = myProfile

  const trackUpdates = () => {
    setOpenTUPopup(true)
    let body = {
      application_number: vendorDetails?.Vendor_Onboard_Id
    }

    getTrackUpdates(body)
      .then((res) => {
        setTrackUpdatesData({
          id: res?.data?.data?.ID,
          application_number: res?.data?.data?.Application_Number,
          status: res?.data?.data?.Status
        })
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const handleToggleStatus = async (vendor, newStatus) => {
    try {
      setLoader(true)
      let query = {
        ID: vendor?.bankDetails?.Vendor_Id,
        Is_PO_Inline: newStatus
      }
      editInlineStatus(query)
        .then((res) => {
          showToast(
            t('toast:successTitle'),
            `Inline Level updated to ${newStatus ? 'Active' : 'Inactive'}`,
            'success'
          )
          // getVendorsList()
        })
        .catch((err) => {
          console.error('Error updating status:', err)
          toast.error(err.response?.data?.message || 'Failed to update status')
        })
    } finally {
      setLoader(false)
    }
  }

  const handleProfileDelete = () => {
    setIsDeleteLoading(true)
    deleteProfilePicture()
      .then(() => {
        setPreview('')
        showToast(t('toast:successTitle'), t('profileDeletedSuccess'), 'success')
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        setIsDeleteLoading(false)
        setConfirmProfileDelete(false)
      })
  }

  //Non PO Access
  const handleNonPOAccess = async (vendor, newStatus) => {
    try {
      setLoader(true)
      let query = {
        ID: vendor?.bankDetails?.Vendor_Id,
        Non_PO_Access: newStatus
      }
      updateNonPOAccess(query)
        .then((res) => {
          showToast(
            t('toast:successTitle'),
            `Non PO Access updated to ${newStatus ? 'Active' : 'Inactive'}`,
            'success'
          )
          // getVendorsList()
        })
        .catch((err) => {
          console.error('Error updating status:', err)
          toast.error(err.response?.data?.message || 'Failed to update status')
        })
    } finally {
      setLoader(false)
    }
  }

  return (
    <div className={styles.gcDetailsContainer}>
      <div className={styles.formHeader}>
        <div className="mb-4 fs-5">{t('myprofile:generalAndCommunicationDetails')}</div>
        {userType !== BUSINESS_USER_TYPE && userType !== ADMIN_USER_TYPE && (
          <>
            {showTUButton ||
              (vendorDetails?.Track_Button && (
                <NormalButton
                  label={t('myprofile:trackYourUpdate')}
                  isPrimary
                  customClass="px-3"
                  onClick={trackUpdates}
                />
              ))}
          </>
        )}
      </div>
      <div className={styles.gcDetailsUser}>
        <div className={`${styles.gapcustom}  w-[10%]`}>
          <ProfileContainer langDirection={isArabic}>
            {profileLoading ? (
              <p className="m-auto" style={{ color: '#fff' }}>
                Loading...
              </p>
            ) : (
              <ProfileImage
                src={preview}
                alt="Profile"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = Avatar
                }}
              />
            )}
            {userType !== FINANCE_USER_TYPE &&
              userType !== BUSINESS_USER_TYPE &&
              !isVendorsApplicationPage && (
                <>
                  <EditImgIcon src={editIcon} onClick={handleEditClick} />
                  <DeleteImgIcon
                    src={DeleteIcon}
                    onClick={() => {
                      setConfirmProfileDelete(true)
                    }}
                  />
                  {showFileInput && (
                    <FileUpload
                      openOnRender
                      onFileChange={handleFileChange}
                      onClose={handleClose}
                    />
                  )}
                </>
              )}
          </ProfileContainer>
        </div>
        <div
          className={`${styles.gapItem} ${
            isArabic ? styles.verticalDividerArabic : styles.verticalDivider
          } w-[45%]`}>
          <DetailItem
            labelWidth="40%"
            label={t('vendorName.text')}
            value={vendorDetails?.Vendor_Name_EN}
          />
          <DetailItem
            labelWidth="40%"
            label={t('vendorCode.text')}
            value={vendorDetails?.Vendor_SAP_Code}
          />
          <DetailItem
            labelWidth="40%"
            label={t('vendors:vendorNameArabic.text')}
            value={vendorDetails?.Vendor_Name_AR}
          />
          <DetailItem labelWidth="40%" label={t('phoneNumber.text')} value={vendorDetails?.Phone} />
        </div>
        <div className={`${styles.gapItem} w-[45%]`}>
          <DetailItem
            labelWidth="40%"
            label={t('email_primary.text')}
            value={vendorDetails?.Email}
          />
          <DetailItem
            labelWidth="40%"
            label={t('diakinEntityName.text')}
            value={vendorDetails?.entity_details?.Entity_Name}
          />
          <DetailItem
            labelWidth="40%"
            label={t('abcIndicator.text')}
            value={vendorDetails?.ABC_Indicator}
          />
          {userType === ADMIN_USER_TYPE && (
            <>
              <DetailItem
                labelWidth="40%"
                label={'Invoice PO Based'}
                value={
                  <div className="d-flex">
                    <ToggleSwitch
                      // customclassName="!w-12"
                      defaultValue={vendorDetails?.Is_Active}
                      onToggle={(newStatus) => handleToggleStatus(vendorDetails, newStatus)}
                    />
                    <span className="text-sm ml-2 font-medium">Inline Level</span>
                  </div>
                }
              />
            </>
          )}
          {userType === FINANCE_USER_TYPE && (
            <>
              <DetailItem
                labelWidth="40%"
                label={'Non PO Access'}
                value={
                  <ToggleSwitch
                    defaultValue={vendorDetails?.Non_PO_Access}
                    onToggle={(newStatus) => handleNonPOAccess(vendorDetails, newStatus)}
                  />
                }
              />
            </>
          )}
        </div>
      </div>
      <hr />
      <form>
        <div className={styles.gcDetailsInputs}>
          <div>
            <InputBox
              titleLabel={t('streetHouseNo.text')}
              className="signInInput inputBox mb-2"
              name="street_and_house_number"
              type="text"
              register={register}
              value={vendorDetails?.Street_House_No || ''}
              disabled
            />
            <InputBox
              titleLabel={t('city.text')}
              className="signInInput inputBox mb-2"
              name="city"
              type="text"
              register={register}
              value={vendorDetails?.City || ''}
              disabled
            />
            <InputBox
              titleLabel={t('industrytype.text')}
              className="signInInput inputBox mb-2"
              name="industry_type_id"
              type="text"
              register={register}
              value={vendorDetails?.Industry_Type_details?.Description_En || ''}
              disabled
            />
            <InputBox
              titleLabel={t('taxableBasis.text')}
              className="signInInput inputBox mb-2"
              name="taxableBasis"
              type="text"
              register={register}
              value={
                vendorDetails?.Taxble_Basis
                  ? vendorDetails.Taxble_Basis === 'Out of Scope'
                    ? vendorDetails.Taxble_Basis
                    : `${vendorDetails.Taxble_Basis}%`
                  : ''
              }
              disabled
            />
          </div>
          <div>
            <InputBox
              titleLabel={t('postalCode.text')}
              className="signInInput inputBox mb-2"
              name="postel_code"
              type="text"
              register={register}
              value={vendorDetails?.Postal_Code || ''}
              disabled
            />
            <InputBox
              titleLabel={t('region.text')}
              className="signInInput inputBox mb-2"
              name="region"
              type="text"
              register={register}
              value={vendorDetails?.Region || ''}
              disabled
            />
            <InputBox
              titleLabel={t('industryKey.text')}
              className="signInInput inputBox mb-2"
              name="industry_type_key"
              type="text"
              register={register}
              value={vendorDetails?.Industry_Key_details?.Description_En || ''}
              disabled
            />
            <InputBox
              titleLabel={t('whtRate.text')}
              className="signInInput inputBox mb-2"
              name="wht_rate"
              type="text"
              register={register}
              value={vendorDetails?.Wht_Rate ? `${vendorDetails?.Wht_Rate}%` : ''}
              disabled
            />
          </div>
          <div>
            <InputBox
              titleLabel={t('country.text')}
              className="signInInput inputBox mb-2"
              name="country"
              type="text"
              register={register}
              value={vendorDetails?.countryName || ''}
              disabled
            />
            <InputBox
              titleLabel={t('fax.text')}
              className="signInInput inputBox mb-2"
              name="fax"
              type="text"
              register={register}
              value={vendorDetails?.Fax || ''}
              disabled
            />

            <InputBox
              titleLabel={t('whtApplicable.text')}
              className="signInInput inputBox mb-2"
              name="wht_applicable"
              type="text"
              register={register}
              value={vendorDetails?.Wht_Applicable ? 'Yes' : 'No' || ''}
              disabled
            />
          </div>
        </div>
      </form>
      {openTUPopup ? (
        <CustomModal
          open={openTUPopup}
          onClose={() => setOpenTUPopup(false)}
          modalStyles={modalStyles}>
          <div className={styles.modalContent}>
            <TrackYourUpdatesPopup
              trackUpdatesData={trackUpdatesData}
              setOpenTUPopup={setOpenTUPopup}
            />
          </div>
        </CustomModal>
      ) : null}
      <CustomModal
        open={confirmProfileDelete}
        onClose={() => setConfirmProfileDelete(false)}
        modalStyles={{ width: 400 }}
        closeIcon
        header={t('popup:confirmSubmission')}
        //title={'Confirm Submission'}
        description={t('popup:deleteProfileConfirmation')}>
        {/* <p className="modalTxt">{t('popup:confirmChangeEntity')}</p> */}
        <div className="d-flex justify-content-space-between mb-2">
          <NormalButton
            label={t('otp:cancel')}
            outlineBtn
            customClass="confimationBtns me-3"
            onClick={() => setConfirmProfileDelete(false)}
          />
          <NormalButton
            label={t('otp:confirm')}
            isPrimaryModal
            isLoading={isDeleteLoading}
            disabled={isDeleteLoading}
            customClass="confimationBtns "
            onClick={handleProfileDelete}
          />
        </div>
      </CustomModal>
    </div>
  )
}
const mapStateToProps = (state) => ({
  myProfile: state.myProfile.profileData,
  userInfo: state.userInfo
})
const mapDispatchToProps = {
  showToast
}
export default connect(mapStateToProps, mapDispatchToProps)(GeneralAndCommunicationDetailsComp)
