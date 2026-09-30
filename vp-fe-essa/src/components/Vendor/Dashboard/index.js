import React, { useEffect, useState } from 'react'
import { Grid, Box } from '@mui/material'
import ReturnDashboardCards from './ReturnDashboardCards'
import CardWithArrow from './CardWithArrow'
import { HeaderBar } from 'components/Common/HeaderBar'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { connect } from 'react-redux'
import VendorInfo from './vendorInfo'
import { getDashboardDataApi } from 'action/dashbaordAct'
import { getDashboardData } from 'api/Dashboard'
import { setDashboardData } from '../../../redux/actions/dashboardAction'
import { useTranslation } from 'react-i18next'
import Invoice from './Invoice'
import ReconciliationSummary from './ReconciliationSummary'
import { ADMIN_USER_TYPE, FINANCE_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import { getEntityId } from 'services/utilities'
import { PageLoader } from 'components/Common/PageLoader'

const VendorDashboardComponent = ({ userInfo: { userType }, setDashboardData }) => {
  const { t } = useTranslation(['dashboard', 'sidebar'])
  const [isLoading, setIsLoading] = useState(true)
  const currentEntityId = getEntityId()
  useEffect(() => {
    if (currentEntityId) {
      fetchDashboardData()
    } else {
      setTimeout(() => {
        fetchDashboardData()
      }, 1000)
    }
  }, [])

  const fetchDashboardData = () => {
    setIsLoading(true)
    getDashboardData({ entity_id: getEntityId() })
      .then((res) => {
        console.log('getDashboardData res', res)
        setDashboardData(res?.data?.data)
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  return (
    <LeftPageContainer>
      {isLoading ? (
        <div className="no-data-container-view">
          <PageLoader />
        </div>
      ) : (
        <>
          <HeaderBar
            title={t('sidebar:dashboard')}
            slug={t('home')}
            showBackArrow={false}
            dasboardHeader
          />
          <Box>
            {userType === VENDOR_USER_TYPE && (
              <Grid item xs={12} sm={12} md={6}>
                <VendorInfo />
              </Grid>
            )}
            <Grid container spacing={4}>
              <Grid item xs={12} sm={12} md={12}>
                <ReturnDashboardCards userType={userType} />
              </Grid>
            </Grid>

            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                {/* Optional: BoxWrapper to visually match the dashboard card */}
                {/* <BoxWrapper> */}
                <ReconciliationSummary />
                {/* </BoxWrapper> */}
              </Grid>
              <Grid item xs={12} md={8}>
                {/* <BoxWrapper style={{ height: '100%' }}> */}
                <Invoice />
                {/* </BoxWrapper> */}
              </Grid>
            </Grid>

            {(userType === VENDOR_USER_TYPE || userType === ADMIN_USER_TYPE) && (
              <Grid container spacing={2} sx={{ paddingTop: 0 }}>
                <Grid item xs={12}>
                  <CardWithArrow />
                </Grid>
              </Grid>
            )}
          </Box>
        </>
      )}
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo // Getting userInfo from Redux store
})

// Map actions to props
const mapDispatchToProps = {
  getDashboardDataApi,
  setDashboardData
}

export default connect(mapStateToProps, mapDispatchToProps)(VendorDashboardComponent)
