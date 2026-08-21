import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 8_000,
  headers: { 'Content-Type': 'application/json' },
})

export async function fetchDashboard(signal) {
  const response = await api.get('/dashboard', { signal })
  return response.data
}

export async function controlDevice(deviceId, command, signal) {
  const response = await api.post('/devices/control', { deviceId, command }, { signal })
  return response.data
}

export async function fetchSensorHistory(params, signal) {
  const response = await api.get('/data-sensor', { params, signal })
  return response.data
}

export async function fetchActionHistory(params, signal) {
  const response = await api.get('/action-history', { params, signal })
  return response.data
}

export async function fetchProfile(signal) {
  const response = await api.get('/profile', { signal })
  return response.data
}

export default api
