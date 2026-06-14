import { useState, useMemo } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import useTheme from '../../hooks/useTheme'

const NAV_LINKS = [
  { to: '/roadmaps', label: 'Roadmaps', requiresAuth: false },
  { to: '/dashboard', label: 'Dashboard', requiresAuth: true },
  { to: '/admin', label: 'Admin', requiresAuth: true, adminOnly: true },
]

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-2 hover:text-accent hover:border-accent transition-colors"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}

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
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white text-sm font-bold transition-transform group-hover:scale-105">
            P
          </div>
          <span className="text-lg font-bold text-text">
            Path<span className="text-accent">Forge</span>
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-1">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `relative px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? 'text-accent bg-accent-soft'
                    : 'text-text-2 hover:text-text hover:bg-bg-3/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
          <div className="mx-2 w-px h-5 bg-border" />
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-3 ml-1">
              <span className="text-sm text-text-3 font-mono text-[12px]">{user.full_name}</span>
              <button
                onClick={handleLogout}
                className="btn-danger !px-3 !py-1.5 !text-xs"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <Link
                to="/login"
                className="btn-ghost !px-3 !py-1.5 !text-xs"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="btn-primary !px-4 !py-1.5 !text-xs"
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
          aria-expanded={mobileOpen}
        >
          <span className={`block h-0.5 w-5 bg-text transition-transform ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block h-0.5 w-5 bg-text transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-5 bg-text transition-transform ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-bg/95 backdrop-blur-xl px-4 py-4 space-y-2">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={closeMobile}
              className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent-soft text-accent border border-accent/20'
                  : 'text-text-2 hover:bg-bg-3/50 hover:text-text border border-transparent'
              }`}
            >
              {link.label}
            </NavLink>
          ))}
          {user ? (
            <div className="pt-3 mt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-text-3 font-mono text-[12px]">{user.full_name}</span>
                <ThemeToggle />
              </div>
              <button
                onClick={handleLogout}
                className="btn-danger w-full !px-3 !py-2 !text-xs"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-border">
              <div className="flex justify-end mb-1">
                <ThemeToggle />
              </div>
              <Link
                to="/login"
                onClick={closeMobile}
                className="btn-ghost w-full !py-2 text-center"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={closeMobile}
                className="btn-primary w-full !py-2 text-center"
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
