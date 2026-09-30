import React, { useState, useEffect, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './CreditNoteList.module.scss'
import emailReport from '../../../../../assets/icons/emailReport.svg'
import download from '../../../../../assets/icons/downloadIcon2.svg'
import addIcon from '../../../../../assets/icons/addIcon.svg'
import EmailReportComp from 'components/Vendor/EmailReport'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import DateRangePicker from 'components/Common/DateRangePicker1'
import SearchInput from 'components/Common/SearchInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import { NormalButton } from 'components/Common/NormalButton'
import { TableHeaderDropdown } from 'components/Common/TableComponent/TableComponent.style'
import { connect } from 'react-redux'
import { UtilIcon, UtilIconFaq } from '../../../../Common/UtilIcon'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { CREATE_CREDIT_NOTE, FAQS } from 'constants/url'
import { useTranslation } from 'react-i18next'
import { fetchInvoiceStatus } from 'api/UserRegister'
import { toast } from 'react-toastify'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import SuccessPopup from 'components/Common/SuccessPopup'
import { formatUSDNumber, getEntityId } from 'services/utilities'
import { invoiceListing } from 'api/PurchaseOrder'
import { fetchCurrencies } from 'api/UserRegister'
import { deleteDraftInvoice, emailPOInvoiceDetailsReport } from 'api/POBased'
import useTableFeatures from 'hooks/useTableFeatures'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import CreditNotePDF from 'components/PDF/CreditNotePDF'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import CustomModal from 'components/Common/Modal'
import RequestCredit from './RequestCredit'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import { showToast } from 'redux/actions/toastActions'
dayjs.extend(utc)
const CreditNoteComp = ({ userInfo: { userType }, showToast }) => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation([
    'credit_notes',
    'po_based_report',
    'popup',
    'logistics_invoice',
    'vendors',
    'sidebar',
    'toast'
  ])
  const isArabic = i18n.language === 'ar'

  const [emailReportState, setEmailReportState] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)
  const [creditNotes, setCreditNotes] = useState([])
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState([])
  const [filterDateRange, setFilterDateRange] = useState([null, null])
  const [emailReportDateRange, setEmailReportDateRange] = useState([null, null])
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [requestSuccessPopup, setRequestSuccessPopup] = useState(false)
  const [isRequestCredit, setIsRequestCredit] = useState(false)
  const [pdfData, setPdfData] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [confirmDeletePopup, setConfirmDeletePopup] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  const [filters, setFilters] = useState({
    search: '',
    startDate: null,
    endDate: null,
    status: 'All',
    currency: 'All',
    vendor: '',
    sort_column: '',
    sort: ''
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

  const isDataEmpty = creditNotes.length === 0

  useEffect(() => {
    fetchCreditNoteList()
    if (downloadReport) {
      getPDFData()
    }
  }, [filters, search, rowsPerPage, page, order, orderBy, downloadReport])

  useEffect(() => {
    fetchDropdownData()
  }, [i18n.language])

  const fetchCreditNoteList = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      category: 4, //Credit Note
      ...filters,
      search: search.trim(),
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    invoiceListing(query)
      .then((res) => {
        setCreditNotes(res?.data?.data?.results || [])
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
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      category: 4, //Credit Note
      ...filters,
      search: search.trim(),
      page: 1,
      limit: 1000,
      sort: order,
      sort_column: orderBy
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    invoiceListing(query)
      .then((res) => {
        setPdfData(res?.data?.data?.results || [])
      })
      .catch((err) => {
        console.error('Error fetching PO invoices:', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const fetchDropdownData = () => {
    Promise.all([fetchCurrencies(), fetchInvoiceStatus()])
      .then(([currenciesRes, statusRes]) => {
        const currencyList = Array.isArray(currenciesRes.data.data) ? currenciesRes.data.data : []
        const formattedCurrencies = [
          { label: t('vendors:all'), value: 'All' },
          ...currencyList
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name
            .map((item) => ({
              label: `${item?.name} (${item?.code})`,
              value: item.code
            }))
        ]
        const formattedStatusOptions = [
          { label: t('vendors:all'), value: 'All' },
          ...(statusRes?.data?.data?.map((x) => ({
            label: isArabic ? x.Status_description_arabic : x.Status_classification,
            value: x.Status_code
          })) || [])
        ]
        setStatusOptions(formattedStatusOptions)
        setCurrencyOptions(formattedCurrencies)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }
  // Unified filter handler
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
      return
    }

    // Special handling for date range
    if (key === 'date_range' && value) {
      setFilters((prev) => ({
        ...prev,
        startDate: value[0]?.format('YYYY-MM-DD'),
        endDate: value[1]?.format('YYYY-MM-DD') || value[0]?.format('YYYY-MM-DD')
      }))
      setFilterDateRange(value)
      return
    }

    // Handle "All" options
    if (['status', 'currency', 'vendor'].includes(key)) {
      setFilters((prev) => ({
        ...prev,
        [key]: value === 'All' ? '' : value
      }))
      return
    }

    // Default case
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleEmailReport = () => {
    setEmailReportState(true)
  }

  const handleClosePopup = () => {
    setEmailReportState(false)
  }

  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=4`)
  }

  const handleBulkDelete = () => {
    // Logic for bulk delete
    const updatedId = tableData
      .filter((row) => selectedRows.includes(row.creditNoteNo))
      .map((row) => row.id)

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
        fetchCreditNoteList()
        getPDFData()
        setSelectedRows([])
      })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message)
      })
  }

  const handleRedirectUrl = (data) => {
    navigate(`/${userType}/invoice-processing/credit-note/${data.id}`)
  }

  const handleDownload = () => {
    setDownloadReport(true)
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  const handleCreateInvoice = () => {
    navigate(`/${userType}${CREATE_CREDIT_NOTE}`)
  }

  const handleSendEmailReport = async () => {
    // if (!emailReportDateRange[0] || !emailReportDateRange[1]) {
    //   toast.error(t("toast:selectDateRangeBeforeSending"));
    //   return;
    // }

    const query = {
      startDate: emailReportDateRange[0] ? emailReportDateRange[0].format('YYYY-MM-DD') : null,
      endDate: emailReportDateRange[1] ? emailReportDateRange[1].format('YYYY-MM-DD') : null,
      category: 4,
      entity_id: getEntityId(),
      isArabic: isArabic ? true : false,
      ...filters
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    emailPOInvoiceDetailsReport(query)
      .then(() => {
        setEmailSuccessPopup(true)
        handleClosePopup()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const handleCsvDownload = () => {
    const query = {
      startDate: filterDateRange[0] ? filterDateRange[0].format('YYYY-MM-DD') : null,
      endDate: filterDateRange[1] ? filterDateRange[1].format('YYYY-MM-DD') : null,
      entity_id: getEntityId(),
      category: 4,
      mode: 'report',
      format: 'csv',
      isArabic: isArabic ? true : false,
      ...filters,
      search: search.trim()
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    emailPOInvoiceDetailsReport(query)
      .then((res) => {
        downloadFile(res.data, `credit_note.csv`)
        handleCloseDownload()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  // Transform API data to match table structure
  const tableData =
    creditNotes?.map((note) => ({
      disableCheckbox:
        userType === VENDOR_USER_TYPE && note?.status?.Status_classification === 'Draft'
          ? false
          : true,
      id: note?.ID,
      creditNoteNo: note?.InvNo,
      date: note?.InvDt ? dayjs(note.InvDt).utc().format('DD/MM/YYYY') : 'N/A',
      currency: note?.InvCurr,
      value: isNaN(note?.InvAmt) ? 'N/A' : formatUSDNumber(note?.InvAmt),
      status: note?.status?.Status_classification || 'Unknown',
      vendor_name: note?.vendorDetails?.Vendor_Name_EN,
      vendor_code: note?.vendorDetails?.Vendor_SAP_Code
    })) || []

  const pdfTableData = pdfData?.map((item) => ({
    id: item?.ID,
    creditNoteNo: item?.InvNo,
    vendor_name: item?.vendorDetails?.Vendor_Name_EN || 'N/A',
    vendor_code: item?.vendorDetails?.Vendor_SAP_Code || 'N/A',
    date: item?.InvDt ? dayjs(item.InvDt).utc().format('DD/MM/YYYY') : 'N/A',
    currency: item?.InvCurr || 'N/A',
    value: isNaN(item?.InvAmt) ? 'N/A' : formatUSDNumber(item?.InvAmt),
    status: item?.status?.Status_classification || 'N/A'
  }))

  const headers = [
    {
      key: 'creditNoteNo',
      label: t('creditNoteNo'),
      sortable: true,
      sortKey: 'InvNo'
    },
    ...(userType === VENDOR_USER_TYPE
      ? []
      : [
          {
            key: 'vendor_name',
            label: t('vendors:vendorName'),
            sortable: true,
            sortKey: 'Vendor_Name_EN'
          },
          {
            key: 'vendor_code',
            label: t('vendors:vendorCode'),
            sortable: true,
            sortKey: 'Vendor_SAP_Code'
          }
        ]),
    {
      key: 'date',
      label: t('logistics_invoice:date'),
      sortable: true,
      sortKey: 'InvDt'
    },
    {
      key: 'currency',
      label: t('currency.text'),
      sortable: true,
      sortKey: 'InvCurr'
    },
    {
      key: 'value',
      label: t('purchase_order:amount'),
      sortable: true,
      sortKey: 'InvAmt'
    },
    {
      key: 'status',
      label: t('status.text'),
      sortable: true,
      sortKey: 'Invoice_Status_Id'
    }
  ]
  const headerLabels = headers.map((h) => h.label)
  return (
    <LeftPageContainer>
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('popup:emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      {requestSuccessPopup && (
        <SuccessPopup
          close={false}
          open={requestSuccessPopup}
          successMsg={t('popup:creditNoteRequestSuccess')}
          onClose={() => setRequestSuccessPopup(false)}
          modalStyles={{ maxWidth: '500px', width: '100%' }}
        />
      )}

      <div className={styles.poContainer}>
        <HeaderBar
          title={t('creditNoteList')}
          slug={`${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t(
            'creditNoteList'
          )}`}>
          {userType === VENDOR_USER_TYPE && selectedRows?.length > 0 && (
            <NormalButton
              label={t('po_based_report:delete')}
              rejectBtn
              customClass="px-3"
              // leftIcon={invoiceIcon}
              onClick={() => setConfirmDeletePopup(true)}
            />
          )}

          {(userType == VENDOR_USER_TYPE || userType === ADMIN_USER_TYPE) && (
            <div>
              <NormalButton
                label={t('createNewCreditNote.text')}
                isPrimary
                customClass="px-3"
                leftIcon={addIcon}
                onClick={handleCreateInvoice}
              />
            </div>
          )}
          {userType === BUSINESS_USER_TYPE && (
            <div>
              <NormalButton
                label={t('requestForCreditNote')}
                isPrimary
                customClass="px-3"
                leftIcon={addIcon}
                onClick={() => setIsRequestCredit(true)}
              />
            </div>
          )}

          {/* )} */}
          <div>
            <TooltipWrapper tooltipMessage={t('emailReport')}>
              <UtilIconFaq
                style={{ marginLeft: 0 }}
                name="emailReport"
                onClick={!isDataEmpty ? handleEmailReport : undefined}
                className={isDataEmpty ? styles.disabledIcon : ''}
              />
            </TooltipWrapper>
            <TooltipWrapper tooltipMessage={t('downloadReport')}>
              <UtilIconFaq
                style={{ marginLeft: 0 }}
                name="download2"
                onClick={!isDataEmpty ? handleDownload : undefined}
                className={isDataEmpty ? styles.disabledIcon : ''}
              />
            </TooltipWrapper>
            <TooltipWrapper tooltipMessage={t('help')}>
              <UtilIconFaq
                style={{ marginLeft: 0 }}
                name="help"
                onClick={handleRedirectClick}
                className={styles.disabledIcon}
              />
            </TooltipWrapper>
          </div>
        </HeaderBar>
      </div>

      {/* Filters */}
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className={styles.tableHeaderContainer}>
          <SearchInput
            placeholder={
              userType === VENDOR_USER_TYPE ? t('searchCreditNoteNo') : t('searchCreditNote')
            }
            onChange={(value) => handleSearchValue(value)}
          />
          <div className="d-flex gap-4 items-center">
            <TableHeaderDropdown className="flex items-center">
              <label className="dateLabel">{t('selectDate')}</label>
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
              isCurrency
              label={t('currency.text')}
              options={currencyOptions}
              onFilterChange={handleFilterChange}
              placeholder={t('vendors:all')}
              paramName="currency"
              value={filters.currency}
            />

            <TableSelectBox
              label={t('status.text')}
              options={statusOptions}
              isCurrency
              onFilterChange={handleFilterChange}
              placeholder={t('vendors:all')}
              paramName="status"
              value={filters.status}
            />
          </div>
        </div>
        <TableLayout
          className="credit-note-list-table"
          selectedRows={selectedRows}
          tableHeaders={headers}
          tableData={tableData}
          {...tableProps}
          handleRedirectUrl={handleRedirectUrl}
          checkboxRequired={userType === VENDOR_USER_TYPE}
          onSelectionChange={(rows) => setSelectedRows(rows)}
        />
      </div>

      <EmailReportComp
        open={emailReportState}
        onClose={handleClosePopup}
        onSend={handleSendEmailReport}
        setValue={setEmailReportDateRange}
        value={emailReportDateRange}
        disable={true}
      />
      <DownloadReportComp
        open={downloadReport}
        onClose={handleCloseDownload}
        title={t('creditNotesPDFTitle')}
        hideDatePicker={true}
        onClickSubmit={handleCsvDownload}
        pdfComponent={
          <CreditNotePDF data={pdfTableData} headerLabels={headerLabels} userType={userType} />
        }
        NewTableComp={<TableLayout tableHeaders={headers} tableData={tableData} {...tableProps} />}
      />

      {isRequestCredit ? (
        <Suspense fallback={<div>Loading...</div>}>
          <CustomModal
            closeIcon
            open={isRequestCredit}
            title={t('requestForCreditNote')}
            onClose={() => setIsRequestCredit(false)}>
            <RequestCredit
              setRequestSuccessPopup={setRequestSuccessPopup}
              setIsRequestCredit={setIsRequestCredit}
            />
          </CustomModal>
        </Suspense>
      ) : null}

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

// Map actions to props
const mapDispatchToProps = { showToast }

export default connect(mapStateToProps, mapDispatchToProps)(CreditNoteComp)

// Helper function for file downloads
function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(new Blob([blob]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
