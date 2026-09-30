import React, { Suspense, useCallback, useEffect, useState } from 'react'
import styles from './LogisticsInvoiceTotal.module.scss'
import invoiceIcon from '../../../../../assets/icons/invoiceIcon.svg'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import SearchInput from 'components/Common/SearchInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import dayjs from 'dayjs'
import { useLocation, useNavigate } from 'react-router-dom'
import { HeaderBar } from 'components/Common/HeaderBar'
import {
  bulkApproveRejectLogistics,
  bulkSubmitLogistics,
  downloadLogisticsListCSV,
  getLogisticInvoicesById
} from '../../../../../api/LogisticInvoice'
import { connect } from 'react-redux'
import { formatUSDNumber, generateCsv, getEntityId } from '../../../../../services/utilities'
import { TableHeaderDropdown } from 'components/Common/TableComponent/TableComponent.style'
import DateRangePicker from 'components/Common/DateRangePicker1'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import { FAQS, LOGISTICS_INVOICE } from 'constants/url'
import { UtilIcon, UtilIconFaq } from 'components/Common/UtilIcon'
import { NormalButton } from 'components/Common'
import SuccessPopup from 'components/Common/SuccessPopup'
import moment from 'moment'
import { useTranslation } from 'react-i18next'
import { fetchCurrencies, fetchInvoiceStatus } from 'api/UserRegister'
import { showToast } from '../../../../../redux/actions/toastActions'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import useTableFeatures from 'hooks/useTableFeatures'
import LogisticsInvoicePDF from 'components/PDF/LogisticsInvoicePDF'
import { toast } from 'react-toastify'
import ConfirmationPopup from 'components/Common/ConfirmationPopup'
import RejectionPopup from 'components/Common/RejectionPopup'
import CustomModal from 'components/Common/Modal'
import { deleteDraftInvoice } from 'api/POBased'
import SVGIcon from 'components/Common/SVGIcon'

const LogisticsInvoiceTotal = ({ userInfo: { userType }, showToast }) => {
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

  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [isApprove, setIsApprove] = useState(false)
  const [isReject, setIsReject] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [confirmDeletePopup, setConfirmDeletePopup] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)
  const [downloadDateRange, setDownloadDateRange] = useState([dayjs(), dayjs()])
  const [logisticInvoiceDetailsList, setLogisticInvoiceDetailsList] = useState([])
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState([])
  const [filterDateRange, setFilterDateRange] = useState([null, null])
  const [downloadList, setDownloadList] = useState([])
  const [selectedRows, setSelectedRows] = useState([])

  const [filters, setFilters] = useState({
    month: null,
    year: null,
    currency: 'All',
    status: 'All'
  })

  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation([
    'popup',
    'purchase_order',
    'sidebar',
    'logistics_invoice',
    'soa',
    'toast',
    'non_po_based_report',
    'po_based_invoices',
    'vendors',
    'otp',
    'po_based_report'
  ])
  const isArabic = i18n.language === 'ar'
  const searchParams = new URLSearchParams(location.search)
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const selectedMonth = month || dayjs().month() + 1
  const selectedYear = year || dayjs().year()

  const startOfMonth = dayjs(`${selectedYear}-${selectedMonth}-01`)
    .startOf('month')
    .format('YYYY-MM-DD')
  const endOfMonth = dayjs(`${selectedYear}-${selectedMonth}-01`)
    .endOf('month')
    .format('YYYY-MM-DD')

  useEffect(() => {
    fetchData()
    getPDFData()
  }, [filters, page, search, rowsPerPage, order, orderBy, i18n.language])

  const controller = new AbortController()
  const signal = controller.signal

  const fetchData = async () => {
    setLogisticInvoiceDetailsList([])
    setLoader(true)
    try {
      const [currenciesRes, statusRes] = await Promise.all([
        fetchCurrencies(),
        fetchInvoiceStatus()
      ])

      const currencyList = Array.isArray(currenciesRes.data.data) ? currenciesRes.data.data : []
      const formattedCurrencies = [
        { label: t('vendors:all'), value: 'All' },
        ...currencyList.map((item) => ({
          label: `${item?.name} (${item?.code})`,
          value: item.code
        }))
      ]
      const statusOptions = [
        { label: t('vendors:all'), value: 'All' },
        ...(statusRes?.data?.data
          ?.filter((item) => item.Status_code !== 3)
          .map((item) => ({
            label: isArabic ? item.Status_description_arabic : item.Status_classification,
            value: item.Status_code
          })) || [])
      ]

      setCurrencyOptions(formattedCurrencies)
      setStatusOptions(statusOptions)

      const query = {
        entity_id: getEntityId(),
        month,
        year,
        page: page,
        limit: rowsPerPage,
        sort: order,
        sort_column: orderBy,
        search: search.trim()
      }

      if (filters.startDate) query.startDate = filters.startDate
      if (filters.endDate) query.endDate = filters.endDate
      if (filters.currency && filters.currency !== 'All') query.currency = filters.currency
      if (filters.status && filters.status !== 'All') query.status = filters.status

      const response = await getLogisticInvoicesById(query, { signal })
      setLogisticInvoiceDetailsList(response.data.data)
      setPageMeta(response?.data?.data?.pageMeta)
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching data:', err)
      }
    } finally {
      setLoader(false)
    }
  }

  const getPDFData = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      month,
      year,
      search: search.trim(),
      page: 1,
      limit: 1000,
      sort_column: orderBy,
      sort: order
    }

    if (filters.startDate) query.startDate = filters.startDate
    if (filters.endDate) query.endDate = filters.endDate
    if (filters.currency && filters.currency !== 'All') query.currency = filters.currency
    if (filters.status && filters.status !== 'All') query.status = filters.status

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    getLogisticInvoicesById(query)
      .then((res) => {
        setDownloadList(res?.data?.data?.results || [])
      })
      .catch((err) => {
        console.error('Error fetching PO invoices:', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const handleConfirm = (data) => {
    setIsLoading(true)
    const updatedId = filteredData
      .filter((row) => selectedRows.includes(row.invoice_number))
      .map((row) => row.ID)

    let body = {
      updatedId,
      isApproved: isApprove ? true : false,
      // Final_Approval: buttonLogic?.Final_Approval,
      rejectionReason: !isReject ? '' : data?.reasonOfRejection
    }

    bulkApproveRejectLogistics(body)
      .then((res) => {
        setIsApprove(false)
        setIsReject(false)

        if (isApprove) {
          showToast(
            t('toast:applicationApproved'),
            t('logistics_invoice:bulkApprovalSuccessfully'),
            'success'
          )
          // setFinalStatus('approved')
        } else {
          showToast(
            t('toast:bulkRejected'),
            t('logistics_invoice:bulkRejectionSuccessfully'),
            'success'
          )
          // setFinalStatus('rejected')
        }
        fetchData()
        getPDFData()
        setSelectedRows([])
        // fetchVendorViewUpdates()
      })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message)
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
      })
      .finally(() => {
        setIsLoading(false)
        setSelectedRows([])
      })
  }
  const isDataEmpty = logisticInvoiceDetailsList?.results?.length === 0
  const handleCloseDownload = useCallback(() => {
    setDownloadReport(false)
  }, [])

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
    else if (key === 'status') {
      setFilters((prev) => ({
        ...prev,
        status: value === 'All' ? '' : value
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

  const handleDownloadSubmit = () => {
    const query = {
      entity_id: getEntityId(),
      mode: 'report',
      month: month,
      year: year,
      format: 'csv',
      isArabic: isArabic ? true : false,
      search: search.trim()
    }
    if (filters.startDate) query.startDate = filters.startDate
    if (filters.endDate) query.endDate = filters.endDate
    if (filters.currency && filters.currency !== 'All') query.currency = filters.currency
    if (filters.status && filters.status !== 'All') query.status = filters.status
    generateCsv(
      `${process.env.REACT_APP_DEFAULT_API_BASE_URL}/invoice/logisticsListByMonth/export`,
      'LogisticsInvoiceList.csv',
      query
    ).then(() => {
      handleCloseDownload()
    })
  }

  const handleSendEmail = () => {
    const APIdata = logisticInvoiceDetailsList?.results || []

    if (!APIdata || APIdata.length === 0) {
      toast.error(t('toast:noDataToExport'))
      return
    }
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      category: 3,
      //mode: 'report',
      format: 'csv',
      isArabic: isArabic ? true : false,
      // startDate: startOfMonth,
      // endDate: endOfMonth
      month: month,
      year: year,
      search: search.trim()
    }

    if (filters.startDate) query.startDate = filters.startDate
    if (filters.endDate) query.endDate = filters.endDate
    if (filters.currency && filters.currency !== 'All') query.currency = filters.currency
    if (filters.status && filters.status !== 'All') query.status = filters.status

    downloadLogisticsListCSV(query)
      .then(() => {
        setEmailSuccessPopup(true)
      })
      .catch((err) => {
        showToast(t('toast:errorTitle'), `${err?.response?.data?.message || err.message}`, 'error')
        console.error('Error downloading invoices:', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const handleRedirect = (data) => {
    const { ID } = data
    navigate(`/${userType}/invoice-processing/logistics/view?id=${ID}`)
  }

  const onClickCreateInvoice = () => {
    navigate(`/${userType}${LOGISTICS_INVOICE}/new`)
  }

  const handleBulkSubmit = () => {
    // Logic for bulk submit
    const updatedId = filteredData
      .filter((row) => selectedRows.includes(row.invoice_number))
      .map((row) => row.ID)

    let body = {
      invoiceIds: updatedId
    }
    bulkSubmitLogistics(body)
      .then((res) => {
        showToast(t('toast:successTitle'), t('logistics_invoice:bulkSubmitSuccessfully'), 'success')
        fetchData()
        getPDFData()
        setSelectedRows([])
      })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message)
      })
  }

  const handleBulkDelete = () => {
    // Logic for bulk delete
    const updatedId = filteredData
      .filter((row) => selectedRows.includes(row.invoice_number))
      .map((row) => row.ID)

    let body = {
      invoiceIds: updatedId
    }
    // console.log(body, 'body')
    setIsDeleteLoading(true)

    deleteDraftInvoice(body)
      .then((res) => {
        showToast(t('toast:successTitle'), t('po_based_report:bulkDeleteSuccessfully'), 'success')
        setIsDeleteLoading(false)
        setConfirmDeletePopup(false)
        fetchData()
        getPDFData()
        setSelectedRows([])
      })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message)
      })
  }

  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=3`)
  }

  const handleDownloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/templates/logistics_template.xls'
    link.download = 'logistics_template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const headers = [
    {
      key: 'invoice_number',
      label: t('logistics_invoice:invoiceNo') + '.',
      sortable: true,
      sortKey: 'InvNo'
    },
    ...(userType === VENDOR_USER_TYPE
      ? []
      : [
          {
            key: 'vendor_name',
            label: t('po_based_invoices:POInvoiceVendorName.text'),
            sortable: true,
            sortKey: 'Vendor_Name_EN'
          },
          {
            key: 'vendor_code',
            label: t('po_based_invoices:POInvoiceVendorCode.text'),
            sortable: true,
            sortKey: 'Vendor_SAP_Code'
          }
        ]),

    { key: 'invoice_date', label: t('logistics_invoice:date'), sortable: true, sortKey: 'InvDt' },
    {
      key: 'reference_no',
      label: t('logistics_invoice:referenceNo') + '.',
      sortable: true,
      sortKey: 'Reference_no'
    },

    {
      key: 'currency',
      label: t('purchase_order:currency.text'),
      sortable: true,
      sortKey: 'InvCurr'
    },
    {
      key: 'invoiceValue',
      label: t('purchase_order:amount'),
      sortable: true,
      sortKey: 'InvAmt'
    },
    {
      key: 'status',
      label: t('logistics_invoice:status.text'),
      sortable: true,
      sortKey: 'Invoice_Status_Id'
    }
  ]
  const headerLabels = headers.map((h) => h.label)

  const filteredData = logisticInvoiceDetailsList?.results?.map((item) => ({
    ...item,
    ID: item?.ID,
    disableCheckbox:
      userType === VENDOR_USER_TYPE && item?.status?.Status_classification === 'Draft'
        ? false
        : !item?.checkBox,
    invoice_number: item?.InvNo,
    invoice_date: item?.InvDt ? moment(item?.InvDt).format('DD/MM/YYYY') : '',
    reference_no: item?.Invoice_acc_doc_number || '',
    submittedDate: item?.Submitted_Date ? moment(item?.Submitted_Date).format('DD/MM/YYYY') : '',
    currency: item?.InvCurr,
    invoiceValue: isNaN(item?.InvAmt) ? '' : formatUSDNumber(item?.InvAmt),
    status: item?.status?.Status_classification,
    vendor_code: item?.vendorDetails?.Vendor_SAP_Code,
    vendor_name: item?.vendorDetails?.Vendor_Name_EN
  }))

  //PDF DATA
  const PDFData = downloadList?.map((item) => ({
    ...item,
    ID: item?.ID,
    invoice_number: item?.InvNo,
    invoice_date: moment(item?.InvDt).format('DD/MM/YYYY'),
    submittedDate: item?.Submitted_Date ? moment(item?.Submitted_Date).format('DD/MM/YYYY') : 'N/A',
    currency: item?.InvCurr,
    invoiceValue: isNaN(item?.InvAmt) ? 'N/A' : formatUSDNumber(item?.InvAmt),
    status: item?.status?.Status_classification,
    vendor_code: item?.vendorDetails?.Vendor_SAP_Code,
    vendor_name: item?.vendorDetails?.Vendor_Name_EN
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

      <div className={styles.poContainer}>
        <HeaderBar
          title={`${t('sidebar:invoiceProcessing')} - ${t('sidebar:logistics')} ${t(
            'logistics_invoice:invoiceList'
          )}`}
          slug={`${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t(
            'sidebar:logistics'
          )} ${t('logistics_invoice:invoiceList')}`}>
          {(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE) && (
            <>
              <NormalButton
                isPrimary
                customClass=""
                label={t('logistics_invoice:bulkApprove')}
                onClick={() => setIsApprove(true)}
                // leftIcon={invoiceIcon}
                disabled={selectedRows.length === 0}
              />
              <NormalButton
                rejectBtn
                customClass="px-3"
                label={t('logistics_invoice:bulkReject')}
                onClick={() => setIsReject(true)}
                // leftIcon={invoiceIcon}
                disabled={selectedRows.length === 0}
              />
            </>
          )}
          {userType === FINANCE_USER_TYPE || userType === BUSINESS_USER_TYPE ? (
            <div
              style={{
                display: 'flex'
                //  marginRight: '0'
              }}>
              <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.text')}>
                <UtilIconFaq
                  name="emailReport"
                  onClick={!isDataEmpty ? handleSendEmail : undefined}
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
              {userType === VENDOR_USER_TYPE && selectedRows?.length > 0 && (
                <>
                  <NormalButton
                    label={t('po_based_report:delete')}
                    rejectBtn
                    customClass="px-3"
                    // leftIcon={invoiceIcon}
                    onClick={() => setConfirmDeletePopup(true)}
                  />

                  <NormalButton
                    label={'Submit'}
                    isPrimary
                    customClass="px-3"
                    // leftIcon={invoiceIcon}
                    onClick={handleBulkSubmit}
                  />
                </>
              )}
              <TooltipWrapper tooltipMessage={t('logistics_invoice:downloadLogisticsTemplate')}>
                <div className={styles.helpIconContainer} onClick={handleDownloadTemplate}>
                  <SVGIcon
                    name="download"
                    size={25}
                    className="cursor-pointer"
                    onClick={handleDownloadTemplate}
                  />
                </div>
              </TooltipWrapper>
              {(userType === VENDOR_USER_TYPE || userType === ADMIN_USER_TYPE) && (
                <div className="d-flex gap-2">
                  <NormalButton
                    label={t('purchase_order:createInvoice')}
                    isPrimary
                    customClass="px-3"
                    leftIcon={invoiceIcon}
                    onClick={onClickCreateInvoice}
                  />
                </div>
              )}
              <div
                style={{
                  display: 'flex'
                  //  marginRight: '0'
                }}>
                <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.text')}>
                  <UtilIconFaq
                    name="emailReport"
                    onClick={!isDataEmpty ? handleSendEmail : undefined}
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

      {/* Filters */}
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className="d-flex justify-content-between p-3 align-items-end">
          <SearchInput
            placeholder={
              userType === ADMIN_USER_TYPE
                ? t('logistics_invoice:searchInvoiceForAdmin')
                : t('logistics_invoice:searchInvoiceReference')
            }
            onChange={(value) => handleSearchValue(value)}
          />
          <div className="d-flex gap-4">
            <TableHeaderDropdown className="flex items-center">
              <label className="dateLabel">{t('purchase_order:selectDate')}</label>
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
              label={t('purchase_order:currency.text')}
              options={currencyOptions}
              isCurrency
              onFilterChange={handleFilterChange}
              value={filters.currency}
              paramName="currency"
            />
            <TableSelectBox
              label={t('logistics_invoice:status.text')}
              options={statusOptions}
              isCurrency
              onFilterChange={handleFilterChange}
              value={filters.status}
              paramName="status"
            />
          </div>
        </div>
        <TableLayout
          selectedRows={selectedRows}
          handleRedirectUrl={handleRedirect}
          checkboxRequired={userType !== FINANCE_USER_TYPE}
          tableData={filteredData}
          onSelectionChange={(rows) => setSelectedRows(rows)}
          tableHeaders={headers}
          {...tableProps}
        />
      </div>

      {/* Modals */}

      {isApprove && (
        <Suspense fallback={<div>Loading...</div>}>
          <ConfirmationPopup
            open={isApprove}
            confirmTxt={t('logistics_invoice:areYouSureWantToApproveThis')}
            onClose={() => setIsApprove(false)}
            onConfirm={handleConfirm}
            isLoading={isLoading}
          />
        </Suspense>
      )}

      {isReject && (
        <Suspense>
          <RejectionPopup
            open={isReject}
            onClose={() => setIsReject(false)}
            onConfirm={handleConfirm}
            isLoading={isLoading}
          />
        </Suspense>
      )}

      <DownloadReportComp
        headers={headers}
        value={downloadDateRange}
        setValue={(dates) => {
          handleFilterChange({ date_range_download: dates })
        }}
        hideDatePicker
        open={downloadReport}
        onClose={handleCloseDownload}
        NewTableComp={
          <TableLayout tableHeaders={headers} tableData={filteredData} {...tableProps} />
        }
        title={`${t('sidebar:invoiceProcessing')}_${t('sidebar:logistics')}_${t(
          'logistics_invoice:invoiceList'
        )}`}
        onClickSubmit={handleDownloadSubmit}
        pdfComponent={
          <LogisticsInvoicePDF data={PDFData} headerLabels={headerLabels} userType={userType} />
        }
      />
      <CustomModal
        open={confirmDeletePopup}
        onClose={() => setConfirmDeletePopup(false)}
        modalStyles={{ width: 400 }}
        closeIcon
        header={t('popup:confirmSubmission')}
        //title={'Confirm Submission'}
        description={t('po_based_report:confirmDeleteMessage')}>
        {/* <p className="modalTxt">{t('popup:confirmChangeEntity')}</p> */}
        <div className="d-flex justify-content-space-between mb-2">
          <NormalButton
            label={t('otp:cancel')}
            outlineBtn
            customClass="confimationBtns me-3"
            onClick={() => setConfirmDeletePopup(false)}
          />
          <NormalButton
            label={t('otp:confirm')}
            isPrimaryModal
            isLoading={isDeleteLoading}
            disabled={isDeleteLoading}
            customClass="confimationBtns "
            onClick={handleBulkDelete}
          />
        </div>
      </CustomModal>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

const mapDispatchToProps = { showToast }

export const LogisticsInvoiceTotalComp = connect(
  mapStateToProps,
  mapDispatchToProps
)(LogisticsInvoiceTotal)
