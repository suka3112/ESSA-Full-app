import { AddVendorComp } from "components/Admin/Vendors/AddVendor"
import { VendorsAppListComp } from "components/Admin/Vendors/VendorsApplicationList"
import VendorsListComp from "components/Admin/Vendors/VendorsList"
import { VendorsUpdateComp } from "components/Admin/Vendors/VendorUpdates"
import ViewVendorsUpdateComp from "components/Finance/Vendors/ViewVendorsUpdate"

export { VendorsListPage, VendorDetailPage } from '../../shared/vendors'

export const AddVendorsPage = () => {
  return <AddVendorComp />
}

export const VendorsAppListPage = () => {
  return <VendorsAppListComp />
}

export const VendorsUpdatesPage = () => {
  return <VendorsUpdateComp />
}
export const VendorsUpdatesDetailPage = () => {
  return <ViewVendorsUpdateComp />
}