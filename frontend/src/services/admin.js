import api from './api'

export const adminService = {
  // Users
  getUsers: async () => {
    const response = await api.get('/admin/users')
    return response.data
  },

  createUser: async (data) => {
    const response = await api.post('/admin/users', data)
    return response.data
  },

  updateUser: async (id, data) => {
    const response = await api.put(`/admin/users/${id}`, data)
    return response.data
  },

  resetPassword: async (id, password) => {
    const response = await api.put(`/admin/users/${id}`, { password })
    return response.data
  },

  // Exports
  exportLeads: async (params = {}) => {
    const response = await api.get('/admin/export/leads', {
      params,
      responseType: 'blob'
    })
    return response.data
  },

  exportSalesEntries: async (params = {}) => {
    const response = await api.get('/admin/export/sales-entries', {
      params,
      responseType: 'blob'
    })
    return response.data
  }
}
