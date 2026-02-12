import { create } from 'zustand'

export const useFilterStore = create((set) => ({
  filters: {
    startDate: null,
    endDate: null,
    salesPersonId: null,
    area: null,
    leadType: null,
    leadStatus: null,
    search: ''
  },

  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  resetFilters: () => set({
    filters: {
      startDate: null,
      endDate: null,
      salesPersonId: null,
      area: null,
      leadType: null,
      leadStatus: null,
      search: ''
    }
  })
}))
