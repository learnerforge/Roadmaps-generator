import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import useSocialAuth from '../hooks/useSocialAuth'
import GoogleIcon from '../components/icons/GoogleIcon'
import GitHubIcon from '../components/icons/GitHubIcon'

function validate(email, password) {
  const errors = {}
  if (!email) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email format'
  if (!password) errors.password = 'Password is required'
  else if (password.length < 6) errors.password = 'At least 6 characters'
  return errors
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const { error, setError, socialLoading, handleSocialLogin } = useSocialAuth('/dashboard')
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validate(email, password)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    setError('')
    setLoading(true)
    try {
      const result = await apiPost('/auth/login', { email, password })
      login(result.access_token, result.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter' && nextRef?.current) {
      e.preventDefault()
      nextRef.current.focus()
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-[fadeSlideUp_0.5s_ease-out]">
        <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-glow">
              <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-text">Welcome back</h1>
            <p className="mt-1 text-sm text-text-2">Sign in to continue learning</p>
          </div>

          <div className="mb-6 space-y-3">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading !== null}
              className="btn-ghost w-full flex items-center justify-center gap-3 !px-4 !py-2.5 !text-sm !text-text disabled:opacity-50"
              aria-label="Sign in with Google"
            >
              <GoogleIcon />
              {socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
            </button>
            <button
              onClick={() => handleSocialLogin('github')}
              disabled={socialLoading !== null}
              className="btn-ghost w-full flex items-center justify-center gap-3 !px-4 !py-2.5 !text-sm !text-text disabled:opacity-50"
              aria-label="Sign in with GitHub"
            >
              <GitHubIcon />
              {socialLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
            </button>
          </div>

          <div className="relative mb-6" role="separator" aria-orientation="horizontal">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-surface px-2 text-text-3">or</span></div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red/20 bg-red-dim p-3 text-xs text-red" role="alert">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-text-2">Email</label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })) }}
                  onKeyDown={(e) => handleKeyDown(e, passwordRef)}
                  className={`w-full rounded-lg border bg-bg-2 pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-3 focus:outline-none transition-colors ${
                    fieldErrors.email ? 'border-red' : 'border-border focus:border-accent'
                  }`}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                />
              </div>
              {fieldErrors.email && <p id="login-email-error" className="mt-1 text-[11px] text-red" role="alert">{fieldErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-text-2">Password</label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  ref={passwordRef}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })) }}
                  className={`w-full rounded-lg border bg-bg-2 pl-10 pr-10 py-2.5 text-sm text-text placeholder:text-text-3 focus:outline-none transition-colors ${
                    fieldErrors.password ? 'border-red' : 'border-border focus:border-accent'
                  }`}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && <p id="login-password-error" className="mt-1 text-[11px] text-red" role="alert">{fieldErrors.password}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-text-3">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-accent hover:text-accent-2 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
