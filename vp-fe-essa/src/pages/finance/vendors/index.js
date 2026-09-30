import { VendorsUpdateComp } from "components/Admin/Vendors/VendorUpdates"
import { VendorExtensionComp } from "components/Finance/Vendors/Extension"
import { VendorProfileComp } from "components/Finance/Vendors/VendorProfile"
import { VendorsApplicationComp } from "components/Finance/Vendors/VendorsApplication"
import VendorsListComp from "components/Finance/Vendors/VendorsList"
import ViewVendorsExtensionComp from "components/Finance/Vendors/ViewExtensionDetails"
// import { VendorsUpdateComp } from "components/Finance/Vendors/VendorsUpdate"
import ViewVendorsUpdateComp from "components/Finance/Vendors/ViewVendorsUpdate"

export const VendorsListPage = () => {
  return <VendorsListComp />
}

export const VendorsApplicationPage = () => {
  return <VendorsApplicationComp />
}

export const VendorsUpdatePage = () => {
  return <VendorsUpdateComp />
}

export const ViewVendorsUpdatePage = () => {
  return <ViewVendorsUpdateComp />
}

export const VendorProfilePage = () => {
  return <VendorProfileComp />
}

export const VendorExtensionPage = () => {
  return <VendorExtensionComp />
}

export const ViewVendorsExtensionPage = () => {
  return <ViewVendorsExtensionComp />
}