'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/shared/ToastContainer'
import api from '@/lib/api'
import { showToast } from '@/lib/toast'
import { isAuthenticated } from '@/lib/auth'

export default function HelpdeskPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [currentTicketId, setCurrentTicketId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showChatPanel, setShowChatPanel] = useState(false)
  const [createForm, setCreateForm] = useState({ subject: '', description: '' })
  const [replyMessage, setReplyMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const pollingInterval = useRef(null)
  const msgContainerRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/')
      return
    }
    fetchTickets()
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current)
    }
  }, [])

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets')
      if (res.data.status === 'success') {
        setTickets(res.data.data)
      }
    } catch (err) {
      showToast('Failed to load tickets', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    if (!createForm.subject || !createForm.description) {
      showToast('Please fill all fields', 'error')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('subject', createForm.subject)
      formData.append('description', createForm.description)
      
      const res = await api.post('/tickets/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      if (res.data.status === 'success') {
        showToast('Ticket created successfully', 'success')
        setShowCreateModal(false)
        setCreateForm({ subject: '', description: '' })
        fetchTickets()
      }
    } catch (err) {
      showToast('Failed to create ticket', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const openTicket = async (ticketId) => {
    try {
      const res = await api.get(`/tickets/${ticketId}`)
      if (res.data.status === 'success') {
        setSelectedTicket(res.data.data)
        setCurrentTicketId(ticketId)
        setShowChatPanel(true)
        startPollingForAIResponse(ticketId)
        setTimeout(() => {
          if (msgContainerRef.current) {
            msgContainerRef.current.scrollTop = msgContainerRef.current.scrollHeight
          }
        }, 100)
      }
    } catch (err) {
      showToast('Failed to load ticket details', 'error')
    }
  }

  const backToList = () => {
    setShowChatPanel(false)
    setSelectedTicket(null)
    setCurrentTicketId(null)
    if (pollingInterval.current) clearInterval(pollingInterval.current)
  }

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyMessage.trim()) return

    const msg = replyMessage.trim()
    setSubmitting(true)

    const tempMessage = {
      role: 'user',
      content: msg,
      date: 'Just now'
    }

    setSelectedTicket(prev => ({
      ...prev,
      messages: [...(prev.messages || []), tempMessage]
    }))

    setReplyMessage('')

    setTimeout(() => {
      if (msgContainerRef.current) {
        msgContainerRef.current.scrollTop = msgContainerRef.current.scrollHeight
      }
    }, 50)

    try {
      const formData = new FormData()
      formData.append('message', msg)
      await api.post(`/tickets/${currentTicketId}/reply`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      startPollingForAIResponse(currentTicketId)
    } catch (err) {
      showToast('Failed to send message', 'error')
      setSelectedTicket(prev => ({
        ...prev,
        messages: prev.messages.slice(0, -1)
      }))
      setReplyMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const startPollingForAIResponse = (ticketId) => {
    if (pollingInterval.current) clearInterval(pollingInterval.current)
    let attempts = 0
    const maxAttempts = 15

    pollingInterval.current = setInterval(async () => {
      attempts++
      try {
        const res = await api.get(`/tickets/${ticketId}`)
        if (res.data.status === 'success') {
          setSelectedTicket(res.data.data)
          
          const isAtBottom = msgContainerRef.current && 
            (msgContainerRef.current.scrollHeight - msgContainerRef.current.scrollTop <= 
             msgContainerRef.current.clientHeight + 100)
          
          if (isAtBottom && msgContainerRef.current) {
            setTimeout(() => {
              msgContainerRef.current.scrollTop = msgContainerRef.current.scrollHeight
            }, 50)
          }

          if (res.data.data.status === 'ANSWERED' || attempts >= maxAttempts) {
            clearInterval(pollingInterval.current)
            fetchTickets()
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 2000)
  }

  const getStatusColor = (status) => {
    if (status === 'OPEN') return 'bg-green-600'
    if (status === 'ANSWERED') return 'bg-yellow-600'
    if (status === 'PENDING') return 'bg-gray-500 animate-pulse'
    return 'bg-gray-600'
  }

  return (
    <>
      <ToastContainer />
      <div className="flex h-screen bg-[#202123]">
        <Sidebar />
        
        <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div className={`${showChatPanel ? 'hidden md:flex' : 'flex'} w-full md:w-96 bg-[#202123] border-r border-gray-700 flex-col`}>
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <i className="fas fa-headset text-blue-500"></i>
                  Support Tickets
                </h1>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
                >
                  <i className="fas fa-plus mr-2"></i>
                  New
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <i className="fas fa-spinner fa-spin text-3xl text-gray-400"></i>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                  <i className="fas fa-inbox text-5xl mb-4 opacity-50"></i>
                  <p className="text-sm">No tickets yet</p>
                  <p className="text-xs mt-2">Create a ticket to get support</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => openTicket(ticket.id)}
                      className={`p-4 cursor-pointer transition ${
                        currentTicketId === ticket.id 
                          ? 'bg-[#40414f]' 
                          : 'hover:bg-[#2A2B32]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-white text-sm line-clamp-1 flex-1">
                          {ticket.subject}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${getStatusColor(ticket.status)} text-white font-medium ml-2`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {ticket.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`${showChatPanel ? 'flex' : 'hidden md:flex'} flex-1 bg-[#343541] flex-col`}>
            {!selectedTicket ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <i className="fas fa-comments text-6xl mb-4 opacity-30"></i>
                <h2 className="text-xl font-bold mb-2">Select a Ticket</h2>
                <p className="text-sm text-center">Choose a ticket from the list to view conversation</p>
              </div>
            ) : (
              <>
                <div className="bg-[#202123] border-b border-gray-700 p-4 flex items-center justify-between">
                  <button
                    onClick={backToList}
                    className="md:hidden text-gray-400 hover:text-white mr-3 transition"
                  >
                    <i className="fas fa-arrow-left text-lg"></i>
                  </button>
                  <div className="flex-1">
                    <h2 className="text-white font-bold text-lg line-clamp-1">
                      {selectedTicket.subject}
                    </h2>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${getStatusColor(selectedTicket.status)} text-white font-medium ml-3`}>
                    {selectedTicket.status}
                  </span>
                </div>

                <div 
                  ref={msgContainerRef}
                  className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4"
                >
                  {selectedTicket.messages?.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-[#2A2B32] text-white rounded-br-none' 
                          : 'bg-[#40414f] text-gray-200 rounded-bl-none border border-gray-600'
                      }`}>
                        <div className="font-bold text-[10px] mb-1 uppercase opacity-70 flex items-center gap-1">
                          {msg.role === 'ai' ? (
                            <>
                              <i className="fas fa-robot"></i> AI
                            </>
                          ) : (
                            'You'
                          )}
                        </div>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 px-1">{msg.date}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-[#40414f] border-t border-gray-600 p-4">
                  <form onSubmit={handleReply} className="flex gap-3">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 bg-[#202123] text-white border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      disabled={submitting}
                    />
                    <button
                      type="submit"
                      disabled={submitting || !replyMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition disabled:opacity-50 shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
                    >
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-[#202123] border border-gray-600 w-full md:max-w-lg rounded-2xl shadow-2xl p-6 relative animate-fade-in">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              <i className="fas fa-times text-lg"></i>
            </button>

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <i className="fas fa-ticket-alt text-blue-500"></i>
              </div>
              Create Support Ticket
            </h2>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  className="w-full bg-[#40414f] border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-[#40414f] border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  rows="5"
                  placeholder="Provide detailed information about your issue..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    Create Ticket
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
