import SOAComp from 'components/Vendor/SOA'
import SOAMonthComp from 'components/Vendor/SOA/SOAMonthComp'
import { useLocation } from 'react-router-dom'
import SOAHistoryComp from 'components/Vendor/SOA/SOAHistory'

export const SOAHistoryPage = () => {
  return <SOAHistoryComp />
}

export const SOAPage = () => {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const hasMonthParam = searchParams.has('startDate')
  return hasMonthParam === true ? <SOAMonthComp /> : <SOAComp />
}
