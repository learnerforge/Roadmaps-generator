import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiDownload } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import AsyncContent from '../components/shared/AsyncContent'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState(null)
  const [myRoadmaps, setMyRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async (signal) => {
    try {
      setError(null)
      setLoading(true)
      const [summaryData, roadmapsData] = await Promise.all([
        apiGet('/progress/dashboard/summary', { signal }),
        apiGet('/progress/my-roadmaps', { signal }).catch(() => ({ items: [] })),
      ])
      setSummary(summaryData)
      setMyRoadmaps(roadmapsData.items || roadmapsData)
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Failed to load dashboard:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const abort = new AbortController()
    loadDashboard(abort.signal)
    return () => abort.abort()
  }, [loadDashboard])

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.full_name || 'Developer'}
          </h1>
          <p className="text-sm text-text-2">Track your learning progress across all roadmaps.</p>
        </div>

        <AsyncContent
          loading={loading}
          error={error && !summary ? error : null}
          onRetry={() => { const a = new AbortController(); loadDashboard(a.signal) }}
        >
          {summary && (
            <div className="mb-10 grid gap-4 sm:grid-cols-3">
              <div className="card-glow p-5">
                <p className="text-xs text-text-3 uppercase tracking-wider">Active Roadmaps</p>
                <p className="mt-2 text-3xl font-bold text-white">{summary.active_roadmaps || 0}</p>
              </div>
              <div className="card-glow p-5">
                <p className="text-xs text-text-3 uppercase tracking-wider">Nodes Completed</p>
                <p className="mt-2 text-3xl font-bold text-white">{summary.total_nodes_completed || 0}</p>
              </div>
              <div className="card-glow p-5">
                <p className="text-xs text-text-3 uppercase tracking-wider">Day Streak</p>
                <p className="mt-2 text-3xl font-bold text-white">{summary.streak_days || 0}</p>
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-4 text-lg font-semibold text-white">My Roadmaps</h2>
            {myRoadmaps.length === 0 ? (
              <div className="card-glow p-8 text-center">
                <p className="mb-4 text-sm text-text-2">You haven&apos;t started any roadmaps yet.</p>
                <Link
                  to="/roadmaps"
                  className="btn-primary inline-flex"
                >
                  Browse Roadmaps
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myRoadmaps.map((item) => (
                  <div
                    key={item.roadmap.id}
                    className="card-glow p-5"
                  >
                    <Link
                      to={`/roadmaps/${item.roadmap.slug}/learn`}
                      className="group block"
                    >
                      <h3 className="mb-2 text-sm font-semibold text-white group-hover:text-accent transition-colors">
                        {item.roadmap.title}
                      </h3>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-bg-3 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${item.completion_pct || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-text-3">
                          {Math.round(item.completion_pct || 0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-text-3">
                        <span className="capitalize">{item.roadmap.category}</span>
                        <span>Started {item.started_at ? new Date(item.started_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </Link>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => apiDownload(`/progress/export/${item.roadmap.slug}?format=json`, `${item.roadmap.slug}_progress.json`)}
                        className="btn-ghost flex-1 !px-3 !py-1.5 !text-[10px]"
                      >
                        Export JSON
                      </button>
                      <button
                        onClick={() => apiDownload(`/progress/export/${item.roadmap.slug}?format=csv`, `${item.roadmap.slug}_progress.csv`)}
                        className="btn-ghost flex-1 !px-3 !py-1.5 !text-[10px]"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AsyncContent>
      </div>
    </div>
  )
}
