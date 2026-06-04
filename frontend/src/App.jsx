import { lazy, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { ProtectedRoute, GuestRoute, AdminRoute } from './components/shared/GuardRoute'
import Navbar from './components/layout/Navbar'
import ToastContainer from './components/shared/Toast'
import useToast from './hooks/useToast'

const HomePage = lazy(() => import('./pages/HomePage'))
const RoadmapsPage = lazy(() => import('./pages/RoadmapsPage'))
const RoadmapDetailPage = lazy(() => import('./pages/RoadmapDetailPage'))
const LearnPage = lazy(() => import('./pages/LearnPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

export default function App() {
  const init = useAuthStore((s) => s.init)
  const { toasts, removeToast } = useToast()

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
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/roadmaps/:slug/learn" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
        <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
      </Routes>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
