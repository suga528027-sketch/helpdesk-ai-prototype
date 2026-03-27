import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import TicketResult from './pages/TicketResult'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import KnowledgeBase from './pages/KnowledgeBase'
import TicketDetail from './pages/TicketDetail'
import Admin from './pages/Admin'
import AIChatbot from './components/AIChatbot'

export default function App() {
  const [darkMode, setDarkMode] = useState(true)

  return (
    <BrowserRouter>
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-surface-950 text-slate-100 font-sans">
          <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
          
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/result" element={<TicketResult />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/ticket/:id" element={<TicketDetail />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="text-center py-8 text-slate-700 text-xs border-t border-surface-800/50 mt-8">
            HelpdeskAI — NASSCOM Hackathon 2025 · Built with FastAPI + React + RAG + Claude AI
          </footer>

          {/* AI Chatbot Floating Component */}
          <AIChatbot />
        </div>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '12px',
            fontSize: '13px',
          },
        }}
      />
    </BrowserRouter>
  )
}
