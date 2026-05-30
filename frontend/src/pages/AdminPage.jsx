import { useState, useEffect } from 'react'
import { apiGet } from '../lib/api'

export default function AdminPage() {
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      setError(null)
      const [statsData, usersData, feedbackData] = await Promise.all([
        apiGet('/admin/stats'),
        apiGet('/admin/users').catch(() => []),
        apiGet('/admin/feedback').catch(() => []),
      ])
      setStats(statsData)
      setUsers(usersData)
      setFeedback(feedbackData)
    } catch (err) {
      console.error('Failed to load admin data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-red">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); loadAdminData() }}
            className="text-sm text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-bold text-white">Admin Panel</h1>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-border pb-3">
          {['stats', 'users', 'feedback'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === t
                  ? 'bg-accent text-white'
                  : 'text-text-3 hover:text-text'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {tab === 'stats' && stats && (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: 'Total Users', value: stats.total_users },
              { label: 'Total Roadmaps', value: stats.total_roadmaps },
              { label: 'Published', value: stats.published_roadmaps },
              { label: 'Total Nodes', value: stats.total_nodes },
              { label: 'Open Feedback', value: stats.open_feedback },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-bg-2 p-5">
                <p className="text-[10px] text-text-3 uppercase tracking-wider">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="rounded-xl border border-border bg-bg-2 overflow-hidden">
            {users.length === 0 ? (
              <div className="p-8 text-center text-text-3">No users found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-3">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-text-3">Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-text-3">Role</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-text-3">Level</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-text-3">Streak</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-text-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-text">{u.full_name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-accent-glow px-2 py-0.5 text-[10px] font-mono text-accent">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-2 capitalize">{u.experience_level}</td>
                      <td className="px-4 py-3 text-text-2">{u.streak_days}</td>
                      <td className="px-4 py-3 text-text-3 text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {tab === 'feedback' && (
          <div className="space-y-3">
            {feedback.length === 0 ? (
              <div className="rounded-xl border border-border bg-bg-2 p-8 text-center text-text-3">
                No feedback yet.
              </div>
            ) : (
              feedback.map((f) => (
                <div key={f.id} className="rounded-xl border border-border bg-bg-2 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded bg-bg-3 px-2 py-0.5 text-[10px] font-mono text-text-3">
                      {f.type}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono ${
                        f.status === 'open'
                          ? 'bg-amber-dim text-amber'
                          : 'bg-green-dim text-green'
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
      </div>
    </div>
  )
}
