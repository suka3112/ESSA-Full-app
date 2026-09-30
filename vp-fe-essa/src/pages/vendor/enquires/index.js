import AddEditEnquiryComp from 'components/Vendor/Enquires/AddEditEnquiry'
import EnqueriesConvertation from 'components/Vendor/Enquires/EnqueriesConvertation'
import EnquiresListComp from 'components/Vendor/Enquires/EnquiresList'
import { useSearchParams } from 'react-router-dom'

export const EnquiresPage = () => {
  return  <EnquiresListComp />
}
export const AddEditEnquiresPage = () => {
  return <AddEditEnquiryComp />
}
export const ViewEnquiresPage = () => {
  return <EnqueriesConvertation/>
}
