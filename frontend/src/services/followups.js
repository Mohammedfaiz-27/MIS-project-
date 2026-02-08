import api from './api'

export const followupsService = {
  addFollowup: async (leadId, data) => {
    const response = await api.post(`/followups/leads/${leadId}/followup`, data)
    return response.data
  },

  getVisitHistory: async (leadId) => {
    const response = await api.get(`/followups/leads/${leadId}/visits`)
    return response.data
  },

  getToday: async () => {
    const response = await api.get('/followups/today')
    return response.data
  },

  getOverdue: async () => {
    const response = await api.get('/followups/overdue')
    return response.data
  },

  getUpcoming: async (days = 7) => {
    const response = await api.get('/followups/upcoming', { params: { days } })
    return response.data
  }
}
