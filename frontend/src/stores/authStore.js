import { create } from 'zustand'
import { apiGet } from '../lib/api'

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,

  init: async (signal) => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isLoading: false })
      return
    }
    try {
      const user = await apiGet('/me', { signal })
      set({ user, token, isLoading: false })
    } catch (err) {
      if (err.name === 'AbortError') return
      localStorage.removeItem('token')
      set({ user: null, token: null, isLoading: false })
    }
  },

  login: (token, user) => {
    localStorage.setItem('token', token)
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))
