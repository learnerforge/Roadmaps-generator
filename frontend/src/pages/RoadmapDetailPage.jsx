import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import { CATEGORY_COLORS } from '../lib/constants'
import RoadmapGraph from '../components/roadmap/RoadmapGraph'
import Spinner from '../components/shared/Spinner'

const DIFFICULTY_META = {
  beginner: { label: 'Beginner', dot: 'bg-green', desc: 'Foundational topics — no prior knowledge needed' },
  intermediate: { label: 'Intermediate', dot: 'bg-amber', desc: 'Requires some experience in the field' },
  advanced: { label: 'Advanced', dot: 'bg-red', desc: 'Complex topics — solid foundations assumed' },
}

export default function RoadmapDetailPage() {
  const { slug } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [roadmap, setRoadmap] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState(null)
  const [showInfo, setShowInfo] = useState(true)

  const loadRoadmap = useCallback(async signal => {
    try {
      setError(null)
      setLoading(true)
      const data = await apiGet(`/roadmaps/${slug}`, { signal })
      setRoadmap(data.roadmap)
      setNodes(data.nodes || [])
      setEdges(data.edges || [])
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Failed to load roadmap:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    const abort = new AbortController()
    loadRoadmap(abort.signal)
    return () => abort.abort()
  }, [loadRoadmap])

  const handleStart = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setEnrolling(true)
    setEnrollError(null)
    try {
      await apiPost(`/progress/${roadmap.id}/start`)
      navigate(`/roadmaps/${slug}/learn`)
    } catch (err) {
      console.error('Failed to start roadmap:', err)
      setEnrollError(err.message)
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-bg">
        <Spinner text="Loading roadmap..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-bg">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-dim">
            <svg className="h-6 w-6 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-text">Failed to load roadmap</p>
          <p className="mb-4 text-xs text-text-3">{error}</p>
          <button
            onClick={() => { const a = new AbortController(); loadRoadmap(a.signal) }}
            className="btn-primary text-xs"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!roadmap) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-3">
            <svg className="h-6 w-6 text-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-sm text-text-2">Roadmap not found</p>
          <Link to="/roadmaps" className="mt-3 inline-block text-xs text-accent hover:underline">
            Browse all roadmaps
          </Link>
        </div>
      </div>
    )
  }

  const colors = CATEGORY_COLORS[roadmap.category]

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-bg">
      {/* ── Top bar ── */}
      <div className="z-30 flex shrink-0 items-center justify-between border-b border-border bg-bg/95 backdrop-blur-md px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/roadmaps')}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-2 px-2.5 py-1.5 text-xs font-medium text-text-2 hover:border-accent hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            aria-label="Back to roadmaps"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-sm font-semibold text-text">{roadmap.title}</span>

            <span
              className="hidden sm:inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider"
              style={{
                borderColor: `${colors?.border}44`,
                backgroundColor: `${colors?.border}11`,
                color: colors?.border || 'var(--color-text-3)',
              }}
            >
              {roadmap.category}
            </span>

            <DifficultyBadge difficulty={roadmap.difficulty} />

            <span className="hidden md:inline text-[11px] font-mono text-text-3">
              {nodes.length} topics
            </span>

            {roadmap.estimated_hours && (
              <span className="hidden lg:inline text-[11px] font-mono text-text-3">
                ~{roadmap.estimated_hours}h
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowInfo(p => !p)}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-bg-2 px-2.5 py-1.5 text-xs font-medium text-text-2 hover:border-accent hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            aria-label={showInfo ? 'Hide roadmap info panel' : 'Show roadmap info panel'}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Info
          </button>

          <button
            onClick={handleStart}
            disabled={enrolling}
            className="btn-primary !text-xs !px-3 !py-1.5 disabled:opacity-50"
          >
            {enrolling ? 'Starting...' : 'Start Learning'}
          </button>

          {user && (
            <Link
              to={`/roadmaps/${slug}/learn`}
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-border bg-bg-2 px-2.5 py-1.5 text-xs font-medium text-text-2 hover:border-accent hover:text-accent transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Continue
            </Link>
          )}
        </div>
      </div>

      {enrollError && (
        <div className="shrink-0 border-b border-border bg-red-dim/50 px-4 py-2">
          <p className="text-xs text-red">{enrollError}</p>
        </div>
      )}

      {/* ── Main area: sidebar + graph ── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {showInfo && (
          <aside className="hidden sm:flex sm:flex-col w-72 shrink-0 border-r border-border bg-bg-2/50 overflow-y-auto z-10">
            <div className="p-5 space-y-5">
              {/* Title & description */}
              <div>
                <h1 className="mb-1.5 text-lg font-bold text-text leading-tight">{roadmap.title}</h1>
                <p className="text-xs text-text-2 leading-relaxed">{roadmap.description}</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Category" value={roadmap.category} color={colors?.border} />
                <StatCard label="Difficulty" value={roadmap.difficulty} />
                <StatCard label="Topics" value={String(nodes.length)} />
                {roadmap.estimated_hours && (
                  <StatCard label="Est. Time" value={`~${roadmap.estimated_hours}h`} />
                )}
                {!roadmap.estimated_hours && <div />}
                {edges.length > 0 && (
                  <StatCard label="Connections" value={String(edges.length)} />
                )}
                {roadmap.node_count && (
                  <StatCard label="All Nodes" value={String(roadmap.node_count)} />
                )}
              </div>

              {/* Difficulty legend */}
              <div>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-3">Difficulty</h4>
                <div className="space-y-2">
                  {Object.entries(DIFFICULTY_META).map(([key, meta]) => (
                    <div key={key} className="flex items-start gap-2">
                      <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                      <div>
                        <div className="text-xs font-semibold text-text">{meta.label}</div>
                        <div className="text-[10px] text-text-3 leading-snug">{meta.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-3">Controls</h4>
                <div className="space-y-1 text-[11px] text-text-3">
                  <p>Scroll to zoom in / out</p>
                  <p>Drag empty area to pan</p>
                  <p>Click a node to highlight connections</p>
                  <p>Drag nodes to rearrange</p>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Graph */}
        <main className="flex-1 min-w-0">
          <RoadmapGraph nodes={nodes} edges={edges} category={roadmap.category} />
        </main>
      </div>
    </div>
  )
}

function DifficultyBadge({ difficulty }) {
  const meta = DIFFICULTY_META[difficulty]
  if (!meta) return null
  return (
    <span
      style={{
        borderColor: `var(--color-${difficulty === 'beginner' ? 'green' : difficulty === 'intermediate' ? 'amber' : 'red'})33`,
        backgroundColor: `var(--color-${difficulty === 'beginner' ? 'green' : difficulty === 'intermediate' ? 'amber' : 'red'}-dim)`,
        color: `var(--color-${difficulty === 'beginner' ? 'green' : difficulty === 'intermediate' ? 'amber' : 'red'})`,
      }}
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-lg border border-border bg-bg/60 px-3 py-2.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-text-3">{label}</div>
      <div
        className="mt-0.5 text-sm font-bold truncate"
        style={{ color: color || 'var(--color-text)' }}
      >
        {value}
      </div>
    </div>
  )
}
