import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

function LoadingGuard() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Verifying authentication">
      <div className="flex flex-col items-center gap-3">
        <div className="spinner-ring h-8 w-8 rounded-full" />
        <p className="text-xs text-text-3 animate-pulse">Loading...</p>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <LoadingGuard />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function GuestRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <LoadingGuard />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export function AdminRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <LoadingGuard />
  if (!user || !['admin', 'super_admin'].includes(user.role)) return <Navigate to="/" replace />
  return children
}
