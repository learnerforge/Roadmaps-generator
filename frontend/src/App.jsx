import { lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Navbar from './components/layout/Navbar'
import LoadingSkeleton from './components/shared/LoadingSkeleton'

const HomePage = lazy(() => import('./pages/HomePage'))
const RoadmapsPage = lazy(() => import('./pages/RoadmapsPage'))
const RoadmapDetailPage = lazy(() => import('./pages/RoadmapDetailPage'))
const LearnPage = lazy(() => import('./pages/LearnPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <LoadingSkeleton />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <LoadingSkeleton />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <LoadingSkeleton />
  if (!user || !['admin', 'super_admin'].includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/roadmaps" element={<RoadmapsPage />} />
        <Route path="/roadmaps/:slug" element={<RoadmapDetailPage />} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap/:slug/learn"
          element={
            <ProtectedRoute>
              <LearnPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Routes>
    </div>
  )
}
