'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { removeToken } from '@/lib/auth'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [showLogoutPopup, setShowLogoutPopup] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  const handleLogout = () => {
    removeToken()
    router.push('/')
  }

  const toggleLogoutPopup = (e) => {
    e.stopPropagation()
    setShowLogoutPopup(!showLogoutPopup)
  }

  const toggleSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showLogoutPopup && !e.target.closest('#logoutPopup') && !e.target.closest('#userIcon')) {
        setShowLogoutPopup(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showLogoutPopup])

  return (
    <>
      {showMobileSidebar && (
        <div
          id="sidebarOverlay"
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        id="mainSidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#202123] border-r border-[#4d4d4f] flex flex-col justify-between transform transition-transform duration-300 md:translate-x-0 md:static md:flex shrink-0 ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div>
          <div className="p-6 flex items-center justify-between text-xl font-bold text-white">
            <div className="flex items-center gap-3">
              <img
                src="/img/aurion.jpg"
                className="w-8 h-8 rounded-lg object-cover shadow-lg"
                alt="AURION"
                onError={(e) => {
                  e.target.src = 'https://ui-avatars.com/api/?name=AI&background=10a37f&color=fff'
                }}
              />
              <span>AI-CaaS</span>
            </div>
            <button onClick={toggleSidebar} className="md:hidden text-gray-400 hover:text-white">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <nav className="px-3 flex flex-col gap-1 mt-2">
            <a
              href="/chat"
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition group ${pathname === '/chat' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-300 hover:bg-[#2A2B32] hover:text-white'}`}
            >
              <i className={`fas fa-comment-alt w-5 text-center transition ${pathname === '/chat' ? 'text-white' : 'group-hover:text-white'}`}></i>
              <span className="text-sm font-medium">Chat</span>
            </a>

            <a
              href="/bot"
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition group ${pathname === '/bot' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-300 hover:bg-[#2A2B32] hover:text-white'}`}
            >
              <i className={`fas fa-robot w-5 text-center transition ${pathname === '/bot' ? 'text-white' : 'group-hover:text-white'}`}></i>
              <span className="text-sm font-medium">My Bots</span>
            </a>

            <a
              href="/data"
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition group ${pathname === '/data' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-300 hover:bg-[#2A2B32] hover:text-white'}`}
            >
              <i className={`fas fa-database w-5 text-center transition ${pathname === '/data' ? 'text-white' : 'group-hover:text-white'}`}></i>
              <span className="text-sm font-medium">Knowledge Base</span>
            </a>

            <a
              href="/group"
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition group ${pathname === '/group' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-300 hover:bg-[#2A2B32] hover:text-white'}`}
            >
              <i className={`fas fa-users w-5 text-center transition ${pathname === '/group' ? 'text-white' : 'group-hover:text-white'}`}></i>
              <span className="text-sm font-medium">Groups</span>
            </a>

            <a
              href="/referral"
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition group ${pathname === '/referral' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-300 hover:bg-[#2A2B32] hover:text-white'}`}
            >
              <i className={`fas fa-gift w-5 text-center transition ${pathname === '/referral' ? 'text-white' : 'group-hover:text-white'}`}></i>
              <span className="text-sm font-medium">Referral</span>
            </a>

            <a
              href="/subscription"
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition group ${pathname === '/subscription' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-300 hover:bg-[#2A2B32] hover:text-white'}`}
            >
              <i className={`fas fa-dollar-sign w-5 text-center transition ${pathname === '/subscription' ? 'text-white' : 'group-hover:text-white'}`}></i>
              <span className="text-sm font-medium">Subscription</span>
            </a>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-700/50">
          <div className="relative">
            <div
              id="logoutPopup"
              className={`${showLogoutPopup ? '' : 'hidden'} absolute bottom-full left-0 mb-2 w-60 bg-[#40414f] border border-gray-600 rounded-xl shadow-2xl overflow-hidden z-50`}
            >
              <div className="px-4 py-3 border-b border-gray-600">
                <p className="text-xs text-gray-400 uppercase font-bold">Account</p>
              </div>

              <a
                href="/profile"
                className="logout-item block px-4 py-3 text-sm text-gray-200 hover:bg-blue-600 hover:text-white transition flex items-center gap-3"
              >
                <i className="fas fa-user-circle w-5 text-center"></i>
                <span>My Profile</span>
              </a>

              <a
                href="/helpdesk"
                className="logout-item block px-4 py-3 text-sm text-gray-200 hover:bg-blue-600 hover:text-white transition flex items-center gap-3"
              >
                <i className="fas fa-headset w-5 text-center"></i>
                <span>Support Tickets</span>
              </a>

              <div className="border-t border-gray-600 my-1"></div>

              <button
                onClick={handleLogout}
                className="logout-item w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-600 hover:text-white transition flex items-center gap-3"
              >
                <i className="fas fa-sign-out-alt w-5 text-center"></i>
                <span>Log Out</span>
              </button>
            </div>

            <div
              id="userIcon"
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#2A2B32] cursor-pointer transition"
              onClick={toggleLogoutPopup}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                U
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">My Account</p>
              </div>
              <i className="fas fa-ellipsis-h text-gray-400"></i>
            </div>
          </div>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-gray-600 flex items-center justify-between px-4 bg-[#202123] z-20">
        <span className="font-bold text-white flex items-center gap-2">
          <img src="/img/aurion.jpg" className="w-6 h-6 rounded" alt="AURION" />
          AI-CaaS
        </span>
        <i className="fas fa-bars text-gray-300 text-lg cursor-pointer p-2" onClick={toggleSidebar}></i>
      </div>
    </>
  )
}