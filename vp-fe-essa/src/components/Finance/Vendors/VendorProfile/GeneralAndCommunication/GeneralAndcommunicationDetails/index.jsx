import React from 'react'
import styles from './GeneralAndCommunication.module.scss'
import profileLogo from '../../../../../../assets/icons/profileLogo.svg'
import editIcon from '../../../../../../assets/icons/editPencilIcon.svg'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'

const GeneralAndCommunicationDetailsComp = () => {
  const {
    register,
    formState: { errors }
  } = useForm()
  return (
    <div className={styles.gcDetailsContainer}>
      <div className={styles.formHeader}>
        <label className="mb-4">General and Communication Details</label>
      </div>
      <div className={styles.gcDetailsUser}>
        <div className="d-flex gap-5 align-items-center">
          <div className={styles.profileLogoContainer}>
            <img src={profileLogo} alt="profile logo" />
            <img src={editIcon} alt="edit" className={styles.editIcon} />
          </div>
          <div className={styles.userFields}>
            <div>
              <label>Vendor Name:</label>
              <label>Vendor Code:</label>
              <label>Phone Number:</label>
            </div>
            <div>
              <label>Al Noor Trading Co.</label>
              <label>VND-ME2024</label>
              <label>+971 45678901</label>
            </div>
          </div>
        </div>
        <div className={styles.userFields}>
          <div>
            <label>Email:</label>
            <label>Diakin Entity Name:</label>
            <label>ABC Indicator:</label>
          </div>
          <div>
            <label>admin@alnoortrading.ae </label>
            <label>Middle East Procurement LLC</label>
            <label>A</label>
          </div>
        </div>
      </div>
      <hr className="divider" />
      <form>
        <div className={styles.gcDetailsInputs}>
          <div>
            <InputBox
              titleLabel="Street / House No."
              className="signInInput inputBox mb-4"
              name="stHouseNo"
              type="text"
              register={register}
              rules={{
                required: 'Street / House No. is required'
              }}
              error={errors.stHouseNo}
              disabled
            />
            <InputBox
              titleLabel="Country"
              className="signInInput inputBox mb-4"
              name="country"
              type="text"
              register={register}
              rules={{
                required: 'Country is required'
              }}
              error={errors.country}
              disabled
            />
            <InputBox
              titleLabel="Industry Key"
              className="signInInput inputBox mb-4"
              name="industryKey"
              type="text"
              register={register}
              rules={{
                required: 'Industry is required'
              }}
              error={errors.industryKey}
              disabled
            />
            <InputBox
              titleLabel="WHT Applicable"
              className="signInInput inputBox mb-4"
              name="whtApplicable"
              type="text"
              register={register}
              rules={{
                required: 'WHT Applicable is required'
              }}
              error={errors.whtApplicable}
              disabled
            />
          </div>
          <div>
            <InputBox
              titleLabel="Postal Code"
              className="signInInput inputBox mb-4"
              name="postalCode"
              type="text"
              register={register}
              rules={{
                required: 'Postal Code is required'
              }}
              error={errors.postalCode}
              disabled
            />
            <InputBox
              titleLabel="Fax"
              className="signInInput inputBox mb-4"
              name="fax"
              type="text"
              register={register}
              rules={{
                required: 'Fax is required'
              }}
              error={errors.fax}
              disabled
            />
            <InputBox
              titleLabel="WHT Rate"
              className="signInInput inputBox mb-4"
              name="whtRate"
              type="text"
              register={register}
              rules={{
                required: 'WHT Rate is required'
              }}
              error={errors.whtRate}
              disabled
            />
          </div>
          <div>
            <InputBox
              titleLabel="City"
              className="signInInput inputBox mb-4"
              name="city"
              type="text"
              register={register}
              rules={{
                required: 'City is required'
              }}
              error={errors.city}
              disabled
            />
            <InputBox
              titleLabel="Industry Type"
              className="signInInput inputBox mb-4"
              name="industryType"
              type="text"
              register={register}
              rules={{
                required: 'Industry Type is required'
              }}
              error={errors.industryType}
              disabled
            />
            <InputBox
              titleLabel="Taxable Basis"
              className="signInInput inputBox mb-4"
              name="taxableBasis"
              type="text"
              register={register}
              rules={{
                required: 'Taxable Basis is required'
              }}
              error={errors.taxableBasis}
              disabled
            />
          </div>
        </div>
      </form>
    </div>
  )
}

export default GeneralAndCommunicationDetailsComp
