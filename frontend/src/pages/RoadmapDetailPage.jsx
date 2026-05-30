import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import RoadmapGraph from '../components/roadmap/RoadmapGraph'

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

  useEffect(() => {
    loadRoadmap()
  }, [slug])

  const loadRoadmap = async () => {
    try {
      setError(null)
      const data = await apiGet(`/roadmaps/${slug}`)
      setRoadmap(data.roadmap)
      setNodes(data.nodes || [])
      setEdges(data.edges || [])
    } catch (err) {
      console.error('Failed to load roadmap:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setEnrolling(true)
    setEnrollError(null)
    try {
      await apiPost(`/progress/${roadmap.id}/start`)
      navigate(`/roadmap/${slug}/learn`)
    } catch (err) {
      console.error('Failed to start roadmap:', err)
      setEnrollError(err.message)
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-red">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); loadRoadmap() }}
            className="text-sm text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!roadmap) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-text-3">
        Roadmap not found
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
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
      </div>
    </div>
  )
}
