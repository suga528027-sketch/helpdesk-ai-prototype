import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, RefreshCw, Eye, ChevronDown, AlertCircle } from 'lucide-react'
import { getAllTickets } from '../services/api'
import { PriorityBadge, StatusBadge, CategoryBadge, ActionBadge } from '../components/Badges'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const CATEGORIES = ['', 'Infrastructure', 'Application', 'Security', 'Database', 'Network', 'Access Management']
const PRIORITIES = ['', 'High', 'Medium', 'Low']
const STATUSES = ['', 'open', 'resolved', 'in_progress']

export default function Dashboard() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', priority: '', status: '' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 15

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const params = {
        limit: 100,
        offset: 0,
        ...(filters.category && { category: filters.category }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.status && { status: filters.status }),
      }
      const res = await getAllTickets(params)
      setTickets(res.data)
      setPage(0)
    } catch (err) {
      toast.error('Could not load tickets. Is the backend running?')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTickets() }, [filters])

  const filtered = tickets.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.title?.toLowerCase().includes(q) || t.ticket_id?.toLowerCase().includes(q)
  })

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const summary = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    escalated: tickets.filter(t => t.action_taken === 'escalated').length,
  }

  const SelectFilter = ({ value, onChange, options, id }) => (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-surface-800/80 border border-surface-700/60 text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-primary-500/50 cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
    </div>
  )

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">All tickets with filters and real-time status</p>
          </div>
          <button onClick={fetchTickets} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Tickets', value: summary.total, color: 'text-primary-400', bg: 'bg-primary-500/8', border: 'border-primary-500/20' },
            { label: 'Open', value: summary.open, color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/20' },
            { label: 'Resolved', value: summary.resolved, color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20' },
            { label: 'Escalated', value: summary.escalated, color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/20' },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} className={`card p-4 border ${border} ${bg}`}>
              <div className={`text-3xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters & search */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                id="ticket-search"
                placeholder="Search by title or ticket ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-surface-900/60 border border-surface-700/50 text-slate-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
              />
            </div>
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} className="text-slate-500" />
              <SelectFilter
                id="filter-category"
                value={filters.category}
                onChange={v => setFilters(f => ({ ...f, category: v }))}
                options={CATEGORIES.map(c => ({ value: c, label: c || 'All Categories' }))}
              />
              <SelectFilter
                id="filter-priority"
                value={filters.priority}
                onChange={v => setFilters(f => ({ ...f, priority: v }))}
                options={PRIORITIES.map(p => ({ value: p, label: p || 'All Priorities' }))}
              />
              <SelectFilter
                id="filter-status"
                value={filters.status}
                onChange={v => setFilters(f => ({ ...f, status: v }))}
                options={STATUSES.map(s => ({ value: s, label: s ? s.replace('_', ' ') : 'All Statuses' }))}
              />
            </div>
          </div>
        </div>

        {/* Tickets table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                <span className="text-slate-500 text-sm">Loading tickets...</span>
              </div>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <AlertCircle size={32} className="text-slate-600" />
              <p className="text-slate-500">No tickets found. Submit some tickets to get started!</p>
              <button onClick={() => navigate('/')} className="btn-primary text-sm px-4 py-2 mt-2">
                Submit Ticket
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-700/50">
                      {['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Action', 'Agent', 'Created', ''].map(h => (
                        <th key={h} className="text-xs font-semibold text-slate-500 text-left px-4 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/30">
                    {paginated.map((t, i) => (
                      <tr
                        key={t.ticket_id}
                        className="hover:bg-surface-700/20 transition-colors group animate-fade-in"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-primary-400">{t.ticket_id}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-sm text-slate-200 line-clamp-1 group-hover:text-white transition-colors">
                            {t.title}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <CategoryBadge category={t.category} />
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-4 py-3">
                          <ActionBadge action={t.action_taken} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-400">{t.assigned_agent || '—'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/ticket/${t.ticket_id}`)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700/30">
                  <span className="text-xs text-slate-500">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-7 h-7 text-xs rounded-lg transition-all ${
                          page === i ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-surface-700'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
