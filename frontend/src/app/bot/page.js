'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/shared/ToastContainer'
import ConfirmModal from '@/components/shared/ConfirmModal'
import api from '@/lib/api'
import { showToast } from '@/lib/toast'
import { isAuthenticated } from '@/lib/auth'

export default function BotPage() {
  const router = useRouter()
  const [bots, setBots] = useState([])
  const [filteredBots, setFilteredBots] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ show: false, botId: null })
  const [embedModal, setEmbedModal] = useState({ show: false, botId: null, code: '' })
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: ''
  })

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/')
      return
    }
    fetchBots()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = bots.filter(bot =>
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bot.description && bot.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredBots(filtered)
    } else {
      setFilteredBots(bots)
    }
  }, [searchQuery, bots])

  const fetchBots = async () => {
    try {
      const res = await api.get('/bots')
      if (res.data.status === 'success') {
        setBots(res.data.data)
        setFilteredBots(res.data.data)
      }
    } catch (err) {
      showToast('Failed to load bots', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBot = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.system_prompt) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    try {
      const form = new FormData()
      form.append('name', formData.name)
      form.append('description', formData.description || '')
      form.append('system_prompt', formData.system_prompt)

      const res = await api.post('/bots/create', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data.status === 'success') {
        showToast(res.data.message, 'success')
        setShowModal(false)
        setFormData({ name: '', description: '', system_prompt: '' })
        fetchBots()
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to create bot', 'error')
    }
  }

  const handleDeleteBot = async (botId) => {
    try {
      const res = await api.delete(`/bots/${botId}`)
      if (res.data.status === 'success') {
        showToast('Bot deleted successfully', 'success')
        fetchBots()
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to delete bot', 'error')
    }
  }

  const showEmbedCode = (botId) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const code = `<script src="${origin}/script/widget.js?bot_id=${botId}" defer></script>`
    setEmbedModal({ show: true, botId, code })
  }

  const copyEmbedCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(embedModal.code).then(() => {
        showToast('Code copied to clipboard!', 'success')
      })
    }
  }

  const openChat = (botId) => {
    localStorage.setItem('currentBotId', botId)
    router.push('/chat')
  }

  return (
    <>
      <ToastContainer />
      
      <div className="flex h-screen overflow-hidden bg-[#202123] text-gray-100">
        <Sidebar />

        <main className="flex-1 flex flex-col h-full relative overflow-hidden pt-14 md:pt-0 bg-[#343541]">
          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
            <div className="max-w-6xl mx-auto w-full">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">My Bots</h1>

              {/* Search & Create Button */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div className="relative w-full md:w-96">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#40414f] text-white border border-gray-600 text-base md:text-sm rounded-xl block pl-11 p-3 outline-none focus:border-blue-500 transition"
                    placeholder="Search your bots..."
                  />
                </div>

                <button
                  onClick={() => setShowModal(true)}
                  className="w-full md:w-auto text-white bg-[#3b82f6] hover:bg-blue-600 font-medium rounded-xl text-sm px-6 py-3 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <i className="fas fa-plus"></i> Create Bot
                </button>
              </div>

              {/* Bot Grid */}
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <i className="fas fa-spinner fa-spin text-4xl text-gray-500"></i>
                </div>
              ) : filteredBots.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center mt-20">
                  <div className="relative mb-6 animate-float">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
                    <i className="fas fa-robot text-7xl text-gray-600 relative z-10"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No bots found</h3>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">
                    {searchQuery ? 'Try adjusting your search' : "You haven't created any AI assistants yet."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
                  {filteredBots.map((bot) => (
                    <div
                      key={bot.id}
                      className="bg-[#40414f] border border-gray-600 rounded-xl p-6 hover:border-gray-500 transition relative group flex flex-col justify-between h-full"
                    >
                      <button
                        onClick={() => setConfirmModal({ show: true, botId: bot.id })}
                        className="absolute top-4 right-4 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2 z-10"
                      >
                        <i className="fas fa-trash"></i>
                      </button>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
                          <i className="fas fa-robot"></i>
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-white truncate w-full" title={bot.name}>{bot.name}</h3>
                          <p className="text-xs text-gray-500">{new Date(bot.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mb-6 line-clamp-2 h-10 overflow-hidden">
                        {bot.description || 'No description provided.'}
                      </p>

                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => openChat(bot.id)}
                          className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-blue-600 rounded-lg text-sm text-white transition text-center font-medium"
                        >
                          <i className="fas fa-comment-alt mr-2"></i> Chat
                        </button>
                        <button
                          onClick={() => showEmbedCode(bot.id)}
                          className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
                          title="Get Embed Code"
                        >
                          <i className="fas fa-code"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create Bot Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm transition-opacity duration-300 p-4">
          <div className="bg-[#202123] border border-gray-600 w-full md:max-w-lg rounded-2xl p-5 md:p-6 relative animate-fade-in transform scale-100">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              <i className="fas fa-times text-lg"></i>
            </button>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500">
                <i className="fas fa-robot"></i>
              </div>
              Create New Bot
            </h2>

            <form onSubmit={handleCreateBot} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Bot Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#40414f] border border-gray-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-base md:text-sm"
                  placeholder="e.g. Python Expert"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#40414f] border border-gray-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-base md:text-sm"
                  placeholder="Short description..."
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  System Instructions <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  className="w-full bg-[#40414f] border border-gray-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none custom-scrollbar text-base md:text-sm"
                  rows="4"
                  placeholder="You are a helpful AI assistant..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-gray-300 hover:bg-[#40414f] transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white font-medium rounded-xl shadow-lg transition transform hover:-translate-y-0.5"
                >
                  Create Bot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal({ show: false, botId: null })}
        onConfirm={() => handleDeleteBot(confirmModal.botId)}
        title="Delete Bot?"
        message="Are you sure you want to delete this bot? This action cannot be undone."
      />

      {/* Embed Widget Modal */}
      {embedModal.show && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm transition-opacity duration-300 p-4">
          <div className="bg-[#202123] p-6 rounded-2xl w-full max-w-[500px] border border-gray-600 relative animate-fade-in transform scale-100">
            <button
              onClick={() => setEmbedModal({ show: false, botId: null, code: '' })}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              <i className="fas fa-times text-lg"></i>
            </button>

            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-code text-[#3b82f6]"></i> Embed Widget
            </h3>

            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Copy and paste the code below into your website's HTML, just before the closing <code className="bg-gray-700 px-1 rounded text-xs">&lt;/body&gt;</code> tag.
            </p>

            <div className="bg-black/40 p-4 rounded-xl border border-gray-700 relative group overflow-x-auto">
              <code className="text-green-400 text-xs break-all font-mono block leading-5">
                {embedModal.code}
              </code>

              <button
                onClick={copyEmbedCode}
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition flex items-center gap-1"
              >
                <i className="fas fa-copy"></i> Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
