import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../lib/api'
import AsyncContent from '../components/shared/AsyncContent'

export default function AdminPage() {
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAdminData = useCallback(async (signal) => {
    try {
      setError(null)
      setLoading(true)
      const [statsData, usersData, feedbackData] = await Promise.all([
        apiGet('/admin/stats', { signal }),
        apiGet('/admin/users', { signal }).catch((err) => { console.error('Admin users load failed:', err); return { items: [] } }),
        apiGet('/admin/feedback', { signal }).catch((err) => { console.error('Admin feedback load failed:', err); return { items: [] } }),
      ])
      setStats(statsData)
      setUsers(usersData.items || usersData)
      setFeedback(feedbackData.items || feedbackData)
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Failed to load admin data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const abort = new AbortController()
    loadAdminData(abort.signal)
    return () => abort.abort()
  }, [loadAdminData])

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-bold text-white">Admin Panel</h1>

        <div className="mb-6 flex gap-1.5 border-b border-border pb-3">
          {['stats', 'users', 'feedback'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                tab === t
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-3 hover:text-text hover:bg-bg-3/50'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <AsyncContent
          loading={loading}
          error={error && !stats ? error : null}
          onRetry={() => { const a = new AbortController(); loadAdminData(a.signal) }}
        >
          {tab === 'stats' && stats && (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: 'Total Users', value: stats.total_users },
                { label: 'Total Roadmaps', value: stats.total_roadmaps },
                { label: 'Published', value: stats.published_roadmaps },
                { label: 'Total Nodes', value: stats.total_nodes },
                { label: 'Open Feedback', value: stats.open_feedback },
              ].map((item) => (
                <div key={item.label} className="card-elevated p-5">
                  <p className="text-[10px] text-text-3 uppercase tracking-wider font-semibold">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-text tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'users' && (
            <div className="rounded-xl border border-border bg-surface overflow-x-auto shadow-sm">
              {users.length === 0 ? (
                <div className="p-8 text-center text-text-3">No users found.</div>
              ) : (
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border bg-bg-3/80">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-3">Name</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-3">Role</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-3">Level</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-3">Streak</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} className={`border-b border-border last:border-0 transition-colors hover:bg-bg-3/30 ${i % 2 === 1 ? 'bg-bg-3/10' : ''}`}>
                        <td className="px-4 py-3 text-text font-medium">{u.full_name}</td>
                        <td className="px-4 py-3">
                          <span className="badge badge-accent text-[9px]">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-2 capitalize text-xs">{u.experience_level}</td>
                        <td className="px-4 py-3 text-text-2 font-mono tabular-nums text-xs">{u.streak_days}</td>
                        <td className="px-4 py-3 text-text-3 text-xs tabular-nums">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'feedback' && (
            <div className="space-y-3">
              {feedback.length === 0 ? (
                <div className="card-elevated p-8 text-center text-text-3">
                  No feedback yet.
                </div>
              ) : (
                feedback.map((f) => (
                  <div key={f.id} className="card-elevated p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="badge text-text-2" style={{ borderColor: 'var(--color-border-2)', backgroundColor: 'var(--color-bg-3)' }}>
                        {f.type}
                      </span>
                      <span
                        className={`badge ${
                          f.status === 'open' ? 'badge-amber' : 'badge-green'
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                    <p className="text-sm text-text-2">{f.content}</p>
                    <p className="mt-2 text-[10px] text-text-3">
                      {f.created_at ? new Date(f.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </AsyncContent>
      </div>
    </div>
  )
}
