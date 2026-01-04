'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/shared/ToastContainer'
import api from '@/lib/api'
import { showToast } from '@/lib/toast'
import { isAuthenticated } from '@/lib/auth'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [userData, setUserData] = useState({
    email: '',
    full_name: '',
    plan_type: 'free',
    credits: 0,
    daily_requests_count: 0
  })
  const [nameInput, setNameInput] = useState('')
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/')
      return
    }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile')
      if (res.data.status === 'success') {
        setUserData(res.data.data)
        setNameInput(res.data.data.full_name || '')
      }
    } catch (err) {
      showToast('Failed to load profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    
    if (!nameInput || !nameInput.trim()) {
      showToast('Full name is required', 'error')
      return
    }

    const newName = nameInput.trim()
    setSaving(true)
    try {
      const res = await api.post('/profile/update', {
        full_name: newName
      })

      if (res.data.status === 'success') {
        showToast('Profile updated successfully', 'success')
        // Cập nhật hiển thị ngay lập tức
        setUserData(prev => ({ ...prev, full_name: newName }))
        // Reset ô input về rỗng
        setNameInput('')
      } else {
        showToast(res.data.message || 'Failed to update profile', 'error')
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password) {
      showToast('All fields are required', 'error')
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      showToast('New passwords do not match', 'error')
      return
    }

    if (passwordData.new_password.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    setChangingPassword(true)
    try {
      const res = await api.post('/profile/change-password', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      })

      if (res.data.status === 'success') {
        showToast('Password changed successfully!', 'success')
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
      } else {
        showToast(res.data.message || 'Failed to change password', 'error')
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#202123]">
        <i className="fas fa-spinner fa-spin text-4xl text-gray-500"></i>
      </div>
    )
  }

  return (
    <>
      <ToastContainer />
      
      <div className="flex h-screen overflow-hidden bg-[#202123] text-gray-100">
        <Sidebar />

        <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#343541]">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-2xl mx-auto w-full">
              <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-white">Account Settings</h1>

              {/* Profile Information Card */}
              <div className="bg-[#2A2B32] border border-gray-600 rounded-xl shadow-xl p-4 md:p-6 mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-semibold mb-4 border-b border-gray-600 pb-2 text-white flex items-center gap-2">
                  <i className="fas fa-id-card text-blue-400"></i> Profile Information
                </h2>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-white/10">
                    {userData.full_name?.charAt(0)?.toUpperCase() || userData.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-bold text-white">{userData.full_name || 'User'}</h3>
                    <p className="text-gray-400 text-sm">{userData.email}</p>
                  </div>
                </div>
                <form onSubmit={handleUpdateProfile} className="grid gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1 font-medium">Full Name</label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-[#2A2B32] border border-gray-600 text-white rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-base md:text-sm"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-fit px-6 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition shadow-lg text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <i className="fas fa-save"></i> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>

              {/* Change Password Card */}
              <div className="bg-[#2A2B32] border border-gray-600 rounded-xl shadow-xl p-4 md:p-6 pb-20 md:pb-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4 border-b border-gray-600 pb-2 text-white flex items-center gap-2">
                  <i className="fas fa-lock text-green-400"></i> Change Password
                </h2>
                <form onSubmit={handleChangePassword} className="grid gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1 font-medium">Current Password</label>
                    <input
                      type="password"
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                      className="w-full bg-[#2A2B32] border border-gray-600 text-white rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-base md:text-sm"
                      placeholder="Current Password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1 font-medium">New Password</label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="w-full bg-[#2A2B32] border border-gray-600 text-white rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-base md:text-sm"
                      placeholder="New Password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1 font-medium">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="w-full bg-[#2A2B32] border border-gray-600 text-white rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-base md:text-sm"
                      placeholder="Confirm New Password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full sm:w-fit px-6 py-2.5 bg-[#10a37f] hover:bg-green-600 rounded-lg font-medium transition text-white shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <i className="fas fa-sync-alt"></i> {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
