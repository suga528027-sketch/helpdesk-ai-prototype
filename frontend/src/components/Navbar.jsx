import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Ticket, LayoutDashboard, PlusCircle, BookOpen, BarChart2,
  Menu, X, Shield, Bell, Check, User, Moon, Sun
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/', label: 'Submit Ticket', icon: Ticket },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/new-ticket', label: 'New Ticket', icon: PlusCircle },
  { path: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { path: '/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/admin', label: 'Admin', icon: Shield },
]

export default function Navbar({ darkMode, setDarkMode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handle)
    return () => window.removeEventListener('scroll', handle)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-surface-900/95 backdrop-blur-xl shadow-xl shadow-black/20 border-b border-surface-700/50'
                : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg">
              <User size={16} className="text-white" />
            </div>
            <div>
              <span className="text-lg font-bold gradient-text">HelpdeskAI</span>
              <div className="text-[10px] text-slate-500 font-medium -mt-0.5 leading-none">NASSCOM 2025</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-500/15 text-primary-400 border border-primary-500/25'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700/50'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Live badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">Live</span>
            </div>

            {/* Notifications */}
            <div className="relative group/notif">
              <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-surface-900 animate-pulse" />
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 mt-2 w-72 bg-surface-800 border border-surface-700 rounded-2xl shadow-2xl opacity-0 invisible group-hover/notif:opacity-100 group-hover/notif:visible transition-all duration-200 z-50 py-2">
                <div className="px-4 py-2 border-b border-surface-700 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-100 italic">NOTIFICATIONS</span>
                  <span className="text-[10px] text-primary-400 hover:underline cursor-pointer">Mark all read</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-surface-700/50 transition-colors cursor-pointer border-l-2 border-primary-500 bg-primary-500/5">
                    <p className="text-xs text-slate-200 font-medium">Ticket #TKT-4921 Resolved</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Your VPN access issue has been fixed by AI.</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-surface-700/50 transition-colors cursor-pointer border-l-2 border-amber-500">
                    <p className="text-xs text-slate-200 font-medium">Major Incident Detected</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Spike in Application category (5+ tickets).</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-surface-700">
              <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 border border-primary-500/30">
                <User size={16} />
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold text-slate-400 leading-none">ADMIN</p>
              </div>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-700/50 transition-all"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Mobile menu */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-700/50"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <div className="flex flex-col gap-1 mt-2">
              {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary-500/15 text-primary-400 border border-primary-500/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700/50'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
