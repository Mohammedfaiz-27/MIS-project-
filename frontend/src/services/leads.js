import api from './api'

export const leadsService = {
  getAll: async (params = {}) => {
    const response = await api.get('/leads', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/leads/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/leads', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/leads/${id}`, data)
    return response.data
  },

  uploadPhotos: async (id, files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    const response = await api.post(`/leads/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  updateStage: async (id, stage) => {
    const response = await api.put(`/leads/${id}/stage`, { construction_stage: stage })
    return response.data
  },

  updateStatus: async (id, status) => {
    const response = await api.put(`/leads/${id}/status`, { lead_status: status })
    return response.data
  }
}
