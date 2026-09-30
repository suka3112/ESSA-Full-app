import './style.scss'
import helpIcon from '../../../assets/icons/helpIcon.svg'
import downloadIcon from '../../../assets/icons/downloadIcon.svg'
import { NormalButton } from 'components/Common/NormalButton'
import React, { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import SearchInput from 'components/Common/SearchInput'
import { TableHeaderDropdown } from 'components/Common/TableComponent/TableComponent.style'
import DateRangePicker from 'components/Common/DateRangePicker1'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { connect } from 'react-redux'
import { ActionUtilIcon, UtilIcon, UtilIconFaq } from '../../Common/UtilIcon'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { CREATE_CREDIT_NOTE, FAQS, INVOICE_PO_BASED, SOA_HISTORY } from 'constants/url'
import { useTranslation } from 'react-i18next'
import { uploadSOA, listSOA, updateSOA, emailSOAListPage } from 'api/SOA'
import { setSoaList } from '../../../redux/actions/soaActions'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import useTableFeatures from 'hooks/useTableFeatures'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { generateCsv, getEntityId } from 'services/utilities'
import { fetchCurrencies } from 'api/UserRegister'
import { useSearchParams } from 'react-router-dom'
import utc from 'dayjs/plugin/utc'
import { cardAddIcon, downloadIcon2, editIcon, emailReport } from 'constants/imageConstants'
import CustomModal from 'components/Common/Modal'
import { showToast } from 'redux/actions/toastActions'
import SOAFileUpload from 'components/Common/FileUpload/SOAFileUpload'
import DownloadReportComp from '../DownloadReportModal'

import SuccessPopup from 'components/Common/SuccessPopup'
import SoaListPDF from 'components/PDF/SoaListPDF'
dayjs.extend(utc)

const SOAComp = ({ userInfo: { userType }, soa, setSoaList, showToast }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') === 'dashboard'
  const sourceType = searchParams.get('type')
  const { t, i18n } = useTranslation([
    'soa',
    'purchase_order',
    'vendors',
    'sidebar',
    'toast',
    'credit_notes',
    'popup'
  ])
  const isArabic = i18n.language === 'ar'
  //const [isCreatingSOA, setIsCreatingSOA] = useState(false)
  const [isUploadModal, setIsUploadModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // const [filterDateRange, setFilterDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [filterDateRange, setFilterDateRange] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    due_start_date: null,
    due_end_date: null,
    month: '',
    year: '',
    reconciliation_status: 'All',
    currency: 'All'
  })
  const [currencyOptions, setCurrencyOptions] = useState([])
  const fileInputRef = useRef(null)
  const [invoiceValue, setInvoiceValue] = useState({})

  const [fileUploadError, setFileUploadError] = useState('')
  const [fileUploadSuccess, setFileUploadSuccess] = useState('')
  const [soaPdf, setSoaPdf] = useState([])

  const [isCreatingSOA, setIsCreatingSOA] = useState(false)
  const [uploadedTableData, setUploadedTableData] = useState([])

  const [editRowId, setEditRowId] = useState(null)
  const [editData, setEditData] = useState({})
  const [showTypePopup, setShowTypePopup] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [currentRow, setCurrentRow] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const location = useLocation()
  const history = useNavigate()
  const isUploadMode = location.search.includes('newSOA=true')

  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [downloadDateRange, setDownloadDateRange] = useState([null, null])
  const [downloadReport, setDownloadReport] = useState(false)
  const isDataEmpty = soa?.soaList?.result?.results?.length === 0

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

  const {
    page,
    rowsPerPage,
    search,
    order,
    orderBy,
    setPageMeta,
    setLoader,
    handleSearchValue,
    setPage,
    tableProps
  } = useTableFeatures()

  useEffect(() => {
    fetchDropdownData()
  }, [i18n.language])

  useEffect(() => {
    if (page !== 1) {
      setPage(1)
    } else {
      fetchSoaList()

      fetchSoaPDFList()
    }
  }, [filters, rowsPerPage, search, order, orderBy, filterDateRange])
  useEffect(() => {
    fetchSoaList()

    fetchSoaPDFList()
  }, [page])

  const fetchSoaList = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      ...filters,
      date: filterDateRange ? filterDateRange.format('YYYY-MM-DD') : null,
      search: search.trim(),
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy
    }

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

    listSOA(query)
      .then((res) => {
        setUploadedTableData([])
        setSoaList(res.data.data)
        setPageMeta(res?.data?.data?.result?.pageMeta)
        if (res.data.data.invoice_value) {
          setInvoiceValue(res.data.data.invoice_value)
        } else {
          setInvoiceValue({})
        }
      })
      .catch((err) => {
        console.error('Error fetching SOA list:', err)
        toast.error(t('failedToLoadSOA'))
      })
      .finally(() => {
        setLoader(false)
      })
  }
  const fetchSoaPDFList = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      ...filters,
      due_date: filterDateRange ? filterDateRange.format('YYYY-MM-DD') : null,
      search: search.trim(),
      page: 1,
      limit: 10000,
      sort: order,
      sort_column: orderBy
    }

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

    listSOA(query)
      .then((res) => {
        setSoaPdf(res?.data?.data?.result?.results)
      })
      .catch((err) => {
        console.error('Error fetching SOA list:', err)
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

  const statusOptions = [
    { label: t('vendors:all'), value: 'All' },
    { label: t('reconciled'), value: '0' },
    { label: t('mismatched'), value: '1' },
    { label: t('pendingForReconciliation'), value: '2' }
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
        due_start_date: value[0]?.format('YYYY-MM-DD'),
        due_end_date: value[1]?.format('YYYY-MM-DD') || value[0]?.format('YYYY-MM-DD')
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

  const handleSendEmail = () => {
    const query = {
      date: filterDateRange ? filterDateRange.format('YYYY-MM-DD') : null,
      entity_id: getEntityId(),
      isArabic: isArabic ? true : false,
      search: search.trim(),
      ...filters
    }
    // Clean up empty values
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

    emailSOAListPage(query)
      .then(() => {
        setEmailSuccessPopup(true)
      })
      .catch(console.error)
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
      mode: 'report',
      isArabic: isArabic ? true : false,
      ...filters,
      date: filterDateRange ? filterDateRange.format('YYYY-MM-DD') : null,
      search: search.trim()
    }
    if (downloadDateRange && downloadDateRange[0] && downloadDateRange[1]) {
      query.startDate = downloadDateRange[0].format('YYYY-MM-DD')
      query.endDate = downloadDateRange[1].format('YYYY-MM-DD')
    }

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

    generateCsv(
      `${process.env.REACT_APP_DEFAULT_API_BASE_URL}/SOA/soalist/export`,
      'SOA.csv',
      query
    ).then(() => {
      handleCloseDownload()
    })
  }

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
      })
      .catch((err) => {
        console.error('Error updating row:', err)
        toast.error(t('failedToUpdateRow'))
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

    const rowId = currentRow?.invoiceCreditNoteNo

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

  const handleUploadNewSOAClick = () => {
    startTransition(() => setIsCreatingSOA(true))
    navigate(`/${userType}/soa?newSOA=true`)
  }

  const handleViewHistory = () => {
    navigate(`/${userType}${SOA_HISTORY}`)
  }

  useEffect(() => {
    if (isCreatingSOA && !isUploadMode) {
      fetchSoaList()
    }

    setIsCreatingSOA(isUploadMode)
  }, [location.search])

  const headers = [
    { key: 'type', label: t('type'), sortable: isCreatingSOA ? false : true, sortKey: 'InvType' },
    {
      key: 'invoiceCreditNoteNo',
      label: t('vendorInvoiceCreditNoteNo.text'),
      sortable: isCreatingSOA ? false : true,
      sortKey: 'Reference'
    },
    ...(userType === VENDOR_USER_TYPE
      ? []
      : !isCreatingSOA
      ? [
          {
            key: 'vendor_name_SOA',
            label: t('vendors:vendorName'),
            sortable: isCreatingSOA ? false : true,
            sortKey: 'Vendor_Name_EN'
          },
          {
            key: 'vendor_code_SOA',
            label: t('vendors:vendorCode'),
            sortable: isCreatingSOA ? false : true,
            sortKey: 'Vendor_SAP_Code'
          }
        ]
      : []),
    {
      key: 'invoiceCreditNoteDate',
      label: t('invoiceCreditNoteDate.text'),
      sortable: isCreatingSOA ? false : true,
      sortKey: 'DocDate',
      ...(isCreatingSOA && {
        render: (value, row) =>
          editRowId === row.id ? (
            <input
              value={editData.invoiceCreditNoteDate}
              onChange={(e) => handleEditChange('invoiceCreditNoteDate', e.target.value)}
              style={{
                background: '#FFFFFF', // light gray background
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
      })
    },
    {
      key: 'currency',
      label: t('invoiceCurrency.text'),
      sortable: isCreatingSOA ? false : true,
      sortKey: 'Curr',
      ...(isCreatingSOA && {
        render: (value, row) =>
          editRowId === row.id ? (
            <input
              value={editData.currency}
              onChange={(e) => handleEditChange('currency', e.target.value)}
              style={{
                background: '#FFFFFF', // light gray background
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
      })
    },
    {
      key: 'amountPerCurrency',
      label: t('amountPerCurrency.text'),
      sortable: isCreatingSOA ? false : true,
      sortKey: 'Amount',
      ...(isCreatingSOA && {
        render: (value, row) =>
          editRowId === row.id ? (
            <input
              value={editData.amountPerCurrency}
              onChange={(e) => handleEditChange('amountPerCurrency', e.target.value)}
              style={{
                background: '#FFFFFF', // light gray background
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
      })
    },
    {
      key: 'dueDate',
      label: t('dueDate.text'),
      sortable: isCreatingSOA ? false : true,
      sortKey: 'DueDate',
      ...(isCreatingSOA && {
        render: (value, row) =>
          editRowId === row.id ? (
            <input
              value={editData.dueDate}
              onChange={(e) => handleEditChange('dueDate', e.target.value)}
              style={{
                background: '#FFFFFF', // light gray background
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
      })
    },
    {
      key: 'status',
      label: t('reconciliationStatus.text'),
      sortable: isCreatingSOA ? false : true,
      sortKey: 'Reconciliation_status'
    },
    {
      key: 'reconciliationComments',
      label: t('reconciliationComments.text'),
      sortable: isCreatingSOA ? false : true,
      sortKey: 'Reconciliation_comments',
      render: (value, row) => (row.statusText === 'Reconciled' ? '' : value || '-')
    },
    ...(isCreatingSOA
      ? [
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
                        .map((c) => c.trim()) // trim spaces
                        .includes(comment) // check against mismatchComments list
                  )
                ) {
                  if (editRowId === row.id) {
                    return (
                      <button
                        onClick={handleSaveEdit}
                        style={{ background: 'transparent', cursor: 'pointer', color: 'var(--brand-primary-color, $primary-color)' }}>
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
      : [])
  ]

  const headerLabels = headers.map((h) => h.label)
  const headersWithoutActions = headers.filter((header) => header.key !== 'action')
  const APIdata = soa?.soaList?.result?.results || []
  const pdfData = soaPdf?.map((item) => {
    const statusText =
      item?.Reconciliation_status === 'RECONCILED'
        ? 'Reconciled'
        : item?.Reconciliation_status === 'MISMATCH'
        ? 'Mismatched'
        : item?.Reconciliation_status === 'Pending for Reconciliation'
        ? 'Pending for Reconciliation'
        : item?.Reconciliation_status || '--'

    return {
      ...item,
      type: item?.InvType || '--',
      invoiceCreditNoteNo: item?.Reference,
      currency: item?.Curr,
      // invoiceCreditNoteDate: item.DocDate || 'Missing Date',
      invoiceCreditNoteDate: item.DocDate ? dayjs(item.DocDate).format('DD/MM/YYYY') : '',
      amountPerCurrency: isNaN(item.Amount)
        ? '0.00'
        : Number(item.Amount).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      dueDate: item.DueDate ? dayjs(item.DueDate).format('DD/MM/YYYY') : '',
      statusText: statusText,
      // statuses: <span style={{ color: statusColorMap[statusText],fontWeight:500,fontSize:'12px',padding:'2px 5px',border:'1px solid',borderColor:statusColorMap[statusText],borderRadius:'16px'  }}>{statusText}</span>,
      status: statusText,
      reconciliationComments: item?.Reconciliation_comments || '',
      vendor_name_SOA: item?.Vendor?.Vendor_Name_EN,
      vendor_code_SOA: item?.Vendor_SAP_Code
      // created_by: item?.created_person?.Name
    }
  })

  const tableData = APIdata?.map((item) => {
    const statusText =
      item?.Reconciliation_status === 'RECONCILED'
        ? 'Reconciled'
        : item?.Reconciliation_status === 'MISMATCH'
        ? 'Mismatched'
        : item?.Reconciliation_status === 'Pending for Reconciliation'
        ? 'Pending for Reconciliation'
        : item?.Reconciliation_status || '--'

    return {
      ...item,
      type: item?.InvType || '--',
      invoiceCreditNoteNo: item?.Reference,
      currency: item?.Curr,
      // invoiceCreditNoteDate: item.DocDate || 'Missing Date',
      invoiceCreditNoteDate: item.DocDate ? dayjs(item.DocDate).format('DD/MM/YYYY') : '',
      amountPerCurrency: isNaN(item.Amount)
        ? '0.00'
        : Number(item.Amount).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      dueDate: item.DueDate ? dayjs(item.DueDate).format('DD/MM/YYYY') : '',
      statusText: statusText,
      // statuses: <span style={{ color: statusColorMap[statusText],fontWeight:500,fontSize:'12px',padding:'2px 5px',border:'1px solid',borderColor:statusColorMap[statusText],borderRadius:'16px'  }}>{statusText}</span>,
      status: statusText,
      reconciliationComments: item?.Reconciliation_comments || '',
      vendor_name_SOA: item?.Vendor?.Vendor_Name_EN,
      vendor_code_SOA: item?.Vendor_SAP_Code
      // created_by: item?.created_person?.Name
    }
  })

  const uploadSOAhandler = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setIsLoading(true)
    setUploadedTableData([])

    try {
      const response = await uploadSOA(formData, { entity_id: getEntityId() })

      showToast(t('toast:successTitle'), t('SOAUploadedSuccess'), 'success')
      //setIsCreatingSOA(false)
      setIsUploadModal(false)
      setFileUploadSuccess(response?.data?.message)
      if (response?.data?.data?.calculations) {
        setInvoiceValue(response?.data?.data?.calculations)
      } else {
        setInvoiceValue({})
      }
      const previewData = response?.data?.data?.list || []
      const parsedUploadData = previewData.map((item) => {
        const statusText =
          item?.ReconStatus === 'RECONCILED'
            ? 'Reconciled'
            : item?.ReconStatus === 'MISMATCH'
            ? 'Mismatched'
            : 'N/A'

        return {
          id: item?.ID,
          type: item?.InvType || 'N/A',
          invoiceCreditNoteNo: item['Invoice / Credit Note Reference'],
          invoiceCreditNoteDate: item['Invoice / Credit Note Date']
            ? dayjs(item['Invoice / Credit Note Date']).format('DD/MM/YYYY')
            : '',
          currency: item['Currency'],
          amountPerCurrency: item['Amount in Invoice Currency'],
          dueDate: item['Net Due Date'] ? dayjs(item['Net Due Date']).format('DD/MM/YYYY') : '',
          statusText: statusText,
          status: statusText,
          reconciliationComments: item['ReconDetails'] || ''
        }
      })

      setUploadedTableData(parsedUploadData)
    } catch (error) {
      console.error('Error uploading SOA:', error)
      //showToast('Error.', 'Failed to upload SOA', 'error')
      toast.error(`${error?.response?.data?.message || error?.message}`)
      setFileUploadError(error?.response?.data?.message || error?.message)
      // showToast('Error.', `${error?.response?.data?.message || error?.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=6`)
  }

  const handleUploadButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleDownloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/Statement_of_Account.xlsx'
    link.download = 'Statement_of_Account.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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
          title={
            sourceType === 'outstandingPayment'
              ? 'Outstanding Payment'
              : sourceType === 'payableThisMonth'
              ? 'Payable This Month'
              : isCreatingSOA
              ? t('createSOA')
              : // : t('sidebar:soa')
                `${t('daikin')} SOA`
          }
          slug={
            `${t('sidebar:home')}/ ` +
            (source ? 'Dashboard/ ' : '') +
            (sourceType === 'outstandingPayment'
              ? 'Outstanding Payment'
              : sourceType === 'payableThisMonth'
              ? 'Payable This Month'
              : 'SOA')
          }
          customBackHandler={
            isCreatingSOA
              ? () => {
                  setIsCreatingSOA(true)
                  history({ search: '' })
                }
              : undefined
          }>
          {(userType === VENDOR_USER_TYPE || userType === ADMIN_USER_TYPE) && (
            <>
              {!isCreatingSOA && (
                <NormalButton
                  isPrimary
                  label={t('uploadNewSoa')}
                  customClass="sub-header-btn"
                  onClick={handleUploadNewSOAClick}
                  disabled={isLoading}
                />
              )}

              {!source && isCreatingSOA && (
                <>
                  <SOAFileUpload
                    onFileChange={uploadSOAhandler}
                    accept=".xlsx,.xls,.csv"
                    disabled={isLoading}
                    openOnRender={isUploadModal}
                    onClose={(val) => setIsUploadModal(val)}
                    labelName={t('uploadNew')}
                    leftIcon
                    fileUploadError={fileUploadError}
                    fileUploadSuccess={fileUploadSuccess}
                    isLoading={isLoading}
                  />
                  <div style={{ display: 'flex', marginRight: '0' }}>
                    <TooltipWrapper tooltipMessage={t('downloadSOATemplate.tooltip')}>
                      <UtilIconFaq
                        name="download2"
                        alt="download"
                        onClick={handleDownloadTemplate}
                        disabled={isLoading}
                      />
                    </TooltipWrapper>

                    <TooltipWrapper tooltipMessage={t('soa:help')}>
                      <UtilIconFaq
                        name="help"
                        alt="help"
                        disabled={isLoading}
                        onClick={handleRedirectClick}
                      />
                    </TooltipWrapper>
                  </div>
                </>
              )}
            </>
          )}

          {!source && !isCreatingSOA && (
            <NormalButton
              isPrimary
              label={t('soaHistory')}
              customClass="sub-header-btn"
              onClick={handleViewHistory}
              disabled={isLoading}
            />
          )}

          {!isCreatingSOA && (
            <>
              <TooltipWrapper tooltipMessage={t('emailReport.text')}>
                <UtilIconFaq
                  name="emailReport"
                  onClick={!isDataEmpty ? handleSendEmail : undefined}
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
              <TooltipWrapper tooltipMessage={t('help')}>
                <UtilIconFaq name="help" alt="help" onClick={handleRedirectClick} />
              </TooltipWrapper>
            </>
          )}
        </HeaderBar>

        <div className="bg-white table-border overflow-hidden rounded-lg">
          {!isCreatingSOA && (
            <div className="">
              {(userType !== FINANCE_USER_TYPE || userType !== ADMIN_USER_TYPE) && (
                <div className="tableHeaderContainer">
                  <SearchInput
                    placeholder={
                      userType === VENDOR_USER_TYPE
                        ? t('searchInvoiceforVendor')
                        : t('searchInvoice')
                    }
                    onChange={(value) => handleSearchValue(value)}
                  />
                  <div className="d-flex gap-4">
                    <TableHeaderDropdown>
                      <label className="dateLabel">{t('dueDate.text')}</label>
                      <DateRangePicker
                        value={filterDateRange}
                        setValue={setFilterDateRange}
                        invDate={false}
                        clear
                        // type="range"
                        pickerHeight="45px"
                      />
                    </TableHeaderDropdown>
                    {!source && (
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
                    )}
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
              )}
            </div>
          )}

          <TableLayout
            tableHeaders={headers}
            tableData={isCreatingSOA ? uploadedTableData : tableData}
            {...tableProps}
            soaData={isCreatingSOA === false ? invoiceValue : ''}
            emptyMessage="No SOA data available"
            showPagination={isCreatingSOA ? false : true}
            className={isCreatingSOA ? 'create-soa-table' : 'soa-table'}
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
          title={t('soaPDFTitle')}
          pdfComponent={
            <SoaListPDF data={pdfData} headerLabels={headerLabels} userType={userType} />
          }
          onClickSubmit={handleDownloadSubmit}
          NewTableComp={
            <TableLayout
              checkboxRequired={false}
              tableHeaders={headersWithoutActions}
              tableData={tableData}
              {...tableProps}
            />
          }
        />

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
              {[
                'PO Based Invoice',
                'Non - PO Based Invoice',
                'Logistics Invoice',
                'Credit Note'
              ].map((type) => (
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
              ))}
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
      </LeftPageContainer>
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

export default connect(mapStateToProps, mapDispatchToProps)(SOAComp)
