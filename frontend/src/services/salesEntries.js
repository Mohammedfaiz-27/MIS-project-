import api from './api'

export const salesEntriesService = {
  create: async (leadId, data) => {
    const response = await api.post(`/sales-entries/leads/${leadId}/entry`, data)
    return response.data
  },

  getByLead: async (leadId) => {
    const response = await api.get(`/sales-entries/leads/${leadId}/entries`)
    return response.data
  },

  getAll: async (params = {}) => {
    const response = await api.get('/sales-entries', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/sales-entries/${id}`)
    return response.data
  },

  approve: async (id) => {
    const response = await api.put(`/sales-entries/${id}/approve`)
    return response.data
  },

  reject: async (id, reason) => {
    const response = await api.put(`/sales-entries/${id}/reject`, { reason })
    return response.data
  }
}
