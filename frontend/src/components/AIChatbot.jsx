import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { chatbotQuery } from '../services/api'

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: "👋 Hi! I'm your AI Helpdesk Assistant. Ask me about your ticket status or IT procedures." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatRef = useRef(null)

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const response = await chatbotQuery(userMsg)
      setMessages(prev => [...prev, { role: 'bot', text: response.data.response }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: "I'm having trouble reaching the brain right now. Please try again later." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[500px] bg-surface-800 border border-surface-700 rounded-3xl shadow-2xl flex flex-col mb-4 animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-primary-600 to-violet-700 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="font-bold text-white text-sm">Helpdesk AI Bot</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-900/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user' 
                    ? 'bg-primary-600 text-white rounded-tr-none' 
                    : 'bg-surface-700 text-slate-200 rounded-tl-none border border-surface-600/50'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-700 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-primary-400" />
                  <span className="text-xs text-slate-400">AI is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-surface-700 bg-surface-800">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about ticket status..."
                className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2.5 pl-4 pr-10 text-sm focus:border-primary-500 outline-none transition-all placeholder:text-slate-600 text-slate-200"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1.5 p-1.5 text-primary-500 hover:text-primary-400 disabled:opacity-30 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/20 hover:scale-110 active:scale-95 transition-all duration-300 group"
      >
        {isOpen ? <X className="text-white" /> : <MessageSquare className="text-white fill-current opacity-80 group-hover:opacity-100" />}
      </button>
    </div>
  )
}
