import { editIcon } from 'constants/imageConstants'
import React, { startTransition, Suspense, useCallback, useEffect, useState } from 'react'
import styles from './UserManagement.module.scss'
import { NormalButton } from 'components/Common/NormalButton'
import { useNavigate } from 'react-router-dom'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { useForm } from 'react-hook-form'
import EmailReportComp from 'components/Vendor/EmailReport'
import { FINANCE_USER_TYPE, ADMIN_USER_TYPE, VENDOR_PORTAL } from 'constants/userType'
import {
  VENDORS_APPLICATION,
  ADD_USER,
  USER_MANAGEMENT,
  EDIT_USER,
  INVOICE_DASHBOARD,
  SLA_MANAGEMENT
} from 'constants/url'
import { PageHeader } from 'components/Essa/PageShell'
import {
  FilterBar,
  FilterField,
  FilterSearch,
  ListWorkbench,
  TablePagination
} from 'components/Essa/ui/listPage'
import '../../../../assets/scss/essa/dashboard.scss'
import { useTranslation } from 'react-i18next'
import {
  getUserManagement,
  deleteUserManagement,
  getRoleDropdown,
  getUserById,
  exportUser,
  editUserManagement
} from 'api/UserManagement'
import useTableFeatures from 'hooks/useTableFeatures'
import AdminUserManagementPDF from 'components/PDF/AdminUserManagementPDF'
import { downloadFile, getEntityId } from 'services/utilities'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import CustomModal from 'components/Common/Modal'
import dayjs from 'dayjs'
import SuccessPopup from 'components/Common/SuccessPopup'
import ToggleSwitch from 'components/Common/ToggleSwitch'
import { toast } from 'react-toastify'
import { showToast } from 'redux/actions/toastActions'
import { connect } from 'react-redux'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import SVGIcon from 'components/Common/SVGIcon'

const UserManagementListComp = ({ showToast }) => {
  const {
    register,
    formState: { errors },
    control
  } = useForm()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation([
    'user_management',
    'sidebar',
    'myprofile',
    'vendors',
    'dashboard',
    'non_po_based_report'
  ])
  const isArabic = i18n.language === 'ar'
  const [usersList, setUsersList] = useState([])
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)

  const [downloadDateRange, setDownloadDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [emailReportDateRange, setEmailReportDateRange] = useState([null, null])
  const [downloadReport, setDownloadReport] = useState(false)
  const [emailReportState, setEmailReportState] = useState(false)
  const [roleOptions, setRoleOptions] = useState([])
  const [userManagementDownloadList, setUserManagementDownloadList] = useState([])
  //const [isActive, setIsActive] = useState(user.Is_Active)
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    status: 'All',
    role: 'All'
  })
  const statusOptions = [
    { label: 'All', value: 'All' },
    { label: 'Active', value: true },
    { label: 'Inactive', value: 'inactive' }
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
    tableProps
  } = useTableFeatures()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [empId, setEmpId] = useState(null)
  useEffect(() => {
    getUserManagementList()
    // if (downloadReport) {
    //   getPDFData()
    // }
  }, [page, rowsPerPage, search, order, orderBy, filters])
  useEffect(() => {
    if (downloadReport) {
      getPDFData()
    }
  }, [downloadReport])

  useEffect(() => {
    selectRole()
  }, [])

  // Fetch dropdown data for role
  const selectRole = useCallback(() => {
    Promise.all([getRoleDropdown()])
      .then(([roleRes]) => {
        const roleOptions = [
          { label: 'All', value: 'All' },
          ...roleRes?.data?.data?.map((person) => ({
            label: person.Role_Name_EN,
            value: person.ID.toString()
          }))
        ]
        setRoleOptions(roleOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }, [])

  const handleVendorsApplication = () => {
    navigate(`/${FINANCE_USER_TYPE}${VENDORS_APPLICATION}`)
  }

  const handleDownload = () => {
    setDownloadReport(true)
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  const headers = [
    // { key: 'serialNumber', label: t('myprofile:serialNumber') },
    { key: 'name', label: t('myprofile:name'), sortable: true, sortKey: 'Name' },
    { key: 'email', label: t('myprofile:email'), sortable: true, sortKey: 'Email' },
    { key: 'role', label: t('myprofile:role'), sortable: true, sortKey: 'Role_id' },
    { key: 'statuses', label: t('myprofile:status'), sortable: true, sortKey: 'Is_Active' },
    { key: 'action', label: t('vendors:action') }
  ]
  const pdfUserHeader = headers?.filter((item) => item?.key !== 'action')

  const handleConfirmDelete = () => {
    deleteUserManagement(empId)
      .then((res) => {
        setIsModalOpen(false)
        setEmpId(null)
        showToast('Success.', 'User deleted successfully ', 'success')
        // toast.success('User deleted successfully ')
        getUserManagementList()
      })
      .catch((err) => {
        console.error('Error deleting user:', err)
      })
  }

  const getUserManagementList = () => {
    setLoader(true)
    const query = {
      ...filters,
      status: filters.status === 'inactive' ? false : filters.status,
      entity_id: getEntityId(),
      search: search.trim(),
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (query[key] === '' || query[key] === 'All') {
        delete query[key]
      }
    })

    getUserManagement(query)
      .then((res) => {
        setUsersList(res?.data?.data?.results || [])
        setPageMeta(res?.data?.data?.pageMeta)
      })
      .catch((err) => {
        console.error('Error fetching user management list:', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const getPDFData = () => {
    const query = {
      ...filters,
      status: filters.status === 'inactive' ? false : filters.status,
      entity_id: getEntityId(),
      search: search.trim(),
      page: page,
      limit: 1000,
      sort: order,
      sort_column: orderBy
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (query[key] === '' || query[key] === 'All') {
        delete query[key]
      }
    })

    getUserManagement(query)
      .then((res) => {
        setUserManagementDownloadList(res?.data?.data?.results || [])
      })
      .catch((err) => {
        console.error('Error fetching user management list:', err)
      })
  }

  const handleEdit = async (user) => {
    const resp = await getUserById(user?.Employee_Id)

    navigate(`/${ADMIN_USER_TYPE}${USER_MANAGEMENT}${EDIT_USER}`, {
      state: { userData: resp?.data?.data }
    })
  }

  const handleDelete = (employeeId) => {
    setIsModalOpen(true)
    setModalMessage(t('confirm_delete_account'))
    setEmpId(employeeId)
    // deleteUserManagement(employeeId)
    //   .then((res) => {
    //     getUserManagementList()
    //   })
    //   .catch((err) => {
    //     console.error('Error deleting user:', err)
    //   })
  }

  //status toggle
  const handleToggleStatus = async (employeeId, newStatus) => {
    try {
      setLoader(true)
      const response = await editUserManagement({
        Id: employeeId,
        Is_Active: newStatus
      })
      if (response.data.status === 200) {
        showToast(
          'Success.',
          `User status updated to ${newStatus ? 'Active' : 'Inactive'}`,
          'success'
        )
        getUserManagementList()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status')
    } finally {
      setLoader(false)
      getUserManagementList()
    }
  }

  const roleLookup = {
    1: 'Vendor',
    2: 'Finance',
    3: 'Business',
    4: 'Admin'
  }
  const handleFilterChange = (newFilter) => {
    const key = Object.keys(newFilter)[0]
    let value = newFilter[key]

    if (key === 'status') {
      setFilters((prev) => ({
        ...prev,
        status: value === 'All' ? '' : value
      }))
    }
    // Handle created_by filter
    else if (key === 'role') {
      setFilters((prev) => ({
        ...prev,
        role: value === 'All' ? '' : value
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
  const tableData = usersList
    ?.map((user, index) => {
      if (index === 0 && Object.keys(user).length === 0) {
        return null
      }

      return {
        // serialNumber: (page - 1) * rowsPerPage + index + 1,
        name: user.Name,
        email: user.Email,
        role: roleLookup[user.Role_id] || 'Unknown Role',
        //
        statuses: (
          <div className="flex">
            <ToggleSwitch
              // customclassName="!w-12"
              defaultValue={user.Is_Active}
              onToggle={(newStatus) => handleToggleStatus(user.Employee_Id, newStatus)}
            />
            <span className="ml-1">
              {user.Is_Active ? (
                <span className={styles.activeText}>Active</span>
              ) : (
                <span className={styles.inactiveText}>InActive</span>
              )}
            </span>
          </div>
        ),
        action: (
          <SVGIcon 
            name="edit"
            size={20}
            className={styles.editBtn}
            onClick={() => handleEdit(user)}
            style={{ cursor: 'pointer', width: 20, height: 20 }}
          />
        )
      }
    })
    .filter(Boolean)

  const pdfTableData = userManagementDownloadList
    ?.map((user, index) => {
      if (index === 0 && Object.keys(user).length === 0) {
        return null
      }

      return {
        // serialNumber: (page - 1) * rowsPerPage + index + 1,
        name: user.Name,
        email: user.Email,
        role: roleLookup[user.Role_id] || 'Unknown Role',
        //
        status: user.Is_Active ? 'Active' : 'Inactive'
      }
    })
    .filter(Boolean)

  const totalCount = tableProps.pageMeta?.total ?? usersList?.length ?? 0
  const totalPages = Math.max(1, tableProps.pageMeta?.pageCount || 1)

  const handleClosePopup = () => {
    setEmailReportState(false)
  }
  const handleSendEmailReport = async () => {
    const query = {
      startDate: emailReportDateRange[0].format('YYYY-MM-DD'),
      endDate: emailReportDateRange[1].format('YYYY-MM-DD'),
      entity_id: getEntityId(),
      isArabic: isArabic ? true : false
      // category: 4,
    }

    exportUser(query)
      .then(() => {
        setEmailSuccessPopup(true)
        handleClosePopup()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const handleDownloadSubmit = () => {
    const query = {
      entity_id: getEntityId(),
      mode: 'report',
      // startDate: downloadDateRange[0]?.format('YYYY-MM-DD'),
      // endDate: downloadDateRange[1]?.format('YYYY-MM-DD'),
      format: 'csv',
      isArabic: isArabic ? true : false
    }

    exportUser(query)
      .then((res) => {
        downloadFile(res.data, `user_list.csv`)
        handleCloseDownload()
      })
      .catch((err) => {
        console.log('err', err)
      })
  }

  return (
    <LeftPageContainer className="essa-invoices-shell">
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('popup:emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      <div className={`essa-dashboard essa-invoices-page email-templates-page ${styles.poContainer}`}>
        <div className="dx-page dx-page--invoices-fit">
          <PageHeader
            breadcrumb={[
              { label: t('dashboard:home'), to: `/${ADMIN_USER_TYPE}${INVOICE_DASHBOARD}` },
              { label: 'Administration', to: `/${ADMIN_USER_TYPE}${SLA_MANAGEMENT}` },
              { label: t('sidebar:userManagement') }
            ]}
            title={t('sidebar:userManagement')}
            actions={
              <div className={styles.headerIcons} style={{ marginLeft: isArabic ? '7px' : '' }}>
                <TooltipWrapper tooltipMessage={t('non_po_based_report:emailReport.tooltip')}>
                  <div className={styles.helpIconContainer}>
                    <SVGIcon
                      name="emailReport"
                      size={25}
                      className="cursor-pointer"
                      alt="help"
                      onClick={() => {
                        getPDFData()
                        startTransition(() => {
                          setEmailReportState(true)
                        })
                      }}
                    />
                  </div>
                </TooltipWrapper>
                <TooltipWrapper tooltipMessage={t('non_po_based_report:downloadReport.text')}>
                  <div className={styles.helpIconContainer} onClick={handleDownload}>
                    <SVGIcon name="download2" size={25} className="cursor-pointer" />
                  </div>
                </TooltipWrapper>
              </div>
            }
          />
          <ListWorkbench>
            <FilterBar className={`dx-invoices-filters border-b border-line-soft ${styles.filterBar}`}>
              <FilterField label={t('vendors:search')} className="w-[260px] shrink-0">
                <FilterSearch
                  placeholder={t('searchByNameOrEmail')}
                  className="dx-vendors-search-input"
                  aria-label={t('vendors:search')}
                  onChange={(e) => {
                    const value = e.target.value
                    clearTimeout(window.searchTimeout)
                    window.searchTimeout = setTimeout(() => handleSearchValue(value), 1000)
                  }}
                />
              </FilterField>
              <div className={styles.filterGroup}>
                <TableSelectBox
                  label={t('myprofile:role')}
                  options={roleOptions}
                  onFilterChange={handleFilterChange}
                  value={filters.role}
                  paramName="role"
                  placeholder={t('vendors:all')}
                  width="160px"
                />
                <TableSelectBox
                  label={t('myprofile:status')}
                  options={statusOptions}
                  onFilterChange={handleFilterChange}
                  value={filters.status}
                  paramName="status"
                  placeholder={t('vendors:all')}
                  width="160px"
                />
              </div>
            </FilterBar>
            <div className={`dx-table-wrap dx-table-wrap-scroll dx-invoices-table-wrap ${styles.usersTableWrap}`}>
              <TableLayout
                tableHeaders={headers}
                tableData={tableData}
                className="users-roles-table"
                {...tableProps}
                stickyHeader
                showPagination={false}
              />
            </div>
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={totalCount}
              pageSize={rowsPerPage}
              onPage={(p) => tableProps.handlePage(p)}
              onPageSize={(size) => tableProps.handlePerPage(size)}
              noun={t('sidebar:userManagement').toLowerCase()}
            />
          </ListWorkbench>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <EmailReportComp
          open={emailReportState}
          onClose={handleClosePopup}
          onSend={handleSendEmailReport}
          setValue={setEmailReportDateRange}
          value={emailReportDateRange}
        />
      </Suspense>
      <DownloadReportComp
        open={downloadReport}
        hideDatePicker
        onClose={handleCloseDownload}
        title="Users_list"
        onClickSubmit={handleDownloadSubmit}
        pdfComponent={<AdminUserManagementPDF data={pdfTableData} headerLabels={pdfUserHeader} />}
        NewTableComp={
          <TableLayout tableHeaders={pdfUserHeader} tableData={tableData} {...tableProps} />
        }
      />
      {/* Modal for confirmation */}
      <CustomModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEmpId(null)
        }}
        //modalStyles={{ width: 900 }}
        closeIcon>
        <p className="modalTxt">{modalMessage}</p>
        <div className="d-flex justify-content-between my-3">
          <NormalButton
            label={t('otp:cancel')}
            outlineBtn
            customClass="navigation-buttons"
            onClick={() => {
              setIsModalOpen(false)
              setEmpId(null)
            }}
          />
          <NormalButton
            label={t('otp:confirm')}
            isPrimaryModal
            customClass="navigation-buttons"
            onClick={handleConfirmDelete}
          />
        </div>
      </CustomModal>
    </LeftPageContainer>
  )
}
const mapStateToProps = (state) => ({
  myProfile: state.myProfile.profileData,
  userInfo: state.userInfo
})

const mapDispatchToProps = { showToast }

export default connect(mapStateToProps, mapDispatchToProps)(UserManagementListComp)
