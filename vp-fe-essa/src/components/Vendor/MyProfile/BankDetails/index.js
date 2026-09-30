import React from 'react'
import './style.scss'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'
import {
  BankDetailsContainer,
  BankDetailsLabel,
  BankDetailsContent,
  BankFields,
  EditLink,
  Divider
} from './BankDetails.style'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { VENDOR_USER_TYPE } from 'constants/userType'
import FileIcons from 'components/Common/FileIcons'
import { styles } from 'assets/scss/styles'
import DetailItem from 'components/Common/DetailItemCard'

const BankDetailsComp = ({ isEditable, myProfile, handleTabChange, userInfo: { userType } }) => {
  const {
    register,
    formState: { errors }
  } = useForm()

  const { t,i18n } = useTranslation(['banking_details_comp', 'myprofile','register'])
    const isArabic = i18n.language === 'ar'
  const vendorDetails = myProfile?.vendor
  const bankDetails = myProfile?.bankDetails
  const bankFiles = myProfile?.bank_image
  
  const bankEncryption = myProfile?.Status

  return (
    <BankDetailsContainer>
      <div className={`mb-4 fs-5 headerTitle`}>{t('myprofile:bankDetails')}</div>
      <div className='row'>
        <div className={`${isArabic ? 'verticalDividerArabic' : 'verticalDivider'} col-6 dataValue`}>
          <DetailItem label={t('paymentBy.text')} value={t('normalBankTransfer')} />
          <DetailItem label={t('bankName.text')} value={bankDetails?.Bank_Name || '--'} />
          <DetailItem
            label={t('bankAccount.text')}
            value={bankEncryption === 4 || userType === VENDOR_USER_TYPE
                ? bankDetails?.Bank_Account_Number && bankDetails.Bank_Account_Number.length > 4
                  ? `${'*'.repeat(
                    bankDetails.Bank_Account_Number.length - 4
                  )}${bankDetails.Bank_Account_Number.slice(-4)}`
                  : '--'
                : bankDetails?.Bank_Account_Number || '--'} />
          <DetailItem
            label={t('swiftCode.text')}
            value={bankEncryption === 4 || userType === VENDOR_USER_TYPE
                ? bankDetails?.Swift_Code && bankDetails.Swift_Code.length > 3
                  ? `${'*'.repeat(bankDetails.Swift_Code.length - 3)}${bankDetails.Swift_Code.slice(
                    -3
                  )}`
                  : '--'
                : bankDetails?.Swift_Code || '--'} />
          <DetailItem label={t('bankStreet.text')} value={bankDetails?.Street_Building_Number || '--'} />
          <DetailItem label={t('bankChargeIndicator.text')} value={bankDetails?.Bank_Charge_Indicator || '--'} />
          <DetailItem label={t('invoiceCurrency.text')} value={bankDetails?.Invoice_Currency || '--'} />
        </div>
        <div className='dataValue col-6 px-4'>
          <DetailItem label={t('bankAccountCurrency.text')} value={bankDetails?.Bank_Account_Currency || '--'} />
          <DetailItem label={t('bankCountry.text')} value={bankDetails?.Bank_Country || '--'} />
          <DetailItem label={t('ibanNumber.text')} value={bankEncryption === 4 || userType === VENDOR_USER_TYPE
                ? bankDetails?.IBAN_Number && bankDetails.IBAN_Number.length > 3
                  ? `${'*'.repeat(
                    bankDetails.IBAN_Number.length - 3
                  )}${bankDetails.IBAN_Number.slice(-3)}`
                  : '--'
                : bankDetails?.IBAN_Number || '--'} />
          <DetailItem label={t('bankPostalCode.text')} value={bankDetails?.Bank_Postal || '--'} />
          <DetailItem label={t('bankCity.text')} value={bankDetails?.Bank_City || '--'} />
          <DetailItem 
            label={t('uploadBankFile.text')} 
            value={bankFiles && bankFiles.length > 0 ? <FileIcons files={bankFiles || ''} disabled={!isEditable} /> : t('register:no_files_uploaded') } />  
        </div>
        {/* <BankFields>
          <div>
            <label>{t('paymentBy.text')}</label>
            <label>{t('bankName.text')} </label>
            <label>{t('bankAccount.text')}</label>
            <label>{t('swiftCode.text')}</label>
            <label>{t('bankStreet.text')}</label>
            <label>{t('bankChargeIndicator.text')}</label>
            <label>{t('invoiceCurrency.text')}</label>
          </div>
          <div>
            <label className='fw-semibold'>{t('normalBankTransfer')}</label>
            <label className='fw-semibold'>{bankDetails?.Bank_Name || '--'}</label>
            <label className='fw-semibold'>
              {bankEncryption === 4 || userType === VENDOR_USER_TYPE
                ? bankDetails?.Bank_Account_Number
                  ? `${'*'.repeat(
                    bankDetails.Bank_Account_Number.length - 4
                  )}${bankDetails.Bank_Account_Number.slice(-4)}`
                  : '--'
                : bankDetails?.Bank_Account_Number || '--'}
            </label>

            <label className='fw-semibold'>
              {bankEncryption === 4 || userType === VENDOR_USER_TYPE
                ? bankDetails?.Swift_Code
                  ? `${'*'.repeat(bankDetails.Swift_Code.length - 3)}${bankDetails.Swift_Code.slice(
                    -3
                  )}`
                  : '--'
                : bankDetails?.Swift_Code || '--'}
            </label>

            <label className='fw-semibold'>{bankDetails?.Street_Building_Number || '--'}</label>
            <label className='fw-semibold'>{bankDetails?.Bank_Charge_Indicator || '--'}</label>
            <label className='fw-semibold'>{bankDetails?.Invoice_Currency || '--'}</label>
          </div>
        </BankFields>
        <BankFields>
          <div>
            
            <label>{t('bankAccountCurrency.text')}</label>
            <label>{t('bankCountry.text')}</label>
            <label>{t('ibanNumber.text')}</label>
            <label>{t('bankPostalCode.text')}</label>
            <label>{t('bankCity.text')}</label>
            <label>{t('uploadBankFile.text')}</label>
          </div>
          <div>

            <label className='fw-semibold'>{bankDetails?.Bank_Account_Currency || '--'}</label>
            <label className='fw-semibold'>{bankDetails?.Bank_Country || '--'}</label>
            <label className='fw-semibold'>
              {bankEncryption === 4 || userType === VENDOR_USER_TYPE
                ? bankDetails?.IBAN_Number
                  ? `${'*'.repeat(
                    bankDetails.IBAN_Number.length - 3
                  )}${bankDetails.IBAN_Number.slice(-3)}`
                  : '--'
                : bankDetails?.IBAN_Number || '--'}
            </label>
            <label className='fw-semibold'>{bankDetails?.Bank_Postal || '--'}</label>
            <label className='fw-semibold'>{bankDetails?.Bank_City || '--'}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {bankFiles.length > 0 ? <FileIcons files={bankFiles || ''} disabled={!isEditable} /> : "--" }
              
            </div>
          </div>
        </BankFields> */}
      </div>
      {isEditable && (
        <>
          <Divider />
          <EditLink>
            <b>{t('note')}</b>
            <span onClick={() => handleTabChange(4)}>{t('contact_admin_click')}</span>{' '}
            {t('contact_admin_suffix')}
          </EditLink>
        </>
      )}
    </BankDetailsContainer>
  )
}

const mapStateToProps = (state) => ({
  myProfile: state.myProfile.profileData,
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(BankDetailsComp)
