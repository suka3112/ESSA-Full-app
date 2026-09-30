import React, { useState } from 'react'
import styles from './BankDetails.module.scss'
import { InputBox } from 'components/Common/InputBox'
import { Controller, useForm } from 'react-hook-form'
import { NormalButton } from 'components/Common'
import { SelectBox } from 'components/Common/SelectBox'
import tooltipIcon from '../../../../../assets/icons/tooltip.svg'
import CustomModal from 'components/Common/Modal'
import { useTranslation } from 'react-i18next'

const BankDetailsComp = ({ isEditable }) => {
  const {
    register,
    formState: { errors },
    control,
    trigger,
  } = useForm()

  const [formSubmitted, setFormSubmitted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [actionType, setActionType] = useState('')
  const { t } = useTranslation(['otp', 'login'])

  const options = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' }
  ]


  const handleNext = async () => {
    const isValid = await trigger()

    if (isValid) {
      setModalMessage(t('login:yourApplicationHasBeenSavedButIsNotYetSubmitted'))
      setActionType('save')
      setIsModalOpen(true)
    }
  }

  const handleSubmitForm = async () => {
    const isValid = await trigger()
    if (isValid) {
      setModalMessage(t('login:areYouSureYouWantToSubmitYourApplication'))
      setActionType('submit')
      setIsModalOpen(true)
    }
  }

  const handleConfirmSubmit = () => {
    if (actionType === 'save') {
    } else if (actionType === 'submit') {
      setFormSubmitted(true)
    }
    setIsModalOpen(false)
  }

  const handleCancelSubmit = () => {
    setIsModalOpen(false)
  }
  return (
    <div className={styles.ptContainer}>
      <label className="my-3">Bank Details</label>
      <form>
        <div className={styles.ptInputs}>
          <div>
            <div className={`${styles.userInputs} mb-4`}>
              <label className='d-flex gap-1 mb-2'>
                Bank Account Currency <span className="required">*</span>
                <img src={tooltipIcon} alt="tooltip" />
              </label>
              <Controller
                name="bankAccCurrency"
                control={control}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className="custom-select-box user-input"
                      error={error}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      options={options}
                      name="bankAccCurrency"
                      isRequired
                    />
                  </div>
                )}
              />
            </div>


          </div>
          <div className={`${styles.userInputs}`}>
            <label className='d-flex gap-1 mb-2'>
              Bank Country <span className="required">*</span>
              <img src={tooltipIcon} alt="tooltip" />
            </label>
            <Controller
              name="bankCountry"
              control={control}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div className="select-container">
                  <SelectBox
                    className="custom-select-box user-input"
                    error={error}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    options={options}
                    name="bankCountry"
                    isRequired
                  />
                </div>
              )}
            />
          </div>
          <div className={`${styles.userInputs} mb-4`}>
            <label className='d-flex gap-1 mb-2'>
              City <span className="required">*</span>
              <img src={tooltipIcon} alt="tooltip" />
            </label>
            <Controller
              name="city"
              control={control}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div className="select-container">
                  <SelectBox
                    className="custom-select-box user-input"
                    error={error}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    options={options}
                    name="city"
                    isRequired
                  />
                </div>
              )}
            />
          </div>
          <div>
            <InputBox
              titleLabel="Postal Code"
              className="signInInput inputBox mb-4"
              name="postalCode"
              type="text"
              register={register}
              error={errors.postalCode}
              rules={{
                required: 'Postal Code is required'
              }}
              isRequired
              tooltipIcon
            />
          </div>
          <div>
            <InputBox
              titleLabel="Swift Code"
              className="signInInput inputBox mb-4"
              name="swiftCode"
              type="text"
              register={register}
              error={errors.swiftCode}
              isRequired
              tooltipIcon
            />
          </div>
          <div className={`${styles.userInputs} mb-4`}>
            <label className='d-flex gap-1 mb-2'>
              Invoice Currency <span className="required">*</span>
              <img src={tooltipIcon} alt="tooltip" />
            </label>
            <Controller
              name="invoiceCurrency"
              control={control}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div className="select-container">
                  <SelectBox
                    className="custom-select-box user-input"
                    error={error}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    options={options}
                    name="invoiceCurrency"
                    isRequired
                  />
                </div>
              )}
            />
          </div>
          <div>
            <InputBox
              titleLabel="Street/Building No.(Bank)"
              className="signInInput inputBox mb-4"
              name="stNo"
              type="text"
              register={register}
              error={errors.stNo}
              isRequired
              tooltipIcon
            />
          </div>
        </div>
        <div className={'d-flex justify-content-between'}>
          <NormalButton label="Back" outlineBtn customClass={styles.submitBtn} />
          <div className='d-flex gap-3'>
            <NormalButton label="Save & Continue" isPrimary customClass={styles.submitBtn} onClick={handleNext} />
            <NormalButton label="Submit" isPrimary customClass={styles.submitBtn} onClick={handleSubmitForm} />
          </div>
        </div>
      </form>
      <CustomModal open={isModalOpen} onClose={handleCancelSubmit} modalStyles={{ width: 600 }} closeIcon>
        <p className="modalTxt">{modalMessage}</p>
        <div className="d-flex justify-content-between my-3">
          <NormalButton
            label={t('cancel')}
            outlineBtn
            customClass="navigation-buttons"
            onClick={handleCancelSubmit}
          />
          <NormalButton
            label={t('confirm')}
            isPrimary
            customClass="navigation-buttons"
            onClick={handleConfirmSubmit}
          />
        </div>
      </CustomModal>
    </div>
  )
}

export default BankDetailsComp
