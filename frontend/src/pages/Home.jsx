import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Bot, User, Zap, Shield, AlertCircle, TicketIcon, Sparkles, ChevronRight, Image as ImageIcon, X } from 'lucide-react'
import { submitTicket, submitTicketWithImage } from '../services/api'
import toast from 'react-hot-toast'

const EXAMPLE_TICKETS = [
  { title: "Server down in production", desc: "Production server SRV-01 is completely unresponsive. Multiple services affected. CPU was at 99% before crash. Need immediate restore." },
  { title: "Cannot access VPN after password reset", desc: "After resetting my Active Directory password yesterday, my VPN client says authentication failed. MFA is also not sending codes to my phone." },
  { title: "Database queries running extremely slow", desc: "Our CRM application is timing out. Database queries that used to take 2 seconds are now taking 8 minutes. This started after the weekend maintenance." },
  { title: "Phishing email received from fake IT team", desc: "I received suspicious email from support@company-helpdesk.net asking for my password. This is not our normal IT email. Could be phishing." },
]

const FEATURES = [
  { icon: Zap, label: 'Auto-Resolution', desc: 'AI resolves high-confidence tickets instantly', color: 'text-amber-400' },
  { icon: Shield, label: 'Security First', desc: 'Ransomware & breach detection with isolation', color: 'text-red-400' },
  { icon: Bot, label: 'RAG-Powered', desc: 'Learns from 1000+ past ticket solutions', color: 'text-blue-400' },
  { icon: Sparkles, label: 'Smart Routing', desc: 'Workload-aware agent assignment', color: 'text-violet-400' },
]

// Mini chat message component
function ChatMessage({ role, content, typing = false }) {
  return (
    <div className={`flex gap-3 ${role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center ${
        role === 'bot' ? 'bg-gradient-to-br from-primary-600 to-violet-600' : 'bg-surface-600'
      }`}>
        {role === 'bot' ? <Bot size={14} className="text-white" /> : <User size={14} className="text-slate-300" />}
      </div>
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        role === 'bot'
          ? 'bg-surface-700/80 text-slate-200 rounded-tl-sm border border-surface-600/40'
          : 'bg-primary-600/80 text-white rounded-tr-sm'
      }`}>
        {typing ? (
          <div className="flex gap-1 py-1">
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : content}
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('form') // 'form' | 'chat'
  const [form, setForm] = useState({ title: '', description: '' })
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [visionParsing, setVisionParsing] = useState(false)
  const [loading, setLoading] = useState(false) // Added loading state

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
      // Trigger AI parsing simulation / actual call
      setVisionParsing(true)
      setTimeout(() => setVisionParsing(false), 2000)
    }
  }
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', content: "👋 Hi! I'm your AI Helpdesk assistant. Tell me your IT issue — I'll classify it, find similar solutions, and resolve it automatically if possible." }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatStep, setChatStep] = useState(0) // 0=waiting for title, 1=waiting for desc
  const [chatTicket, setChatTicket] = useState({ title: '', description: '' })
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      let res;
      if (image) {
        const formData = new FormData()
        formData.append('title', form.title)
        formData.append('description', form.description)
        formData.append('image', image)
        // Note: submitTicketWithImage in api.js handles the multipart header
        res = await submitTicketWithImage(formData)
      } else {
        // Send as JSON object for /ticket/submit
        res = await submitTicket({
          title: form.title,
          description: form.description
        })
      }
      toast.success('Ticket analyzed! Redirecting...')
      navigate('/result', { state: { result: res.data } })
    } catch (err) {
      console.error('Submission error:', err)
      const errorDetail = err.response?.data?.detail
      const errorMessage = typeof errorDetail === 'string' 
        ? errorDetail 
        : (Array.isArray(errorDetail) ? errorDetail[0]?.msg : 'Backend not available. Please start the FastAPI server.')
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleExampleClick = (ex) => {
    setForm({ title: ex.title, description: ex.desc })
    setImage(null) // Clear image when loading example
    setImagePreview(null)
    setVisionParsing(false)
    toast.success('Example loaded! Click Analyze to proceed.', { icon: '✨' })
  }

  const handleChatSend = async () => {
    const msg = chatInput.trim()
    if (!msg) return
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: msg }])

    if (chatStep === 0) {
      setChatTicket(t => ({ ...t, title: msg }))
      setChatStep(1)
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          role: 'bot',
          content: `Got it! Now please describe the issue in detail — what happened, when it started, who's affected, and any error messages you've seen.`
        }])
      }, 600)
    } else if (chatStep === 1) {
      const ticket = { title: chatTicket.title, description: msg }
      setChatTicket(t => ({ ...t, description: msg }))
      setChatMessages(prev => [...prev, { role: 'bot', content: '⏳ Analyzing your ticket with AI...', typing: false }])
      try {
        const res = await submitTicket(ticket)
        const r = res.data
        setChatMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'bot', content: `✅ Analysis complete!\n\n📌 Category: ${r.category}\n⚡ Action: ${r.action_taken.replace('_', ' ')}\n🎯 Confidence: ${r.confidence}%\n🔥 Priority: ${r.priority}\n\nRedirecting to full results...` }
        ])
        setTimeout(() => navigate('/result', { state: { result: r } }), 2000)
      } catch (err) {
        setChatMessages(prev => [...prev, { role: 'bot', content: '❌ Could not connect to AI backend. Please ensure the FastAPI server is running on port 8000.' }])
        setChatStep(0)
      }
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/25 rounded-full text-primary-400 text-sm font-medium mb-6">
            <Sparkles size={14} />
            NASSCOM Hackathon 2025 — AI Track
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-100 mb-4 tracking-tight leading-tight">
            AI-Powered{' '}
            <span className="gradient-text">IT Helpdesk</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Intelligent ticket classification using RAG + LLM. Auto-resolves, routes, or escalates tickets 
            with confidence scoring, SLA tracking, and sentiment analysis.
          </p>
        </div>

        {/* Feature chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-fade-in">
          {FEATURES.map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="card p-4 text-center">
              <Icon size={22} className={`${color} mx-auto mb-2`} />
              <div className="text-sm font-semibold text-slate-200 mb-1">{label}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left: Ticket Input */}
          <div className="animate-slide-up">
            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMode('form')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all border ${
                  mode === 'form'
                    ? 'bg-primary-500/15 border-primary-500/40 text-primary-400'
                    : 'bg-surface-800/50 border-surface-700/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                📋 Form Input
              </button>
              <button
                onClick={() => setMode('chat')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all border ${
                  mode === 'chat'
                    ? 'bg-primary-500/15 border-primary-500/40 text-primary-400'
                    : 'bg-surface-800/50 border-surface-700/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                💬 Chat Mode
              </button>
            </div>

            {mode === 'form' ? (
              <div className="gradient-border">
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-violet-600 rounded-xl flex items-center justify-center">
                      <TicketIcon size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">Submit a Ticket</h2>
                      <p className="text-xs text-slate-500">AI will classify and resolve instantly</p>
                    </div>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Ticket Title <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. Production server is down"
                          value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          maxLength={300}
                          id="ticket-title"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Description <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          className="input-field"
                          rows={6}
                          placeholder="Describe the issue in detail — what happened, when it started, who's affected, any error messages..."
                          value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          maxLength={5000}
                          id="ticket-description"
                        />
                        <div className="text-xs text-slate-600 text-right mt-1">{form.description.length}/5000</div>
                      </div>

                      {/* Image Upload Display */}
                      {imagePreview ? (
                        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-surface-700 bg-surface-900 group">
                          <img src={imagePreview} className="w-full h-full object-cover opacity-60" />
                          <div className="absolute inset-0 flex items-center justify-center gap-2">
                            {visionParsing ? (
                              <div className="flex items-center gap-2 text-primary-400 text-xs font-bold animate-pulse">
                                <Bot size={14} /> AI VISION PARSING...
                              </div>
                            ) : (
                              <div className="text-xs text-slate-300 font-medium flex items-center gap-2">
                                <Sparkles size={14} className="text-amber-400" /> Error Details Extracted
                              </div>
                            )}
                          </div>
                          <button onClick={() => {setImage(null); setImagePreview(null)}} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-surface-700 rounded-xl hover:border-primary-500/50 hover:bg-primary-500/5 transition-all cursor-pointer group">
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                          <ImageIcon size={18} className="text-slate-500 group-hover:text-primary-400" />
                          <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200">Attach Screenshot (Optional)</span>
                        </label>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      id="submit-ticket-btn"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          <Zap size={16} />
                          Analyze & Resolve with AI
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* Chat mode */
              <div className="card flex flex-col h-[480px]">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-700/50">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium text-slate-200">AI Helpdesk Assistant</span>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
                  {chatMessages.map((msg, i) => (
                    <ChatMessage key={i} role={msg.role} content={msg.content} typing={msg.typing} />
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-surface-700/50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field flex-1 py-2.5"
                      placeholder={chatStep === 0 ? "Describe your issue briefly..." : "Add more details..."}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                      id="chat-input"
                    />
                    <button
                      onClick={handleChatSend}
                      disabled={!chatInput.trim()}
                      className="btn-primary px-4 py-2.5"
                      id="chat-send-btn"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Examples + Info */}
          <div className="space-y-4 animate-fade-in">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <AlertCircle size={14} className="text-primary-400" />
                Try these example tickets
              </h3>
              <div className="space-y-2">
                {EXAMPLE_TICKETS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { handleExampleClick(ex); setMode('form') }}
                    className="w-full text-left p-3 rounded-xl bg-surface-900/60 border border-surface-700/40 hover:border-primary-500/40 hover:bg-surface-700/40 transition-all group"
                    id={`example-ticket-${i}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-200 group-hover:text-primary-300 transition-colors">{ex.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ex.desc}</div>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 group-hover:text-primary-400 transition-colors flex-shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Supported Categories</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { cat: 'Infrastructure', icon: '🖥️', color: 'text-orange-400' },
                  { cat: 'Application', icon: '📱', color: 'text-blue-400' },
                  { cat: 'Security', icon: '🔒', color: 'text-red-400' },
                  { cat: 'Database', icon: '🗄️', color: 'text-purple-400' },
                  { cat: 'Network', icon: '🌐', color: 'text-cyan-400' },
                  { cat: 'Access Mgmt', icon: '🔑', color: 'text-teal-400' },
                ].map(({ cat, icon, color }) => (
                  <div key={cat} className="flex items-center gap-2 px-3 py-2 bg-surface-900/50 rounded-lg border border-surface-700/30">
                    <span className="text-base">{icon}</span>
                    <span className={`text-xs font-medium ${color}`}>{cat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: '1000+', label: 'Tickets in KB' },
                { value: '94%', label: 'Classification Acc.' },
                { value: '<2s', label: 'Avg Response' },
              ].map(({ value, label }) => (
                <div key={label} className="card p-3 text-center">
                  <div className="text-xl font-bold gradient-text">{value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
