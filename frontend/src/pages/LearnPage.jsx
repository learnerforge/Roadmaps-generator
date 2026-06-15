import { useReducer, useEffect, useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGet, apiPatch } from '../lib/api'
import { STATUS_COLORS } from '../lib/constants'
import AsyncContent from '../components/shared/AsyncContent'
import AIExplanation from '../components/learn/AIExplanation'
import ResourceList from '../components/learn/ResourceList'

const STATUS_OPTIONS = ['pending', 'in_progress', 'done', 'skipped']

const initialState = {
  roadmap: null,
  nodes: [],
  progress: {},
  selectedNode: null,
  loading: true,
  error: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        roadmap: action.roadmap,
        nodes: action.nodes,
        progress: action.progress,
        selectedNode: action.nodes.length > 0 ? action.nodes[0] : null,
      }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error }
    case 'SET_PROGRESS':
      return { ...state, progress: { ...state.progress, [action.nodeId]: action.status } }
    case 'SELECT_NODE':
      return { ...state, selectedNode: action.node }
    default:
      return state
  }
}

export default function LearnPage() {
  const { slug } = useParams()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [showTopics, setShowTopics] = useState(false)
  const { roadmap, nodes, progress, selectedNode, loading, error } = state

  const loadData = useCallback(async (signal) => {
    try {
      dispatch({ type: 'FETCH_START' })
      const [roadmapData, progressData] = await Promise.all([
        apiGet(`/roadmaps/${slug}`, { signal }),
        apiGet(`/progress/${slug}/progress`, { signal }).catch((err) => { console.error('Progress load failed:', err); return { progress: [] } }),
      ])
      const progMap = {}
      for (const p of progressData.progress || []) {
        progMap[p.node_id] = p.status
      }
      dispatch({
        type: 'FETCH_SUCCESS',
        roadmap: roadmapData.roadmap,
        nodes: roadmapData.nodes || [],
        progress: progMap,
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Failed to load:', err)
      dispatch({ type: 'FETCH_ERROR', error: err.message })
    }
  }, [slug])

  useEffect(() => {
    const abort = new AbortController()
    loadData(abort.signal)
    return () => abort.abort()
  }, [loadData])

  const handleStatusChange = useCallback(async (nodeId, status) => {
    try {
      await apiPatch(`/progress/node/${nodeId}`, { status })
      dispatch({ type: 'SET_PROGRESS', nodeId, status })
    } catch (err) {
      console.error('Failed to update:', err)
    }
  }, [])

  const handleNodeSelect = useCallback((node) => {
    dispatch({ type: 'SELECT_NODE', node })
  }, [])

  const { doneCount, pct } = useMemo(() => {
    const done = Object.values(progress).filter((s) => s === 'done').length
    return {
      doneCount: done,
      pct: nodes.length > 0 ? Math.round((done / nodes.length) * 100) : 0,
    }
  }, [progress, nodes])

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar button */}
      {nodes.length > 0 && (
        <button
          onClick={() => setShowTopics(true)}
          className="lg:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/20"
          aria-label="Show topic list"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Topics
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px] font-mono">{nodes.length}</span>
        </button>
      )}

      {/* Mobile sidebar drawer */}
      {showTopics && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTopics(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-surface border-r border-border flex flex-col shadow-2xl animate-[fadeSlideUp_0.2s_ease-out]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-bg-2/50">
              <h2 className="text-sm font-semibold text-text leading-snug">{roadmap?.title}</h2>
              <button
                onClick={() => setShowTopics(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-3 hover:text-text hover:bg-bg-3 transition-colors"
                aria-label="Close topic list"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3 border-b border-border bg-bg-2/30">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-bg-3 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-mono text-text-3 tabular-nums">{pct}%</span>
              </div>
              <p className="mt-1 text-[10px] text-text-3 tabular-nums">{doneCount}/{nodes.length} completed</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {nodes.map((node, i) => {
                const status = progress[node.id] || 'pending'
                const isSelected = selectedNode?.id === node.id
                return (
                  <button
                    key={node.id}
                    onClick={() => { handleNodeSelect(node); setShowTopics(false) }}
                    className={`w-full text-left rounded-lg border p-3 mb-1 text-xs transition-all ${
                      isSelected
                        ? 'border-accent bg-accent-glow shadow-sm'
                        : STATUS_COLORS[status]
                    } ${!isSelected ? 'hover:border-border-2 hover:bg-surface-hover' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] w-5 tabular-nums ${isSelected ? 'text-accent' : 'text-text-3'}`}>{i + 1}</span>
                      <span className="flex-1 truncate">{node.title}</span>
                      {status === 'done' && (
                        <svg className="h-3.5 w-3.5 shrink-0 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 border-r border-border bg-surface overflow-y-auto h-[calc(100vh-4rem)] sticky top-16">
        <div className="p-4 border-b border-border bg-bg-2/50">
          <h2 className="text-sm font-semibold text-text mb-2 leading-snug">{roadmap?.title}</h2>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-bg-3 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono text-text-3 tabular-nums">{pct}%</span>
          </div>
          <p className="mt-1 text-[10px] text-text-3 tabular-nums">{doneCount}/{nodes.length} completed</p>
        </div>
        <div className="p-2">
          {nodes.map((node, i) => {
            const status = progress[node.id] || 'pending'
            const isSelected = selectedNode?.id === node.id
            return (
              <button
                key={node.id}
                onClick={() => handleNodeSelect(node)}
                className={`w-full text-left rounded-lg border p-3 mb-1 text-xs transition-all ${
                  isSelected
                    ? 'border-accent bg-accent-glow shadow-sm'
                    : STATUS_COLORS[status]
                } ${!isSelected ? 'hover:border-border-2 hover:bg-surface-hover' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] w-5 tabular-nums ${isSelected ? 'text-accent' : 'text-text-3'}`}>{i + 1}</span>
                  <span className="flex-1 truncate">{node.title}</span>
                  {status === 'done' && (
                    <svg className="h-3.5 w-3.5 shrink-0 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-10">
        <AsyncContent
          loading={loading}
          error={error && !roadmap ? error : null}
          onRetry={() => { const a = new AbortController(); loadData(a.signal) }}
          isEmpty={!loading && !error && !roadmap}
          emptyMessage="Roadmap not found."
        >
          {selectedNode ? (
            <div className="max-w-3xl">
              <div className="mb-4 sm:mb-6 flex flex-wrap items-start gap-3 sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-white break-words">{selectedNode.title}</h1>
                  {selectedNode.category && (
                    <span className="text-xs text-text-3">{selectedNode.category}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selectedNode.id, s)}
                      className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        progress[selectedNode.id] === s
                          ? STATUS_COLORS[s]
                          : 'border-border bg-bg-2 text-text-3 hover:border-border-2'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {selectedNode.description && (
                <div className="mb-6 rounded-xl border border-border bg-bg-2 p-5">
                  <p className="text-sm text-text-2 leading-relaxed">{selectedNode.description}</p>
                </div>
              )}

              {selectedNode.why_important && (
                <div className="mb-6 rounded-xl border border-accent/20 bg-accent-soft p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="text-xs font-bold text-accent uppercase tracking-wider">Why it matters</h3>
                  </div>
                  <p className="text-sm text-text-2 leading-relaxed">{selectedNode.why_important}</p>
                </div>
              )}

              <AIExplanation nodeId={selectedNode.id} />
              <ResourceList nodeId={selectedNode.id} />
            </div>
          ) : (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <div className="mb-4 h-16 w-16 rounded-2xl bg-accent-glow flex items-center justify-center">
                <span className="text-2xl text-text-2">PF</span>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-white">Select a topic</h2>
              <p className="text-sm text-text-2 max-w-md">
                Click any topic from the sidebar to start learning. Track your progress and get AI explanations.
              </p>
            </div>
          )}
        </AsyncContent>
      </main>
    </div>
  )
}
