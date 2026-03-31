import client from './client.js'

export async function getAdminStats() {
  const res = await client.get('/admin/stats')
  return res.data
}

export async function listAdminUsers() {
  const res = await client.get('/admin/users')
  return res.data
}

export async function updateAdminUser(userId, data) {
  const res = await client.patch(`/admin/users/${userId}`, data)
  return res.data
}

export async function listAdminTeams() {
  const res = await client.get('/admin/teams')
  return res.data
}

export async function deleteAdminTeam(teamId) {
  await client.delete(`/admin/teams/${teamId}`)
}
