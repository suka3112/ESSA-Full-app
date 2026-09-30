import React, { useState } from 'react'
import styles from './VendorsList.module.scss'
import { NormalButton } from 'components/Common/NormalButton'
import emailReport from '../../../../assets/icons/emailReport.svg'
import download from '../../../../assets/icons/downloadIcon2.svg'
import addIcon from '../../../../assets/icons/addIconWhite.svg'
import TableComponent from 'components/Common/TableComponent'
import { useNavigate } from 'react-router-dom'
import SearchInput from 'components/Common/SearchInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { HeaderBar } from 'components/Common/HeaderBar'
import CustomModal from 'components/Common/Modal'
import { InputBox } from 'components/Common/InputBox'
import { Controller, useForm } from 'react-hook-form'
import { SelectBox } from 'components/Common/SelectBox'
import tooltipIcon from '../../../../assets/icons/tooltip.svg'
import SuccessPopup from 'components/Common/SuccessPopup'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import downloadIcon2 from '../../../../assets/icons/downloadIcon2.svg'
import styled from 'styled-components'
import { UtilIcon, UtilIconFaq } from '../../../Common/UtilIcon'
import { connect } from 'react-redux'
import { VENDORS_APPLICATION, VENDORS_UPDATES } from 'constants/url'
import { BUSINESS_USER_TYPE, VENDOR_PORTAL } from 'constants/userType'
import EmailReportComp from 'components/Vendor/EmailReport'
import { useTranslation } from 'react-i18next'

const VendorsListComp = ({ userInfo: { userType } }) => {
  const {
    register,
    formState: { errors },
    control
  } = useForm()
  const navigate = useNavigate()
  const [inviteVendor, setInviteVendor] = useState(false)
  const [inviteLink, setInviteLink] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)
  const [emailReportState, setEmailReportState] = useState(false)
  const { t } = useTranslation(['vendors', 'dashboard'])


  const handleVendorsApplication = () => {
    // navigate('/finance/vendors-application')
    navigate(`/${userType}${VENDORS_APPLICATION}`)
  }

  const handleVendorsUpdate = () => {
    // navigate('/finance/vendors-update')
    navigate(`/${userType}${VENDORS_UPDATES}`)
  }

  const handleDownload = () => {
    setDownloadReport(true)
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  const options = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' }
  ]

  const handleInviteLinkPopup = () => {
    setInviteVendor(false)
    setInviteLink(true)
  }

  return (
    <LeftPageContainer>
      <div className={styles.poContainer}>
        <HeaderBar title={t('vendors')} slug={`${t('dashboard:home')} / ${t('vendors')}`}>
          <div>
            <NormalButton
              label={t('vendorsApplication')}
              isPrimary
              customClass={styles.actionBtns}
              onClick={() => handleVendorsApplication()}
            />
          </div>
          <div>
            {userType !== BUSINESS_USER_TYPE && (
              <NormalButton
                label={t('vendorsUpdate')}
                isPrimary
                customClass={styles.actionBtns}
                onClick={() => handleVendorsUpdate()}
              />
            )}
            {userType === BUSINESS_USER_TYPE && (
              <NormalButton
                label="View Vendors Update"
                isPrimary
                customClass={styles.actionBtns}
                onClick={() => handleVendorsUpdate()}
              />
            )}
          </div>
          <div>
            <NormalButton
              label={t('inviteVendor')}
              isPrimary
              customClass={`${styles.actionBtns} ${styles.inviteVendorBtn}`}
              leftIcon={addIcon}
              onClick={() => setInviteVendor(true)}
            />
          </div>
          <div style={{ display: 'flex' }}>
            <UtilIconFaq name="emailReport" onClick={() => setEmailReportState(true)} />
            <UtilIconFaq name="download2" onClick={handleDownload} />
          </div>
        </HeaderBar>
      </div>
      {/* Filters */}
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className={styles.tableHeaderContainer}>
          <SearchInput placeholder={t('searchByVendorNameCodeEmail')} />
          <div className="d-flex gap-4">
            <TableSelectBox label={t('status')} options={['All', 'active', 'Inactive']} />
            <TableSelectBox
              label={t('vendorNameOrCode')}
              options={['Aaliyah', 'Amir', 'John Doe', 'Jane Doe']}
            />
          </div>
        </div>
        <TableComponent />
      </div>
      {inviteVendor ? (
        <CustomModal
          open={inviteVendor}
          title={t('inviteNewVendor')}
          onClose={() => setInviteVendor(false)}>
          <div className={styles.modalContent}>
            <div>
              <label className={`${styles.inputTitle} d-flex gap-1 mb-2`}>
                {t('selectEntity.text')} <span className="required">*</span>
              </label>
              <Controller
                name="selectEntity"
                control={control}
                defaultValue=""
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className={`${styles.userInput} custom-select-box`}
                      error={error}
                      label={t('selectEntity.text')}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      options={options}
                      name="selectEntity"
                      isRequired
                    />
                  </div>
                )}
              />
            </div>
            <div>
              <label className={`${styles.inputTitle} d-flex gap-1 mb-2`}>
                {t('crPerson.text')} <span className="required">*</span>
              </label>
              <Controller
                name="crPerson"
                control={control}
                defaultValue=""
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className={`${styles.userInput} custom-select-box`}
                      error={error}
                      label={t('crPerson.text')}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      options={options}
                      name="crPerson"
                      isRequired
                    />
                  </div>
                )}
              />
            </div>
            <InputBox
              titleLabel={t('enterVendorName.text')}
              className="user-input inputBox"
              name="vendorName"
              type="text"
              register={register}
              error={errors.vendorName}
              isRequired
            />
            <InputBox
              titleLabel={t('enterEmail.text')}
              className="user-input inputBox"
              name="email"
              type="text"
              register={register}
              error={errors.email}
              isRequired
            />
            <NormalButton
              label={t('sendInviteLink')}
              isPrimary
              customClass={styles.inviteBtn}
              onClick={handleInviteLinkPopup}
            />
          </div>
        </CustomModal>
      ) : null}
      {inviteLink && (
        <SuccessPopup
          open={inviteLink}
          successMsg="Invite Link has been sent successfully."
          onClose={() => setInviteLink(false)}
        />
      )}
      <EmailReportComp open={emailReportState} onClose={() => setEmailReportState(false)} />

      <DownloadReportComp
        open={downloadReport}
        onClose={handleCloseDownload}
        title="Vendors list.pdf"
      />
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo // Getting userInfo from Redux store
})

// Map actions to props
const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(VendorsListComp)
