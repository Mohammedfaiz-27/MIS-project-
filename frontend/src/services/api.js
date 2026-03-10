import axios from 'axios'

const STORAGE_KEY = 'construction-mis-auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor — always attach the latest token from storage
// This fixes the race condition where initAuth() runs before Zustand rehydrates
api.interceptors.request.use((config) => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const token = stored?.state?.token
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
  } catch {
    // ignore parse errors
  }
  return config
})

// Response interceptor — handle 401 and clear correct storage key
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEY)
      delete api.defaults.headers.common['Authorization']
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
