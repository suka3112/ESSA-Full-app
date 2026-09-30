import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CirclePlus,
  Pencil,
  Search,
  Trash2,
  Lock,
  Check,
  X,
  Shield,
  User,
  Users as UsersIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'react-toastify'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import {
  getEssaUsersAndRoles,
  createEssaUser,
  updateEssaUser,
  manageEssaRole
} from '../../../api/essaUsers'
import '../../../assets/scss/essa/dashboard.scss'

const BRAND = 'var(--brand-primary-color, #2C9842)'

const PERMISSION_MODULES = [
  { module: 'Dashboard', cells: { Read: { codes: ['DASHBOARD_VIEW'], allows: 'Open the dashboard' } } },
  {
    module: 'Invoices',
    cells: {
      Read: { codes: ['INVOICE_VIEW'], allows: 'View invoices and their documents' },
      Create: { codes: ['INVOICE_UPLOAD'], allows: 'Upload an invoice manually' },
      Edit: { codes: ['INVOICE_EDIT', 'FIELD_CORRECT', 'INVOICE_REVALIDATE'], allows: 'Correct extracted fields and revalidate an invoice' },
    },
  },
  { module: 'Validation', cells: { Edit: { codes: ['VALIDATION_OVERRIDE'], allows: 'Override a failed validation check with a justification' } } },
  {
    module: 'Exceptions',
    cells: {
      Read: { codes: ['EXCEPTION_VIEW'], allows: 'Open the Exception Workbench' },
      Edit: { codes: ['EXCEPTION_MANAGE'], allows: 'Resolve, override and retry exceptions' },
    },
  },
  {
    module: 'Approvals',
    cells: {
      Read: { codes: ['APPROVAL_VIEW'], allows: 'See the approval queue' },
      Edit: { codes: ['APPROVAL_ACT'], allows: 'Approve or reject an invoice' },
    },
  },
  { module: 'Tax Review', cells: { Edit: { codes: ['TAX_REVIEW'], allows: 'Complete the tax review step' } } },
  {
    module: 'Vendors',
    cells: {
      Read: { codes: ['VENDOR_VIEW'], allows: 'View the vendor list' },
      Edit: { codes: ['VENDOR_CONTROL'], allows: 'Block or unblock a vendor on this platform' },
    },
  },
  {
    module: 'SAP',
    cells: {
      Read: { codes: ['SAP_VIEW'], allows: 'View purchase orders and SAP status' },
      Edit: { codes: ['SAP_RETRY'], allows: 'Send an invoice to SAP again' },
    },
  },
  { module: 'Attendance', cells: { Read: { codes: ['BIOMETRIC_VIEW'], allows: 'View attendance data used for validation' } } },
  {
    module: 'Configuration',
    cells: {
      Read: { codes: ['CONFIG_VIEW'], allows: 'View invoice categories, document types and rules' },
      Create: { codes: ['CONFIG_PUBLISH'], allows: 'Publish a new configuration version' },
      Edit: { codes: ['CONFIG_EDIT'], allows: 'Change categories, document types and rules' },
    },
  },
  {
    module: 'Users & Roles',
    cells: {
      Read: { codes: ['USER_ADMIN'], allows: 'View users, roles and permissions' },
      Create: { codes: ['USER_ADMIN'], allows: 'Create a role' },
      Edit: { codes: ['USER_ADMIN'], allows: 'Assign roles and change permissions' },
      Delete: { codes: ['USER_ADMIN'], allows: 'Delete a role' },
    },
  },
  { module: 'Audit Log', cells: { Read: { codes: ['AUDIT_VIEW'], allows: 'Search the audit log' } } },
  { module: 'Reports', cells: { Read: { codes: ['REPORT_VIEW'], allows: 'Open reports' } } },
]

const ACTIONS = ['Read', 'Create', 'Edit', 'Delete']

function fmtDateTime(iso) {
  if (!iso) return 'Never'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso)
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  } catch {
    return String(iso)
  }
}

function cellGranted(permissions = [], cell) {
  if (!cell || !cell.codes) return false
  return cell.codes.every((c) => permissions.includes(c))
}

function pageWindow(current, total, maxVisible = 7) {
  if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  pages.push(1)
  if (left > 2) pages.push('gap')
  for (let p = left; p <= right; p++) pages.push(p)
  if (right < total - 1) pages.push('gap')
  pages.push(total)
  return pages
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  onPageSize,
  unit = 'users'
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const pages = pageWindow(page, Math.max(1, totalPages))

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 18px',
        borderTop: '1px solid #EEF0F2',
        background: '#FFFFFF',
        fontSize: 12,
        color: '#6B7280'
      }}
    >
      <span>
        Showing {from} to {to} of {total.toLocaleString('en-US')} {unit}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 4,
            border: '1px solid #E5E7EB',
            background: '#FFFFFF',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            color: page <= 1 ? '#9CA3AF' : '#374151',
            opacity: page <= 1 ? 0.5 : 1
          }}
        >
          ‹
        </button>
        {pages.map((p, idx) =>
          p === 'gap' ? (
            <span key={`gap-${idx}`} style={{ padding: '0 4px', color: '#9CA3AF' }}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 28,
                height: 28,
                padding: '0 6px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid',
                borderColor: p === page ? BRAND : '#E5E7EB',
                background: p === page ? BRAND : '#FFFFFF',
                color: p === page ? '#FFFFFF' : '#374151',
                cursor: 'pointer'
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 4,
            border: '1px solid #E5E7EB',
            background: '#FFFFFF',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            color: page >= totalPages ? '#9CA3AF' : '#374151',
            opacity: page >= totalPages ? 0.5 : 1
          }}
        >
          ›
        </button>
      </div>
      {onPageSize && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 4,
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              fontSize: 12,
              color: '#374151'
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      )}
    </div>
  )
}

function UsersManagementComp({ userInfo: { userType = 'admin' } }) {
  const [tab, setTab] = useState('users')
  const [data, setData] = useState({ users: [], roles: [], permissions: [] })
  const [loading, setLoading] = useState(true)

  // Filters & Pagination
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Modals state
  const [newUserModal, setNewUserModal] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [editRoleIds, setEditRoleIds] = useState([])
  const [editUserEnabled, setEditUserEnabled] = useState(true)

  const [roleModal, setRoleModal] = useState(null)
  const [deleteRoleModal, setDeleteRoleModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getEssaUsersAndRoles()
      if (res) {
        setData(res)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
      toast.error('Failed to load users and roles from database')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredUsers = useMemo(() => {
    const rows = data.users || []
    const q = userSearch.trim().toLowerCase()
    return rows.filter((u) => {
      if (userRoleFilter && !u.roleIds.includes(userRoleFilter)) return false
      if (!q) return true
      return [u.name, u.email, u.title].some((v) => v?.toLowerCase().includes(q))
    })
  }, [data.users, userSearch, userRoleFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, page, pageSize])

  // Reset page to 1 when changing filters
  const handleSearchChange = (val) => {
    setUserSearch(val)
    setPage(1)
  }

  const handleRoleFilterChange = (val) => {
    setUserRoleFilter(val)
    setPage(1)
  }

  const handlePageSizeChange = (size) => {
    setPageSize(size)
    setPage(1)
  }

  // Actions
  const handleCreateUser = async () => {
    if (!newUserModal?.name?.trim() || !newUserModal?.email?.trim()) {
      toast.error('Full name and corporate email are required.')
      return
    }
    setSaving(true)
    try {
      await createEssaUser(newUserModal)
      toast.success('User added successfully.')
      setNewUserModal(null)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add user.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      await updateEssaUser(editingUser.id, {
        roleIds: editRoleIds,
        enabled: editUserEnabled
      })
      toast.success('User updated successfully.')
      setEditingUser(null)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update user.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRole = async () => {
    if (!roleModal?.name?.trim()) {
      toast.error('Role name is required.')
      return
    }
    setSaving(true)
    try {
      await manageEssaRole(roleModal.id ? 'UPDATE' : 'CREATE', {
        id: roleModal.id,
        name: roleModal.name.trim(),
        active: roleModal.active !== false,
        permissions: roleModal.permissions || []
      })
      toast.success(roleModal.id ? 'Role updated successfully.' : 'Role created successfully.')
      setRoleModal(null)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save role.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!deleteRoleModal) return
    setSaving(true)
    try {
      await manageEssaRole('DELETE', { id: deleteRoleModal.id })
      toast.success('Role deleted successfully.')
      setDeleteRoleModal(null)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete role.')
    } finally {
      setSaving(false)
    }
  }

  const toggleRolePermissionCell = (cell, on) => {
    if (!roleModal) return
    const current = new Set(roleModal.permissions || [])
    cell.codes.forEach((c) => (on ? current.add(c) : current.delete(c)))
    setRoleModal({ ...roleModal, permissions: Array.from(current) })
  }

  return (
    <div style={{ background: '#F8FAF9', padding: '16px 20px', width: '100%', boxSizing: 'border-box' }}>
      <div className="dx-page dx-stack" style={{ gap: 14, width: '100%' }}>
        {/* Top Page Header */}
        <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}` },
              { label: 'Administration' },
              { label: 'Users & Roles' }
            ]}
            title="Users, Roles & Permissions"
            description="Users are signed in with their corporate account. What they can see and do on this platform is decided by the roles assigned here."
            actions={
              tab === 'users' ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setNewUserModal({
                      name: '',
                      email: '',
                      title: '',
                      roleIds: [],
                      enabled: true
                    })
                  }
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <CirclePlus size={14} /> Add user
                </Button>
              ) : tab === 'roles' ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setRoleModal({
                      name: '',
                      active: true,
                      permissions: ['DASHBOARD_VIEW', 'INVOICE_VIEW']
                    })
                  }
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <CirclePlus size={14} /> Create role
                </Button>
              ) : null
            }
          />

          {/* Main Container Card with 3 Tabs */}
          <Card
            pad={false}
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              background: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Tab Navigation */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                borderBottom: '1px solid #EEF0F2',
                background: '#FAFAFA'
              }}
            >
              <button
                type="button"
                onClick={() => setTab('users')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: tab === 'users' ? BRAND : 'transparent',
                  color: tab === 'users' ? '#FFFFFF' : '#4B5563',
                  transition: 'all 0.15s ease'
                }}
              >
                Users ({data.users.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('roles')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: tab === 'roles' ? BRAND : 'transparent',
                  color: tab === 'roles' ? '#FFFFFF' : '#4B5563',
                  transition: 'all 0.15s ease'
                }}
              >
                Roles ({data.roles.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('matrix')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: tab === 'matrix' ? BRAND : 'transparent',
                  color: tab === 'matrix' ? '#FFFFFF' : '#4B5563',
                  transition: 'all 0.15s ease'
                }}
              >
                Permission Matrix
              </button>
            </div>

            {/* TAB 1: USERS */}
            {tab === 'users' && (
              <div>
                {/* Search & Role Filter Bar */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    gap: 12,
                    padding: '12px 18px',
                    borderBottom: '1px solid #EEF0F2',
                    background: '#FAFAFA'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                      Search
                    </label>
                    <div style={{ position: 'relative', minWidth: 260 }}>
                      <Search
                        size={14}
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}
                      />
                      <input
                        className="dx-input"
                        value={userSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Name, email or job title…"
                        style={{ paddingLeft: 30, height: 34, fontSize: 12, width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                      Role
                    </label>
                    <select
                      className="dx-select"
                      value={userRoleFilter}
                      onChange={(e) => handleRoleFilterChange(e.target.value)}
                      style={{ height: 34, fontSize: 12, minWidth: 160 }}
                    >
                      <option value="">Any role</option>
                      {data.roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Users Data Table */}
                <div
                  className="dx-table-wrap"
                  style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 370px)',
                    position: 'relative'
                  }}
                >
                  <table className="dx-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND }}>
                      <tr style={{ background: BRAND, borderBottom: '1px solid #E5E7EB' }}>
                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                          User
                        </th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                          Job Title
                        </th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                          Roles
                        </th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                          Last Sign In
                        </th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'center' }}>
                          Status
                        </th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'center', width: 80 }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                            Loading users from database…
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                            No users match the search criteria.
                          </td>
                        </tr>
                      ) : (
                        pagedUsers.map((u) => {
                          const initials = (u.name || 'User')
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()

                          return (
                            <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 30,
                                      height: 30,
                                      borderRadius: '50%',
                                      background: BRAND,
                                      color: '#FFFFFF',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      flexShrink: 0
                                    }}
                                  >
                                    {initials}
                                  </span>
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{u.name}</div>
                                    <div style={{ fontSize: 11, color: '#6B7280' }}>{u.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151' }}>
                                {u.title || 'Portal User'}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                {!u.roleNames?.length || u.roleNames[0] === 'No access' ? (
                                  <span style={{ fontSize: 11, fontStyle: 'italic', color: '#9CA3AF' }}>No access</span>
                                ) : (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {u.roleNames.map((rn) => (
                                      <span
                                        key={rn}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          borderRadius: 4,
                                          padding: '2px 8px',
                                          fontSize: 10,
                                          fontWeight: 600,
                                          background: '#E0F2FE',
                                          color: '#0369A1',
                                          border: '1px solid #BAE6FD'
                                        }}
                                      >
                                        {rn}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 11, color: '#4B5563', whiteSpace: 'nowrap' }}>
                                {fmtDateTime(u.lastLoginAt)}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    borderRadius: 4,
                                    padding: '2px 8px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: u.enabled ? '#E6F5EA' : '#F3F4F6',
                                    color: u.enabled ? '#2D9A47' : '#6B7280',
                                    border: `1px solid ${u.enabled ? '#B5E3C4' : '#E5E7EB'}`
                                  }}
                                >
                                  {u.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={`Edit ${u.name}`}
                                  onClick={() => {
                                    setEditingUser(u)
                                    setEditRoleIds(u.roleIds || [])
                                    setEditUserEnabled(u.enabled !== false)
                                  }}
                                  style={{ padding: '4px 8px', borderRadius: 6 }}
                                >
                                  <Pencil size={13} style={{ color: '#4B5563' }} />
                                </Button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Users Pagination */}
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={filteredUsers.length}
                  pageSize={pageSize}
                  onPage={setPage}
                  onPageSize={handlePageSizeChange}
                  unit="users"
                />
              </div>
            )}

            {/* TAB 2: ROLES */}
            {tab === 'roles' && (
              <div
                className="dx-table-wrap"
                style={{
                  overflowX: 'auto',
                  overflowY: 'auto',
                  maxHeight: 'calc(100vh - 315px)',
                  position: 'relative'
                }}
              >
                <table className="dx-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND }}>
                    <tr style={{ background: BRAND, borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                        Role
                      </th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'center', width: 120 }}>
                        Users
                      </th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'center', width: 120 }}>
                        Status
                      </th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'center', width: 100 }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.roles.map((r) => {
                      const userCount = data.users.filter((u) => u.roleIds.includes(r.id)).length
                      const isEnabled = r.active !== false

                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1F2937', fontSize: 13 }}>
                            {r.name}
                            {r.system && (
                              <span style={{ marginLeft: 8, fontSize: 10, color: '#6B7280', fontWeight: 400 }}>
                                (System)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                            {userCount}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: 4,
                                padding: '2px 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: isEnabled ? '#E6F5EA' : '#F3F4F6',
                                color: isEnabled ? '#2D9A47' : '#6B7280',
                                border: `1px solid ${isEnabled ? '#B5E3C4' : '#E5E7EB'}`
                              }}
                            >
                              {isEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                              <Button
                                size="sm"
                                variant="ghost"
                                title={`Manage permissions for ${r.name}`}
                                onClick={() =>
                                  setRoleModal({
                                    id: r.id,
                                    name: r.name,
                                    active: isEnabled,
                                    permissions: [...(r.permissions || [])],
                                    system: r.system
                                  })
                                }
                                style={{ padding: '4px 8px', borderRadius: 6 }}
                              >
                                <Pencil size={13} style={{ color: '#4B5563' }} />
                              </Button>

                              {!r.system && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={`Delete ${r.name}`}
                                  onClick={() => setDeleteRoleModal(r)}
                                  style={{ padding: '4px 8px', borderRadius: 6, color: '#DC2626' }}
                                >
                                  <Trash2 size={13} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: PERMISSION MATRIX */}
            {tab === 'matrix' && (
              <div style={{ padding: 18 }}>
                <p style={{ margin: '0 0 14px', fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                  Each row is something a person can do. A tick (<strong style={{ color: BRAND }}>✓</strong>) means the
                  role is allowed to do it; read the row to see which roles have a permission, read a column to see
                  everything a role can do.
                </p>

                <div
                  style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 370px)',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    position: 'relative'
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#F9FAFB' }}>
                      <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#F9FAFB', padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', minWidth: 120 }}>
                          Area
                        </th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#F9FAFB', padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', minWidth: 80 }}>
                          Permission
                        </th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#F9FAFB', padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', minWidth: 240 }}>
                          What it allows
                        </th>
                        {data.roles.map((r) => (
                          <th
                            key={r.id}
                            style={{
                              position: 'sticky',
                              top: 0,
                              zIndex: 5,
                              background: BRAND,
                              color: '#FFFFFF',
                              padding: '10px 14px',
                              textAlign: 'center',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              minWidth: 100
                            }}
                          >
                            {r.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_MODULES.flatMap((m) =>
                        ACTIONS.filter((a) => m.cells[a]).map((a, idx) => {
                          const cell = m.cells[a]
                          return (
                            <tr
                              key={`${m.module}-${a}`}
                              style={{
                                borderTop: idx === 0 ? '1px solid #E5E7EB' : '1px solid #F3F4F6',
                                background: idx === 0 ? '#FAFBFA' : '#FFFFFF'
                              }}
                            >
                              <td style={{ padding: '8px 14px', fontWeight: idx === 0 ? 700 : 400, color: '#1F2937' }}>
                                {idx === 0 ? m.module : ''}
                              </td>
                              <td style={{ padding: '8px 14px', color: '#4B5563', fontWeight: 500 }}>
                                {a}
                              </td>
                              <td style={{ padding: '8px 14px', color: '#6B7280', fontSize: 11 }}>
                                {cell.allows}
                              </td>
                              {data.roles.map((r) => {
                                const granted = cellGranted(r.permissions, cell)
                                return (
                                  <td
                                    key={r.id}
                                    style={{
                                      padding: '8px 14px',
                                      textAlign: 'center',
                                      borderLeft: '1px solid #F3F4F6'
                                    }}
                                  >
                                    {granted ? (
                                      <span style={{ color: BRAND, fontWeight: 700, fontSize: 14 }}>✓</span>
                                    ) : (
                                      <span style={{ color: '#D1D5DB' }}>—</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>

      {/* ----------------- MODAL 1: ADD USER ----------------- */}
      {newUserModal && (
        <Dialog
          open={Boolean(newUserModal)}
          onClose={() => setNewUserModal(null)}
          title="Add user"
          width={560}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p
              style={{
                margin: 0,
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid #E5E7EB',
                background: '#F6F8F7',
                fontSize: 11,
                color: '#4B5563',
                lineHeight: 1.5
              }}
            >
              This does not create a password. The person signs in with their ESSA corporate account — adding them here
              is what gives that account access to this platform, and the roles decide what they can do.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>
                  Full name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  className="dx-input"
                  value={newUserModal.name}
                  onChange={(e) => setNewUserModal({ ...newUserModal, name: e.target.value })}
                  placeholder="e.g. Dewi Lestari"
                  style={{ height: 34, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>
                  Corporate email <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="email"
                  className="dx-input"
                  value={newUserModal.email}
                  onChange={(e) => setNewUserModal({ ...newUserModal, email: e.target.value })}
                  placeholder="e.g. dewi.lestari@essa.com"
                  style={{ height: 34, fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>Job title</label>
              <input
                className="dx-input"
                value={newUserModal.title}
                onChange={(e) => setNewUserModal({ ...newUserModal, title: e.target.value })}
                placeholder="e.g. AP Processor"
                style={{ height: 34, fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>Roles</label>
              <div
                style={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  border: '1px solid #E5E7EB',
                  borderRadius: 6,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  background: '#FFFFFF'
                }}
              >
                {data.roles.map((r) => (
                  <label
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: 4
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newUserModal.roleIds.includes(r.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...newUserModal.roleIds, r.id]
                          : newUserModal.roleIds.filter((x) => x !== r.id)
                        setNewUserModal({ ...newUserModal, roleIds: next })
                      }}
                      style={{ marginTop: 2, accentColor: BRAND }}
                    />
                    <div>
                      <span style={{ fontWeight: 600, color: '#1F2937' }}>{r.name}</span>
                      {r.description && (
                        <span style={{ display: 'block', fontSize: 10, color: '#6B7280' }}>
                          {r.description}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>Status</label>
              <select
                className="dx-select"
                value={newUserModal.enabled ? 'enabled' : 'disabled'}
                onChange={(e) => setNewUserModal({ ...newUserModal, enabled: e.target.value === 'enabled' })}
                style={{ height: 34, fontSize: 12 }}
              >
                <option value="enabled">Enabled — they can sign in now</option>
                <option value="disabled">Disabled — add the account but keep it closed for now</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <Button variant="ghost" onClick={() => setNewUserModal(null)}>
                Cancel
              </Button>
              <Button loading={saving} onClick={handleCreateUser}>
                Add user
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ----------------- MODAL 2: EDIT USER ----------------- */}
      {editingUser && (
        <Dialog
          open={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title={`Edit user — ${editingUser.name}`}
          width={500}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
              A user with no role has no access to the platform.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>Roles</label>
              <div
                style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: '1px solid #E5E7EB',
                  borderRadius: 6,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                {data.roles.map((r) => (
                  <label
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: '4px 6px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={editRoleIds.includes(r.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...editRoleIds, r.id]
                          : editRoleIds.filter((x) => x !== r.id)
                        setEditRoleIds(next)
                      }}
                      style={{ accentColor: BRAND }}
                    />
                    <span style={{ fontWeight: 500, color: '#1F2937' }}>{r.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1F2937', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editUserEnabled}
                onChange={(e) => setEditUserEnabled(e.target.checked)}
                style={{ accentColor: BRAND }}
              />
              <span>User enabled — can sign in to the platform</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <Button variant="ghost" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button loading={saving} onClick={handleUpdateUser}>
                Save
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ----------------- MODAL 3: ROLE EDITOR ----------------- */}
      {roleModal && (
        <Dialog
          open={Boolean(roleModal)}
          onClose={() => setRoleModal(null)}
          title={roleModal.id ? `Edit role — ${roleModal.name}` : 'Create role'}
          width={680}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>
                  Role name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  className="dx-input"
                  value={roleModal.name}
                  onChange={(e) => setRoleModal({ ...roleModal, name: e.target.value })}
                  placeholder="e.g. AP Supervisor"
                  style={{ height: 34, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>Status</label>
                <select
                  className="dx-select"
                  value={roleModal.active ? 'enabled' : 'disabled'}
                  onChange={(e) => setRoleModal({ ...roleModal, active: e.target.value === 'enabled' })}
                  style={{ height: 34, fontSize: 12 }}
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>Permissions</label>
              <div
                style={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  border: '1px solid #E5E7EB',
                  borderRadius: 6
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#FAFBFA', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#4B5563' }}>Area</th>
                      {ACTIONS.map((a) => (
                        <th key={a} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#4B5563' }}>
                          {a}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MODULES.map((m) => (
                      <tr key={m.module} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '6px 12px', fontWeight: 600, color: '#1F2937' }}>{m.module}</td>
                        {ACTIONS.map((a) => {
                          const cell = m.cells[a]
                          if (!cell) {
                            return (
                              <td key={a} style={{ padding: '6px 12px', textAlign: 'center', color: '#D1D5DB' }}>
                                —
                              </td>
                            )
                          }
                          const isChecked = cellGranted(roleModal.permissions, cell)
                          return (
                            <td key={a} style={{ padding: '6px 12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                title={cell.allows}
                                checked={isChecked}
                                onChange={(e) => toggleRolePermissionCell(cell, e.target.checked)}
                                style={{ accentColor: BRAND }}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p style={{ margin: 0, padding: '8px 12px', borderRadius: 6, background: '#F6F8F7', fontSize: 11, color: '#6B7280' }}>
              These permissions decide both what appears in the menu and what the platform allows — the two always match.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <Button variant="ghost" onClick={() => setRoleModal(null)}>
                Cancel
              </Button>
              <Button loading={saving} onClick={handleSaveRole}>
                {roleModal.id ? 'Save role' : 'Create role'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ----------------- MODAL 4: DELETE ROLE ----------------- */}
      {deleteRoleModal && (
        <Dialog
          open={Boolean(deleteRoleModal)}
          onClose={() => setDeleteRoleModal(null)}
          title={`Delete role — ${deleteRoleModal.name}`}
          width={460}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>
              {data.users.some((u) => u.roleIds.includes(deleteRoleModal.id))
                ? 'This role is still assigned to users — remove the assignments first, or disable the role instead of deleting it.'
                : 'This permanently removes the role. Nobody currently holds it, so no user is affected.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <Button variant="ghost" onClick={() => setDeleteRoleModal(null)}>
                Cancel
              </Button>
              <Button
                variant="warning"
                loading={saving}
                onClick={handleDeleteRole}
                disabled={data.users.some((u) => u.roleIds.includes(deleteRoleModal.id))}
                style={{ background: '#DC2626', color: '#FFF' }}
              >
                Delete role
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo || {}
})

export default connect(mapStateToProps)(UsersManagementComp)
