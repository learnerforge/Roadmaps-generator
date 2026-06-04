const typeStyles = {
  error: 'border-red/20 text-red',
  success: 'border-green/20 text-green',
  info: 'border-accent/20 text-accent',
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-glass toast-enter flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg transition-all ${typeStyles[t.type] || typeStyles.error}`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="opacity-50 hover:opacity-100 text-xs transition-opacity"
            aria-label="Dismiss notification"
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}
