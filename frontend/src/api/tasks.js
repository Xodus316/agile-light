import client from './client.js'

export const listTasks = (params) =>
  client.get('/tasks/', { params }).then((r) => r.data)

export const getBacklog = (teamId) =>
  client.get('/tasks/backlog', { params: { team_id: teamId } }).then((r) => r.data)

export const createTask = (data) => client.post('/tasks/', data).then((r) => r.data)

export const getTask = (taskId) => client.get(`/tasks/${taskId}`).then((r) => r.data)

export const updateTask = (taskId, data) =>
  client.put(`/tasks/${taskId}`, data).then((r) => r.data)

export const deleteTask = (taskId) =>
  client.delete(`/tasks/${taskId}`).then((r) => r.data)
