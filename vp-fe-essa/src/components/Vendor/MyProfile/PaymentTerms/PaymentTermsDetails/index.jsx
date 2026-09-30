import React, { useState } from 'react'
import styles from './PaymentTermsDetails.module.scss'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { connect, useSelector } from 'react-redux'
import { NormalButton } from 'components/Common'
import CustomModal from '../../../../Common/Modal'
import TrackYourUpdatesPopup from '../../TrackYourUpdatesPopup'
import { getTrackUpdates } from 'api/MyProfile'
import { ADMIN_USER_TYPE, BUSINESS_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import FileIcons from 'components/Common/FileIcons'

const PaymentTermsComp = ({ isEditable, myProfile, showTUButton, openTUPopup, setOpenTUPopup }) => {
  const {
    register,
    formState: { errors },
    control
  } = useForm()

  const { t, i18n } = useTranslation(["payment_terms_comp", "myprofile",'register']);
  const isArabic = i18n.language === 'ar'


  const vendorDetails = myProfile;
  const [trackUpdatesData, setTrackUpdatesData] = useState(null)
  const [loadingTU, setLoadingTU] = useState(false)
  const userType = useSelector((state) => state?.userInfo?.userType)

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
          status: res?.data?.data?.Status,
        })
      })
      .catch((err) => {
        console.error(err)
      }).finally(() => {
        setLoadingTU(false)
      })
  }


  return (
    <div className={styles.ptContainer}>

      <div className='d-flex justify-content-between align-items-baseline'>
        <div className={`mb-4 fs-5 ${styles.headerTitle}`}>{t('myprofile:paymentTerms')}</div>
        {userType !== BUSINESS_USER_TYPE && userType !== ADMIN_USER_TYPE && <>
          {(showTUButton || vendorDetails?.Track_Button) && (
            <NormalButton label={t('myprofile:trackYourUpdate')} isPrimary customClass='px-3' onClick={trackUpdates} />
          )}
        </>}
      </div>
      <form>
        <div className={styles.ptInputs}>
          <div>
            <InputBox 
              titleLabel={t("invoicePaymentTerms.text")}
              className="inputBox mb-2"
              name="payment_terms"
              type="text"
              register={register}
              value={vendorDetails?.payment_terms_details?.Description_En || ""}
              disabled={!isEditable}
              inputStyle={{direction: isArabic ? "ltr" : "", textAlign: isArabic ? "end" : ""}}
            />
          </div>
          <div>
            <InputBox
              titleLabel={t("creditPaymentTerms.text")}
              className="signInInput inputBox mb-2"
              name="creditnote_payment_terms"
              type="text"
              register={register}
              value={'ZU00 - Immediate Due' || ""}
              disabled={!isEditable}
            />

          </div>
          <div>
            <InputBox
              titleLabel={t("incoterms.text")}
              className="signInInput inputBox mb-2"
              name="incoterms"
              type="text"
              register={register}
              value={vendorDetails?.Incoterms_details?.Description_En || ''}
              disabled={!isEditable}
            />
          </div>
          <InputBox
            titleLabel={t("incotermsLocation.text")}
            className="signInInput inputBox mb-2"
            name="incoterms_location"
            type="text"
            register={register}
            value={vendorDetails?.Incoterms_Location}
            disabled={!isEditable}
          />
        </div>

        {/* payment terms - file attachment */}
        {vendorDetails?.payment_terms_details?.Description_En !== '90 days' && (
          <div>
            <div className={styles.uploadDocuments}>
              <label className="d-flex gap-1 mb-2">
                {t('myprofile:uploadedDocuments')}
              </label>
              {
                vendorDetails?.payment_image?.length > 0 ?
             <FileIcons files={vendorDetails?.payment_image} disabled={!isEditable} />
  : <p className="file-color">{t('register:no_files_uploaded')}</p>
              }
            </div>
            <div style={{ marginTop: '15px',}}>
              <InputBox
                titleLabel={t("reasonForShorterPayment.text")}
                className="signInInput inputBox mb-2"
                name="payment_reason"
                type="textarea"
                register={register}
                value={vendorDetails?.Short_Payment_Reason}
                disabled={!isEditable}
              />
            </div>
          </div>
        )}

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

export default connect(mapStateToProps)(PaymentTermsComp)

