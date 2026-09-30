import React, { startTransition, useEffect, useState, useRef, Suspense } from 'react'
import styles from './ViewPurchaseOrder.module.scss'
import { NormalButton } from 'components/Common/NormalButton'
import TableComponent from 'components/Common/TableComponent'
import emailReport from '../../../../assets/icons/emailReport.svg'
import download from '../../../../assets/icons/downloadIcon2.svg'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { useNavigate, useParams } from 'react-router-dom'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { HeaderBar } from 'components/Common/HeaderBar'
import { connect } from 'react-redux'
import EmailReportComp from 'components/Vendor/EmailReport'
import { useTranslation } from 'react-i18next'
import { getPODetails, sendPOLineItemEmail } from '../../../../api/PurchaseOrder'
import { setPoListDetails, setPoMaterialList } from '../../../../redux/actions/purchaseOrderAction'
import { MATERIAL_STATUS } from '../../../../constants/status'
import dayjs from 'dayjs'
import { generateCsv, getEntityId } from 'services/utilities'
import { PageLoader } from 'components/Common/PageLoader'
import SuccessPopup from 'components/Common/SuccessPopup'
import useTableFeatures from 'hooks/useTableFeatures'
import POLineItemsDetails from 'components/Vendor/InvoiceProcessing/POBased/AddEditPOBased/POLineItemsDetails'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import ViewPurchasePDF from 'components/PDF/ViewPurchasePDF'
import { VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { helpIcon } from 'constants/imageConstants'
import { FAQS, PO_VIEW_INVOICE_DETAILS } from 'constants/url'
import { UtilIconFaq } from 'components/Common/UtilIcon'
import { toast } from 'react-toastify'
import DetailItem from 'components/Common/DetailItemCard'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'

const ViewPurchaseOrderComp = ({
  userInfo: { userType },
  setPoListDetails,
  setPoMaterialList,
  purchaseOrder
}) => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation([
    'purchase_order',
    'popup',
    'payment_terms_comp',
    'po_based_invoices',
    'good_receipt',
    'toast',
    'non_po_based_report',
    'soa'
  ])
  const isArabic = i18n.language === 'ar'
  const [downloadDateRange, setDownloadDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [downloadReport, setDownloadReport] = useState(false)
  const [details, setDetails] = useState({})
  const params = useParams()
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [selectedPOLnItem, setSelectedPOLnItem] = useState(null)
  const poLineDetailsRef = useRef(null)
  const [selectedRows, setSelectedRows] = useState([])
  const isDataEmpty = purchaseOrder?.poListDetailsData?.list?.results?.length === 0
  const { page, rowsPerPage, search, loader, order, orderBy, setPageMeta, setLoader, tableProps } =
    useTableFeatures()

  useEffect(() => {
    if (params.id) {
      fetchPoDetails(params.id)
    }
  }, [params.id, page, rowsPerPage, search, order, orderBy])

  const fetchPoDetails = (id) => {
    setLoader(true)
    const query = {
      PONo: id,
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy
    }
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })
    getPODetails(query)
      .then((res) => {
        setDetails(res?.data?.data)
        setPoListDetails(res?.data?.data)
        setPageMeta(res?.data?.data?.list?.pageMeta)
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        setLoader(false)
      })
  }


  const handleRedirectUrl = (data) => {
    startTransition(() => setSelectedPOLnItem(data.id))
    // Scroll to POLineItemsDetails after state update
    setTimeout(() => {
      if (poLineDetailsRef.current) {
        poLineDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 400)
  }

  const handleDownload = () => {
    setDownloadReport(true)
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  const handleCSVDownload = () => {
    const query = {
      entity_id: getEntityId(),
      mode: 'report',
      // startDate: downloadDateRange[0]?.format('YYYY-MM-DD'),
      // endDate: downloadDateRange[1]?.format('YYYY-MM-DD'),
      format: 'csv',
      PONo: params.id,
      isArabic: isArabic ? true : false 
    }
    generateCsv(
      `${process.env.REACT_APP_DEFAULT_API_BASE_URL}/purchaseOrder/poLineItemList/export`,
      'PO_Item.csv',
      query
    ).then(() => {
      handleCloseDownload()
    })
  }
  const handleEmail = () => {
    setLoader(true)

    const query = {
      entity_id: getEntityId(),
      format: 'csv',
      PONo: params.id,
      isArabic: isArabic ? true : false 
    }

    sendPOLineItemEmail(query)
      .then(() => {
        setEmailSuccessPopup(true)
      })
      .catch(() => { })
      .finally(() => {
        setLoader(false)
      })
  }
  const APIData = purchaseOrder?.poListDetailsData 
  const tableData =
  APIData?.list?.results?.map((x) => {
      const isCancelled = x?.Material_status === 'Cancelled'
      return {
        ...x,
        status: MATERIAL_STATUS[x?.status],
        id: x?.POLnNo,
        material_code: x?.Material_Code,
        material_description: x?.Material_Description,
        unit_of_measure: x?.Unit_of_measure,
         poQuantity:
        x?.Qty !== undefined && x?.Qty !== null
          ? Number(x?.Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
          : '0',
        net_price:
          x?.NetAmount !== undefined && x?.NetAmount !== null
            ? Number(x?.NetAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })
            : '0.00',
        gr_quantity:
        x?.GR_Qty !== undefined && x?.GR_Qty !== null
          ? Number(x?.GR_Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
          : '0',
        gr_value:
          x?.GR_value !== undefined && x?.GR_value !== null
            ? Number(x?.GR_value).toLocaleString('en-US', { minimumFractionDigits: 2,maximumFractionDigits:2 })
            : '0.00',
        ir_quantity: x?.Inv_Qty !== undefined && x?.Inv_Qty !== null
          ? Number(x?.Inv_Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
          : '0',
        ir_value:
          x?.IR_value !== undefined && x?.IR_value !== null
            ? Number(x?.IR_value).toLocaleString('en-US', { minimumFractionDigits: 2,maximumFractionDigits:2 })
            : '0',
        status: x?.Status || '--',
        Material_status: x?.Material_status || '--',
      open_quantity: isCancelled
        ? '0'
        : x?.Qty !== undefined && x?.Inv_Qty !== undefined
          ? Number(x?.Qty - x?.Inv_Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
          : '0'
      }
    }) || []

  const headers = [
    { key: 'id', label: t('poItemNo'), sortable: true, sortKey: 'POLnNo' },
    {
      key: 'Material_status',
      label: t('po_based_invoices:status'),
      sortable: true,
      sortKey: 'Material_status'
    },
    {
      key: 'material_code',
      label: t('po_based_invoices:materialCode.text'),
      sortable: true,
      sortKey: 'Material_Code'
    },
    {
      key: 'material_description',
      label: t('po_based_invoices:materialDescription.text'),
      sortable: true,
      sortKey: 'Material_Description'
    },
    {
      key: 'unit_of_measure',
      label: t('po_based_invoices:uom.text'),
      sortable: true,
      sortKey: 'Unit_of_measure'
    },
    {
      key: 'poQuantity',
      label: t('po_based_invoices:poQuantity.text'),
      sortable: true,
      sortKey: 'Qty'
    },
    { key: 'open_quantity', label: t('openQuantity'), sortable: false, sortKey: 'Qty' },
    { key: 'net_price', label: t('netPrice'), sortable: true, sortKey: 'UnitPrice' },
    {
      key: 'gr_quantity',
      label: t('po_based_invoices:grQuantity.text'),
      sortable: true,
      sortKey: 'GR_Qty'
    },
    { key: 'gr_value', label: t('good_receipt:grValue.text'), sortable: true, sortKey: 'GR_value' },
    {
      key: 'ir_quantity',
      label: t('po_based_invoices:irQuantity.text'),
      sortable: true,
      sortKey: 'Inv_Qty'
    },
    { key: 'ir_value', label: t('irValue'), sortable: true, sortKey: 'IR_value' }
  ]

  const headerLabels = headers.map((h) => h.label)

  const HeaderDetails = () => {
    return (
      <div className={styles.userInputContainer}>
        <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-4`}>
          <div className={styles.userInputContainerInner}>
            <DetailItem label={t('poNumber.text')} value={APIData?.headersDetails?.PONo } />
            <DetailItem label={t('referenceNo')} value={APIData?.headersDetails?.OurRef} />
            <DetailItem
              label={t('createdPODate.text')}
              value={
                APIData?.headersDetails?.PO_date
                  ? dayjs(APIData?.headersDetails?.PO_date).format('DD/MM/YYYY')
                  : '--'
              }
            />
            <DetailItem
              label={t('poCurrency')}
              value={APIData?.headersDetails?.PO_currency}
            />
            {userType !== VENDOR_USER_TYPE ? (
              <>
                <DetailItem
                  label={t('vendorName')}
                  value={APIData?.headersDetails?.vendor?.Vendor_Name_EN || '--'}
                  valueStyle={{direction: isArabic ? "ltr" : "", textAlign: isArabic ? "end" : ""}}
                />
                <DetailItem
                  label={t('vendorCode')}
                  value={APIData?.headersDetails?.vendor?.Vendor_SAP_Code || '--'}
                />
              </>
            ) : (
              <DetailItem
                label={t('poValue')}
                value={
                  APIData?.headersDetails?.POValue !== undefined &&
                    APIData?.headersDetails?.POValue !== null
                    ? Number(APIData?.headersDetails?.POValue).toLocaleString('en-US', { minimumFractionDigits: 2 })
                    : '0.00'
                }
              />
            )}
          </div>
        </div>
        <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-4`}>
          <div className={styles.userInputContainerInner}>
            {userType === VENDOR_USER_TYPE ? (
              <></>
            ) : (
              <DetailItem
                label={t('poValue')}
                value={
                  APIData?.headersDetails?.POValue !== undefined &&
                    APIData?.headersDetails?.POValue !== null
                    ? Number(APIData?.headersDetails?.POValue).toLocaleString('en-US', { minimumFractionDigits: 2 })
                    : '0.00'
                }
              />
            )}
            <DetailItem
              label={t('deliveredValue')}
              value={
                APIData?.headersDetails?.GRValue !== undefined &&
                  APIData?.headersDetails?.GRValue !== null
                  ? Number(APIData?.headersDetails?.GRValue).toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : '0.00'
              }
            />
            <DetailItem
              label={t('deliveredQuantity')}
              value={APIData?.headersDetails?.Total_GR_Qty !== undefined &&
          APIData?.headersDetails?.Total_GR_Qty !== null
            ? Number(APIData?.headersDetails?.Total_GR_Qty).toLocaleString('en-US', {
                maximumFractionDigits: 3,
              })
            : '0'}
            />
            <DetailItem
              label={t('invoiceValue')}
              value={
                APIData?.headersDetails?.InvValue !== undefined &&
                  APIData?.headersDetails?.InvValue !== null
                  ? Number(APIData?.headersDetails?.InvValue).toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : '0.00'
              }
            />
            <DetailItem
              label={t('invoiceQuantity')}
              value={ APIData?.headersDetails?.Total_IR_Qty !== undefined &&
          APIData?.headersDetails?.Total_IR_Qty !== null
            ? Number(APIData?.headersDetails?.Total_IR_Qty).toLocaleString('en-US', {
                maximumFractionDigits: 3,
              })
            : '0'}
            />
            <DetailItem
              label={t('paymentTerms')}
              value={APIData?.headersDetails?.Payment_Terms ?? '--'}
              suffix={APIData?.headersDetails?.Payment_Terms ? ' Days' : ""}
              valueStyle={{direction: isArabic ? "ltr" : "", textAlign: isArabic ? "end" : ""}}
            />
          </div>
        </div>
        <div className={`col-4`}>
          <div className={styles.userInputContainerInner}>
            <DetailItem
              label={t('payment_terms_comp:incoterms.text')}
              value={APIData?.headersDetails?.Incoterms || '--'}
            />
            <DetailItem
              label={t('payment_terms_comp:incotermsLocation.text')}
              value={APIData?.headersDetails?.Incoterms_Location || '--'}
            />
            <DetailItem
              label={t('modeOfTransport')}
              value={APIData?.headersDetails?.Mode_of_transport || '--'}
            />
            <DetailItem
              label={t('createdPerson')}
              value={APIData?.headersDetails?.created_person?.Name || '--'}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <LeftPageContainer>
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('popup:emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      {loader ? (
        <div className="no-data-container-view">
          <PageLoader />
        </div>
      ) : (
        <>
          <div className={styles.poContainer}>
            <HeaderBar
              title={`${t('poNumber.text')} - ${params.id || 'N/A'}`}
              slug={`${t('sidebar:home')} / ${t('sidebar:purchaseOrder')} / ${t(
                'poNumber.text'
              )} - ${params.id || 'N/A'}`}>
              <div className="flex gap-[10px]">
                 <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.tooltip')}>
                <div className={styles.helpIconContainer} style={{ cursor: 'pointer' }} onClick={ !isDataEmpty ? () => handleEmail() : undefined}>
                  <img src={emailReport} alt="email report" className={isDataEmpty ? styles.disabledIcon : ''}  />                 
                </div>
                </TooltipWrapper>
                  <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
                <div className={styles.helpIconContainer} style={{ cursor: 'pointer' }} onClick={ !isDataEmpty ? handleDownload : undefined}>                
                  <img src={download} alt="download" className={isDataEmpty ? styles.disabledIcon : ''} />
                </div>
                  </TooltipWrapper>
                   <TooltipWrapper tooltipMessage={t('soa:help')}>
                  <UtilIconFaq
                    style={{ marginLeft: 0 }}
                    name="help"
                    onClick={() => navigate(`/${userType}${FAQS}?id=2`)}
                  />
                   </TooltipWrapper>
              </div>
            </HeaderBar>
          </div>
          <HeaderDetails />

          {/* Filters */}
          <div className="bg-white table-border overflow-hidden rounded-lg">
            <div className={styles.viewActionBtns}>
              <div className={styles.viewActionBtn}>
                <div className={styles.viewActionBtn}>
                  <NormalButton
                    label={t('viewGRDetails')}
                    isPrimary
                    customClass="px-3"
                    onClick={() =>
                      navigate(`/${userType}/purchase-order/gr-details/${params.id}`)
                    }
                  />
                  <NormalButton
                    label={t('viewInvoice')}
                    isPrimary
                    customClass="px-3"
                    onClick={() => {
                      if (userType === VENDOR_USER_TYPE) {
                        navigate(
                          `/${userType}/invoice-processing/po-based-invoice/invoice-details?id=${params.id}`
                        )
                      } else {
                        navigate(`/${userType}${PO_VIEW_INVOICE_DETAILS}?id=${params.id}`)
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <TableLayout
              tableData={tableData}
              tableHeaders={headers}
              handleRedirectUrl={handleRedirectUrl}
              onSelectionChange={setSelectedRows}
              className="view-purchase-order-table"
              {...tableProps}
            />
          </div>

          {selectedPOLnItem && (
            <div ref={poLineDetailsRef}>
              <POLineItemsDetails id={selectedPOLnItem} poNo={APIData?.headersDetails?.PONo} />
            </div>
          )}
          <Suspense fallback={<div>Loading...</div>}>
            <DownloadReportComp
              hideDatePicker
              open={downloadReport}
              onClickSubmit={handleCSVDownload}
              onClose={handleCloseDownload}
              header={<HeaderDetails />}
              title={`${t('PONumber')} - ${params.id}`}
              pdfComponent={
                <ViewPurchasePDF
                  data={tableData}
                  headerLabels={headerLabels}
                  headerDetails={APIData?.headersDetails}
                  userType={userType}
                />
              }
              NewTableComp={
                <TableComponent
                  tableData={tableData}
                  tableHeaders={headers}
                  checkboxRequired={false}
                  showPagination={false}
                  onSelectionChange={setSelectedRows}
                />
              }
            />
          </Suspense>
        </>
      )}
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
  purchaseOrder: state.purchaseOrder
})

const mapDispatchToProps = (dispatch) => ({
  setPoListDetails: (payload) => dispatch(setPoListDetails(payload)),
  setPoMaterialList: (payload) => dispatch(setPoMaterialList(payload))
})

export default connect(mapStateToProps, mapDispatchToProps)(ViewPurchaseOrderComp)
