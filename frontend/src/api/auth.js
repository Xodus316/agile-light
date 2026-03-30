import client from './client.js'

export const register = (data) => client.post('/auth/register', data).then((r) => r.data)

export const login = (data) => client.post('/auth/login', data).then((r) => r.data)

export const refresh = (refreshToken) =>
  client.post('/auth/refresh', { refresh_token: refreshToken }).then((r) => r.data)

export const getMe = () => client.get('/auth/me').then((r) => r.data)
