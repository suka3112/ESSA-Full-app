import React, { useState } from 'react'
import './style.scss'
import { Box } from '@mui/material'
import TabPanel from 'components/Common/Tabs'
import BankDetails from './BankDetails'
import { MPSeparator, MPTab, MPTabs, MPTabsContainer, MPTabWrapper } from './MyProfile.style'
import EditGeneralCommunicationComp from './GeneralAndCommunication/EditGeneralCommunication/EditGeneralCommunication'
import EditLegalIdentificationDetailsComp from './LegalIdentificationDetails/EditLegalIdentificationDetails'
import EditPaymentTermsComp from './PaymentTerms/EditPaymentTerms'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import { useTranslation } from 'react-i18next'
import SVGIcon from 'components/Common/SVGIcon';

export const AddVendorComp = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [isEditable, setIsEditable] = useState(false)
  const { t } = useTranslation(['vendors', 'dashboard'])

  const handleChange = (newValue) => {
    setActiveTab(newValue)
    setIsEditable(false)
  }

  const handleEditClick = () => {
    setIsEditable(!isEditable)
  }

  const handleNextClick = () => {
    if (activeTab < 6) {
      setActiveTab((prevTab) => prevTab + 1)
    }
  }

  const handleBackClick = () => {
    if (activeTab > 0) {
      setActiveTab((prevTab) => prevTab - 1)
    }
  }

  return (
    <LeftPageContainer className="profile-container">
      <HeaderBar title={t('addNewVendor')} slug={`${t('dashboard:home')} / ${t('vendors')} / ${t('addNewVendor')}`}>
        <div className="helpIcon-container">
          <SVGIcon name="emailReport" size={25} className='cursor-pointer' />
        </div>
        <div className="helpIcon-container">
          <SVGIcon name="download" size={25} className='cursor-pointer' />
        </div>
      </HeaderBar>
      <Box sx={{ width: '100%' }}>
        <MPTabsContainer>
          <MPTabs value={activeTab} variant="scrollable">
            <MPTabWrapper>
              <MPTab
                label="General & Communication Details"
                value={0}
                onClick={() => handleChange(0)}
                className={activeTab === 0 ? 'active-tab' : ''}
              />
              <MPSeparator />
              <MPTab
                label="Legal Identification Details"
                value={1}
                onClick={() => handleChange(1)}
                className={activeTab === 1 ? 'active-tab' : ''}
              />
              <MPSeparator />
              <MPTab
                label="Payment Terms"
                value={2}
                onClick={() => handleChange(2)}
                className={activeTab === 2 ? 'active-tab' : ''}
              />
              <MPSeparator />
              <MPTab
                label="Bank Details"
                value={3}
                onClick={() => handleChange(3)}
                className={activeTab === 3 ? 'active-tab' : ''}
              />
              <MPSeparator />
            </MPTabWrapper>
          </MPTabs>
        </MPTabsContainer>

        <TabPanel value={activeTab} index={0}>
          <EditGeneralCommunicationComp isEditable={isEditable} onNextClick={handleNextClick} />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <EditLegalIdentificationDetailsComp
            isEditable={isEditable}
            onNextClick={handleNextClick}
            onBackClick={handleBackClick}
          />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <EditPaymentTermsComp onNextClick={handleNextClick} />
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          <BankDetails isEditable={isEditable} />
        </TabPanel>
      </Box>
    </LeftPageContainer>
  )
}
