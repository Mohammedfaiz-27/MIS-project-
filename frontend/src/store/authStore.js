import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password })
        const { access_token } = response.data

        // Set token in axios defaults
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

        // Get user profile
        const userResponse = await api.get('/auth/me')

        set({
          token: access_token,
          user: userResponse.data,
          isAuthenticated: true
        })

        return userResponse.data
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization']
        set({
          user: null,
          token: null,
          isAuthenticated: false
        })
      },

      refreshUser: async () => {
        const { token } = get()
        if (!token) return

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        const response = await api.get('/auth/me')
        set({ user: response.data })
      },

      initAuth: () => {
        const { token } = get()
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
      }
    }),
    {
      name: 'construction-mis-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Initialize auth on app load
useAuthStore.getState().initAuth()
