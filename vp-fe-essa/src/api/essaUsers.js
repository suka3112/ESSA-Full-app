import axiosInstance from 'services/axiosSetup'

/**
 * Fetch all portal users, roles, and permission definitions
 */
export async function getEssaUsersAndRoles() {
  const res = await axiosInstance.get('/essa/users')
  return res.data?.data || res.data
}

/**
 * Create a new corporate portal user
 */
export async function createEssaUser(payload) {
  const res = await axiosInstance.post('/essa/users', payload)
  return res.data?.data || res.data
}

/**
 * Update an existing user's roles, title, or enabled status
 */
export async function updateEssaUser(id, payload) {
  const res = await axiosInstance.post(`/essa/users/${id}`, payload)
  return res.data?.data || res.data
}

/**
 * Manage roles (CREATE / UPDATE / DELETE)
 */
export async function manageEssaRole(op, row) {
  const res = await axiosInstance.post('/essa/users/roles/manage', { op, row })
  return res.data?.data || res.data
}
