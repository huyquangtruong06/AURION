'use client'

import { create } from 'zustand'
import api from '@/lib/api'

export const useAuth = create((set) => ({
  user: null,
  token: null,
  loading: false,

  checkAuth: () => {
    if (typeof window === 'undefined') return false
    const token = localStorage.getItem('session_token')
    if (!token) {
      window.location.href = '/'
      return false
    }
    set({ token })
    return true
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const res = await api.post('/api/login', { email, password })
      if (res.data.status === 'success') {
        localStorage.setItem('session_token', res.data.session_token)
        set({ token: res.data.session_token, user: res.data.user, loading: false })
        return { success: true }
      }
      set({ loading: false })
      return { success: false, message: res.data.message }
    } catch (error) {
      set({ loading: false })
      return { success: false, message: error.response?.data?.message || 'Connection error' }
    }
  },

  register: async (email, password, fullName, referralCode) => {
    set({ loading: true })
    try {
      const res = await api.post('/api/register', {
        email,
        password,
        full_name: fullName || 'User',
        referral_code:  referralCode,
      })
      set({ loading: false })
      if (res.data.status === 'success') {
        localStorage.removeItem('referral_code')
        return { success: true }
      }
      return { success: false, message: res.data.message }
    } catch (error) {
      set({ loading: false })
      return { success: false, message: error.response?.data?. message || 'Connection error' }
    }
  },

  logout: async () => {
    const token = localStorage.getItem('session_token')
    if (token) {
      try {
        await api.post('/api/logout', { session_token: token })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    localStorage.removeItem('session_token')
    localStorage.removeItem('currentBotId')
    sessionStorage.clear()
    set({ user: null, token: null })
  },
}))