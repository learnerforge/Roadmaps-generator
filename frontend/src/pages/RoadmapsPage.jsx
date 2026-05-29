import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../lib/api'

const CATEGORIES = [
  'All', 'role-based', 'skill-based', 'absolute-beginners',
  'web-development', 'frameworks', 'languages', 'ai-ml',
  'devops', 'mobile', 'databases', 'cyber-security',
]

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  useEffect(() => {
    loadRoadmaps()
  }, [])

  const loadRoadmaps = async () => {
    try {
      const data = await apiGet('/roadmaps')
      setRoadmaps(data)
    } catch (err) {
      console.error('Failed to load roadmaps:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = roadmaps.filter((rm) => {
    const matchSearch = !search || rm.title.toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === 'All' || rm.category === category
    return matchSearch && matchCategory
  })

  const categoryColors = {
    'role-based': 'bg-accent-glow text-accent border-accent/20',
    'skill-based': 'bg-green-dim text-green border-green/20',
    'absolute-beginners': 'bg-amber-dim text-amber border-amber/20',
    'web-development': 'bg-blue-dim text-blue border-blue/20',
    'frameworks': 'bg-purple-dim text-purple-400 border-purple-400/20',
    'languages': 'bg-cyan-dim text-cyan-400 border-cyan-400/20',
    'ai-ml': 'bg-rose-dim text-rose-400 border-rose-400/20',
    'devops': 'bg-orange-dim text-orange-400 border-orange-400/20',
    'mobile': 'bg-teal-dim text-teal-400 border-teal-400/20',
    'databases': 'bg-indigo-dim text-indigo-400 border-indigo-400/20',
    'cyber-security': 'bg-red-dim text-red border-red/20',
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Developer Roadmaps</h1>
          <p className="text-text-2">Choose a path and start learning with AI guidance.</p>
        </div>

        {/* Search & Filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search roadmaps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.slice(0, 6).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat
                    ? 'border-accent bg-accent-glow text-accent'
                    : 'border-border bg-bg-2 text-text-3 hover:border-border-2'
                }`}
              >
                {cat.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Roadmap Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-text-3">
            No roadmaps found. The database may need seeding.
          </div>
        ) : (
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
                      categoryColors[rm.category] || 'border-border bg-bg-3 text-text-3'
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
        )}
      </div>
    </div>
  )
}
