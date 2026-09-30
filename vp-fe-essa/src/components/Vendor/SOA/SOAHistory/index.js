import React, { useEffect, useState } from 'react'
import { HeaderBar } from 'components/Common/HeaderBar'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { UtilIcon, UtilIconFaq } from '../../../Common/UtilIcon'
import { useTranslation } from 'react-i18next'
import { getSOAHistory } from '../../../../api/SOA'
import { setSoaHistory } from '../../../../redux/actions/soaActions'
import { connect } from 'react-redux'
import { toast } from 'react-toastify'
import TableComponent from 'components/Common/TableComponent'
import helpIcon from '../../../../assets/icons/helpIcon.svg'
import { useNavigate } from 'react-router'
import { FAQS, SOA } from 'constants/url'
import useTableFeatures from 'hooks/useTableFeatures'
import { getEntityId } from 'services/utilities'
import { VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { CoPresentOutlined } from '@mui/icons-material'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'

const SOAHistoryComp = ({ userInfo: { userType }, soaHistory, setSoaHistory }) => {
  const { t } = useTranslation(['soa', 'sidebar', 'logistics_invoice', 'vendors'])
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({
    // entity_id: 1,
    // limit: 10,
    // page: 1,
    // sort_column: 'month',
    // sort: 'DESC',
    month: 'All',
    year: 'All'
  })

  const { page, rowsPerPage, search, order, orderBy, setPageMeta, setLoader, tableProps } =
    useTableFeatures()

  useEffect(() => {
    fetchSOAHistory()
  }, [filters, page, rowsPerPage, search, order, orderBy])

  const fetchSOAHistory = () => {
    setLoader(true)

    // Clean up empty or null values
    const query = {
      ...filters,
      // month: filters.month,
      // year: filters.year,
      entity_id: getEntityId(),
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All' || query[key].length === 0) delete query[key]
    })

    getSOAHistory(query)
      .then((res) => {
        setSoaHistory(res.data.data)
        setPageMeta(res?.data?.data?.results?.pageMeta)
      })
      .catch((err) => {
        console.error('Error fetching SOA history:', err)
        toast.error(t('failedToLoadSOAHistory'))
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const handleFilterChange = (newFilter) => {
    const key = Object.keys(newFilter)[0]
    const value = newFilter[key]
    if (key === 'month' || key === 'year') {
      setFilters((prev) => ({
        ...prev,
        [key]: value === 'All' ? '' : value,
        page: 1
      }))
    } else {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        page: 1
      }))
    }
  }

  // const months = [
  //   { label: 'All', value: 'All' },
  //   { label: 'January', value: '1' },
  //   { label: 'February', value: '2' },
  //   { label: 'March', value: '3' },
  //   { label: 'April', value: '4' },
  //   { label: 'May', value: '5' },
  //   { label: 'June', value: '6' },
  //   { label: 'July', value: '7' },
  //   { label: 'August', value: '8' },
  //   { label: 'September', value: '9' },
  //   { label: 'October', value: '10' },
  //   { label: 'November', value: '11' },
  //   { label: 'December', value: '12' },
  // ]

  const months = [
    { label: t('vendors:all'), value: 'All' },
    { label: t('jan'), value: '1' },
    { label: t('feb'), value: '2' },
    { label: t('mar'), value: '3' },
    { label: t('apr'), value: '4' },
    { label: t('may'), value: '5' },
    { label: t('june'), value: '6' },
    { label: t('july'), value: '7' },
    { label: t('aug'), value: '8' },
    { label: t('sep'), value: '9' },
    { label: t('oct'), value: '10' },
    { label: t('nov'), value: '11' },
    { label: t('dec'), value: '12' }
  ]

  const currentYear = new Date().getFullYear()
  const years = [
    // 'All',
    // currentYear.toString(),
    // (currentYear - 1).toString(),
    // (currentYear - 2).toString()
    { label: t('vendors:all'), value: 'All' },
    ...Array.from({ length: currentYear - 2022 + 1 }, (_, i) => {
      //const year = 2000 + i;
      const year = currentYear - i
      return { label: year.toString(), value: year.toString() }
    })
  ]

  const historyHeaders = [
    { key: 'sNo', label: t('logistics_invoice:serialNo'), sortable: false, sortKey: '' },
    { key: 'month', label: t('month'), sortable: true, sortKey: 'month' },
    { key: 'year', label: t('year'), sortable: true, sortKey: 'year' },
    {
      key: 'status',
      label: t('reconciliationStatus.text'),
      sortable: true,
      sortKey: 'reconciliationStatus'
    }
  ]

  const historyData =
    soaHistory?.data?.map((item, i) => {
      const monthObj = months.find((m) => m.value === String(item.month))
      return {
        //sNo: (filters.page - 1) * filters.limit + i + 1,
        // month: months.find(m => m.value === String(item.month))?.label || 'N/A',

        sNo: ((filters.page || 1) - 1) * (filters.limit || 10) + i + 1,
        month: monthObj?.label || 'N/A',
        monthValue: Number(monthObj?.value) || '',
        year: item?.year || 'N/A',
        status: item.reconciliationStatus || 'Not Reconciled'
      }
    }) || []

  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=6`) // your internal route
  }
  // const onClickView = (rowData) => {
  //   navigate(`/${userType}${SOA}?month=${rowData?.month}`)
  //         // if (columnKey === 'month') {
  //         //     navigate(`/${userType}${SOA}/${rowData?.month}`)
  //         // }
  //       }

  const handleMonthClick = (row) => {
    const { monthValue, year, month } = row
    const startDate = new Date(year, monthValue - 1, 1)
    const endDate = new Date(year, monthValue, 0)
    // const formattedStartDate = startDate.toISOString().split('T')[0];
    // const formattedEndDate = endDate.toISOString().split('T')[0];
    const formattedStartDate = `${startDate.getFullYear()}-${String(
      startDate.getMonth() + 1
    ).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
    const formattedEndDate = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(endDate.getDate()).padStart(2, '0')}`
    navigate(
      `/${userType}${SOA}?startDate=${formattedStartDate}&endDate=${formattedEndDate}&month=${month}&year=${year}`
    )
  }

  return (
    <LeftPageContainer>
      <HeaderBar
        title={t('soaHistory')}
        slug={`${t('sidebar:home')} / ${t('sidebar:soa')} / ${t('history')}`}>
        <TooltipWrapper tooltipMessage={t('soa:help')}>
          <UtilIconFaq name="help" alt="help" disabled={isLoading} onClick={handleRedirectClick} />
        </TooltipWrapper>
      </HeaderBar>

      {/* Filters */}
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className="flex flex-wrap gap-4 p-3 soa-select">
          <TableSelectBox
            label={t('month')}
            options={months}
            value={filters.month}
            onFilterChange={handleFilterChange}
            //onFilterChange={(val) => handleFilterChange({month : val})}
            disabled={isLoading}
            //selectedValue={getCurrentMonthName()}
            selectedValue={months.find((m) => m.value === filters.month)?.label || t('vendors:all')}
            paramName="month"
          />
          <TableSelectBox
            label={t('year')}
            options={years}
            // onFilterChange={(value) =>
            //   handleFilterChange({
            //     year: value === 'All' ? '' : value
            //   })
            // }
            onFilterChange={handleFilterChange}
            disabled={isLoading}
            value={filters.year}
            paramName="year"
            //selectedValue={filters.year || 'All'}
            selectedValue={years.find((y) => y.value === filters.year)?.label || t('vendors:all')}
          />
        </div>
        <TableLayout
          tableHeaders={historyHeaders}
          tableData={historyData}
          isLoading={isLoading}
          emptyMessage={t('noSOAHistoryDataAvailable')}
          {...tableProps}
          handleRedirectUrl={handleMonthClick}
        />
      </div>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  soaHistory: state.soa.soaHistory,
  userInfo: state.userInfo
})

const mapDispatchToProps = (dispatch) => ({
  setSoaHistory: (payload) => dispatch(setSoaHistory(payload))
})

export default connect(mapStateToProps, mapDispatchToProps)(SOAHistoryComp)
