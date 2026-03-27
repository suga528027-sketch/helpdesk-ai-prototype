import React, { useState, useEffect } from 'react'
import { Timer, AlertTriangle, CheckCircle } from 'lucide-react'

/**
 * SLA countdown timer component.
 */
export default function SLATimer({ slaDeadline, slaHours }) {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    const deadline = new Date(slaDeadline + (slaDeadline.includes('Z') ? '' : 'Z'))
    
    const calcRemaining = () => {
      const now = new Date()
      const diff = deadline - now
      if (diff <= 0) return setRemaining({ expired: true })
      
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const pct = Math.max(0, (diff / (slaHours * 3600000)) * 100)
      setRemaining({ h, m, s, pct, expired: false })
    }

    calcRemaining()
    const interval = setInterval(calcRemaining, 1000)
    return () => clearInterval(interval)
  }, [slaDeadline, slaHours])

  if (!remaining) return null

  if (remaining.expired) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-xl">
        <AlertTriangle size={16} className="text-red-400" />
        <span className="text-red-400 text-sm font-semibold">SLA Breached</span>
      </div>
    )
  }

  const isWarning = remaining.pct < 25
  const color = isWarning ? 'text-red-400' : remaining.pct < 50 ? 'text-amber-400' : 'text-emerald-400'
  const bg = isWarning ? 'bg-red-500/10 border-red-500/25' : remaining.pct < 50 ? 'bg-amber-500/10 border-amber-500/25' : 'bg-emerald-500/10 border-emerald-500/25'

  return (
    <div className={`flex flex-col gap-2 p-3 border rounded-xl ${bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer size={14} className={color} />
          <span className="text-xs text-slate-400 font-medium">SLA Deadline</span>
        </div>
        <span className={`text-xs font-bold ${color}`}>{slaHours}h SLA</span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-surface-700/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isWarning ? 'bg-red-500' : remaining.pct < 50 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${remaining.pct}%` }}
        />
      </div>

      <div className={`text-sm font-bold font-mono ${color} text-center`}>
        {String(remaining.h).padStart(2, '0')}:
        {String(remaining.m).padStart(2, '0')}:
        {String(remaining.s).padStart(2, '0')} remaining
      </div>
    </div>
  )
}
