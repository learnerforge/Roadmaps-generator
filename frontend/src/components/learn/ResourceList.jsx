import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../lib/api'
import Spinner from '../shared/Spinner'

export default function ResourceList({ nodeId }) {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)

  const loadResources = useCallback(async (signal) => {
    setLoading(true)
    try {
      const data = await apiGet(`/roadmaps/nodes/${nodeId}`, { signal })
      setResources(data.resources || [])
    } catch (err) {
      if (err.name === 'AbortError') return
      setResources([])
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  useEffect(() => {
    const abort = new AbortController()
    loadResources(abort.signal)
    return () => abort.abort()
  }, [loadResources])

  return (
    <div className="rounded-xl border border-border bg-bg-2 p-5">
      <h3 className="mb-3 text-xs font-semibold text-accent uppercase tracking-wider">Resources</h3>
      {loading ? (
        <Spinner size="sm" text="Loading resources..." />
      ) : resources.length === 0 ? (
        <p className="text-xs text-text-3">No resources available for this topic yet.</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-accent/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white group-hover:text-accent transition-colors truncate">
                  {r.title}
                </p>
                <p className="text-[10px] text-text-3 mt-0.5">
                  {r.type}{r.is_free ? ' - Free' : ''}{r.is_recommended ? ' - Recommended' : ''}
                </p>
              </div>
              <svg className="h-4 w-4 shrink-0 text-text-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
