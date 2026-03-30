import client from './client.js'

export const listProjects = (teamId) =>
  client.get('/projects/', { params: { team_id: teamId } }).then((r) => r.data)

export const createProject = (data) => client.post('/projects/', data).then((r) => r.data)

export const getProject = (projectId) =>
  client.get(`/projects/${projectId}`).then((r) => r.data)

export const updateProject = (projectId, data) =>
  client.put(`/projects/${projectId}`, data).then((r) => r.data)

export const deleteProject = (projectId) =>
  client.delete(`/projects/${projectId}`).then((r) => r.data)
