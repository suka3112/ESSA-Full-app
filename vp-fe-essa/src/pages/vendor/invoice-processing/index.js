import AddEditCreditNoteComp from 'components/Vendor/InvoiceProcessing/CreditNote/AddEditCreditNote'
import CreditNoteComp from 'components/Vendor/InvoiceProcessing/CreditNote/CreditNoteList'
import ViewCreditNoteListComp from 'components/Vendor/InvoiceProcessing/CreditNote/ViewCreditNote'
import AddEditLogisticsInvoiceComp from 'components/Vendor/InvoiceProcessing/LogisticsInvoice/AddEditLogisticsInvoice'
import LogisticsInvoiceComp from 'components/Vendor/InvoiceProcessing/LogisticsInvoice/LogisticsInvoiceList'
import AddEditNonPOBasedComp from 'components/Vendor/InvoiceProcessing/NonPOBased/AddEditNonPOBased'
import NonPOBasedComp from 'components/Vendor/InvoiceProcessing/NonPOBased/NonPOBasedList'
import ViewNonPOBasedComp from 'components/Vendor/InvoiceProcessing/NonPOBased/ViewNonPOBased'
import AddEditPOBasedComp from 'components/Vendor/InvoiceProcessing/POBased/AddEditPOBased'
import POBasedListComp from 'components/Vendor/InvoiceProcessing/POBased/POBasedList'
import ViewPOBasedComp from 'components/Vendor/InvoiceProcessing/POBased/ViewPOBased'
import ViewLogisticsInvoiceComp from 'components/Vendor/InvoiceProcessing/LogisticsInvoice/ViewLogisticsInvoice'
import LogisticsInvoiceListComp from '../../../components/Vendor/InvoiceProcessing/LogisticsInvoice/LogisticsInvoiceList'
import { LogisticsInvoiceTotalComp } from '../../../components/Vendor/InvoiceProcessing/LogisticsInvoice/LogisticsInvoiceTotal'
import ViewInvoiceDetailsComp from 'components/Vendor/InvoiceProcessing/POBased/ViewInvoiceDetails'
import PendingInvoiceList from 'components/Vendor/InvoiceProcessing/POBased/PendingInvoiceList'



export const InvoicePOBasedPage = () => {
  return <POBasedListComp />
}

export const AddEditInvoicePOBasedPage = () => {
  return <AddEditPOBasedComp />
}

export const ViewInvoicePOBasedPage = () => {
  return <ViewPOBasedComp />
}

export const InvoiceNonPOBasedPage = () => {
  return <NonPOBasedComp />
}

export const ViewInvoiceDetailsPage = () => {
  return <ViewInvoiceDetailsComp />
}

export const AddEditInvoiceNonPOBasedPage = () => {
  return <AddEditNonPOBasedComp />
}

export const ViewInvoiceNonPOBasedPage = () => {
  return <ViewNonPOBasedComp />
}

export const LogisticsPage = () => {
  return <LogisticsInvoiceComp />
}

export const AddEditLogisticsInvoicePage = () => {
  return <AddEditLogisticsInvoiceComp />
}

export const EditLogisticsInvoicePage = () => {
  return <AddEditLogisticsInvoiceComp />
}

export const LogisticsInvoiceListPage = () => {
  return <LogisticsInvoiceTotalComp />
}

export const ViewLogisticsInvoicePage = () => {
  return <ViewLogisticsInvoiceComp />
}

export const CreditNotePage = () => {
  return <CreditNoteComp />
}

export const AddEditCreditNotePage = () => {
  return <AddEditCreditNoteComp />
}

export const ViewCreditNotePage = () => {
  return <ViewCreditNoteListComp />
}
export const PendingInvoicePage = () => {
  return <PendingInvoiceList />
}
