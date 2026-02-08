import api from './api'

export const masterDataService = {
  getAll: async (type = null) => {
    const params = type ? { type } : {}
    const response = await api.get('/master-data', { params })
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/master-data', data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/master-data/${id}`)
    return response.data
  },

  seed: async () => {
    const response = await api.post('/master-data/seed')
    return response.data
  }
}
