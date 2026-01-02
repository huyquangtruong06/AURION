'use client'

import { useState } from 'react'
import api from '@/lib/api'
import { setToken } from '@/lib/auth'
import { showToast } from '@/lib/toast'
import { useRouter } from 'next/navigation'

export default function AuthModals({ activeModal, setActiveModal }) {
  const [step, setStep] = useState(1) // For forgot password
  const router = useRouter()

  // Form states
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [registerData, setRegisterData] = useState({ email: '', password: '' })
  const [forgotData, setForgotData] = useState({ email: '', otp: '', newPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const closeModal = () => {
    setActiveModal(null)
    setError('')
    setStep(1)
  }

  const switchModal = (type) => {
    setActiveModal(type)
    setError('')
    setStep(1)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('email', loginData.email)
      formData.append('password', loginData.password)

      const res = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (data.status === 'success') {
        const token = data.data?.token || data.session_token
        setToken(token)
        // Clear chat-related localStorage when logging in as a different user
        localStorage.removeItem('currentBotId')
        showToast('Login successful!', 'success')
        closeModal()
        router.push('/chat')
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('email', registerData.email)
      formData.append('password', registerData.password)

      const referralCode = localStorage.getItem('referral_code')
      if (referralCode) {
        formData.append('referral_code', referralCode)
      }

      const res = await fetch('http://localhost:8000/api/register', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (data.status === 'success') {
        showToast('Registration successful! Please log in.', 'success')
        setActiveModal('login')
        setRegisterData({ email: '', password: '' })
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOTP = async () => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotData.email })
      })

      const data = await res.json()

      if (data.status === 'success') {
        setStep(2)
        showToast('OTP sent to your email', 'success')
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotData.email,
          otp: forgotData.otp,
          new_password: forgotData.newPassword
        })
      })

      const data = await res.json()

      if (data.status === 'success') {
        showToast('Password reset successful!', 'success')
        setActiveModal('login')
        setForgotData({ email: '', otp: '', newPassword: '' })
        setStep(1)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  if (!activeModal) return null

  return (
    <>
      {/* Login Modal */}
      {activeModal === 'login' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm p-4">
          <div className="bg-[#202123] p-6 md:p-8 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white transition hover:rotate-90">
              <i className="fas fa-times text-lg"></i>
            </button>

            <h2 className="text-2xl font-bold mb-6 text-center text-white">Welcome Back</h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold ml-1">Email</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full mt-1 p-3 bg-[#40414f] border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold ml-1">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full mt-1 p-3 bg-[#40414f] border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
                  required
                />
              </div>

              {error && <div className="text-red-500 text-sm text-center font-semibold">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#10a37f] hover:bg-green-600 text-white font-bold py-3 rounded-lg transition shadow-lg disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-400">
              <button onClick={() => switchModal('forgot')} className="text-gray-400 hover:text-white text-xs underline mb-2 block text-center w-full">
                Forgot Password?
              </button>
              Don't have an account? <button onClick={() => switchModal('register')} className="text-blue-400 hover:underline">Sign up</button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {activeModal === 'register' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm p-4">
          <div className="bg-[#202123] p-6 md:p-8 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white transition hover:rotate-90">
              <i className="fas fa-times text-lg"></i>
            </button>

            <h2 className="text-2xl font-bold mb-6 text-center text-white">Create Account</h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold ml-1">Email</label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full mt-1 p-3 bg-[#40414f] border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold ml-1">Password</label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full mt-1 p-3 bg-[#40414f] border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
                  required
                />
              </div>

              {error && <div className="text-red-500 text-sm text-center font-semibold">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#3b82f6] hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition shadow-lg disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Sign Up'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-400">
              Already have an account? <button onClick={() => switchModal('login')} className="text-blue-400 hover:underline">Log in</button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {activeModal === 'forgot' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm p-4">
          <div className="bg-[#202123] p-6 md:p-8 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white transition hover:rotate-90">
              <i className="fas fa-times text-lg"></i>
            </button>

            <h2 className="text-2xl font-bold mb-4 text-center text-white">Reset Password</h2>

            {step === 1 ? (
              <>
                <p className="text-sm text-gray-400 mb-4 text-center">Enter your email to receive OTP code.</p>
                <input
                  type="email"
                  value={forgotData.email}
                  onChange={(e) => setForgotData({ ...forgotData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full mt-1 p-3 bg-[#40414f] border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-white mb-4"
                />
                {error && <div className="text-red-500 text-sm text-center mb-2">{error}</div>}
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full bg-[#3b82f6] hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-green-400 mb-2 text-center">OTP sent!</p>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={forgotData.otp}
                    onChange={(e) => setForgotData({ ...forgotData, otp: e.target.value })}
                    placeholder="Enter 6-digit OTP"
                    className="w-full p-3 bg-[#40414f] border border-gray-600 rounded-lg text-white text-center tracking-widest text-xl focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <input
                    type="password"
                    value={forgotData.newPassword}
                    onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })}
                    placeholder="New Password"
                    className="w-full p-3 bg-[#40414f] border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                  <button
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="w-full bg-[#10a37f] hover:bg-green-600 text-white font-bold py-3 rounded-lg transition shadow-lg disabled:opacity-50"
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// Export hook để sử dụng modal
export function useAuthModal() {
  const [activeModal, setActiveModal] = useState(null)
  
  return {
    openLogin: () => setActiveModal('login'),
    openRegister: () => setActiveModal('register'),
    openForgot: () => setActiveModal('forgot'),
    AuthModalComponent: () => <AuthModal />
  }
}
