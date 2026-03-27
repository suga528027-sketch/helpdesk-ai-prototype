import React from 'react'

const COLORS = {
  High: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25' },
  Medium: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
  Low: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
}

const STATUS_COLORS = {
  resolved: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', label: 'Resolved' },
  open: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', label: 'Open' },
  in_progress: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25', label: 'In Progress' },
}

const ACTION_COLORS = {
  auto_resolved: { text: 'text-emerald-400', label: 'Auto-Resolved', icon: '⚡' },
  routed: { text: 'text-blue-400', label: 'Routed to Team', icon: '→' },
  escalated: { text: 'text-red-400', label: 'Escalated', icon: '↑' },
}

export function PriorityBadge({ priority, className = '' }) {
  const c = COLORS[priority] || COLORS.Medium
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {priority}
    </span>
  )
}

export function StatusBadge({ status, className = '' }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.open
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border} ${className}`}>
      {c.label}
    </span>
  )
}

export function ActionBadge({ action, className = '' }) {
  const c = ACTION_COLORS[action] || ACTION_COLORS.routed
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${c.text} ${className}`}>
      <span>{c.icon}</span> {c.label}
    </span>
  )
}

export function CategoryBadge({ category, className = '' }) {
  const CAT_COLORS = {
    Infrastructure: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
    Application: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
    Security: 'bg-red-500/10 text-red-400 border-red-500/25',
    Database: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
    Network: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
    'Access Management': 'bg-teal-500/10 text-teal-400 border-teal-500/25',
  }
  const cls = CAT_COLORS[category] || 'bg-slate-500/10 text-slate-400 border-slate-500/25'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls} ${className}`}>
      {category}
    </span>
  )
}
