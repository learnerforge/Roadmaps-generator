export default function AsyncContent({ loading, error, onRetry, isEmpty, emptyMessage, children }) {
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading content">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner-ring h-10 w-10 rounded-full" />
          <p className="text-sm text-text-3 animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4" role="alert">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-dim">
            <svg className="h-6 w-6 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-text">Something went wrong</p>
          <p className="mb-4 text-xs text-text-3 leading-relaxed">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="btn-primary !px-4 !py-2 !text-xs">
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-3">
            <svg className="h-6 w-6 text-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm text-text-3">{emptyMessage || 'No data found.'}</p>
        </div>
      </div>
    )
  }

  return children
}
