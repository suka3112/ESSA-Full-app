import React, { Suspense, useEffect, useState } from 'react'
import TableComponent from 'components/Common/TableComponent'
import emailReport from '../../../../assets/icons/emailReport.svg'
import styles from './GrDetails.module.scss'
import { LeftPageContainer } from '../../../../pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import historyIcon from '../../../../assets/icons/historyIcon.svg'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { connect } from 'react-redux'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { helpIcon } from 'constants/imageConstants'
import { useNavigate, useParams } from 'react-router'
import { FAQS } from 'constants/url'
import SearchInput from 'components/Common/SearchInput'
import { useTranslation } from 'react-i18next'
import { ExportPOGRDetails, pOGRDetails } from 'api/PurchaseOrder'
import dayjs from 'dayjs'
import { downloadFile } from 'services/utilities'
import SuccessPopup from 'components/Common/SuccessPopup'
import { toast } from 'react-toastify'
import { GRDropdown } from 'api/POBased'
import useTableFeatures from 'hooks/useTableFeatures'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import GrDetailsTablePDF from 'components/PDF/GrDetailsTablePDF'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import SVGIcon from 'components/Common/SVGIcon'

const GRDetailsComp = ({ userInfo: { userType } }) => {
  const navigate = useNavigate()
  const [downloadReport, setDownloadReport] = useState(false)
  const [grData, setGrData] = useState({})
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const { t, i18n } = useTranslation([
    'purchase_order',
    'popup',
    'sidebar',
    'po_based_invoices',
    'good_receipt',
    'toast',
    'non_po_based_report',
    'vendors'
  ])
  const isArabic = i18n.language === 'ar'
  const [grOptions, setGrOptions] = useState([])
  const [filterDateRange, setFilterDateRange] = useState([null, null])
  const [filters, setFilters] = useState({
    search: '',
    startDate: null,
    endDate: null,
    gr_number: 'All',
    sort_column: '',
    sort: ''
  })
  const params = useParams()
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

  useEffect(() => {
    getGRDetails(params.id)
  }, [params.id, filters, search, order, orderBy, page, rowsPerPage])

  useEffect(() => {
    getGRDropdown()
  }, [i18n.language, params.id])

  const handleDownload = () => {
    setDownloadReport(true)
  }

  const handleMail = () => {
    if (!grData?.results || grData.results.length === 0) {
      toast.error(t('toast:noDataToExport'))
      return
    }
    setLoader(true)
    const query = {
      PONo: params.id,
      isArabic: isArabic ? true : false,
        ...filters,
      search: search.trim(),
    }
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })
    ExportPOGRDetails(query)
      .then((res) => {
        setEmailSuccessPopup(true)
      })
      .catch((err) => {
        toast.error(err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const handleDownloadSubmit = () => {
    const query = {
      mode: 'report',
      PONo: params.id,
      format: 'csv',
      isArabic: isArabic ? true : false ,
      ...filters,
      search: search.trim(),
    }
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })
    ExportPOGRDetails(query)
      .then((res) => {
        downloadFile(res?.data, `gr_details_${params.id}.csv`)
        handleCloseDownload()
      })
      .catch((err) => {
        toast.error(err)
      })
  }
  const getGRDetails = (id) => {
    setLoader(true)
    const query = {
      PONo: id,
      ...filters,
      search: search.trim(),
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy
    }
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })
    pOGRDetails(query)
      .then((res) => {
        setGrData(res?.data?.data)
        setPageMeta(res?.data?.data?.pageMeta)
      })
      .catch((err) => {
        console.log('err', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }
  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  const getGRDropdown = () => {
    GRDropdown({ PONo: params?.id }).then((res) => {
      const finalListOption = [
        { label: t('vendors:all'), value: 'All' },
        ...res?.data?.data?.map((x) => ({
          label: x.GR_number,
          value: x.GR_number
        }))
      ]
      setGrOptions(finalListOption)
    })
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
    }
    // Handle currency filter
    else if (key === 'grNumber') {
      setFilters((prev) => ({
        ...prev,
        gr_number: value === 'All' ? '' : value
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

    // Default case for search and other filters
    else {
      setFilters((prev) => ({
        ...prev,
        [key]: value
      }))
    }
  }

  const tableData =
    grData?.results?.map((x, indx) => {
      return {
        ...x,
        id: indx + 1,
        gr_number: x?.GR_number,
        gr_item_number: x?.GR_Ln_No,
        po_item_number: x?.POLnNo,
        material_code: x?.po_detail?.Material_Code,
        material_description: x?.po_detail?.Material_Description,
        gr_quantity:  x?.GR_quantity !== undefined && x?.GR_quantity !== null
          ? Number(x?.GR_quantity).toLocaleString('en-US', { maximumFractionDigits: 3 })
          : '0',
        gr_value: x?.GR_value !== undefined && x?.GR_value !== null
          ? Number(x?.GR_value).toLocaleString('en-US', { minimumFractionDigits: 2 })
          : 'N/A',
        uom: x?.Unit_of_measure
      }
    }) || []

  const headers = [
    { key: 'po_item_number', label: t('poLineNo'), sortable: true, sortKey: 'POLnNo' },
    { key: 'gr_number', label: t('grNumber'), sortable: true, sortKey: 'GR_number' },
    { key: 'gr_item_number', label: t('grItemNo'), sortable: true, sortKey: 'GR_Ln_No' },
    {
      key: 'material_code',
      label: t('po_based_invoices:materialCode.text'),
      sortable: true,
      sortKey: 'Material_Code'
    },
    {
      key: 'material_description',
      label: t('po_based_invoices:materialDescription.text'),
      sortable: true,
      sortKey: 'Material_Description'
    },
    {
      key: 'uom',
      label: t('po_based_invoices:uom.text'),
      sortable: true,
      sortKey: 'Unit_of_measure'
    },
    {
      key: 'gr_quantity',
      label: t('po_based_invoices:grQuantity.text'),
      sortable: true,
      sortKey: 'GR_quantity'
    },
    { key: 'gr_value', label: t('good_receipt:grValue.text'), sortable: true, sortKey: 'GR_value' }
  ]
  const headerLabels = headers.map((h) => h.label)

  return (
    <LeftPageContainer>
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('popup:emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      {/* Header */}
      <div className={styles.poContainer}>
        <HeaderBar
          title={t('grDetails')}
          slug={`${t('sidebar:home')} / ${t('sidebar:purchaseOrder')} / ${t('poNumber.text')} - ${params.id} / ${t('grDetails')}`}>
          <>
           <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.tooltip')}>
            <div className={styles.helpIconContainer}>
              {/* <img src={emailReport} alt="help" onClick={() => handleMail()} /> */}
              <SVGIcon name="emailReport" size={25} className='cursor-pointer' alt="help" onClick={() => handleMail()}  />
            </div>
            </TooltipWrapper>
              <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
            <div className={styles.helpIconContainer} onClick={handleDownload}>
              <SVGIcon name="download2" size={25} className='cursor-pointer' alt="download"  />
            </div>
            </TooltipWrapper>
               <TooltipWrapper tooltipMessage={t('soa:help')}>
              <div className={styles.faqIconContainer} >
                <SVGIcon name="help" size={25} className='cursor-pointer' alt="help" onClick={() => navigate(`/${userType}${FAQS}?id=2`)}  />
              </div>
              </TooltipWrapper>
          </>
        </HeaderBar>
      </div>

      {/* Filters */}
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className="d-flex justify-content-between p-3 align-items-end">
          {userType == VENDOR_USER_TYPE ? (
            <>
              <SearchInput
                placeholder={t('searchGRNumber')}
                onChange={(value) => handleSearchValue(value)}
              />
              <TooltipWrapper tooltipMessage={filters?.gr_number || t('vendors:all')}>
              <div className="d-flex gap-4">
                <TableSelectBox
                  label={t('grNumber')}
                  options={grOptions}
                  onFilterChange={handleFilterChange}
                  value={filters.gr_number}
                  paramName="grNumber"
                />
              </div>
              </TooltipWrapper>
            </>
          ) : (
            <TooltipWrapper tooltipMessage={filters?.gr_number || t('vendors:all')}>
            <div className="w-100">
              <TableSelectBox
                label={t('grNumber')}
                options={grOptions}
                onFilterChange={handleFilterChange}
                value={filters.gr_number}
                paramName="grNumber"
              />
            </div>
            </TooltipWrapper>
          )}
        </div>
        <TableLayout tableData={tableData} tableHeaders={headers} {...tableProps} className="po-gr-details"/>
      </div>
      {userType !== BUSINESS_USER_TYPE &&
        userType !== VENDOR_USER_TYPE &&
        userType !== ADMIN_USER_TYPE &&
        userType !== FINANCE_USER_TYPE && (
          <div>
            <div className="d-flex gap-2 mt-5 mb-2">
              <img src={historyIcon} alt="history icon" />
              <label className={styles.title}>History / PO Quantity - 350</label>
            </div>
            <TableComponent />
          </div>
        )}
      <Suspense fallback={<div>Loading...</div>}>
        <DownloadReportComp
          open={downloadReport}
          onClose={handleCloseDownload}
          title={t('GRDetailsPDFTitle')}
          headers={headers}
          showPagination={false}
          hideDatePicker={true}
          onClickSubmit={handleDownloadSubmit}
          viewGrDetails={false}
          NewTableComp={
            <TableLayout
              tableData={tableData}
              tableHeaders={headers}
              showPagination={false}
              {...tableProps}
            />
          }
          pdfComponent={
            <GrDetailsTablePDF data={tableData} headerLabels={headerLabels} />
          }
        />
      </Suspense>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo // Getting userInfo from Redux store
})

// Map actions to props
const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(GRDetailsComp)
