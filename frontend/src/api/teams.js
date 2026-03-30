import client from './client.js'

export const listTeams = () => client.get('/teams/').then((r) => r.data)

export const createTeam = (data) => client.post('/teams/', data).then((r) => r.data)

export const getTeam = (teamId) => client.get(`/teams/${teamId}`).then((r) => r.data)

export const addMember = (teamId, data) =>
  client.post(`/teams/${teamId}/members`, data).then((r) => r.data)
