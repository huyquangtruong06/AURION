'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Head from 'next/head'
import ReactMarkdown from 'react-markdown'

export default function EmbedPage() {
  const searchParams = useSearchParams()
  const botId = searchParams.get('bot_id')
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello! How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // Load Font Awesome
    const link = document.createElement('link')
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    
    // Set body styles for embed
    document.body.style.backgroundColor = 'transparent'
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Use correct API URL based on environment
      const apiUrl = process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/chat/public`
        : '/api/chat/public'
        
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, bot_id: botId })
      })
      const data = await res.json()

      if (data.status === 'success') {
        setMessages(prev => [...prev, { role: 'ai', content: data.response }])
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: `Error: ${data.message}`, error: true }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection failed.', error: true }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white" style={{ height: '100dvh' }}>
      <div className="bg-blue-600 p-3 md:p-4 text-white flex justify-between items-center shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <i className="fas fa-robot"></i>
          </div>
          <div>
            <h3 className="font-bold text-sm">AI Support</h3>
            <div className="flex items-center gap-1 text-[10px] opacity-80">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
              Online
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 bg-gray-50 chat-scroll">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm max-w-[85%] ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : msg.error 
                  ? 'bg-red-50 border border-red-200 text-red-500 rounded-tl-none'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
            }`}>
              {msg.role === 'ai' && !msg.error ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-blue-600">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t shrink-0">
        <form onSubmit={sendMessage} className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-gray-100 text-gray-800 rounded-full px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            disabled={loading}
          />
          
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-10 h-10 md:w-9 md:h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition shadow-sm disabled:opacity-50 shrink-0"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </form>
        <div className="text-center mt-2">
          <a href="#" target="_blank" className="text-[10px] text-gray-400 hover:text-blue-500">
            Powered by AI-CaaS
          </a>
        </div>
      </div>

      <style jsx>{`
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        
        .typing-dot {
          animation: typing 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}
