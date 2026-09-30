import { connect } from 'react-redux'
import { hideToast, showToast } from '../../../redux/actions/toastActions'
import VendorDashboardComponent from 'components/Vendor/Dashboard'
import OutstandingPayment from 'components/Vendor/Dashboard/OutstandingPayment'


const VendorDashboard = ({ showToast, hideToast, userInfo }) => {
  return <VendorDashboardComponent showToast={showToast} hideToast={hideToast} />
}

export const OutstandingPaymentPage = () => {
  return <OutstandingPayment />
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo // Getting userInfo from Redux store
})

const mapDispatchToProps = {
  showToast,
  hideToast
}

export default connect(mapStateToProps, mapDispatchToProps)(VendorDashboard)
