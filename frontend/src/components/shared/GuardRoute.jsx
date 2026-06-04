import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import Spinner from './Spinner'

export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner text="Loading..." /></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function GuestRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner text="Loading..." /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export function AdminRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner text="Loading..." /></div>
  if (!user || !['admin', 'super_admin'].includes(user.role)) return <Navigate to="/" replace />
  return children
}
