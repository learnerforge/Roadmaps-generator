import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'
import { useAuthStore } from '../stores/authStore'

export default function RoadmapDetailPage() {
  const { slug } = useParams()
  const { user } = useAuthStore()
  const [roadmap, setRoadmap] = useState(null)
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    loadRoadmap()
  }, [slug])

  const loadRoadmap = async () => {
    try {
      const data = await apiGet(`/roadmaps/${slug}`)
      setRoadmap(data.roadmap)
      setNodes(data.nodes || [])
    } catch (err) {
      console.error('Failed to load roadmap:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }
    setEnrolling(true)
    try {
      await apiPost(`/progress/${roadmap.id}/start`)
      window.location.href = `/roadmap/${slug}/learn`
    } catch (err) {
      console.error('Failed to start roadmap:', err)
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

  if (!roadmap) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-text-3">
        Roadmap not found
      </div>
    )
  }

  const categories = [...new Set(nodes.map((n) => n.category).filter(Boolean))]

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-3">
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
          </div>
          <h1 className="mb-3 text-3xl font-bold text-white">{roadmap.title}</h1>
          <p className="max-w-2xl text-text-2 leading-relaxed">{roadmap.description}</p>
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleStart}
              disabled={enrolling}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-2 transition-all disabled:opacity-50"
            >
              {enrolling ? 'Starting...' : 'Start This Roadmap'}
            </button>
            <span className="text-xs text-text-3">{nodes.length} topics</span>
          </div>
        </div>

        {/* Node Map */}
        {categories.length > 0 ? (
          <div className="space-y-8">
            {categories.map((cat) => (
              <div key={cat}>
                <h2 className="mb-4 text-sm font-semibold text-accent uppercase tracking-wider">
                  {cat}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {nodes
                    .filter((n) => n.category === cat)
                    .map((node) => (
                      <div
                        key={node.id}
                        className="rounded-lg border border-border bg-bg-2 p-4 hover:border-accent/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <h3 className="text-sm font-medium text-white">{node.title}</h3>
                          {node.is_optional && (
                            <span className="rounded bg-amber-dim px-1.5 py-0.5 text-[9px] font-mono text-amber">
                              optional
                            </span>
                          )}
                        </div>
                        {node.description && (
                          <p className="mt-1 text-xs text-text-3 line-clamp-2">{node.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-text-3">
                          <span>{node.difficulty}</span>
                          <span>{node.estimated_hours}h</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-bg-2 p-8 text-center text-text-3">
            No topics added to this roadmap yet.
          </div>
        )}
      </div>
    </div>
  )
}
