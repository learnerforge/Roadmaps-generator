import Spinner from './Spinner'

export default function AsyncContent({ loading, error, onRetry, isEmpty, emptyMessage, children }) {
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner text="Loading..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-red">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="text-sm text-accent hover:underline">
              Try again
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-text-3">{emptyMessage || 'No data found.'}</p>
      </div>
    )
  }

  return children
}
