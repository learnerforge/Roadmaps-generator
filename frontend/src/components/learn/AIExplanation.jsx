import { useState, useCallback, useEffect } from 'react'
import { apiPost } from '../../lib/api'
import Spinner from '../shared/Spinner'

export default function AIExplanation({ nodeId }) {
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setExplanation('')
    setLoading(false)
  }, [nodeId])

  const handleExplain = useCallback(async () => {
    setLoading(true)
    setExplanation('')
    try {
      const result = await apiPost('/ai/explain-node', { node_id: nodeId })
      setExplanation(result.explanation)
    } catch (err) {
      console.error('AI explanation failed:', err)
      setExplanation('Failed to generate explanation. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  return (
    <div className="mb-6 rounded-xl border border-border bg-bg-2 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">AI Explanation</h3>
        <button
          onClick={handleExplain}
          disabled={loading}
          className="btn-primary !px-4 !py-1.5 !text-xs disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Explain with AI'}
        </button>
      </div>
      {loading && <Spinner size="sm" text="AI is thinking..." />}
      {explanation && !loading && (
        <div className="prose prose-invert prose-sm max-w-none text-sm text-text-2 leading-relaxed whitespace-pre-wrap">
          {explanation}
        </div>
      )}
      {!explanation && !loading && (
        <p className="text-xs text-text-3">Click &quot;Explain with AI&quot; to get a beginner-friendly explanation of this topic.</p>
      )}
    </div>
  )
}
