import React from 'react'
import styles from './Contacts.module.scss'
import { useForm } from 'react-hook-form'
import nameIcon from '../../../../../assets/icons/nameIcon.svg'
import deptIcon from '../../../../../assets/icons/deptIcon.svg'
import mailIcon from '../../../../../assets/icons/mailIcon.svg'

const ContactsComp = () => {
  const {
    register,
    formState: { errors }
  } = useForm()
  return (
    <div className={styles.cdContainer}>
      <label className="mb-4">Contacts Details</label>
      <div className={`${styles.contactDetailsRow} my-3`}>
        <div>
          <div className={styles.contactDetails}>
            <img src={nameIcon} alt="name Icon" />
            <p>Mr. Ahmed Khalid</p>
          </div>
          <div className={styles.contactDetails}>
            <img src={deptIcon} alt="name Icon" />
            <p>Finance Department</p>
          </div>
          <div className={styles.contactDetails}>
            <img src={mailIcon} alt="name Icon" />
            <p>ahmed.khalid@supportdemo.me</p>
          </div>
        </div>
        <div>
          <div className={styles.contactDetails}>
            <img src={nameIcon} alt="name Icon" />
            <p>Mr. Ahmed Khalid</p>
          </div>
          <div className={styles.contactDetails}>
            <img src={deptIcon} alt="name Icon" />
            <p>Finance Department</p>
          </div>
          <div className={styles.contactDetails}>
            <img src={mailIcon} alt="name Icon" />
            <p>ahmed.khalid@supportdemo.me</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactsComp
