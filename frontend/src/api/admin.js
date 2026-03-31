import client from './client.js'

export async function getAdminStats() {
  const res = await client.get('/api/admin/stats')
  return res.data
}

export async function listAdminUsers() {
  const res = await client.get('/api/admin/users')
  return res.data
}

export async function updateAdminUser(userId, data) {
  const res = await client.patch(`/api/admin/users/${userId}`, data)
  return res.data
}

export async function listAdminTeams() {
  const res = await client.get('/api/admin/teams')
  return res.data
}

export async function deleteAdminTeam(teamId) {
  await client.delete(`/api/admin/teams/${teamId}`)
}
