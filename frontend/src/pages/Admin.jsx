import React, { useState, useEffect } from 'react'
import { 
  Shield, Users, AlertTriangle, Mail, Settings, 
  ExternalLink, BarChart, RotateCcw, CheckCircle, Info
} from 'lucide-react'
import api, { getLeaderboard } from '../services/api'
import toast from 'react-hot-toast'

export default function Admin() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportEmail, setReportEmail] = useState('manager@company.com')

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/incidents/active')
        setIncidents(res.data)
      } catch (err) {
        toast.error('Could not load active incidents')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleSendReport = async () => {
    try {
      await api.post(`/reports/send-weekly`, null, { params: { email: reportEmail } })
      toast.success(`Weekly report sent to ${reportEmail}`)
    } catch (err) {
      toast.error('Failed to send report. Check SMTP config.')
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-3">
            <Shield size={28} className="text-primary-400" />
            Admin Command Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage system intelligence, incidents, and reporting</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-800 border border-surface-700 rounded-xl text-xs font-bold text-slate-300 hover:bg-surface-700 transition-all">
            <RotateCcw size={14} /> System Refresh
          </button>
          <div className="h-8 w-px bg-surface-800 mx-2" />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Engine Normal</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Alerts & Incidents */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Major Incidents */}
          <section className="card p-6 border-red-500/20 bg-red-500/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-tighter">
                <AlertTriangle size={18} className="text-red-500" />
                Live Major Incidents
              </h2>
              <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-[10px] font-black border border-red-500/20">
                {incidents.length} ACTIVE
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 animate-pulse">Scanning infrastructure...</div>
            ) : incidents.length > 0 ? (
              <div className="space-y-4">
                {incidents.map(inc => (
                  <div key={inc.id} className="p-4 bg-surface-900/60 rounded-2xl border border-surface-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:border-red-500/30 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[8px] font-black uppercase tracking-widest">{inc.category} Spike</span>
                        <span className="text-[10px] text-slate-500 font-mono italic">#{inc.id}</span>
                      </div>
                      <p className="text-sm text-slate-300 font-medium">{inc.message}</p>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all">
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center bg-surface-900/40 rounded-3xl border border-dashed border-surface-700">
                <CheckCircle size={32} className="text-emerald-500/30 mb-3" />
                <p className="text-xs font-bold text-slate-500 uppercase">No active spikes detected</p>
                <p className="text-[10px] text-slate-600 mt-1">AI Proactive Monitor is idling</p>
              </div>
            )}
          </section>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-5 border border-surface-700/50 bg-surface-900/40">
              <div className="flex items-center justify-between mb-4">
                <Users size={18} className="text-indigo-400" />
                <Settings size={14} className="text-slate-600 cursor-pointer hover:text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-100">22 / 24</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-1">Agents Online</div>
              <div className="mt-4 w-full bg-surface-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-[90%]" />
              </div>
            </div>
            
            <div className="card p-5 border border-surface-700/50 bg-surface-900/40">
              <div className="flex items-center justify-between mb-4">
                <BarChart size={18} className="text-primary-400" />
                <Info size={14} className="text-slate-600" />
              </div>
              <div className="text-2xl font-black text-slate-100">1,429</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-1">AI Tokens (Daily)</div>
              <div className="text-[10px] text-emerald-400 mt-2 font-mono italic">Efficiency: 98.4%</div>
            </div>
          </div>
        </div>

        {/* Right Column: Reporting & Config */}
        <div className="space-y-6">
          
          {/* Email Reporting Tool */}
          <section className="card p-6 border-indigo-500/20 bg-indigo-500/5">
            <h2 className="text-sm font-extrabold text-slate-200 flex items-center gap-2 mb-6 uppercase tracking-tight">
              <Mail size={18} className="text-indigo-400" />
              Manual Report Trigger
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Recipient Email</label>
                <input 
                  type="email" 
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
                  placeholder="manager@company.com"
                />
              </div>
              <button 
                onClick={handleSendReport}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
              >
                Dispatch Weekly Summary
              </button>
              <p className="text-[10px] text-center text-slate-500 italic">This triggers an immediate HTML summary to the recipient above.</p>
            </div>
          </section>

          {/* System Health Section */}
          <section className="card p-6 border-surface-700/50 bg-surface-900/20">
            <h2 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">Cluster Health</h2>
            <div className="space-y-3">
              {[
                { name: 'RAG Knowledge DB', status: 'Healthy', color: 'bg-emerald-500' },
                { name: 'Claude AI API', status: 'Stable', color: 'bg-emerald-500' },
                { name: 'WebSocket Stream', status: 'Active (22)', color: 'bg-blue-500' },
                { name: 'Email SMTP Relay', status: 'Ready', color: 'bg-emerald-500' },
                { name: 'FAISS Vector Engine', status: 'Indexed', color: 'bg-emerald-500' }
              ].map(sys => (
                <div key={sys.name} className="flex items-center justify-between p-2 rounded-lg bg-surface-950/50 border border-surface-800">
                  <span className="text-xs text-slate-300 font-medium">{sys.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{sys.status}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${sys.color}`} />
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
