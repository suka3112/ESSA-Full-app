import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './POBasedList.module.scss'
import invoiceIcon from '../../../../../assets/icons/invoiceIcon.svg'
import { TableHeaderDropdown } from 'components/Common/TableComponent/TableComponent.style'
import EmailReportComp from 'components/Vendor/EmailReport'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import DateRangePicker from 'components/Common/DateRangePicker1'
import SearchInput from 'components/Common/SearchInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { HeaderBar } from 'components/Common/HeaderBar'
import { NormalButton } from 'components/Common/NormalButton'
import { UtilIconFaq } from '../../../../Common/UtilIcon'
import { connect } from 'react-redux'
import { ADMIN_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import { FAQS, PURCHASE_ORDER } from 'constants/url'
import { useTranslation } from 'react-i18next'
import { deleteDraftInvoice, emailPOInvoiceDetailsReport } from 'api/POBased'
import dayjs from 'dayjs'
import { downloadFile, getEntityId } from 'services/utilities'
import SuccessPopup from 'components/Common/SuccessPopup'
import { invoiceListing } from 'api/PurchaseOrder'
import { getCRPersons } from 'api/MyProfile'
import { fetchCurrencies } from 'api/UserRegister'
import POBasedTablePDF from 'components/PDF/POBasedTablePDF'
import useTableFeatures from 'hooks/useTableFeatures'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { useSearchParams } from 'react-router-dom'
import utc from 'dayjs/plugin/utc'
import { toast } from 'react-toastify'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import { showToast } from 'redux/actions/toastActions'
import CustomModal from 'components/Common/Modal'
dayjs.extend(utc)

const POBasedListComp = ({ userInfo: { userType }, showToast }) => {
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
    'extension',
    'non_po_based_report',
    'toast',
    'dashboard'
  ])
  const isArabic = i18n.language === 'ar'
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') === 'dashboard'
  const sourceType = searchParams.get('type') === 'pendingInvoices'

  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [emailReportState, setEmailReportState] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)
  const [listData, setListData] = useState([])
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [crPersonsOptions, setCrPersonsOptions] = useState([])
  const [poDownloadList, setPoDownloadList] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [confirmDeletePopup, setConfirmDeletePopup] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  const [filterDateRange, setFilterDateRange] = useState([null, null])
  const [emailReportDateRange, setEmailReportDateRange] = useState([null, null])
  const [filters, setFilters] = useState({
    search: '',
    startDate: null,
    endDate: null,
    currency: 'All',
    sort_column: '',
    sort: '',
    status: ''
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

  const isDataEmpty = listData.length === 0

  useEffect(() => {
    fetchPOBasedList()
    if (downloadReport) {
      getPDFData()
    }
  }, [filters, page, rowsPerPage, search, order, orderBy, downloadReport])

  useEffect(() => {
    fetchDropdownData()
  }, [i18n.language])

  const fetchPOBasedList = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
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

    invoiceListing(query)
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
      entity_id: getEntityId(),
      category: 1, //PO based
      ...filters,
      search: search.trim(),
      page: 1,
      limit: 1000,
      sort_column: orderBy,
      sort: order
    }
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })
    invoiceListing(query)
      .then((res) => {
        setPoDownloadList(res?.data?.data?.results || [])
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
          { label: t('vendors:all'), value: 'All' },
          ...currencyList
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name
            .map((item) => ({
              label: `${item?.name} (${item?.code})`,
              value: item.code
            }))
        ]

        const crPersonsOptions = [
          { label: t('vendors:all'), value: 'All' },
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
        startDate: value[0]?.format('YYYY-MM-DD'),
        endDate: value[1]?.format('YYYY-MM-DD') || value[0]?.format('YYYY-MM-DD')
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

  const handleCreateInvoice = () => {
    navigate(`/${userType}${PURCHASE_ORDER}?poStatus=Open`)
  }

  const handleBulkDelete = () => {
    // Logic for bulk delete
    const updatedId = formattedData
      .filter((row) => selectedRows.includes(row.invoiceNo))
      .map((row) => row.id)

    let body = {
      invoiceIds: updatedId
    }

    setIsDeleteLoading(true)

    deleteDraftInvoice(body)
      .then((res) => {
        showToast(t('toast:successTitle'), t('bulkDeleteSuccessfully'), 'success')
        setIsDeleteLoading(false)
        setConfirmDeletePopup(false)
        fetchPOBasedList()
        getPDFData()
        setSelectedRows([])
      })
      .catch((err) => {
        console.error(err)
        toast.error(err?.response?.data?.message)
      })
  }

  const downloadCSV = () => {
    const query = {
      entity_id: getEntityId(),
      format: 'csv',
      mode: 'report',
      startDate: filterDateRange[0] ? filterDateRange[0]?.format('YYYY-MM-DD') : null,
      endDate: filterDateRange[1] ? filterDateRange[1]?.format('YYYY-MM-DD') : null,
      category: 1,
      isArabic: isArabic ? true : false,
      ...filters,
      search: search.trim()
    }
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })
    emailPOInvoiceDetailsReport(query)
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
    const query = {
      startDate: emailReportDateRange[0] ? emailReportDateRange[0].format('YYYY-MM-DD') : null,
      endDate: emailReportDateRange[1] ? emailReportDateRange[1].format('YYYY-MM-DD') : null,
      entity_id: getEntityId(),
      category: 1,
      format: 'csv',
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
  const onClickViewInvoice = async (data) => {
    navigate(`/${userType}/invoice-processing/po-based-invoice/view?id=${data?.id}`)
  }
  const headers = [
    ...(source && sourceType ? [{ key: 'typeOfInvoice', label: 'Type of Invoice' }] : []),
    {
      key: 'invoiceNo',
      label: t('logistics_invoice:invoiceNo') + '.',
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
    ...(source && sourceType
      ? [{ key: 'refNo', label: 'Reference No.', sortable: true, sortKey: 'Ref_No' }]
      : []),
    { key: 'date', label: t('po_based_invoices:date'), sortable: true, sortKey: 'Submitted_Date' },
    { key: 'currency', label: t('currency.text'), sortable: true, sortKey: 'InvCurr' },
    {
      key: 'invoiceValue',
      label: t('po_based_invoices:amount'),
      sortable: true,
      sortKey: 'InvAmt'
    },
    {
      key: 'invoiceDueDate',
      label: t('non_po_based_report:invoiceDueDate.text'),
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
    { label: capitalize(t('vendors:draft')), value: 7 },
    { label: capitalize(t('vendors:submittedForReview')), value: 1 },
    { label: capitalize(t('vendors:underReview')), value: 2 },
    { label: capitalize(t('extension:approved')), value: 4 },
    { label: capitalize(t('extension:rejected')), value: 5 },
    { label: capitalize(t('dashboard:paid')), value: 6 }
  ]

  const filteredStatusOptions = source
    ? statusOptions.filter((opt) => [7, 1, 2, ''].includes(opt.value))
    : statusOptions

  const formattedData = listData?.map((item) => ({
    typeOfInvoice: item?.Inv_Type,
    disableCheckbox:
      userType === VENDOR_USER_TYPE && item?.status?.Status_classification === 'Draft'
        ? false
        : true,
    invoiceNo: item?.InvNo,
    refNo: item?.Ref_No,
    date: item?.Submitted_Date ? dayjs(item.Submitted_Date).utc().format('DD/MM/YYYY') : '',
    currency: item?.InvCurr,
    invoiceValue:
      item?.InvAmt !== undefined && item?.InvAmt !== null && !isNaN(item.InvAmt)
        ? Number(item.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })
        : '0.00',
    invoiceDueDate: item?.Invoice_Due_Date
      ? dayjs(item?.Invoice_Due_Date)?.utc().format('DD/MM/YYYY')
      : '',
    createdBy: item?.createdBy,
    status: item?.status?.Status_classification,
    vendor_code: item?.vendorDetails?.Vendor_SAP_Code,
    vendor_name: item?.vendorDetails?.Vendor_Name_EN,
    id: item?.ID
  }))

  const pdfTableData = poDownloadList?.map((item) => ({
    invoiceNo: item?.InvNo,
    date: item?.Submitted_Date ? dayjs(item.Submitted_Date).utc().format('DD/MM/YYYY') : '',
    currency: item?.InvCurr,
    invoiceValue: item?.InvAmt?.toLocaleString(),
    invoiceDueDate: item?.Invoice_Due_Date
      ? dayjs(item?.Invoice_Due_Date)?.utc().format('DD/MM/YYYY')
      : '',
    status: item?.status?.Status_classification || ''
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
          title={
            source && sourceType
              ? t('pendingInvoicesReport')
              : `${t('sidebar:invoiceProcessing')} - ${t('sidebar:poBased')}`
          }
          slug={
            source && sourceType
              ? `${t('sidebar:home')}/ Dashboard/ Pending Invoices`
              : `${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t('sidebar:poBased')}`
          }>
          {userType === VENDOR_USER_TYPE && selectedRows?.length > 0 && (
            <NormalButton
              label={t('delete')}
              rejectBtn
              customClass="px-3"
              // leftIcon={invoiceIcon}
              onClick={() => setConfirmDeletePopup(true)}
            />
          )}
          {(userType === VENDOR_USER_TYPE || userType === ADMIN_USER_TYPE) && (
            <NormalButton
              label={t('purchase_order:createInvoice')}
              isPrimary
              customClass="px-2"
              leftIcon={invoiceIcon}
              onClick={handleCreateInvoice}
            />
          )}

          <div style={{ display: 'flex', marginRight: '0' }}>
            <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.text')}>
              <UtilIconFaq
                name="emailReport"
                onClick={
                  !isDataEmpty
                    ? () => {
                        getPDFData()
                        setEmailReportState(true)
                      }
                    : undefined
                }
                className={isDataEmpty ? styles.disabledIcon : ''}
              />
            </TooltipWrapper>
            <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
              <UtilIconFaq
                name="download2"
                onClick={!isDataEmpty ? () => setDownloadReport(true) : undefined}
                className={isDataEmpty ? styles.disabledIcon : ''}
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
      <div className="bg-white table-border overflow-hidden rounded-lg overflow-hidden">
        <div className={styles.tableHeaderContainer}>
          <SearchInput
            placeholder={
              source && sourceType
                ? t('po_based_invoices:searchForInvoiceSource')
                : userType === VENDOR_USER_TYPE
                  ? t('po_based_invoices:searchForInvoiceNo')
                  : t('po_based_invoices:searchInvoiceVendorNo')
            }
            showDropdown={false}
            onChange={(value) => handleSearchValue(value)}
          />
          <div className="d-flex gap-4 items-center">
            <TableHeaderDropdown className="flex items-center">
              <label className={styles.dateLabel}>{t('soa:dueDate.text')}</label>
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
              value={filters.currency}
              paramName="currency"
              placeholder={t('vendors:all')}
            />
            <TableSelectBox
              label={t('po_based_invoices:status')}
              options={filteredStatusOptions}
              onFilterChange={handleFilterChange}
              value={filters.status}
              isCurrency
              placeholder={t('vendors:all')}
              paramName="status"
            />
          </div>
        </div>
        <TableLayout
          selectedRows={selectedRows}
          tableHeaders={headers}
          tableData={formattedData}
          handleRedirectUrl={onClickViewInvoice}
          checkboxRequired={userType === VENDOR_USER_TYPE}
          onSelectionChange={(rows) => setSelectedRows(rows)}
          {...tableProps}
          className="po-based-listing-table"
        />
      </div>
      <EmailReportComp
        onClose={() => setEmailReportState(false)}
        value={emailReportDateRange}
        setValue={setEmailReportDateRange}
        open={emailReportState}
        onSend={handleSendEmailReport}
        disable={true}
      />
      <DownloadReportComp
        headers={headers}
        tableData={formattedData}
        open={downloadReport}
        hideDatePicker={true}
        onClose={() => setDownloadReport(false)}
        title={t('POBasedPDFTitle')}
        onClickSubmit={downloadCSV}
        NewTableComp={
          <TableLayout
            tableHeaders={headers}
            tableData={formattedData}
            handleRedirectUrl={onClickViewInvoice}
            {...tableProps}
          />
        }
        pdfComponent={<POBasedTablePDF data={pdfTableData} headerLabels={headerLabels} />}
      />
      <CustomModal
        open={confirmDeletePopup}
        onClose={() => setConfirmDeletePopup(false)}
        modalStyles={{ width: 400 }}
        closeIcon
        header={t('popup:confirmSubmission')}
        //title={'Confirm Submission'}
        description={t('confirmDeleteMessage')}>
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

export default connect(mapStateToProps, mapDispatchToProps)(POBasedListComp)
