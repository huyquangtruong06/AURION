'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/shared/ToastContainer'
import api from '@/lib/api'
import { showToast } from '@/lib/toast'
import { isAuthenticated } from '@/lib/auth'

export default function SubscriptionPage() {
  const router = useRouter()
  const [planInfo, setPlanInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [buyingCredits, setBuyingCredits] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)

  const creditPackages = [
    { amount: 100, price: 10000, discount: 0 },
    { amount: 500, price: 45000, discount: 10 },
    { amount: 2000, price: 160000, discount: 20 },
  ]

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/')
      return
    }
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/subscription')
      if (res.data.status === 'success') {
        setPlanInfo(res.data.data)
      }
    } catch (err) {
      showToast('Failed to load subscription info', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradeToPro = async () => {
    if (!confirm('Upgrade to PRO plan for 30 days?')) return

    setUpgrading(true)
    try {
      const res = await api.post('/subscription/upgrade')
      if (res.data.status === 'success') {
        showToast(res.data.message, 'success')
        fetchSubscription()
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to upgrade plan', 'error')
    } finally {
      setUpgrading(false)
    }
  }

  const handleBuyCredits = async (amount) => {
    setBuyingCredits(true)
    try {
      const formData = new FormData()
      formData.append('amount', amount.toString())

      const res = await api.post('/subscription/buy-credits', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data.status === 'success') {
        showToast(res.data.message, 'success')
        setSelectedPackage(null)
        fetchSubscription()
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to buy credits', 'error')
    } finally {
      setBuyingCredits(false)
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
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
            <div className="max-w-6xl mx-auto w-full space-y-8">
              
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Subscription & Billing</h1>
                <p className="text-gray-400 mt-1 text-sm md:text-base">Manage your plan, track usage, and purchase credits.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* User Info Card */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6 shadow-xl flex flex-col relative overflow-hidden group">
                  <div className="flex items-center gap-4 mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-white">{planInfo?.user_name || 'Loading...'}</h3>
                      <p className="text-gray-400 text-sm">{planInfo?.user_email || '...'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-700/50 relative overflow-hidden">
                    <div className="absolute right-[-10px] top-[-10px] text-gray-700/20 text-6xl">
                      <i className="fas fa-coins"></i>
                    </div>
                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Available Credits</span>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">{planInfo?.credits || 0}</span>
                      <span className="text-sm text-gray-500 font-medium mb-1.5">credits</span>
                    </div>
                  </div>
                </div>

                {/* Current Plan Card */}
                <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6 shadow-xl flex flex-col relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div>
                      <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Current Plan</h2>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-white">{planInfo?.plan === 'pro' ? 'AI-CaaS Pro' : 'Basic Plan'}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          planInfo?.plan === 'pro'
                            ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg shadow-yellow-500/50'
                            : 'bg-gray-700 text-gray-300 border-gray-600'
                        }`}>
                          {planInfo?.plan === 'pro' ? 'PRO' : 'FREE'}
                        </span>
                      </div>
                      {planInfo?.plan === 'pro' && planInfo?.expires_at && (
                        <div className="text-sm text-yellow-500 font-medium mt-1 flex items-center gap-1">
                          <i className="far fa-clock"></i> Expires: {planInfo.expires_at}
                        </div>
                      )}
                    </div>
                    
                    {planInfo?.plan === 'free' && (
                      <button
                        onClick={handleUpgradeToPro}
                        disabled={upgrading}
                        className="bg-white text-gray-900 hover:bg-gray-200 border border-transparent font-bold py-2 px-5 rounded-lg shadow-lg transition transform hover:-translate-y-0.5 flex items-center gap-2 text-sm justify-center sm:justify-start w-full sm:w-auto"
                      >
                        <i className="fas fa-rocket text-indigo-600"></i>
                        {upgrading ? 'Processing...' : 'Upgrade to Pro'}
                      </button>
                    )}
                  </div>

                  <div className="mt-auto bg-black/20 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-sm text-gray-300 font-medium flex items-center gap-2">
                          <i className="fas fa-chart-pie text-blue-400"></i> Daily Usage
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Resets at 00:00 UTC</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-white">{planInfo?.usage || 0} / {planInfo?.limit || 10}</span>
                        <span className="text-xs text-gray-500 block">requests</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          (planInfo?.percent || 0) > 90
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                        }`}
                        style={{ width: `${planInfo?.percent || 0}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                      <span>0%</span>
                      <span className="text-blue-400 font-bold">{planInfo?.percent || 0}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <i className="fas fa-shopping-cart text-purple-400"></i> Credit Store
                  </h2>
                  {planInfo?.plan === 'pro' && (
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded-full font-medium animate-pulse-slow">
                      <i className="fas fa-crown mr-1"></i> Pro Member: 30% OFF active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  
                  {/* Starter Package */}
                  <div
                    className="bg-[#40414f] border border-gray-600 rounded-2xl p-6 text-center hover:border-blue-400 transition-all duration-300 cursor-pointer group flex flex-col h-full hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] relative"
                    onClick={() => handleBuyCredits(100)}
                  >
                    <div className="text-gray-400 font-medium mb-4 uppercase text-xs tracking-widest">Starter</div>
                    <div className="text-white mb-2 flex justify-center items-baseline gap-1">
                      <span className="text-4xl font-bold group-hover:text-blue-400 transition-colors">100</span>
                      <span className="text-sm text-gray-500">credits</span>
                    </div>
                    
                    <div className="my-6 border-t border-gray-700 w-full"></div>
                    
                    <div className="mt-auto">
                      <div className="text-gray-300 font-bold text-xl mb-4">10,000 đ</div>
                      <button
                        disabled={buyingCredits}
                        className="w-full py-2.5 rounded-xl bg-gray-700 group-hover:bg-blue-600 text-white transition font-semibold shadow-lg border border-gray-600 group-hover:border-transparent disabled:opacity-50"
                      >
                        {buyingCredits && selectedPackage === 100 ? 'Processing...' : 'Buy Basic'}
                      </button>
                    </div>
                  </div>

                  {/* Standard Package - Popular */}
                  <div
                    className="bg-gradient-to-b from-[#2e2f3a] to-[#1a1b20] border-2 border-purple-500 rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer group relative overflow-hidden transform md:scale-105 shadow-[0_0_30px_rgba(168,85,247,0.15)] z-10 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] order-first md:order-none"
                    onClick={() => handleBuyCredits(500)}
                  >
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                    <div className="absolute top-4 right-4 text-purple-400 text-xs font-bold border border-purple-500/50 px-2 py-0.5 rounded uppercase tracking-wider bg-purple-500/10">Popular</div>

                    <div className="text-purple-300 font-bold mb-4 uppercase text-sm tracking-widest mt-2">Standard</div>
                    <div className="text-white mb-2 flex justify-center items-baseline gap-1">
                      <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">500</span>
                      <span className="text-sm text-gray-500">credits</span>
                    </div>
                    
                    <div className="my-6 border-t border-gray-700/50 w-full"></div>
                    
                    <div className="mt-auto">
                      <div className="text-purple-400 font-bold text-2xl mb-4">45,000 đ</div>
                      <button
                        disabled={buyingCredits}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition font-bold shadow-lg shadow-purple-900/40 relative overflow-hidden disabled:opacity-50"
                      >
                        <span className="relative z-10">{buyingCredits && selectedPackage === 500 ? 'Processing...' : 'Buy Standard'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Premium Package - Best Value */}
                  <div
                    className="bg-[#40414f] border border-gray-600 rounded-2xl p-6 text-center hover:border-yellow-500 transition-all duration-300 cursor-pointer group flex flex-col h-full hover:shadow-[0_0_20px_rgba(234,179,8,0.1)]"
                    onClick={() => handleBuyCredits(2000)}
                  >
                    <div className="text-yellow-500/80 font-medium mb-4 uppercase text-xs tracking-widest">Best Value</div>
                    <div className="text-white mb-2 flex justify-center items-baseline gap-1">
                      <span className="text-4xl font-bold group-hover:text-yellow-400 transition-colors">2000</span>
                      <span className="text-sm text-gray-500">credits</span>
                    </div>
                    
                    <div className="my-6 border-t border-gray-700 w-full"></div>
                    
                    <div className="mt-auto">
                      <div className="text-yellow-400 font-bold text-xl mb-4">160,000 đ</div>
                      <button
                        disabled={buyingCredits}
                        className="w-full py-2.5 rounded-xl bg-gray-700 group-hover:bg-yellow-600 text-white transition font-semibold shadow-lg border border-gray-600 group-hover:border-transparent disabled:opacity-50"
                      >
                        {buyingCredits && selectedPackage === 2000 ? 'Processing...' : 'Buy Premium'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-gray-600 pb-8 pt-4">
                <p>Payments are processed securely via MB Bank QR.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
