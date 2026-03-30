import client from './client.js'

export const listSprints = (teamId) =>
  client.get('/sprints/', { params: { team_id: teamId } }).then((r) => r.data)

export const createSprint = (data) => client.post('/sprints/', data).then((r) => r.data)

export const getSprint = (sprintId) =>
  client.get(`/sprints/${sprintId}`).then((r) => r.data)

export const updateSprint = (sprintId, data) =>
  client.put(`/sprints/${sprintId}`, data).then((r) => r.data)

export const deleteSprint = (sprintId) =>
  client.delete(`/sprints/${sprintId}`).then((r) => r.data)

export const startSprint = (sprintId) =>
  client.post(`/sprints/${sprintId}/start`).then((r) => r.data)

export const completeSprint = (sprintId) =>
  client.post(`/sprints/${sprintId}/complete`).then((r) => r.data)
