import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../lib/api'
import { CATEGORIES, CATEGORY_COLORS } from '../lib/constants'
import AsyncContent from '../components/shared/AsyncContent'

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  const loadRoadmaps = useCallback(async (signal) => {
    try {
      setError(null)
      setLoading(true)
      const data = await apiGet('/roadmaps', { signal })
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
    const abort = new AbortController()
    loadRoadmaps(abort.signal)
    return () => abort.abort()
  }, [loadRoadmaps])

  const filtered = useMemo(() => {
    return roadmaps.filter((rm) => {
      const matchSearch = !search || rm.title.toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || rm.category === category
      return matchSearch && matchCategory
    })
  }, [roadmaps, search, category])

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Developer Roadmaps</h1>
          <p className="text-text-2">Choose a path and start learning with AI guidance.</p>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search roadmaps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat
                    ? 'border-accent bg-accent-glow text-accent'
                    : 'border-border bg-bg-2 text-text-3 hover:border-border-2'
                }`}
              >
                {cat === 'absolute-beginners' ? 'beginners' : cat.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        <AsyncContent
          loading={loading}
          error={error}
          onRetry={() => { const a = new AbortController(); loadRoadmaps(a.signal) }}
          isEmpty={!loading && !error && filtered.length === 0}
          emptyMessage="No roadmaps found. The database may need seeding."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((rm) => (
              <Link
                key={rm.id}
                to={`/roadmaps/${rm.slug}`}
                className="group rounded-xl border border-border bg-bg-2 p-5 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                      CATEGORY_COLORS[rm.category]?.tw || 'border-border bg-bg-3 text-text-3'
                    }`}
                  >
                    {rm.category}
                  </span>
                  <span className="text-[10px] font-mono text-text-3">
                    {rm.node_count || 0} nodes
                  </span>
                </div>
                <h3 className="mb-1 text-sm font-semibold text-white group-hover:text-accent transition-colors">
                  {rm.title}
                </h3>
                <p className="text-xs text-text-2 line-clamp-2 leading-relaxed">
                  {rm.description}
                </p>
                <div className="mt-3 flex items-center gap-3 text-[10px] text-text-3">
                  <span className="capitalize">{rm.difficulty}</span>
                  {rm.estimated_hours && <span>{rm.estimated_hours}h estimated</span>}
                </div>
              </Link>
            ))}
          </div>
        </AsyncContent>
      </div>
    </div>
  )
}
