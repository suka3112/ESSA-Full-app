import React from 'react'
import styles from './Contacts.module.scss'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'
import nameIcon from '../../../../assets/icons/nameIcon.svg'
import deptIcon from '../../../../assets/icons/deptIcon.svg'
import mailIcon from '../../../../assets/icons/mailIcon.svg'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'

const ContactsComp = ({ myProfile }) => {
  const {
    register,
    formState: { errors }
  } = useForm()
  const { t } = useTranslation('myprofile')

  const CRDetails = myProfile?.contact

  return (
    <div>
      <div className={styles.cdContainer}>
        <div className={`mb-3 fs-5 ${styles.headerTitle}`}>{t('contactsDetails')}</div>
        <div className={`${styles.contactDetailsRow} mt-2`}>
          {
            CRDetails?.map((item) => (
              <div key={item?.email}>
                <div className={styles.contactDetails}>
                  <img src={nameIcon} alt="name Icon" />
                  <p>{item?.name || 'N/A'}</p>
                </div>
                <div className={styles.contactDetails}>
                  <img src={deptIcon} alt="name Icon" />
                  <p>{item?.department || 'N/A'}</p>
                </div>
                <div className={styles.contactDetails}>
                  <img src={mailIcon} alt="name Icon" />
                  <p>{item?.email || 'N/A'}</p>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

const mapStateToProps = (state) => ({
  myProfile: state.myProfile.profileData
})

export default connect(mapStateToProps)(ContactsComp)
