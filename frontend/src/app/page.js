'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthModals from '@/components/auth/AuthModals'
import ToastContainer from '@/components/shared/ToastContainer'
import { isAuthenticated } from '@/lib/auth'

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeModal, setActiveModal] = useState(null)

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/chat')
      return
    }

    const refCode = searchParams.get('ref')
    if (refCode) {
      localStorage.setItem('referral_code', refCode)
      setActiveModal('register')
    }
  }, [searchParams])

  const checkAuthAndNavigate = (path) => {
    if (isAuthenticated()) {
      router.push(path)
    } else {
      setActiveModal('login')
    }
  }

  return (
    <>
      <ToastContainer />
      
      <div className="min-h-screen flex flex-col bg-[#343541] text-white">
        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 bg-[#343541]/80 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2 text-lg md:text-xl font-bold">
              <img 
                src="/img/aurion.jpg" 
                alt="AURION Logo" 
                className="w-8 h-8 rounded-lg object-cover shadow-md"
              />
              <span>AI-CaaS</span>
            </div>

            <div className="hidden md:flex gap-8 text-gray-300 text-sm font-medium">
              <button onClick={() => checkAuthAndNavigate('/chat')} className="hover:text-white transition">
                Chat
              </button>
              <button onClick={() => checkAuthAndNavigate('/bot')} className="hover:text-white transition">
                BOT
              </button>
              <button onClick={() => checkAuthAndNavigate('/data')} className="hover:text-white transition">
                Data
              </button>
              <button onClick={() => checkAuthAndNavigate('/group')} className="hover:text-white transition">
                Group
              </button>
              <button onClick={() => checkAuthAndNavigate('/subscription')} className="hover:text-white transition">
                Pricing
              </button>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setActiveModal('login')}
                className="text-gray-300 hover:text-white font-medium text-xs md:text-sm px-3 py-2 md:px-4 md:py-2 border border-gray-600 rounded-lg hover:bg-[#40414f] transition"
              >
                Login
              </button>
              <button
                onClick={() => setActiveModal('register')}
                className="bg-white text-black hover:bg-gray-200 font-medium text-xs md:text-sm px-3 py-2 md:px-4 md:py-2 rounded-lg transition shadow-lg"
              >
                Register
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-20 md:pt-24 relative w-full">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
          
          <h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 md:mb-6 tracking-tight animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            Why pay for <span className="gradient-text">Grok-3</span><br />
            to use only 1 model?
          </h1>

          <p 
            className="text-lg md:text-xl text-gray-300 mb-2 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            AI-CaaS: 1 cheaper price - All latest AI models
          </p>

          <p 
            className="text-gray-400 max-w-2xl mb-8 md:mb-10 text-xs md:text-sm leading-relaxed animate-fade-in-up px-4"
            style={{ animationDelay: '0.3s' }}
          >
            Stop overpaying for individual AI platforms - AI-CaaS gives you access to <br className="hidden md:block" />
            all premium models at an unbeatable price, simplifying your workflow.
          </p>

          <div 
            className="w-full max-w-5xl mx-auto perspective-1000 animate-fade-in-up px-2"
            style={{ animationDelay: '0.5s' }}
          >
            <div className="bg-[#202123] border border-gray-600/50 rounded-t-2xl p-2 shadow-2xl opacity-80 transform rotate-x-10">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/50 mb-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="ml-4 bg-[#40414f] rounded text-xs text-gray-400 px-3 py-1 w-full max-w-[200px] md:w-64 truncate">
                  aurion.ai/chat
                </div>
              </div>
              <div className="h-24 md:h-32 bg-[#343541]/50 rounded-lg flex items-center justify-center text-gray-600">
                <div className="flex flex-col items-center gap-2">
                  <i className="fas fa-robot text-3xl md:text-4xl opacity-20"></i>
                  <span className="text-xs md:text-sm">App Preview</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Auth Modals */}
      {activeModal && (
        <AuthModals 
          activeModal={activeModal}
          setActiveModal={setActiveModal}
        />
      )}
    </>
  )
}
