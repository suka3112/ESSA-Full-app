import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

// Components
import TableComponent from 'components/Common/TableComponent'
import DateRangePicker from 'components/Common/DateRangePicker1'
import SearchInput from 'components/Common/SearchInput'
import { HeaderBar } from 'components/Common/HeaderBar'
import { HeaderBarFaqIconContainer, HeaderBarIconContainer } from 'components/Common/HeaderBar/HeaderBar.styles'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { TableHeaderDropdown } from 'components/Common/TableComponent/TableComponent.style'

// Assets
import helpIcon from '../../../assets/icons/helpIcon.svg'

// Styles
import styles from './ReconciliationSummary.module.scss'

const ReconciliationSummaryListComp = ({ userInfo: { userType }, enquiry, setEnquiryData }) => {
    const navigate = useNavigate()
    const { t } = useTranslation('enquiries')

    // State management
    const [loading, setLoading] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [dateRange, setDateRange] = useState([dayjs().subtract(1, 'month'), dayjs()])


    const [filters, setFilters] = useState({
        search: '',
        status: 'All',
        assignedPerson: 'All',
        sort_column: 'createdAt',
        sort: 'ASC',
        page: 1,
        limit: 10
    })

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
                sort: direction.toUpperCase(),
                page: 1
            }))
            return
        }

        // Handle "All" options
        if (['status', 'assignedPerson'].includes(key)) {
            setFilters((prev) => ({
                ...prev,
                [key]: value === 'All' ? 'All' : value,
                page: 1
            }))
            return
        }

        // Default case
        setFilters((prev) => ({
            ...prev,
            [key]: value,
            ...(key !== 'page' && { page: 1 })
        }))
    }

    // Prepare table data
    //   const APIdata = enquiry?.enquiryData?.results || []
    //   const data = APIdata.map((item) => ({
    //     enquiryType: item.enquiry_type || '-',
    //     subject: item.subject || '-',
    //     assignedContactPerson: item.assigned_contact_person || '-',
    //     date: item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY') : '-',
    //     status: ENQUIRY_STATUS[item.enquiry_status] || '-',
    //     id: item.id,
    //     rawData: item
    //   }))

    // Table headers configuration
    const tableHeaders = [
        { key: 'type', label: 'Type', sortable: true },
        { key: 'invoiceNo', label: 'Invoice/Credit note no', sortable: true },
        { key: 'currency', label: 'Currency', sortable: true },
        { key: 'invoiceNo', label: 'Invoice/Credit note no', sortable: true },
        { key: 'amountPerCurrency', label: 'Amount Per Currency', sortable: true },
        { key: 'dueDate', label: 'Due Date', sortable: true },
        { key: 'reconciliationStatus', label: 'Reconciliation Status', sortable: true },
        { key: 'reconciliationComments', label: 'Reconciliation Comments', sortable: true }
    ]
    const headerLabels = tableHeaders.map(h => h.label)
    return (
        <LeftPageContainer>
            <HeaderBar title={'Pending Reconciliation'} slug={'Home/ Dashboard/ Pending Reconciliation'}>
                <HeaderBarFaqIconContainer>
                    <img src={helpIcon} alt={t('help.alt')} />
                </HeaderBarFaqIconContainer>
            </HeaderBar>
            {/* Filters Section */}
            <div className="bg-white table-border overflow-hidden rounded-lg">
                <div className={styles.tableHeaderContainer}>
                    <SearchInput
                        onChange={setSearchInput}
                        placeholder={'Search Invoice and Credit note no'}
                        value={searchInput}
                        loading={loading && !!filters.search}
                    />
                    <div className="d-flex gap-4">
                        <TableHeaderDropdown className="flex items-center">
                            <label>{"Date Date"}</label>
                            <DateRangePicker
                                value={dateRange}
                                onChange={(dates) => setDateRange(dates)}
                                type="range"
                                pickerHeight='45px'
                            />
                        </TableHeaderDropdown>

                        <TableSelectBox
                            label={t('Currency')}
                            options={['All', 'Open', 'In Progress', 'Resolved']}
                            onFilterChange={handleFilterChange}
                            value={filters.status}
                        />
                    </div>
                </div>

                {/* Table Component */}
                <TableComponent tableHeaders={tableHeaders} />
            </div>

        </LeftPageContainer>
    )
}

const mapStateToProps = (state) => ({
    userInfo: state.userInfo,
    enquiry: state.enquiry
})

const mapDispatchToProps = {
}

export default connect(mapStateToProps, mapDispatchToProps)(ReconciliationSummaryListComp)
