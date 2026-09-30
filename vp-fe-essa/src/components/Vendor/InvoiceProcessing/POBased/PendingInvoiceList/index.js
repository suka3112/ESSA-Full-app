import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from '../POBasedList/POBasedList.module.scss'
import emailReport from '../../../../../assets/icons/emailReport.svg'
import download from '../../../../../assets/icons/downloadIcon2.svg'
import helpIcon from '../../../../../assets/icons/helpIcon.svg'
import {
  TableDropDownLabel,
  TableHeaderDropdown
} from 'components/Common/TableComponent/TableComponent.style'
import EmailReportComp from 'components/Vendor/EmailReport'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import DateRangePicker from 'components/Common/DateRangePicker1'
import SearchInput from 'components/Common/SearchInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { HeaderBar } from 'components/Common/HeaderBar'
import { UtilIcon, UtilIconFaq } from '../../../../Common/UtilIcon'
import { connect } from 'react-redux'
import { VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { FAQS } from 'constants/url'
import { useTranslation } from 'react-i18next'
import { pendingInvoiceList, exportPendingInvoice } from 'api/POBased'
import dayjs from 'dayjs'
import { downloadFile, getEntityId } from 'services/utilities'
import SuccessPopup from 'components/Common/SuccessPopup'
import { getCRPersons } from 'api/MyProfile'
import { fetchCurrencies } from 'api/UserRegister'
import useTableFeatures from 'hooks/useTableFeatures'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { useSearchParams } from 'react-router-dom'
import utc from 'dayjs/plugin/utc'
import PendingInvoiceTablePDF from 'components/PDF/PendingInvoiceTablePDF'
import { toast } from 'react-toastify'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
dayjs.extend(utc)

const PendingInvoiceList = ({ userInfo: { userType } }) => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation([
    'po_based_report',
    'po_based_invoices',
    'purchase_order',
    'vendors',
    'sidebar',
    'soa',
    'popup',
    'logistics_invoice',
    'extention',
    'toast',
    'non_po_based_report',
    'advance_payment',
    'enquiries'
  ])
  const isArabic = i18n.language === 'ar'
  const draftSubmittedUnderReviewStatuses = [7, 1, 2]
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') === 'dashboard'
  const sourceType = searchParams.get('type') === 'pendingInvoices'

  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [emailReportState, setEmailReportState] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)
  const [listData, setListData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [crPersonsOptions, setCrPersonsOptions] = useState([])
  const [poDownloadList, setPoDownloadList] = useState([])

  const [filterDateRange, setFilterDateRange] = useState([null, null])
  const [emailReportDateRange, setEmailReportDateRange] = useState([null, null])
  const [filters, setFilters] = useState({
    search: '',
    start_date: null,
    end_date: null,
    currency: 'All',
    sort_column: '',
    sort: '',
    status: source ? draftSubmittedUnderReviewStatuses : 'All'
  })
  const {
    page,
    rowsPerPage,
    search,
    order,
    orderBy,
    setPageMeta,
    setLoader,
    handleSearchValue,
    tableProps
  } = useTableFeatures()

  useEffect(() => {
    fetchPOBasedList()
    if (downloadReport) {
      getPDFData()
    }
  }, [filters, page, rowsPerPage, search, order, orderBy])

  useEffect(() => {
    fetchDropdownData()
  }, [])

  const fetchPOBasedList = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(), // Default param
      category: 1, //PO based
      ...filters,
      search: search.trim(),
      page,
      limit: rowsPerPage,
      sort_column: orderBy,
      sort: order
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    pendingInvoiceList(query)
      .then((res) => {
        setListData(res?.data?.data?.results || [])
        setPageMeta(res?.data?.data?.pageMeta)
      })
      .catch((err) => {
        console.error('Error fetching PO invoices:', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const getPDFData = () => {
    const query = {
      entity_id: getEntityId(), // Default param
      category: 1, //PO based
      ...filters,
      search: search.trim(),
      page,
      limit: 1000,
      sort_column: orderBy,
      sort: order
    }
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })
    pendingInvoiceList(query)
      .then((res) => {
        setPoDownloadList(res?.data?.data?.results || [])
        // setPageMeta(res?.data?.data?.pageMeta)
      })
      .catch((err) => {
        console.error('Error fetching PO invoices:', err)
      })
  }

  const fetchDropdownData = () => {
    let query = {
      entity_id: getEntityId()
    }
    Promise.all([fetchCurrencies(), getCRPersons(query)])
      .then(([currenciesRes, crPersonsRes]) => {
        const currencyList = Array.isArray(currenciesRes.data.data) ? currenciesRes.data.data : []
        const formattedCurrencies = [
          { label: 'All', value: 'All' },
          ...currencyList
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name
            .map((item) => ({
              label: `${item?.name} (${item?.code})`,
              value: item.code
            }))
        ]

        const crPersonsOptions = [
          { label: 'All', value: 'All' },
          ...(crPersonsRes?.data?.data?.map((person) => ({
            label: person.Name,
            value: person.Employee_Id
          })) || [])
        ]

        setCurrencyOptions(formattedCurrencies)
        setCrPersonsOptions(crPersonsOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }

  const handleFilterChange = (newFilter) => {
    const key = Object.keys(newFilter)[0]
    let value = newFilter[key]

    if (key === 'search') {
      setFilters((prev) => ({
        ...prev,
        search: Array.isArray(value) ? value.join(',') : value // Handle both text and multi-select
      }))
    } else if (key === 'date_range' && value) {
      // Assuming value is an array from DateRangePicker
      setFilters((prev) => ({
        ...prev,
        start_date: value[0]?.format('YYYY-MM-DD'),
        end_date: value[1]?.format('YYYY-MM-DD') || value[0]?.format('YYYY-MM-DD')
      }))
      setFilterDateRange(value)
    } else if (key === 'status') {
      setFilters((prev) => ({
        ...prev,
        status: value === 'All' ? '' : value
      }))
    } else {
      setFilters((prev) => ({
        ...prev,
        [key]: value
      }))
    }
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  const downloadCSV = () => {
    const query = {
      entity_id: getEntityId(),
      format: 'csv',
      mode: 'report',
      startDate: filterDateRange[0]?.format('YYYY-MM-DD'),
      endDate: filterDateRange[1]?.format('YYYY-MM-DD'),
      category: 1,
      isArabic: isArabic ? true : false
    }
    exportPendingInvoice(query)
      .then((res) => {
        downloadFile(res?.data, `po_based_invoices.csv`)
        handleCloseDownload()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const handleClosePopup = () => {
    setEmailReportState(false)
  }

  const handleSendEmailReport = () => {
    if (!emailReportDateRange[0] || !emailReportDateRange[1]) {
      toast.error(t('toast:selectDateRangeBeforeSending'))
      return
    }
    const query = {
      startDate: emailReportDateRange[0] ? emailReportDateRange[0].format('YYYY-MM-DD') : null,
      endDate: emailReportDateRange[1] ? emailReportDateRange[1].format('YYYY-MM-DD') : null,
      entity_id: getEntityId(),
      category: 1,
      format: 'csv',
      isArabic: isArabic ? true : false
    }

    exportPendingInvoice(query)
      .then(() => {
        setEmailSuccessPopup(true)
        handleClosePopup()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const onClickViewInvoice = async (data) => {
    const routeMap = {
      'PO Invoice': `/${userType}/invoice-processing/po-based-invoice/view?id=${data?.id}`,
      'Non PO Invoice': `/${userType}/invoice-processing/non-po-based-invoice/view?no=${data?.id}`,

      'Logistic Invoice': `/${userType}/invoice-processing/logistics/view?no=${data?.invoiceNo}`,
      'Credit Note': `/${userType}/invoice-processing/credit-note/${data?.invoiceNo}`
    }

    const route = routeMap[data?.typeOfInvoice]

    if (route) {
      navigate(route)
    } else {
      console.warn(`Unknown invoice type: ${data?.typeOfInvoice}`)
      // Optionally handle default case or error
    }
  }

  const headers = [
    {
      key: 'typeOfInvoice',
      label: t('advance_payment:typeOfInvoice.text'),
      sortable: true,
      sortKey: 'Name_En'
    },
    { key: 'invoiceNo', label: t('logistics_invoice:invoiceNo'), sortable: true, sortKey: 'InvNo' },
    ...(userType === VENDOR_USER_TYPE
      ? []
      : [
          { key: 'vendor_name', label: t('vendorName'), sortable: true, sortKey: 'Vendor_Name_EN' },
          { key: 'vendor_code', label: t('vendorCode'), sortable: true, sortKey: 'Vendor_SAP_Code' }
        ]),

    //   { key: 'refNo', label: 'Reference No.', sortable: true, sortKey: 'Ref_No' }
    //   ,
    { key: 'date', label: t('po_based_invoices:date'), sortable: true, sortKey: 'Submitted_Date' },
    { key: 'currency', label: t('currency.text'), sortable: true, sortKey: 'InvCurr' },
    {
      key: 'invoiceValue',
      label: t('po_based_invoices:invoiceValue'),
      sortable: true,
      sortKey: 'InvAmt'
    },
    {
      key: 'invoiceDueDate',
      label: t('invoiceDueDate.text'),
      sortable: true,
      sortKey: 'Invoice_Due_Date'
    },
    {
      key: 'status',
      label: t('po_based_invoices:status'),
      sortable: true,
      sortKey: 'Invoice_Status_Id'
    }
  ]

  const headerLabels = headers.map((h) => h.label)
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

  const statusOptions = [
    { label: capitalize(t('vendors:all')), value: '' },
    ...(userType === VENDOR_USER_TYPE ? [{ label: capitalize(t('vendors:draft')), value: 7 }] : []),
    { label: capitalize(t('vendors:submittedForReview')), value: 1 },
    { label: capitalize(t('vendors:underReview')), value: 2 },
    { label: capitalize(t('extention:approved')), value: 4 },
    { label: capitalize(t('extention:rejected')), value: 5 }
  ]

  const filteredStatusOptions = source
    ? statusOptions.filter((opt) => [7, 1, 2, ''].includes(opt.value))
    : statusOptions

  const formattedData = listData?.map((item) => ({
    typeOfInvoice: item?.category?.Name_En,
    invoiceNo: item?.InvNo,
    refNo: item?.Ref_No,
    date: item?.Submitted_Date ? dayjs(item.Submitted_Date).utc().format('DD/MM/YYYY') : 'N/A',
    currency: item?.InvCurr || 'N/A',
    invoiceValue: item?.InvAmt?.toLocaleString(),
    invoiceDueDate: item?.Invoice_Due_Date
      ? dayjs(item?.Invoice_Due_Date)?.utc().format('DD/MM/YYYY')
      : 'N/A',
    createdBy: item?.createdBy || 'N/A',
    //status: statusOptions.find((opt) => opt.value === item?.Invoice_Status_Id)?.label || 'N/A',
    status: item?.status?.Status_classification || 'N/A',
    vendor_code: item?.vendorDetails?.Vendor_SAP_Code,
    vendor_name: item?.vendorDetails?.Vendor_Name_EN,
    id: item?.ID
  }))

  const pdfTableData = poDownloadList?.map((item) => ({
    typeOfInvoice: item?.category?.Name_En,
    invoiceNo: item?.InvNo,
    date: item?.Submitted_Date ? dayjs(item.Submitted_Date).utc().format('DD/MM/YYYY') : 'N/A',
    currency: item?.InvCurr || 'N/A',
    invoiceValue: item?.InvAmt?.toLocaleString(),
    invoiceDueDate: item?.Invoice_Due_Date
      ? dayjs(item?.Invoice_Due_Date)?.utc().format('DD/MM/YYYY')
      : 'N/A',
    status: item?.status?.Status_classification || 'N/A'
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
          title={t('pendingInvoicesReport')}
          slug={`${t('sidebar:home')}/ ${t('sidebar:dashboard')}/ ${t('pendingInvoicesReport')}`}>
          <div style={{ display: 'flex', marginRight: '0' }}>
            <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.tooltip')}>
              <UtilIconFaq name="emailReport" onClick={() => setEmailReportState(true)} />
            </TooltipWrapper>
            <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
              <UtilIconFaq
                name="download2"
                onClick={() => {
                  getPDFData()
                  setDownloadReport(true)
                }}
              />
            </TooltipWrapper>
          </div>
          <TooltipWrapper tooltipMessage={t('soa:help')}>
            <UtilIconFaq
              style={{ marginLeft: 0 }}
              name="help"
              onClick={() => navigate(`/${userType}${FAQS}?id=3`)}
            />
          </TooltipWrapper>
        </HeaderBar>
      </div>

      {/* Filters */}
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className={styles.tableHeaderContainer}>
          <SearchInput
            placeholder={t('po_based_invoices:searchForInvoiceNo')}
            showDropdown={false}
            onChange={(value) => handleSearchValue(value)}
          />
          <div className="d-flex gap-4 items-center">
            <TableHeaderDropdown className="flex items-center">
              <TableDropDownLabel>{t('enquiries:date')}</TableDropDownLabel>
              <DateRangePicker
                value={filterDateRange}
                setValue={(dates) => {
                  handleFilterChange({ date_range: dates })
                }}
                type="range"
                pickerHeight="45px"
              />
            </TableHeaderDropdown>

            <TableSelectBox
              label={t('currency.text')}
              options={currencyOptions}
              isCurrency
              onFilterChange={handleFilterChange}
              placeholder={'All'}
            />
            <TableSelectBox
              label={t('po_based_invoices:status')}
              options={filteredStatusOptions}
              isCurrency
              onFilterChange={handleFilterChange}
              placeholder={'All'}
            />
          </div>
        </div>
        {/* pass handle redirectURL below */}
        <TableLayout
          tableHeaders={headers}
          tableData={formattedData}
          handleRedirectUrl={onClickViewInvoice}
          {...tableProps}
        />
      </div>
      <EmailReportComp
        onClose={() => setEmailReportState(false)}
        value={emailReportDateRange}
        setValue={setEmailReportDateRange}
        open={emailReportState}
        onSend={handleSendEmailReport}
      />
      <DownloadReportComp
        headers={headers}
        tableData={formattedData}
        open={downloadReport}
        hideDatePicker={true}
        onClose={() => setDownloadReport(false)}
        title="Pending_invoices"
        onClickSubmit={downloadCSV}
        NewTableComp={
          <TableLayout
            tableHeaders={headers}
            tableData={formattedData}
            handleRedirectUrl={onClickViewInvoice}
            {...tableProps}
          />
        }
        pdfComponent={<PendingInvoiceTablePDF data={pdfTableData} headerLabels={headerLabels} />}
      />
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(PendingInvoiceList)
