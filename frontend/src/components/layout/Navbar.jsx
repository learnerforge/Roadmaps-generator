import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const NAV_LINKS = [
  { to: '/roadmaps', label: 'Roadmaps', requiresAuth: false },
  { to: '/dashboard', label: 'Dashboard', requiresAuth: true },
  { to: '/admin', label: 'Admin', requiresAuth: true, adminOnly: true },
]

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleLinks = useMemo(() => {
    return NAV_LINKS.filter((link) => {
      if (link.adminOnly && !(user?.role === 'admin' || user?.role === 'super_admin')) return false
      if (link.requiresAuth && !user) return false
      return true
    })
  }, [user])

  const handleLogout = () => {
    logout()
    setMobileOpen(false)
    navigate('/')
  }

  const closeMobile = () => setMobileOpen(false)

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
          {visibleLinks.map((link) => (
            <Link key={link.to} to={link.to} className="text-sm text-text-2 hover:text-text transition-colors">
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-3">{user.full_name}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-2 hover:border-red hover:text-red transition-colors"
              >
                Logout
              </button>
            </div>
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

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden flex flex-col gap-1.5 p-2"
          aria-label="Toggle menu"
        >
          <span className={`block h-0.5 w-5 bg-text transition-transform ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block h-0.5 w-5 bg-text transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-5 bg-text transition-transform ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-bg px-4 py-4 space-y-3">
          {visibleLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMobile}
              className="block text-sm text-text-2 hover:text-text transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="pt-2 border-t border-border">
              <span className="block text-sm text-text-3 mb-2">{user.full_name}</span>
              <button
                onClick={handleLogout}
                className="w-full rounded-lg border border-red px-3 py-1.5 text-xs text-red transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Link
                to="/login"
                onClick={closeMobile}
                className="block rounded-lg border border-border px-3 py-2 text-sm text-text-2 hover:border-accent hover:text-accent transition-colors text-center"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={closeMobile}
                className="block rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-2 transition-colors text-center"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
