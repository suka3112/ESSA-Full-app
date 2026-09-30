import React, { Suspense, useEffect, useState } from 'react'
import styles from './VendorUpdates.module.scss'
import { useNavigate } from 'react-router-dom'
import SearchInput from 'components/Common/SearchInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { HeaderBar } from 'components/Common/HeaderBar'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { useForm } from 'react-hook-form'
import EmailReportComp from 'components/Vendor/EmailReport'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import useTableFeatures from 'hooks/useTableFeatures'
import { downloadFile, getEntityId } from 'services/utilities'
import {
  emailVendorsUpdatesReport,
  exportVendorsUpdate,
  getVendorsUpdateList
} from 'api/Vendors'
import dayjs from 'dayjs'
import VendorsUpdateListPDF from 'components/PDF/VendorsUpdateListPDF'
import SuccessPopup from 'components/Common/SuccessPopup'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { VENDOR_VIEW_PROFILE, VIEW_VENDORS_UPDATE } from 'constants/url'
import { fetchStatus, fetchVendorNameOrCode } from 'api/UserRegister'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import SVGIcon from 'components/Common/SVGIcon'

export const VendorsUpdateComp = () => {
  const {
    register,
    formState: { errors },
    control
  } = useForm()
  const { t, i18n } = useTranslation(['popup', 'sidebar', 'vendors', 'login', 'non_po_based_report'])
  const isArabic = i18n.language === 'ar'
  const navigate = useNavigate()
  const userType = useSelector((state) => state?.userInfo?.userType)
  const {
    search,
    handleSearchValue,
    page,
    rowsPerPage,
    order,
    orderBy,
    setPageMeta,
    tableProps,
    setLoader
  } = useTableFeatures()

  const [downloadReport, setDownloadReport] = useState(false)
  const [emailReportState, setEmailReportState] = useState(false)
  const [listData, setListData] = useState([])
  const [vendorsUpdateDownload, setVendorsUpdateDownload] = useState([])
  const [downloadDateRange, setDownloadDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [emailReportDateRange, setEmailReportDateRange] = useState([null, null])
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [dropdownData, setDropDownData] = useState(null)
  const [filters, setFilters] = useState({
    status: 'All',
    vendor_code: ''
  })
  const handleDownload = () => {
    setDownloadReport(true)
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  useEffect(() => {
    fetchVendorsUpdateList()
    fetchDropdownValues()
    if (downloadReport) {
      getPDFData()
    }
  }, [search, filters, page, rowsPerPage, order, orderBy, downloadReport, i18n.language])

  const fetchVendorsUpdateList = () => {
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      search: search.trim(),
      //status: filters.status
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
    getVendorsUpdateList(query)
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
    setLoader(true)
    const query = {
      entity_id: getEntityId(),
      search: search.trim(),
      //status: filters.status
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
    getVendorsUpdateList(query)
      .then((res) => {
        setVendorsUpdateDownload(res?.data?.data?.results || [])
      })
      .catch((err) => {
        console.error('Error fetching PO invoices:', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const onClickView = (rowData, columnKey) => {
    if (columnKey === 'vendorCode') {
      navigate(`/${userType}${VENDOR_VIEW_PROFILE}?id=${rowData?.vendorProfileID}`)
    } else if (columnKey === 'viewChanges') {
      navigate(`/${userType}${VIEW_VENDORS_UPDATE}?id=${rowData?.vendorID}`, {
        state: { vendorProfileID: rowData?.vendorProfileID }
      })
    }
  }

  const headers = [
    {
      key: 'vendorCode',
      label: t('vendors:vendorCode'),
      sortable: true,
      sortKey: 'Vendor_SAP_Code'
    },
    {
      key: 'vendorName',
      label: t('vendors:vendorName'),
      sortable: true,
      sortKey: 'Vendor_Name_EN'
    },
    { key: 'country', label: t('vendors:country'), sortable: true, sortKey: 'Country' },
    { key: 'email', label: t('login:email.text'), sortable: true, sortKey: 'Email' },
    { key: 'viewChanges', label: t('vendors:viewChanges'), sortable: false },
    { key: 'status', label: t('vendors:status'), sortable: true, sortKey: 'Status' }
  ]
  const pdfHeaders = headers.filter((h) => h.key !== 'viewChanges').map((h) => h.label)

  const statusOptions = [
    { label: t('vendors:all'), value: 'All' },
    { label: t('vendors:draft'), value: 1 },
    { label: t('vendors:submitted'), value: 2 },
    { label: t('vendors:underReview'), value: 3 },
    { label: t('vendors:approve'), value: 4 },
    { label: t('vendors:reject'), value: 5 }
  ]

  const formattedData = listData?.map((item) => ({
    vendorID: item?.ID,
    vendorName: item?.Vendor_Name_EN || 'N/A',
    vendorCode: item?.Vendor_SAP_Code || 'N/A',
    country: item?.Country || 'N/A',
    email: item?.Email || 'N/A',
    //status: statusOptions.find(opt => opt.value === item?.Status)?.label || 'N/A',
    status: item?.onboard_status?.Status_classification || 'N/A',
    viewChanges: 'View',
    vendorProfileID: item?.Vendor_Id
  }))

  //PDF DATA
  const formattedPDFData = vendorsUpdateDownload?.map((item) => ({
    vendorID: item?.ID,
    vendorName: item?.Vendor_Name_EN || 'N/A',
    vendorCode: item?.Vendor_SAP_Code || 'N/A',
    country: item?.Country || 'N/A',
    email: item?.Email || 'N/A',
    //status: statusOptions.find(opt => opt.value === item?.Status)?.label || 'N/A',
    status: item?.onboard_status?.Status_classification || 'N/A',
    viewChanges: 'View',
    vendorProfileID: item?.Vendor_Id
  }))

  const isDataEmpty = listData.length === 0

  const fetchDropdownValues = () => {
    Promise.all([fetchVendorNameOrCode({ entity_id: getEntityId() }), fetchStatus()])
      .then(([vendorNameRes, statusRes]) => {
        const VendorNameList = Array.isArray(vendorNameRes.data.data) ? vendorNameRes.data.data : []
        const statusList = Array.isArray(statusRes?.data?.data) ? statusRes?.data?.data : []

        const formattedData = {
          vendorNames: [
            // { label: t('vendors:all'), value: 'All' },
            ...VendorNameList?.map((item) => ({
              label: item?.Vendor_Name_EN,
              value: item?.Vendor_SAP_Code
            }))
          ],
          status: [
            { label: t('vendors:all'), value: 'All' },
            ...statusList.map((item) => ({
              label: isArabic ? item.Status_description_arabic : item.Status_classification,
              value: item?.Status_code
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

    if (key === 'search') {
      setFilters((prev) => ({
        ...prev,
        search: Array.isArray(value) ? value.join(',') : value // Handle both text and multi-select
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
    exportVendorsUpdate(query)
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
      isArabic: isArabic ? true : false,
      ...filters,
      search: search.trim()


    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })

    emailVendorsUpdatesReport(query)
      .then(() => {
        setEmailSuccessPopup(true)
        handleClosePopup()
      })
      .catch((err) => {
        console.error(err)
      })
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
          title={t('vendors:vendorsUpdate')}
          slug={`${t('sidebar:home')} / ${t('vendors:vendors')} / ${t('vendors:vendorsUpdate')}`}>
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
            placeholder={t('vendors:searchByVendorNameCodeEmail')}
            onChange={(value) => handleSearchValue(value)}
          />
          <div className="d-flex gap-4">
            <TableSelectBox
              label={t('vendors:status')}
              options={dropdownData?.status}
              onFilterChange={handleFilterChange}
              value={filters.status}
            />
            <TableSelectBox
              label={t('vendors:vendorNameOrCode')}
              options={dropdownData?.vendorNames}
              onFilterChange={handleFilterChange}
              paramName="vendor_code"
              value={filters.vendor_code}
              multiSelect={true}
              isCurrency
              placeholder={t('vendors:all')}
            />
          </div>
        </div>
        {/* <TableLayout /> */}
        <TableLayout
          tableData={formattedData}
          tableHeaders={headers}
          handleRedirectUrl={onClickView}
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
        value={downloadDateRange}
        setValue={setDownloadDateRange}
        hideDatePicker
        onClose={() => setDownloadReport(false)}
        title={t('vendorUpdateList')}
        onClickSubmit={downloadCSV}
        pdfComponent={<VendorsUpdateListPDF data={formattedPDFData} headerLabels={pdfHeaders} />}
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
