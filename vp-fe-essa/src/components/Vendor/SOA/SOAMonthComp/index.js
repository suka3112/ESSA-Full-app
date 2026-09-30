import '../../SOA/style.scss'
import { useState, useEffect, startTransition, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import SearchInput from 'components/Common/SearchInput'
import { TableHeaderDropdown } from 'components/Common/TableComponent/TableComponent.style'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { connect } from 'react-redux'
import { updateSOA, emailSOA, listSOAByMonth } from 'api/SOA'
import { ActionUtilIcon, UtilIcon, UtilIconFaq } from '../../../Common/UtilIcon'
import helpIcon from '../../../../assets/icons/helpIcon.svg'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import { useTranslation } from 'react-i18next'
import { generateCsv, getEntityId } from 'services/utilities'
import useTableFeatures from 'hooks/useTableFeatures'
import { fetchCurrencies } from 'api/UserRegister'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { setSoaList } from '../../../../redux/actions/soaActions'
import { cardAddIcon, downloadIcon2, editIcon, emailReport } from 'constants/imageConstants'
import SuccessPopup from 'components/Common/SuccessPopup'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import SoaHistoryPDF from 'components/PDF/SoaPDF'
import { CREATE_CREDIT_NOTE, FAQS, INVOICE_PO_BASED } from 'constants/url'
import CustomModal from 'components/Common/Modal'
import EmailReportComp from 'components/Vendor/EmailReport'
import { showToast } from 'redux/actions/toastActions'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'

const SOAMonthComp = ({ userInfo: { userType }, soa, setSoaList, showToast }) => {
  const navigate = useNavigate()
  const [isCreatingSOA] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { t, i18n } = useTranslation([
    'soa',
    'purchase_order',
    'vendors',
    'sidebar',
    'toast',
    'credit_notes'
  ])
  const [filterDateRange, setFilterDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [downloadDateRange, setDownloadDateRange] = useState([null, null])
  const [downloadReport, setDownloadReport] = useState(false)
  const location = useLocation()
  const headerParams = new URLSearchParams(location.search)
  const startDate = headerParams.get('startDate')
  const endDate = headerParams.get('endDate')
  const month = headerParams.get('month')
  const year = headerParams.get('year')
  const [filters, setFilters] = useState({
    search: '',
    startDate: null,
    endDate: null,
    month: '',
    year: '',
    reconciliation_status: 'All',
    currency: 'All'
  })

  const [currencyOptions, setCurrencyOptions] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [invoiceValue, setInvoiceValue] = useState({})
  const isArabic = i18n.language === 'ar'
  const isDataEmpty = soa?.soaList?.result?.results?.length === 0
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

  const [editRowId, setEditRowId] = useState(null)
  const [editData, setEditData] = useState({})
  const [showTypePopup, setShowTypePopup] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [currentRow, setCurrentRow] = useState(null)

  const mismatchComments = [
    'Currency is mismatch',
    'Invoice date is mismatch',
    'Amount is mismatch',
    'Due date is mismatch'
  ]

  const invoiceNotFoundComments = [
    'Invoice not found in vendor SOA',
    'Invoice not found In Daikin SOA'
  ]
  useEffect(() => {
    fetchDropdownData()
  }, [i18n.language])

  useEffect(() => {
    fetchSOAData()
  }, [filters, page, rowsPerPage, search, order, orderBy])

  const fetchSOAData = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      ...filters,
      search: search.trim(),
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy,
      startDate: startDate,
      endDate: endDate
    }

    // Clean up empty or null values
    Object.keys(query).forEach((key) => {
      if (
        query[key] === null ||
        query[key] === undefined ||
        query[key] === '' ||
        query[key] === 'All' ||
        (typeof query[key] === 'string' && query[key].length === 0)
      ) {
        delete query[key]
      }
    })

    listSOAByMonth(query)
      .then((res) => {
        setSoaList(res?.data?.data)
        setPageMeta(res?.data?.data?.result?.pageMeta)

        if (res.data.data.invoice_value) {
          setInvoiceValue(res.data.data.invoice_value)
        } else {
          setInvoiceValue({})
        }
      })
      .catch((err) => {
        console.error('Error fetching SOA data:', err)
        toast.error(t('failedToLoadSOA'))
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const fetchDropdownData = () => {
    Promise.all([fetchCurrencies()])
      .then(([currenciesRes]) => {
        const currencyList = Array.isArray(currenciesRes.data.data) ? currenciesRes.data.data : []
        const formattedCurrencies = [
          { label: t('vendors:all'), value: 'All' },
          ...currencyList.map((item) => ({
            label: `${item?.name} (${item?.code})`,
            value: item.code
          }))
        ]

        setCurrencyOptions(formattedCurrencies)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }

  // Handle start editing
  const handleStartEdit = (row) => {
    setEditRowId(row.id)
    setEditData({
      invoiceCreditNoteNo: row.invoiceCreditNoteNo,
      invoiceCreditNoteDate: row.invoiceCreditNoteDate,
      currency: row.currency,
      amountPerCurrency: row.amountPerCurrency,
      dueDate: row.dueDate
    })
  }

  // Handle change for editable fields
  const handleEditChange = (key, value) => {
    setEditData((prev) => ({ ...prev, [key]: value }))
  }

  // Handle save edit
  const handleSaveEdit = () => {
    const payload = {
      ID: editRowId,
      Amount: parseFloat(editData.amountPerCurrency),
      Curr: editData.currency,
      DocDate: dayjs(editData.invoiceCreditNoteDate, 'DD/MM/YYYY').format('YYYY-MM-DD'),
      DueDate: dayjs(editData.dueDate, 'DD/MM/YYYY').format('YYYY-MM-DD'),
      newSOA: false
    }

    updateSOA(payload)
      .then(() => {
        showToast(t('toast:successTitle'), t('detailsUpdatedSuccess'), 'success')
        setEditRowId(null)
        fetchSOAData()
      })
      .catch((err) => {
        console.error('Error updating row:', err)
        toast.error(t('failedToUpdateRow'))
        // showToast(t('toast:errorTitle'), t('failedToUpdateRow'), 'error')
      })
  }

  const invoiceTypeOptions = [
    { label: t('credit_notes:poBasedInvoiceHeader.text'), value: 'PO Based Invoice' },
    { label: t('nonPOBasedInvoice'), value: 'Non - PO Based Invoice' },
    { label: t('sidebar:logisticsInvoice'), value: 'Logistics Invoice' },
    { label: t('sidebar:creditNote'), value: 'Credit Note' }
  ]

  const handleTypeSubmit = () => {
    if (!selectedType || !currentRow?.invoiceCreditNoteNo) {
      toast.error(t('selectValidType'))
      return
    }

    const rowId = currentRow.invoiceCreditNoteNo

    const routeMap = {
      'PO Based Invoice': `/${userType}${INVOICE_PO_BASED}`,
      'Non - PO Based Invoice': `/${userType}/invoice-processing/non-po-based/invoice?soa=${rowId}`,
      'Logistics Invoice': `/${userType}/invoice-processing/logistics/new`,
      'Credit Note': `/${userType}${CREATE_CREDIT_NOTE}?soa=${rowId}`
    }

    const path = routeMap[selectedType]

    if (!path) {
      toast.error(t('selectValidType'))
      return
    }

    navigate(path)
    setShowTypePopup(false)
    setIsModalOpen(false)
  }

  const statusOptions = [
    { label: t('vendors:all'), value: 'All' },
    { label: t('reconciled'), value: '0' },
    { label: t('mismatched'), value: '1' }
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
      setFilters((prev) => ({
        ...prev,
        created_by: value === 'All' ? '' : value
      }))
    } else if (key === 'reconciliation_status') {
      setFilters((prev) => ({
        ...prev,
        reconciliation_status: value === 'All' ? '' : value
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
      format: 'csv',
      ...filters,
      search: search.trim(),
      startDate: startDate,
      endDate: endDate
    }

    // Clean up empty or null values
    Object.keys(query).forEach((key) => {
      if (
        query[key] === null ||
        query[key] === undefined ||
        query[key] === '' ||
        query[key] === 'All' ||
        (typeof query[key] === 'string' && query[key].length === 0)
      ) {
        delete query[key]
      }
    })

    if (downloadDateRange && downloadDateRange[0] && downloadDateRange[1]) {
      query.startDate = downloadDateRange[0].format('YYYY-MM-DD')
      query.endDate = downloadDateRange[1].format('YYYY-MM-DD')
    }

    generateCsv(`${process.env.REACT_APP_DEFAULT_API_BASE_URL}/SOA/soaListing/export`, 'SOA.csv', {
      ...query,
      isArabic: isArabic ? true : false
    }).then(() => {
      handleCloseDownload()
    })
  }

  const handleSendEmailReport = () => {
    const APIdata = soa?.soaList?.result?.results || []

    if (APIdata.length === 0) {
      toast.error(t('toast:noDataToExport'))
      return
    }

    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      format: 'csv',
      isArabic: isArabic ? true : false,
      startDate: startDate,
      endDate: endDate
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    emailSOA(query)
      .then(() => {
        setEmailSuccessPopup(true)
        // handleClosePopup()
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=6`)
  }

  const SoaMonthHeaders = [
    { key: 'type', label: t('type'), sortable: true, sortKey: 'Category' },
    {
      key: 'invoiceCreditNoteNo',
      label: t('vendorInvoiceCreditNoteNo.text'),
      sortable: true,
      sortKey: 'DocNo'
    },
    {
      key: 'invoiceCreditNoteDate',
      label: t('invoiceCreditNoteDate.text'),
      sortable: true,
      sortKey: 'DocDate',
      render: (value, row) =>
        editRowId === row.id ? (
          <input
            value={editData.invoiceCreditNoteDate}
            onChange={(e) => handleEditChange('invoiceCreditNoteDate', e.target.value)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #ccc',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '0.9rem',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        ) : (
          value
        )
    },
    ...(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE
      ? [
          {
            key: 'vendorName',
            label: t('vendors:vendorName'),
            sortable: true,
            sortKey: 'Vendor_Name_EN'
          }
        ]
      : []),

    ...(userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE
      ? [
          {
            key: 'vendor_Code',
            label: t('vendors:vendorCode'),
            sortable: true,
            sortKey: 'Vendor_SAP_Code'
          }
        ]
      : []),
    {
      key: 'currency',
      label: t('invoiceCurrency.text'),
      sortable: true,
      sortKey: 'Curr',
      render: (value, row) =>
        editRowId === row.id ? (
          <input
            value={editData.currency}
            onChange={(e) => handleEditChange('currency', e.target.value)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #ccc',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '0.9rem',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        ) : (
          value
        )
    },

    {
      key: 'amountPerCurrency',
      label: t('amountPerCurrency.text'),
      sortable: true,
      sortKey: 'Amount',
      render: (value, row) =>
        editRowId === row.id ? (
          <input
            value={editData.amountPerCurrency}
            onChange={(e) => handleEditChange('amountPerCurrency', e.target.value)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #ccc',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '0.9rem',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        ) : (
          value
        )
    },
    {
      key: 'dueDate',
      label: t('dueDate.text'),
      sortable: true,
      sortKey: 'DueDate',
      render: (value, row) =>
        editRowId === row.id ? (
          <input
            value={editData.dueDate}
            onChange={(e) => handleEditChange('dueDate', e.target.value)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #ccc',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '0.9rem',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        ) : (
          value
        )
    },
    {
      key: 'status',
      label: t('reconciliationStatus.text'),
      sortable: true,
      sortKey: 'ReconStatus'
    },
    {
      key: 'reconciliationComments',
      label: t('reconciliationComments.text'),
      sortable: true,
      sortKey: 'ReconDetails',
      render: (value, row) => (row.statusText === 'Reconciled' ? '' : value || '-')
    },
    {
      key: 'action',
      label: t('actions'),
      render: (_, row) => {
        if (row.statusText === 'Mismatched') {
          if (invoiceNotFoundComments.includes(row.reconciliationComments)) {
            return (
              <ActionUtilIcon
                src={cardAddIcon}
                alt="Document icon"
                onClick={() => {
                  setSelectedType('')
                  setCurrentRow(row)
                  setIsModalOpen(true)
                }}
                style={{ cursor: 'pointer' }}
              />
            )
          } else if (
            mismatchComments.some(
              (comment) =>
                row.reconciliationComments
                  ?.split(',') // break into ["Currency is mismatch", " Amount is mismatch"]
                  .map((c) => c.trim())
                  .includes(comment) // check against mismatchComments list
            )
          ) {
            if (editRowId === row.id) {
              return (
                <button
                  onClick={handleSaveEdit}
                  style={{ background: 'transparent', cursor: 'pointer', color: '#017EBD' }}>
                  Save
                </button>
              )
            } else {
              return (
                <ActionUtilIcon
                  src={editIcon}
                  alt="Edit icon"
                  onClick={() => handleStartEdit(row)}
                  style={{ cursor: 'pointer' }}
                />
              )
            }
          }
        }

        return null
      }
    }
  ]

  const headerLabels = SoaMonthHeaders.map((h) => h.label)
  const headersWithoutActions = SoaMonthHeaders.filter((header) => header.key !== 'action')

  const APIdata = soa?.soaList?.result?.results || []

  const tableData = APIdata?.map((item) => {
    const statusText =
      item?.ReconStatus === 'RECONCILED'
        ? 'Reconciled'
        : item?.ReconStatus === 'MISMATCH'
        ? 'Mismatched'
        : 'N/A'

    const statusColorMap = {
      Reconciled: '#017EBD', // blue
      Mismatched: '#E22323', // red
      'N/A': '#A5A5A5'
    }

    return {
      ...item,
      id: item?.ID,
      type: item?.Category || '--',
      invoiceCreditNoteNo: item?.Reference,
      vendorName: item?.Vendor?.Vendor_Name_EN || '--',
      vendor_Code: item?.Vendor_Code || '--',
      currency: item?.Curr,
      invoiceCreditNoteDate: item?.Document_Date
        ? dayjs(item?.Document_Date)?.format('DD/MM/YYYY')
        : '',
      amountPerCurrency: isNaN(item.Amount)
        ? '0.00'
        : Number(item.Amount).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      dueDate: item?.Due_Date ? dayjs(item?.Due_Date)?.format('DD/MM/YYYY') : '',
      statusText: statusText,
      status: statusText,
      reconciliationComments: item?.ReconDetails || ''
    }
  })

  return (
    <>
      <LeftPageContainer className="soa-container">
        {emailSuccessPopup && (
          <SuccessPopup
            open={emailSuccessPopup}
            successMsg={t('popup:emailReportSuccess')}
            onClose={() => setEmailSuccessPopup(false)}
          />
        )}
        <HeaderBar
          title={isCreatingSOA ? 'Create SOA' : `${t('sidebar:soa')} - ${month} ${year}`}
          slug={`${t('sidebar:home')} / ${t('sidebar:soa')} / ${month} ${year}`}>
          <>
            <TooltipWrapper tooltipMessage={t('emailReport.text')}>
              <UtilIconFaq
                name="emailReport"
                onClick={!isDataEmpty ? handleSendEmailReport : undefined}
                style={{
                  marginRight: '0px',
                  opacity: isDataEmpty ? 0.4 : 1,
                  cursor: isDataEmpty ? 'not-allowed' : 'pointer'
                }}
              />
            </TooltipWrapper>
            <TooltipWrapper tooltipMessage={t('downloadReport.text')}>
              <UtilIconFaq
                onClick={!isDataEmpty ? handleDownload : undefined}
                name="download2"
                style={{
                  marginRight: '0px',
                  opacity: isDataEmpty ? 0.4 : 1,
                  cursor: isDataEmpty ? 'not-allowed' : 'pointer'
                }}
              />
            </TooltipWrapper>
            {userType === VENDOR_USER_TYPE && (
              <TooltipWrapper tooltipMessage={t('soa:help')}>
                <UtilIconFaq
                  name="help"
                  alt="help"
                  disabled={isLoading}
                  onClick={handleRedirectClick}
                />
              </TooltipWrapper>
            )}
          </>
        </HeaderBar>

        <div className="bg-white table-border overflow-hidden rounded-lg">
          <div className="tableHeaderContainer">
            <SearchInput
              placeholder={t('searchInvoiceforVendor')}
              onChange={(value) => handleSearchValue(value)}
            />
            <div className="d-flex gap-4">
              <TableHeaderDropdown className="soa-select">
                <TableSelectBox
                  label={t('vendors:status')}
                  options={statusOptions}
                  onFilterChange={(selected) => {
                    handleFilterChange({ reconciliation_status: selected.status })
                  }}
                  value={filters.reconciliation_status}
                  width="145px"
                  paramName="status"
                />
              </TableHeaderDropdown>

              <TableHeaderDropdown className="soa-select">
                <TableSelectBox
                  label={t('purchase_order:currency.text')}
                  options={currencyOptions}
                  isCurrency
                  onFilterChange={handleFilterChange}
                  value={filters.currency}
                  width="145px"
                  paramName="currency"
                />
              </TableHeaderDropdown>
            </div>
          </div>
          {/* )} */}
          <TableLayout
            tableHeaders={SoaMonthHeaders}
            tableData={tableData}
            {...tableProps}
            soaData={invoiceValue}
            emptyMessage={t('noSOADataAvailable')}
          />
        </div>

        <DownloadReportComp
          value={downloadDateRange}
          hideDatePicker
          setValue={(dates) => {
            handleFilterChange({ date_range_download: dates })
          }}
          open={downloadReport}
          onClose={handleCloseDownload}
          title={t('soaHistoryPDFTitle')}
          pdfComponent={
            <SoaHistoryPDF data={tableData} headerLabels={headerLabels} userType={userType} />
          }
          onClickSubmit={handleDownloadSubmit}
          NewTableComp={
            <TableLayout
              showPagination={false}
              checkboxRequired={false}
              tableHeaders={headersWithoutActions}
              tableData={tableData}
              {...tableProps}
            />
          }
        />
      </LeftPageContainer>
      <CustomModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        closeIcon
        modalStyles={{ width: '35%' }}>
        <div className="invoice-type-modal">
          <h5 className="modal-title">
            {t('selectInvoiceType')} <span className="required">*</span>
          </h5>

          {/* <div className="type-options">
            {['PO Based Invoice', 'Non - PO Based Invoice', 'Logistics Invoice', 'Credit Note'].map(
              (type) => (
                <label
                  key={type}
                  className={`type-option ${selectedType === type ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={selectedType === type}
                    onChange={(e) => setSelectedType(e.target.value)}
                  />
                  <span className="custom-square" />
                  {type}
                </label>
              )
            )}
          </div> */}

          <div className="type-options">
            {invoiceTypeOptions.map((item) => (
              <label
                key={item.value}
                className={`type-option ${selectedType === item.value ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="type"
                  value={item.value}
                  checked={selectedType === item.value}
                  onChange={(e) => setSelectedType(e.target.value)}
                />
                <span className="custom-square" />
                {item.label} {/* Only this is translated */}
              </label>
            ))}
          </div>

          <div className="submit-wrapper">
            <button
              onClick={handleTypeSubmit}
              disabled={!selectedType}
              className={`submit-btn ${selectedType ? 'active' : 'disabled'}`}>
              {t('credit_notes:submit.text')}
            </button>
          </div>
        </div>
      </CustomModal>
    </>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
  soa: state.soa
})

const mapDispatchToProps = (dispatch) => ({
  setSoaList: (payload) => dispatch(setSoaList(payload)),
  showToast: (title, message, type) => dispatch(showToast(title, message, type))
})

export default connect(mapStateToProps, mapDispatchToProps)(SOAMonthComp)
