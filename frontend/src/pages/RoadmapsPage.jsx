import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../lib/api'
import { CATEGORIES, CATEGORY_COLORS } from '../lib/constants'

const DIFFICULTY_COLORS = {
  beginner: { dot: 'bg-green', text: 'text-green' },
  intermediate: { dot: 'bg-amber', text: 'text-amber' },
  advanced: { dot: 'bg-red', text: 'text-red' },
}

const CATEGORY_ICONS = {
  'role-based': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  'skill-based': 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  'absolute-beginners': 'M13 10V3L4 14h7v7l9-11h-7z',
  'web-development': 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  'frameworks': 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  languages: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
  'ai-ml': 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  devops: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
  mobile: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  databases: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
  'cyber-security': 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  'computer-science': 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
  'security': 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  'version-control': 'M4 7v10c2.21 0 4-1.79 4-4V7c0-2.21 1.79-4 4-4s4 1.79 4 4v6c0 2.21 1.79 4 4 4V7M4 7c0-2.21 1.79-4 4-4s4 1.79 4 4v6c0 2.21 1.79 4 4 4',
  'ui-ux': 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
  'soft-skills': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-bg-2 p-5 animate-pulse">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-bg-3" />
        <div className="h-4 w-16 rounded bg-bg-3" />
      </div>
      <div className="mb-2 h-5 w-3/4 rounded bg-bg-3" />
      <div className="mb-1 h-3 w-full rounded bg-bg-3" />
      <div className="mb-3 h-3 w-2/3 rounded bg-bg-3" />
      <div className="flex gap-3">
        <div className="h-3 w-16 rounded bg-bg-3" />
        <div className="h-3 w-20 rounded bg-bg-3" />
      </div>
    </div>
  )
}

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const searchRef = useRef(null)
  const abortRef = useRef(null)

  const loadRoadmaps = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      setError(null)
      setLoading(true)
      const data = await apiGet('/roadmaps', { signal: controller.signal })
      setRoadmaps(data)
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Failed to load roadmaps:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoadmaps()
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [loadRoadmaps])

  const filtered = useMemo(() => {
    return roadmaps.filter((rm) => {
      const matchSearch = !search || rm.title.toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || rm.category === category
      return matchSearch && matchCategory
    })
  }, [roadmaps, search, category])

  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const rm of roadmaps) {
      counts[rm.category] = (counts[rm.category] || 0) + 1
    }
    return counts
  }, [roadmaps])

  const totalNodes = useMemo(() => {
    return roadmaps.reduce((sum, rm) => sum + (rm.node_count || 0), 0)
  }, [roadmaps])

  const stats = useMemo(() => ({
    roadmaps: roadmaps.length,
    nodes: totalNodes,
    categories: new Set(roadmaps.map(r => r.category)).size,
  }), [roadmaps, totalNodes])

  const clearSearch = useCallback(() => {
    setSearch('')
    searchRef.current?.focus()
  }, [])

  const handleRetry = useCallback(() => {
    loadRoadmaps()
  }, [loadRoadmaps])

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="mb-1 text-3xl font-bold text-text sm:text-4xl">
            Developer Roadmaps
          </h1>
          <p className="text-sm text-text-2 sm:text-base">
            Choose a path and start learning with AI guidance.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mb-6 flex rounded-xl border border-border bg-surface p-3 sm:p-4 sm:mb-8 shadow-sm">
          {[
            { label: 'Roadmaps', value: stats.roadmaps },
            { label: 'Topics', value: stats.nodes.toLocaleString() },
            { label: 'Categories', value: stats.categories },
          ].map((s, i) => (
            <div key={s.label} className={`flex-1 text-center ${i < 2 ? 'border-r border-border' : ''}`}>
              <div className="text-base sm:text-lg font-bold text-text">{s.value}</div>
              <div className="text-[9px] sm:text-xs font-medium uppercase tracking-widest text-text-3">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search roadmaps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-2 py-3 pl-10 pr-10 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text transition-colors"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = category === cat
              const count = cat === 'All' ? roadmaps.length : (categoryCounts[cat] || 0)
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`group relative flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                    isActive
                      ? 'border-accent bg-accent-glow text-accent shadow-sm'
                      : 'border-border bg-bg-2 text-text-3 hover:border-border-2 hover:text-text-2'
                  }`}
                >
                  {cat !== 'All' && (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[cat]} />
                    </svg>
                  )}
                  <span>{cat === 'absolute-beginners' ? 'Beginners' : cat.replace('-', ' ')}</span>
                  <span className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono tabular-nums ${
                    isActive
                      ? 'bg-accent/20 text-accent'
                      : 'bg-bg-3 text-text-3'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <p className="mb-3 text-sm text-red">{error}</p>
              <button onClick={handleRetry} className="btn-primary text-xs">
                Try Again
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto mb-3 h-10 w-10 text-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-text-3">
                {search || category !== 'All'
                  ? `No roadmaps match "${search}" in ${category === 'All' ? 'any category' : category}. Try a different search or category.`
                  : 'No roadmaps found. The database may need seeding.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((rm, index) => {
              const colors = CATEGORY_COLORS[rm.category]
              const diffColor = DIFFICULTY_COLORS[rm.difficulty] || DIFFICULTY_COLORS.beginner
              const categoryIcon = CATEGORY_ICONS[rm.category]
              return (
                <Link
                  key={rm.id}
                  to={`/roadmaps/${rm.slug}`}
                  className="card-elevated group block p-5"
                  style={{
                    animation: `slideUp 0.4s ease-out ${index * 0.04}s both`,
                    '--card-accent': colors?.border || 'var(--color-accent)',
                  }}
                >
                  <div
                    className="absolute left-4 right-4 top-0 h-0.5 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: colors?.border || 'var(--color-accent)' }}
                  />

                  <div className="mb-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                      colors?.tw || 'border-border bg-bg-3 text-text-3'
                    }`}>
                      {categoryIcon && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={categoryIcon} />
                        </svg>
                      )}
                      {rm.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-text-3 tabular-nums">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {rm.node_count || 0}
                    </span>
                  </div>

                  <h3 className="mb-1.5 text-base font-semibold text-text transition-colors group-hover:text-accent leading-snug">
                    {rm.title}
                  </h3>

                  <p className="mb-4 text-xs text-text-2 line-clamp-2 leading-relaxed">
                    {rm.description}
                  </p>

                  <div className="mt-auto flex items-center gap-4 border-t border-border/50 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${diffColor.dot}`} />
                      <span className={`text-[10px] font-medium capitalize ${diffColor.text}`}>
                        {rm.difficulty}
                      </span>
                    </div>
                    {rm.estimated_hours && (
                      <div className="flex items-center gap-1 text-[10px] text-text-3 tabular-nums">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {rm.estimated_hours}h
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Staggered entry animation */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
