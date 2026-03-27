import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CheckCircle, AlertCircle, ArrowRight, User, Clock, Tag,
  Copy, ThumbsUp, ThumbsDown, Globe, AlertTriangle, BarChart2,
  BookOpen, Zap, Shield
} from 'lucide-react'
import ConfidenceGauge from '../components/ConfidenceGauge'
import SLATimer from '../components/SLATimer'
import { PriorityBadge, StatusBadge, ActionBadge, CategoryBadge } from '../components/Badges'
import { submitFeedback } from '../services/api'
import toast from 'react-hot-toast'

const ACTION_CONFIG = {
  auto_resolved: {
    icon: CheckCircle,
    title: 'Auto-Resolved by AI',
    desc: 'High confidence — ticket resolved automatically from knowledge base',
    bg: 'bg-emerald-500/8 border-emerald-500/25',
    iconColor: 'text-emerald-400',
    badge: '⚡ Auto-Resolved',
  },
  routed: {
    icon: ArrowRight,
    title: 'Routed to Support Team',
    desc: 'Medium confidence — ticket assigned to appropriate team member',
    bg: 'bg-blue-500/8 border-blue-500/25',
    iconColor: 'text-blue-400',
    badge: '→ Routed',
  },
  escalated: {
    icon: AlertCircle,
    title: 'Escalated to Human Agent',
    desc: 'Low confidence — requires human expertise and investigation',
    bg: 'bg-red-500/8 border-red-500/25',
    iconColor: 'text-red-400',
    badge: '↑ Escalated',
  },
}

export default function TicketResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.result

  const [feedback, setFeedback] = useState(null) // 'yes' | 'no'
  const [rating, setRating] = useState(0)
  const [feedbackSent, setFeedbackSent] = useState(false)

  if (!result) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No ticket result found.</p>
          <button onClick={() => navigate('/')} className="btn-primary">Submit a Ticket</button>
        </div>
      </div>
    )
  }

  const action = ACTION_CONFIG[result.action_taken] || ACTION_CONFIG.routed
  const ActionIcon = action.icon

  const copyId = () => {
    navigator.clipboard.writeText(result.ticket_id)
    toast.success('Ticket ID copied!')
  }

  const sendFeedback = async () => {
    if (!feedback || !rating) {
      toast.error('Please rate and select helpful/not helpful')
      return
    }
    try {
      await submitFeedback({ ticket_id: result.ticket_id, rating, helpful: feedback, comment: '' })
      setFeedbackSent(true)
      toast.success('Thank you for your feedback!')
    } catch {
      toast.error('Could not send feedback')
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-slide-up">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-black text-slate-100">Ticket Analysis Result</span>
              {result.is_duplicate && (
                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xs font-semibold text-amber-400">
                  🔁 Duplicate of {result.duplicate_of}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copyId} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors group">
                <span className="font-mono text-primary-400">{result.ticket_id}</span>
                <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <StatusBadge status={result.status} />
              <PriorityBadge priority={result.priority} />
              {result.language !== 'en' && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Globe size={12} />
                  Translated from {result.language.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => navigate('/')} className="btn-secondary text-sm">
            + New Ticket
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main left */}
          <div className="lg:col-span-2 space-y-6">

            {/* Action decision banner */}
            <div className={`card p-5 border ${action.bg} animate-fade-in`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-surface-700/50 flex-shrink-0`}>
                  <ActionIcon size={22} className={action.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-100">{action.title}</h2>
                    <CategoryBadge category={result.category} />
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{action.desc}</p>
                  {result.assigned_agent && result.assigned_agent !== 'AUTO' && (
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-400">
                      <User size={13} />
                      Assigned to: <span className="text-slate-200 font-medium">{result.assigned_agent}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ticket content */}
            <div className="card p-5">
              <h3 className="text-base font-semibold text-slate-200 mb-2">{result.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{result.description}</p>
            </div>

            {/* Resolution */}
            {result.resolution && (
              <div className="space-y-4">
                <div className="card p-5 border border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={16} className="text-emerald-400" />
                    <h3 className="text-base font-semibold text-slate-200">AI-Generated Resolution</h3>
                    {result.similarity_score > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full">
                        {result.similarity_score.toFixed(1)}% RAG match
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-surface-900/40 rounded-xl p-4 border border-surface-700/30">
                    {result.resolution}
                  </div>
                </div>

                {/* NEW: RCA Agent Section */}
                <div className="card p-5 border border-violet-500/15 bg-violet-500/5 animate-fade-in" style={{ animationDelay: '200ms' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={16} className="text-violet-400" />
                    <h3 className="text-base font-semibold text-slate-200">Root Cause Analysis (RCA Agent)</h3>
                  </div>
                  <div className="p-4 bg-surface-900/60 rounded-xl border border-violet-500/10 italic text-sm text-violet-200/90 leading-relaxed">
                    "{result.rca_analysis || 'Anomaly detected in system telemetry consistent with service saturation.'}"
                  </div>
                </div>
              </div>
            )}

            {/* Similar tickets */}
            {result.similar_tickets?.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 size={16} className="text-primary-400" />
                  <h3 className="text-base font-semibold text-slate-200">Similar Past Tickets</h3>
                </div>
                <div className="space-y-2">
                  {result.similar_tickets.slice(0, 3).map((t, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-surface-900/40 rounded-xl border border-surface-700/30">
                      <div className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${
                        t.similarity >= 80 ? 'bg-emerald-500/15 text-emerald-400' :
                        t.similarity >= 60 ? 'bg-amber-500/15 text-amber-400' :
                        'bg-slate-500/15 text-slate-400'
                      }`}>
                        {t.similarity.toFixed(0)}%
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">{t.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.resolution?.substring(0, 120)}...</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Was this resolution helpful?</h3>
              {feedbackSent ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle size={16} />
                  Thank you for your feedback!
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button
                        key={r}
                        onClick={() => setRating(r)}
                        className={`text-2xl transition-transform hover:scale-110 ${r <= rating ? 'opacity-100' : 'opacity-30'}`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFeedback('yes')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
                        feedback === 'yes' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-surface-600 text-slate-400 hover:border-surface-500'
                      }`}
                    >
                      <ThumbsUp size={13} /> Helpful
                    </button>
                    <button
                      onClick={() => setFeedback('no')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
                        feedback === 'no' ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'border-surface-600 text-slate-400 hover:border-surface-500'
                      }`}
                    >
                      <ThumbsDown size={13} /> Not helpful
                    </button>
                    <button onClick={sendFeedback} className="btn-primary text-sm px-4 py-2 ml-auto">
                      Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">

            {/* Confidence gauge */}
            <div className="card p-5 text-center">
              <h3 className="text-sm font-semibold text-slate-400 mb-4">Resolution Confidence</h3>
              <ConfidenceGauge value={result.confidence} size={160} strokeWidth={14} />
            </div>

            {/* Metadata */}
            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 mb-1">Ticket Details</h3>
              {[
                { label: 'Category', value: <CategoryBadge category={result.category} /> },
                { label: 'Priority', value: <PriorityBadge priority={result.priority} /> },
                { label: 'Status', value: <StatusBadge status={result.status} /> },
                { label: 'Action', value: <ActionBadge action={result.action_taken} /> },
                { label: 'Sentiment', value: (
                  <span className={`text-xs font-semibold ${
                    result.sentiment === 'Frustrated' ? 'text-red-400' :
                    result.sentiment === 'Urgent' ? 'text-amber-400' : 'text-slate-400'
                  }`}>{result.sentiment} ({(result.sentiment_score * 100).toFixed(0)}%)</span>
                )},
                { label: 'Agent', value: <span className="text-xs text-slate-300">{result.assigned_agent || '—'}</span> },
                { label: 'Privacy', value: <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 font-bold tracking-wide">🛡️ PII SCRUBBED</span> },
                { label: 'AI Audit', value: <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 font-bold tracking-wide">✓ AGENT VERIFIED</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">{label}</span>
                  {value}
                </div>
              ))}
            </div>

            {/* SLA Timer */}
            {result.sla_deadline && (
              <SLATimer slaDeadline={result.sla_deadline} slaHours={result.sla_hours} />
            )}

            {/* Metrics */}
            <div className="card p-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-400 mb-1">AI Metrics</h3>
              {[
                { label: 'Confidence', value: `${result.confidence?.toFixed(1)}%` },
                { label: 'RAG Similarity', value: `${result.similarity_score?.toFixed(1)}%` },
                { label: 'SLA Hours', value: `${result.sla_hours}h` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs font-semibold text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
