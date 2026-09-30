import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

// Components
import { NormalButton } from 'components/Common/NormalButton'
import EmailReportComp from 'components/Vendor/EmailReport'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import DateRangePicker from 'components/Common/DateRangePicker1'
import SearchInput from 'components/Common/SearchInput'
import { HeaderBar } from 'components/Common/HeaderBar'
import { HeaderBarFaqIconContainer, HeaderBarIconContainer } from 'components/Common/HeaderBar/HeaderBar.styles'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { TableHeaderDropdown } from 'components/Common/TableComponent/TableComponent.style'

// Assets
import addIcon from '../../../../assets/icons/addIconWhite.svg'

// API and Redux
import { downloadEnquiryListCSV, getEnquiries } from '../../../../api/Enquiry'
import { setEnquiryData } from '../../../../redux/actions/enquiryAction'

// Constants
import { VENDOR_USER_TYPE } from 'constants/userType'
import { CREATE_ENQUIRY, FAQS } from 'constants/url'

// Utilities
import { generateCsv, getEntityId } from '../../../../services/utilities'

// Styles
import styles from './EnquiresList.module.scss'
import EnquiresPDF from 'components/PDF/EnquiresPDF'
import { useSearchParams } from 'react-router-dom'
import useTableFeatures from 'hooks/useTableFeatures'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { getCRPersons } from 'api/MyProfile'
import SuccessPopup from 'components/Common/SuccessPopup'
import { getPendingEnquiry } from 'api/Dashboard'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import SVGIcon from 'components/Common/SVGIcon'


const EnquiresListComp = ({ userInfo: { userType }, enquiry, setEnquiryData }) => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['enquiries', 'popup', 'po_based_invoices', 'vendors', 'toast', 'non_po_based_report', 'soa', 'sidebar'])
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') === 'dashboard'

  // State management
  const [emailReportState, setEmailReportState] = useState(false)
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [crPersonsOptions, setCrPersonsOptions] = useState([])
  const [dateRange, setDateRange] = useState([dayjs().subtract(1, 'month'), dayjs()])
  const [emailReportDateRange, setEmailReportDateRange] = useState([dayjs(), dayjs()])
  const [downloadReportDateRange, setDownloadReportDateRange] = useState([dayjs(), dayjs()])
  const [filterDateRange, setFilterDateRange] = useState([null, null])
  const [downloadDateRange, setDownloadDateRange] = useState([null, null])
  const [emailDateRange, setEmailDateRange] = useState([null, null])
  const [pdfData, setPdfData] = useState([]);
  const isDataEmpty = enquiry?.enquiryData?.results?.length === 0
  const isArabic = i18n.language === 'ar'
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    assignedPerson: '', // '' means all
    status: '',
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


  const fetchEnquiryData = async () => {
    setLoader(true)
    try {
      const query = {
        entity_id: getEntityId(),
        ...filters,
        search: search.trim(),
        page: page,
        limit: rowsPerPage,
        sort: order,
        sort_column: orderBy,

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
      const res = await (source ? getPendingEnquiry(query) : getEnquiries(query))
      setEnquiryData(res.data.data)
      setPageMeta(res?.data?.data?.pageMeta)
    } catch (error) {
      console.error('Error fetching enquiries:', error)
    } finally {
      setLoader(false)
    }
  }


  useEffect(() => {
    fetchEnquiryData()
    if (downloadReport) {
      fetchEnquiryPDFData()
    }
  }, [filters, page, search, rowsPerPage, order, orderBy, downloadReport])

  useEffect(() => {
    fetchDropdownData()
  }, [])

  const fetchEnquiryPDFData = async () => {
    setLoader(true)
    try {
      const query = {
        entity_id: getEntityId(),
        ...filters,
        search: search.trim(),
        page: 1,
        limit: 10000,
        sort: order,
        sort_column: orderBy,
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
      const res = await getEnquiries(query)
      setPdfData(res.data.data)

    } catch (error) {
      console.error('Error fetching enquiries:', error)
    } finally {
      setLoader(false)
    }
  }

  const fetchDropdownData = async () => {
    // setIsLoading(true);
    try {
      const query = { entity_id: getEntityId() };

      const [crPersonsRes] = await Promise.all([
        getCRPersons(query),

      ]);

      const crPersonsOptions = [
        ...(crPersonsRes?.data?.data?.map((person) => ({
          label: person.Name,
          value: person.Employee_Id,
          ID: person.ID
        })) || [])
      ];

      setCrPersonsOptions(crPersonsOptions);


    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    } finally {
      // setIsLoading(false);
    }
  };

  const statusOptions = [
    { label: t('vendors:all'), value: '' },
    { label: t('vendors:submitted'), value: 1 },
    { label: t('vendors:underReview'), value: 2 },
    { label: t('resolved'), value: 3 },
  ]
  const statusOptionPending = [
    { label: t('vendors:all'), value: '' },
    { label: t('vendors:submitted'), value: 1 },
    { label: t('vendors:underReview'), value: 2 },
  ]

  // Add 'All' option to assignedTo dropdown
  const assignedToOptions = [
    // { label: 'All', value: '' },
    ...crPersonsOptions
  ];

  // Unified filter handler
  const handleFilterChange = (newFilter) => {
    const key = Object.keys(newFilter)[0]
    let value = newFilter[key]

    if (key === 'status') {
      setFilters((prev) => ({
        ...prev,
        status: value
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
    // Handle assignedTo filter
    else if (key === 'assigned_person') {
      // setFilters((prev) => ({
      //   ...prev,
      //   assignedPerson: value // '' means all
      // }))
      if (Array.isArray(value)) {
        if (value.includes('All')) {
          setFilters((prev) => ({
            ...prev,
            assignedPerson: ''
          }))
        } else {
          const filteredValues = value.filter(v => v !== '')
          setFilters((prev) => ({
            ...prev,
            assignedPerson: filteredValues.length > 0 ? filteredValues : ''
          }))
        }
      } else {
        setFilters((prev) => ({
          ...prev,
          assignedPerson: value === 'All' ? '' : value
        }))
      }
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
      startDate: emailDateRange[0] ? emailDateRange[0].format('YYYY-MM-DD') : null,
      endDate: emailDateRange[1] ? emailDateRange[1].format('YYYY-MM-DD') : null,
      category: 2,
      entity_id: getEntityId(),
      isArabic: isArabic ? true : false,
      ...filters,
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    downloadEnquiryListCSV(query)
      .then(() => {
        setEmailReportState(false)
        setEmailSuccessPopup(true)
      })
      .catch(console.error)
  }

  const handleCloseDownload = useCallback(() => {
    setDownloadReport(false)
  }, [])

  const handleDownloadSubmit = () => {
    const query = {
      entity_id: getEntityId(),
      mode: 'report',
      startDate: downloadDateRange[0] ? downloadDateRange[0]?.format('YYYY-MM-DD') : null,
      endDate: downloadDateRange[1] ? downloadDateRange[1]?.format('YYYY-MM-DD') : null,
      format: 'csv',
      ...filters,
      search: search.trim(),

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
    generateCsv(
      `${process.env.REACT_APP_DEFAULT_API_BASE_URL}/enquiry/downloadEnquiry`,
      'EnquiryList.csv',
      { ...query, isArabic: isArabic ? true : false }
    ).then(() => {
      handleCloseDownload()
    })
  }

  const handleRedirect = (data) => {
    const { id } = data
    navigate(`/${userType}/enquires/view-enquiry?id=${id}`)
  }

  // Status mapping for Enquiry_status
  const statusTextMap = {
    1: 'Submitted',
    2: 'Under Review',
    3: 'Resolved'
  };

  const APIdata = enquiry?.enquiryData?.results || []
  const data = APIdata.map((item) => ({
    enquiryType: item.Enquiry_type
      ? item.Enquiry_type.charAt(0).toUpperCase() + item.Enquiry_type.slice(1)
      : '-',
    enquiryId: item?.Enquiry_code,
    subject: item.Subject || '-',
    assignedContactPerson: item?.assignedPerson?.Employee_Name || '-',
    date: item.Datetime_submitted ? dayjs(item.Datetime_submitted).format('DD/MM/YYYY') : '-',
    status: statusTextMap[item.Enquiry_status] || '-',
    id: item.ID,
    vendor_name: item?.user?.Vendor_Name_EN,
    vendor_code: item?.user?.Vendor_SAP_Code
  }))

  const pdfContent = pdfData?.results?.map((item) => ({
    enquiryType: item.Enquiry_type
      ? item.Enquiry_type.charAt(0).toUpperCase() + item.Enquiry_type.slice(1)
      : '-',
    enquiryId: item?.Enquiry_code,
    subject: item.Subject || '-',
    assignedContactPerson: item?.assignedPerson?.Employee_Name || '-',
    date: item.Datetime_submitted ? dayjs(item.Datetime_submitted).format('DD/MM/YYYY') : '-',
    status: statusTextMap[item.Enquiry_status] || '-',
    id: item.ID,
    vendor_name: item?.user?.Vendor_Name_EN,
    vendor_code: item?.user?.Vendor_SAP_Code
  }))

  const tableHeaders = [
    { key: 'enquiryId', label: t('enquiryID'), sortable: true, sortKey: 'Enquiry_code' },

    { key: 'enquiryType', label: t('inquiryType.text'), sortable: true, sortKey: 'Enquiry_type' },
    ...(userType === VENDOR_USER_TYPE
      ? []
      : [
        { key: 'vendor_name', label: t('vendors:vendorName'), sortable: true, sortKey: 'Vendor_Name_EN' },
        { key: 'vendor_code', label: t('vendors:vendorCode'), sortable: true, sortKey: 'Vendor_SAP_Code' }
      ]),
    { key: 'subject', label: t('subject.text'), sortable: true, sortKey: 'Subject' },
    { key: 'assignedContactPerson', label: t('assignedContactPerson.text'), sortable: true, sortKey: 'assignedPerson' },
    { key: 'date', label: t('date'), sortable: true, sortKey: 'Datetime_submitted' },
    { key: 'status', label: t('inquiryStatus.text'), sortable: true, sortKey: 'enquiry_status' }
  ]
  const headerLabels = tableHeaders.map(h => h.label)
  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=7`) // your internal route
  }
  return (
    <LeftPageContainer>
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('popup:emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      <HeaderBar title={t('enquiries')} slug={source ? `${t('sidebar:home')}/ ${t('enquiries')}` : t('enquiries')}>
        {(userType === VENDOR_USER_TYPE) && (
          <NormalButton
            label={t('createInquiry.text')}
            isPrimary
            customClass="px-3"
            leftIcon={addIcon}
            onClick={() => navigate(`/${userType}${CREATE_ENQUIRY}`)}
          />
        )}
        <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.tooltip')}>
          <HeaderBarIconContainer onClick={!isDataEmpty ? () => setEmailReportState(true) : undefined}>
            {/* <img src={emailReport} alt={t('emailReport.alt')} className={isDataEmpty ? styles.disabledIcon : ''} /> */}
            <SVGIcon name="emailReport" size={25} className='cursor-pointer' alt="emailReport" onClick={!isDataEmpty ? () => setEmailReportState(true) : undefined}/>
          </HeaderBarIconContainer>
        </TooltipWrapper>
        <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
          <HeaderBarIconContainer onClick={!isDataEmpty ? () => setDownloadReport(true) : undefined}>
            {/* <img src={download} alt={t('download.alt')} className={isDataEmpty ? styles.disabledIcon : ''} /> */}
            <SVGIcon name="download2" size={25} className='cursor-pointer' alt="download" onClick={!isDataEmpty ? () => setDownloadReport(true) : undefined}/>
          </HeaderBarIconContainer>
        </TooltipWrapper>
        <TooltipWrapper tooltipMessage={t('soa:help')}>
          <HeaderBarFaqIconContainer>
            {/* <img src={helpIcon} alt={t('help.alt')}
              title='Help'
              onClick={handleRedirectClick} /> */}
              <SVGIcon name="help" size={25} className='cursor-pointer' alt="help" onClick={handleRedirectClick}/>
          </HeaderBarFaqIconContainer>
        </TooltipWrapper>

      </HeaderBar>

      {/* Filters Section */}
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className={styles.tableHeaderContainer}>
          <SearchInput
            onChange={(value) => handleSearchValue(value)}
            placeholder={userType === VENDOR_USER_TYPE
              ? (source ? t('searchEnquiryId') : t('searchEnquiryIdAndSubject'))
              : t('searchEnquiryIdAndSubjectVendorName')
            }
          />
          <div className="d-flex gap-4">
            <TableHeaderDropdown className="flex items-center">
              <label className='dateLabel'>{t('selectDate')}</label>
              <DateRangePicker
                value={filterDateRange}
                setValue={(dates) => {
                  handleFilterChange({ date_range: dates })
                }}
                type="range"
                pickerHeight="45px"
              />
            </TableHeaderDropdown>
            {
              (userType !== VENDOR_USER_TYPE) && (

                <TableSelectBox
                  label={t('assignedPerson')}
                  options={assignedToOptions}
                  onFilterChange={handleFilterChange}
                  value={filters.assignedPerson}
                  placeholder={t('vendors:all')}
                  paramName='assignedPerson'
                  isCurrency
                  multiSelect
                />)}

            <TableSelectBox
              label={t('po_based_invoices:status')}
              options={source ? statusOptionPending : statusOptions}
              onFilterChange={handleFilterChange}
              value={filters.status}
              placeholder={t('vendors:all')}
              paramName='status'
            />
          </div>
        </div>

        {/* Table Component */}
        <TableLayout
          tableData={data}
          tableHeaders={tableHeaders}
          {...tableProps}
          handleRedirectUrl={handleRedirect}
          className="enquiry-list-table"
        />
      </div>

      {/* Modals */}
      <EmailReportComp
        value={emailDateRange}
        setValue={setEmailDateRange}
        open={emailReportState}
        onClose={() => setEmailReportState(false)}
        onSend={handleSendEmail}
        title={t('emailReport.title')}
        disable={true}
      />

      <DownloadReportComp
        open={downloadReport}
        hideDatePicker
        onClose={() => setDownloadReport(false)}
        onClickSubmit={handleDownloadSubmit}
        title={t('enquiries')}
        value={downloadReportDateRange}
        setValue={setDownloadReportDateRange}
        pdfComponent={<EnquiresPDF data={pdfContent} headerLabels={headerLabels} userType={userType} />}
        NewTableComp={
          <TableLayout
            tableData={data}
            tableHeaders={tableHeaders}
            {...tableProps}
            handleRedirectUrl={handleRedirect}
          />
        }
      />
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
  enquiry: state.enquiry
})

const mapDispatchToProps = {
  setEnquiryData
}

export default connect(mapStateToProps, mapDispatchToProps)(EnquiresListComp)
