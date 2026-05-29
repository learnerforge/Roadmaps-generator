import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white text-sm font-bold">
            P
          </div>
          <span className="text-lg font-bold text-text">
            Path<span className="text-accent">Forge</span>
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-6">
          <Link to="/roadmaps" className="text-sm text-text-2 hover:text-text transition-colors">
            Roadmaps
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm text-text-2 hover:text-text transition-colors">
                Dashboard
              </Link>
              {user.role === 'admin' || user.role === 'super_admin' ? (
                <Link to="/admin" className="text-sm text-text-2 hover:text-text transition-colors">
                  Admin
                </Link>
              ) : null}
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-3">{user.full_name}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-2 hover:border-red hover:text-red transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-2 hover:border-accent hover:text-accent transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-2 transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
