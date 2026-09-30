import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useTableFeatures from 'hooks/useTableFeatures'
import styles from '../../InvoiceProcessing/POBased/POBasedList/POBasedList.module.scss'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { UtilIconFaq } from 'components/Common/UtilIcon'
import { FAQS } from 'constants/url'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import { VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { helpIcon } from 'constants/imageConstants'
import SearchInput from 'components/Common/SearchInput'
import {
  TableDropDownLabel,
  TableHeaderDropdown
} from 'components/Common/TableComponent/TableComponent.style'
import DateRangePicker from 'components/Common/DateRangePicker1'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { fetchCurrencies } from 'api/UserRegister'
import { getEntityId } from 'services/utilities'
import { getOutstanding, getPaybleThisMonth, getReconciliation } from 'api/Dashboard'
import { toast } from 'react-toastify'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'

const OutstandingPayment = ({ userInfo: { userType } }) => {
  const navigate = useNavigate()
  const { t } = useTranslation([
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
    'dashboard'
  ])
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') === 'dashboard'
  const sourceType = searchParams.get('type')

  const [filterDateRange, setFilterDateRange] = useState(null)
  const [outstandingData, setOutstandingData] = useState([])
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [invoiceValue, setInvoiceValue] = useState({})
  const [filters, setFilters] = useState({
    search: '',
    due_start_date: null,
    due_end_date: null,
    month: '',
    year: '',
    reconciliation_status: 'All',
    currency: 'All'
  })
  const {
    page,
    setPage,
    rowsPerPage,
    search,
    order,
    orderBy,
    setPageMeta,
    setLoader,
    handleSearchValue,
    tableProps
  } = useTableFeatures()

  const getOutstandingList = async () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      ...filters,
      search: search.trim(),
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy,
      date: filterDateRange ? filterDateRange.format('YYYY-MM-DD') : null
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

    let apiCall

    if (sourceType === 'payableThisMonth') {
      apiCall = getPaybleThisMonth(query)
    } else if (sourceType === 'pendingReconciliation') {
      apiCall = getReconciliation(query)
    } else if (sourceType === 'outstandingPayment') {
      apiCall = getOutstanding(query)
    }

    if (apiCall) {
      apiCall
        .then((res) => {
          const resultData = res?.data?.data?.result?.results || []
          const pageMetaData = res?.data?.data?.result?.pageMeta
          const invoiceValue = res?.data?.data?.invoice_value || {}

          setOutstandingData(resultData)
          setPageMeta(pageMetaData)
          setInvoiceValue(invoiceValue)
        })
        .catch((err) => {
          console.error('Error fetching data:', err)
          toast.error(t('toast:fetchingError'), { autoClose: 2000 })
        })
        .finally(() => {
          setLoader(false)
        })
    } else {
      setLoader(false)
      console.warn('No valid sourceType found!')
    }
  }

  useEffect(() => {
    if (page !== 1) {
      setPage(1)
    } else {
      getOutstandingList()
    }
  }, [filters, rowsPerPage, search, order, orderBy, filterDateRange])

  useEffect(() => {
    getOutstandingList()
  }, [page])

  useEffect(() => {
    fetchDropdownData()
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

  const fetchDropdownData = () => {
    let query = {
      entity_id: getEntityId()
    }
    Promise.all([fetchCurrencies()])
      .then(([currenciesRes]) => {
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

        setCurrencyOptions(formattedCurrencies)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }

  const headers = [
    {
      key: 'type',
      label: t('soa:type'),
      sortable: true,
      sortKey: 'InvType'
    },
    {
      key: 'invoiceCreditNoteNo',
      label: t('soa:vendorInvoiceCreditNoteNo.text'),
      sortable: true,
      sortKey: 'Reference'
    },
    {
      key: 'currency',
      label: t('soa:invoiceCurrency.text'),
      sortable: true,
      sortKey: 'Curr'
    },
    ...(userType === VENDOR_USER_TYPE
      ? []
      : [
          {
            key: 'vendor_name_SOA',
            label: t('vendors:vendorName'),
            sortable: true,
            sortKey: 'Vendor_Name_EN'
          },
          {
            key: 'vendor_code_SOA',
            label: t('vendors:vendorCode'),
            sortable: true,
            sortKey: 'Vendor_SAP_Code'
          }
        ]),
    {
      key: 'invoiceCreditNoteDate',
      label: t('soa:invoiceCreditNoteDate.text'),
      sortable: true,
      sortKey: 'DocDate'
    },
    {
      key: 'amountPerCurrency',
      label: t('soa:amountPerCurrency.text'),
      sortable: true,
      sortKey: 'Amount'
    },
    {
      key: 'dueDate',
      label: t('soa:dueDate.text'),
      sortable: true,
      sortKey: 'DueDate'
    },
    {
      key: 'status',
      label: t('soa:reconciliationStatus.text'),
      sortable: true,
      sortKey: 'Reconciliation_status'
    },
    {
      key: 'reconciliationComments',
      label: t('soa:reconciliationComments.text'),
      sortable: true,
      sortKey: 'Reconciliation_comments'
    }
  ]

  const tableData = outstandingData?.map((item) => {
    const statusText =
      item?.Reconciliation_status === 'RECONCILED'
        ? 'Reconciled'
        : item?.Reconciliation_status === 'MISMATCH'
        ? 'Mismatched'
        : item?.Reconciliation_status === 'Pending for Reconciliation'
        ? 'Pending for Reconciliation'
        : 'N/A'

    const statusColorMap = {
      Reconciled: '#188A42', //Green
      'Pending for Reconciliation': '$primary-color', // blue
      Mismatched: '#E22323', // red

      'N/A': '#A5A5A5'
    }

    return {
      ...item,
      type: item?.InvType || 'N/A',
      invoiceCreditNoteNo: item?.Reference,
      currency: item?.Curr,
      // invoiceCreditNoteDate: item.DocDate || 'Missing Date',
      invoiceCreditNoteDate: item.DocDate ? dayjs(item.DocDate).utc().format('DD/MM/YYYY') : '',
      amountPerCurrency: isNaN(item.Amount)
        ? '00'
        : Number(item.Amount).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      dueDate: item.DueDate ? dayjs(item.DueDate).utc().format('DD/MM/YYYY') : '',
      statusText: statusText,
      status: statusText,
      reconciliationComments: item?.Reconciliation_comments || '',
      vendor_name_SOA: item?.Vendor?.Vendor_Name_EN,
      vendor_code_SOA: item?.Vendor_SAP_Code
      // created_by: item?.created_person?.Name
    }
  })

  return (
    <LeftPageContainer>
      <div className={styles.poContainer}>
        <HeaderBar
          title={
            sourceType === 'outstandingPayment'
              ? t('dashboard:outstandingPayment')
              : sourceType === 'pendingReconciliation'
              ? t('dashboard:pendingReconciliation')
              : sourceType === 'payableThisMonth'
              ? t('dashboard:payableThisMonth')
              : t('dashboard:outstandingPayment')
          }
          slug={`${t('sidebar:home')}/ ${t('sidebar:dashboard')}/ ${
            sourceType === 'outstandingPayment'
              ? t('dashboard:outstandingPayment')
              : sourceType === 'pendingReconciliation'
              ? t('dashboard:pendingReconciliation')
              : sourceType === 'payableThisMonth'
              ? t('dashboard:payableThisMonth')
              : t('dashboard:outstandingPayment')
          }`}>
          {userType === VENDOR_USER_TYPE && (
            <TooltipWrapper tooltipMessage={t('soa:help')}>
              <UtilIconFaq
                style={{ marginLeft: 0 }}
                onClick={() => navigate(`/${userType}${FAQS}?id=3`)}
                name="help"
              />
            </TooltipWrapper>
          )}
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
              <TableDropDownLabel>{t('soa:dueDate.text')}</TableDropDownLabel>
              <DateRangePicker
                value={filterDateRange}
                setValue={setFilterDateRange}
                invDate={false}
                clear
                // type="range"
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
          </div>
        </div>
        {/* pass handle redirectURL below */}
        <TableLayout
          tableHeaders={headers}
          tableData={tableData}
          {...tableProps}
          soaData={invoiceValue}
          emptyMessage="No SOA data available"
        />
      </div>
    </LeftPageContainer>
  )
}
const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(OutstandingPayment)
// export default OutstandingPayment
