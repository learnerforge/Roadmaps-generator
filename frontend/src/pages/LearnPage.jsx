import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../lib/api'
import { useAuthStore } from '../stores/authStore'

const STATUS_COLORS = {
  pending: 'border-border bg-bg-2 text-text-2',
  in_progress: 'border-blue bg-blue-dim text-blue',
  done: 'border-green bg-green-dim text-green',
  skipped: 'border-text-3 bg-bg-3 text-text-3',
  bookmarked: 'border-amber bg-amber-dim text-amber',
}

export default function LearnPage() {
  const { slug } = useParams()
  const { user } = useAuthStore()
  const [roadmap, setRoadmap] = useState(null)
  const [nodes, setNodes] = useState([])
  const [progress, setProgress] = useState({})
  const [selectedNode, setSelectedNode] = useState(null)
  const [aiExplanation, setAiExplanation] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updateError, setUpdateError] = useState(null)

  useEffect(() => {
    loadData()
  }, [slug])

  const loadData = async () => {
    try {
      setError(null)
      const [roadmapData, progressData] = await Promise.all([
        apiGet(`/roadmaps/${slug}`),
        apiGet(`/progress/${slug}/progress`).catch(() => ({ progress: [] })),
      ])
      setRoadmap(roadmapData.roadmap)
      setNodes(roadmapData.nodes || [])

      const progMap = {}
      for (const p of progressData.progress || []) {
        progMap[p.node_id] = p.status
      }
      setProgress(progMap)
    } catch (err) {
      console.error('Failed to load:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (nodeId, status) => {
    setUpdateError(null)
    try {
      await apiPatch(`/progress/node/${nodeId}`, { status })
      setProgress((prev) => ({ ...prev, [nodeId]: status }))
    } catch (err) {
      console.error('Failed to update:', err)
      setUpdateError('Failed to update status. Please try again.')
    }
  }

  const handleExplain = async (nodeId) => {
    setAiLoading(true)
    setAiExplanation('')
    try {
      const result = await apiPost('/ai/explain-node', { node_id: nodeId })
      setAiExplanation(result.explanation)
    } catch (err) {
      setAiExplanation('Failed to generate explanation. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (error && !roadmap) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-red">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); loadData() }}
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-text-3">Roadmap not found.</p>
        </div>
      </div>
    )
  }

  const doneCount = Object.values(progress).filter((s) => s === 'done').length
  const totalNodes = nodes.length
  const pct = totalNodes > 0 ? Math.round((doneCount / totalNodes) * 100) : 0

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Node List */}
      <aside className="hidden lg:block w-72 border-r border-border bg-bg-2 overflow-y-auto h-[calc(100vh-4rem)] sticky top-16">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-white mb-2">{roadmap.title}</h2>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-bg-3 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono text-text-3">{pct}%</span>
          </div>
          <p className="mt-1 text-[10px] text-text-3">{doneCount}/{totalNodes} completed</p>
        </div>
        <div className="p-2">
          {nodes.map((node, i) => {
            const status = progress[node.id] || 'pending'
            return (
              <button
                key={node.id}
                onClick={() => { setSelectedNode(node); setAiExplanation(''); }}
                className={`w-full text-left rounded-lg border p-3 mb-1.5 text-xs transition-all ${
                  selectedNode?.id === node.id
                    ? 'border-accent bg-accent-glow'
                    : STATUS_COLORS[status]
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-text-3 w-5">{i + 1}</span>
                  <span className="flex-1 truncate">{node.title}</span>
                  {status === 'done' && <span className="text-green">✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-6 lg:p-10">
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
                {['pending', 'in_progress', 'done', 'skipped'].map((s) => (
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
            {updateError && (
              <p className="mt-2 text-xs text-red">{updateError}</p>
            )}

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

            {/* AI Explanation */}
            <div className="mb-6 rounded-xl border border-border bg-bg-2 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">AI Explanation</h3>
                <button
                  onClick={() => handleExplain(selectedNode.id)}
                  disabled={aiLoading}
                  className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent-2 transition-colors disabled:opacity-50"
                >
                  {aiLoading ? 'Generating...' : 'Explain with AI'}
                </button>
              </div>
              {aiLoading && (
                <div className="flex items-center gap-3 py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <span className="text-xs text-text-3">AI is thinking...</span>
                </div>
              )}
              {aiExplanation && !aiLoading && (
                <div className="prose prose-invert prose-sm max-w-none text-sm text-text-2 leading-relaxed whitespace-pre-wrap">
                  {aiExplanation}
                </div>
              )}
              {!aiExplanation && !aiLoading && (
                <p className="text-xs text-text-3">Click "Explain with AI" to get a beginner-friendly explanation of this topic.</p>
              )}
            </div>

            {/* Resources */}
            <div className="rounded-xl border border-border bg-bg-2 p-5">
              <h3 className="mb-3 text-xs font-semibold text-accent uppercase tracking-wider">Resources</h3>
              <p className="text-xs text-text-3">Resources will be available once added by an admin.</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="mb-4 h-16 w-16 rounded-2xl bg-accent-glow flex items-center justify-center">
              <span className="text-2xl">PF</span>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-white">Select a topic</h2>
            <p className="text-sm text-text-2 max-w-md">
              Click any topic from the sidebar to start learning. Track your progress and get AI explanations.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
