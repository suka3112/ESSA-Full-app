import Fieldset from 'components/Common/FieldSet'
import { InputBox } from 'components/Common/InputBox'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import styles from './LegalIdentificationDetails.module.scss'
import { NormalButton } from 'components/Common/NormalButton'
import DateRangePicker from 'components/Common/DateRangePicker1'
import { useTranslation } from 'react-i18next'
import { connect, useSelector } from 'react-redux'
import CustomModal from '../../../../Common/Modal'
import TrackYourUpdatesPopup from '../../TrackYourUpdatesPopup'
import { getTrackUpdates } from 'api/MyProfile'
import FileIcons from 'components/Common/FileIcons'
import dayjs from 'dayjs'
import { getUserType } from 'services/helperFunctions'
import { ADMIN_USER_TYPE, BUSINESS_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'

const LegalIdentificationDetailsComp = ({
  isEditable,
  myProfile,
  showTUButton,
  setOpenTUPopup,
  openTUPopup
}) => {
  const {
    register,
    formState: { errors }
  } = useForm()

  const { t } = useTranslation(['legal_identification_comp', 'myprofile', 'otp', 'user_management','register'])
  const [trackUpdatesData, setTrackUpdatesData] = useState(null)
  const userType = useSelector((state) => state?.userInfo?.userType)
  const [loadingTU, setLoadingTU] = useState(false)

  const vendorDetails = myProfile
  const modalStyles = {
    maxWidth: '456px'
  }

  const trackUpdates = () => {
    setLoadingTU(true)
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
      .finally(() => {
        setLoadingTU(false)
      })
  }

  return (
    <div>
      <div className={styles.liDetailsContainer}>
        <div className="d-flex justify-content-between align-items-baseline">
          <div className={`mb-3 fs-5 ${styles.headerTitle}`}>{t('myprofile:legalIdentificationDetails')}</div>
          {userType !== BUSINESS_USER_TYPE && userType !== ADMIN_USER_TYPE && (
            <>
              {(showTUButton || vendorDetails?.Track_Button) && (
                <NormalButton
                  label={t('myprofile:trackYourUpdate')}
                  isPrimary
                  customClass="px-3"
                  onClick={trackUpdates}
                />
              )}
            </>
          )}
        </div>
        <div style={{ margin: '15px 15px 15px 0' }}>
          <Fieldset legend={t('trade_licence')} style={{paddingTop:"10px",padding:"10px 20px"}} className={`${styles.fieldset} my-3`}>
            <div className={styles.row}>
              <InputBox
                titleLabel={t('licenseNo.text')}
                className={`signIn-input inputBox mb-2`}
                name="license_number"
                type="text"
                labelClass="mb-1"
                register={register}
                value={vendorDetails?.Trade_license_number?.toUpperCase()}
                disabled={!isEditable}
              />
              <div className={`${styles.expiryDate} `}>
                <label>
                  {t('expiryDate.text')}
                </label>
                <DateRangePicker
                  disabled
                  value={
                    vendorDetails?.License_Expiry_Date
                      ? dayjs(vendorDetails.License_Expiry_Date)
                      : null
                  }
                />
              </div>
              <div className={styles.uploadDocuments}>
                <label className="d-flex gap-1 mt-[12px]" style={{marginBottom:"5px"}}>
                  {t('myprofile:uploadedDocuments')}
                  <span className="required">*</span>
                </label>
                {
                 vendorDetails?.licence_image?.length > 0 ?  
                <FileIcons files={vendorDetails?.licence_image} disabled={!isEditable} /> : <p className="file-color">{t('register:no_files_uploaded')}</p>
                }
              </div>
            </div>
          </Fieldset>
          <Fieldset legend={t('national_id')} style={{paddingTop:"10px",padding:"10px 20px"}} className={`${styles.fieldset} my-4`}>
            <div className={styles.row}>
              <InputBox
                titleLabel={t('nationalId.text')}
                className=" inputBox mb-2"
                name="national_id_number"
                labelClass="mb-1"
                type="text"
                register={register}
                value={vendorDetails?.National_Id_No?.toUpperCase()}
                disabled={!isEditable}
              />
              <div className={`${styles.expiryDate}`}>
                <label>
                  {t('nationalIdExpiryDate.text')}
                </label>
                <DateRangePicker
                  disabled
                  value={
                    vendorDetails?.National_Id_Expiry_Dt
                      ? dayjs(vendorDetails?.National_Id_Expiry_Dt)
                      : null
                  }
                />
              </div>
              <div className={styles.uploadDocuments}>
                <label className="d-flex gap-1 mt-[12px]" style={{marginBottom:"5px"}}>
                  {t('myprofile:uploadedDocuments')}
                  {/* <span className="required">*</span> */}
                </label>
                {
                  vendorDetails?.national_id_image?.length > 0 ?
                  <FileIcons files={vendorDetails?.national_id_image} disabled={!isEditable} /> : <p className="file-color">{t('register:no_files_uploaded')}</p>
                }
              </div>
            </div>
          </Fieldset>
          <Fieldset legend={t('vat')}  style={{paddingTop:"10px",padding:"20px 20px 10px 20px"}} className={`${styles.fieldset} my-4`}>
            <label >
              {t('vatGroup.text')} :{' '}
              <span className='cardValue'>
                {vendorDetails?.Is_VAT ? t('user_management:yes') : t('user_management:no')}
              </span>
            </label>
            <div className={styles.row}>
              <InputBox
                titleLabel={t('groupEntityName.text')}
                className={`signIn-input inputBox mb-2`}
                name="groupEntityName"
                type="text"
                register={register}
                value={vendorDetails?.VAT_Group_Name}
                disabled={!isEditable}
              />
              <InputBox
                titleLabel={t('vatNo.text')}
                className={`signIn-input inputBox mb-2`}
                name="vat_number"
                type="text"
                register={register}
                value={vendorDetails?.VAT_Number?.toUpperCase()}
                disabled={!isEditable}
              />
              <div className={styles.uploadDocuments}>
                <label className="d-flex gap-1 mt-[12px]" style={{marginBottom:"5px"}}>
                  {t('myprofile:uploadedDocuments')}
                  <span className="required">*</span>
                </label>
                { vendorDetails?.vat_image?.length > 0 ?
                <FileIcons files={vendorDetails?.vat_image} disabled={!isEditable} /> : <p className="file-color">{t('register:no_files_uploaded')}</p>
                }
              </div>
            </div>
          </Fieldset>
          <Fieldset legend={'NDA'}  style={{paddingTop:"10px",padding:"20px 20px 20px 20px"}}  className={`${styles.fieldset} my-3`}>
              {/* <div className={styles.uploadDocuments} style={{ marginTop: '10px' }}> */}
                <label className="d-flex gap-1 mb-2">
                  {t('myprofile:uploadedDocuments')}
                  <span className="required">*</span>
                </label>
                {
                  vendorDetails?.NDA_image?.length > 0 ?
                  <FileIcons files={vendorDetails?.NDA_image} disabled={!isEditable} /> : <p className="file-color">{t('register:no_files_uploaded')}</p>
                }
              {/* </div> */}
          </Fieldset>
        </div>
        <div className={isEditable ? 'd-flex justify-content-between' : 'd-none'}>
          <NormalButton label={t('otp:cancel')} outlineBtn customClass={styles.submitBtn} />
          <NormalButton label="Submit For Review" isPrimary customClass={styles.submitBtn} />
        </div>
      </div>
      {openTUPopup ? (
        <CustomModal
          open={openTUPopup}
          onClose={() => setOpenTUPopup(false)}
          modalStyles={modalStyles}>
          <div className={styles.modalContent}>
            <TrackYourUpdatesPopup
              trackUpdatesData={trackUpdatesData}
              setOpenTUPopup={setOpenTUPopup}
              loadingTU={loadingTU}
            />
          </div>
        </CustomModal>
      ) : null}
    </div>
  )
}

const mapStateToProps = (state) => ({
  myProfile: state.myProfile.profileData
})

export default connect(mapStateToProps)(LegalIdentificationDetailsComp)
