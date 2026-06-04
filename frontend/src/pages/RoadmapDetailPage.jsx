import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import RoadmapGraph from '../components/roadmap/RoadmapGraph'
import AsyncContent from '../components/shared/AsyncContent'

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

  const loadRoadmap = useCallback(async (signal) => {
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

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AsyncContent
          loading={loading}
          error={error}
          onRetry={() => { const a = new AbortController(); loadRoadmap(a.signal) }}
          isEmpty={!loading && !error && !roadmap}
          emptyMessage="Roadmap not found"
        >
          {roadmap && (
            <>
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-md border border-border bg-bg-3 px-2 py-0.5 text-[10px] font-mono uppercase text-text-3">
                    {roadmap.category}
                  </span>
                  <span className="rounded-md border border-border bg-bg-3 px-2 py-0.5 text-[10px] font-mono uppercase text-text-3">
                    {roadmap.difficulty}
                  </span>
                  {roadmap.estimated_hours && (
                    <span className="text-[10px] font-mono text-text-3">
                      ~{roadmap.estimated_hours} hours
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-text-3">{nodes.length} topics</span>
                </div>
                <h1 className="mb-2 text-3xl font-bold text-white">{roadmap.title}</h1>
                <p className="max-w-2xl text-text-2 leading-relaxed">{roadmap.description}</p>
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={handleStart}
                    disabled={enrolling}
                    className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-2 transition-all disabled:opacity-50"
                  >
                    {enrolling ? 'Starting...' : 'Start This Roadmap'}
                  </button>
                </div>
                {enrollError && (
                  <p className="mt-2 text-sm text-red">{enrollError}</p>
                )}
              </div>

              {nodes.length > 0 ? (
                <RoadmapGraph nodes={nodes} edges={edges} category={roadmap.category} />
              ) : (
                <div className="rounded-xl border border-border bg-bg-2 p-8 text-center text-text-3">
                  No topics added to this roadmap yet.
                </div>
              )}
            </>
          )}
        </AsyncContent>
      </div>
    </div>
  )
}
