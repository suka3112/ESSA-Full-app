import React, { Suspense, useEffect, useMemo, useState, startTransition } from 'react'
import styles from './VendorsList.module.scss'
import { NormalButton } from 'components/Common/NormalButton'
import { useNavigate } from 'react-router-dom'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { Controller, useForm } from 'react-hook-form'
import CustomModal from 'components/Common/Modal'
import { SelectBox } from 'components/Common/SelectBox'
import { InputBox } from 'components/Common/InputBox'
import SuccessPopup from 'components/Common/SuccessPopup'
import EmailReportComp from 'components/Vendor/EmailReport'
import { ADMIN_USER_TYPE, BUSINESS_USER_TYPE, FINANCE_USER_TYPE } from 'constants/userType'
import {
  ADD_VENDOR,
  INVOICE_DASHBOARD,
  INVOICES,
  VENDOR_VIEW_PROFILE,
  VENDORS_APPLICATION,
  VENDORS_EXTENSION,
  VENDORS_UPDATES
} from 'constants/url'
import { useTranslation } from 'react-i18next'
import {
  emailVendorsReport,
  exportVendorsListing,
  getVendorsList,
  inviteVendorApi
} from 'api/Vendors'
import { downloadFile, getEntityId } from 'services/utilities'
import useTableFeatures from 'hooks/useTableFeatures'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import dayjs from 'dayjs'
import VendorsListPDF from 'components/PDF/VendorsListPDF'
import { useSelector } from 'react-redux'
import { fetchVendorNameOrCode } from 'api/UserRegister'
import { getCRPersons, editToggleStatus } from 'api/MyProfile'
import { showToast } from 'redux/actions/toastActions'
import { Validator } from 'services/validation/formValidations'
import { connect } from 'react-redux'
import { toast } from 'react-toastify'
import ToggleSwitch from 'components/Common/ToggleSwitch'
import { getEntityDropdown } from 'api/UserManagement'
import { PageLoader } from 'components/Common/PageLoader'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { PageHeader } from 'components/Essa/PageShell'
import { Card } from 'components/Essa/ui/Card'
import { Button } from 'components/Essa/ui/Button'
import { Badge } from 'components/Essa/ui/Badge'
import { Skeleton } from 'components/Essa/ui/Skeleton'
import { EmptyState } from 'components/Essa/ui/EmptyState'
import {
  FilterBar,
  FilterField,
  FilterSearch,
  SortTh,
  TablePagination
} from 'components/Essa/ui/listPage'
import { useEssaInvoices } from 'hooks/useEssaInvoices'
import { usePoBasedInvoices } from 'hooks/usePoBasedInvoices'
import '../../../../assets/scss/essa/dashboard.scss'

const INVOICE_TERMINAL = ['rejected', 'posted', 'paid', 'archived']

function invoiceStatsByVendor(invoices = []) {
  const map = new Map()
  for (const inv of invoices) {
    const code = String(inv.vendor_code || '').trim()
    const name = String(inv.vendor_name || '').trim()
    const key = (code || name).toLowerCase()
    if (!key) continue
    const cur = map.get(key) || {
      vendor_code: code,
      vendor_name: name,
      invoiceCount: 0,
      openInvoiceCount: 0,
      totalBilled: 0,
      currency: inv.currency || 'IDR'
    }
    cur.invoiceCount += 1
    cur.totalBilled += Number(inv.total_amount) || 0
    if (!INVOICE_TERMINAL.includes(inv.status)) cur.openInvoiceCount += 1
    if (!cur.vendor_code && code) cur.vendor_code = code
    if (!cur.vendor_name && name) cur.vendor_name = name
    map.set(key, cur)
    if (code && name) map.set(name.toLowerCase(), cur)
  }
  return map
}

function taxNumberOf(item = {}) {
  return item.VAT_Number || item.NPWP || item.Tax_Number || item.gstin || item.tax_number || ''
}

function locationOf(item = {}) {
  const city = item.City || item.city || ''
  const country = item.Country || item.country || item.state || ''
  return [city, country].filter(Boolean).join(', ')
}

function isVendorActive(item = {}) {
  if (item.Is_Active === false || item.Is_Active === 0 || item.Is_Active === 'in_active')
    return false
  if (item.status === 'in_active' || item.status === 'inactive') return false
  return true
}

function normalizeApiVendor(item, statsMap) {
  const code = item?.Vendor_SAP_Code || item?.vendorCode || ''
  const name = item?.Vendor_Name_EN || item?.vendorName || ''
  const stats =
    statsMap.get(String(code).toLowerCase()) || statsMap.get(String(name).toLowerCase()) || {}
  const gstin = taxNumberOf(item)
  const active = isVendorActive(item)
  return {
    id: item?.ID,
    code,
    name,
    location: locationOf(item) || '—',
    gstin: gstin || '—',
    sapStatus: active ? 'Active' : 'Inactive',
    controlState: active ? 'Enabled' : 'Disabled',
    taxStatus: gstin ? 'PKP' : 'Non-PKP',
    invoiceCount: stats.invoiceCount || 0,
    openInvoiceCount: stats.openInvoiceCount || 0,
    totalBilled: stats.totalBilled || 0,
    currency: stats.currency || 'IDR',
    raw: item
  }
}

function vendorsFromInvoiceStats(statsMap) {
  const seen = new Set()
  const rows = []
  for (const v of statsMap.values()) {
    const key = v.vendor_code || v.vendor_name
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push({
      id: null,
      code: v.vendor_code || '—',
      name: v.vendor_name || '—',
      location: '—',
      gstin: '—',
      sapStatus: 'Active',
      controlState: 'Enabled',
      taxStatus: 'PKP',
      invoiceCount: v.invoiceCount,
      openInvoiceCount: v.openInvoiceCount,
      totalBilled: v.totalBilled,
      currency: v.currency || 'IDR',
      raw: null
    })
  }
  return rows
}

const VENDOR_SORT = {
  code: (v) => String(v.code || '').toLowerCase(),
  name: (v) => String(v.name || '').toLowerCase(),
  location: (v) => String(v.location || '').toLowerCase(),
  gstin: (v) => String(v.gstin || '').toLowerCase(),
  sapStatus: (v) => String(v.sapStatus || '').toLowerCase(),
  controlState: (v) => String(v.controlState || '').toLowerCase(),
  invoiceCount: (v) => Number(v.invoiceCount) || 0,
  totalBilled: (v) => Number(v.totalBilled) || 0
}

export const VendorsListComp = ({ showToast }) => {
  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    reset
  } = useForm()

  const userType = useSelector((state) => state?.userInfo?.userType)

  const {
    page,
    rowsPerPage,
    setRowsPerPage,
    search,
    order,
    orderBy,
    setPage,
    setPageMeta,
    setLoader,
    loader,
    handleSearchValue,
    tableProps
  } = useTableFeatures(1, 25)

  const { data: essaRows = [], isLoading: essaLoading } = useEssaInvoices({})
  const { data: poRows = [], isLoading: poLoading } = usePoBasedInvoices()
  const [searchDraft, setSearchDraft] = useState('')
  const [taxStatus, setTaxStatus] = useState('')
  const [controlState, setControlState] = useState('')
  const [sortBy, setSortBy] = useState(null)
  const [sortDir, setSortDir] = useState(null)

  const navigate = useNavigate()
  const { t, i18n } = useTranslation([
    'vendors',
    'dashboard',
    'login',
    'popup',
    'sidebar',
    'toast',
    'non_po_based_report',
    'myprofile'
  ])
  const isArabic = i18n.language === 'ar'
  const modalStyles = {
    // padding: '28px 48px',
    width: '456px',
    overflow: 'hidden'
  }

  const [downloadReport, setDownloadReport] = useState(false)
  const [inviteVendor, setInviteVendor] = useState(false)
  const [inviteLink, setInviteLink] = useState(false)
  const [emailReportState, setEmailReportState] = useState(false)
  const [listData, setListData] = useState([])
  const [dropdownData, setDropDownData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [downloadDateRange, setDownloadDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [emailReportDateRange, setEmailReportDateRange] = useState([null, null])
  const [vendorsDownloadData, setVendorsDownloadData] = useState([])

  const [filters, setFilters] = useState({
    status: 'All',
    vendor_code: ''
  })

  useEffect(() => {
    fetchVendorsList()
    if (downloadReport) {
      getPDFData()
    }
  }, [filters, search, order, orderBy, downloadReport])

  useEffect(() => {
    fetchDropdownValues()
  }, [isArabic])

  const fetchDropdownValues = () => {
    let query = {
      entity_id: getEntityId()
    }
    Promise.all([fetchVendorNameOrCode(query), getEntityDropdown(), getCRPersons(query)])
      .then(([vendorNameRes, entityRes, crPersonRes]) => {
        const VendorNameList = Array.isArray(vendorNameRes.data.data) ? vendorNameRes.data.data : []
        const EntityOptionsList = Array.isArray(entityRes.data.data) ? entityRes.data.data : []
        const crPersonsList = Array.isArray(crPersonRes.data.data) ? crPersonRes.data.data : []

        const formattedData = {
          vendorNames: [
            // { label: 'All', value: 'All' },
            ...VendorNameList.map((item) => ({
              label: item.Vendor_Name_EN,
              value: item.Vendor_SAP_Code
            }))
          ],
          entityOptions: EntityOptionsList.map((entity) => ({
            label: isArabic ? entity?.Entity_Name_AR : entity?.Entity_Name,
            value: entity?.CoCd
          })),
          crPersonOptions: crPersonsList.map((person) => ({
            label: person.Name,
            value: person.Employee_Id
          }))
        }
        setDropDownData(formattedData)
      })
      .catch((err) => console.error(err))
  }

  const fetchVendorsList = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      searchString: search.trim(),
      page: 1,
      limit: 1000,
      sort: order,
      sort_column: orderBy,
      ...filters
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

    getVendorsList(query)
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
  const tableLoading = loader || ((listData || []).length === 0 && (essaLoading || poLoading))

  const invoiceStats = useMemo(
    () => invoiceStatsByVendor([...(essaRows || []), ...(poRows || [])]),
    [essaRows, poRows]
  )

  const vendorRows = useMemo(() => {
    const fromApi = (listData || []).map((item) => normalizeApiVendor(item, invoiceStats))
    const rows = fromApi.length ? fromApi : vendorsFromInvoiceStats(invoiceStats)
    let next = rows

    const needle = (searchDraft || search || '').trim().toLowerCase()
    if (needle) {
      next = next.filter(
        (v) =>
          String(v.code).toLowerCase().includes(needle) ||
          String(v.name).toLowerCase().includes(needle) ||
          String(v.gstin).toLowerCase().includes(needle)
      )
    }
    if (taxStatus) next = next.filter((v) => v.taxStatus === taxStatus)
    if (controlState) next = next.filter((v) => v.controlState === controlState)

    const sap = filters.status && filters.status !== 'All' ? filters.status : ''
    if (sap === 'active') next = next.filter((v) => v.sapStatus === 'Active')
    if (sap === 'in_active') next = next.filter((v) => v.sapStatus === 'Inactive')

    if (sortBy && VENDOR_SORT[sortBy]) {
      const getter = VENDOR_SORT[sortBy]
      const dir = sortDir === 'desc' ? -1 : 1
      next = [...next].sort((a, b) => {
        const av = getter(a)
        const bv = getter(b)
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
        return String(av).localeCompare(String(bv)) * dir
      })
    }

    return next
  }, [
    listData,
    invoiceStats,
    searchDraft,
    search,
    taxStatus,
    controlState,
    filters.status,
    sortBy,
    sortDir
  ])

  const totalVendors = vendorRows.length
  const totalPages = Math.max(1, Math.ceil(totalVendors / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const pageRows = vendorRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  const activeFilterCount = [
    (searchDraft || search || '').trim(),
    taxStatus,
    controlState,
    filters.status && filters.status !== 'All' ? filters.status : ''
  ].filter(Boolean).length

  const applySearch = (value) => {
    const next = (value ?? searchDraft).trim()
    setSearchDraft(next)
    handleSearchValue(next)
  }

  const resetFilters = () => {
    setSearchDraft('')
    handleSearchValue('')
    setTaxStatus('')
    setControlState('')
    setFilters({ status: 'All', vendor_code: '' })
    setSortBy(null)
    setSortDir(null)
  }

  const toggleSort = (key) => {
    if (sortBy !== key) {
      setSortBy(key)
      setSortDir('asc')
      return
    }
    if (sortDir === 'asc') setSortDir('desc')
    else {
      setSortBy(null)
      setSortDir(null)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [searchDraft, taxStatus, controlState, filters.status, sortBy, sortDir, setPage])

  const billedLabel = (v) => {
    const n = Number(v.totalBilled) || 0
    if (!n) return '—'
    return `IDR ${n.toLocaleString('en-US')}`
  }

  //GET PDF DATA
  const getPDFData = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      searchString: search.trim(),
      page: page,
      limit: 1000,
      sort: order,
      sort_column: orderBy,
      ...filters
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

    getVendorsList(query)
      .then((res) => {
        setVendorsDownloadData(res?.data?.data?.results || [])
      })
      .catch((err) => {
        console.error('Error fetching PO invoices:', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const handleClosePopup = () => {
    setEmailReportState(false)
  }

  const onClickRefNumber = async (data) => {
    if (data?.id) {
      navigate(
        `/${userType}${VENDOR_VIEW_PROFILE}?id=${data.id}&vendorCodeNo=${data.vendorCode || data.code || ''}`
      )
      return
    }
    const vendor = data?.vendor_name || data?.name || data?.vendorCode || data?.code
    if (vendor && vendor !== '—') {
      navigate(`/${userType}${INVOICES}?vendor=${encodeURIComponent(vendor)}`)
    }
  }

  const openVendor = (row, ev) => {
    ev?.stopPropagation?.()
    onClickRefNumber({
      id: row.id,
      vendorCode: row.code,
      code: row.code,
      name: row.name,
      vendor_name: row.name
    })
  }

  const handleSendEmailReport = () => {
    const query = {
      // startDate: emailReportDateRange[0].format('YYYY-MM-DD'),
      // endDate: emailReportDateRange[1].format('YYYY-MM-DD'),
      entity_id: getEntityId(),
      category: 1,
      isArabic: isArabic ? true : false,
      ...filters,
      searchString: search.trim()
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    emailVendorsReport(query)
      .then(() => {
        setEmailSuccessPopup(true)
        handleClosePopup()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const downloadCSV = () => {
    const query = {
      entity_id: getEntityId(),
      ...filters,
      mode: 'report',
      format: 'csv',
      // startDate: downloadDateRange[0]?.format('YYYY-MM-DD'),
      // endDate: downloadDateRange[1]?.format('YYYY-MM-DD'),
      isArabic: isArabic ? true : false
    }
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })
    exportVendorsListing(query)
      .then((res) => {
        downloadFile(res?.data, `vendors.csv`)
        handleCloseDownload()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  const handleToggleStatus = async (employeeId, newStatus) => {
    try {
      setLoader(true)
      let query = {
        Id: employeeId,
        Is_Active: newStatus
      }
      editToggleStatus(query)
        .then((res) => {
          //toast.success(`${t('userStatusUpdatedTo')} ${newStatus ? t('active') : t('inactive')}`)
          showToast(
            t('toast:successTitle'),
            `${t('userStatusUpdatedTo')} ${newStatus ? t('active') : t('inactive')}`,
            'success'
          )
          fetchVendorsList()
        })
        .catch((error) => {
          console.error('Error updating status:', error)
          toast.error(error.response?.data?.message || t('failedToUpdateStatus'))
        })
    } finally {
      setLoader(false)
    }
  }

  const headers = [
    { key: 'vendorCode', label: t('dashboard:vendorCode'), sortable: true },
    { key: 'vendorName', label: t('dashboard:vendorName'), sortable: true },
    { key: 'email', label: t('login:email.text'), sortable: true },
    { key: 'country', label: t('country'), sortable: true },
    { key: 'status1', label: t('status'), sortKey: 'status', sortable: true }
  ]

  const headerLabels = headers.map((h) => h.label)
  const formattedData = listData?.map((item) => ({
    id: item?.ID,
    vendorName: item?.Vendor_Name_EN || 'N/A',
    vendorCode: item?.Vendor_SAP_Code,
    country: item?.Country,
    email: item?.Email || 'N/A',
    status1: (
      <div className="flex items-center gap-2">
        <ToggleSwitch
          //customclassName="!w-12"
          defaultValue={item.Is_Active}
          onToggle={(newStatus) => handleToggleStatus(item.ID, newStatus)}
        />
        <span className="text-sm font-medium">{item.Is_Active ? t('active') : t('inactive')}</span>
      </div>
    ),
    isActive: item?.Is_Active
  }))

  //Download PDF DATA
  const formattedDownloadData = vendorsDownloadData?.map((item) => ({
    id: item?.ID,
    vendorName: item?.Vendor_Name_EN || 'N/A',
    vendorCode: item?.Vendor_SAP_Code,
    country: item?.Country,
    email: item?.Email || 'N/A',
    status: (
      <div className="flex items-center gap-2">
        <ToggleSwitch
          //customclassName="!w-12"
          defaultValue={item.Is_Active}
          onToggle={(newStatus) => handleToggleStatus(item.ID, newStatus)}
        />
        <span className="text-sm font-medium">{item.Is_Active ? t('active') : t('inactive')}</span>
      </div>
    ),
    isActive: item?.Is_Active
  }))

  const onSubmit = (data) => {
    setIsLoading(true)
    const crPersonId = Number(data?.crPerson)
    const entityId = data?.selectEntity

    const selectedCrPerson = dropdownData?.crPersonOptions?.find(
      (item) => item.value === crPersonId
    )

    const selectedEntity = dropdownData?.entityOptions?.find((item) => item.value === entityId)

    const payload = {
      Vendor_Name_EN: data?.vendorName,
      Email: data?.email,
      CR_Person_Id: crPersonId,
      CoCd: selectedEntity.value,
      entity_name: selectedEntity.label,
      CR_name: selectedCrPerson?.label
    }

    inviteVendorApi(payload)
      .then((res) => {
        reset()
        setInviteVendor(false)
        setInviteLink(true)
      })
      .catch((err) => {
        //showToast('Error.', `${err?.response?.data?.message}`, 'error');
        toast.error(err?.response?.data?.message || t('failedToSendInviteLink'))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const emailValidator = new Validator()
    .validateNotEmptySpace()
    .validateEmail()
    .validateMaxLength(241)
    .build()

  const alphaNumericValidator = new Validator().validateMinLength(5).validateMaxLength(50).build()

  return (
    <LeftPageContainer className="essa-invoices-shell">
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('popup:emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      <div className="essa-dashboard essa-invoices-page essa-vendors-page">
        <div className="dx-page dx-page--invoices-fit">
          <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}${INVOICE_DASHBOARD}` },
              { label: 'Vendors' }
            ]}
            title="Vendor Master"
            description="Read-only vendor snapshot synchronized from SAP (the vendor master source of truth) with the portal AP-control overlay. Master data changes are made in SAP, never here."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {userType === 'admin' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/${userType}${ADD_VENDOR}`)}>
                    Add Vendors
                  </Button>
                )}
                {(userType === ADMIN_USER_TYPE ||
                  userType === FINANCE_USER_TYPE ||
                  userType === BUSINESS_USER_TYPE) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/${userType}${VENDORS_EXTENSION}`)}>
                    Vendors Extension
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/${userType}${VENDORS_APPLICATION}`)}>
                  Vendors Application
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/${userType}${VENDORS_UPDATES}`)}>
                  Vendors Update
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    startTransition(() => setInviteVendor(true))
                  }}>
                  Invite Vendor
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={totalVendors === 0}
                  onClick={() => setEmailReportState(true)}>
                  Email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={totalVendors === 0}
                  onClick={() => setDownloadReport(true)}>
                  Download
                </Button>
              </div>
            }
          />

          <Card className="dx-invoices-card" pad={false}>
            <FilterBar className="dx-invoices-filters border-b border-line-soft">
              <FilterField label="Search">
                <form
                  className="relative"
                  onSubmit={(e) => {
                    e.preventDefault()
                    applySearch()
                  }}>
                  <FilterSearch
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onBlur={() => applySearch()}
                    placeholder="Search code, name or tax number"
                    className="dx-vendors-search-input"
                    aria-label="Search vendors"
                  />
                </form>
              </FilterField>
              <FilterField label="Tax Status">
                <span className="block w-[200px]">
                  <select
                    className="dx-select"
                    value={taxStatus}
                    onChange={(e) => setTaxStatus(e.target.value)}
                    aria-label="Tax status filter">
                    <option value="">All (PKP & Non-PKP)</option>
                    <option value="PKP">PKP · Domestic (tax-registered)</option>
                    <option value="Non-PKP">Non-PKP · International</option>
                  </select>
                </span>
              </FilterField>
              <FilterField label="AP Control">
                <span className="block w-[150px]">
                  <select
                    className="dx-select"
                    value={controlState}
                    onChange={(e) => setControlState(e.target.value)}
                    aria-label="AP control filter">
                    <option value="">Any</option>
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">AP disabled</option>
                    <option value="Negative">Negative list</option>
                  </select>
                </span>
              </FilterField>
              <FilterField label="SAP Status">
                <span className="block w-[140px]">
                  <select
                    className="dx-select"
                    value={filters.status === 'All' ? '' : filters.status}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: e.target.value || 'All'
                      }))
                    }
                    aria-label="SAP status filter">
                    <option value="">Any</option>
                    <option value="active">Active</option>
                    <option value="in_active">Inactive</option>
                  </select>
                </span>
              </FilterField>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" type="button" onClick={resetFilters}>
                  <RotateCcw size={13} /> Reset
                </Button>
              )}
              <span className="ml-auto self-center text-xs text-ink-muted">
                {totalVendors} vendors · SAP snapshot
              </span>
            </FilterBar>

            {totalPages > 1 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                total={totalVendors}
                pageSize={rowsPerPage}
                onPage={setPage}
                noun="vendors"
              />
            )}

            <div className="dx-table-wrap dx-table-wrap-scroll dx-invoices-table-wrap">
              <table className="dx-table dx-invoices-table">
                <thead>
                  <tr>
                    {[
                      ['code', 'Vendor Code'],
                      ['name', 'Vendor Name'],
                      ['location', 'Location'],
                      ['gstin', 'Tax Number'],
                      ['sapStatus', 'SAP Status'],
                      ['controlState', 'AP Control'],
                      ['invoiceCount', 'Invoices'],
                      ['totalBilled', 'Total Billed']
                    ].map(([key, label]) => (
                      <SortTh key={key} col={key} sortKey={sortBy} onSort={toggleSort}>
                        {label}
                      </SortTh>
                    ))}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={9}>
                          <Skeleton style={{ height: 14, margin: '8px 0' }} />
                        </td>
                      </tr>
                    ))
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState
                          icon="search"
                          title="No vendors found"
                          description={
                            (searchDraft || search || '').trim()
                              ? `No vendor matches “${(searchDraft || search).trim()}”.`
                              : 'No vendors in this snapshot.'
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row.id || row.code || row.name} onClick={() => openVendor(row)}>
                        <td>
                          <span
                            className="font-medium"
                            style={{ color: 'var(--brand-primary-color, #2c9842)' }}>
                            {row.code || '—'}
                          </span>
                        </td>
                        <td>
                          <span className="block max-w-52 truncate font-medium">
                            {row.name || '—'}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs">{row.location}</span>
                        </td>
                        <td>
                          <span className="font-mono text-[11px]">{row.gstin}</span>
                        </td>
                        <td>
                          <Badge
                            tone={row.sapStatus === 'Active' ? 'success' : 'neutral'}
                            className="dx-vendors-status">
                            {row.sapStatus}
                          </Badge>
                        </td>
                        <td>
                          <Badge
                            tone={
                              row.controlState === 'Negative'
                                ? 'danger'
                                : row.controlState === 'Disabled'
                                  ? 'warn'
                                  : 'success'
                            }
                            className="dx-vendors-status">
                            {row.controlState}
                          </Badge>
                        </td>
                        <td>
                          <span className="text-xs">
                            {row.invoiceCount}{' '}
                            <span className="text-ink-faint">({row.openInvoiceCount} open)</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap font-medium">{billedLabel(row)}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="ghost"
                            title={`Open vendor ${row.code}`}
                            onClick={(ev) => openVendor(row, ev)}>
                            Open <ArrowRight size={12} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              total={totalVendors}
              pageSize={rowsPerPage}
              onPage={setPage}
              onPageSize={(size) => {
                setRowsPerPage(size)
                setPage(1)
              }}
              noun="vendors"
            />
          </Card>
        </div>
      </div>
      {inviteVendor ? (
        <Suspense
          fallback={
            <div className="no-data-container-view">
              <PageLoader />
            </div>
          }>
          <CustomModal
            modalStyles={modalStyles}
            IsPadding="28px 48px"
            titleStyles={{ fontSize: '1.5rem', fontWeight: '600' }}
            closeIcon
            open={inviteVendor}
            title={t('inviteNewVendor')}
            onClose={() => setInviteVendor(false)}>
            <form className={styles.modalContent} onSubmit={handleSubmit(onSubmit)}>
              <div style={{ minWidth: '0px', marginTop: '40px' }}>
                <label className={`${styles.inputTitle} d-flex gap-1 mb-2`}>
                  {t('selectEntity.text')} <span className="required">*</span>
                </label>
                <Controller
                  name="selectEntity"
                  control={control}
                  defaultValue=""
                  rules={{ required: t('selectEntity.error') }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <div className="select-container">
                      <SelectBox
                        className={`${styles.userInput} custom-select-box`}
                        error={error}
                        label={t('selectEntity.text')}
                        value={value || ''}
                        onChange={async (e) => {
                          const selectedValue = e.target.value
                          onChange(selectedValue)

                          // Call getCRPersons API when entity changes
                          try {
                            const query = { entity_id: selectedValue }
                            const crPersonRes = await getCRPersons(query)
                            const crPersonsList = Array.isArray(crPersonRes.data.data)
                              ? crPersonRes.data.data
                              : []
                            setDropDownData((prev) => ({
                              ...prev,
                              crPersonOptions: crPersonsList.map((person) => ({
                                label: person.Name,
                                value: person.Employee_Id
                              }))
                            }))
                          } catch (err) {
                            console.error('Failed to fetch CR persons:', err)
                          }
                        }}
                        options={dropdownData?.entityOptions}
                        name="selectEntity"
                        isRequired
                      />
                    </div>
                  )}
                />{' '}
              </div>
              <div style={{ minWidth: '0px' }}>
                <label className={`${styles.inputTitle} d-flex gap-1 mb-2`}>
                  {t('crPerson.text')} <span className="required">*</span>
                </label>
                <Controller
                  name="crPerson"
                  control={control}
                  defaultValue=""
                  rules={{ required: t('crPerson.error') }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <div className="select-container">
                      <SelectBox
                        className={`${styles.userInput} custom-select-box`}
                        error={error}
                        label={t('crPerson.text')}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        options={dropdownData?.crPersonOptions}
                        name="crPerson"
                        isRequired
                      />
                    </div>
                  )}
                />
              </div>

              <div className="select-container" style={{ minWidth: '0px' }}>
                <InputBox
                  titleLabel={t('enterVendorName.text')}
                  className="user-input inputBox"
                  name="vendorName"
                  type="text"
                  register={register}
                  rules={{
                    required: t('enterVendorName.error'),
                    validate: (value) => {
                      const error = alphaNumericValidator(t('dashboard:vendorName'), value)
                      if (error) return error
                      return true
                    }
                  }}
                  error={errors.vendorName}
                  isRequired
                />
              </div>

              <div className="select-container" style={{ minWidth: '0px' }}>
                <InputBox
                  titleLabel={t('enterEmail.text')}
                  className="user-input inputBox"
                  name="email"
                  type="text"
                  rules={{
                    required: t('enterEmail.error'),
                    validate: (value) => {
                      const error = emailValidator(t('myprofile:email'), value)
                      if (error) return error
                      return true
                    }
                  }}
                  register={register}
                  error={errors.email}
                  isRequired
                />
              </div>

              <NormalButton
                IsWidth="360px"
                label={t('sendInviteLink')}
                isPrimary
                isLoading={isLoading}
                disabled={isLoading}
                customClass={styles.inviteBtn}
                type="submit"
              />
            </form>
          </CustomModal>
        </Suspense>
      ) : null}
      {inviteLink && (
        <SuccessPopup
          open={inviteLink}
          successMsg={t('linkSent')}
          subText={t('inviteLinkHasBeenSentSuccessfully')}
          onClose={() => setInviteLink(false)}
        />
      )}
      <Suspense fallback={<div>Loading...</div>}>
        <EmailReportComp
          open={emailReportState}
          onClose={() => setEmailReportState(false)}
          value={emailReportDateRange}
          setValue={setEmailReportDateRange}
          onSend={handleSendEmailReport}
          disable={true}
        />
      </Suspense>

      <DownloadReportComp
        open={downloadReport}
        title={t('vendorList')}
        headers={headers}
        tableData={formattedData}
        value={downloadDateRange}
        hideDatePicker
        setValue={setDownloadDateRange}
        onClose={() => setDownloadReport(false)}
        onClickSubmit={downloadCSV}
        pdfComponent={<VendorsListPDF data={formattedDownloadData} headerLabels={headerLabels} />}
        NewTableComp={
          <TableLayout
            showPagination={false}
            checkboxRequired={false}
            tableHeaders={headers}
            tableData={formattedData}
          />
        }
      />
    </LeftPageContainer>
  )
}

const mapDispatchToProps = {
  showToast
}
export default connect(null, mapDispatchToProps)(VendorsListComp)
