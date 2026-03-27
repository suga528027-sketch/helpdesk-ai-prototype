import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTicket } from '../services/api'
import { PriorityBadge, StatusBadge, CategoryBadge, ActionBadge } from '../components/Badges'
import ConfidenceGauge from '../components/ConfidenceGauge'
import { ArrowLeft, AlertCircle } from 'lucide-react'

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getTicket(id)
        setTicket(res.data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  )

  if (error || !ticket) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="text-center">
        <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
        <p className="text-slate-400 mb-4">Ticket not found: {id}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary text-sm">
          Back to Dashboard
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-6 transition-colors">
          <ArrowLeft size={14} />
          Back to Dashboard
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-5">
            <div className="card p-5">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="font-mono text-sm text-primary-400">{ticket.ticket_id}</span>
                <CategoryBadge category={ticket.category} />
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
              </div>
              <h1 className="text-xl font-bold text-slate-100 mb-3">{ticket.title}</h1>
              <p className="text-sm text-slate-400 leading-relaxed">{ticket.description}</p>
            </div>

            {ticket.resolution && (
              <div className="card p-5 border border-emerald-500/15">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Resolution</h3>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-surface-900/40 rounded-xl p-4">
                  {ticket.resolution}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="card p-5 text-center">
              <h3 className="text-xs font-semibold text-slate-500 mb-3">Confidence</h3>
              <ConfidenceGauge value={ticket.confidence || 0} size={130} strokeWidth={12} />
            </div>
            <div className="card p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 mb-1">Details</h3>
              {[
                { label: 'Action', value: <ActionBadge action={ticket.action_taken} /> },
                { label: 'Agent', value: <span className="text-xs text-slate-300">{ticket.assigned_agent || '—'}</span> },
                { label: 'Sentiment', value: <span className="text-xs text-slate-300">{ticket.sentiment}</span> },
                { label: 'SLA Hours', value: <span className="text-xs text-slate-300">{ticket.sla_hours}h</span> },
                { label: 'Language', value: <span className="text-xs text-slate-300 uppercase">{ticket.language}</span> },
                { label: 'Created', value: <span className="text-xs text-slate-400">{new Date(ticket.created_at).toLocaleDateString()}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{label}</span>
                  {value}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
