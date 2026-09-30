import React from 'react'
import {
  VendorDetailsWrapper,
  VendorInfoContainer,
  ProfileImage,
  VendorDetails,
  VendorHeaderTypography,
  VendorDetailsTypography,
  VendorDetailsColumn,
  VendorProfileImageContainer,
  ArabicPaymentTermsVendorDetailsTypography
} from './vendorDetails.style'
import Avatar from 'assets/images/user-avatar-white.png'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import moment from 'moment'

const VendorInfo = ({ dashboardData }) => {
  const { t, i18n } = useTranslation(['dashboard', 'legal_identification_comp'])
  const isArabic = i18n.language === 'ar'
  console.log('dashboardData', dashboardData)

  return (
    <>
      <VendorDetailsWrapper style={{ height: 'auto', overflow: 'clip' }}>
        <VendorProfileImageContainer>
          <ProfileImage
            src={dashboardData?.profile?.Image || Avatar}
            alt="profile"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = Avatar
            }}
          />
        </VendorProfileImageContainer>
        <VendorInfoContainer>
          <VendorDetails>
            <VendorHeaderTypography>{t('vendorName')}</VendorHeaderTypography>
            <VendorDetailsTypography>
              {(isArabic
                ? dashboardData?.profile?.Vendor_Name_AR
                : dashboardData?.profile?.Vendor_Name_EN) ||
                dashboardData?.profile?.Vendor_Name_EN ||
                '-'}
            </VendorDetailsTypography>
            <VendorDetailsColumn />
            <VendorHeaderTypography>{t('vendorCode')}</VendorHeaderTypography>
            <VendorDetailsTypography>
              {dashboardData?.profile?.Vendor_SAP_Code || '-'}
            </VendorDetailsTypography>
          </VendorDetails>
          <VendorDetails>
            <VendorHeaderTypography>{t('primaryPersonName')}</VendorHeaderTypography>
            <VendorDetailsTypography>
              {dashboardData?.profile?.Daikin_Contact_Name || '-'}
            </VendorDetailsTypography>
            <VendorDetailsColumn />
            <VendorHeaderTypography>{t('primaryContactPerson')}</VendorHeaderTypography>
            <VendorDetailsTypography>
              {dashboardData?.profile?.Email || '-'}
            </VendorDetailsTypography>
          </VendorDetails>
          <VendorDetails>
            <VendorHeaderTypography>{t('tradeLicenceNo')}</VendorHeaderTypography>
            <VendorDetailsTypography>
              {dashboardData?.profile?.Trade_license_number?.toUpperCase() || '-'}
            </VendorDetailsTypography>
            <VendorDetailsColumn />
            <VendorHeaderTypography>{t('tradeLicenceExpiryDate')}</VendorHeaderTypography>
            <VendorDetailsTypography>
              {dashboardData?.profile?.License_Expiry_Date
                ? moment(dashboardData?.profile?.License_Expiry_Date).format('DD/MM/YYYY')
                : '-'}
            </VendorDetailsTypography>
          </VendorDetails>
          <VendorDetails>
            <VendorHeaderTypography>{t('vatNo')}</VendorHeaderTypography>
            <VendorDetailsTypography>
              {dashboardData?.profile?.VAT_Number?.toUpperCase() || '-'}
            </VendorDetailsTypography>
            <VendorDetailsColumn />
            <VendorHeaderTypography>{t('paymentTerms')}</VendorHeaderTypography>
            {isArabic ? (
              <ArabicPaymentTermsVendorDetailsTypography>
                {dashboardData?.profile?.Payment_Terms
                  ? `${dashboardData?.profile?.Payment_Terms}`
                  : '-'}
              </ArabicPaymentTermsVendorDetailsTypography>
            ) : (
              <VendorDetailsTypography>
                {dashboardData?.profile?.Payment_Terms
                  ? `${dashboardData?.profile?.Payment_Terms}`
                  : '-'}
              </VendorDetailsTypography>
            )}
          </VendorDetails>
        </VendorInfoContainer>
      </VendorDetailsWrapper>
    </>
  )
}

const mapStateToProps = (state) => ({
  dashboardData: state.dashboard.dashboardData
})

export default connect(mapStateToProps)(VendorInfo)
