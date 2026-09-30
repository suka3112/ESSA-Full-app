import { useLocation } from 'react-router-dom'
import TrackApplicationComp from 'components/Vendor/TrackApplication'
import TrackApplicationFormComp from 'components/Vendor/TrackApplication/TrackApplicationForm'

export const TrackApplicationPage = () => {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const hasId = searchParams.has('id') // Checks if the URL has an "id" parameter

  return hasId ? <TrackApplicationComp /> : <TrackApplicationFormComp />
}


//tracking ui purpose
export const TrackApplicationUIPage = () => {
  return <TrackApplicationComp /> 
}