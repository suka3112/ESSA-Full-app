import React, { Suspense, useEffect, useState } from 'react'
import TableComponent from 'components/Common/TableComponent'
import emailReport from '../../../../../assets/icons/emailReport.svg'
import download from '../../../../../assets/icons/downloadIcon2.svg'
import styles from './ViewInvoiceDetails.module.scss'
import { LeftPageContainer } from '../../../../../pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { connect } from 'react-redux'
import EmailReportComp from 'components/Vendor/EmailReport'
import { VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { helpIcon } from 'constants/imageConstants'
import { useLocation, useNavigate, useParams } from 'react-router'
import { FAQS } from 'constants/url'
import { generateCsv, getEntityId } from 'services/utilities'
import { ExportPOInvoiceDetails, invoiceDetailPOListing, invoiceListing } from 'api/PurchaseOrder'
import SuccessPopup from 'components/Common/SuccessPopup'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import ViewInvoiceDetailsPDF from 'components/PDF/ViewInvoiceDetailsPDF'
import useTableFeatures from 'hooks/useTableFeatures'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import { lime } from '@mui/material/colors'

const ViewInvoiceDetailsComp = ({ userInfo: { userType } }) => {
  const navigate = useNavigate()
  const params = useParams();
  const location = useLocation();
  const headerParams = new URLSearchParams(location.search)
  const POId = headerParams.get('id')
  const { t, i18n } = useTranslation(['popup', 'purchase_order', 'sidebar', 'po_based_invoices', 'logistics_invoice', 'toast', 'non_po_based_report'])
  const isArabic = i18n.language === 'ar'
  const [emailDateRange, setEmailDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)
  const [invoiceData, setInvoiceData] = useState([])
  const [loading, setLoading] = useState(false)
  const [PDFInvoiceData, setPDFInvoiceData] = useState([])
  


  const {
    page,
    rowsPerPage,
    search,
    order, orderBy,
    setPageMeta,
    setLoader,
    tableProps,
  } = useTableFeatures();


  useEffect(() => {
    if(!downloadReport){
      getInvoiceList();
    }
    getInvoiceListPDF();
  }, [page, search, rowsPerPage, order, orderBy])

  const getInvoiceList = () => {
    setLoader(true);
    const query = {
      PONo: POId,
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy,
    }
    invoiceDetailPOListing(query).then((res) => {
      setInvoiceData(res?.data?.data)
      setPageMeta(res?.data?.data?.pageMeta);
    }).catch((err) => {
      console.log('err', err)
    }).finally(() => {
      setLoader(false)
    })
  }

  const getInvoiceListPDF = () => {
    setLoader(true);
    const query = {
      PONo: POId,
      page: 1,
      sort: order,
      sort_column: orderBy,
      lime: 1000
    }
    invoiceDetailPOListing(query).then((res) => {
      setPDFInvoiceData(res?.data?.data)
    }).catch((err) => {
      console.log('err', err)
    }).finally(() => {
      setLoader(false)
    })
  }

  const invoiceMail = () => {
    if (!invoiceData?.results || invoiceData.results.length === 0) {
      toast.error(t('toast:noDataToExport'))
      return
    }
    setLoader(true)
    const query = {
      PONo: POId,
      entity_id: getEntityId(),
      category: 1,
      isArabic: isArabic ? true : false
    }
    ExportPOInvoiceDetails(query).then((res) => {
      setEmailSuccessPopup(true)
    }).catch((err) => {
      toast.error(err)
    })
      .finally(() => {
        setLoader(false)
      })

  }
  const handleDownloadSubmit = () => {
    const query = {
      PONo: POId,
      entity_id: getEntityId(),
      mode: 'report',
      startDate: emailDateRange[0]?.format('YYYY-MM-DD'),
      endDate: emailDateRange[1]?.format('YYYY-MM-DD'),
      format: 'csv',
      category: 1,
      isArabic: isArabic ? true : false
    }

    generateCsv(`${process.env.REACT_APP_DEFAULT_API_BASE_URL}/invoice/getPoInvoice/export`, "PO_Invoice_Details.csv", query).then(() => {
      handleCloseDownload()
    })
  }
  const handleDownload = () => {
    setDownloadReport(true)
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  const headers = [
      { key: 'line_item_no', label: t('purchase_order:POLineNO'), sortable: true, sortKey: 'POLnNo' },
    { key: 'vendor_invoice_no', label: t('purchase_order:vendorInvoiceNo'), sortable: true, sortKey: 'invoice_header_id' },
    // { key: 'po_no', label: t('po_based_invoices:poNo'), sortable: true, sortKey: 'PONo' },
    // { key: 'po_item_no', label: t('purchase_order:poItemNo'), sortable: true, sortKey: 'POLnNo' },
    { key: 'material_code', label: t('po_based_invoices:materialCode.text'), sortable: true, sortKey: 'Material_Code' },
    { key: 'material_description', label: t('po_based_invoices:materialDescription.text'), sortable: true, sortKey: 'Material_Description' },
    // { key: 'uom', label: t('po_based_invoices:uom.text'), sortable: true, sortKey: 'Unit_of_measure' },
    // { key: 'po_quantity', label: t('po_based_invoices:poQuantity.text'), sortable: true, sortKey: 'PO_Qty' },
    { key: 'ir_quantity', label: t('po_based_invoices:irQuantity.text'), sortable: true, sortKey: 'Inv_Qty' },
    { key: 'amount', label: t('logistics_invoice:amount'), sortable: true, sortKey: 'IR_value' },
    // { key: 'tax_amount', label: t('purchase_order:taxAmount'), sortable: true, sortKey: 'Tax_Amt' }

  ]
  const headerLabels = headers.map(h => h.label)

  const tableData = invoiceData?.results?.map((x) => ({
    vendor_invoice_no: x?.InvNo,
    line_item_no: x?.POLnNo,
    po_no: x?.PONo,
    po_item_no: x?.POLnNo,
    material_code: x?.Material_Code,
    material_description: x?.Material_Description,
    uom: x?.Unit_of_measure,
    po_quantity: x?.PO_Qty || 0,
    ir_quantity: x?.Inv_Qty !== undefined && x?.Inv_Qty !== null
      ? Number(x?.Inv_Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
      : '0',
    amount: x?.NetAmount !== undefined && x?.NetAmount !== null && !isNaN(x.NetAmount)
      ? Number(x.NetAmount).toLocaleString('en-US', {
        minimumFractionDigits: 2
      })
      : '0.00',
    tax_amount: Number(x?.Tax_Amt || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2
    }),
  }))

  const pdfData = PDFInvoiceData?.results?.map((x) => ({
    vendor_invoice_no: x?.InvNo,
    line_item_no: x?.POLnNo,
    po_no: x?.PONo,
    po_item_no: x?.POLnNo,
    material_code: x?.Material_Code,
    material_description: x?.Material_Description,
    uom: x?.Unit_of_measure,
    po_quantity: x?.PO_Qty || 0,
    ir_quantity: x?.Inv_Qty !== undefined && x?.Inv_Qty !== null
      ? Number(x?.Inv_Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
      : '0',
    amount: x?.NetAmount !== undefined && x?.NetAmount !== null && !isNaN(x.NetAmount)
      ? Number(x.NetAmount).toLocaleString('en-US', {
        minimumFractionDigits: 2
      })
      : '0.00',
    tax_amount: Number(x?.Tax_Amt || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2
    }),
  }))

  return (
    <LeftPageContainer>
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      {/* Header */}
      <div className={styles.poContainer}>
        <HeaderBar
          title={
            userType === VENDOR_USER_TYPE
              ? `${t('purchase_order:invoiceDetails')} - ${POId}`
              : `${t('purchase_order:invoiceDetails')} - ${POId}`
          }
          slug={
            userType === VENDOR_USER_TYPE
              ? `${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t('sidebar:poBased')} / ${t('purchase_order:invoiceDetails')} - ${POId}`
              : `${t('sidebar:home')} / ${t('sidebar:purchaseOrder')} / ${t('purchase_order:PONumber')}- ${POId} / ${t('purchase_order:invoiceDetails')} - ${POId}`
          }>
          <>
            <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.tooltip')}>
              <div className={styles.helpIconContainer}>
                <img src={emailReport} alt="help" onClick={() => invoiceMail()} />
              </div>
            </TooltipWrapper>

            <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
              <div className={styles.helpIconContainer} onClick={handleDownload}>
                <img src={download} alt="help" />
              </div>
            </TooltipWrapper>

            <TooltipWrapper tooltipMessage={t('soa:help')}>
              <div className={styles.faqIconContainer} >
                <img src={helpIcon} alt="help" onClick={() => navigate(`/${userType}${FAQS}?id=3`)} />
              </div>
            </TooltipWrapper>

          </>
        </HeaderBar>
      </div>

      {/* Filters */}
      <div className="bg-white table-border overflow-hidden rounded-lg">

        <TableLayout tableHeaders={headers} tableData={tableData} isLoading={loading} {...tableProps} className="invoice-detail-table" />

      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <DownloadReportComp
          open={downloadReport}
          onClose={handleCloseDownload}
          title={t('purchase_order:invoiceDetails')}
          headers={headers}
          showPagination={false}
          hideDatePicker={true}
          onClickSubmit={handleDownloadSubmit}
          pdfComponent={

            <ViewInvoiceDetailsPDF data={pdfData} headerLabels={headerLabels} />
          }
          NewTableComp={
            <TableComponent tableHeaders={headers} tableData={tableData} showPagination={false} />
          }
        /></Suspense>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo // Getting userInfo from Redux store
})

// Map actions to props
const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(ViewInvoiceDetailsComp)
