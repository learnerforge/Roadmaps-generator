const typeStyles = {
  error: 'border-red/20 text-red',
  success: 'border-green/20 text-green',
  info: 'border-accent/20 text-accent',
}

const typeIcons = {
  error: (
    <svg className="h-4 w-4 shrink-0 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="h-4 w-4 shrink-0 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-glass toast-enter flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg transition-all ${typeStyles[t.type] || typeStyles.error}`}
          role="alert"
        >
          {typeIcons[t.type] || typeIcons.error}
          <span className="flex-1 text-xs">{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="flex h-5 w-5 items-center justify-center rounded-full opacity-40 hover:opacity-100 hover:bg-bg-3 transition-all text-xs"
            aria-label="Dismiss notification"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
