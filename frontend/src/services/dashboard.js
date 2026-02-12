import api from './api'

export const dashboardService = {
  getKPIs: async (params = {}) => {
    const response = await api.get('/dashboard/kpis', { params })
    return response.data
  },

  getFollowupTable: async (params = {}) => {
    const response = await api.get('/dashboard/followup-table', { params })
    return response.data
  },

  getSalespersonPerformance: async (params = {}) => {
    const response = await api.get('/dashboard/salesperson-performance', { params })
    return response.data
  },

  getAreaAnalysis: async (params = {}) => {
    const response = await api.get('/dashboard/area-analysis', { params })
    return response.data
  },

  getSalesTrend: async (params = {}) => {
    const response = await api.get('/dashboard/charts/sales-trend', { params })
    return response.data
  },

  getContribution: async (params = {}) => {
    const response = await api.get('/dashboard/charts/contribution', { params })
    return response.data
  }
}
