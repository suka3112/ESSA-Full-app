import CreditNoteComp from 'components/Vendor/InvoiceProcessing/CreditNote/CreditNoteList'
import ViewCreditNoteListComp from 'components/Vendor/InvoiceProcessing/CreditNote/ViewCreditNote'
import LogisticsInvoiceList from 'components/Vendor/InvoiceProcessing/LogisticsInvoice/LogisticsInvoiceList'
import LogisticsInvoiceComp from 'components/Vendor/InvoiceProcessing/LogisticsInvoice/LogisticsInvoiceList'
import NonPOBasedComp from 'components/Vendor/InvoiceProcessing/NonPOBased/NonPOBasedList'
import ViewNonPOBasedComp from 'components/Vendor/InvoiceProcessing/NonPOBased/ViewNonPOBased'
import POBasedListComp from 'components/Vendor/InvoiceProcessing/POBased/POBasedList'
import ViewPOBasedComp from 'components/Vendor/InvoiceProcessing/POBased/ViewPOBased'
import ViewLogisticsInvoiceComp from 'components/Vendor/InvoiceProcessing/LogisticsInvoice/ViewLogisticsInvoice'
//Future please delete duplicate component like POBasedListComp, ViewPOBasedComp, NonPoBasedListComp, ViewNonPOBasedComp, LogisticsInvoiceTotalComp, CreditNoteListComp

export const POBasedListPage = () => {
  return <POBasedListComp />
}

export const ViewPOBasedPage = () => {
  return <ViewPOBasedComp />
}

export const NonPOBasedListPage = () => {
  return <NonPOBasedComp />
}

export const ViewNonPOBasedPage = () => {
  return <ViewNonPOBasedComp />
}

export const LogisticsInvoiceTotalPage = () => {
  return <LogisticsInvoiceComp />
}

export const LogisticsInvoiceListPage = () => {
  return <LogisticsInvoiceList />
}

export const ViewLogisticsInvoicePage = () => {
  return <ViewLogisticsInvoiceComp />
}

export const CreditNoteListPage = () => {
  return <CreditNoteComp />
}

export const ViewCreditNotePage = () => {
  return <ViewCreditNoteListComp />
}
