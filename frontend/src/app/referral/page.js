'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/shared/ToastContainer'
import api from '@/lib/api'
import { showToast } from '@/lib/toast'
import { isAuthenticated } from '@/lib/auth'

export default function ReferralPage() {
  const router = useRouter()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [referralLink, setReferralLink] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/')
      return
    }
    
    // Load user ID and generate referral link on client only
    const loadUserData = async () => {
      try {
        const res = await api.get('/profile')
        if (res.data.status === 'success') {
          const uid = res.data.data.id
          setUserId(uid)
          setReferralLink(`${window.location.origin}?ref=${uid}`)
        }
      } catch (err) {
        console.error('Failed to load user profile', err)
      }
    }
    
    loadUserData()
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    try {
      const res = await api.get('/referrals')
      if (res.data.status === 'success') {
        setReferrals(res.data.data)
      }
    } catch (err) {
      showToast('Failed to load referrals', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    showToast('Referral link copied!', 'success')
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    
    if (!email) {
      showToast('Please enter an email', 'error')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('email', email)

      const res = await api.post('/referrals/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data.status === 'success') {
        showToast(res.data.message, 'success')
        setEmail('')
        fetchReferrals()
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to send invitation', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <ToastContainer />
      
      <div className="flex h-screen overflow-hidden bg-[#202123] text-gray-100">
        <Sidebar />

        <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#343541]">
          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full text-center">
              {/* Flash Event Banner */}
              <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl p-6 md:p-8 mb-8 md:mb-10 shadow-xl overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-4">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-bolt text-yellow-300 text-xl animate-pulse"></i>
                    <span className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold text-white border border-white/30">REFERRAL FLASH EVENT</span>
                  </div>
                  <div className="text-white font-medium text-sm md:text-base">Get 1 month Pro – Just invite 3 friends!</div>
                </div>
              </div>

              {/* Header */}
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">Invite Friends – Earn Up to 1 Year of Free Pro!</h1>
              <p className="text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto text-sm md:text-base">
                Invite 3 friends to unlock 1 month. 7 friends? You get <span className="text-blue-400 font-semibold">a whole year</span>.
              </p>

              {/* Progress Cards */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8 md:mb-12">
                <div className="bg-[#40414f] border border-gray-600 rounded-2xl p-6 w-full max-w-sm relative group hover:border-yellow-500/50 transition">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-500 text-xl">
                      <i className="fas fa-gift"></i>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white">3 Invites</div>
                      <div className="text-xs text-gray-400">1 Month subscription</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${Math.min((referrals.length / 3) * 100, 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{Math.min(referrals.length, 3)}/3 friends</span>
                    <span>{Math.round(Math.min((referrals.length / 3) * 100, 100))}%</span>
                  </div>
                </div>

                <i className="fas fa-angle-double-right text-gray-500 text-xl hidden md:block"></i>

                <div className="bg-[#40414f] border border-gray-600 rounded-2xl p-6 w-full max-w-sm relative group hover:border-blue-500/50 transition">
                  <div className="absolute top-3 right-3 text-gray-500">
                    <i className="fas fa-lock"></i>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 text-xl">
                      <i className="fas fa-gift"></i>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white">7 Invites</div>
                      <div className="text-xs text-gray-400">1 Year subscription</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min((referrals.length / 7) * 100, 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{Math.min(referrals.length, 7)}/7 friends</span>
                    <span>{Math.round(Math.min((referrals.length / 7) * 100, 100))}%</span>
                  </div>
                </div>
              </div>

              {/* Referral Link Box */}
              <div className="bg-[#40414f] border border-gray-600 rounded-xl p-4 mb-6 max-w-3xl mx-auto text-left">
                <div className="text-xs text-gray-400 mb-2">Unlock your AI assistant for FREE — smarter emails, faster tasks, and more! Try AI-CaaS now!</div>
                <div className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2 border border-gray-600/50">
                  <span className="text-gray-300 text-sm font-mono truncate flex-1">{referralLink}</span>
                  <button onClick={handleCopyLink} className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase ml-2">Copy</button>
                </div>
              </div>

              {/* Copy with Message Button */}
              <button
                onClick={() => {
                  const msg = `Unlock your AI assistant for FREE — smarter emails, faster tasks, and more! Try AI-CaaS now: ${referralLink}`;
                  navigator.clipboard.writeText(msg);
                  showToast('Message copied!', 'success');
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 w-full md:w-auto max-w-sm mb-12"
              >
                <i className="fas fa-clipboard-check mr-2"></i> Copy Link with Message
              </button>

              {/* Referral List */}
              <div className="max-w-3xl mx-auto text-left">
                <h3 className="text-lg font-bold text-white mb-4">Your Referrals</h3>
                <div className="bg-[#40414f] rounded-xl border border-gray-600 overflow-x-auto">

                  {loading ? (
                    <div className="flex justify-center items-center h-40">
                      <i className="fas fa-spinner fa-spin text-3xl text-gray-500"></i>
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left text-gray-400 min-w-[500px]">
                      <thead className="text-xs text-gray-300 uppercase bg-black/20">
                        <tr>
                          <th className="px-6 py-3">Email</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrals.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="px-6 py-10 text-center text-gray-500">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <i className="fas fa-users-slash text-2xl opacity-50"></i>
                                <span>No referrals yet. Copy the link above and invite your friends!</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          referrals.map((referral, idx) => (
                            <tr key={idx} className="border-b border-gray-600 hover:bg-white/5 transition">
                              <td className="px-6 py-4 text-white font-medium">{referral.email}</td>
                              <td className="px-6 py-4 text-gray-400">{referral.date}</td>
                              <td className="px-6 py-4">
                                <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-xs font-bold shadow-sm">
                                  {referral.status || 'SUCCESS'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
