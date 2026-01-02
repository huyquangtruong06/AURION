'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/shared/ToastContainer'
import api from '@/lib/api'
import { showToast } from '@/lib/toast'
import { isAuthenticated } from '@/lib/auth'
import ReactMarkdown from 'react-markdown'

export default function ChatPage() {
  const router = useRouter()
  const messagesEndRef = useRef(null)
  const botButtonRef = useRef(null)
  const welcomeBotButtonRef = useRef(null)
  const botDropdownRef = useRef(null)
  const modelButtonRef = useRef(null)
  const modelDropdownRef = useRef(null)
  
  const [bots, setBots] = useState([])
  const [currentBotId, setCurrentBotId] = useState(null)
  const [currentBotName, setCurrentBotName] = useState('Choose AI')
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showBotDropdown, setShowBotDropdown] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false)
  const [planName, setPlanName] = useState('...')
  const [usageCount, setUsageCount] = useState('...')
  const [loadingSubscription, setLoadingSubscription] = useState(true)

  const models = [
    { category: 'Google Gemini', options: [
      { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash', badge: '⭐' },
      { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite' },
    ]},
    { category: 'Groq Native', options: [
      { value: 'groq/compound', label: 'groq/compound', badge: 'Auto', badgeColor: 'pink' },
      { value: 'groq/compound-mini', label: 'groq/compound-mini' },
    ]},
    { category: 'Meta Llama (Groq)', options: [
      { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile', badge: 'Smart', badgeColor: 'green' },
      { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant', badge: 'Fast', badgeColor: 'yellow' },
      { value: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'llama-4-maverick-17b', badge: 'New', badgeColor: 'purple' },
      { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'llama-4-scout-17b' },
    ]},
    { category: 'OpenAI OSS (Groq)', options: [
      { value: 'openai/gpt-oss-120b', label: 'gpt-oss-120b' },
      { value: 'openai/gpt-oss-20b', label: 'gpt-oss-20b' },
    ]},
    { category: 'Others', options: [
      { value: 'moonshotai/kimi-k2-instruct', label: 'moonshotai/kimi-k2' },
      { value: 'moonshotai/kimi-k2-instruct-0905', label: 'moonshotai/kimi-k2-0905' },
      { value: 'qwen/qwen3-32b', label: 'qwen/qwen3-32b', badge: 'Code', badgeColor: 'orange' },
    ]},
  ]

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/')
      return
    }

    fetchBots()
    fetchSubscriptionStatus()

    // Check for bot_id in URL query params (from group chat)
    const urlParams = new URLSearchParams(window.location.search)
    const botIdFromUrl = urlParams.get('bot_id')

    if (botIdFromUrl) {
      setCurrentBotId(botIdFromUrl)
      localStorage.setItem('currentBotId', botIdFromUrl)
      loadChatHistory(botIdFromUrl)
    } else {
      const savedBotId = localStorage.getItem('currentBotId')
      if (savedBotId) {
        setCurrentBotId(savedBotId)
        loadChatHistory(savedBotId)
      } else {
        loadChatHistory(null)
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const handleClickOutside = (e) => {
      const botButtonClicked = botButtonRef.current?.contains(e.target) || welcomeBotButtonRef.current?.contains(e.target)
      const botDropdownClicked = botDropdownRef.current?.contains(e.target)
      const modelButtonClicked = modelButtonRef.current?.contains(e.target)
      const modelDropdownClicked = modelDropdownRef.current?.contains(e.target)

      if (showBotDropdown && !botButtonClicked && !botDropdownClicked) {
        setShowBotDropdown(false)
      }

      if (showModelDropdown && !modelButtonClicked && !modelDropdownClicked) {
        setShowModelDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showBotDropdown, showModelDropdown])

  useEffect(() => {
    if (currentBotId && bots.length > 0) {
      const bot = bots.find(b => String(b.id) === String(currentBotId))
      setCurrentBotName(bot?.name || 'AI Assistant')
    }
  }, [bots, currentBotId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchBots = async () => {
    try {
      const res = await api.get('/bots')
      if (res.data.status === 'success') {
        setBots(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load bots', err)
    }
  }

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await api.get('/subscription')
      if (res.data.status === 'success') {
        const info = res.data.data
        setUsageCount(`${info.usage}/${info.limit}`)
        setPlanName(info.plan === 'pro' ? 'PRO' : 'FREE')
        setLoadingSubscription(false)
      }
    } catch (err) {
      setUsageCount('N/A')
      setPlanName('FREE')
      setLoadingSubscription(false)
    }
  }

  const loadChatHistory = async (botId) => {
    try {
      const endpoint = botId ? `/chat/history?bot_id=${botId}` : '/chat/history'
      const res = await api.get(endpoint)
      
      if (res.data.status === 'success') {
        setMessages(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load chat history', err)
    }
  }

  const handleBotChange = (botId) => {
    setShowBotDropdown(false)
    setCurrentBotId(botId)
    localStorage.setItem('currentBotId', botId || '')
    
    if (botId) {
      const bot = bots.find(b => String(b.id) === String(botId))
      setCurrentBotName(bot?.name || 'AI Assistant')
    } else {
      setCurrentBotName('Choose AI')
    }
    
    loadChatHistory(botId)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!currentBotId) {
      showToast('Please select a bot first', 'warning')
      return
    }
    
    if (!inputMessage.trim() || loading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setLoading(true)

    // Optimistically add user message
    const tempUserMsg = {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const res = await api.post('/chat/message', {
        message: userMessage,
        bot_id: currentBotId,
        model: selectedModel
      })

      if (res.data.status === 'success') {
        const aiMessage = {
          role: 'ai',
          content: res.data.response,
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, aiMessage])
        fetchSubscriptionStatus()
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      if (err.response?.status === 402) {
        showToast('Daily limit reached! Please upgrade to PRO.', 'warning')
      } else {
        showToast('Failed to send message', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    if (messages.length === 0) {
      showToast('No history to clear', 'info')
      return
    }

    setShowClearHistoryModal(true)
  }

  const confirmClearHistory = async () => {
    try {
      const endpoint = currentBotId 
        ? `/chat/history/${currentBotId}`
        : '/chat/history'
      
      const res = await api.delete(endpoint)
      if (res.data.status === 'success') {
        setMessages([])
        showToast('Chat history cleared', 'success')
      }
    } catch (err) {
      showToast('Failed to clear history', 'error')
    }
    setShowClearHistoryModal(false)
  }

  const handleNewChat = () => {
    setShowNewChatModal(true)
  }

  const confirmNewChat = () => {
    setMessages([])
    setInputMessage('')
    setCurrentBotId(null)
    setCurrentBotName('Choose AI')
    localStorage.removeItem('currentBotId')
    setShowNewChatModal(false)
  }

  return (
    <>
      <ToastContainer />
      
      <div className="flex h-screen overflow-hidden bg-[#202123] text-gray-100">
        <Sidebar />

        <main className="flex-1 flex flex-col h-full relative pt-14 md:pt-0 bg-[#343541]">
          {showNewChatModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay animate-fade-in">
              <div className="bg-[#2A2B32] border border-gray-600 rounded-xl p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <i className="fas fa-eraser text-blue-400"></i>
                  Start New Chat?
                </h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  This clears the current conversation from the screen. Chat history stays saved.
                </p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowNewChatModal(false)} className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition text-sm">
                    Cancel
                  </button>
                  <button onClick={confirmNewChat} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-sm font-medium">
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {showClearHistoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay animate-fade-in">
              <div className="bg-[#2A2B32] border border-red-600/50 rounded-xl p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <i className="fas fa-trash-alt text-red-400"></i>
                  Clear Chat History?
                </h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  This will permanently delete all chat history for this bot. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowClearHistoryModal(false)} className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition text-sm">
                    Cancel
                  </button>
                  <button onClick={confirmClearHistory} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition text-sm font-medium">
                    Delete Forever
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col p-4 md:p-0 overflow-y-auto custom-scrollbar relative">
            <div className="w-full max-w-3xl mx-auto flex flex-col pt-6 pb-32 px-2">
              {messages.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="pointer-events-auto text-center max-w-2xl w-full p-6">
                    <div className="relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/20 rounded-full blur-[60px]"></div>
                      <div className="text-5xl mb-6 animate-bounce">👋</div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Hi, good morning!</h1>
                    <p className="text-gray-400 mb-8 text-lg font-light">I'm AI-CaaS, your personal assistant. Select an AI to start.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                      <a
                        href="/bot"
                        className="px-4 py-3 bg-[#2A2B32] border border-white/5 rounded-xl text-gray-300 text-sm hover:bg-[#343541] hover:border-white/20 transition text-left flex items-center gap-3 group"
                      >
                        <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-robot"></i></span>
                        <div>
                          <div className="font-medium text-white">Create a Bot</div>
                          <div className="text-xs text-gray-500">Customize your AI</div>
                        </div>
                      </a>
                      <button
                        ref={welcomeBotButtonRef}
                        onClick={() => setShowBotDropdown(true)}
                        className="px-4 py-3 bg-[#2A2B32] border border-white/5 rounded-xl text-gray-300 text-sm hover:bg-[#343541] hover:border-white/20 transition text-left flex items-center gap-3 group"
                      >
                        <span className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-comment-dots"></i></span>
                        <div>
                          <div className="font-medium text-white">Select AI</div>
                          <div className="text-xs text-gray-500">Choose from your list</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`chat-row ${msg.role === 'user' ? 'user' : 'ai'}`}
                    >
                      {msg.role === 'ai' && (
                        <div className="chat-avatar ai">AI</div>
                      )}

                      <div className={`message-bubble ${msg.role === 'user' ? 'bg-[#2A2B32] text-[#ececf1] px-4 py-3 rounded-xl' : 'text-gray-100'}`}>
                        {msg.role === 'ai' ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {msg.role === 'user' && (
                        <div className="chat-avatar user">U</div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-4 justify-start">
                      <div className="chat-avatar ai">AI</div>
                      <div className="bg-[#2A2B32] border border-gray-700 px-4 py-3 rounded-2xl">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          <div className="p-4 md:pb-8 md:px-4 bg-gradient-to-t from-[#343541] via-[#343541] to-transparent w-full z-10">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="relative group">
                  <button
                    ref={botButtonRef}
                    onClick={() => {
                      if (!showBotDropdown) fetchBots()
                      setShowBotDropdown(!showBotDropdown)
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#40414f] border border-white/10 rounded-full text-xs font-semibold text-gray-200 cursor-pointer hover:bg-gray-600 transition select-none"
                  >
                    <i className="fas fa-robot text-blue-400"></i>
                    <span>{currentBotName}</span>
                    <i className="fas fa-chevron-down text-[10px] text-gray-500 ml-1"></i>
                  </button>

                  {showBotDropdown && (
                    <div
                      ref={botDropdownRef}
                      className="absolute bottom-full left-0 mb-2 w-64 glass-panel rounded-xl overflow-hidden z-50 animate-fade-in border border-white/10"
                    >
                      <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-black/20 border-b border-white/5">
                        Select Assistant
                      </div>

                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {bots.length === 0 ? (
                          <div className="p-3 text-center text-gray-500 text-xs">
                            <i className="fas fa-spinner fa-spin"></i> Loading...
                          </div>
                        ) : (
                          bots.map((bot) => (
                            <button
                              key={bot.id}
                              onClick={() => handleBotChange(bot.id)}
                              className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-blue-600 hover:text-white transition flex items-center gap-3"
                            >
                              <i className="fas fa-robot w-5 text-center"></i>
                              <span className="truncate">{bot.name}</span>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="p-2 border-t border-white/5 bg-black/20">
                        <a
                          href="/bot"
                          className="w-full block text-center text-xs text-blue-400 hover:text-white hover:bg-white/5 py-2 rounded transition"
                        >
                          <i className="fas fa-plus mr-1"></i> Create New Bot
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 text-gray-400">
                  <i onClick={handleNewChat} className="fas fa-comment hover:text-white cursor-pointer transition text-sm" title="New Chat"></i>
                  <i onClick={handleClearHistory} className="fas fa-trash-alt hover:text-red-400 cursor-pointer transition text-sm" title="Clear History"></i>
                </div>
              </div>

              <div className="relative w-full bg-[#40414f] border border-gray-600/50 rounded-3xl transition-all input-glow flex flex-col">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={!currentBotId ? "Please select a bot first..." : "Message AI-CaaS..."}
                  className="w-full bg-transparent border-0 text-white placeholder-gray-400 focus:ring-0 outline-none resize-none px-5 py-4 min-h-[56px] max-h-[200px] overflow-y-auto leading-relaxed custom-scrollbar text-[15px] md:text-sm"
                  rows={1}
                  disabled={loading || !currentBotId}
                />

                <div className="flex justify-between items-center px-3 pb-3 pt-1">
                  <div className="relative">
                    <button
                      ref={modelButtonRef}
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className="flex items-center gap-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-black/20 px-3 py-1.5 rounded-lg transition border border-transparent hover:border-white/10"
                    >
                      <span>{selectedModel}</span>
                      <i className="fas fa-chevron-up text-[10px] opacity-50"></i>
                    </button>

                    {showModelDropdown && (
                      <div
                        ref={modelDropdownRef}
                        className="absolute bottom-full left-0 mb-2 w-72 glass-panel rounded-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto custom-scrollbar border border-white/10"
                      >
                        {models.map((group) => (
                          <div key={group.category}>
                            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-black/20 sticky top-0 backdrop-blur-md">
                              {group.category}
                            </div>
                            {group.options.map((model) => (
                              <div
                                key={model.value}
                                className="px-4 py-2.5 text-sm text-gray-200 hover:bg-blue-600 hover:text-white cursor-pointer transition flex justify-between"
                                onClick={() => {
                                  setSelectedModel(model.value)
                                  setShowModelDropdown(false)
                                }}
                              >
                                <span>{model.label}</span>
                                {model.badge && (
                                  <span
                                    className={`text-xs ml-1 ${
                                      model.badgeColor === 'pink' ? 'text-pink-400' :
                                      model.badgeColor === 'green' ? 'text-green-400' :
                                      model.badgeColor === 'yellow' ? 'text-yellow-400' :
                                      model.badgeColor === 'purple' ? 'text-purple-400' :
                                      model.badgeColor === 'orange' ? 'text-orange-400' : 'text-blue-300'
                                    }`}
                                  >
                                    ({model.badge})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={loading || !inputMessage.trim() || !currentBotId}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-black hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-arrow-up text-sm"></i>
                  </button>
                </div>
              </div>

              <div className="flex justify-center items-center mt-3 gap-3 text-[11px] text-gray-500">
                <div className="flex items-center gap-1.5 bg-black/10 px-2 py-1 rounded">
                  {loadingSubscription ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-bolt"></i>
                  )}
                  <span className={`font-bold uppercase ${planName === 'PRO' ? 'text-yellow-500' : ''}`}>{planName}</span>
                  <span className="text-gray-600">|</span>
                  <span className="font-mono text-gray-400">{usageCount}</span>
                </div>
                <a href="/subscription" className="hover:text-gptGreen transition flex items-center gap-1">
                  Upgrade to Pro <i className="fas fa-external-link-alt text-[9px]"></i>
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
