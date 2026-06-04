import { useReducer, useEffect, useCallback, useMemo } from 'react'
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
  const { roadmap, nodes, progress, selectedNode, loading, error } = state

  const loadData = useCallback(async (signal) => {
    try {
      dispatch({ type: 'FETCH_START' })
      const [roadmapData, progressData] = await Promise.all([
        apiGet(`/roadmaps/${slug}`, { signal }),
        apiGet(`/progress/${slug}/progress`, { signal }).catch(() => ({ progress: [] })),
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
      <aside className="hidden lg:block w-72 border-r border-border bg-bg-2 overflow-y-auto h-[calc(100vh-4rem)] sticky top-16">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-white mb-2">{roadmap?.title}</h2>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-bg-3 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono text-text-3">{pct}%</span>
          </div>
          <p className="mt-1 text-[10px] text-text-3">{doneCount}/{nodes.length} completed</p>
        </div>
        <div className="p-2">
          {nodes.map((node, i) => {
            const status = progress[node.id] || 'pending'
            return (
              <button
                key={node.id}
                onClick={() => handleNodeSelect(node)}
                className={`w-full text-left rounded-lg border p-3 mb-1.5 text-xs transition-all ${
                  selectedNode?.id === node.id
                    ? 'border-accent bg-accent-glow'
                    : STATUS_COLORS[status]
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-text-3 w-5">{i + 1}</span>
                  <span className="flex-1 truncate">{node.title}</span>
                  {status === 'done' && <span className="text-green">done</span>}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6 lg:p-10">
        <AsyncContent
          loading={loading}
          error={error && !roadmap ? error : null}
          onRetry={() => { const a = new AbortController(); loadData(a.signal) }}
          isEmpty={!loading && !error && !roadmap}
          emptyMessage="Roadmap not found."
        >
          {selectedNode ? (
            <div className="max-w-3xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">{selectedNode.title}</h1>
                  {selectedNode.category && (
                    <span className="text-xs text-text-3">{selectedNode.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
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
                <div className="mb-6 rounded-xl border border-accent/20 bg-accent-glow p-5">
                  <h3 className="mb-2 text-xs font-semibold text-accent uppercase tracking-wider">Why it matters</h3>
                  <p className="text-sm text-text-2">{selectedNode.why_important}</p>
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
