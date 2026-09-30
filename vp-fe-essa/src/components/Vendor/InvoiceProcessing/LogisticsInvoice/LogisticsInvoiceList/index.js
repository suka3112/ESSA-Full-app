import React, { useEffect, useState } from 'react'
import emailReport from '../../../../../assets/icons/emailReport.svg'
import download from '../../../../../assets/icons/downloadIcon2.svg'
import downloadCloud from '../../../../../assets/icons/downloadIcon.svg'
import invoiceIcon from '../../../../../assets/icons/invoiceIcon.svg'
import helpIcon from '../../../../../assets/icons/helpIcon.svg'
import TableComponent from 'components/Common/TableComponent'
import EmailReportComp from 'components/Vendor/EmailReport'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import SearchInput from 'components/Common/SearchInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox1'
import { HeaderBar } from 'components/Common/HeaderBar'
import { NormalButton } from 'components/Common/NormalButton'
import styles from './LogisticsInvoiceList.module.scss'
import { UtilIcon, UtilIconFaq } from '../../../../Common/UtilIcon'
import { connect } from 'react-redux'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { useTranslation } from 'react-i18next'
import {
  getLogisticInvoices,
  sendMonthlyInvoice,
  downloadLogisticInvoices
} from '../../../../../api/LogisticInvoice'
import {
  setLogisticInvoice,
  setLogisticInvoicesList
} from '../../../../../redux/actions/logisticInvoiceActions'
import { downloadHelper, formatUSDNumber, getEntityId } from '../../../../../services/utilities'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { FAQS, LOGISTICS_INVOICE, LOGISTICS_INVOICE_LIST } from '../../../../../constants/url'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import SuccessPopup from 'components/Common/SuccessPopup'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import useTableFeatures from 'hooks/useTableFeatures'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import LogisticsListPDF from 'components/PDF/LogisticsListPDF'
import { toast } from 'react-toastify'
import SVGIcon from 'components/Common/SVGIcon'

const LogisticsInvoiceComp = ({
  userInfo: { userType },
  logisticInvoice,
  setLogisticInvoicesList
}) => {
  const { t, i18n } = useTranslation([
    'logistics_invoice',
    'soa',
    'sidebar',
    'popup',
    'purchase_order',
    'enquiries',
    'non_po_based_report',
    'toast',
    'vendors'
  ])
  const isArabic = i18n.language === 'ar'
  const navigate = useNavigate()

  const { page, rowsPerPage, search, order, orderBy, setPageMeta, setLoader, tableProps } =
    useTableFeatures()

  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)
  const [dateRange, setDateRange] = useState([dayjs(), dayjs()])
  const [pdfData, setPdfData] = useState([])

  const isDataEmpty = logisticInvoice?.logisticInvoicesListData?.results?.length === 0

  // Internal constant for "All" filter value
  const ALL_FILTER_VALUE = 'All'

  // Get translated "All" text
  const getAllText = () => t('vendors:all')

  const months = [
    //t('vendors:all'),
    t('soa:jan'),
    t('soa:feb'),
    t('soa:mar'),
    t('soa:apr'),
    t('soa:may'),
    t('soa:june'),
    t('soa:july'),
    t('soa:aug'),
    t('soa:sep'),
    t('soa:oct'),
    t('soa:nov'),
    t('soa:dec')
  ]

  // Consolidated filters state with debounced search
  const [filters, setFilters] = useState({
    month: ALL_FILTER_VALUE,
    year: ALL_FILTER_VALUE
  })

  useEffect(() => {
    fetchLogisticInvoicesList()
    getPDFData()
  }, [filters, page, search, rowsPerPage, order, orderBy])

  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=3`)
  }
  const getMonthNumber = (monthName) => {
    if (monthName === ALL_FILTER_VALUE) return null
    return months.indexOf(monthName) + 1
  }

  // Normalize filter value: convert translated "All" back to internal "All"
  const normalizeFilterValue = (value) => {
    const allText = getAllText()
    return value === allText ? ALL_FILTER_VALUE : value
  }

  // Get display value: convert internal "All" to translated "All"
  const getDisplayValue = (value) => {
    return value === ALL_FILTER_VALUE ? getAllText() : value
  }
  const fetchLogisticInvoicesList = async () => {
    setLoader(true)
    try {
      const params = {
        entity_id: getEntityId(),
        month:
          filters.month !== ALL_FILTER_VALUE
            ? months.findIndex((m) => m === filters.month) + 1
            : undefined,
        year: filters.year !== ALL_FILTER_VALUE ? filters.year : undefined,
        page: page,
        limit: rowsPerPage,
        sort: order,
        sort_column: orderBy,
        search: search.trim()
      }

      const response = await getLogisticInvoices(params)
      setLogisticInvoicesList(response.data.data)
      setPageMeta(response?.data?.data?.pageMeta)
    } catch (error) {
      console.error('Error fetching logistic invoices:', error)
    } finally {
      setLoader(false)
    }
  }

  const getPDFData = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      ...filters,
      search: search.trim(),
      page: page,
      limit: 1000,
      sort: order,
      sort_column: orderBy
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === ALL_FILTER_VALUE) delete query[key]
    })

    getLogisticInvoices(query)
      .then((res) => {
        setPdfData(res?.data?.data?.results || [])
      })
      .catch((err) => {
        console.error('Error fetching Logistics invoice:', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  // Unified filter handler
  const handleFilterChange = (newFilter) => {
    const key = Object.keys(newFilter)[0]
    const value = newFilter[key]

    // Special handling for sort
    if (key === 'sort_column' && value) {
      const [column, direction = 'ASC'] = value.split(' ')
      setFilters((prev) => ({
        ...prev,
        sort_column: column,
        sort: direction.toUpperCase()
      }))
      return
    }

    // Handle "All" options - normalize translated "All" back to internal "All"
    if (['month', 'year'].includes(key)) {
      const normalizedValue = normalizeFilterValue(value)
      setFilters((prev) => ({
        ...prev,
        [key]: normalizedValue
      }))
      return
    }

    // Default case
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const onClickDownload = async () => {
    try {
      const downloadQuery = {
        ...filters,
        entity_id: getEntityId(),
        mode: 'report',
        format: 'csv',
        month:
          filters.month !== ALL_FILTER_VALUE
            ? months.findIndex((m) => m === filters.month) + 1
            : undefined,
        year: filters.year !== ALL_FILTER_VALUE ? filters.year : undefined,
        isArabic: isArabic ? true : false
      }

      // Clean up query object by removing undefined keys
      Object.keys(downloadQuery).forEach(
        (key) => downloadQuery[key] === undefined && delete downloadQuery[key]
      )

      const response = await downloadLogisticInvoices(downloadQuery)
      downloadHelper(response.data, `LogisticsInvoice_${dayjs().format('YYYY-MM-DD')}.csv`)
      setDownloadReport(false)
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error(t('downloadReport.error'))
    }
  }

  const sendEmailReport = async () => {
    const APIdata = logisticInvoice?.logisticInvoicesListData?.results || []

    if (!APIdata || APIdata.length === 0) {
      toast.error(t('toast:noDataToExport'))
      return
    }
    setLoader(true)
    try {
      const emailQuery = {
        entity_id: getEntityId(),
        category: 3,
        //mode: 'report',
        format: 'csv',
        isArabic: isArabic ? true : false,
        month:
          filters.month !== ALL_FILTER_VALUE
            ? months.findIndex((m) => m === filters.month) + 1
            : undefined,
        year: filters.year !== ALL_FILTER_VALUE ? filters.year : undefined
      }

      Object.keys(emailQuery).forEach(
        (key) => emailQuery[key] === undefined && delete emailQuery[key]
      )

      await downloadLogisticInvoices(emailQuery)
      setEmailSuccessPopup(true)
    } catch (error) {
      console.error('Error sending email report:', error)
      toast.error(error?.response?.data?.message || 'Failed to send report')
    } finally {
      setLoader(false)
    }
  }

  const handleRedirectUrl = async (data) => {
    const monthNumber = getMonthNumber(data.month)
    navigate(`/${userType}${LOGISTICS_INVOICE_LIST}?month=${monthNumber}&year=${data?.year}`)
  }

  const onClickCreateInvoice = () => {
    navigate(`/${userType}${LOGISTICS_INVOICE}/new`)
  }

  const handleDownloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/templates/logistics_template.xlsx'
    link.download = 'logistics_template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = [getAllText()]

    // Past 3 years
    for (let i = 3; i > 0; i--) {
      years.push((currentYear - i).toString())
    }

    // Current year + next 5 years
    for (let i = 0; i <= 5; i++) {
      years.push((currentYear + i).toString())
    }

    return years
  }

  const APIdata = logisticInvoice?.logisticInvoicesListData?.results || []

  const headers = [
    { key: 'sNo', label: t('serialNo'), sortable: false },
    { key: 'month', label: t('soa:month'), sortable: true },
    { key: 'year', label: t('soa:year'), sortable: true, sortKey: '' },
    {
      key: 'totalAmount',
      label: t('totalAmount'),
      sortable: true,
      sortKey: 'totalAmount'
    },
    {
      key: 'invoiceCreated',
      label: t('invoiceCreated'),
      sortable: true,
      sortKey: 'invoiceCreated'
    },
    {
      key: 'invoicePending',
      label: t('pendingForApproval'),
      sortable: true,
      sortKey: 'invoicePending'
    },
    {
      key: 'invoiceApproved',
      label: t('invoiceApproved'),
      sortable: true,
      sortKey: 'invoiceApproved'
    },
    {
      key: 'invoiceRejected',
      label: t('invoiceRejected'),
      sortable: true,
      sortKey: 'invoiceRejected'
    }
  ]
  const headerLabels = headers?.map((h) => h.label)

  const filteredData = APIdata?.map((item, i) => ({
    sNo: i + 1,
    month: item?.month,
    year: item?.year,
    totalAmount: isNaN(item?.totalAmount) ? 'N/A' : formatUSDNumber(item?.totalAmount),
    invoiceCreated: item?.invoiceCreated,
    invoiceApproved: item?.invoiceApproved,
    invoicePending: item?.invoicePending,
    invoiceRejected: item?.invoiceRejected
  }))

  const pdfTableData = pdfData?.map((item, i) => ({
    sNo: i + 1,
    month: item?.month,
    year: item?.year,
    totalAmount: isNaN(item?.totalAmount) ? 'N/A' : formatUSDNumber(item?.totalAmount),
    invoiceCreated: item?.invoiceCreated,
    invoiceApproved: item?.invoiceApproved,
    invoicePending: item?.invoicePending,
    invoiceRejected: item?.invoiceRejected
  }))

  return (
    <LeftPageContainer>
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('popup:emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      <div className={styles.poContainer}>
        <HeaderBar
          title={t('sidebar:logisticsInvoice')}
          slug={`${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t(
            'sidebar:logistics'
          )} ${t('invoiceList')}`}>
          {userType === FINANCE_USER_TYPE || userType === BUSINESS_USER_TYPE ? (
            <div
              style={{
                display: 'flex'
                // marginRight: "0"
              }}>
              <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.text')}>
                <UtilIconFaq
                  name="emailReport"
                  onClick={!isDataEmpty ? () => sendEmailReport() : undefined}
                  style={{
                    opacity: isDataEmpty ? 0.4 : 1,
                    cursor: isDataEmpty ? 'not-allowed' : 'pointer'
                  }}
                />
              </TooltipWrapper>
              <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
                <UtilIconFaq
                  onClick={!isDataEmpty ? () => setDownloadReport(true) : undefined}
                  name="download2"
                  style={{
                    opacity: isDataEmpty ? 0.4 : 1,
                    cursor: isDataEmpty ? 'not-allowed' : 'pointer'
                  }}
                />
              </TooltipWrapper>
              <TooltipWrapper tooltipMessage={t('soa:help')}>
                <UtilIconFaq style={{ marginLeft: 0 }} name="help" onClick={handleRedirectClick} />
              </TooltipWrapper>
            </div>
          ) : (
            <>
              <TooltipWrapper tooltipMessage={t('downloadLogisticsTemplate')}>
                <div className={styles.helpIconContainer}>
                  {/* <img
                    src={downloadCloud}
                    alt="download"
                    onClick={handleDownloadTemplate}
                  /> */}
                  <SVGIcon
                    name="download"
                    size={25}
                    className="cursor-pointer"
                    onClick={handleDownloadTemplate}
                  />
                </div>
              </TooltipWrapper>
              {(userType === VENDOR_USER_TYPE || userType === ADMIN_USER_TYPE) && (
                <div>
                  <NormalButton
                    label={t('purchase_order:createInvoice')}
                    isPrimary
                    customClass="px-2"
                    leftIcon={invoiceIcon}
                    onClick={onClickCreateInvoice}
                  />
                </div>
              )}
              <div
                style={{
                  display: 'flex'
                  //  marginRight: "0"
                }}>
                <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.text')}>
                  <UtilIconFaq
                    name="emailReport"
                    onClick={!isDataEmpty ? () => sendEmailReport() : undefined}
                    style={{
                      opacity: isDataEmpty ? 0.4 : 1,
                      cursor: isDataEmpty ? 'not-allowed' : 'pointer'
                    }}
                  />
                </TooltipWrapper>
                <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
                  <UtilIconFaq
                    onClick={!isDataEmpty ? () => setDownloadReport(true) : undefined}
                    name="download2"
                    style={{
                      opacity: isDataEmpty ? 0.4 : 1,
                      cursor: isDataEmpty ? 'not-allowed' : 'pointer'
                    }}
                  />
                </TooltipWrapper>
                <TooltipWrapper tooltipMessage={t('soa:help')}>
                  <UtilIconFaq
                    style={{ marginLeft: 0 }}
                    name="help"
                    onClick={handleRedirectClick}
                  />
                </TooltipWrapper>
              </div>
            </>
          )}
        </HeaderBar>
      </div>
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className={styles.tableHeaderContainer}>
          {/* <div className="pt-3">
            <SearchInput
              placeholder="Search Month or Year"
              onChange={setSearchInput}
              value={searchInput}
            />
          </div> */}
          <div className="flex flex-wrap gap-4 ps-2 soa-select">
            <TableSelectBox
              selectedValues={getDisplayValue(filters.month)}
              name="month"
              handleChange={(e) => handleFilterChange({ month: e.target.value })}
              label={t('soa:month')}
              options={[getAllText(), ...months]}
              width="145px"
            />
            <TableSelectBox
              selectedValues={getDisplayValue(filters.year)}
              name="year"
              handleChange={(e) => handleFilterChange({ year: e.target.value })}
              label={t('soa:year')}
              options={getYearOptions()}
              width="145px"
            />
          </div>
        </div>

        <TableLayout
          className="logistics-invoice-list-table"
          handleRedirectUrl={handleRedirectUrl}
          tableHeaders={headers}
          tableData={filteredData}
          {...tableProps}
        />
      </div>

      <DownloadReportComp
        open={downloadReport}
        hideDatePicker
        onClose={() => setDownloadReport(false)}
        title={`${t('sidebar:invoiceProcessing')} - ${t('sidebar:logistics')} ${t('invoiceList')}`}
        setValue={setDateRange}
        value={dateRange}
        onClickSubmit={onClickDownload}
        headers={headers}
        NewTableComp={
          <TableLayout tableHeaders={headers} tableData={filteredData} {...tableProps} />
        }
        //tableData={filteredData}
        pdfComponent={<LogisticsListPDF data={pdfTableData} headerLabels={headerLabels} />}
      />
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
  logisticInvoice: state.logisticInvoice
})

const mapDispatchToProps = (dispatch) => ({
  setLogisticInvoice: (payload) => dispatch(setLogisticInvoice(payload)),
  setLogisticInvoicesList: (payload) => dispatch(setLogisticInvoicesList(payload))
})

export default connect(mapStateToProps, mapDispatchToProps)(LogisticsInvoiceComp)
