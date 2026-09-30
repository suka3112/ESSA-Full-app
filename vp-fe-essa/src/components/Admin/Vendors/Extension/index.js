import React, { useEffect, useState } from 'react'
import styles from './Extension.module.scss'
import { NormalButton } from 'components/Common/NormalButton'
import emailReport from '../../../../assets/icons/emailReport.svg'
import addIcon from '../../../../assets/icons/addIconWhite.svg'
import download from '../../../../assets/icons/downloadIcon2.svg'
import TableComponent from 'components/Common/TableComponent'
import { useNavigate } from 'react-router-dom'
import SearchInput from 'components/Common/SearchInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { HeaderBar } from 'components/Common/HeaderBar'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { useForm } from 'react-hook-form'
import { UtilIcon, UtilIconFaq } from 'components/Common/UtilIcon'
import EmailReportComp from 'components/Vendor/EmailReport'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import useTableFeatures from 'hooks/useTableFeatures'
import { downloadFile, generateCsv, getEntityId } from 'services/utilities'
import { emailVendorsUpdatesReport, exportVendorsAppListing, exportVendorsUpdate, getVendorExtensionList, getVendorsUpdateDetailPage, getVendorsUpdateList } from 'api/Vendors'
import dayjs from 'dayjs'
import VendorsUpdateListPDF from 'components/PDF/VendorsUpdateListPDF'
import { downloadPOGoodsReceiptListCSV } from 'api/PurchaseOrder'
import SuccessPopup from 'components/Common/SuccessPopup'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { VENDOR_VIEW_PROFILE, VIEW_VENDORS_EXTENSION, VIEW_VENDORS_UPDATE } from 'constants/url'
import { fetchVendorNameOrCode } from 'api/UserRegister'


export const VendorExtensionComp = () => {
    const {
        register,
        formState: { errors },
        control
    } = useForm()
    const { t, i18n } = useTranslation(['popup', 'sidebar', 'vendors', 'login', 'myProfile'])
     const isArabic = i18n.language === 'ar'
    const navigate = useNavigate()
    const userType = useSelector((state) => state?.userInfo?.userType)
    const {
        search,
        handleSearchValue,
        page,
        rowsPerPage,
        order, orderBy,
        setPageMeta,
        tableProps
    } = useTableFeatures();

    const [downloadReport, setDownloadReport] = useState(false)
    const [emailReportState, setEmailReportState] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [listData, setListData] = useState([])
    const [downloadDateRange, setDownloadDateRange] = useState([dayjs().startOf('month'), dayjs()]);
    const [emailReportDateRange, setEmailReportDateRange] = useState([dayjs().startOf('month'), dayjs()])
    const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
    const [dropdownData, setDropDownData] = useState(null)
    const [filters, setFilters] = useState({
        status: '',
        vendor_code: ''
    })
    const handleDownload = () => {
        setDownloadReport(true)
    }

    const handleCloseDownload = () => {
        setDownloadReport(false)
    }


    useEffect(() => {
        fetchExtensionList()
        fetchDropdownValues()
    }, [search, filters, page, rowsPerPage, order, orderBy,])

    const fetchExtensionList = () => {
        setIsLoading(true)
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
            if (!query[key] || query[key] === 'All') delete query[key]
        })
        getVendorExtensionList(query)
            .then((res) => {
                setListData(res?.data?.data?.results || [])
                setPageMeta(res?.data?.data?.pageMeta)
            })
            .catch((err) => {
                console.error('Error fetching PO invoices:', err)
            }).finally(() => {
                setIsLoading(false)
            })
    }


    const onClickView = (rowData, columnKey) => {
        if (columnKey === 'vendorCode') {
            navigate(`/${userType}${VENDOR_VIEW_PROFILE}?id=${rowData?.vendorID}`)
        } else if (columnKey === 'viewChanges') {
            navigate(`/${userType}${VIEW_VENDORS_EXTENSION}?id=${rowData?.vendorID}`);
        }
    };


    const headers = [
        { key: 'vendorName', label: t('vendors:vendorName'), sortable: true, sortKey: 'Vendor_Name_EN' },
        { key: 'vendorCode', label: t('vendors:vendorCode'), sortable: true, sortKey: 'Vendor_SAP_Code' },
        { key: 'country', label: t('vendors:country'), sortable: true, sortKey: 'Country' },
        { key: 'email', label: t('login:email.text'), sortable: true, sortKey: 'Email' },
        { key: 'status', label: t('vendors:status'), sortable: true, sortKey: 'Status' },
        { key: 'viewChanges', label: t('vendors:viewChanges'), sortable: false },
    ]
    const headerLabels = headers.map(h => h.label)

    const statusOptions = [
        { label: t('vendors:all'), value: '' },
        { label: t('vendors:draft'), value: 1 },
        { label: t('vendors:submitted'), value: 2 },
        { label: t('vendors:underReview'), value: 3 },
        { label: t('vendors:approve'), value: 4 },
        { label: t('vendors:reject'), value: 5 }
    ]

    const formattedData = listData?.map((item) => ({
        vendorID: item?.vendor?.ID,
        vendorName: item?.vendor?.Vendor_Name_EN || 'N/A',
        vendorCode: item?.vendor?.Vendor_SAP_Code || 'N/A',
        country: item?.Country || 'N/A',
        email: item?.Email || 'N/A',
        //status: statusOptions.find(opt => opt.value === item?.Status)?.label || 'N/A',
        status: item?.statusus?.Status_classification || 'N/A',
        viewChanges: "View",
        vendorProfileID: item?.Vendor_Id
    }))

    const fetchDropdownValues = () => {
        Promise.all(
            [
                fetchVendorNameOrCode({ entity_id: getEntityId() }),
            ],
        )
            .then(
                ([
                    vendorNameRes,
                ]) => {
                    const VendorNameList = Array.isArray(vendorNameRes.data.data) ? vendorNameRes.data.data : []

                    const formattedData = {
                        vendorNames: VendorNameList?.map((item) => ({
                            label: item?.Vendor_Name_EN,
                            value: item?.ID
                        })),
                    }
                    setDropDownData(formattedData)
                }
            )
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
        }
        else if (key === 'vendor_code') {
            setFilters((prev) => ({
                ...prev,
                vendor_code: value === 'All' ? '' : value
            }))
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
            mode: "report",
            format: 'csv',
            startDate: downloadDateRange[0]?.format('YYYY-MM-DD'),
            endDate: downloadDateRange[1]?.format('YYYY-MM-DD'),
            isArabic: isArabic ? true : false 
        }
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
            startDate: emailReportDateRange[0].format('YYYY-MM-DD'),
            endDate: emailReportDateRange[1].format('YYYY-MM-DD'),
            entity_id: getEntityId(),
            category: 1,
            isArabic: isArabic ? true : false 
        }

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
                <HeaderBar title={t('myProfile:vendorsExtension')} slug={`${t('sidebar:home')} / ${t('vendors:vendors')} / ${t('myProfile:extension')}`}>
                    <UtilIconFaq name="emailReport" onClick={() => setEmailReportState(true)} />
                    <UtilIconFaq name="download2" onClick={handleDownload} />
                </HeaderBar>
            </div>
            {/* Filters */}
            <div className="bg-white table-border overflow-hidden rounded-lg">
                <div className="d-flex justify-content-between p-3 align-items-end">
                    <SearchInput placeholder={t('vendors:searchByVendorNameCodeEmail')} onChange={(value) => handleSearchValue(value)} />
                    <div className='d-flex gap-4'>
                        <TableSelectBox
                            label={t('vendors:status')}
                            options={statusOptions}
                            onFilterChange={handleFilterChange}
                        />
                        <TableSelectBox
                            label={t('vendors:vendorNameOrCode')}
                            options={dropdownData?.vendorNames}
                            onFilterChange={handleFilterChange}
                            paramName="vendor_code"
                        />
                    </div>
                </div>
                {/* <TableLayout /> */}
                <TableLayout tableData={formattedData} tableHeaders={headers} isLoading={isLoading} handleRedirectUrl={onClickView} />
            </div>
            <EmailReportComp
                open={emailReportState}
                onClose={() => setEmailReportState(false)}
                value={emailReportDateRange}
                setValue={setEmailReportDateRange}
                onSend={handleSendEmailReport}
            />

            <DownloadReportComp
                open={downloadReport}
                value={downloadDateRange}
                setValue={setDownloadDateRange}
                hideDatePicker
                onClose={() => setDownloadReport(false)}
                title="Vendors_Update_List"
                onClickSubmit={downloadCSV}
                pdfComponent={<VendorsUpdateListPDF data={formattedData} headerLabels={headerLabels} />}
                NewTableComp={
                    <TableLayout showPagination={false} checkboxRequired={false} tableHeaders={headers} tableData={formattedData} />
                }
            />
        </LeftPageContainer>
    )
}
