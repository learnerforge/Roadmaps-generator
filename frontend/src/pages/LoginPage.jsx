import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import useSocialAuth from '../hooks/useSocialAuth'
import GoogleIcon from '../components/icons/GoogleIcon'
import GitHubIcon from '../components/icons/GitHubIcon'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { error, setError, socialLoading, handleSocialLogin } = useSocialAuth('/dashboard')
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
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

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-text-2">Sign in to continue learning</p>
        </div>

        <div className="mb-6 space-y-3">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={socialLoading !== null}
            className="btn-ghost w-full flex items-center justify-center gap-3 !px-4 !py-2.5 !text-sm !text-text disabled:opacity-50"
          >
            <GoogleIcon />
            {socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
          </button>
          <button
            onClick={() => handleSocialLogin('github')}
            disabled={socialLoading !== null}
            className="btn-ghost w-full flex items-center justify-center gap-3 !px-4 !py-2.5 !text-sm !text-text disabled:opacity-50"
          >
            <GitHubIcon />
            {socialLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-bg px-2 text-text-3">or</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red/20 bg-red-dim p-3 text-xs text-red" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs text-text-3">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs text-text-3">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-3">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
