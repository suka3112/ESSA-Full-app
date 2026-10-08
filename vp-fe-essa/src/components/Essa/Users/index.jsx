import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, CirclePlus, Loader2, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import {
  getEssaUsersAndRoles,
  createEssaUser,
  updateEssaUser,
  manageEssaRole
} from '../../../api/essaUsers'
import { DASHBOARD } from '../../../constants/url'
import '../../../assets/scss/essa/dashboard.scss'

const PERMISSION_MODULES = [
  { module: 'Dashboard', cells: { Read: { codes: ['DASHBOARD_VIEW'], allows: 'Open the dashboard' } } },
  {
    module: 'Invoices',
    cells: {
      Read: { codes: ['INVOICE_VIEW'], allows: 'View invoices and their documents' },
      Create: { codes: ['INVOICE_UPLOAD'], allows: 'Upload an invoice manually' },
      Edit: { codes: ['INVOICE_EDIT', 'FIELD_CORRECT', 'INVOICE_REVALIDATE'], allows: 'Correct extracted fields and revalidate an invoice' }
    }
  },
  { module: 'Validation', cells: { Edit: { codes: ['VALIDATION_OVERRIDE'], allows: 'Override a failed validation check with a justification' } } },
  {
    module: 'Exceptions',
    cells: {
      Read: { codes: ['EXCEPTION_VIEW'], allows: 'Open the Exception Workbench' },
      Edit: { codes: ['EXCEPTION_MANAGE'], allows: 'Resolve, override and retry exceptions' }
    }
  },
  {
    module: 'Approvals',
    cells: {
      Read: { codes: ['APPROVAL_VIEW'], allows: 'See the approval queue' },
      Edit: { codes: ['APPROVAL_ACT'], allows: 'Approve or reject an invoice' }
    }
  },
  { module: 'Tax Review', cells: { Edit: { codes: ['TAX_REVIEW'], allows: 'Complete the tax review step' } } },
  {
    module: 'Vendors',
    cells: {
      Read: { codes: ['VENDOR_VIEW'], allows: 'View the vendor list' },
      Edit: { codes: ['VENDOR_CONTROL'], allows: 'Block or unblock a vendor on this platform' }
    }
  },
  {
    module: 'SAP',
    cells: {
      Read: { codes: ['SAP_VIEW'], allows: 'View purchase orders and SAP status' },
      Edit: { codes: ['SAP_RETRY'], allows: 'Send an invoice to SAP again' }
    }
  },
  { module: 'Attendance', cells: { Read: { codes: ['BIOMETRIC_VIEW'], allows: 'View attendance data used for validation' } } },
  {
    module: 'Configuration',
    cells: {
      Read: { codes: ['CONFIG_VIEW'], allows: 'View invoice categories, document types and rules' },
      Create: { codes: ['CONFIG_PUBLISH'], allows: 'Publish a new configuration version' },
      Edit: { codes: ['CONFIG_EDIT'], allows: 'Change categories, document types and rules' }
    }
  },
  {
    module: 'Users & Roles',
    cells: {
      Read: { codes: ['USER_ADMIN'], allows: 'View users, roles and permissions' },
      Create: { codes: ['USER_ADMIN'], allows: 'Create a role' },
      Edit: { codes: ['USER_ADMIN'], allows: 'Assign roles and change permissions' },
      Delete: { codes: ['USER_ADMIN'], allows: 'Delete a role' }
    }
  },
  { module: 'Audit Log', cells: { Read: { codes: ['AUDIT_VIEW'], allows: 'Search the audit log' } } },
  { module: 'Reports', cells: { Read: { codes: ['REPORT_VIEW'], allows: 'Open reports' } } }
]

const ACTIONS = ['Read', 'Create', 'Edit', 'Delete']

function roleEnabled(role) {
  return role?.active !== false
}

function cellGranted(permissions = [], cell) {
  if (!cell?.codes) return false
  return cell.codes.every((code) => permissions.includes(code))
}

function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

function initials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function nextSort(current, key) {
  if (current.key !== key) return { key, dir: 'asc' }
  if (current.dir === 'asc') return { key, dir: 'desc' }
  return { key: '', dir: '' }
}

function compareValues(a, b, dir) {
  const left = a == null ? '' : a
  const right = b == null ? '' : b
  const result = String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
  return dir === 'desc' ? -result : result
}

function SortTh({ label, column, sort, onSort, align }) {
  const active = sort.key === column
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={align === 'center' ? 'is-center' : undefined}>
      <button type="button" className={`ur-sort${active ? '' : ' ur-sort-idle'}`} onClick={() => onSort(column)}>
        {label}
        <Icon size={12} />
      </button>
    </th>
  )
}

function StatusBadge({ enabled }) {
  return <span className={`ur-badge ${enabled ? 'ur-badge-success' : 'ur-badge-neutral'}`}>{enabled ? 'Enabled' : 'Disabled'}</span>
}

function Field({ label, required, hint, children }) {
  return (
    <label className="ur-field">
      <span className="ur-field-label">
        {label} {required ? <span className="ur-req">*</span> : null}
      </span>
      {children}
      {hint ? <span className="ur-hint">{hint}</span> : null}
    </label>
  )
}

function UsersManagementComp({ userInfo: { userType = 'admin' } = {} }) {
  const [tab, setTab] = useState('users')
  const [data, setData] = useState({ users: [], roles: [], permissions: [] })
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userSort, setUserSort] = useState({ key: '', dir: '' })
  const [roleSort, setRoleSort] = useState({ key: '', dir: '' })

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
      if (res) setData(res)
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
    const matched = rows.filter((user) => {
      if (userRoleFilter && !(user.roleIds || []).includes(userRoleFilter)) return false
      if (!q) return true
      return [user.name, user.email, user.title].some((value) => value?.toLowerCase().includes(q))
    })
    if (!userSort.key) return matched
    const valueOf = (user) => {
      if (userSort.key === 'name') return user.name
      if (userSort.key === 'title') return user.title
      if (userSort.key === 'roles') return user.roleNames?.length ? user.roleNames.join(', ') : 'No access'
      if (userSort.key === 'login') return user.lastLoginAt || ''
      if (userSort.key === 'enabled') return user.enabled ? 'Enabled' : 'Disabled'
      return ''
    }
    return [...matched].sort((a, b) => compareValues(valueOf(a), valueOf(b), userSort.dir))
  }, [data.users, userSearch, userRoleFilter, userSort])

  const sortedRoles = useMemo(() => {
    const roles = data.roles || []
    if (!roleSort.key) return roles
    const countOf = (role) => (data.users || []).filter((user) => (user.roleIds || []).includes(role.id)).length
    const valueOf = (role) => {
      if (roleSort.key === 'name') return role.name
      if (roleSort.key === 'users') return countOf(role)
      if (roleSort.key === 'status') return roleEnabled(role) ? 'Enabled' : 'Disabled'
      return ''
    }
    return [...roles].sort((a, b) => compareValues(valueOf(a), valueOf(b), roleSort.dir))
  }, [data.roles, data.users, roleSort])

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
    cell.codes.forEach((code) => (on ? current.add(code) : current.delete(code)))
    setRoleModal({ ...roleModal, permissions: Array.from(current) })
  }

  const openRoleEditor = (role) => {
    if (role) {
      setRoleModal({
        id: role.id,
        name: role.name,
        active: roleEnabled(role),
        permissions: [...(role.permissions || [])],
        system: role.system
      })
      return
    }
    setRoleModal({ name: '', active: true, permissions: [] })
  }

  const tabs = [
    { key: 'users', label: `Users (${data.users.length})` },
    { key: 'roles', label: `Roles (${data.roles.length})` },
    { key: 'matrix', label: 'Permission Matrix' }
  ]

  return (
    <LeftPageContainer>
      <div className="essa-dashboard ur-page">
        <style>{pageCss}</style>
        <div className="ur-stack">
          <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}${DASHBOARD}` },
              { label: 'Administration' },
              { label: 'Users & Roles' }
            ]}
            title="Users, Roles & Permissions"
            description="Users are signed in with their corporate account. What they can see and do on this platform is decided by the roles assigned here."
            actions={
              tab === 'users' ? (
                <Button size="sm" className="ur-add" onClick={() => setNewUserModal({ name: '', email: '', title: '', roleIds: [], enabled: true })}>
                  <CirclePlus size={13} /> Add user
                </Button>
              ) : tab === 'roles' ? (
                <Button size="sm" className="ur-add" onClick={() => openRoleEditor()}>
                  <CirclePlus size={13} /> Create role
                </Button>
              ) : null
            }
          />

          <Card pad={false}>
            <div className="ur-tabs" role="tablist">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.key}
                  className={tab === item.key ? 'is-active' : undefined}
                  onClick={() => setTab(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === 'users' && (
              <>
                <div className="ur-filters">
                  <span className="ur-filter">
                    <span className="ur-filter-label">Search</span>
                    <span className="ur-search">
                      <Search size={14} />
                      <Input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Name, email or job title…"
                        aria-label="Search users"
                      />
                    </span>
                  </span>
                  <span className="ur-filter">
                    <span className="ur-filter-label">Role</span>
                    <select className="ur-select" value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} aria-label="Role filter">
                      <option value="">Any role</option>
                      {(data.roles || []).map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </span>
                </div>
                <div className="ur-table-wrap">
                  <table className="ur-table">
                    <thead>
                      <tr>
                        <SortTh label="User" column="name" sort={userSort} onSort={(key) => setUserSort((current) => nextSort(current, key))} />
                        <SortTh label="Job Title" column="title" sort={userSort} onSort={(key) => setUserSort((current) => nextSort(current, key))} />
                        <SortTh label="Roles" column="roles" sort={userSort} onSort={(key) => setUserSort((current) => nextSort(current, key))} />
                        <SortTh label="Last Sign In" column="login" sort={userSort} onSort={(key) => setUserSort((current) => nextSort(current, key))} />
                        <SortTh label="Status" column="enabled" sort={userSort} onSort={(key) => setUserSort((current) => nextSort(current, key))} />
                        <th className="is-center ur-sticky">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr className="ur-state-row">
                          <td colSpan={6}>
                            <div className="ur-state">
                              <Loader2 size={18} className="ur-spin" />
                              <p>Loading users…</p>
                            </div>
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr className="ur-state-row">
                          <td colSpan={6}>
                            <div className="ur-state">
                              <p className="ur-state-title">No matching results</p>
                              <p>{userSearch ? `Nothing matches “${userSearch}”.` : 'No users to show.'}</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user, index) => (
                          <tr key={user.id} className={index % 2 === 1 ? 'is-zebra' : undefined}>
                            <td>
                              <span className="ur-user">
                                <span className="ur-avatar">{initials(user.name) || '—'}</span>
                                <span>
                                  <span className="ur-name">{user.name}</span>
                                  <span className="ur-email">{user.email}</span>
                                </span>
                              </span>
                            </td>
                            <td><span className="ur-small">{user.title || '—'}</span></td>
                            <td>
                              {!user.roleNames?.length ? (
                                <span className="ur-none">No access</span>
                              ) : (
                                <span className="ur-roles">
                                  {user.roleNames.map((name) => (
                                    <span key={name} className="ur-badge ur-badge-info">{name}</span>
                                  ))}
                                </span>
                              )}
                            </td>
                            <td><span className="ur-tiny">{user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : 'Never'}</span></td>
                            <td><StatusBadge enabled={user.enabled !== false} /></td>
                            <td className="is-center ur-sticky">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="ur-icon"
                                aria-label={`Edit ${user.name}`}
                                title="Assign roles and enable or disable this user"
                                onClick={() => {
                                  setEditingUser(user)
                                  setEditRoleIds(user.roleIds || [])
                                  setEditUserEnabled(user.enabled !== false)
                                }}
                              >
                                <Pencil size={13} />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === 'roles' && (
              <div className="ur-table-wrap">
                <table className="ur-table">
                  <thead>
                    <tr>
                      <SortTh label="Role" column="name" sort={roleSort} onSort={(key) => setRoleSort((current) => nextSort(current, key))} />
                      <SortTh label="Users" column="users" sort={roleSort} onSort={(key) => setRoleSort((current) => nextSort(current, key))} align="center" />
                      <SortTh label="Status" column="status" sort={roleSort} onSort={(key) => setRoleSort((current) => nextSort(current, key))} />
                      <th className="is-center ur-sticky">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr className="ur-state-row">
                        <td colSpan={4}>
                          <div className="ur-state">
                            <Loader2 size={18} className="ur-spin" />
                            <p>Loading roles…</p>
                          </div>
                        </td>
                      </tr>
                    ) : sortedRoles.length === 0 ? (
                      <tr className="ur-state-row">
                        <td colSpan={4}>
                          <div className="ur-state">
                            <p className="ur-state-title">No roles</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedRoles.map((role, index) => {
                        const userCount = (data.users || []).filter((user) => (user.roleIds || []).includes(role.id)).length
                        return (
                          <tr key={role.id} className={index % 2 === 1 ? 'is-zebra' : undefined}>
                            <td><span className="ur-name">{role.name}</span></td>
                            <td className="is-center">{userCount}</td>
                            <td><StatusBadge enabled={roleEnabled(role)} /></td>
                            <td className="is-center ur-sticky">
                              <span className="ur-actions">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="ur-icon"
                                  aria-label={`Manage permissions for ${role.name}`}
                                  title="Manage permissions, rename, enable or disable"
                                  onClick={() => openRoleEditor(role)}
                                >
                                  <Pencil size={13} />
                                </Button>
                                {!role.system && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="ur-icon ur-icon-danger"
                                    aria-label={`Delete ${role.name}`}
                                    title="Delete this role"
                                    onClick={() => setDeleteRoleModal(role)}
                                  >
                                    <Trash2 size={13} />
                                  </Button>
                                )}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'matrix' && (
              <div className="ur-matrix">
                <p>
                  Each row is something a person can do. A tick means the role is allowed to do it; read the row to see which
                  roles have a permission, read a column to see everything a role can do.
                </p>
                <div className="ur-matrix-wrap">
                  <table className="ur-matrix-table">
                    <thead>
                      <tr>
                        <th className="ur-sticky-col">Area</th>
                        <th>Permission</th>
                        <th>What it allows</th>
                        {(data.roles || []).map((role) => (
                          <th key={role.id} className="ur-role-col">{role.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_MODULES.flatMap((module) =>
                        ACTIONS.filter((action) => module.cells[action]).map((action, index) => {
                          const cell = module.cells[action]
                          return (
                            <tr key={`${module.module}-${action}`} className={index === 0 ? 'is-group' : undefined}>
                              <td className="ur-sticky-col ur-area">{index === 0 ? module.module : ''}</td>
                              <td className="ur-perm">{action}</td>
                              <td className="ur-allows">{cell.allows}</td>
                              {(data.roles || []).map((role) => {
                                const granted = cellGranted(role.permissions, cell)
                                return (
                                  <td key={role.id} className="is-center">
                                    {granted ? (
                                      <span className="ur-tick" title={`${role.name} can ${cell.allows.toLowerCase()}`}>✓</span>
                                    ) : (
                                      <span className="ur-dash" title={`${role.name} cannot ${cell.allows.toLowerCase()}`}>—</span>
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

        <Dialog
          open={Boolean(newUserModal)}
          onClose={() => !saving && setNewUserModal(null)}
          title="Add user"
          width={768}
          footer={
            <>
              <Button variant="ghost" className="ur-dialog-btn" onClick={() => setNewUserModal(null)} disabled={saving}>Cancel</Button>
              <Button className="ur-dialog-btn ur-dialog-primary" disabled={saving || !newUserModal?.name?.trim() || !newUserModal?.email?.trim()} onClick={handleCreateUser}>
                {saving ? 'Adding…' : 'Add user'}
              </Button>
            </>
          }
        >
          {newUserModal && (
            <div className="ur-form">
              <p className="ur-note">
                This does not create a password. The person signs in with their ESSA corporate account — adding them here
                is what gives that account access to this platform, and the roles decide what they can do.
              </p>
              <div className="ur-grid">
                <Field label="Full name" required>
                  <Input value={newUserModal.name} placeholder="e.g. Dewi Lestari" onChange={(e) => setNewUserModal((user) => user && ({ ...user, name: e.target.value }))} />
                </Field>
                <Field label="Corporate email" required hint="The address they sign in with">
                  <Input type="email" value={newUserModal.email} placeholder="e.g. dewi.lestari@essa.co.id" onChange={(e) => setNewUserModal((user) => user && ({ ...user, email: e.target.value }))} />
                </Field>
              </div>
              <Field label="Job title" hint="Shown on the users list; it does not affect what they can do">
                <Input value={newUserModal.title} placeholder="e.g. AP Processor" onChange={(e) => setNewUserModal((user) => user && ({ ...user, title: e.target.value }))} />
              </Field>
              <Field label="Roles" hint="What the person can see and do. Leave every role unticked to add the account with no access yet.">
                <div className="ur-checks">
                  {(data.roles || []).map((role) => (
                    <label key={role.id} className="ur-check">
                      <input
                        type="checkbox"
                        checked={newUserModal.roleIds.includes(role.id)}
                        onChange={(e) => setNewUserModal((user) => user && ({
                          ...user,
                          roleIds: e.target.checked ? [...user.roleIds, role.id] : user.roleIds.filter((id) => id !== role.id)
                        }))}
                      />
                      <span>
                        <span className="ur-check-name">{role.name}</span>
                        {role.description ? <span className="ur-check-desc">{role.description}</span> : null}
                      </span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Status">
                <select className="ur-select ur-select-full" value={newUserModal.enabled ? 'enabled' : 'disabled'} onChange={(e) => setNewUserModal((user) => user && ({ ...user, enabled: e.target.value === 'enabled' }))}>
                  <option value="enabled">Enabled — they can sign in now</option>
                  <option value="disabled">Disabled — add the account but keep it closed for now</option>
                </select>
              </Field>
            </div>
          )}
        </Dialog>

        <Dialog
          open={Boolean(editingUser)}
          onClose={() => !saving && setEditingUser(null)}
          title={`Edit user — ${editingUser?.name || ''}`}
          width={520}
          footer={
            <>
              <Button variant="ghost" className="ur-dialog-btn" onClick={() => setEditingUser(null)} disabled={saving}>Cancel</Button>
              <Button className="ur-dialog-btn ur-dialog-primary" disabled={saving} onClick={handleUpdateUser}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          }
        >
          {editingUser && (
            <div className="ur-form">
              <Field label="Roles" hint="A user with no role has no access to the platform.">
                <div className="ur-role-list">
                  {(data.roles || []).filter(roleEnabled).map((role) => (
                    <label key={role.id} className="ur-role-option">
                      <input
                        type="checkbox"
                        checked={editRoleIds.includes(role.id)}
                        onChange={(e) => setEditRoleIds((prev) => (e.target.checked ? [...prev, role.id] : prev.filter((id) => id !== role.id)))}
                      />
                      <span className="ur-check-name">{role.name}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <label className="ur-enable">
                <input type="checkbox" checked={editUserEnabled} onChange={(e) => setEditUserEnabled(e.target.checked)} />
                User enabled — can sign in to the platform
              </label>
            </div>
          )}
        </Dialog>

        <Dialog
          open={Boolean(roleModal)}
          onClose={() => !saving && setRoleModal(null)}
          title={roleModal?.id ? `Edit role — ${roleModal.name}` : 'Create role'}
          width={768}
          footer={
            <>
              <Button variant="ghost" className="ur-dialog-btn" onClick={() => setRoleModal(null)} disabled={saving}>Cancel</Button>
              <Button className="ur-dialog-btn ur-dialog-primary" disabled={saving || !roleModal?.name?.trim()} onClick={handleSaveRole}>
                {saving ? 'Saving…' : roleModal?.id ? 'Save role' : 'Create role'}
              </Button>
            </>
          }
        >
          {roleModal && (
            <div className="ur-form">
              <div className="ur-grid">
                <Field label="Role name" required>
                  <Input value={roleModal.name} placeholder="e.g. AP Supervisor" onChange={(e) => setRoleModal((role) => role && ({ ...role, name: e.target.value }))} />
                </Field>
                <Field label="Status">
                  <select className="ur-select ur-select-full" value={roleModal.active ? 'enabled' : 'disabled'} onChange={(e) => setRoleModal((role) => role && ({ ...role, active: e.target.value === 'enabled' }))}>
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </Field>
              </div>
              <Field label="Permissions">
                <div className="ur-perm-wrap">
                  <table className="ur-perm-table">
                    <thead>
                      <tr>
                        <th>Area</th>
                        {ACTIONS.map((action) => <th key={action} className="is-center">{action}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_MODULES.map((module) => (
                        <tr key={module.module}>
                          <td className="ur-area">{module.module}</td>
                          {ACTIONS.map((action) => {
                            const cell = module.cells[action]
                            if (!cell) return <td key={action} className="is-center ur-dash">—</td>
                            return (
                              <td key={action} className="is-center">
                                <input
                                  type="checkbox"
                                  aria-label={`${module.module} — ${action}`}
                                  title={cell.allows}
                                  checked={cellGranted(roleModal.permissions, cell)}
                                  onChange={(e) => toggleRolePermissionCell(cell, e.target.checked)}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Field>
              <p className="ur-note">
                These permissions decide both what appears in the menu and what the platform allows — the two always match.
              </p>
            </div>
          )}
        </Dialog>

        <Dialog
          open={Boolean(deleteRoleModal)}
          onClose={() => !saving && setDeleteRoleModal(null)}
          title={`Delete role — ${deleteRoleModal?.name || ''}`}
          width={480}
          footer={
            <>
              <Button variant="ghost" className="ur-dialog-btn" onClick={() => setDeleteRoleModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="danger" className="ur-dialog-btn" disabled={saving} onClick={handleDeleteRole}>
                {saving ? 'Deleting…' : 'Delete role'}
              </Button>
            </>
          }
        >
          <p className="ur-delete-copy">
            {deleteRoleModal && (data.users || []).some((user) => (user.roleIds || []).includes(deleteRoleModal.id))
              ? 'This role is still assigned to users — remove the assignments first, or disable the role instead of deleting it.'
              : 'This permanently removes the role. Nobody currently holds it, so no user is affected.'}
          </p>
        </Dialog>
      </div>
    </LeftPageContainer>
  )
}

const pageCss = `
.ur-page .ur-stack{display:flex;flex-direction:column;gap:12px;}
.ur-page .ur-add.dx-btn{height:28px;padding:0 10px;border-radius:6px;font-size:12px;font-weight:500;gap:6px;background:#2C9842;border-color:#2C9842;color:#fff;}
.ur-page .ur-add.dx-btn:hover{background:#247a35;filter:none;box-shadow:none;}
.ur-page .ur-tabs{display:flex;gap:2px;padding:8px 12px 0;border-bottom:1px solid #e5e7eb;}
.ur-page .ur-tabs button{background:transparent;border:none;border-bottom:2px solid transparent;padding:8px 14px;font-size:14px;font-weight:500;color:#4b5563;cursor:pointer;margin-bottom:-1px;}
.ur-page .ur-tabs button:hover{color:#1f2937;border-bottom-color:#d1d5db;}
.ur-page .ur-tabs button.is-active{color:#247a35;border-bottom-color:#2C9842;}
.ur-page .ur-filters{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;border-bottom:1px solid #eef0f2;padding:12px;}
.ur-page .ur-filter{display:flex;flex-direction:column;gap:2px;}
.ur-page .ur-filter-label{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#4b5563;}
.ur-page .ur-search{position:relative;display:block;width:256px;}
.ur-page .ur-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none;z-index:1;}
.ur-page .ur-search .dx-input,.ur-page .ur-select,.essa-dialog-root .ur-form .dx-input,.essa-dialog-root .ur-select{height:36px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;font-size:14px;color:#1f2937;padding:6px 10px;}
.ur-page .ur-search .dx-input{width:100%;padding-left:32px;}
.ur-page .ur-select{min-width:140px;}
.ur-page .ur-search .dx-input:focus,.ur-page .ur-select:focus,.essa-dialog-root .ur-form .dx-input:focus,.essa-dialog-root .ur-select:focus{border-color:#3aaa55;outline:none;box-shadow:0 0 0 2px #d8f0dd;}
.ur-page .ur-table-wrap{overflow:auto;max-height:62vh;}
.ur-page .ur-table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:14px;color:#1f2937;}
.ur-page .ur-table thead th{position:sticky;top:0;z-index:2;background:#2C9842;color:#fff;font-size:14px;font-weight:700;text-transform:none;letter-spacing:0;padding:8px 12px;white-space:nowrap;border:none;text-align:left;}
.ur-page .ur-table thead th.is-center,.ur-page .ur-table tbody td.is-center{text-align:center;}
.ur-page .ur-sort{display:inline-flex;align-items:center;gap:4px;background:transparent;border:none;color:#fff;font:inherit;font-weight:700;cursor:pointer;padding:0;}
.ur-page .ur-sort:hover{text-decoration:underline;}
.ur-page .ur-sort-idle{opacity:.75;}
.ur-page .ur-table tbody td{padding:6px 12px;border-bottom:1px solid #eef0f2;vertical-align:middle;background:#fff;}
.ur-page .ur-table tbody tr.is-zebra td{background:#f6f8f7;}
.ur-page .ur-table tbody tr:hover td{background:#eef8f0;}
.ur-page .ur-table th.ur-sticky,.ur-page .ur-table td.ur-sticky{position:sticky;right:0;z-index:1;}
.ur-page .ur-table th.ur-sticky{z-index:3;background:#2C9842;box-shadow:-6px 0 6px -6px rgba(16,24,40,.25);}
.ur-page .ur-table td.ur-sticky{box-shadow:-6px 0 6px -6px rgba(16,24,40,.18);}
.ur-page .ur-user{display:flex;align-items:center;gap:8px;}
.ur-page .ur-avatar{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#2C9842;color:#fff;font-size:10px;font-weight:700;flex-shrink:0;}
.ur-page .ur-name{display:block;font-weight:500;}
.ur-page .ur-email{display:block;font-size:10px;color:#9ca3af;}
.ur-page .ur-small{font-size:12px;}
.ur-page .ur-tiny{white-space:nowrap;font-size:10px;}
.ur-page .ur-none{font-size:10px;font-style:italic;color:#9ca3af;}
.ur-page .ur-roles{display:flex;flex-wrap:wrap;gap:4px;max-width:14rem;}
.ur-badge{display:inline-flex;align-items:center;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:14px;white-space:nowrap;}
.ur-badge-success{background:#e6f5ea;color:#2d9a47;}
.ur-badge-neutral{background:#eef0f2;color:#374151;}
.ur-badge-info{background:#e5f2f9;color:#0075a9;}
.ur-page .ur-icon.dx-btn{height:28px;width:28px;padding:0;border-radius:6px;border-color:transparent;background:transparent;color:#374151;}
.ur-page .ur-icon.dx-btn:hover{background:#eef0f2;border-color:transparent;filter:none;box-shadow:none;color:#247a35;}
.ur-page .ur-icon-danger.dx-btn{color:#b91c1c;}
.ur-page .ur-icon-danger.dx-btn:hover{background:#fdecec;color:#b91c1c;}
.ur-page .ur-actions{display:inline-flex;justify-content:center;gap:4px;}
.ur-page .ur-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:40px 16px;text-align:center;color:#6b7280;}
.ur-page .ur-state-title{margin:0;font-size:14px;font-weight:500;color:#374151;}
.ur-page .ur-state p{margin:0;font-size:12px;}
.ur-page .ur-state-row:hover td{background:#fff;}
.ur-page .ur-spin{color:#2C9842;animation:ur-spin 1s linear infinite;}
@keyframes ur-spin{to{transform:rotate(360deg);}}
.ur-page .ur-matrix{display:flex;flex-direction:column;gap:8px;padding:12px;}
.ur-page .ur-matrix>p{margin:0;font-size:12px;color:#4b5563;}
.ur-page .ur-matrix-wrap{overflow:auto;max-height:62vh;}
.ur-page .ur-matrix-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;text-align:left;}
.ur-page .ur-matrix-table th,.ur-page .ur-matrix-table td{padding:6px 8px;border-bottom:1px solid #e5e7eb;background:#fff;vertical-align:middle;}
.ur-page .ur-matrix-table thead th{position:sticky;top:0;z-index:2;font-weight:600;text-align:left;}
.ur-page .ur-matrix-table .ur-sticky-col{position:sticky;left:0;z-index:1;background:#fff;white-space:nowrap;}
.ur-page .ur-matrix-table thead .ur-sticky-col{z-index:3;}
.ur-page .ur-matrix-table .ur-role-col{background:#2C9842;color:#fff;text-align:center;white-space:nowrap;}
.ur-page .ur-matrix-table td.is-center,.ur-page .ur-matrix-table th.is-center{text-align:center;}
.ur-page .ur-matrix-table tr.is-group td{border-top:1px solid #e5e7eb;}
.ur-page .ur-area{font-weight:500;white-space:nowrap;}
.ur-page .ur-perm{white-space:nowrap;color:#4b5563;}
.ur-page .ur-allows{font-size:10px;color:#4b5563;}
.ur-page .ur-tick{font-weight:700;color:#2C9842;}
.ur-page .ur-dash{color:#d1d5db;}
.ur-page .ur-matrix-table td.is-center{border-left:1px solid #eef0f2;}
.essa-dialog-root .ur-form{display:flex;flex-direction:column;gap:12px;}
.essa-dialog-root .ur-note{margin:0;border-radius:6px;background:#f6f8f7;padding:8px 10px;font-size:10px;line-height:1.45;color:#4b5563;}
.essa-dialog-root .ur-grid{display:grid;gap:12px;}
@media (min-width:768px){.essa-dialog-root .ur-grid{grid-template-columns:1fr 1fr;}}
.essa-dialog-root .ur-field{display:flex;flex-direction:column;gap:4px;}
.essa-dialog-root .ur-field-label{font-size:12px;font-weight:600;color:#1f2937;}
.essa-dialog-root .ur-req{color:#b91c1c;}
.essa-dialog-root .ur-hint{font-size:10px;font-weight:400;color:#4b5563;}
.essa-dialog-root .ur-select-full{width:100%;}
.essa-dialog-root .ur-checks,.essa-dialog-root .ur-role-list{display:flex;flex-direction:column;gap:6px;border:1px solid #e5e7eb;border-radius:6px;padding:10px;}
.essa-dialog-root .ur-role-list{gap:6px;}
.essa-dialog-root .ur-check,.essa-dialog-root .ur-role-option,.essa-dialog-root .ur-enable{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#4b5563;cursor:pointer;}
.essa-dialog-root .ur-role-option{align-items:center;border:1px solid #e5e7eb;border-radius:6px;padding:8px;}
.essa-dialog-root .ur-role-option:hover{background:#f6f8f7;}
.essa-dialog-root .ur-check input,.essa-dialog-root .ur-role-option input,.essa-dialog-root .ur-enable input,.essa-dialog-root .ur-perm-table input{width:14px;height:14px;accent-color:#2C9842;flex-shrink:0;}
.essa-dialog-root .ur-check-name{display:block;font-weight:500;color:#1f2937;}
.essa-dialog-root .ur-check-desc{display:block;font-size:10px;font-weight:400;color:#4b5563;}
.essa-dialog-root .ur-perm-wrap{max-height:320px;overflow:auto;border:1px solid #e5e7eb;border-radius:6px;}
.essa-dialog-root .ur-perm-table{width:100%;border-collapse:collapse;font-size:12px;}
.essa-dialog-root .ur-perm-table th{position:sticky;top:0;background:#2C9842;color:#fff;padding:6px 8px;text-align:left;font-weight:600;}
.essa-dialog-root .ur-perm-table th.is-center,.essa-dialog-root .ur-perm-table td.is-center{text-align:center;}
.essa-dialog-root .ur-perm-table td{padding:6px 8px;border-top:1px solid #eef0f2;}
.essa-dialog-root .ur-delete-copy{margin:0;font-size:12px;color:#374151;}
.essa-dialog-root .ur-dialog-btn.dx-btn{height:36px;padding:0 14px;border-radius:6px;font-size:14px;font-weight:500;}
.essa-dialog-root .ur-dialog-btn.dx-btn-ghost{border-color:transparent;background:transparent;color:#374151;}
.essa-dialog-root .ur-dialog-primary.dx-btn{background:#2C9842;border-color:#2C9842;color:#fff;}
.essa-dialog-root .ur-dialog-primary.dx-btn:hover:not(:disabled){background:#247a35;filter:none;}
.essa-dialog-root .ur-dialog-btn.dx-btn-danger{background:#b91c1c;border-color:#b91c1c;color:#fff;}
`

const mapStateToProps = (state) => ({
  userInfo: state.user?.userInfo || state.userInfo || {}
})

export default connect(mapStateToProps)(UsersManagementComp)
