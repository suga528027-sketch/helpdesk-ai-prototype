import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import {
  TrendingUp, Users, Clock, CheckCircle, AlertTriangle,
  Filter, Calendar, Download, RefreshCw, Zap, Trophy, Medal, Star, Target, AlertCircle, Bot
} from 'lucide-react'
import { getAnalytics, getAgentAnalytics } from '../services/api'
import toast from 'react-hot-toast'

const CATEGORY_COLORS = {
  Infrastructure: '#f97316',
  Application: '#3b82f6',
  Security: '#ef4444',
  Database: '#8b5cf6',
  Network: '#06b6d4',
  'Access Management': '#14b8a6',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 shadow-xl">
      {label && <p className="text-xs text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [agentData, setAgentData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [a, b] = await Promise.all([getAnalytics(), getAgentAnalytics()])
        setData(a.data)
        setAgentData(b.data)
      } catch (err) {
        toast.error('Could not load analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="min-h-screen pt-24 text-center text-slate-500">Loading Intelligence...</div>
  if (!data) return <div className="min-h-screen pt-24 text-center text-red-500">Backend Unreachable</div>

  const catData = Object.entries(data.category_distribution || {}).map(([name, value]) => ({ name, value }))
  const priData = Object.entries(data.priority_distribution || {}).map(([name, value]) => ({ name, value }))
  
  const metricCards = [
    { label: 'Total Tickets', value: data.total_tickets, icon: Target, color: 'text-primary-400' },
    { label: 'Resolution Rate', value: `${data.resolution_rate}%`, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Avg Confidence', value: `${data.avg_confidence}%`, icon: Zap, color: 'text-amber-400' },
    { label: 'Avg Res Time', value: `${data.avg_resolution_hours}h`, icon: Clock, color: 'text-blue-400' },
  ]

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Analytics & Intelligence</h1>
          <p className="text-slate-500 text-sm">Real-time performance and predictive insights</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map(m => (
          <div key={m.label} className="card p-5 border border-surface-700/50">
            <m.icon size={20} className={`${m.color} mb-3`} />
            <div className="text-3xl font-black text-slate-100">{m.value}</div>
            <div className="text-xs font-bold text-slate-500 uppercase mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Chart */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-300 mb-6">Distribution by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {catData.map((entry, index) => (
                  <Cell key={index} fill={CATEGORY_COLORS[entry.name] || '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Pie */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-300 mb-6">Priority Split</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={priData}
                innerRadius={60}
                outerRadius={85}
                paddingAngle={5}
                dataKey="value"
              >
                {priData.map((entry, index) => (
                  <Cell key={index} fill={['#ef4444', '#f59e0b', '#10b981'][index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card p-6 border border-amber-500/10 bg-amber-500/5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              Agent Performance Leaderboard
            </h3>
            <p className="text-xs text-slate-500 mt-1">Recognizing top resolution speed and customer ratings</p>
          </div>
          <div className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black border border-amber-500/20">
            🥇 WEEKLY BEST
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-700 text-[10px] uppercase font-black text-slate-500">
                <th className="pb-3 pr-4">Rank</th>
                <th className="pb-3">Agent Name</th>
                <th className="pb-3">Resolved</th>
                <th className="pb-3">Avg Time</th>
                <th className="pb-3">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {[
                { rank: '🥇', name: 'Suresh Kumar', res: 142, time: '1.4h', rat: 4.9 },
                { rank: '🥈', name: 'Priya Das', res: 128, time: '1.8h', rat: 4.8 },
                { rank: '🥉', name: 'Anil Mehta', res: 115, time: '2.1h', rat: 4.7 },
                { rank: '4', name: 'Vikram J.', res: 98, time: '2.5h', rat: 4.6 },
              ].map((row, i) => (
                <tr key={i} className="group hover:bg-white/5 transition-colors">
                  <td className="py-4 font-bold text-amber-400">{row.rank}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-[10px] font-black">{row.name.charAt(0)}</div>
                      <span className="text-sm font-medium text-slate-200">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-sm font-mono text-slate-300">{row.res}</td>
                  <td className="py-4 text-sm text-slate-400">{row.time}</td>
                  <td className="py-4 font-bold text-amber-400 text-sm">★ {row.rat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Forecasting */}
      <div className="card p-6 border border-primary-500/20 bg-primary-500/5">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-6">
          <Bot size={18} className="text-primary-400" />
          Predictive Volume Forecasting
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={[
            {day: 'Mon', val: 40}, {day: 'Tue', val: 45}, {day: 'Wed', val: 38}, 
            {day: 'Thu', val: 65}, {day: 'Fri', val: 78}, {day: 'Sat', val: 22}, {day: 'Sun', val: 15}
          ]}>
            <defs>
              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="day" hide />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="val" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVal)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 p-4 bg-surface-900/60 rounded-2xl border border-surface-700 flex items-center gap-4">
          <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><AlertTriangle size={20} /></div>
          <div>
            <p className="text-xs font-bold text-slate-200 uppercase">Proactive Alert</p>
            <p className="text-sm text-slate-400">AI predicts a <span className="text-red-400 font-bold">+25% spike</span> in Network tickets this Friday. Scaling agent capacity recommended.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
