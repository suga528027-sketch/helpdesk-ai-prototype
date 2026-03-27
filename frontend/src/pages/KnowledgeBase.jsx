import React, { useState, useEffect } from 'react'
import { Search, BookOpen, ExternalLink, Filter, AlertCircle } from 'lucide-react'
import { getKnowledgeBase } from '../services/api'
import { PriorityBadge, CategoryBadge } from '../components/Badges'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const CATEGORIES = ['', 'Infrastructure', 'Application', 'Security', 'Database', 'Network', 'Access Management']

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [expanded, setExpanded] = useState(null)

  const fetch = async () => {
    setLoading(true)
    try {
      const params = { limit: 80, ...(search && { search }), ...(category && { category }) }
      const res = await getKnowledgeBase(params)
      setArticles(res.data)
    } catch {
      toast.error('Could not load knowledge base')
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [category])

  const handleSearch = (e) => {
    e.preventDefault()
    fetch()
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm font-medium mb-4">
            <BookOpen size={14} />
            RAG Knowledge Base
          </div>
          <h1 className="text-4xl font-black text-slate-100 mb-2">IT Solutions Library</h1>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Browse resolved tickets as searchable knowledge articles. 
            New resolutions are automatically added when tickets are auto-resolved.
          </p>
        </div>

        {/* Search + filter */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              id="kb-search"
              placeholder="Search resolutions, titles, or keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-800/80 border border-surface-700/60 text-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
            />
          </div>
          <select
            id="kb-category-filter"
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="bg-surface-800/80 border border-surface-700/60 text-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500/50"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All Categories'}</option>)}
          </select>
          <button type="submit" className="btn-primary px-5 py-3 text-sm flex items-center gap-2">
            <Search size={14} />
            Search
          </button>
        </form>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-6 text-sm text-slate-500">
          <span>{articles.length} articles found</span>
          <span>•</span>
          <span>Auto-updated from resolved tickets</span>
        </div>

        {/* Articles */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="card p-16 text-center">
            <AlertCircle size={36} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No articles found.</p>
            <p className="text-slate-600 text-sm mt-1">Submit and auto-resolve tickets to populate the knowledge base.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article, i) => (
              <div
                key={article.ticket_id}
                className="card-hover p-5 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${i * 20}ms` }}
                onClick={() => setExpanded(expanded === article.ticket_id ? null : article.ticket_id)}
                id={`kb-article-${article.ticket_id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-mono text-xs text-primary-400">{article.ticket_id}</span>
                      <CategoryBadge category={article.category} />
                      <PriorityBadge priority={article.priority} />
                      {article.similarity_score > 0 && (
                        <span className="text-xs text-slate-600">{article.similarity_score.toFixed(1)}% RAG</span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-200 mb-1 line-clamp-1">
                      {article.title}
                    </h3>
                    {expanded !== article.ticket_id ? (
                      <p className="text-sm text-slate-500 line-clamp-2">
                        {article.resolution}
                      </p>
                    ) : (
                      <div className="mt-3 text-sm text-slate-300 bg-surface-900/60 rounded-xl p-4 border border-surface-700/30 whitespace-pre-line leading-relaxed">
                        {article.resolution}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-600">
                      {formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}
                    </span>
                    <span className={`text-xs ${expanded === article.ticket_id ? 'text-primary-400' : 'text-slate-600'}`}>
                      {expanded === article.ticket_id ? '▲ Collapse' : '▼ Expand'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
