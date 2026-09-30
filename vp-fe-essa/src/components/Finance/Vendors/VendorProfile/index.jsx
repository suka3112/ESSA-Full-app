import React, { useState } from 'react'
import './style.scss'
import { Box } from '@mui/material'
import TabPanel from 'components/Common/Tabs'
import GeneralAndCommunicationDetails from './GeneralAndCommunication/GeneralAndcommunicationDetails/index.jsx'
import LegalIdentificationDetails from './LegalIdentificationDetails/LegalIdentificationDetails'
import PaymentTerms from './PaymentTerms/PaymentTermsDetails'
import BankDetails from './BankDetails'
import Contacts from './Contacts'
import Users from './Users'
import { MPSeparator, MPTab, MPTabs, MPTabsContainer, MPTabWrapper } from './VendorProfile.style'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import { NormalButton } from 'components/Common/NormalButton'
import SVGIcon from 'components/Common/SVGIcon'

export const VendorProfileComp = () => {
  const [activeTab, setActiveTab] = useState(0)

  const handleChange = (newValue) => {
    setActiveTab(newValue)
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

  const handleLoginAsSupplier = () => {
  }

  return (
    <LeftPageContainer className="profile-container">
      <HeaderBar title="123/1234" slug="Home / Vendors / 123/1234" >
    <NormalButton
      label="Login as Supplier"
      isPrimary
      customClass="px-3"
      onClick={() => handleLoginAsSupplier()}
    />
      <div className="helpIcon-container">
        <SVGIcon name="emailReport" size={25} className='cursor-pointer' alt="email" />
      </div>
      <div className="helpIcon-container">
        <SVGIcon name="download2" size={25} className='cursor-pointer' alt="download"  />
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
              <MPTab
                label="Contacts"
                value={4}
                onClick={() => handleChange(4)}
                className={activeTab === 4 ? 'active-tab' : ''}
              />
              <MPSeparator />
              <MPTab
                label="Users"
                value={5}
                onClick={() => handleChange(5)}
                className={activeTab === 5 ? 'active-tab' : ''}
              />
              <MPSeparator />
            </MPTabWrapper>
          </MPTabs>
        </MPTabsContainer>

        <TabPanel value={activeTab} index={0}>
          <GeneralAndCommunicationDetails />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <LegalIdentificationDetails />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <PaymentTerms />
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          <BankDetails />
        </TabPanel>
        <TabPanel value={activeTab} index={4}>
          <Contacts />
        </TabPanel>
        <TabPanel value={activeTab} index={5}>
          <Users />
        </TabPanel>
      </Box>
    </LeftPageContainer>
  )
}
