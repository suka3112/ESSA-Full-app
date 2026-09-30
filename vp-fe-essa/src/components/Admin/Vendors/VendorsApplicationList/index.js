import React, { Suspense, useEffect, useState } from 'react'
import styles from './VendorsApplicationList.module.scss'
import { useNavigate } from 'react-router-dom'
import SearchInput from 'components/Common/SearchInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { HeaderBar } from 'components/Common/HeaderBar'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { useForm } from 'react-hook-form'
import EmailReportComp from 'components/Vendor/EmailReport'
import { downloadFile, getEntityId } from 'services/utilities'
import { emailVendorsAppReport, exportVendorsAppListing, getVendorsAppList } from 'api/Vendors'
import VendorsApplicationListPDF from 'components/PDF/VendorsApplicationListPDF'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import dayjs from 'dayjs'
import SuccessPopup from 'components/Common/SuccessPopup'
import { VENDOR_PROFILE } from 'constants/url'
import useTableFeatures from 'hooks/useTableFeatures'
import { fetchStatus, fetchVendorApplicationDropdown } from 'api/UserRegister'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import SVGIcon from 'components/Common/SVGIcon'

export const VendorsAppListComp = () => {
  const {
    formState: { errors }
  } = useForm()
  const userType = useSelector((state) => state?.userInfo?.userType)
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

  const navigate = useNavigate()

  const [downloadReport, setDownloadReport] = useState(false)
  const [emailReportState, setEmailReportState] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [listData, setListData] = useState([])
  const [applicationDownload, setApplicationDownload] = useState([])
  const [downloadDateRange, setDownloadDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [emailReportDateRange, setEmailReportDateRange] = useState([null, null])
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [dropdownData, setDropDownData] = useState(null)
  const { t, i18n } = useTranslation([
    'vendors',
    'dashboard',
    'sidebar',
    'login',
    'logistics_invoice',
    'popup',
    'non_po_based_report'
  ])
   const isArabic = i18n.language === 'ar'
  const [filters, setFilters] = useState({
    status: 'All',
    vendor_code: ''
  })

  const onClickRefNumber = async (data) => {
    navigate(`/${userType}${VENDOR_PROFILE}?id=${data?.referenceNo}`)
  }

  const handleDownload = () => {
    setDownloadReport(true)
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  useEffect(() => {
    fetchVendorsList()
    fetchDropdownValues()
    if (downloadReport) {
      getPDFData()
    }
  }, [filters, page, rowsPerPage, search, order, orderBy, downloadReport, i18n.language])

  const fetchVendorsList = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      search: search.trim(),
      page: page,
      limit: rowsPerPage,
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

    getVendorsAppList(query)
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

  //GET PDF DATA
  const getPDFData = () => {
    const query = {
      entity_id: getEntityId(),
      search: search.trim(),
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

    getVendorsAppList(query)
      .then((res) => {
        setApplicationDownload(res?.data?.data?.results || [])
      })
      .catch((err) => {
        console.error('Error fetching PO invoices:', err)
      })
  }

  const headers = [
    {
      key: 'referenceNo',
      label: t('logistics_invoice:referenceNo'),
      sortable: true,
      sortKey: 'Application_Number'
    },
    { key: 'vendorName', label: t('vendorName'), sortable: true, sortKey: 'Vendor_Name_EN' },

    { key: 'country', label: t('country'), sortable: true, sortKey: 'Country' },
    { key: 'email', label: t('login:email.text'), sortable: true, sortKey: 'Email' },
    { key: 'status', label: t('status'), sortable: true, sortKey: 'status' }
  ]

  const headerLabels = headers.map((h) => h.label)

  const mapStatus = (status) => {
    const statusMap = {
      1: 'Draft',
      2: 'Submitted',
      3: 'Under Review',
      4: 'Approved',
      5: 'Rejected'
    }
    return statusMap[status] || 'Unknown'
  }
  const formattedData = listData?.map((item, index) => ({
    key: item?.Application_Number || `row-${index}`,
    vendorName: item?.Vendor_Name_EN || 'N/A',
    referenceNo: item?.Application_Number || 'N/A',
    country: item?.Country || 'N/A',
    email: item?.Email || 'N/A',
    status: item?.onboard_status?.Status_classification || 'Unknown'
  }))

  //Download PDF Data
  const formattedPDFData = applicationDownload?.map((item, index) => ({
    key: item?.Application_Number || `row-${index}`,
    vendorName: item?.Vendor_Name_EN || 'N/A',
    referenceNo: item?.Application_Number || 'N/A',
    country: item?.Country || 'N/A',
    email: item?.Email || 'N/A',
    status: item?.onboard_status?.Status_classification || 'Unknown'
  }))

const isDataEmpty = listData.length === 0
  const downloadCSV = () => {
    const query = {
      entity_id: getEntityId(),
      mode: 'report',
      format: 'csv',
      ...filters,
      startDate: downloadDateRange[0]?.format('YYYY-MM-DD'),
      endDate: downloadDateRange[1]?.format('YYYY-MM-DD'),
      isArabic: isArabic ? true : false,
       search: search.trim()
    }
      Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })
    exportVendorsAppListing(query)
      .then((res) => {
        downloadFile(res?.data, `vendors.csv`)
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
      // startDate: emailReportDateRange[0].format('YYYY-MM-DD'),
      // endDate: emailReportDateRange[1].format('YYYY-MM-DD'),
      entity_id: getEntityId(),
      category: 1,
      isArabic: isArabic ? true : false ,
      ...filters,
       search: search.trim(),

    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    emailVendorsAppReport(query)
      .then(() => {
        setEmailSuccessPopup(true)
        handleClosePopup()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const fetchDropdownValues = () => {
    Promise.all([fetchStatus(), fetchVendorApplicationDropdown()])
      .then(([statusRes, vendorNameRes]) => {
        const statusList = Array.isArray(statusRes.data.data) ? statusRes.data.data : []
        const VendorNameList = Array.isArray(vendorNameRes.data.data) ? vendorNameRes.data.data : []

        const formattedData = {
          status: [
            { label: t('all'), value: 'All' },
            ...statusList.map((item) => ({
              label: isArabic ? item.Status_description_arabic : item.Status_classification,
              value: item.Status_code
            }))
          ],
          vendorNames: [
            //{ label: 'All', value: 'All' },
            ...VendorNameList.map((item) => ({
              label: item.Vendor_Name_EN,
              value: item.ID
            }))
          ]
        }
        setDropDownData(formattedData)
      })
      .catch((err) => console.error(err))
  }

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
    } else if (key === 'status') {
      setFilters((prev) => ({
        ...prev,
        status: value === 'All' ? '' : value
      }))
    } else if (key === 'vendor_code') {
      if (Array.isArray(value)) {
        if (value.includes('All')) {
          setFilters((prev) => ({
            ...prev,
            vendor_code: ''
          }))
        } else {
          const filteredValues = value.filter((v) => v !== '')
          setFilters((prev) => ({
            ...prev,
            vendor_code: filteredValues.length > 0 ? filteredValues : ''
          }))
        }
      } else {
        setFilters((prev) => ({
          ...prev,
          vendor_code: value === 'All' ? '' : value
        }))
      }
    } else {
      setFilters((prev) => ({
        ...prev,
        [key]: value
      }))
    }
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
      <div className={styles.poContainer}>
        <HeaderBar
          title={t('vendorsApplications')}
          slug={`${t('sidebar:home')} / ${t('vendors:vendors')} / ${t('vendorsApplications')}`}>
            <div style={{marginLeft: isArabic ? '7px' : ''}}>
             <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.tooltip')}>
          <div 
           className={styles.helpIconContainer}
            onClick={ !isDataEmpty ? () => setEmailReportState(true) : undefined} 
             style ={{
                    opacity: isDataEmpty ? 0.4 : 1,
                    cursor: isDataEmpty ? "not-allowed" : "pointer",
                }}
            >
            <SVGIcon name="emailReport" size={25} className='cursor-pointer' />
          </div>
          </TooltipWrapper>
          </div>

 <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
          <div 
            className={styles.helpIconContainer} 
            onClick={ !isDataEmpty ? handleDownload : undefined}
             style ={{
                    opacity: isDataEmpty ? 0.4 : 1,
                    cursor: isDataEmpty ? "not-allowed" : "pointer",
                }}
            >
            <SVGIcon name="download2" size={25} className='cursor-pointer' />

          </div>
          </TooltipWrapper>
        </HeaderBar>
      </div>
      {/* Filters */}
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className="d-flex justify-content-between p-3 align-items-end">
          <SearchInput
            placeholder={t('searchByVendorNameCodeEmail')}
            onChange={(value) => handleSearchValue(value)}
          />
          <div className="d-flex gap-4">
            <TableSelectBox
              label={t('status')}
              options={dropdownData?.status}
              onFilterChange={handleFilterChange}
              value={filters.status}
              paramName="status"
            />
            <TableSelectBox
              label={t('vendorNameOrCode')}
              options={dropdownData?.vendorNames}
              onFilterChange={handleFilterChange}
              value={filters.vendor_code}
              paramName="vendor_code"
              multiSelect={true}
              isCurrency
              placeholder={t('vendors:all')}
            />
          </div>
        </div>
        <TableLayout
          tableHeaders={headers}
          tableData={formattedData}
          isLoading={isLoading}
          handleRedirectUrl={onClickRefNumber}
          {...tableProps}
        />
      </div>
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
        title={t('vendorApplicationList')}
        headers={headers}
        tableData={formattedData}
        value={downloadDateRange}
        setValue={setDownloadDateRange}
        hideDatePicker
        onClose={() => setDownloadReport(false)}
        onClickSubmit={downloadCSV}
        pdfComponent={
          <VendorsApplicationListPDF data={formattedPDFData} headerLabels={headerLabels} />
        }
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
