import React, { Suspense, useEffect, useState } from 'react'
import { NormalButton } from 'components/Common'
import styles from './PurchaseOrder.module.scss'
import DateRangePicker from 'components/Common/DateRangePicker1'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { UtilIconFaq } from '../../../Common/UtilIcon'
import { connect } from 'react-redux'
import EmailReportComp from 'components/Vendor/EmailReport'
import { PageHeader } from 'components/Essa/PageShell'
import {
  FilterBar,
  FilterField,
  FilterSearch,
  ListWorkbench,
  TablePagination
} from 'components/Essa/ui/listPage'
import { nextIcon, saveIcon } from 'constants/imageConstants'
import '../../../../assets/scss/essa/dashboard.scss'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPOList, downloadPOGoodsReceiptListCSV, getPODetails } from 'api/PurchaseOrder'
import dayjs from 'dayjs'
import { setPoList } from '../../../../redux/actions/purchaseOrderAction'
import { FAQS, INVOICE_DASHBOARD, INVOICE_PO_BASED } from 'constants/url'
import SuccessPopup from 'components/Common/SuccessPopup'
import { generateCsv, getEntityId } from 'services/utilities'
import { getCRPersons, getPoCRPersons } from 'api/MyProfile'
import { fetchCurrencies } from 'api/UserRegister'
import useTableFeatures from 'hooks/useTableFeatures'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import PurchaseOrderTablePDF from '../../../PDF/PurchaseOrderTablePDF'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'

const PurchaseOrderComp = ({ userInfo: { userType }, purchaseOrder, setPoList }) => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation([
    'purchase_order',
    'vendors',
    'sidebar',
    'dashboard',
    'popup',
    'non_po_based_report',
    'soa',
    'toast'
  ])
  const isArabic = i18n.language === 'ar'
  const [searchParams] = useSearchParams()
  const poStatusFromUrl = searchParams.get('poStatus')
  const isDataEmpty = purchaseOrder.poListData.results?.length === 0

  const [emailReportState, setEmailReportState] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)
  const [createPurchaseOrder, setCreatePurchaseOrder] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [emailDateRange, setEmailDateRange] = useState([null, null])
  const [downloadDateRange, setDownloadDateRange] = useState([null, null])
  const [filterDateRange, setFilterDateRange] = useState([null, null])
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [crPersonsOptions, setCrPersonsOptions] = useState([])
  const [poDownloadList, setPoDownloadList] = useState([])
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    currency: 'All',
    created_by: '',
    poStatus: poStatusFromUrl || 'All'
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
  const source = searchParams.get('source')

  useEffect(() => {
    // if (downloadReport) {
    getPDFData()
    // }
    fetchPOList()
  }, [filters, page, search, rowsPerPage, order, orderBy])

  useEffect(() => {
    fetchDropdownData()
  }, [])

  const fetchPOList = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      ...(source === 'dashboard' && { outstandingPo: true }),
      ...filters,
      search: search.trim(),
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy
    }

    Object.keys(query).forEach((key) => {
      if (Array.isArray(query[key])) {
        if (query[key].length === 0 || (query[key].length === 1 && query[key][0] === 'All')) {
          delete query[key]
        } else {
          query[key] = query[key].join(',')
        }
      } else if (!query[key] || query[key] === 'All') {
        delete query[key]
      }
    })

    getPOList(query)
      .then((res) => {
        setPoList(res.data?.data || { results: [] })
        setPageMeta(res?.data?.data?.pageMeta)
      })
      .catch((err) => {
        console.error('Error fetching PO list:', err)
      })
      .finally(() => setLoader(false))
  }

  const getPDFData = () => {
    const query = {
      entity_id: getEntityId(),
      ...filters,
      search: search.trim(),
      page: 1,
      limit: 10000,
      sort: order,
      sort_column: orderBy
    }

    Object.keys(query).forEach((key) => {
      if (Array.isArray(query[key])) {
        if (query[key].length === 0 || (query[key].length === 1 && query[key][0] === 'All')) {
          delete query[key]
        } else {
          query[key] = query[key].join(',')
        }
      } else if (!query[key] || query[key] === 'All') {
        delete query[key]
      }
    })

    getPOList(query)
      .then((res) => {
        setPoDownloadList(res.data?.data || { results: [] })
      })
      .catch((err) => {
        console.error('Error fetching PO list:', err)
      })
  }

  const fetchDropdownData = () => {
    let query = {
      entity_id: getEntityId()
    }
    Promise.all([fetchCurrencies(), getPoCRPersons(query)])
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
          // { label: 'All', value: 'All' },
          ...(crPersonsRes?.data?.data?.map((person) => ({
            label: person.Name,
            value: person.ID
          })) || [])
        ]

        setCurrencyOptions(formattedCurrencies)
        setCrPersonsOptions(crPersonsOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }

  //Status Options

  const statusOptionsList = [
    { label: t('vendors:all'), value: 'All' },
    { label: t('open'), value: 'Open' },
    { label: t('closed'), value: 'Closed' }
  ]

  const handleFilterChange = (newFilter) => {
    const key = Object.keys(newFilter)[0]
    let value = newFilter[key]

    // Special handling for sort
    if (key === 'sort_column' && value) {
      const [column, direction = 'ASC'] = value.split(' ')
      setFilters((prev) => ({
        ...prev,
        sort_column: column,
        sort: direction.toUpperCase()
      }))
    }
    // Special handling for date range
    else if (key === 'date_range' && value) {
      setFilters((prev) => ({
        ...prev,
        startDate: value[0]?.format('YYYY-MM-DD'),
        endDate: value[1]?.format('YYYY-MM-DD') || value[0]?.format('YYYY-MM-DD')
      }))
      setFilterDateRange(value)
    } else if (key === 'date_range_download' && value) {
      setFilters((prev) => ({
        ...prev,
        startDate: value[0]?.format('YYYY-MM-DD'),
        endDate: value[1]?.format('YYYY-MM-DD') || value[0]?.format('YYYY-MM-DD')
      }))
      setDownloadDateRange(value)
    }
    // Handle currency filter
    else if (key === 'currency') {
      setFilters((prev) => ({
        ...prev,
        currency: value === 'All' ? '' : value
      }))
    }
    // Handle created_by filter
    else if (key === 'created_by') {
      if (Array.isArray(value)) {
        if (value.includes('All')) {
          setFilters((prev) => ({
            ...prev,
            created_by: ''
          }))
        } else {
          const filteredValues = value.filter((v) => v !== '')
          setFilters((prev) => ({
            ...prev,
            created_by: filteredValues.length > 0 ? filteredValues : ''
          }))
        }
      } else {
        setFilters((prev) => ({
          ...prev,
          created_by: value === 'All' ? '' : value
        }))
      }
    } else if (key === 'poStatus') {
      setFilters((prev) => ({
        ...prev,
        poStatus: value === 'All' ? '' : value
      }))
    }
    // Default case for search and other filters
    else {
      setFilters((prev) => ({
        ...prev,
        [key]: value
      }))
    }
  }

  const handleDownload = () => {
    setDownloadDateRange([null, null])
    setDownloadReport(true)
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  const handleDownloadSubmit = () => {
    const query = {
      entity_id: getEntityId(),
      mode: 'report',
      format: 'csv',
      isArabic: isArabic ? true : false,
      ...filters,
      search: search.trim()
    }

    Object.keys(query).forEach((key) => {
      if (Array.isArray(query[key])) {
        if (query[key].length === 0 || (query[key].length === 1 && query[key][0] === 'All')) {
          delete query[key]
        } else {
          query[key] = query[key].join(',')
        }
      } else if (!query[key] || query[key] === 'All') {
        delete query[key]
      }
    })

    if (downloadDateRange && downloadDateRange[0] && downloadDateRange[1]) {
      query.startDate = downloadDateRange[0].format('YYYY-MM-DD')
      query.endDate = downloadDateRange[1].format('YYYY-MM-DD')
    }

    generateCsv(
      `${process.env.REACT_APP_DEFAULT_API_BASE_URL}/purchaseOrder/poList/export`,
      'PurchaseOrders.csv',
      query
    ).then(() => {
      handleCloseDownload()
    })
  }

  const handleSendEmail = () => {
    // if (!emailDateRange[0] || !emailDateRange[1]) {
    //   toast.error(t('toast:selectDateRangeBeforeSending'))
    //   return
    // }

    const query = {
      entity_id: getEntityId(),
      startDate: emailDateRange[0] ? emailDateRange[0].format('YYYY-MM-DD') : null,
      endDate: emailDateRange[1] ? emailDateRange[1].format('YYYY-MM-DD') : null,
      format: 'csv',
      isArabic: isArabic ? true : false,
      ...filters
    }

    // Clean up empty values
    // Object.keys(query).forEach((key) => {
    //   if (!query[key] || query[key] === 'All') delete query[key]
    // })
    Object.keys(query).forEach((key) => {
      if (Array.isArray(query[key])) {
        if (query[key].length === 0 || (query[key].length === 1 && query[key][0] === 'All')) {
          delete query[key]
        } else {
          query[key] = query[key].join(',')
        }
      } else if (!query[key] || query[key] === 'All') {
        delete query[key]
      }
    })

    // sendEmailReport(query)
    downloadPOGoodsReceiptListCSV(query)
      .then(() => {
        setEmailReportState(false)
        setEmailSuccessPopup(true)
      })
      .catch(console.error)
  }

  const onClickPoNumber = async (data) => {
    try {
      const details = await getPODetails({ id: data?.PONo })
      navigate(`${data.PONo}`, { state: { poDetails: details.data } })
    } catch (error) {
      console.error('Error fetching PO details:', error)
    }
  }

  const headers = [
    { key: 'PONo', label: t('poNumber.text') + '.', sortable: true, sortKey: 'PONo' },
    ...(userType === VENDOR_USER_TYPE
      ? []
      : [
          { key: 'vendor_name', label: t('vendorName'), sortable: true, sortKey: 'Vendor_Name_EN' },
          { key: 'vendor_code', label: t('vendorCode'), sortable: true, sortKey: 'Vendor_SAP_Code' }
        ]),
    { key: 'po_date', label: t('poDate'), sortable: true, sortKey: 'PO_date' },
    { key: 'reference_number', label: t('referenceNo') + '.', sortable: true, sortKey: 'OurRef' },
    { key: 'po_value', label: t('purchase_order:amount'), sortable: true, sortKey: 'POValue' },
    { key: 'po_currency', label: t('currency.text'), sortable: true, sortKey: 'PO_currency' },
    { key: 'created_by', label: t('createdBy'), sortable: true, sortKey: 'CreatedBy' },
    { key: 'status', label: t('vendors:status'), sortable: true, sortKey: 'POStatus' }
  ]
  const headerLabels = headers.map((h) => h.label)

  const APIData = purchaseOrder.poListData.results || []

  const data = APIData?.map((item) => ({
    ...item,
    PONo: item?.PONo,
    po_date: item?.PO_date ? dayjs(item?.PO_date).format('DD/MM/YYYY') : '',
    reference_number: item?.OurRef,
    po_value:
      item?.POValue !== undefined && item?.POValue !== null && !isNaN(item.POValue)
        ? Number(item.POValue).toLocaleString('en-US', { minimumFractionDigits: 2 })
        : '0.00',
    po_currency: item?.PO_currency,
    created_person_id: item?.created_person?.Name,
    vendor_code: item?.Vendor_SAP_Code,
    vendor_name: item?.vendor?.Vendor_Name_EN,
    created_by: item?.created_person?.Name,
    status: item?.POStatus
  }))

  const downloadData = poDownloadList?.results || []

  const totalCount = tableProps.pageMeta?.total ?? data?.length ?? 0
  const totalPages = Math.max(1, tableProps.pageMeta?.pageCount || 1)
  const pageTitle =
    source === 'dashboard' ? t('dashboard:outstandingPO') : t('sidebar:purchaseOrders')

  const pdfTableData = downloadData?.map((item) => ({
    ...item,
    PONo: item?.PONo,
    po_date: item?.PO_date ? dayjs(item?.PO_date).format('DD/MM/YYYY') : '',
    reference_number: item?.OurRef,
    po_value: item?.POValue,
    po_currency: item?.PO_currency,
    created_person_id: item?.created_person?.Name,
    vendor_code: item?.Vendor_SAP_Code,
    vendor_name: item?.vendor?.Vendor_Name_EN,
    status: item?.POStatus
  }))

  return (
    <LeftPageContainer className="essa-invoices-shell">
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('popup:emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      <div
        className={`essa-dashboard essa-invoices-page email-templates-page ${styles.poContainer}`}>
        <div className="dx-page dx-page--invoices-fit">
          <PageHeader
            breadcrumb={[
              { label: t('dashboard:home'), to: `/${userType}${INVOICE_DASHBOARD}` },
              { label: pageTitle }
            ]}
            title={pageTitle}
            actions={
              <div className={`flex flex-wrap items-center ${styles.headerActions}`}>
                <div className={styles.headerIcons}>
                  {(userType === VENDOR_USER_TYPE || userType === ADMIN_USER_TYPE) && (
                    <TooltipWrapper tooltipMessage={t('createInvoice')}>
                      <UtilIconFaq
                        name="invoice"
                        size={16}
                        onClick={
                          selectedRows.length === 0
                            ? undefined
                            : () =>
                                navigate(`/${userType}${INVOICE_PO_BASED}/invoice`, {
                                  state: { poNumbers: selectedRows }
                                })
                        }
                        className={`${styles.headerIcon} ${
                          selectedRows.length === 0 ? styles.disabledIcon : ''
                        }`}
                      />
                    </TooltipWrapper>
                  )}
                  <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.tooltip')}>
                    <UtilIconFaq
                      name="emailReport"
                      size={16}
                      onClick={!isDataEmpty ? () => setEmailReportState(true) : undefined}
                      className={`${styles.headerIcon} ${isDataEmpty ? styles.disabledIcon : ''}`}
                    />
                  </TooltipWrapper>
                  <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
                    <UtilIconFaq
                      name="download2"
                      size={16}
                      onClick={!isDataEmpty ? handleDownload : undefined}
                      className={`${styles.headerIcon} ${isDataEmpty ? styles.disabledIcon : ''}`}
                    />
                  </TooltipWrapper>
                  <TooltipWrapper tooltipMessage={t('soa:help')}>
                    <UtilIconFaq
                      name="help"
                      size={16}
                      className={styles.headerIcon}
                      onClick={() => navigate(`/${userType}${FAQS}?id=2`)}
                    />
                  </TooltipWrapper>
                </div>
                {userType === VENDOR_USER_TYPE && createPurchaseOrder && (
                  <>
                    <NormalButton
                      label={t('next')}
                      isPrimary
                      customClass="px-3"
                      rightIcon={nextIcon}
                    />
                    <NormalButton
                      label={t('save')}
                      isPrimary
                      customClass="px-3"
                      rightIcon={saveIcon}
                    />
                  </>
                )}
              </div>
            }
          />
          <ListWorkbench>
            <FilterBar
              className={`dx-invoices-filters border-b border-line-soft ${styles.filterBar}`}>
              <FilterField label={t('vendors:search')}>
                <FilterSearch
                  placeholder={
                    userType === VENDOR_USER_TYPE
                      ? t('searchPONumberAndReferenceNo')
                      : t('searchPONoVendorNo')
                  }
                  className="dx-vendors-search-input"
                  aria-label={t('vendors:search')}
                  onChange={(e) => {
                    const value = e.target.value
                    clearTimeout(window.searchTimeout)
                    window.searchTimeout = setTimeout(() => handleSearchValue(value), 1000)
                  }}
                />
              </FilterField>
              <FilterField label={t('selectDate')}>
                <DateRangePicker
                  value={filterDateRange}
                  setValue={(dates) => {
                    handleFilterChange({ date_range: dates })
                  }}
                  type="range"
                  minHeight="36px"
                  pickerHeight="36px"
                />
              </FilterField>
              {/* changed from currency to status */}
              <TableSelectBox
                label={t('vendors:status')}
                options={statusOptionsList}
                onFilterChange={handleFilterChange}
                value={filters.poStatus}
                paramName="poStatus"
                placeholder={t('vendors:all')}
              />
              <TableSelectBox
                label={t('createdBy')}
                options={crPersonsOptions}
                onFilterChange={handleFilterChange}
                value={filters.created_by}
                paramName="created_by"
                placeholder={t('vendors:all')}
                multiSelect={true}
                isCurrency
              />
              <span className="mb-1 ml-auto self-center text-[11px] leading-none text-ink-muted">
                {totalCount} {t('sidebar:purchaseOrders').toLowerCase()}
              </span>
            </FilterBar>

            <div className={`dx-table-wrap dx-table-wrap-scroll dx-invoices-table-wrap ${styles.poTableWrap}`}>
              <TableLayout
                handleRedirectUrl={onClickPoNumber}
                checkboxRequired={userType !== FINANCE_USER_TYPE && userType !== BUSINESS_USER_TYPE}
                tableHeaders={headers}
                tableData={data}
                onSelectionChange={(rows) => setSelectedRows(rows)}
                className="purchase-order-table"
                {...tableProps}
                stickyHeader
                showPagination={false}
              />
            </div>

            <TablePagination
              page={page}
              totalPages={totalPages}
              total={totalCount}
              pageSize={rowsPerPage}
              onPage={(p) => tableProps.handlePage(p)}
              onPageSize={(size) => tableProps.handlePerPage(size)}
              noun={t('sidebar:purchaseOrders').toLowerCase()}
            />
          </ListWorkbench>
        </div>
      </div>
      <Suspense fallback={<div> Loading...</div>}>
        <EmailReportComp
          value={emailDateRange}
          setValue={setEmailDateRange}
          open={emailReportState}
          onClose={() => setEmailReportState(false)}
          onSend={handleSendEmail}
          disable={true}
        />
      </Suspense>
      <Suspense fallback={<div> Loading...</div>}>
        <DownloadReportComp
          value={downloadDateRange}
          hideDatePicker
          setValue={(dates) => {
            handleFilterChange({ date_range_download: dates })
          }}
          open={downloadReport}
          onClose={handleCloseDownload}
          title={source === 'dashboard' ? t('outstandingPurchaseOrderPDF') : t('purchaseOrderPDF')}
          pdfComponent={
            <PurchaseOrderTablePDF
              data={pdfTableData}
              headerLabels={headerLabels}
              userType={userType}
            />
          }
          onClickSubmit={handleDownloadSubmit}
          NewTableComp={
            <TableLayout
              // showPagination={false}
              checkboxRequired={false}
              tableHeaders={headers}
              tableData={data}
              {...tableProps}
            />
          }
        />
      </Suspense>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
  purchaseOrder: state.purchaseOrder
})

const mapDispatchToProps = (dispatch) => ({
  setPoList: (payload) => dispatch(setPoList(payload))
})

export default connect(mapStateToProps, mapDispatchToProps)(PurchaseOrderComp)
